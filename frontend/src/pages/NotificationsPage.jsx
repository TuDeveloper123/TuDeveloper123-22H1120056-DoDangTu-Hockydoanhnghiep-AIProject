// frontend/src/pages/NotificationsPage.jsx

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptFriendRequest, getFriendRequests, getUnreadChannels } from "../lib/api";
import { BellIcon, ClockIcon, MessageSquareIcon, UserCheckIcon, MessageCircle } from "lucide-react";
import NoNotificationsFound from "../components/NoNotificationsFound";
import { Link } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser";
import { useSocketContext } from "../context/SocketContext.jsx";

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const { socket } = useSocketContext(); // Chỉ cần socket cho real-time

  // Query cho lời mời kết bạn
  const { data: friendRequestsData, isLoading: isLoadingFriendRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  // Query cho tin nhắn chưa đọc
  const { data: unreadChannelsData, isPending: isPendingUnread } = useQuery({
    queryKey: ["unreadChannels"],
    queryFn: getUnreadChannels,
  });

  const { mutate: acceptRequestMutation, isPending: isAccepting } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  // FIX: Lắng nghe sự kiện tin nhắn mới từ backend của chúng ta
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = () => {
      console.log("NotificationsPage EVENT: newMessage received via Socket.IO!");
      // Thêm độ trễ để tránh race condition
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["unreadChannels"] });
      }, 500);
    };

    socket.on("newMessage", handleNewMessage);

    // Dọn dẹp listener khi component bị unmount
    return () => socket.off("newMessage", handleNewMessage);
  }, [socket, queryClient]);

  // Gán giá trị mặc định là mảng rỗng để tránh lỗi
  const incomingRequests = friendRequestsData?.incomingReqs || [];
  const acceptedRequests = friendRequestsData?.acceptedReqs || [];
  const unreadChannels = unreadChannelsData || [];

  // Chỉ hiển thị loading spinner cho lần tải đầu tiên
  const isInitialLoading = isLoadingFriendRequests || isPendingUnread;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Notifications</h1>

        {isInitialLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <>
            {/* FRIEND REQUESTS SECTION */}
            {incomingRequests.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <UserCheckIcon className="h-5 w-5 text-primary" />
                  Friend Requests
                </h2>
                <div className="space-y-3">
                  {incomingRequests.map((request) => (
                    <div key={request._id} className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="card-body p-4 flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="avatar w-14 h-14"><img src={request.sender.profilePic} alt={request.sender.fullName} /></div>
                          <div>
                            <h3 className="font-semibold">{request.sender.fullName}</h3>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <span className="badge badge-secondary badge-sm">Native: {request.sender.nativeLanguage}</span>
                              <span className="badge badge-outline badge-sm">Learning: {request.sender.learningLanguage}</span>
                            </div>
                          </div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => acceptRequestMutation(request._id)} disabled={isAccepting}>
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* NEW CONNECTIONS SECTION - HOÀN THIỆN LẠI */}
            {acceptedRequests.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BellIcon className="h-5 w-5 text-success" />
                  New Connections
                </h2>
                <div className="space-y-3">
                  {acceptedRequests.map((notification) => (
                    <div key={notification._id} className="card bg-base-200 shadow-sm">
                      <div className="card-body p-4">
                        <div className="flex items-start gap-3">
                          <div className="avatar mt-1 size-10"><img src={notification.recipient.profilePic} alt={notification.recipient.fullName} /></div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{notification.recipient.fullName}</h3>
                            <p className="text-sm my-1">{notification.recipient.fullName} accepted your friend request</p>
                            <p className="text-xs flex items-center opacity-70"><ClockIcon className="h-3 w-3 mr-1" />Recently</p>
                          </div>
                          <div className="badge badge-success gap-1"><MessageSquareIcon className="h-3 w-3" />New Friend</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* UNREAD MESSAGES SECTION */}
            {unreadChannels.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-accent" />
                  New Messages
                </h2>
                <div className="space-y-3">
                  {unreadChannels.map((channel) => {
                    const otherUser = Object.values(channel.state.members).find(member => member.user_id !== authUser._id);
                    if (!otherUser) return null;
                    return (
                      <Link to={`/chat/${otherUser.user_id}`} key={channel.id} className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow block">
                        <div className="card-body p-4 flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="avatar w-14 h-14"><img src={otherUser.user.image} alt={otherUser.user.name} /></div>
                                <div>
                                    <h3 className="font-semibold">{otherUser.user.name}</h3>
                                    <p className="text-sm opacity-70">
                                        {channel.state.unread_count} new message{channel.state.unread_count > 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="badge badge-accent badge-outline">Go to chat</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* NO NOTIFICATIONS FALLBACK */}
            {incomingRequests.length === 0 && acceptedRequests.length === 0 && unreadChannels.length === 0 && (
                <NoNotificationsFound />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;