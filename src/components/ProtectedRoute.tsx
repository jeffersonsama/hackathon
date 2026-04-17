import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Clock, XCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoUpf from "@/assets/logo-upf.png";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, signOut } = useAuth();
  const navigate = useNavigate();

  // FIX 8: Realtime subscription for account suspension
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("profile-status-" + user.id)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new?.account_status === "suspended") {
          signOut();
          navigate("/suspended");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, signOut, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Suspended account
  if (profile?.account_status === "suspended") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center space-y-6">
          <img src={logoUpf} alt="UPF" className="h-16 w-auto mx-auto" />
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Compte suspendu</h1>
          <p className="text-muted-foreground">
            Votre compte a été suspendu par l'administration. Pour toute question, contactez admin@upf.ac.ma
          </p>
          <Button variant="outline" onClick={() => { signOut(); navigate("/auth"); }}>Se déconnecter</Button>
        </motion.div>
      </div>
    );
  }

  // Pending account
  if (profile?.account_status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center space-y-6">
          <img src={logoUpf} alt="UPF" className="h-16 w-auto mx-auto" />
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Compte en attente de validation</h1>
          <p className="text-muted-foreground">
            Votre compte est en cours de validation par l'administration.
            Vous recevrez une notification dès que votre accès sera activé.
          </p>
        </motion.div>
      </div>
    );
  }

  // Rejected account
  if (profile?.account_status === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center space-y-6">
          <img src={logoUpf} alt="UPF" className="h-16 w-auto mx-auto" />
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Accès refusé</h1>
          <p className="text-muted-foreground">
            Votre demande d'accès n'a pas été approuvée. Contactez admin@upf.ac.ma pour plus d'informations.
          </p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
