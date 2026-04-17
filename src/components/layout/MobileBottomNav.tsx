import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  Newspaper,
  Menu,
  Bell,
  Calendar,
  Users,
  FileText,
  GraduationCap,
  FolderOpen,
  Megaphone,
  Contact,
  Search,
  Shield,
  Settings,
  User,
  Bot,
  MessageSquare,
  X,
  Send,
  Sparkles,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useConversations } from "@/hooks/use-messages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import CreatePostModal from "@/components/feed/CreatePostModal";
import { motion } from "framer-motion";

const mainTabs = [
  { path: "/feed", label: "Feed", icon: Newspaper },
  { path: "/courses", label: "Cours", icon: BookOpen },
  { path: "/messages", label: "Messages", icon: MessageCircle },
];

const moreItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/classrooms", label: "Classes", icon: GraduationCap },
  { path: "/exams", label: "Ressources", icon: FileText },
  { path: "/groups", label: "Groupes", icon: Users },
  { path: "/announcements", label: "Annonces", icon: Megaphone },
  { path: "/calendar", label: "Calendrier", icon: Calendar },
  { path: "/documents", label: "Documents", icon: FolderOpen },
  { path: "/notifications", label: "Notifications", icon: Bell },
  { path: "/search", label: "Recherche", icon: Search },
  { path: "/directory", label: "Annuaire", icon: Contact },
  { path: "/profile", label: "Profil", icon: User },
  { path: "/settings", label: "Paramètres", icon: Settings },
];

type Msg = { role: "user" | "assistant"; content: string };
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const { hasRole, session } = useAuth();
  const { data: unreadCount } = useUnreadCount();
  const { data: conversations } = useConversations();
  const showAdmin = hasRole("admin") || hasRole("global_admin") || hasRole("establishment_admin");

  const [activePanel, setActivePanel] = useState<"chat" | "messages" | null>(null);
  const [chatMessages, setChatMessages] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: Msg = { role: "user", content: chatInput.trim() };
    setChatInput("");
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    let assistantSoFar = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${(session as any)?.access_token}` },
        body: JSON.stringify({ messages: [...chatMessages, userMsg] }),
      });
      if (!resp.ok || !resp.body) throw new Error("Erreur IA");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try {
            const content = JSON.parse(j).choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              const snap = assistantSoFar;
              setChatMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snap } : m);
                return [...prev, { role: "assistant", content: snap }];
              });
            }
          } catch { break; }
        }
      }
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: "assistant", content: `❌ ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const recentConvs = (conversations || []).slice(0, 4);

  return (
    <>
      {/* ── AI Chatbot Panel ── */}
      {activePanel === "chat" && (
        <div className="fixed bottom-[72px] right-3 w-72 h-[420px] bg-card border border-border rounded-2xl shadow-2xl z-[60] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-black text-foreground">Assistant IA</span>
            </div>
            <button onClick={() => setActivePanel(null)} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-secondary">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto hide-scrollbar">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                  Posez une question sur vos cours ou épreuves
                </p>
                <div className="flex flex-col gap-1.5 w-full">
                  {["Résume le cours de réseaux", "Explique les bases de données", "Comment préparer un examen ?"].map(s => (
                    <button key={s} onClick={() => setChatInput(s)}
                      className="text-xs text-left px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-foreground font-medium">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs font-medium whitespace-pre-wrap leading-relaxed ${msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm"
                  }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-secondary px-3 py-2 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border flex gap-2 items-center shrink-0">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleChatSend(); }}
              placeholder="Poser une question..."
              className="flex-1 bg-secondary rounded-full px-4 py-2 text-xs outline-none text-foreground placeholder:text-muted-foreground" />
            <button onClick={handleChatSend} disabled={!chatInput.trim() || chatLoading}
              className="w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Messages Panel ── */}
      {activePanel === "messages" && (
        <div className="fixed bottom-[72px] right-3 w-72 h-[380px] bg-card border border-border rounded-2xl shadow-2xl z-[60] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-black text-foreground">Messages récents</span>
            </div>
            <button onClick={() => setActivePanel(null)} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-secondary">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 hide-scrollbar">
            {recentConvs.length > 0 ? recentConvs.map((conv: any) => {
              const name = conv.name || "Utilisateur";
              const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={conv.id}
                  onClick={() => { navigate(`/messages?conversation=${conv.id}`); setActivePanel(null); }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <div className="relative shrink-0">
                    <Avatar className="w-9 h-9">
                      {conv.avatarUrl ? <AvatarImage src={conv.avatarUrl} /> : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessagePreview || "..."}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <MessageSquare className="w-8 h-8 text-muted-foreground opacity-30" />
                <p className="text-xs text-muted-foreground">Aucun message récent</p>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border shrink-0">
            <button onClick={() => { navigate("/messages"); setActivePanel(null); }}
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
              Ouvrir les messages
            </button>
          </div>
        </div>
      )}

      {/* ── FABs (above bottom nav, mobile only) ── */}
      <motion.div 
        drag
        dragMomentum={false}
        dragConstraints={{ 
          left: -400, 
          right: 20, 
          top: -800, 
          bottom: 20 
        }}
        className="fixed bottom-[72px] right-3 flex flex-col gap-2 z-50 lg:hidden cursor-grab active:cursor-grabbing touch-none"
      >
        <div
          onClick={() => setActivePanel(p => p === "chat" ? null : "chat")}
          className="w-11 h-11 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all">
          {activePanel === "chat" ? <X className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        <div
          onClick={() => setActivePanel(p => p === "messages" ? null : "messages")}
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all border ${activePanel === "messages"
            ? "bg-foreground text-background border-transparent"
            : "bg-card border-border text-foreground"
            }`}>
          {activePanel === "messages" ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
        </div>
      </motion.div>

      {/* ── Bottom navigation bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
        <div className="flex items-center justify-around h-14 px-1">
          {mainTabs.slice(0, 2).map((tab) => {
            const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + "/");
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors relative ${isActive ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                <tab.icon className="w-5 h-5" strokeWidth={2} />
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </Link>
            );
          })}

          {/* Create Post Button (Center) */}
          <button
            onClick={() => setCreatePostOpen(true)}
            className="flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground shadow-lg border-[3px] border-card active:scale-95 transition-all">
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </button>

          {mainTabs.slice(2).map((tab) => {
            const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + "/");
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors relative ${isActive ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                <tab.icon className="w-5 h-5" strokeWidth={2} />
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </Link>
            );
          })}

          {/* More sheet */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-muted-foreground">
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Plus</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh] pb-8">
              <div className="grid grid-cols-4 gap-3 pt-4">
                {moreItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${location.pathname === item.path
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary"
                      }`}
                  >
                    <div className="relative">
                      <item.icon className="w-5 h-5" />
                      {item.path === "/notifications" && (unreadCount || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-center leading-tight">{item.label}</span>
                  </Link>
                ))}
                {showAdmin && (
                  <Link to="/admin" onClick={() => setOpen(false)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-muted-foreground hover:bg-secondary">
                    <Shield className="w-5 h-5" />
                    <span className="text-[10px] font-semibold">Admin</span>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      <CreatePostModal isOpen={createPostOpen} onClose={() => setCreatePostOpen(false)} />
    </>
  );
}
