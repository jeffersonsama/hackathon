import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Pin, Plus, Trash2, Calendar, ArrowRight, Edit3, Loader2, X, Clock, ShieldCheck, History, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileRoles } from "@/hooks/use-profile";
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement, useUpdateAnnouncement } from "@/hooks/use-announcements";

const TYPE_COLORS: Record<string, string> = {
  'Urgent': 'bg-red-50 text-red-600 border-red-100',
  'Événement': 'bg-blue-50 text-blue-600 border-blue-100',
  'Actualité': 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

const TYPE_LABELS: Record<string, string> = {
  'Urgent': 'Urgent',
  'Événement': 'Événement',
  'Actualité': 'Actualité',
};

const FILTERS = ['Tous', 'Urgent', 'Événement', 'Actualité'];

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { data: roles } = useProfileRoles(user?.id);
  const isAdmin = (roles || []).some((r: string) => ['admin', 'establishment_admin', 'teacher'].includes(r));
  const [filter, setFilter] = useState<string>("Tous");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editAnn, setEditAnn] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const { data: allAnnouncements, isLoading } = useAnnouncements();
  const announcements = filter === "Tous" ? allAnnouncements : (allAnnouncements || []).filter((a: any) => a.announcement_type === filter);
  const deleteAnn = useDeleteAnnouncement();

  const openEdit = (ann: any) => { setEditAnn(ann); setEditOpen(true); };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background animate-in fade-in duration-500 pb-32 overflow-x-hidden">

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border pt-6 px-4 md:px-6">
        <div className="w-full">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Megaphone className="w-6 h-6 text-primary" />
              Annonces
            </h1>
            {isAdmin && (
              <Sheet open={addOpen} onOpenChange={setAddOpen}>
                <SheetTrigger asChild>
                  <button className="bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/80 transition-all active:scale-95 shadow-md flex items-center justify-center w-10 h-10">
                    <Plus className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
                  <AnnouncementForm onClose={() => setAddOpen(false)} />
                </SheetContent>
              </Sheet>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="max-w-6xl mx-auto w-full p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-[2rem]" />)}
          </div>
        ) : announcements && announcements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {announcements.map((ann: any) => (
              <motion.div key={ann.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="group bg-card border border-border rounded-[2rem] p-6 transition-all cursor-pointer hover:border-primary/30 hover:bg-secondary/50 flex flex-col relative">
                  <div className="flex justify-between items-start mb-5">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shrink-0 ${TYPE_COLORS[ann.announcement_type] || 'bg-secondary text-muted-foreground border-border'}`}>
                      {TYPE_LABELS[ann.announcement_type] || ann.announcement_type}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(ann)} className="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(ann)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {ann.pinned && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/20 mb-3 w-fit inline-block"><Pin className="w-3 h-3 mr-0.5 inline" /> Épinglé</span>
                  )}

                  {ann.cover_image_url && <img src={ann.cover_image_url} alt="" className="w-full h-40 object-cover rounded-2xl mb-4" />}

                  <h2 className="text-lg font-black text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{ann.title}</h2>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed mb-6 line-clamp-3">{ann.content}</p>

                  <div className="mt-auto flex items-center justify-between text-[11px] font-black text-primary uppercase tracking-widest pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <span>Lire la suite</span>
                      {ann.expires_at && <History className="w-3.5 h-3.5 text-orange-500" />}
                    </div>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-card rounded-[2rem] border border-border">
            <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-black text-muted-foreground">Aucune annonce trouvée</h3>
          </div>
        )}
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
          {editAnn && <AnnouncementForm announcement={editAnn} onClose={() => { setEditOpen(false); setEditAnn(null); }} />}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription>L'annonce « {deleteTarget?.title} » sera supprimée définitivement.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { deleteAnn.mutate(deleteTarget.id); setDeleteTarget(null); }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AnnouncementForm({ announcement, onClose }: { announcement?: any; onClose: () => void }) {
  const isEdit = !!announcement;
  const [form, setForm] = useState({
    title: announcement?.title || "",
    content: announcement?.content || "",
    announcement_type: announcement?.announcement_type || "info",
    published: announcement?.published ?? true,
    pinned: announcement?.pinned ?? false,
    expires_at: announcement?.expires_at ? new Date(announcement.expires_at) : null as Date | null,
  });
  const createAnn = useCreateAnnouncement();
  const updateAnn = useUpdateAnnouncement();

  const handleSubmit = async () => {
    if (!form.title || !form.content) return;
    const payload = {
      ...form,
      expires_at: form.expires_at?.toISOString() || null,
      target_roles: ["student", "teacher", "alumni", "admin", "global_admin"],
    };
    if (isEdit) { await updateAnn.mutateAsync({ id: announcement.id, ...payload }); }
    else { await createAnn.mutateAsync(payload); }
    onClose();
  };

  return (
    <div className="space-y-6 pt-6">
      <SheetHeader><SheetTitle>{isEdit ? "Modifier l'annonce" : "Créer une annonce"}</SheetTitle></SheetHeader>
      <div className="space-y-4">
        <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="rounded-xl" /></div>
        <div>
          <Label>Type</Label>
          <Select value={form.announcement_type} onValueChange={v => setForm(p => ({ ...p, announcement_type: v }))}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Contenu *</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={5} className="rounded-xl" /></div>
        <div>
          <Label>Date d'expiration</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left rounded-xl", !form.expires_at && "text-muted-foreground")}>
                <Calendar className="w-4 h-4 mr-2" />
                {form.expires_at ? format(form.expires_at, "dd/MM/yyyy") : "Aucune"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><CalendarUI mode="single" selected={form.expires_at || undefined} onSelect={(d) => setForm(p => ({ ...p, expires_at: d || null }))} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} className="p-3 pointer-events-auto" /></PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2"><Switch checked={form.pinned} onCheckedChange={v => setForm(p => ({ ...p, pinned: v }))} /><Label>Épingler</Label></div>
        <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={v => setForm(p => ({ ...p, published: v }))} /><Label>Publier immédiatement</Label></div>
      </div>
      <Button className="w-full rounded-xl" disabled={!form.title || !form.content} onClick={handleSubmit}>
        {isEdit ? "Enregistrer" : "Créer l'annonce"}
      </Button>
    </div>
  );
}
