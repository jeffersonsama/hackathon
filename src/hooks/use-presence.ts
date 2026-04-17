import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePresence() {
  const { user } = useAuth();
  const awayTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user) return;

    const setStatus = (status: string) => {
      supabase
        .from("user_presence" as any)
        .upsert({ user_id: user.id, status, last_seen_at: new Date().toISOString() } as any, { onConflict: "user_id" })
        .then();
    };

    setStatus("online");

    const resetTimer = () => {
      clearTimeout(awayTimer.current);
      setStatus("online");
      awayTimer.current = setTimeout(() => setStatus("away"), 5 * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    awayTimer.current = setTimeout(() => setStatus("away"), 5 * 60 * 1000);

    const handleUnload = () => {
      // Use sendBeacon for reliability on tab close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}`;
      navigator.sendBeacon?.(url); // Best effort
      setStatus("offline");
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      window.removeEventListener("beforeunload", handleUnload);
      clearTimeout(awayTimer.current);
      setStatus("offline");
    };
  }, [user]);
}

export function formatPresence(status?: string, lastSeenAt?: string): string {
  if (!status || status === "offline") {
    if (lastSeenAt) {
      const diff = Date.now() - new Date(lastSeenAt).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Vu à l'instant";
      if (mins < 60) return `Vu il y a ${mins} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Vu il y a ${hours}h`;
      return `Vu il y a ${Math.floor(hours / 24)}j`;
    }
    return "Hors ligne";
  }
  if (status === "online") return "En ligne";
  if (status === "away") return "Absent";
  if (status === "busy") return "Occupé";
  return "Hors ligne";
}

export function presenceColor(status?: string): string {
  if (status === "online") return "bg-green-500";
  if (status === "away") return "bg-yellow-500";
  if (status === "busy") return "bg-red-500";
  return "";
}
