import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const WARNING_TIME = 55 * 60 * 1000; // 55 min
const LOGOUT_TIME = 60 * 60 * 1000; // 60 min

export function useIdleTimer() {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const warningRef = useRef<ReturnType<typeof setTimeout>>();
  const logoutRef = useRef<ReturnType<typeof setTimeout>>();

  const reset = useCallback(() => {
    setShowWarning(false);
    clearTimeout(warningRef.current);
    clearTimeout(logoutRef.current);
    warningRef.current = setTimeout(() => setShowWarning(true), WARNING_TIME);
    logoutRef.current = setTimeout(() => {
      signOut();
      window.location.href = "/auth?reason=idle";
    }, LOGOUT_TIME);
  }, [signOut]);

  const stayConnected = useCallback(async () => {
    await supabase.auth.refreshSession();
    reset();
  }, [reset]);

  useEffect(() => {
    if (!user) return;
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const debounced = debounce(reset, 30000);
    events.forEach(e => window.addEventListener(e, debounced, { passive: true }));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, debounced));
      clearTimeout(warningRef.current);
      clearTimeout(logoutRef.current);
    };
  }, [user, reset]);

  return { showWarning, stayConnected, dismiss: () => setShowWarning(false) };
}

function debounce(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => { clearTimeout(timer); timer = setTimeout(fn, ms); };
}
