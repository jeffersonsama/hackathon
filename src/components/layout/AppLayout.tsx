import { useState, useRef, useEffect } from "react";
import HeaderSearchBar from "@/components/layout/HeaderSearchBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  Users,
  Newspaper,
  Calendar,
  Search,
  Bell,
  X,
  FileText,
  LogOut,
  Shield,
  GraduationCap,
  FolderOpen,
  Megaphone,
  Sun,
  Moon,
  Monitor,
  Contact,
  Plus,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useTheme } from "@/hooks/use-theme";
import { useIdleTimer } from "@/hooks/use-idle-timer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OnboardingModal from "@/components/OnboardingModal";
import { Logo } from "@/components/ui/Logo";
import CreatePostModal from "@/components/feed/CreatePostModal";
import FeedRightSidebar from "@/components/feed/FeedRightSidebar";

const mainNavItems = [
  { path: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { path: "/feed", label: "Fil d'actualité", icon: Newspaper },
  { path: "/notifications", label: "Notifications", icon: Bell },
  { path: "/messages", label: "Messages", icon: MessageCircle },
  { path: "/courses", label: "Cours", icon: BookOpen },
  { path: "/classrooms", label: "Classes", icon: GraduationCap },
  { path: "/announcements", label: "Annonces", icon: Megaphone },
];

const secondaryNavItems = [
  { path: "/exams", label: "Ressources", icon: FileText },
  { path: "/groups", label: "Groupes", icon: Users },
  { path: "/calendar", label: "Calendrier", icon: Calendar },
  { path: "/documents", label: "Documents", icon: FolderOpen },
  { path: "/search", label: "Recherche", icon: Search },
  { path: "/directory", label: "Annuaire", icon: Contact },
  { path: "/settings", label: "Paramètres", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, hasRole, roles } = useAuth();
  const { data: unreadCount } = useUnreadCount();
  const { theme, cycleTheme } = useTheme();
  const { showWarning, stayConnected, dismiss } = useIdleTimer();

  // Close floating More menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setShowMore(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check onboarding
  const needsOnboarding = profile && (profile as any).onboarding_completed === false && (profile as any).account_status === "active";

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const initials = ((profile as any)?.full_name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const showAdmin = hasRole("admin") || hasRole("global_admin") || hasRole("establishment_admin");
  const hideRightSidebar =
    location.pathname.startsWith("/administration") ||
    location.pathname.startsWith("/messages") ||
    location.pathname.startsWith("/announcements") ||
    location.pathname.startsWith("/directory") ||
    location.pathname.startsWith("/profile");
  const collapseSidebar = hideRightSidebar;

  return (
    <div className="flex h-screen bg-card overflow-hidden w-full">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Centered 3-column container (upf-connect sizing) */}
      <div className="flex w-full h-screen lg:px-4 xl:px-8">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-[70] bg-card border-r border-border flex flex-col py-6 transition-all duration-300 shrink-0 h-full ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } md:static md:inset-auto md:translate-x-0 md:z-30 md:w-20 lg:w-[280px]`}
        >
          {/* Logo */}
          <div className={`flex items-center justify-between px-4 mb-6`}>
            <Logo className="h-10 w-auto text-primary md:h-12 lg:h-24" />
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Nav — scrollable middle so publish + profile stay visually separated at the bottom */}
          <nav className={`flex flex-col gap-1 px-4 flex-1 min-h-0 overflow-y-auto hide-scrollbar`}>
            {mainNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isNotif = item.path === "/notifications";
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  title={item.label}
                  className={`flex items-center gap-4 rounded-2xl font-medium transition-all relative px-4 py-2.5 md:justify-center lg:justify-start
                  ${isActive
                      ? "text-primary font-bold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                >
                  <item.icon
                    className="w-6 h-6 shrink-0 transition-transform"
                    strokeWidth={2}
                  />
                  <span className="text-[15px] whitespace-nowrap md:hidden lg:inline">{item.label}</span>
                  {isNotif && (unreadCount || 0) > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* More button — custom floating menu like upf-connect */}
            <div className="" ref={moreRef}>
              <button
                onClick={() => setShowMore(!showMore)}
                title="Plus"
                className="w-full flex items-center gap-4 rounded-2xl font-medium transition-all text-muted-foreground hover:bg-secondary hover:text-relative relative px-4 py-2.5 md:justify-center lg:justify-start"
              >
                <div className="w-6 h-6 shrink-0 flex items-center justify-center border-2 border-current rounded-full">
                  <MoreHorizontal className="w-4 h-4" strokeWidth={3} />
                </div>
                <span className="text-[15px] whitespace-nowrap md:hidden lg:inline">Plus</span>
              </button>

              {showMore && (
                <div className="absolute bottom-48  left-0  bg-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border py-2 w-56 animate-in fade-in zoom-in-95 duration-200">
                  {secondaryNavItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => { setShowMore(false); setSidebarOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors ${location.pathname === item.path ? "text-primary font-bold" : "text-foreground"
                        }`}
                    >
                      <item.icon className="w-5 h-5" strokeWidth={2} />
                      <span className="text-[14px]">{item.label}</span>
                    </Link>
                  ))}
                  {showAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => { setShowMore(false); setSidebarOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors ${location.pathname === "/admin" ? "text-primary font-bold" : "text-foreground"
                        }`}
                    >
                      <Shield className="w-5 h-5 text-primary" strokeWidth={2} />
                      <span className="text-[14px] font-medium text-primary">Administration</span>
                    </Link>
                  )}
                  <div className="mx-4 my-1 border-t border-border" />
                  <button
                    onClick={() => { cycleTheme(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-foreground"
                  >
                    <ThemeIcon className="w-5 h-5" strokeWidth={2} />
                    <span className="text-[14px]">{theme === "dark" ? "Mode sombre" : theme === "light" ? "Mode clair" : "Système"}</span>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Publish button */}
          <div className="mt-3 shrink-0 mb-5 px-4">
            <button
              onClick={() => setIsCreatePostOpen(true)}
              title="Publier"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all shadow-md active:scale-95 flex items-center justify-center w-full h-14 rounded-full md:h-12 lg:h-14"
            >
              <Plus className="w-6 h-6" strokeWidth={3} />
              <span className="text-[15px] md:hidden lg:inline">Publier</span>
            </button>
          </div>

          {/* User section */}
          <div className="border-t border-border pt-4 pb-2 shrink-0 overflow-hidden px-4">
            <Link
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              title={(profile as any)?.full_name || "Profil"}
              className={`flex items-center rounded-2xl transition-all gap-3 px-3 py-2 md:justify-center lg:justify-start
              ${location.pathname === "/profile"
                  ? "bg-secondary"
                  : "hover:bg-secondary"
                }`}
            >
              <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shadow-sm">
                {(profile as any)?.avatar_url
                  ? <img src={(profile as any).avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                  : initials
                }
              </div>
              <div className="flex-1  min-w-0 md:hidden lg:flex lg:flex-col lg:min-w-0  ">
                <p className="text-sm font-bold text-foreground truncate">{(profile as any)?.full_name || "Utilisateur"}</p>
                <p className="text-[11px] text-muted-foreground truncate capitalize tracking-wide font-medium">
                  {roles.includes("global_admin") ? "Super Admin" :
                    roles.includes("admin") || roles.includes("establishment_admin") ? "Admin" :
                      roles.includes("teacher") ? "Professeur" :
                        roles.includes("alumni") ? "Alumni" : "Étudiant"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Se déconnecter"
                className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-xl hover:bg-destructive/10 shrink-0 md:hidden lg:block"
              >
                <LogOut className="w-[18px] h-[18px]" strokeWidth={2.5} />
              </button>
            </Link>
          </div>
        </aside>

        {/* Main content (center column) */}
        <div className={`flex flex-col min-w-0 overflow-hidden relative bg-card border-r border-border transition-all duration-300 w-full flex-1`}>
          {/* Top bar — mobile only */}
          <header className="md:hidden h-16 border-b border-border bg-primary flex items-center px-4 gap-4 sticky top-0 z-20">
            <Logo className="h-7 w-auto text-primary-foreground" />

            <div className="flex-1" />

            <HeaderSearchBar />

            <div className="flex-1" />

            <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/notifications")}>
              <Bell className="w-5 h-5" />
              {(unreadCount || 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button>
                  <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary-foreground/50 transition-all">
                    <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/profile")}>Voir mon profil</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>Paramètres</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">Se déconnecter</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Page content */}
          <main className="flex min-h-0 flex-1 flex-col overflow-y-scroll pb-16 lg:pb-0">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex min-h-0 w-full flex-1 flex-col"
            >
              {children}
            </motion.div>
          </main>
        </div>

        {!hideRightSidebar && (
          <aside className="hidden md:flex flex-col lg:w-[300px] xl:w-[350px] flex-none h-screen overflow-y-auto hide-scrollbar bg-card px-4 pb-6 gap-6">
            <FeedRightSidebar />
          </aside>
        )}
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
      {needsOnboarding && !onboardingDismissed && <OnboardingModal onComplete={() => setOnboardingDismissed(true)} />}
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />

      {/* Idle warning */}
      <Dialog open={showWarning} onOpenChange={dismiss}>
        <DialogContent>
          <DialogHeader><DialogTitle>Session inactive</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Votre session expire dans 5 minutes. Cliquez pour rester connecté.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { signOut(); navigate("/auth"); }}>Se déconnecter</Button>
            <Button onClick={stayConnected}>Rester connecté</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
