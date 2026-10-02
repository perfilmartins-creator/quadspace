// Servidor multiplayer dedicado do QUAD CREW (AMOUNG QUAD).
// Node + WebSocket, autoritativo. Rodar com: npm run crew:server

import { createServer, type IncomingMessage } from "node:http";
import { WebSocketServer } from "ws";
import { closeAllRooms, ensureLoop, handleConnection, rooms } from "./hub";

const PORT = Number(process.env.PORT ?? 3030);

function clientIp(req: IncomingMessage) {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return (first ?? req.socket.remoteAddress ?? "unknown").trim();
}

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, maxPayload: 8 * 1024 });
wss.on("connection", (socket, req) => handleConnection(socket, { ip: clientIp(req), origin: req.headers.origin }));

ensureLoop();
server.listen(PORT, () => {
  console.log(`[crew] servidor ouvindo na porta ${PORT}`);
});

function shutdown() {
  closeAllRooms();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
