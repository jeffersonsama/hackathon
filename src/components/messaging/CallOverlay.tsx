import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { CallState, IncomingCall } from "@/hooks/useWebRTCCall";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

interface Props {
  callState: CallState;
  callType: "audio" | "video";
  isMuted: boolean;
  isCamOff: boolean;
  duration: number;
  incomingCall: IncomingCall | null;
  remoteStream: MediaStream | null;
  localMediaStream: MediaStream | null;
  partnerName: string;
  partnerAvatar: string | null;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

export default function CallOverlay(props: Props) {
  const {
    callState, callType, isMuted, isCamOff, duration,
    incomingCall, remoteStream, localMediaStream,
    partnerName, partnerAvatar,
    onAccept, onDecline, onEnd, onToggleMute, onToggleCamera,
  } = props;

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localMediaStream) localVideoRef.current.srcObject = localMediaStream;
  }, [localMediaStream]);

  // ✅ Afficher l'overlay si un appel est en cours ou entrant
  const isVisible = callState !== "idle" || incomingCall !== null;
  if (!isVisible) return null;

  const name = incomingCall?.name || partnerName;
  const avatar = incomingCall?.avatar || partnerAvatar;
  const isVideo = callType === "video" || incomingCall?.type === "video";

  const overlay = (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">

      {/* ✅ Appel entrant — callState === "ringing" */}
      {incomingCall && callState === "ringing" && (
        <div className="text-center">
          <div className="relative mx-auto w-32 h-32 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
            <Avatar className="w-32 h-32">
              {avatar && <AvatarFallback className="bg-primary/20 text-white text-3xl font-bold">{getInitials(name)}</AvatarFallback>}
              {avatar && <img src={avatar} className="w-full h-full rounded-full object-cover" alt={name} />}
            </Avatar>
          </div>
          <h2 className="text-white text-xl font-bold mb-1">{name}</h2>
          <p className="text-white/60 text-sm mb-8">
            Appel {isVideo ? "vidéo" : "audio"} entrant...
          </p>
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center hover:bg-green-700 transition-colors"
            >
              {isVideo ? <Video className="w-7 h-7 text-white" /> : <Phone className="w-7 h-7 text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* Appel en cours (appelant) */}
      {callState === "calling" && (
        <div className="text-center">
          <div className="relative mx-auto w-28 h-28 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
            <Avatar className="w-28 h-28">
              {partnerAvatar
                ? <img src={partnerAvatar} className="w-full h-full rounded-full object-cover" alt={partnerName} />
                : <AvatarFallback className="bg-primary/20 text-white text-2xl font-bold">{getInitials(partnerName)}</AvatarFallback>
              }
            </Avatar>
          </div>
          <h2 className="text-white text-xl font-bold mb-1">{partnerName}</h2>
          <p className="text-white/60 text-sm mb-8">Appel en cours...</p>
          <button
            onClick={onEnd}
            className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors mx-auto"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
        </div>
      )}

      {/* Appel actif */}
      {callState === "active" && (
        <>
          {isVideo && remoteStream ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-24 right-4 w-32 h-44 rounded-xl object-cover border-2 border-white/20 z-10"
              />
            </>
          ) : (
            <div className="text-center mb-4">
              <Avatar className="w-28 h-28 mx-auto mb-4">
                {partnerAvatar
                  ? <img src={partnerAvatar} className="w-full h-full rounded-full object-cover" alt={partnerName} />
                  : <AvatarFallback className="bg-primary/20 text-white text-2xl font-bold">{getInitials(partnerName)}</AvatarFallback>
                }
              </Avatar>
              <h2 className="text-white text-xl font-bold">{partnerName}</h2>
            </div>
          )}

          <div className="text-white/80 text-lg font-mono mb-8 z-10">
            {formatDuration(duration)}
          </div>

          <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-5 z-10">
            <button
              onClick={onToggleMute}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                isMuted ? "bg-red-600" : "bg-white/20 hover:bg-white/30"
              )}
            >
              {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>
            {isVideo && (
              <button
                onClick={onToggleCamera}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  isCamOff ? "bg-red-600" : "bg-white/20 hover:bg-white/30"
                )}
              >
                {isCamOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
              </button>
            )}
            <button
              onClick={onEnd}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
          </div>
        </>
      )}

      {/* Appel terminé */}
      {callState === "ended" && (
        <div className="text-center animate-in fade-in">
          <h2 className="text-white text-xl font-bold mb-2">Appel terminé</h2>
          <p className="text-white/60">{formatDuration(duration)}</p>
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
