"use strict";
const WebSocket = require("ws");
const config = require("./config");
const ws = new WebSocket("ws://"+config.host+":"+config.port);
const viewers = Array.from({length:20},(_,i)=>"sim_"+(i+1));
let timer;
ws.on("open",()=>{
  console.log("Simulador conectado. Ctrl+C para parar.");
  timer=setInterval(()=>{
    const userId=viewers[Math.floor(Math.random()*viewers.length)];
    const comment=Math.random()<0.5?"FOGO":"LEITE";
    if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:"chat",userId,comment}));
  },700);
});
ws.on("error",err=>{console.error("Inicie o servidor primeiro:",err.message);process.exitCode=1;});
ws.on("close",()=>clearInterval(timer));
process.on("SIGINT",()=>{clearInterval(timer);ws.close();});
