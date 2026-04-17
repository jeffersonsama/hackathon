import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Share2, ThumbsUp, Tag, Send, Image, Video, FileText, X, Paperclip, Link as LinkIcon, FolderOpen, Trophy, Pin, MoreHorizontal, Flag, Trash2, Ghost } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ReportDialog from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePosts, useToggleReaction, useDeletePost } from "@/hooks/use-posts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import StoriesBar from "@/components/feed/StoriesBar";

import clsx from "clsx";

function formatPostTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function pseudoHandle(name: string) {
  const s = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  return s.slice(0, 15) || "user";
}

function usePostComments(postId: string | null) {
  return useQuery({
    queryKey: ["post-comments", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const userIds = [...new Set(data.map(c => c.user_id))];
      if (!userIds.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const pMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return data.map(c => ({
        ...c,
        authorName: pMap.get(c.user_id)?.full_name || "Utilisateur",
        authorAvatar: pMap.get(c.user_id)?.avatar_url || null,
      }));
    },
  });
}

function PostComments({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: comments, isLoading } = usePostComments(postId);
  const [text, setText] = useState("");

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("comments").insert({
        post_id: postId, user_id: user!.id, content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["post-comments", postId] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-comments", postId] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!text.trim()) return;
    addComment.mutate(text.trim());
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
          <MessageCircle className="w-3 h-3" /> Commentaires ({comments?.length || 0})
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto hide-scrollbar mb-2">
        {isLoading ? (
          <Skeleton className="h-8 w-full rounded-lg" />
        ) : comments?.length ? (
          comments.map((c: any) => (
            <div key={c.id} className="flex gap-2 items-start group">
              <Avatar className="w-6 h-6 shrink-0">
                {c.authorAvatar && <AvatarImage src={c.authorAvatar} />}
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                  {c.authorName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-foreground">{c.authorName}</span>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <p className="text-xs text-foreground/80">{c.content}</p>
              </div>
              {c.user_id === user?.id && (
                <button onClick={() => deleteComment.mutate(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity p-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-[10px] text-muted-foreground text-center py-2">Aucun commentaire</p>
        )}
      </div>

      {user && (
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Ajouter un commentaire..."
            className="flex-1 bg-secondary rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
          />
          <button onClick={handleSubmit} disabled={!text.trim() || addComment.isPending}
            className="w-7 h-7 bg-primary text-primary-foreground rounded-lg flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 shrink-0">
            <Send className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}




 function PostCard({ post, index }: { post: any; index: number }) {
  const toggleReaction = useToggleReaction();
  const deletePost = useDeletePost();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const authorName = post.profiles?.full_name || "Utilisateur";
  const authorInitials = authorName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const reactions = post.post_reactions || [];
  const reactionCount = reactions.length;
  const hasReacted = reactions.some((r: any) => r.user_id === user?.id);
  const commentCount = (post.comments as any)?.[0]?.count || 0;
  const media: string[] = post.media_urls || [];
  const postType = post.post_type || "standard";
  const tags: string[] = post.tags || [];
  const wordCount = (post.content || "").split(/\s+/).length;
  const readTime = Math.max(1, Math.round(wordCount / 200));
  const isOwner = post.user_id === user?.id;

  const isAchievement = postType === "achievement";
  const isArticle = postType === "article";
  const isProject = postType === "project";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
      <article className={`bg-card mb-4 rounded-[2rem] p-5 shadow-card border border-border ${isAchievement ? "border-l-4 border-l-amber-400" : ""} ${post.pinned ? "border-l-4 border-l-primary" : ""}`}>
        {/* Pinned banner */}
        {post.pinned && (
          <div className="flex items-center gap-1 text-xs text-primary font-medium mb-3">
            <Pin className="w-3 h-3" /> Annonce officielle — UPF
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.user_id}`}>
              <Avatar className="w-10 h-10">
                {post.profiles?.avatar_url ? <AvatarImage src={post.profiles.avatar_url} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{authorInitials}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link to={`/profile/${post.user_id}`} className="font-bold text-sm text-foreground hover:text-primary transition-colors">{authorName}</Link>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-muted-foreground font-medium">{new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                {isArticle && <span className="text-[11px] text-muted-foreground">· {readTime} min de lecture</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {postType !== "standard" && (
              <Badge variant="secondary" className="text-xs rounded-lg">
                {isArticle && <><FileText className="w-3 h-3 mr-1" /> Article</>}
                {isProject && <><FolderOpen className="w-3 h-3 mr-1" /> Projet</>}
                {isAchievement && <><Trophy className="w-3 h-3 mr-1 text-amber-500" /> Réalisation</>}
                {postType === "link" && <><LinkIcon className="w-3 h-3 mr-1" /> Lien</>}
              </Badge>
            )}
            {isOwner ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><MoreHorizontal className="w-5 h-5" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (confirm("Supprimer cette publication ?")) {
                        deletePost.mutate(post.id, {
                          onSuccess: () => toast.success("Publication supprimée"),
                          onError: (e: any) => toast.error(e.message),
                        });
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-2" /> Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><MoreHorizontal className="w-5 h-5" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setReportOpen(true)}><Flag className="w-3 h-3 mr-2" /> Signaler ce post</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Title for typed posts */}
        {post.title && <h3 className="text-lg font-bold text-foreground mb-2">{post.title}</h3>}

        {/* Content */}
        {post.content && (
          <div className="mb-4">
            <p className={`text-sm text-foreground leading-relaxed whitespace-pre-wrap ${!expanded && isArticle ? "line-clamp-4" : ""}`}>{post.content}</p>
            {isArticle && post.content.length > 300 && (
              <button className="text-sm text-primary font-bold mt-1 hover:underline" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Réduire" : "Lire l'article"}
              </button>
            )}
          </div>
        )}

        {/* External URL */}
        {post.external_url && (
          <a href={post.external_url} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-2xl border border-border bg-secondary/50 hover:bg-secondary transition-colors mb-4">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary truncate">{post.external_url}</span>
            </div>
          </a>
        )}

        {/* Media */}
        {media.length > 0 && (
          <div className={`grid gap-2 mb-4 ${media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {media.map((url: string, j: number) => {
              const isVideo = url.match(/\.(mp4|webm)(\?|$)/i);
              const isDoc = url.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|zip)(\?|$)/i);
              if (isVideo) return <video key={j} src={url} controls className="w-full rounded-2xl max-h-80 object-cover" />;
              if (isDoc) {
                const name = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "Document");
                return (
                  <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors border border-border">
                    <FileText className="w-5 h-5 text-primary" /><span className="text-sm text-foreground truncate">{name}</span>
                  </a>
                );
              }
              return <img key={j} src={url} alt="" className="w-full rounded-2xl max-h-80 object-cover cursor-pointer hover:opacity-90 transition-opacity" />;
            })}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            {tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs rounded-lg"><Tag className="w-2.5 h-2.5 mr-0.5" />{tag}</Badge>)}
          </div>
        )}

        {/* Interaction Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-4">
            <button className={`flex items-center gap-1.5 transition-colors ${hasReacted ? "text-primary" : "text-muted-foreground hover:text-primary"}`} onClick={() => toggleReaction.mutate({ postId: post.id, type: "👍" })}>
              <ThumbsUp className={`w-5 h-5 ${hasReacted ? "fill-current" : ""}`} />
              <span className="text-sm font-medium">{reactionCount}</span>
            </button>
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors" onClick={() => setShowComments(!showComments)}>
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{commentCount}</span>
            </button>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} contentType="post" contentId={post.id} />
        {showComments && (
          <PostComments postId={post.id} onClose={() => setShowComments(false)} />
        )}
      </article>
    </motion.div>
  );
}

export default function FeedPage() {
  const { data: posts, isLoading } = usePosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get("type") || "all";

  const FILTERS = [
    { key: "all", label: "Tout" },
    { key: "article", label: "Articles" },
    { key: "project", label: "Projets" },
    { key: "achievement", label: "Réalisations" },
  ];

  const filteredPosts = (posts || []).filter((p: any) => {
    if (typeFilter === "all") return true;
    return (p.post_type || "standard") === typeFilter;
  });

  // Sort: pinned first
  const sortedPosts = [...filteredPosts].sort((a: any, b: any) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

return (
    <div className=" max-w-7xl mx-auto w-full bg-background/80">
     
      {/* Filters - Sticky */}
      <div className=" sticky top-0 z-20 bg-background/80 md:px-4 lg:px-6 xl:px-24 backdrop-blur-md py-4 md:py-5 border-b border-border mb-3 md:mb-5">
            <StoriesBar />
        <div className="md:px-0 px-10 flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setSearchParams(f.key === "all" ? {} : { type: f.key })}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0 ${
                typeFilter === f.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
       </div>
      {/* Main feed column */}
      <div className="flex flex-col flex-1 min-w-0 pb-24 md:pb-6 lg:pb-8 px-4 md:px-6 lg:px-8 xl:px-12">
        {/* <div className="px-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fil d'actualité</h1>
            <p className="text-sm text-muted-foreground mt-1">Restez informé de l'activité de votre communauté</p>
          </div>
        </div> */}

    
       

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card rounded-[2rem] p-5 shadow-card border border-border space-y-4">
              <div className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></div>
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))
        ) : sortedPosts.length > 0 ? (
          sortedPosts.map((post: any, i: number) => <PostCard key={post.id} post={post} index={i} />)
        ) : (
          <div className="bg-card rounded-[2rem] p-8 shadow-card border border-border text-center">
            <p className="text-muted-foreground">Aucune publication. Soyez le premier à publier !</p>
          </div>
        )}
      </div>

    </div>
         
  )
}
