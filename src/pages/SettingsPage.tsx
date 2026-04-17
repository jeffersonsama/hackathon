import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, User, Bell, Shield, Palette, Lock, Mail, Trash2, Volume2, Sun, Moon, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";

const SECTIONS = [
  { id: "account", label: "Compte", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Confidentialité", icon: Shield },
  { id: "appearance", label: "Apparence", icon: Palette },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("account");
  const { user, profile, signOut } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  return (
    <div className="w-full py-6 space-y-6">
      <div className="border-b border-border px-6 pb-2">
        <h1 className="text-xl font-bold text-foreground">
           Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">Gérez votre compte et vos préférences</p>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6  px-6">
        {/* Left nav */}
        <nav className="space-y-1">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <s.icon className="w-4 h-4" /> {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {activeSection === "account" && <AccountSection />}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "privacy" && <PrivacySection />}
          {activeSection === "appearance" && <AppearanceSection />}
        </motion.div>
      </div>
    </div>
  );
}

function AccountSection() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("Min. 8 caractères"); return; }
    if (newPassword !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe mis à jour");
    setNewPassword(""); setConfirmPassword("");
  };

  const handleDeleteAccount = async () => {
    if (deleteEmail !== user?.email) { toast.error("L'email ne correspond pas"); return; }
    await supabase.from("profiles").update({ account_status: "deleted" } as any).eq("user_id", user!.id);
    await signOut();
    navigate("/auth");
    toast.success("Votre compte a été supprimé.");
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Email</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" /> {user?.email}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Changer le mot de passe</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nouveau mot de passe</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 caractères" /></div>
          <div><Label>Confirmer</Label><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
          <Button onClick={handleChangePassword} disabled={loading}>
            <Lock className="w-4 h-4 mr-1" /> {loading ? "Mise à jour..." : "Changer le mot de passe"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-destructive/30">
        <CardHeader><CardTitle className="text-base text-destructive">Zone dangereuse</CardTitle></CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive/30"><Trash2 className="w-4 h-4 mr-1" /> Supprimer mon compte</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
                <AlertDialogDescription>Cette action est irréversible. Tapez votre email pour confirmer :</AlertDialogDescription>
              </AlertDialogHeader>
              <Input placeholder={user?.email} value={deleteEmail} onChange={e => setDeleteEmail(e.target.value)} />
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground" disabled={deleteEmail !== user?.email}>Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const prefs = (profile as any)?.notification_preferences || { messages: true, posts: true, events: true, class_activity: true, announcements: true, endorsements: true, recommendations: true, sound_enabled: true, sound_volume: 40 };

  const updatePref = async (key: string, value: any) => {
    const newPrefs = { ...prefs, [key]: value };
    await supabase.from("profiles").update({ notification_preferences: newPrefs } as any).eq("user_id", user!.id);
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const toggleItems = [
    { key: "messages", label: "Messages reçus" },
    { key: "posts", label: "Nouvelles publications" },
    { key: "events", label: "Rappels d'événements" },
    { key: "class_activity", label: "Activités dans mes classes" },
    { key: "announcements", label: "Annonces officielles" },
    { key: "endorsements", label: "Validations de compétences" },
    { key: "recommendations", label: "Nouvelles recommandations" },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Types de notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {toggleItems.map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <Label className="text-sm">{item.label}</Label>
              <Switch checked={prefs[item.key] ?? true} onCheckedChange={v => updatePref(item.key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Son</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Activer les sons de notification</Label>
            <Switch checked={prefs.sound_enabled ?? true} onCheckedChange={v => updatePref("sound_enabled", v)} />
          </div>
          {prefs.sound_enabled && (
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2"><Volume2 className="w-4 h-4" /> Volume ({prefs.sound_volume || 40}%)</Label>
              <Slider value={[prefs.sound_volume || 40]} min={0} max={100} step={5} onValueChange={([v]) => updatePref("sound_volume", v)} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PrivacySection() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const privacy = (profile as any)?.privacy_settings || { publications: true, cours: true, epreuves: true, groupes: true };

  const updatePrivacy = async (key: string, value: boolean) => {
    const newPrivacy = { ...privacy, [key]: value };
    await supabase.from("profiles").update({ privacy_settings: newPrivacy } as any).eq("user_id", user!.id);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Confidentialité mise à jour");
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-base">Visibilité publique</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {[
          { key: "publications", label: "Publications visibles publiquement" },
          { key: "cours", label: "Cours visibles publiquement" },
          { key: "epreuves", label: "Épreuves visibles publiquement" },
          { key: "groupes", label: "Groupes visibles publiquement" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between">
            <Label className="text-sm">{item.label}</Label>
            <Switch checked={privacy[item.key] ?? true} onCheckedChange={v => updatePrivacy(item.key, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const options = [
    { id: "light" as const, label: "Clair", icon: Sun },
    { id: "dark" as const, label: "Sombre", icon: Moon },
    { id: "system" as const, label: "Système", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Thème</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {options.map(opt => (
              <button key={opt.id} onClick={() => setTheme(opt.id)}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${theme === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                <opt.icon className={`w-6 h-6 ${theme === opt.id ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${theme === opt.id ? "text-primary" : "text-muted-foreground"}`}>{opt.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Langue</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Français (unique langue disponible)</p>
        </CardContent>
      </Card>
    </div>
  );
}
