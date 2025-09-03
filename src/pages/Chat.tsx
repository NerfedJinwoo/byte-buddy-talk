import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";

const Chat = () => {
  const { user, loading } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<string>();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will be handled by route protection
  }

  return (
    <div className="h-screen flex">
      <ChatSidebar
        selectedChatId={selectedChatId}
        onChatSelect={setSelectedChatId}
      />
      <ChatWindow chatRoomId={selectedChatId!} />
    </div>
  );
};

export default Chat;