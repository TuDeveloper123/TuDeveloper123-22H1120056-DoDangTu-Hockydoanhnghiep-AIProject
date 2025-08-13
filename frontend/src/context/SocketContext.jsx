// frontend/src/context/SocketContext.jsx

import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";
import useAuthUser from "../hooks/useAuthUser";
import { StreamChat } from "stream-chat";
import { getStreamToken } from "../lib/api"; // BƯỚC 1: IMPORT HÀM API ĐÚNG

const SocketContext = createContext();

// Đổi tên hook để rõ ràng và thêm kiểm tra
export const useSocketContext = () => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error("useSocketContext must be used within a SocketContextProvider");
    }
    return context;
}

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

export const SocketContextProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [chatClient, setChatClient] = useState(null);
    const { authUser } = useAuthUser();

    useEffect(() => {
        if (authUser) {
            const socketInstance = io("http://localhost:5001", {
                query: {
                    userId: authUser._id,
                },
            });
            setSocket(socketInstance);

            const client = StreamChat.getInstance(STREAM_API_KEY);

            const fetchTokenAndConnect = async () => {
                try {
                    // BƯỚC 2: SỬ DỤNG HÀM getStreamToken TỪ api.js
                    // Điều này đảm bảo gọi đúng endpoint của backend với axios
                    const { token } = await getStreamToken();
                    
                    await client.connectUser(
                        {
                            id: authUser._id,
                            name: authUser.fullName,
                            image: authUser.profilePic,
                        },
                        token
                    );
                    setChatClient(client);
                    console.log("Stream Chat connected globally.");
                } catch (error) {
                    console.error("Error connecting to Stream Chat globally:", error);
                }
            };

            if (!client.userID) {
                fetchTokenAndConnect();
            } else {
                setChatClient(client)
            }

            return () => {
                socketInstance.close();
            };
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
            }
            if (chatClient) {
                chatClient.disconnectUser();
                setChatClient(null);
            }
        }
    }, [authUser]);

    return <SocketContext.Provider value={{ socket, chatClient }}>{children}</SocketContext.Provider>;
};