import { useState, useRef } from 'react';
import { FileText, Send, Image, Video, Paperclip, X, FolderOpen, Trophy, LinkIcon } from 'lucide-react';
import { useCreatePost } from '@/hooks/use-posts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";


// Local type — profile from AuthContext resolves through Supabase generics
interface Profile {
  full_name: string;
  avatar_url: string | null;
}

export default function CreatePostModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [newPost, setNewPost] = useState("");
  const [title, setTitle] = useState("");
  const [postType, setPostType] = useState("standard");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const { profile: _profile, user } = useAuth();
  const profile = (_profile ?? null) as Profile | null;

  if (!isOpen) return null;

  const postTypes = [
    { key: "standard", label: "Standard", icon: null },
    { key: "article", label: "Article", icon: FileText },
    { key: "project", label: "Projet", icon: FolderOpen },
    { key: "achievement", label: "Réalisation", icon: Trophy },
    { key: "link", label: "Lien", icon: LinkIcon },
  ];


  const initials = (profile?.full_name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const firstName = (profile?.full_name || "").split(" ")[0] || "vous";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (mediaFiles.length + files.length > 5) { toast.error("Maximum 5 fichiers"); return; }
    setMediaFiles(prev => [...prev, ...files]);
    files.forEach(f => setMediaPreviews(prev => [...prev, URL.createObjectURL(f)]));
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!newPost.trim() && mediaFiles.length === 0) return;
    setUploading(true);
    try {
      let mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        const ext = file.name.split(".").pop();
        const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("posts").upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(path);
        mediaUrls.push(publicUrl);
      }
      await createPost.mutateAsync({
        content: newPost,
        mediaUrls,
      } as any);
      setNewPost(""); setMediaFiles([]); setMediaPreviews([]);
      toast.success("Publication créée !");
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };
  const addTag = () => {
    if (tagInput.trim() && tags.length < 5 && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput("");
    }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-card rounded-[2rem] p-4 sm:p-5 shadow-card border border-border w-full max-w-xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2 sm:gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-3">
            {/* Post type selector */}
            <div className="flex gap-1 overflow-x-auto hide-scrollbar">
              {postTypes.map(pt => (
                <Button key={pt.key} variant={postType === pt.key ? "default" : "ghost"} size="sm" className="text-xs h-7 rounded-xl shrink-0"
                  onClick={() => setPostType(pt.key)}>
                  {pt.icon && <pt.icon className="w-3 h-3 mr-1" />}{pt.label}
                </Button>
              ))}
            </div>

            {["article", "project", "achievement"].includes(postType) && (
              <input placeholder={postType === "article" ? "Titre de l'article..." : postType === "project" ? "Nom du projet..." : "Titre de la réalisation..."}
                value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
                className="w-full bg-secondary border-2 border-transparent focus:border-primary/50 focus:bg-card rounded-2xl px-4 py-3 outline-none transition-all font-bold text-foreground" />
            )}

            {postType === "link" && (
              <input placeholder="Collez un lien..." value={externalUrl} onChange={e => setExternalUrl(e.target.value)}
                className="w-full bg-secondary border-2 border-transparent focus:border-primary/50 focus:bg-card rounded-2xl px-4 py-3 outline-none transition-all font-medium text-foreground" />
            )}

            <Textarea placeholder={`Quoi de neuf, ${firstName} ?`} className="bg-secondary border-0 min-h-[60px] resize-none rounded-2xl" value={newPost} onChange={e => setNewPost(e.target.value)} />

            {mediaPreviews.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {mediaPreviews.map((url, i) => (
                  <div key={i} className="relative group">
                    {mediaFiles[i]?.type.startsWith("video/") ? (
                      <video src={url} className="w-20 h-20 object-cover rounded-xl" />
                    ) : mediaFiles[i]?.type.startsWith("image/") ? (
                      <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-secondary flex flex-col items-center justify-center">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground mt-1 truncate w-16 text-center">{mediaFiles[i]?.name}</span>
                      </div>
                    )}
                    <button onClick={() => removeFile(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs rounded-lg">
                  {tag} <button onClick={() => setTags(t => t.filter(x => x !== tag))} className="ml-1"><X className="w-2.5 h-2.5" /></button>
                </Badge>
              ))}
              {tags.length < 5 && (
                <Input placeholder="Ajouter un tag..." className="w-32 h-7 text-xs rounded-lg" value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 shrink-0">
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFileSelect} />
                <input ref={videoRef} type="file" accept="video/mp4,video/webm" hidden onChange={handleFileSelect} />
                <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip" multiple hidden onChange={handleFileSelect} />
                <Button variant="ghost" size="icon" className="text-muted-foreground rounded-xl h-8 w-8" onClick={() => fileRef.current?.click()}><Image className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground rounded-xl h-8 w-8" onClick={() => videoRef.current?.click()}><Video className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground rounded-xl h-8 w-8" onClick={() => docRef.current?.click()}><Paperclip className="w-4 h-4" /></Button>
              </div>
              <Button size="sm" className="bg-primary text-primary-foreground rounded-xl shadow-md shrink-0" onClick={handlePublish} disabled={uploading || (!newPost.trim() && mediaFiles.length === 0)}>
                <Send className="w-4 h-4 mr-1" /> {uploading ? "..." : "Publier"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}