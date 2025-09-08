import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface VoiceCallProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientAvatar?: string;
  isIncoming?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
}

const VoiceCall = ({ 
  isOpen, 
  onClose, 
  recipientName, 
  recipientAvatar,
  isIncoming = false,
  onAccept,
  onDecline 
}: VoiceCallProps) => {
  const [isConnected, setIsConnected] = useState(!isIncoming);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isRinging, setIsRinging] = useState(isIncoming);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement>();

  useEffect(() => {
    if (isConnected && !isIncoming) {
      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isConnected, isIncoming]);

  useEffect(() => {
    // Simulate ringing sound (in a real app, you'd use WebRTC)
    if (isRinging) {
      // Play ringing sound
      console.log("Playing ringing sound...");
    }
  }, [isRinging]);

  const handleAcceptCall = () => {
    setIsRinging(false);
    setIsConnected(true);
    onAccept?.();
  };

  const handleDeclineCall = () => {
    setIsRinging(false);
    onDecline?.();
    onClose();
  };

  const handleEndCall = () => {
    setIsConnected(false);
    onClose();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real app, this would mute the microphone
    console.log("Microphone", isMuted ? "unmuted" : "muted");
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // In a real app, this would toggle speaker/earpiece
    console.log("Speaker", isSpeakerOn ? "off" : "on");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center space-y-6 p-6">
          {/* Contact Info */}
          <div className="text-center space-y-2">
            <Avatar className="h-24 w-24 mx-auto">
              <AvatarImage src={recipientAvatar} />
              <AvatarFallback className="text-2xl bg-hsl(var(--whatsapp-green)) text-white">
                {getInitials(recipientName)}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold">{recipientName}</h3>
            <p className="text-muted-foreground">
              {isRinging ? "Calling..." : isConnected ? formatDuration(callDuration) : "Connecting..."}
            </p>
          </div>

          {/* Call Status Indicator */}
          {isRinging && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
              <span className="text-sm">Ringing</span>
            </div>
          )}

          {/* Call Controls */}
          <div className="flex items-center space-x-4">
            {isConnected && (
              <>
                {/* Mute Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleMute}
                  className={`h-12 w-12 rounded-full ${
                    isMuted ? 'bg-red-100 border-red-200' : ''
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="h-5 w-5 text-red-600" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>

                {/* Speaker Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSpeaker}
                  className={`h-12 w-12 rounded-full ${
                    isSpeakerOn ? 'bg-blue-100 border-blue-200' : ''
                  }`}
                >
                  {isSpeakerOn ? (
                    <Volume2 className="h-5 w-5 text-blue-600" />
                  ) : (
                    <VolumeX className="h-5 w-5" />
                  )}
                </Button>
              </>
            )}

            {/* Main Action Buttons */}
            {isRinging && isIncoming ? (
              <>
                <Button
                  onClick={handleAcceptCall}
                  className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700"
                >
                  <Phone className="h-5 w-5 text-white" />
                </Button>
                <Button
                  onClick={handleDeclineCall}
                  className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700"
                >
                  <PhoneOff className="h-5 w-5 text-white" />
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEndCall}
                className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="h-5 w-5 text-white" />
              </Button>
            )}
          </div>

          {/* Call Quality Indicator */}
          {isConnected && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <div className="w-1 h-3 bg-green-500 rounded"></div>
              <div className="w-1 h-4 bg-green-500 rounded"></div>
              <div className="w-1 h-2 bg-green-500 rounded"></div>
              <div className="w-1 h-4 bg-green-500 rounded"></div>
              <span className="ml-2">Good connection</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCall;