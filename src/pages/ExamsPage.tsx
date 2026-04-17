import { FileText, Download, Plus, Search, X, Check, Upload, Loader2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { useExams, useCreateExam } from '@/hooks/use-exams';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
 
const MATIERE_OPTIONS = ['Tous', 'Algorithmique', 'Bases de Données', 'Réseaux', 'Systèmes', 'Mathématiques', 'Physique', 'Droit', 'Économie'];
const FILIERE_OPTIONS = ['Informatique', 'Mathématiques', 'Physique', 'Droit', 'Économie', 'Gestion'];
const NIVEAU_OPTIONS = ['L1', 'L2', 'L3', 'M1', 'M2'];
const EXAM_TYPES = ['Examen Final', 'Contrôle Continu', 'TP','Exercices','Corrigé', 'Cours'];

function ExamSkeleton() {
  return (
    <div className="bg-card p-5 border-b border-border flex gap-4 animate-pulse">
      <div className="w-14 h-14 rounded-2xl bg-secondary shrink-0" />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3 w-32 bg-secondary rounded-full" />
        <div className="h-4 w-2/3 bg-secondary rounded-full" />
        <div className="h-3 w-1/4 bg-secondary rounded-full" />
      </div>
    </div>
  );
}

export default function Exams() {
  
  const { user, profile } = useAuth();
  const isTeacher = ['teacher', 'admin', 'global_admin', 'establishment_admin'].includes((profile as any)?.role || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMatiere, setFilterMatiere] = useState('Tous');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    matiere: 'Algorithmique',
    filiere: 'Informatique',
    niveau: 'L1',
    exam_type: 'Examen Final',
    annee: new Date().getFullYear().toString(),
    description: '',
  });

  const { data: exams, isLoading } = useExams(searchQuery.length > 1 ? searchQuery : undefined);
  const createExam = useCreateExam();

  const { data: teacherProfiles } = useQuery({
    queryKey: ['exam-teachers', exams?.map((e: any) => e.created_by) || []],
    enabled: exams && exams.length > 0,
    queryFn: async () => {
      const uniqueIds = [...new Set(exams?.map((e: any) => e.created_by).filter(Boolean))];
      if (uniqueIds.length === 0) return [];
      const { data } = await (supabase as any).from('profiles').select('user_id, full_name').in('user_id', uniqueIds);
      return (data || []) as Array<{ user_id: string; full_name: string }>;
    },
  });

  // Client-side filter by matiere + search
  const filteredExams = (exams || []).filter((exam: any) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = exam.title?.toLowerCase().includes(q)
      || exam.matiere?.toLowerCase().includes(q)
      || exam.filiere?.toLowerCase().includes(q);
    const matchMatiere = filterMatiere === 'Tous' || exam.matiere === filterMatiere;
    return matchSearch && matchMatiere;
  });

  // Derive unique years from real data
  const years = ['Toutes', ...Array.from(new Set((exams || []).map((e: any) => e.annee).filter(Boolean)))].sort().reverse();

  async function handleUpload() {
    if (!form.title.trim() || !selectedFile) return;
    if (!user) return;
    setIsUploading(true);
    try {
      // 1. Upload file to Storage
      const ext = selectedFile.name.split('.').pop();
      const path = `exams/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('exams').upload(path, selectedFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('exams').getPublicUrl(path);

      // 2. Insert exam record
      await createExam.mutateAsync({
        ...form,
        file_url: publicUrl,
      } as any);

      toast.success('Document publié avec succès !');
      setIsUploadModalOpen(false);
      setForm({ title: '', matiere: 'Algorithmique', filiere: 'Informatique', niveau: 'L1', exam_type: 'Examen Final', annee: new Date().getFullYear().toString(), description: '' });
      setSelectedFile(null);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la publication');
    } finally {
      setIsUploading(false);
    }
  }

  function handleDownload(exam: any) {
    if (exam.file_url) {
      const a = document.createElement('a');
      a.href = exam.file_url;
      a.target = '_blank';
      a.download = `${exam.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setShowDownloadSuccess(true);
    setTimeout(() => setShowDownloadSuccess(false), 3000);
    setSelectedExam(null);
  }

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-500 bg-card pb-24 md:pb-6">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border pt-6 px-4 md:px-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ressources</h1>
            <p className="text-sm text-muted-foreground mt-1">Annales, corrections et supports de cours</p>
          </div>
       
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 mt-1 rounded-full text-sm font-bold transition-colors shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Contribuer</span>
            </button>
     
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative group max-w-xl">
            <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              placeholder="Rechercher une matière, une année..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-secondary border border-border rounded-full text-[14px] font-medium text-foreground placeholder-gray-500 focus:bg-card focus:border-primary-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Matière Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {MATIERE_OPTIONS.map(sub => (
            <button
              key={sub}
              onClick={() => setFilterMatiere(sub)}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                filterMatiere === sub
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="pt-6 pb-24 flex flex-col gap-6 items-center">
        <div className="flex flex-col pb-24 w-full max-w-2xl px-4 md:px-6">
        

          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <ExamSkeleton key={i} />)
          ) : filteredExams.length > 0 ? (
            filteredExams.map((exam: any) => (
              <div
                key={exam.id}
                onClick={() => setSelectedExam(exam)}
                className="bg-card p-5 w-full border border-border rounded-[2rem] transition-all hover:bg-secondary/50 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        {exam.matiere && <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{exam.matiere}</span>}
                        {exam.matiere && exam.annee && <span className="w-1 h-1 bg-gray-300 rounded-full" />}
                        {exam.annee && <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{exam.annee}</span>}
                        {exam.niveau && <span className="ml-1 text-[9px] font-black uppercase bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded-md">{exam.niveau}</span>}
                      </div>
                      <h3 className="font-bold text-foreground text-base leading-tight mt-0.5 truncate max-w-[150px] sm:max-w-none">{exam.title}</h3>
                    </div>
                    
                  </div>
                 
                   <span className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                      {exam.exam_type || 'Épreuve'}
                    </span>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-sm text-foreground">
                      {/* Author initial — we don't join profiles here for perf */}
                       {/* {exam.created_by} */}
                       {teacherProfiles?.find(p => p.user_id === exam.created_by)?.full_name ?? "loading"}
                    </div>
                   
                  </div>
                  <div className='flex gap-3'>
                       <div className="flex items-center gap-1 text-[11px] font-black text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
                         {exam.download_count || 0} <span className="text-[9px] uppercase tracking-tighter ml-1">téléchargements</span>
                      </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedExam(exam); }}
                      className="text-muted-foreground hover:text-purple-600 transition-all p-3 bg-secondary rounded-xl hover:bg-purple-50 shadow-sm active:scale-90"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                

                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-muted-foreground font-bold">Aucun document trouvé</p>
              {searchQuery && <p className="text-sm text-muted-foreground mt-1">Pour "{searchQuery}"</p>}
            </div>
          )}
        </div>
      </div>

       {/* UPLOAD MODAL — teachers only */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900">Publier un document</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex flex-col gap-5">
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Titre du document *"
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 outline-none transition-all font-bold text-gray-800"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Matière</label>
                  <select value={form.matiere} onChange={e => setForm({ ...form, matiere: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl px-4 py-3 outline-none transition-all font-bold text-gray-800 cursor-pointer">
                    {MATIERE_OPTIONS.filter(s => s !== 'Tous').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Type</label>
                  <select value={form.exam_type} onChange={e => setForm({ ...form, exam_type: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl px-4 py-3 outline-none transition-all font-bold text-gray-800 cursor-pointer">
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Filière</label>
                  <select value={form.filiere} onChange={e => setForm({ ...form, filiere: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl px-4 py-3 outline-none transition-all font-bold text-gray-800 cursor-pointer">
                    {FILIERE_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Niveau</label>
                  <select value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl px-4 py-3 outline-none transition-all font-bold text-gray-800 cursor-pointer">
                    {NIVEAU_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Année</label>
                  <input type="number" value={form.annee} onChange={e => setForm({ ...form, annee: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl px-4 py-3 outline-none transition-all font-bold text-gray-800"
                  />
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Fichier PDF *</label>
                <label className="w-full flex items-center justify-center gap-2 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl px-6 py-4 cursor-pointer hover:border-primary-400 transition-all text-sm font-bold text-gray-500">
                  <Upload className="w-5 h-5" />
                  {selectedFile ? selectedFile.name : 'Sélectionner le document'}
                  <input type="file" className="hidden" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <button
                onClick={handleUpload}
                disabled={!form.title.trim() || !selectedFile || isUploading}
                className="w-full py-5 bg-primary-600 text-white font-black rounded-3xl hover:bg-primary-700 transition-all active:scale-95 shadow-xl shadow-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Publication...</> : 'Mettre en ligne'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* DETAIL MODAL */}
      {selectedExam && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedExam(null)}
        >
          <div
            className="bg-card w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-8">
              <div className="w-16 h-16 rounded-[1.5rem] bg-purple-50 text-primary-600 flex items-center justify-center shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <button onClick={() => setSelectedExam(null)} className="p-3 bg-secondary rounded-2xl hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              {selectedExam.matiere && <span className="text-[10px] font-black uppercase tracking-widest text-primary-600 bg-purple-50 px-2 py-0.5 rounded-md">{selectedExam.matiere}</span>}
              {selectedExam.annee && <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{selectedExam.annee}</span>}
              {selectedExam.niveau && <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">· {selectedExam.niveau}</span>}
            </div>

            <h2 className="text-3xl font-black text-foreground leading-tight mb-2">{selectedExam.title}</h2>
            {selectedExam.description && <p className="text-sm text-muted-foreground mb-8">{selectedExam.description}</p>}
            {!selectedExam.description && <div className="mb-8" />}

            <button
              onClick={() => handleDownload(selectedExam)}
              disabled={!selectedExam.file_url}
              className="w-full py-5 bg-primary text-white font-black rounded-[1.5rem] hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              {selectedExam.file_url ? 'Télécharger le document' : 'Fichier non disponible'}
            </button>
          </div>
        </div>
      )}

      {/* Download Toast */}
      {showDownloadSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-primary text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
            <Check className="w-4 h-4" strokeWidth={4} />
          </div>
          <span className="font-black text-sm uppercase tracking-widest">Téléchargement lancé !</span>
        </div>
      )}
    </div>
  );
}
