import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Search, Download, Plus, Trash2, FileText, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useOfficialDocuments, useCreateDocument, useDeleteDocument } from "@/hooks/use-documents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = ["Tous", "Règlement intérieur", "Note de service", "Circulaire", "Guide étudiant", "Formulaire", "Calendrier académique", "Autre"];

const CATEGORY_COLORS: Record<string, string> = {
  "Règlement intérieur": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "Note de service": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "Circulaire": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Guide étudiant": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Formulaire": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Calendrier académique": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  "Autre": "bg-muted text-muted-foreground",
};

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");
  const [addOpen, setAddOpen] = useState(false);
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("global_admin") || hasRole("establishment_admin");
  const { data: documents, isLoading } = useOfficialDocuments(search, category);
  const deleteDoc = useDeleteDocument();

  const handleDownload = async (fileUrl: string) => {
    window.open(fileUrl, "_blank");
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background pb-24 md:pb-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border pt-5 pb-3 px-4 md:px-6 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-primary" /> Documents officiels — UPF
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Règlements, notes de service et ressources institutionnelles</p>
          </div>
          {isAdmin && (
            <Sheet open={addOpen} onOpenChange={setAddOpen}>
              <SheetTrigger asChild><Button className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button></SheetTrigger>
              <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
                <AddDocumentForm onClose={() => setAddOpen(false)} />
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher un document..." className="pl-10 bg-secondary border-border rounded-full" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[40%] bg-secondary border-border rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-4 md:p-6">
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc: any) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-shadow h-full">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={`border-0 text-xs ${CATEGORY_COLORS[doc.category] || CATEGORY_COLORS["Autre"]}`}>{doc.category}</Badge>
                    {doc.file_size_kb && <span className="text-xs text-gray-500">{(doc.file_size_kb / 1024).toFixed(1)} MB</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{doc.title}</h3>
                  {doc.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{doc.description}</p>}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="text-xs text-gray-500">
                      {doc.version && <span>v{doc.version} · </span>}
                      {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(doc.file_url)}>
                        <Download className="w-3 h-3 mr-1" /> Télécharger
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => deleteDoc.mutate(doc.id)}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="bg-card border border-border">
          <CardContent className="p-8 text-center">
            <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground">Aucun document trouvé</p>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}

function AddDocumentForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", category: "Autre", version: "", published: true, target_roles: ["student", "teacher", "alumni", "admin"] });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const createDoc = useCreateDocument();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!file || !form.title) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("official-docs").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("official-docs").getPublicUrl(path);
      await createDoc.mutateAsync({ ...form, file_url: publicUrl, file_size_kb: Math.round(file.size / 1024) });
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-6 pt-6">
      <SheetHeader><SheetTitle>Ajouter un document</SheetTitle></SheetHeader>
      <div className="space-y-4">
        <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
        <div>
          <Label>Catégorie</Label>
          <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.filter(c => c !== "Tous").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
        <div><Label>Version</Label><Input placeholder="ex: 2024-2025" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} /></div>
        <div>
          <Label>Fichier *</Label>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" hidden onChange={e => setFile(e.target.files?.[0] || null)} />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <FileText className="w-4 h-4 mr-1" /> {file ? file.name : "Choisir un fichier"}
          </Button>
        </div>
        <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={v => setForm(p => ({ ...p, published: v }))} /><Label>Publier immédiatement</Label></div>
      </div>
      <Button className="w-full" disabled={!form.title || !file || uploading} onClick={handleSubmit}>
        {uploading ? "Envoi..." : "Ajouter le document"}
      </Button>
    </div>
  );
}
