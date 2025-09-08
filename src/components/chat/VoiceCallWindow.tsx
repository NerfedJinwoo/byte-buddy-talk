import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceCallWindowProps {
  isOpen: boolean;
  onClose: () => void;
  callerName: string;
  callerAvatar?: string;
  isIncoming?: boolean;
  onAnswer?: () => void;
  onDecline?: () => void;
}

const VoiceCallWindow = ({
  isOpen,
  onClose,
  callerName,
  callerAvatar,
  isIncoming = false,
  onAnswer,
  onDecline
}: VoiceCallWindowProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isConnected, setIsConnected] = useState(!isIncoming);
  const [callDuration, setCallDuration] = useState(0);
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isConnected && isOpen) {
      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isConnected, isOpen]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = () => {
    setIsConnected(true);
    onAnswer?.();
    toast({
      title: "Call connected",
      description: `You're now in a call with ${callerName}`,
    });
  };

  const handleDecline = () => {
    onDecline?.();
    onClose();
    toast({
      title: "Call declined",
      description: `Call with ${callerName} was declined`,
    });
  };

  const handleEndCall = () => {
    setIsConnected(false);
    setCallDuration(0);
    onClose();
    toast({
      title: "Call ended",
      description: `Call with ${callerName} has ended`,
    });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Microphone on" : "Microphone off",
      description: isMuted ? "You can now speak" : "You are now muted",
    });
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    toast({
      title: isSpeakerOn ? "Speaker off" : "Speaker on",
      description: isSpeakerOn ? "Audio through earpiece" : "Audio through speaker",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-8 w-full max-w-md mx-4 text-center">
        <div className="mb-6">
          <Avatar className="h-24 w-24 mx-auto mb-4">
            <AvatarImage src={callerAvatar} />
            <AvatarFallback className="text-2xl">
              {callerName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-semibold mb-2">{callerName}</h2>
          {isIncoming && !isConnected ? (
            <p className="text-muted-foreground">Incoming call...</p>
          ) : isConnected ? (
            <p className="text-muted-foreground">{formatDuration(callDuration)}</p>
          ) : (
            <p className="text-muted-foreground">Calling...</p>
          )}
        </div>

        <div className="flex justify-center space-x-4 mb-6">
          {isConnected && (
            <>
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="lg"
                className="w-16 h-16 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              <Button
                variant={isSpeakerOn ? "default" : "outline"}
                size="lg"
                className="w-16 h-16 rounded-full"
                onClick={toggleSpeaker}
              >
                {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
              </Button>
            </>
          )}
        </div>

        <div className="flex justify-center space-x-4">
          {isIncoming && !isConnected ? (
            <>
              <Button
                variant="default"
                size="lg"
                className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700"
                onClick={handleAnswer}
              >
                <Phone className="h-6 w-6" />
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="w-16 h-16 rounded-full"
                onClick={handleDecline}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              size="lg"
              className="w-16 h-16 rounded-full"
              onClick={handleEndCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceCallWindow;