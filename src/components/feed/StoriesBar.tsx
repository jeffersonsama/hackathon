import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Story {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  bg_color: string;
  created_at: string;
  profiles: { full_name: string; avatar_url: string | null };
}

const BG_COLORS = [
  "bg-gradient-to-br from-blue-500 to-purple-600",
  "bg-gradient-to-br from-pink-500 to-rose-600",
  "bg-gradient-to-br from-green-500 to-emerald-600",
  "bg-gradient-to-br from-orange-500 to-amber-600",
  "bg-gradient-to-br from-indigo-500 to-violet-600",
  "bg-gradient-to-br from-cyan-500 to-teal-600",
];

function useStories() {
  return useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("stories")
        .select("*, profiles!stories_user_id_fkey(full_name, avatar_url)")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Story[];
    },
    refetchInterval: 30000,
  });
}

function useCreateStory() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ content, mediaUrl, bgColor }: { content?: string; mediaUrl?: string; bgColor?: string }) => {
      const { error } = await (supabase as any).from("stories").insert({
        user_id: user!.id,
        content: content || null,
        media_url: mediaUrl || null,
        bg_color: bgColor || BG_COLORS[0],
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });
}

// Group stories by user
function groupByUser(stories: Story[]) {
  const map = new Map<string, Story[]>();
  for (const s of stories) {
    const arr = map.get(s.user_id) || [];
    arr.push(s);
    map.set(s.user_id, arr);
  }
  return Array.from(map.entries()).map(([userId, items]) => ({
    userId,
    name: items[0].profiles?.full_name || "Utilisateur",
    avatar: items[0].profiles?.avatar_url,
    stories: items,
  }));
}

function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      const { error } = await (supabase as any).from("stories").delete().eq("id", storyId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });
}

function StoryViewer({ groups, startIndex, onClose }: {
  groups: ReturnType<typeof groupByUser>;
  startIndex: number;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const deleteStory = useDeleteStory();
  const [groupIdx, setGroupIdx] = useState(startIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  useEffect(() => {
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [groupIdx, storyIdx]);

  const goNext = () => {
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1);
      setStoryIdx(0);
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div className="relative mx-5  w-full h-[95vh]  md:h-full md:max-w-sm md:max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{ width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-3 right-3 z-10 flex items-center gap-2">
          <Avatar className="w-8 h-8 border-2 border-white">
            {group.avatar && <AvatarImage src={group.avatar} />}
            <AvatarFallback className="text-xs bg-white/20 text-white">{group.name[0]}</AvatarFallback>
          </Avatar>
          <span className="text-white text-sm font-medium drop-shadow">{group.name}</span>
          <span className="text-white/60 text-xs">
            {new Date(story.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {story.user_id === user?.id && (
            <button
              onClick={() => {
                if (confirm("Supprimer cette story ?")) {
                  deleteStory.mutate(story.id, {
                    onSuccess: () => {
                      toast.success("Story supprimée");
                      // If last story in group, close viewer
                      if (group.stories.length <= 1) {
                        onClose();
                      } else {
                        goNext();
                      }
                    },
                    onError: (e: any) => toast.error(e.message),
                  });
                }
              }}
              className="text-white/80 hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="ml-auto text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Story content */}
        <div className={`w-full h-full rounded-xl overflow-hidden flex items-center justify-center ${story.bg_color || BG_COLORS[0]}`}>
          {story.media_url ? (
            story.media_url.match(/\.(mp4|webm)/i) ? (
              <video src={story.media_url} className="w-full h-full object-cover" autoPlay muted />
            ) : (
              <img src={story.media_url} alt="" className="w-full h-full object-cover" />
            )
          ) : (
            <p className="text-white text-xl font-bold text-center px-8 drop-shadow-lg leading-relaxed">
              {story.content}
            </p>
          )}
        </div>

        {/* Navigation */}
        <button onClick={goPrev} className="absolute left-0 top-0 bottom-0 w-1/3" />
        <button onClick={goNext} className="absolute right-0 top-0 bottom-0 w-1/3" />
      </div>
    </div>
  );
}

export default function StoriesBar() {
  const { data: stories } = useStories();
  const { user, profile } = useAuth();
  const createStory = useCreateStory();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [bgIdx, setBgIdx] = useState(0);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const groups = groupByUser(stories || []);
  const initials = (profile?.full_name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleCreate = async () => {
    if (!content.trim() && !mediaFile) return;
    setUploading(true);
    try {
      let mediaUrl: string | undefined;
      if (mediaFile) {
        const ext = mediaFile.name.split(".").pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("stories").upload(path, mediaFile);
        if (error) throw error;
        const { data } = supabase.storage.from("stories").getPublicUrl(path);
        mediaUrl = data.publicUrl;
      }
      await createStory.mutateAsync({ content, mediaUrl, bgColor: BG_COLORS[bgIdx] });
      toast.success("Story publiée !");
      setContent("");
      setMediaFile(null);
      setMediaPreview(null);
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  return (
    <>
      <div className="relative md:px-0 px-10">
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {/* Create story button */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex-shrink-0 flex flex-col items-center gap-1"
          >
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-secondary border-2 border-dashed border-primary/40 flex items-center justify-center hover:border-primary transition-colors relative">
              <Avatar className="w-14 h-14 sm:w-16 sm:h-16">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                <Plus className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Ma story</span>
          </button>

          {/* User stories */}
          {groups.map((group, i) => (
            <button
              key={group.userId}
              onClick={() => setViewerIdx(i)}
              className="flex-shrink-0 flex flex-col items-center gap-1"
            >
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full p-[2px] bg-gradient-to-br from-primary to-accent">
                <Avatar className="w-full h-full border-2 border-background">
                  {group.avatar && <AvatarImage src={group.avatar} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {group.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[11px] text-foreground font-medium truncate max-w-[64px]">
                {group.userId === user?.id ? "Moi" : group.name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Story viewer */}
      {viewerIdx !== null && createPortal(
        <StoryViewer groups={groups} startIndex={viewerIdx} onClose={() => setViewerIdx(null)} />,
        document.body
      )}

      {/* Create story dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <h3 className="text-lg font-semibold text-foreground">Créer une story</h3>

          {/* Background color picker */}
          {!mediaPreview && (
            <div className="flex gap-2">
              {BG_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setBgIdx(i)}
                  className={`w-8 h-8 rounded-full ${c} ${i === bgIdx ? "ring-2 ring-primary ring-offset-2" : ""}`}
                />
              ))}
            </div>
          )}

          {/* Preview */}
          <div className={`w-full aspect-[9/16] max-h-[300px] rounded-xl flex items-center justify-center overflow-hidden ${mediaPreview ? "" : BG_COLORS[bgIdx]}`}>
            {mediaPreview ? (
              <div className="relative w-full h-full">
                {mediaFile?.type.startsWith("video/") ? (
                  <video src={mediaPreview} className="w-full h-full object-cover" />
                ) : (
                  <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <p className="text-white text-lg font-bold text-center px-6 leading-relaxed">
                {content || "Écrivez quelque chose..."}
              </p>
            )}
          </div>

          <Textarea
            placeholder="Votre texte..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={200}
            className="resize-none"
          />

          <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={handleFileSelect} />

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              📷 Photo/Vidéo
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              className="bg-gradient-primary text-primary-foreground"
              onClick={handleCreate}
              disabled={uploading || (!content.trim() && !mediaFile)}
            >
              {uploading ? "Envoi..." : "Publier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
