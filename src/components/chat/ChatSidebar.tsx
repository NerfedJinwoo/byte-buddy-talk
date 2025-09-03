import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Plus, LogOut, Search } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  status: string;
}

interface ChatRoom {
  id: string;
  name?: string;
  is_group: boolean;
  created_at: string;
  participants: Profile[];
  last_message?: {
    content: string;
    created_at: string;
  };
}

interface ChatSidebarProps {
  selectedChatId?: string;
  onChatSelect: (chatId: string) => void;
}

const ChatSidebar = ({ selectedChatId, onChatSelect }: ChatSidebarProps) => {
  const { user, signOut } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChatRooms();
      fetchProfiles();
    }
  }, [user]);

  const fetchChatRooms = async () => {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants!inner(
          profiles(*)
        ),
        messages(content, created_at)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chat rooms:', error);
      return;
    }

    const formattedRooms = data?.map(room => ({
      ...room,
      participants: room.chat_participants.map((p: any) => p.profiles),
      last_message: room.messages?.[0]
    })) || [];

    setChatRooms(formattedRooms);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user?.id);

    if (!error && data) {
      setProfiles(data);
    }
  };

  const createDirectChat = async (profileId: string) => {
    // Check if chat already exists
    const { data: existingChat } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants!inner(user_id)
      `)
      .eq('is_group', false)
      .filter('chat_participants.user_id', 'in', `(${user?.id},${profileId})`);

    if (existingChat && existingChat.length > 0) {
      onChatSelect(existingChat[0].id);
      setShowNewChatDialog(false);
      return;
    }

    // Create new chat room
    const { data: newRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({
        is_group: false,
        created_by: user?.id
      })
      .select()
      .single();

    if (roomError || !newRoom) {
      console.error('Error creating chat room:', roomError);
      return;
    }

    // Add participants
    const { error: participantError } = await supabase
      .from('chat_participants')
      .insert([
        { chat_room_id: newRoom.id, user_id: user?.id },
        { chat_room_id: newRoom.id, user_id: profileId }
      ]);

    if (participantError) {
      console.error('Error adding participants:', participantError);
      return;
    }

    onChatSelect(newRoom.id);
    setShowNewChatDialog(false);
    fetchChatRooms();
  };

  const getChatName = (room: ChatRoom) => {
    if (room.is_group) {
      return room.name || 'Group Chat';
    }
    const otherParticipant = room.participants.find(p => p.user_id !== user?.id);
    return otherParticipant?.display_name || 'Unknown User';
  };

  const getChatAvatar = (room: ChatRoom) => {
    if (room.is_group) {
      return null;
    }
    const otherParticipant = room.participants.find(p => p.user_id !== user?.id);
    return otherParticipant?.avatar_url;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-hsl(var(--sidebar-bg)) border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-6 w-6 text-hsl(var(--whatsapp-green))" />
            <h1 className="text-xl font-semibold">Chats</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-hsl(var(--whatsapp-green)) hover:bg-hsl(var(--whatsapp-green-dark))">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start a new chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                        onClick={() => createDirectChat(profile.user_id)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile.avatar_url} />
                          <AvatarFallback>{getInitials(profile.display_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile.display_name}</p>
                          <p className="text-sm text-muted-foreground">@{profile.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chatRooms.map((room) => (
          <div
            key={room.id}
            className={`p-4 hover:bg-muted cursor-pointer border-b border-border/50 ${
              selectedChatId === room.id ? 'bg-muted' : ''
            }`}
            onClick={() => onChatSelect(room.id)}
          >
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={getChatAvatar(room)} />
                <AvatarFallback className="bg-hsl(var(--whatsapp-green)) text-white">
                  {getInitials(getChatName(room))}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">{getChatName(room)}</p>
                  {room.last_message && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(room.last_message.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  )}
                </div>
                {room.last_message && (
                  <p className="text-sm text-muted-foreground truncate">
                    {room.last_message.content}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;