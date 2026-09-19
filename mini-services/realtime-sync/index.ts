import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  // Default path is /socket.io/ — keep default so client connects easily
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = 3003;

// Track connected clients
let clientCount = 0;

io.on("connection", (socket) => {
  clientCount++;
  console.log(`[realtime] client connected (${clientCount} total)`);

  // Notify others a new client joined (for multi-device awareness)
  socket.broadcast.emit("client:count", { total: clientCount });

  // Handle entity change broadcasts from API routes
  // Events: "transaction:changed", "account:changed", "budget:changed",
  //         "goal:changed", "category:changed", "recurring:changed",
  //         "debt:changed", "share:changed", "setting:changed"
  socket.on("entity:changed", (data: { entity: string; action: string; id?: string }) => {
    // Broadcast to ALL clients (including sender) so every device updates
    io.emit(`${data.entity}:changed`, { action: data.action, id: data.id, at: Date.now() });
  });

  // Handle lock state sync (when one device locks, others lock too)
  socket.on("security:lock", (data: { reason?: string }) => {
    socket.broadcast.emit("security:lock", { reason: data.reason, at: Date.now() });
  });

  socket.on("security:unlock", () => {
    socket.broadcast.emit("security:unlock", { at: Date.now() });
  });

  // Live cursor / typing indicator (optional, for shared views)
  socket.on("presence", (data: { section: string }) => {
    socket.broadcast.emit("presence", { section: data.section, at: Date.now() });
  });

  socket.on("disconnect", () => {
    clientCount = Math.max(0, clientCount - 1);
    console.log(`[realtime] client disconnected (${clientCount} total)`);
    socket.broadcast.emit("client:count", { total: clientCount });
  });
});

httpServer.listen(PORT, () => {
  console.log(`[realtime] socket.io server running on port ${PORT}`);
});
