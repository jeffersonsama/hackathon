import { useState, useRef, useEffect } from "react";
import { BookOpen, Bell, Calendar, ArrowRight, Send, Sparkles, Loader2, TrendingUp, Hash,Search, MessageSquare, X, Bot } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useConversations } from "@/hooks/use-messages";
import { useEvents } from "@/hooks/use-events";
import { useMyEnrollments } from "@/hooks/use-courses";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function QuickDashboard() {
  const { data: enrollments } = useMyEnrollments();
  const { data: unreadCount } = useUnreadCount();
  const { data: events } = useEvents();
  const navigate = useNavigate();

  const stats = [
    { label: "Cours", value: enrollments?.length || 0, icon: BookOpen, color: "bg-primary/10 text-primary" },
    { label: "Notifs", value: unreadCount || 0, icon: Bell, color: "bg-destructive/10 text-destructive" },
    { label: "Événements", value: events?.length || 0, icon: Calendar, color: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
  ];

  const nextEvent = events?.[0];

  return (
    
    <div>
        <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md pt-4 pb-4">
            <div className="relative group">
                <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Chercher..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      navigate(`/search?q=${encodeURIComponent(e.currentTarget.value.trim())}`);
                    }
                  }}
                 className="w-full bg-muted border border-border rounded-full py-3 pl-11 pr-4 text-[14px] focus:bg-card focus:border-primary/50 outline-none font-medium placeholder:text-muted-foreground transition-all"/>
            </div>
          </div>
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Dashboard</h3>
        <Link to="/dashboard" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
          Voir tout <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {stats.map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl bg-secondary/50">
            <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center`}>
              <s.icon className="w-4 h-4" />
            </div>
            <span className="text-lg font-black text-foreground leading-none">{s.value}</span>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
      </div>
      {nextEvent && (
        <div className="bg-secondary/50 rounded-xl p-3 flex gap-3 items-center cursor-pointer hover:bg-secondary transition-colors"
          onClick={() => navigate("/calendar")}>
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex flex-col items-center justify-center text-primary shrink-0">
            <span className="text-[8px] font-bold uppercase">{new Date((nextEvent as any).start_time).toLocaleDateString("fr-FR", { month: "short" })}</span>
            <span className="text-sm font-bold leading-none">{new Date((nextEvent as any).start_time).getDate()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{(nextEvent as any).title}</p>
            <p className="text-[10px] text-muted-foreground">{new Date((nextEvent as any).start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
      )}
    </div>

    </div>
    
  );
}

function QuickMessages() {
  const { data: conversations } = useConversations();
  const navigate = useNavigate();
  const recent = (conversations || []).slice(0, 4);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-black text-foreground">Messages</h3>
        </div>
        <Link to="/messages" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
          Tout voir <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-2 hide-scrollbar">
        {recent.length > 0 ? (
          recent.map((conv: any) => {
            const displayName = conv.name || "Utilisateur";
            const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={conv.id} onClick={() => navigate(`/messages?conversation=${conv.id}`)}
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
                  <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessagePreview || "..."}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <MessageSquare className="w-8 h-8 text-muted-foreground opacity-30" />
            <p className="text-xs text-muted-foreground">Aucun message récent</p>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border">
        <button onClick={() => navigate("/messages")}
          className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
          Ouvrir les messages
        </button>
      </div>
    </div>
  );
}

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

function QuickChatbot() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setInput("");
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Erreur du service IA");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snap = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snap } : m));
                }
                return [...prev, { role: "assistant", content: snap }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ ${e.message || "Erreur de connexion"}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-black text-foreground">Assistant IA</h3>
          <p className="text-[10px] text-muted-foreground">Prêt à vous aider 🎓</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto hide-scrollbar min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[180px]">
              Posez une question sur vos cours, épreuves ou révisions…
            </p>
            <div className="flex flex-col gap-1.5 w-full">
              {["Résume le cours de réseaux", "Explique les bases de données", "Comment préparer un examen ?"].map(s => (
                <button key={s} onClick={() => { setInput(s); }}
                  className="text-xs font-medium text-left px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-foreground">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs font-medium whitespace-pre-wrap leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-secondary text-foreground rounded-bl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-secondary px-3 py-2 rounded-2xl rounded-bl-sm text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex gap-2 items-end">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleSend(); }}
          placeholder="Poser une question..."
          className="flex-1 bg-secondary rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground transition-all resize-none" />
        <button onClick={handleSend} disabled={!input.trim() || loading}
          className="w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-95 shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function QuickTrending() {
  const { data: trending, isLoading } = useQuery({
    queryKey: ["trending-tags"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("posts")
        .select("tags, post_reactions(id)")
        .gte("created_at", since);
      if (error) throw error;

      const tagMap = new Map<string, { count: number; engagement: number }>();
      for (const post of (data || []) as any[]) {
        const tags = (post.tags as string[] | null) || [];
        const reactions = (post.post_reactions as any[] | null)?.length || 0;
        for (const tag of tags) {
          const t = tag.toLowerCase().trim();
          if (!t) continue;
          const existing = tagMap.get(t) || { count: 0, engagement: 0 };
          tagMap.set(t, { count: existing.count + 1, engagement: existing.engagement + reactions });
        }
      }

      if (tagMap.size < 3) {
        const { data: recentPosts } = await (supabase as any)
          .from("posts")
          .select("content, comments(count), post_reactions(id)")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(50);
        
        const wordFreq = new Map<string, number>();
        const stopWords = new Set(["le", "la", "les", "de", "du", "des", "un", "une", "et", "en", "est", "que", "qui", "dans", "pour", "pas", "sur", "au", "avec", "ce", "il", "je", "ne", "se", "son", "tout", "plus", "par", "mais", "ou", "où", "cette", "mon", "mes", "ma", "nous", "vous", "the", "a", "is", "to", "of", "and", "in", "it", "was", "for", "on"]);
        for (const p of (recentPosts || []) as any[]) {
          const words = (p.content || "").toLowerCase().split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w));
          for (const w of words) {
            wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
          }
        }
        const topWords = [...wordFreq.entries()]
          .filter(([_, count]) => count >= 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5 - tagMap.size);
        for (const [word, count] of topWords) {
          if (!tagMap.has(word)) tagMap.set(word, { count, engagement: 0 });
        }
      }

      return [...tagMap.entries()]
        .sort((a, b) => (b[1].count + b[1].engagement) - (a[1].count + a[1].engagement))
        .slice(0, 5)
        .map(([tag, stats]) => ({ tag, ...stats }));
    },
    refetchInterval: 60000,
  });

  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tendances</h3>
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse space-y-1">
              <div className="h-3 bg-secondary rounded w-2/3" />
              <div className="h-2 bg-secondary rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : trending && trending.length > 0 ? (
        <div className="flex flex-col gap-1">
          {trending.map((item, i) => (
            <div key={item.tag} className="flex items-start gap-3 p-2 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Hash className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{item.tag}</p>
                <p className="text-[10px] text-muted-foreground">
                  {item.count} publication{item.count > 1 ? "s" : ""}
                  {item.engagement > 0 && ` · ${item.engagement} réaction${item.engagement > 1 ? "s" : ""}`}
                </p>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground mt-1">#{i + 1}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">Aucune tendance pour le moment</p>
      )}
    </div>
  );
}

interface FeedRightSidebarProps {
  mode?: "dashboard" | "messages" | "assistant";
}

export default function FeedRightSidebar({ mode }: FeedRightSidebarProps = {}) {
  const [activePanel, setActivePanel] = useState<"messaging" | "assistant" | null>(null);

  const toggleMessaging = () => setActivePanel(p => p === "messaging" ? null : "messaging");
  const toggleAssistant = () => setActivePanel(p => p === "assistant" ? null : "assistant");

  if (mode === "dashboard") return <QuickDashboard />;
  if (mode === "messages") return <QuickMessages />;
  if (mode === "assistant") return <QuickChatbot />;

  return (
    <div className="w-full space-y-4 sticky top-4 h-fit">
      <QuickDashboard />
      <QuickTrending />

      {/* Floating panels */}
      {activePanel === "messaging" && (
        <div className="fixed bottom-36 right-6 w-80 h-[420px] bg-card border border-border rounded-2xl shadow-2xl z-40 flex flex-col animate-in slide-in-from-bottom-4 duration-200 overflow-hidden">
          <div className="flex items-center justify-end  px-4 py-2.5 border-b border-border">
            {/* <span className="text-xs font-black text-foreground">Messagerie rapide</span> */}
            <button onClick={toggleMessaging} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <QuickMessages />
          </div>
        </div>
      )}

      {activePanel === "assistant" && (
        <div className="fixed bottom-36 right-6 w-80 h-[460px] bg-card border border-border rounded-2xl shadow-2xl z-40 flex flex-col animate-in slide-in-from-bottom-4 duration-200 overflow-hidden">
          <div className="flex items-center justify-end px-4 py-2.5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            {/* <span className="text-xs font-black text-foreground">Assistant IA</span> */}
            <button onClick={toggleAssistant} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <QuickChatbot />
          </div>
        </div>
      )}

      {/* FABs */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2.5 z-50">
        <button
          onClick={toggleAssistant}
          title="Assistant IA"
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
            activePanel === "assistant"
              ? "bg-primary text-primary-foreground scale-105 shadow-primary/30"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
          }`}
        >
          {activePanel === "assistant" ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleMessaging}
          title="Messages"
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
            activePanel === "messaging"
              ? "bg-foreground text-background scale-105"
              : "bg-card border border-border text-foreground hover:bg-secondary"
          }`}
        >
          {activePanel === "messaging" ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
