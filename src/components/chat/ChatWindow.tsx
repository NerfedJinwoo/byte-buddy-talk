import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Send, Phone, Video, MoreVertical } from "lucide-react";
import VoiceCall from "./VoiceCall";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: {
    display_name: string;
    username: string;
    avatar_url?: string;
  };
}

interface ChatWindowProps {
  chatRoomId: string;
}

const ChatWindow = ({ chatRoomId }: ChatWindowProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRoomId) {
      fetchMessages();
      fetchChatInfo();
      
      // Subscribe to new messages
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_room_id=eq.${chatRoomId}`
          },
          (payload) => {
            fetchMessages(); // Refetch to get sender info
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [chatRoomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .order('created_at', { ascending: true });

    if (messagesError || !messagesData) {
      console.error('Error fetching messages:', messagesError);
      return;
    }

    // Get unique sender IDs
    const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
    
    // Fetch sender profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, avatar_url')
      .in('user_id', senderIds);

    if (profilesError || !profilesData) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    // Create a map of profiles for quick lookup
    const profilesMap = profilesData.reduce((acc, profile) => {
      acc[profile.user_id] = profile;
      return acc;
    }, {} as Record<string, any>);

    // Combine messages with sender info
    const formattedMessages = messagesData.map(message => ({
      ...message,
      sender: profilesMap[message.sender_id] || {
        display_name: 'Unknown User',
        username: 'unknown',
        avatar_url: null
      }
    }));

    setMessages(formattedMessages);
  };

  const fetchChatInfo = async () => {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants(
          profiles(*)
        )
      `)
      .eq('id', chatRoomId)
      .single();

    if (!error && data) {
      setChatInfo(data);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: chatRoomId,
          sender_id: user?.id,
          content: newMessage.trim()
        });

      if (!error) {
        setNewMessage("");
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getChatName = () => {
    if (!chatInfo) return '';
    
    if (chatInfo.is_group) {
      return chatInfo.name || 'Group Chat';
    }
    
    const otherParticipant = chatInfo.chat_participants
      ?.find((p: any) => p.profiles.user_id !== user?.id)?.profiles;
    
    return otherParticipant?.display_name || 'Unknown User';
  };

  const getChatAvatar = () => {
    if (!chatInfo || chatInfo.is_group) return null;
    
    const otherParticipant = chatInfo.chat_participants
      ?.find((p: any) => p.profiles.user_id !== user?.id)?.profiles;
    
    return otherParticipant?.avatar_url;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleVoiceCall = () => {
    setShowVoiceCall(true);
  };

  if (!chatRoomId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-hsl(var(--chat-bg))">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Send className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Welcome to ChatApp</h2>
          <p className="text-muted-foreground">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-hsl(var(--chat-bg))">
      {/* Chat Header */}
      <div className="bg-background border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getChatAvatar()} />
              <AvatarFallback className="bg-hsl(var(--whatsapp-green)) text-white">
                {getInitials(getChatName())}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{getChatName()}</h2>
              <p className="text-sm text-muted-foreground">Online</p>
            </div>
          </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="ghost" onClick={handleVoiceCall}>
                <Phone className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <Video className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender_id === user?.id;
          
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${isOwn ? 'order-1' : 'order-2'}`}>
                <div
                  className={`rounded-lg p-3 ${
                    isOwn
                      ? 'bg-hsl(var(--sent-message)) text-white'
                      : 'bg-hsl(var(--received-message)) border border-border'
                  }`}
                >
                  {!isOwn && chatInfo?.is_group && (
                    <p className="text-xs font-medium text-hsl(var(--whatsapp-green)) mb-1">
                      {message.sender.display_name}
                    </p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    isOwn ? 'text-white/70' : 'text-muted-foreground'
                  }`}>
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
              {!isOwn && (
                <Avatar className={`h-8 w-8 ${isOwn ? 'order-2 ml-2' : 'order-1 mr-2'}`}>
                  <AvatarImage src={message.sender.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(message.sender.display_name)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-background border-t border-border p-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-hsl(var(--whatsapp-green)) hover:bg-hsl(var(--whatsapp-green-dark))"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Voice Call Component */}
      <VoiceCall
        isOpen={showVoiceCall}
        onClose={() => setShowVoiceCall(false)}
        recipientName={getChatName()}
        recipientAvatar={getChatAvatar()}
      />
    </div>
  );
};

export default ChatWindow;