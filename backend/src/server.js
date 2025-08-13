// backend/src/server.js

import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";

import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT;

const __dirname = path.resolve();

// --- TÍCH HỢP SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Cho phép client kết nối
    methods: ["GET", "POST"],
  },
});

// Lưu trữ map giữa userId và socketId để gửi thông báo cho đúng người
const userSocketMap = {}; // { userId: socketId }

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
  }

  // --- FIX: THÊM LISTENER ĐỂ CHUYỂN TIẾP THÔNG BÁO TIN NHẮN MỚI ---
  socket.on("sendMessage", ({ recipientId }) => {
    const recipientSocketId = userSocketMap[recipientId];
    if (recipientSocketId) {
      // Gửi sự kiện 'newMessage' đến đúng người nhận
      io.to(recipientSocketId).emit("newMessage");
    }
  });
  // -----------------------------------------------------------

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    // Xóa user khỏi map khi ngắt kết nối
    for (let id in userSocketMap) {
      if (userSocketMap[id] === socket.id) {
        delete userSocketMap[id];
        break;
      }
    }
  });
});

// Export io và userSocketMap để các controller có thể sử dụng
export { io, userSocketMap };
// ----------------------------

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, // allow frontend to send cookies
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});