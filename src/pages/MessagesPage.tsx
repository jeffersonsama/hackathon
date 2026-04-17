import { useState, useEffect } from "react";
import { useConversations, useMessages, useCreateDirectConversation } from "@/hooks/use-messages";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useProfileData } from "@/hooks/use-profile";
import ConversationSidebar from "@/components/messaging/ConversationSidebar";
import ChatPanel from "@/components/messaging/ChatPanel";
import InfoPanel from "@/components/messaging/InfoPanel";
import NewGroupDialog from "@/components/messaging/NewGroupDialog";
import CallOverlay from "@/components/messaging/CallOverlay";

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: profile } = useProfileData(user?.id);
  const { data: conversations, isLoading } = useConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(searchParams.get("conversation"));
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const createDirect = useCreateDirectConversation();

  const activeConv = conversations?.find((c) => c.id === activeConvId) || null;
  const { data: messages } = useMessages(activeConvId);

  const { callState, callType, isMuted, isCamOff, duration, incomingCall, remoteStream, localMediaStream,
    initiateCall, acceptCall, declineCall, endCall, toggleMute, toggleCamera } = useWebRTCCall(activeConvId, user?.id || null);

  // Handle ?new=userId from directory
  useEffect(() => {
    const newUserId = searchParams.get("new");
    if (newUserId && user) {
      createDirect.mutateAsync(newUserId).then((conv) => {
        setActiveConvId(conv.id);
        setShowSidebar(false);
      }).catch((err) => toast.error(err.message));
    }
  }, [searchParams.get("new")]);

  const handleSelectConv = (id: string) => {
    setActiveConvId(id);
    setShowSidebar(false);
  };

  const handleNewDirect = async (userId: string) => {
    try {
      const conv = await createDirect.mutateAsync(userId);
      setActiveConvId(conv.id);
      setShowSidebar(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleInitiateCall = (type: "audio" | "video") => {
    if (!user || !activeConv) return;
    const callerName = profile?.full_name || "Utilisateur";
    const callerAvatar = profile?.avatar_url || "";
    initiateCall(type, callerName, callerAvatar);
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-secondary text-foreground">
      <div className={`${showSidebar ? "flex" : "hidden lg:flex"} w-full lg:w-[400px] border-r border-border bg-card flex-col h-full shadow-sm`}> 
        <ConversationSidebar
          conversations={conversations}
          isLoading={isLoading}
          activeConvId={activeConvId}
          onSelectConv={handleSelectConv}
          onNewDirect={handleNewDirect}
          onNewGroup={() => setNewGroupOpen(true)}
        />
      </div>

      <div className={`flex-1 flex flex-col min-w-0 ${showSidebar ? "hidden lg:flex" : "flex"} bg-card`}> 
        <ChatPanel
          conversation={activeConv}
          messages={messages}
          onBack={() => setShowSidebar(true)}
          onToggleInfo={() => setShowInfo(!showInfo)}
          onInitiateCall={handleInitiateCall}
        />
      </div>

      {showInfo && activeConv && (
        <div className="hidden xl:flex flex-shrink-0">
          <InfoPanel conversation={activeConv} onClose={() => setShowInfo(false)} />
        </div>
      )}

      <NewGroupDialog open={newGroupOpen} onClose={() => setNewGroupOpen(false)}
        onCreated={(id) => { setActiveConvId(id); setShowSidebar(false); }} />

      <CallOverlay
        callState={callState} callType={callType} isMuted={isMuted} isCamOff={isCamOff}
        duration={duration} incomingCall={incomingCall} remoteStream={remoteStream} localMediaStream={localMediaStream}
        partnerName={activeConv?.name || "Utilisateur"} partnerAvatar={activeConv?.avatarUrl || null}
        onAccept={acceptCall} onDecline={declineCall} onEnd={() => endCall()}
        onToggleMute={toggleMute} onToggleCamera={toggleCamera}
      />
    </div>
  );
}
