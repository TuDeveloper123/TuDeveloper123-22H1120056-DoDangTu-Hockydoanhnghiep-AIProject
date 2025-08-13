// frontend/src/components/Navbar.jsx

import { Link, useLocation } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, LogOutIcon, ShipWheelIcon } from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFriendRequests, getUnreadChannels } from "../lib/api";
import { useEffect } from "react";
import { useSocketContext } from "../context/SocketContext.jsx";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const isChatPage = location.pathname.startsWith("/chat");
  const { logoutMutation } = useLogout();
  const queryClient = useQueryClient();
  const { socket } = useSocketContext(); // Chỉ cần socket cho real-time

  // Query để lấy dữ liệu lời mời kết bạn
  const { data: friendRequestsData } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
    enabled: !!authUser,
  });

  // Query để lấy dữ liệu tin nhắn chưa đọc
  const { data: unreadChannelsData } = useQuery({
    queryKey: ["unreadChannels"],
    queryFn: getUnreadChannels,
    enabled: !!authUser,
  });

  // useEffect tập trung toàn bộ logic lắng nghe sự kiện real-time
  useEffect(() => {
    if (!socket || !authUser) return;

    // --- Lắng nghe lời mời kết bạn ---
    const handleNewFriendRequest = () => {
      console.log("Navbar EVENT: newFriendRequest received!");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    };
    socket.on("newFriendRequest", handleNewFriendRequest);

    // --- FIX: Lắng nghe sự kiện tin nhắn mới từ backend của chúng ta ---
    const handleNewMessage = () => {
      console.log("Navbar EVENT: newMessage received via Socket.IO!");
      // Thêm độ trễ để tránh race condition
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["unreadChannels"] });
      }, 500);
    };
    socket.on("newMessage", handleNewMessage);

    // --- CLEANUP FUNCTION ---
    return () => {
      socket.off("newFriendRequest", handleNewFriendRequest);
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, authUser, queryClient]);

  // Tính toán tổng số thông báo
  const friendRequestCount = friendRequestsData?.incomingReqs?.length || 0;
  const unreadMessagesCount = unreadChannelsData?.length || 0;
  const notificationCount = friendRequestCount + unreadMessagesCount;

  return (
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end w-full">
          {isChatPage && (
            <div className="pl-5">
              <Link to="/" className="flex items-center gap-2.5">
                <ShipWheelIcon className="size-9 text-primary" />
                <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary  tracking-wider">
                  Streamify
                </span>
              </Link>
            </div>
          )}

          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            <Link to={"/notifications"}>
              <div className="relative">
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-content text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {notificationCount}
                  </span>
                )}
                <button className="btn btn-ghost btn-circle">
                  <BellIcon className="h-6 w-6 text-base-content opacity-70" />
                </button>
              </div>
            </Link>
          </div>

          <ThemeSelector />

          <div className="avatar">
            <div className="w-9 rounded-full">
              <img src={authUser?.profilePic} alt="User Avatar" rel="noreferrer" />
            </div>
          </div>

          <button className="btn btn-ghost btn-circle" onClick={logoutMutation}>
            <LogOutIcon className="h-6 w-6 text-base-content opacity-70" />
          </button>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;