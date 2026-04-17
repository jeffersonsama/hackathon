import { useRef, useState, useCallback, useEffect } from "react";
import { ICE_SERVERS, getSignalingChannel, SignalMessage, playRingtone, stopRingtone } from "@/lib/webrtc";
import { supabase } from "@/integrations/supabase/client";

export type CallState = "idle" | "calling" | "ringing" | "active" | "ended";

export interface IncomingCall {
  from: string;
  name: string;
  avatar: string;
  type: "audio" | "video";
}

export function useWebRTCCall(conversationId: string | null, currentUserId: string | null) {
  const pc = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof getSignalingChannel> | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const callStartTime = useRef(0);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const callStateRef = useRef<CallState>("idle");
  // ✅ Garde la SDP de l'offer reçu pour que acceptCall puisse l'utiliser
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const missedCallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);

  const updateState = useCallback((s: CallState) => {
    callStateRef.current = s;
    setCallState(s);
  }, []);

  // Chronomètre
  useEffect(() => {
    if (callState !== "active") return;
    const t = setInterval(() => setDuration(Math.floor((Date.now() - callStartTime.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [callState]);

  // ✅ Création de la PeerConnection — séparée pour éviter les closures stales
  const createPC = useCallback(() => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    const conn = new RTCPeerConnection(ICE_SERVERS);

    conn.onicecandidate = ({ candidate }) => {
      if (candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast", event: "signal",
          payload: { type: "ice", candidate: candidate.toJSON(), from: currentUserId! } as SignalMessage,
        });
      }
    };

    conn.ontrack = ({ streams }) => {
      if (streams[0]) setRemoteStream(streams[0]);
    };

    conn.onconnectionstatechange = () => {
      if (conn.connectionState === "connected") {
        updateState("active");
        callStartTime.current = Date.now();
      } else if (["disconnected", "failed", "closed"].includes(conn.connectionState)) {
        // L'autre côté a raccroché brutalement
        if (callStateRef.current === "active") {
          cleanup();
          updateState("ended");
          setTimeout(() => updateState("idle"), 2000);
        }
      }
    };

    pc.current = conn;
    return conn;
  }, [currentUserId, updateState]);

  const getUserMedia = useCallback(async (type: "audio" | "video") => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video"
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
        : false,
    });
    localStream.current = stream;
    setLocalMediaStream(stream);
    return stream;
  }, []);

  const cleanup = useCallback(() => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
    pc.current = null;
    localStream.current = null;
    pendingOfferRef.current = null;
    iceCandidateQueue.current = [];
    setRemoteStream(null);
    setLocalMediaStream(null);
    stopRingtone();
    if (missedCallTimer.current) {
      clearTimeout(missedCallTimer.current);
      missedCallTimer.current = null;
    }
  }, []);

  // ✅ Signaling listener — un seul channel, créé une fois, pas re-souscrit dans initiateCall
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const ch = getSignalingChannel(conversationId);
    channelRef.current = ch;

    ch.on("broadcast", { event: "signal" }, async ({ payload }: { payload: SignalMessage }) => {
      if (payload.from === currentUserId) return;

      switch (payload.type) {

        case "call-init":
          // Ne pas afficher l'appel entrant si on est déjà en appel
          if (callStateRef.current !== "idle") break;
          setIncomingCall({
            from: payload.from,
            name: payload.caller_name,
            avatar: payload.caller_avatar,
            type: payload.call_type,
          });
          updateState("ringing");
          playRingtone();
          break;

        case "offer":
          // ✅ Stocker l'offer sans répondre — acceptCall s'en chargera
          pendingOfferRef.current = payload.sdp;
          if (!pc.current) createPC();
          await pc.current!.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          // Appliquer les ICE candidates en attente
          for (const c of iceCandidateQueue.current) {
            await pc.current!.addIceCandidate(new RTCIceCandidate(c));
          }
          iceCandidateQueue.current = [];
          break;

        case "answer":
          if (pc.current) {
            await pc.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
          break;

        case "ice":
          if (pc.current?.remoteDescription) {
            await pc.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            iceCandidateQueue.current.push(payload.candidate);
          }
          break;

        case "call-accept":
          // L'appelé a accepté — passer en actif (la connexion WebRTC confirmera)
          updateState("active");
          callStartTime.current = Date.now();
          break;

        case "call-decline":
          cleanup();
          updateState("idle");
          break;

        case "call-end":
          cleanup();
          updateState("ended");
          setTimeout(() => updateState("idle"), 2000);
          break;
      }
    }).subscribe();

    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [conversationId, currentUserId, createPC, cleanup, updateState]);

  // ── Initier un appel ──
  const initiateCall = useCallback(async (
    type: "audio" | "video",
    callerName: string,
    callerAvatar: string,
  ) => {
    if (!conversationId || !currentUserId || !channelRef.current) return;
    try {
      setCallType(type);
      updateState("calling");

      const stream = await getUserMedia(type);
      const conn = createPC();
      stream.getTracks().forEach((t) => conn.addTrack(t, stream));

      // Signaler l'appel entrant à l'autre participant
      channelRef.current.send({
        type: "broadcast", event: "signal",
        payload: {
          type: "call-init",
          call_type: type,
          from: currentUserId,
          caller_name: callerName,
          caller_avatar: callerAvatar,
        } as SignalMessage,
      });

      // Créer et envoyer l'offer SDP
      const offer = await conn.createOffer();
      await conn.setLocalDescription(offer);
      channelRef.current.send({
        type: "broadcast", event: "signal",
        payload: { type: "offer", sdp: offer, from: currentUserId } as SignalMessage,
      });

      // ✅ Timer missed call — utilise callStateRef pour éviter une closure stale
      missedCallTimer.current = setTimeout(() => {
        if (callStateRef.current === "calling") {
          channelRef.current?.send({
            type: "broadcast", event: "signal",
            payload: { type: "call-end", from: currentUserId, duration: 0 } as SignalMessage,
          });
          cleanup();
          updateState("idle");
        }
      }, 30000);

    } catch (err) {
      console.error("initiateCall error:", err);
      cleanup();
      updateState("idle");
    }
  }, [conversationId, currentUserId, getUserMedia, createPC, cleanup, updateState]);

  // ── Accepter un appel ──
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !currentUserId || !channelRef.current) return;
    try {
      setCallType(incomingCall.type);
      stopRingtone();

      const stream = await getUserMedia(incomingCall.type);
      if (!pc.current) createPC();
      stream.getTracks().forEach((t) => pc.current!.addTrack(t, stream));

      // ✅ Créer la réponse SDP uniquement ici (pas dans le listener "offer")
      const answer = await pc.current!.createAnswer();
      await pc.current!.setLocalDescription(answer);

      channelRef.current.send({
        type: "broadcast", event: "signal",
        payload: { type: "answer", sdp: answer, from: currentUserId } as SignalMessage,
      });

      channelRef.current.send({
        type: "broadcast", event: "signal",
        payload: { type: "call-accept", from: currentUserId } as SignalMessage,
      });

      callStartTime.current = Date.now();
      updateState("active");
      setIncomingCall(null);
    } catch (err) {
      console.error("acceptCall error:", err);
      declineCall();
    }
  }, [incomingCall, currentUserId, getUserMedia, createPC, updateState]);

  // ── Décliner un appel ──
  const declineCall = useCallback(() => {
    if (!currentUserId || !channelRef.current) return;
    channelRef.current.send({
      type: "broadcast", event: "signal",
      payload: { type: "call-decline", from: currentUserId } as SignalMessage,
    });
    stopRingtone();
    setIncomingCall(null);
    cleanup();
    updateState("idle");
  }, [currentUserId, cleanup, updateState]);

  // ── Terminer un appel ──
  const endCall = useCallback((reason: "ended" | "missed" | "declined" = "ended") => {
    if (!currentUserId || !conversationId || !channelRef.current) return;
    const dur = callStartTime.current
      ? Math.floor((Date.now() - callStartTime.current) / 1000)
      : 0;

    channelRef.current.send({
      type: "broadcast", event: "signal",
      payload: { type: "call-end", from: currentUserId, duration: dur } as SignalMessage,
    });

    // Enregistrer le log d'appel
    supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      message_type: "call_log",
      call_status: reason,
      duration_seconds: dur,
      content: callType === "audio" ? "Appel audio" : "Appel vidéo",
    } as any).then();

    cleanup();
    updateState("ended");
    setTimeout(() => updateState("idle"), 2000);
  }, [callType, currentUserId, conversationId, cleanup, updateState]);

  const toggleMute = useCallback(() => {
    localStream.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    localStream.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCamOff((c) => !c);
  }, []);

  return {
    callState, callType, isMuted, isCamOff, duration,
    incomingCall, remoteStream, localMediaStream,
    initiateCall, acceptCall, declineCall, endCall,
    toggleMute, toggleCamera,
  };
}
