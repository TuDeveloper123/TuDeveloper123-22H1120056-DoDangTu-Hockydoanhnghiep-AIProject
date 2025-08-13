// backend/controllers/chat.controller.js

import { generateStreamToken, streamClient } from "../lib/stream.js";

export async function getStreamToken(req, res) {
  try {
    const token = generateStreamToken(req.user.id);
    res.status(200).json({ token });
  } catch (error) {
    console.log("Error in getStreamToken controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// SỬ DỤNG LẠI PHIÊN BẢN ĐƠN GIẢN VÀ CHÍNH XÁC
export async function getUnreadChannels(req, res) {
  try {
    const userId = req.user.id;

    // Truy vấn các channel mà user là thành viên VÀ có số tin nhắn chưa đọc > 0
    const channels = await streamClient.queryChannels(
      {
        type: 'messaging',
        members: { $in: [userId] },
        unread_count: { $gt: 0 }, // Bộ lọc quan trọng nhất của Stream
      },
      [{ last_message_at: -1 }], // Sắp xếp theo tin nhắn mới nhất
      {
        state: true, // Lấy state của channel (bao gồm members và tin nhắn cuối)
        limit: 30,
      }
    );

    console.log(`Found ${channels.length} unread channels for user ${userId}`);
    res.status(200).json(channels);

  } catch (error) {
    console.error("Error in getUnreadChannels controller:", error);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: error.message 
    });
  }
}