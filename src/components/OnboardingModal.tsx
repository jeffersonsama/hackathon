import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Users, Newspaper, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import logoUpf from "@/assets/logo-upf.png";
import { FACULTES, NIVEAUX_ETUDIANT } from "@/lib/constants";

export default function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const avatarRef = useRef<HTMLInputElement>(null);
  const [bio, setBio] = useState("");
  const [department, setDepartment] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const firstName = (profile?.full_name || "").split(" ")[0] || "vous";

  const handleAvatarUpload = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(publicUrl);
    await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("user_id", user!.id);
    toast.success("Photo de profil ajoutée");
  };

  const saveProfile = async () => {
    const updates: any = {};
    if (bio) updates.bio = bio;
    if (department) updates.department = department;
    if (Object.keys(updates).length > 0) {
      await supabase.from("profiles").update(updates).eq("user_id", user!.id);
    }
  };

  const finish = async () => {
    try {
      const { error } = await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("user_id", user!.id);
      if (error) console.error("Onboarding update error:", error);
    } catch (e) {
      console.error("Onboarding finish error:", e);
    }
    qc.invalidateQueries({ queryKey: ["profile"] });
    onComplete();
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="text-center space-y-6">
      <img src={logoUpf} alt="UPF" className="h-20 w-auto mx-auto" />
      <h2 className="text-2xl font-bold text-foreground">Bienvenue sur UPF-Connect, {firstName} !</h2>
      <p className="text-muted-foreground">Votre espace académique universitaire.</p>
      <Button onClick={() => setStep(1)} className="bg-gradient-primary text-primary-foreground">
        Commencer <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>,

    // Step 1: Profile
    <div key="profile" className="space-y-6">
      <h2 className="text-xl font-bold text-foreground text-center">Complétez votre profil</h2>
      <div className="flex justify-center">
        <div className="relative">
          <Avatar className="w-20 h-20">
            {avatarUrl && <AvatarImage src={avatarUrl} />}
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">{firstName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <input ref={avatarRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
          <button onClick={() => avatarRef.current?.click()} className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow">
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <Textarea placeholder="Présentez-vous..." value={bio} onChange={e => setBio(e.target.value)} maxLength={300} />
      <Select value={department} onValueChange={setDepartment}>
        <SelectTrigger><SelectValue placeholder="Faculté" /></SelectTrigger>
        <SelectContent>{FACULTES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex gap-3 justify-center">
        <Button variant="ghost" onClick={() => setStep(2)}>Passer cette étape</Button>
        <Button onClick={() => { saveProfile(); setStep(2); }} className="bg-gradient-primary text-primary-foreground">Suivant <ArrowRight className="w-4 h-4 ml-2" /></Button>
      </div>
    </div>,

    // Step 2: Discover + Finish
    <div key="discover" className="space-y-6">
      <h2 className="text-xl font-bold text-foreground text-center">Découvrez la plateforme</h2>
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Newspaper, title: "Feed", desc: "Partagez vos projets et actualités" },
          { icon: BookOpen, title: "Cours", desc: "Apprenez à votre rythme" },
          { icon: Users, title: "Groupes", desc: "Collaborez avec vos pairs" },
        ].map(f => (
          <div key={f.title} className="text-center p-4 rounded-lg bg-secondary">
            <f.icon className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-semibold text-sm text-foreground">{f.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </div>
      <div className="text-center">
        <Button onClick={finish} className="bg-gradient-primary text-primary-foreground">
          Commencer à utiliser UPF-Connect <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-[9998] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Close button - always visible */}
      <button
        onClick={finish}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[9999] w-9 h-9 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-lg"
        title="Fermer"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="w-full max-w-md my-auto">
        {/* Progress */}
        <div className="flex gap-2 mb-6 sm:mb-8">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
