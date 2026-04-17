import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Building2, GraduationCap } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast, Toaster } from "sonner";
import { Logo } from "@/components/ui/Logo";

const ROLES = [
  { value: "student", label: "Étudiant", description: "Email @upf.ac.ma obligatoire" },
  { value: "teacher", label: "Professeur", description: "Validation manuelle requise" },
  { value: "alumni", label: "Alumni", description: "Validation manuelle requise" },
  { value: "establishment_admin", label: "Administration", description: "Validation par admin global" },
];

const DEPARTMENTS = [
  "Informatique", "Mathématiques", "Physique", "Chimie", "Biologie",
  "Droit", "Économie", "Gestion", "Lettres", "Langues",
  "Sciences Politiques", "Médecine", "Pharmacie", "Architecture", "Autre",
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingOk, setMarketingOk] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/register") {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
  }, [location.pathname]);

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const needsUpfEmail = role === "student";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin && lockedUntil && Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000 / 60);
      toast.error(`Trop de tentatives. Réessayez dans ${remaining} min.`);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          if (newAttempts >= 5) {
            setLockedUntil(Date.now() + 15 * 60 * 1000);
            setAttempts(0);
            toast.error("Compte temporairement verrouillé (15 min).");
          } else {
            toast.error(`Identifiants incorrects. ${5 - newAttempts} tentative(s) restante(s).`);
          }
        } else {
          setAttempts(0);
          toast.success("Connexion réussie !");
          navigate("/dashboard");
        }
      } else {
        if (!fullName.trim()) { toast.error("Veuillez entrer votre nom complet"); setLoading(false); return; }
        if (password !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas"); setLoading(false); return; }
        if (needsUpfEmail && !email.toLowerCase().endsWith("@upf.ac.ma")) { toast.error("Les étudiants doivent utiliser un email @upf.ac.ma"); setLoading(false); return; }
        if (!department) { toast.error("Veuillez sélectionner un département"); setLoading(false); return; }
        if (!termsAccepted || !privacyAccepted) { toast.error("Veuillez accepter les conditions d'utilisation et la politique de confidentialité"); setLoading(false); return; }

        const { error } = await signUp(email, password, fullName, role, department);
        if (error) {
          toast.error(error.message);
        } else {
          if (role === "student") {
            toast.success("Compte créé avec succès !");
            navigate("/dashboard");
          } else {
            toast.success("Inscription envoyée ! Validation en cours.");
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      <Toaster position="top-center" richColors />
      <div className="flex flex-1">
        {/* Left: Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-y-auto max-h-screen custom-scrollbar pb-12 lg:pb-0 pt-12 lg:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[420px] space-y-8 my-auto"
          >
            <div className="flex items-center gap-3">
              <Logo className="h-10 w-auto text-primary-600" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                {isLogin ? "Bon retour !" : "Rejoindre UPF-Connect"}
              </h1>
              <p className="mt-2 text-gray-500 text-sm">
                {isLogin
                  ? "Connectez-vous pour accéder à votre espace universitaire"
                  : "Créez votre compte pour rejoindre la communauté UPF"}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-sm font-semibold text-gray-700 ml-1">Nom complet</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input id="name" placeholder="Prénom Nom" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-12 rounded-2xl bg-gray-50/50 border-gray-200 focus:ring-primary-50 focus:border-primary-500" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700 ml-1">Rôle</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="h-12 rounded-2xl bg-gray-50/50 border-gray-200 focus:ring-primary-50">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-gray-400" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-gray-200">
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value} className="focus:bg-primary-50 focus:text-primary-900 rounded-xl m-1">
                              <div>
                                <span className="font-semibold">{r.label}</span>
                                <span className="text-xs text-gray-500 ml-2">— {r.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700 ml-1">Département</Label>
                      <Select value={department} onValueChange={setDepartment}>
                        <SelectTrigger className="h-12 rounded-2xl bg-gray-50/50 border-gray-200 focus:ring-primary-50">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <SelectValue placeholder="Choisir un département" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-gray-200">
                          {DEPARTMENTS.map((d) => (
                            <SelectItem key={d} value={d} className="focus:bg-primary-50 focus:text-primary-900 rounded-xl m-1">{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 ml-1">
                  {!isLogin && needsUpfEmail ? "Email universitaire" : "Email"}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email" type="email"
                    placeholder={needsUpfEmail && !isLogin ? "etudiant@upf.ac.ma" : "votre@email.com"}
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-2xl bg-gray-50/50 border-gray-200 focus:ring-primary-50 focus:border-primary-500" required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 ml-1">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 rounded-2xl bg-gray-50/50 border-gray-200 focus:ring-primary-50 focus:border-primary-500" required minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 ml-1">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="••••••••"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 h-12 rounded-2xl bg-gray-50/50 border-gray-200 focus:ring-primary-50 focus:border-primary-500" required minLength={6}
                    />
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex justify-end pr-1 transition-all">
                  <button type="button" onClick={() => setShowForgotPassword(!showForgotPassword)} className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors">
                    {showForgotPassword ? "Annuler" : "Mot de passe oublié ?"}
                  </button>
                </div>
              )}

              {showForgotPassword && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-3 p-4 rounded-2xl bg-primary-50/50 border border-primary-100"
                >
                  {forgotSent ? (
                    <div className="text-center space-y-2">
                       <p className="text-sm text-primary-900 font-medium">Lien envoyé à <strong>{forgotEmail}</strong></p>
                       <button type="button" className="text-xs text-primary-600 font-bold hover:underline" onClick={() => { setShowForgotPassword(false); setForgotSent(false); }}>Retour</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] text-primary-700/70 font-medium px-1">Entrez votre email pour recevoir un lien de réinitialisation.</p>
                      <Input type="email" placeholder="votre@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="h-10 rounded-xl bg-white border-primary-200" />
                      <Button type="button" variant="outline" className="w-full h-11 rounded-xl border-primary-200 bg-white text-primary-700 hover:bg-primary-50 font-bold text-xs" onClick={async () => {
                        if (!forgotEmail) { toast.error("Veuillez entrer votre email"); return; }
                        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: window.location.origin + '/reset-password' });
                        if (error) { toast.error(error.message); return; }
                        setForgotSent(true);
                      }}>Envoyer le lien</Button>
                    </>
                  )}
                </motion.div>
              )}

              {!isLogin && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2 group cursor-pointer">
                    <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(!!v)} className="mt-0.5" />
                    <label htmlFor="terms" className="text-xs text-gray-500 leading-tight cursor-pointer group-hover:text-gray-700 transition-colors">
                      J'ai lu et j'accepte les <Link to="/terms" className="text-primary-600 font-bold hover:underline" target="_blank">Conditions d'Utilisation</Link>
                    </label>
                  </div>
                  <div className="flex items-start gap-2 group cursor-pointer">
                    <Checkbox id="privacy" checked={privacyAccepted} onCheckedChange={(v) => setPrivacyAccepted(!!v)} className="mt-0.5" />
                    <label htmlFor="privacy" className="text-xs text-gray-500 leading-tight cursor-pointer group-hover:text-gray-700 transition-colors">
                      J'accepte la <Link to="/privacy-policy" className="text-primary-600 font-bold hover:underline" target="_blank">Politique de Confidentialité</Link> et le traitement de mes données personnelles.
                    </label>
                  </div>
                  <div className="flex items-start gap-2 group cursor-pointer">
                    <Checkbox id="marketing" checked={marketingOk} onCheckedChange={(v) => setMarketingOk(!!v)} className="mt-0.5" />
                    <label htmlFor="marketing" className="text-xs text-gray-500 leading-tight cursor-pointer group-hover:text-gray-700 transition-colors">
                      J'accepte de recevoir des emails de la plateforme UPF-Connect (rappels d'événements, annonces officielles).
                    </label>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-14 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl mt-4 shadow-xl shadow-primary-600/10 transition-all active:scale-[0.98] group">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Chargement...
                  </span>
                ) : (
                  <>
                    {isLogin ? "Se connecter" : "Créer mon compte"}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 pb-12">
              {isLogin ? "Nouveau sur UPF-Connect ?" : "Déjà un compte ?"}{" "}
              <button 
                onClick={() => { setIsLogin(!isLogin); setRole("student"); setDepartment(""); setConfirmPassword(""); setTermsAccepted(false); setPrivacyAccepted(false); setMarketingOk(false); }} 
                className="text-primary-600 font-bold hover:text-primary-700 transition-colors"
                type="button"
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </button>
            </p>
          </motion.div>
        </div>

        {/* Right: Illustration */}
        <div className="hidden lg:flex flex-1 bg-primary-600 items-center justify-center p-12 relative overflow-hidden shadow-inner">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-white/10 blur-[100px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-white/10 blur-[120px] animate-pulse delay-1000" />
            <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] rounded-full bg-white/5 blur-[80px]" />
          </div>
          
          <div className="relative text-center max-w-lg space-y-8 z-10">
            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[40px] border border-white/20 shadow-2xl">
              <Logo className="h-32 w-auto text-white mx-auto drop-shadow-2xl mb-6" />
              <h2 className="text-4xl font-black text-white leading-tight mb-4">Bienvenue sur UPF-Connect</h2>
              <p className="text-white/90 text-lg leading-relaxed font-medium">
                La plateforme académique collaborative de l'Université UPF. Connectez-vous avec vos camarades, professeurs et alumni.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-4 px-6 text-center text-[10px] text-gray-400 bg-white border-t border-gray-50 flex flex-col md:flex-row justify-center gap-2 md:gap-6 uppercase tracking-widest font-bold">
        <span>© 2025 UPF-Connect — Université UPF</span>
        <div className="flex gap-4 justify-center">
            <Link to="/terms" className="hover:text-primary-600 transition-colors">Usage</Link>
            <Link to="/privacy" className="hover:text-primary-600 transition-colors">Confidentialité</Link>
            <a href="mailto:admin@upf.ac.ma" className="hover:text-primary-600 transition-colors underline decoration-primary-600/30 underline-offset-4">Contact</a>
        </div>
      </footer>
    </div>
  );
}
