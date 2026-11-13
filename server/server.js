"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { WebSocketServer, WebSocket } = require("ws");
const config = require("./config");
const root = path.resolve(__dirname, "..");
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp"};
const server = http.createServer((req,res) => {
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  let name;
  try { name = decodeURIComponent(new URL(req.url,"http://localhost").pathname); } catch { res.writeHead(400); return res.end(); }
  if (name === "/") name = "/index.html";
  if (!/^\/(index\.html|style\.css|game\.js|live-client\.js|assets\/[a-zA-Z0-9_./-]+)$/.test(name) || name.split("/").includes("..")) { res.writeHead(404); return res.end(); }
  const file = path.resolve(root, "." + name);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file,(err,data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200,{"Content-Type":mime[path.extname(file)] || "application/octet-stream","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
    res.end(req.method === "HEAD" ? undefined : data);
  });
});
const wss = new WebSocketServer({noServer:true,maxPayload:config.maxPayload});
server.on("upgrade",(req,socket,head) => {
  const allowed = ["http://127.0.0.1:"+config.port,"http://localhost:"+config.port];
  if (req.headers.origin && !allowed.includes(req.headers.origin)) { socket.destroy(); return; }
  wss.handleUpgrade(req,socket,head,ws => wss.emit("connection",ws,req));
});
const last = new Map();
wss.on("connection",ws => {
  ws.on("error",()=>{});
  ws.on("message",(raw,isBinary) => {
    if (isBinary) return;
    let e; try { e = JSON.parse(raw.toString()); } catch { return; }
    if (!e || e.type !== "chat" || typeof e.userId !== "string" || !e.userId.trim() || e.userId.length > 128 || typeof e.comment !== "string" || e.comment.length > 200) return;
    const comment = e.comment.trim().toUpperCase();
    if (!["FOGO","LEITE","HIPPO","VACA"].includes(comment)) return;
    const now = Date.now();
    if (comment === "FOGO" || comment === "LEITE") {
      if (now - (last.get(e.userId) || 0) < config.cooldownMs) return;
      if (last.size >= 5000 && !last.has(e.userId)) last.delete(last.keys().next().value);
      last.set(e.userId,now);
    }
    const payload = JSON.stringify({type:"chat",userId:e.userId,comment});
    for (const client of wss.clients) if (client.readyState === WebSocket.OPEN && client.bufferedAmount < 65536) client.send(payload);
    console.log(e.userId + ": " + comment);
  });
});
server.on("error",err => { console.error(err.message); process.exitCode=1; });
server.listen(config.port,config.host,()=>console.log("Jogo e chat local: http://"+config.host+":"+config.port));
