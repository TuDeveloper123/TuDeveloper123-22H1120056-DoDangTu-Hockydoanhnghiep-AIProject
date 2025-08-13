// frontend/src/pages/ChatPage.jsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Channel, ChannelHeader, Chat, MessageInput, MessageList, Thread, Window } from "stream-chat-react";
import toast from "react-hot-toast";
import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";
import { useSocketContext } from "../context/SocketContext.jsx";
import useAuthUser from "../hooks/useAuthUser.js";

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const { authUser } = useAuthUser();
  const { chatClient, socket } = useSocketContext(); // Lấy cả socket từ context
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState(null);

  useEffect(() => {
    // Sử dụng chat client đã có, không tạo kết nối mới
    const initChannel = async () => {
      if (!chatClient || !authUser) return;

      try {
        const channelId = [authUser._id, targetUserId].sort().join("-");
        const currChannel = chatClient.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        // Đánh dấu đã đọc khi vào channel và cập nhật lại số thông báo
        await currChannel.watch();
        setChannel(currChannel);
        queryClient.invalidateQueries({ queryKey: ["unreadChannels"] });

      } catch (error) {
        console.error("Error initializing channel:", error);
        toast.error("Could not open chat. Please try again.");
      }
    };

    initChannel();
    
  }, [chatClient, authUser, targetUserId, queryClient]);

  const handleVideoCall = () => {
    if (channel) {
      const callUrl = `${window.location.origin}/call/${channel.id}`;
      channel.sendMessage({ text: `I've started a video call. Join me here: ${callUrl}` });
      toast.success("Video call link sent successfully!");
    }
  };

  // FIX: Ghi đè hành vi gửi tin nhắn để gửi thêm sự kiện socket
  const overrideSendMessage = async (channelId, message) => {
    if (socket) {
      // Gửi sự kiện đến backend của chúng ta để nó thông báo cho người nhận
      socket.emit("sendMessage", { recipientId: targetUserId });
    }
    // Thực hiện hành động gửi tin nhắn mặc định của Stream
    return channel.sendMessage(message);
  }

  if (!chatClient || !channel) return <ChatLoader />;

  return (
    <div className="h-full">
      <Chat client={chatClient}>
        <Channel channel={channel}>
          <div className="w-full relative h-full">
            <CallButton handleVideoCall={handleVideoCall} />
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput focus doSendMessage={overrideSendMessage} />
            </Window>
          </div>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};
export default ChatPage;