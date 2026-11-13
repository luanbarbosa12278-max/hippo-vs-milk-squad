/* Local chat simulator bridge. No TikTok credentials or direct platform connection.
 * Start the local WebSocket server on port 8765, then open the locally hosted game.
 * Protocol: {"type":"chat","userId":"viewer-1","comment":"FOGO"}
 */
(() => {
  "use strict";
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  const endpoint = "ws://127.0.0.1:8765";
  const cooldown = 200;
  const lastAttack = new Map();
  const teams = new Map();
  let socket = null, retry = null, enabled = false, delay = 1000;
  const status = document.createElement("p");
  status.id = "live-connection-status";
  status.setAttribute("role", "status");
  status.style.cssText = "font:16px monospace;text-align:center;padding:8px;color:#bdeaff";
  document.getElementById("debug-panel")?.append(status);
  function setStatus(message) { status.textContent = "CHAT LOCAL: " + message; }
  function handle(event) {
    if (!event || event.type !== "chat" || typeof event.userId !== "string" ||
        !event.userId.trim() || event.userId.length > 128 ||
        typeof event.comment !== "string" || event.comment.length > 200) return false;
    const id = event.userId;
    const command = event.comment.trim().toUpperCase();
    if (command === "HIPPO" || command === "VACA") {
      if (teams.size >= 5000 && !teams.has(id)) teams.delete(teams.keys().next().value);
      teams.set(id, command === "HIPPO" ? "fire" : "milk");
      return true;
    }
    const action = command === "FOGO" ? "fire" : command === "LEITE" ? "milk" : null;
    if (!action) return false;
    const battle = window.LiveBattle;
    if (!battle || typeof battle[action] !== "function") return false;
    const state = battle.getState();
    if (state.paused || state.finished) return false;
    const now = Date.now();
    if (now - (lastAttack.get(id) || 0) < cooldown) return false;
    if (lastAttack.size >= 5000 && !lastAttack.has(id)) lastAttack.delete(lastAttack.keys().next().value);
    lastAttack.set(id, now);
    battle[action](4);
    return true;
  }
  function connect() {
    if (!local || !enabled || socket) return;
    setStatus("conectando...");
    const ws = new WebSocket(endpoint);
    socket = ws;
    ws.onopen = () => { delay = 1000; setStatus("conectado"); };
    ws.onmessage = e => {
      if (typeof e.data !== "string" || e.data.length > 4096) return;
      try { handle(JSON.parse(e.data)); } catch (_) { /* Ignore malformed events. */ }
    };
    ws.onerror = () => { setStatus("servidor indisponível"); };
    ws.onclose = () => {
      if (socket !== ws) return;
      socket = null;
      setStatus("desconectado");
      if (enabled) {
        retry = setTimeout(connect, delay);
        delay = Math.min(delay * 2, 15000);
      }
    };
  }
  window.LiveChat = {
    start() { if (!local) return false; enabled = true; connect(); return true; },
    stop() { enabled = false; clearTimeout(retry); const ws = socket; socket = null; if (ws) ws.close(); setStatus("desativado"); },
    simulate(userId, comment) { return handle({type:"chat", userId, comment}); },
    getTeam(userId) { return teams.get(userId) || null; }
  };
  setStatus(local ? "aguardando servidor" : "simulação disponível; servidor apenas local");
  if (local) window.LiveChat.start();
})();
