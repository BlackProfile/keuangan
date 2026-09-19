import { createServer } from "http";
import { Server } from "socket.io";
const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET","POST"] } });
io.on("connection", (socket) => {
  console.log("client connected");
  socket.on("entity:changed", (d) => io.emit(`${d.entity}:changed`, { action: d.action, id: d.id, at: Date.now() }));
  socket.on("disconnect", () => console.log("disconnected"));
});
httpServer.listen(3003, () => console.log("realtime on :3003"));
