import { supabase } from "@/integrations/supabase/client";

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export function getSignalingChannel(conversationId: string) {
  return supabase.channel(`webrtc:${conversationId}`, {
    config: { broadcast: { self: false } },
  });
}

export type SignalMessage =
  | { type: "offer"; sdp: RTCSessionDescriptionInit; from: string }
  | { type: "answer"; sdp: RTCSessionDescriptionInit; from: string }
  | { type: "ice"; candidate: RTCIceCandidateInit; from: string }
  | { type: "call-init"; call_type: "audio" | "video"; from: string; caller_name: string; caller_avatar: string }
  | { type: "call-accept"; from: string }
  | { type: "call-decline"; from: string }
  | { type: "call-end"; from: string; duration: number };

let ringtoneAudio: HTMLAudioElement | null = null;
export function playRingtone() {
  try {
    ringtoneAudio = new Audio("/sounds/ringtone.mp3");
    ringtoneAudio.loop = true;
    ringtoneAudio.play().catch(() => {});
  } catch {}
}
export function stopRingtone() {
  ringtoneAudio?.pause();
  ringtoneAudio = null;
}
