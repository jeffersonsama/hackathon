import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";

export default function NetworkBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => { setOffline(false); toast.success("Connexion rétablie"); };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => { window.removeEventListener("offline", goOffline); window.removeEventListener("online", goOnline); };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-warning text-warning-foreground text-sm py-2 px-4 flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      Vous êtes hors ligne. Certaines fonctionnalités sont indisponibles.
    </div>
  );
}
