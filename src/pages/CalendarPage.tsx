import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Users, Calendar as CalendarIcon, X, Check, BookOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEvents, useCreateEvent, useDeleteEvent, useEventRsvp, useToggleRsvp } from "@/hooks/use-events";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { FACULTES, NIVEAUX_ETUDIANT } from "@/lib/constants";

const daysOfWeek = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const daysOfWeekFull = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const eventTypeColors: Record<string, string> = {
  course: "bg-primary/10 text-primary border-primary/20",
  exam: "bg-destructive/10 text-destructive border-destructive/20",
  meeting: "bg-blue-500/10 text-blue-600 border-blue-200",
  deadline: "bg-amber-500/10 text-amber-600 border-amber-200",
  other: "bg-secondary text-muted-foreground border-border",
};

const eventTypes = ["Conférence", "Examen", "Réunion", "Atelier", "Sortie", "Autre"];

// ── Schedule hooks ──

function useScheduleModules() {
  return useQuery({
    queryKey: ["schedule-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_modules")
        .select("*")
        .order("faculty")
        .order("level")
        .order("name");
      if (error) throw error;
      // Fetch teacher names
      const teacherIds = [...new Set((data || []).map((m: any) => m.teacher_id))];
      if (!teacherIds.length) return data || [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds);
      const pMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
      return (data || []).map((m: any) => ({ ...m, teacher_name: pMap.get(m.teacher_id) || "—" }));
    },
  });
}

function useScheduleSlots(moduleIds: string[]) {
  return useQuery({
    queryKey: ["schedule-slots", moduleIds],
    enabled: moduleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_slots")
        .select("*")
        .in("module_id", moduleIds)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data || [];
    },
  });
}

function useTeachers() {
  return useQuery({
    queryKey: ["teachers-list"],
    queryFn: async () => {
      const { data: roleData } = await supabase.from("user_roles").select("user_id").eq("role", "teacher");
      if (!roleData?.length) return [];
      const ids = roleData.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids).eq("account_status", "active");
      return profiles || [];
    },
  });
}

// ── Admin: Create Module Dialog ──

function CreateModuleDialog() {
  const [open, setOpen] = useState(false);
  const { data: teachers } = useTeachers();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [level, setLevel] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const createModule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedule_modules").insert({
        name, faculty, level, teacher_id: teacherId, created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule-modules"] });
      toast.success("Module créé avec sa classe automatiquement !");
      setOpen(false);
      setName(""); setFaculty(""); setLevel(""); setTeacherId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-primary font-bold text-sm bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors">
          <Plus className="w-4 h-4" /> Module
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-[2rem]">
        <DialogHeader><DialogTitle className="text-xl font-black">Nouveau module</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nom du module *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Algèbre linéaire" className="rounded-2xl" /></div>
          <div>
            <Label>Faculté *</Label>
            <Select value={faculty} onValueChange={setFaculty}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{FACULTES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Niveau *</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{NIVEAUX_ETUDIANT.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Professeur *</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                {(teachers || []).map((t: any) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => createModule.mutate()} disabled={!name || !faculty || !level || !teacherId || createModule.isPending} className="w-full rounded-2xl py-5 font-bold">
            {createModule.isPending ? "Création..." : "Créer le module"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Admin: Add Slot Dialog ──

function AddSlotDialog({ moduleId }: { moduleId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [day, setDay] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");

  const addSlot = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedule_slots").insert({
        module_id: moduleId, day_of_week: parseInt(day), start_time: startTime, end_time: endTime, room: room || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule-slots"] });
      toast.success("Créneau ajouté !");
      setOpen(false); setDay(""); setStartTime(""); setEndTime(""); setRoom("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-xs h-7 rounded-lg"><Plus className="w-3 h-3 mr-1" /> Créneau</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-[2rem]">
        <DialogHeader><DialogTitle>Ajouter un créneau</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Jour *</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{daysOfWeekFull.map((d, i) => <SelectItem key={i} value={String(i + 1)}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Début *</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="rounded-2xl" /></div>
            <div><Label>Fin *</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="rounded-2xl" /></div>
          </div>
          <div><Label>Salle</Label><Input value={room} onChange={e => setRoom(e.target.value)} placeholder="Salle A3" className="rounded-2xl" /></div>
          <Button onClick={() => addSlot.mutate()} disabled={!day || !startTime || !endTime || addSlot.isPending} className="w-full rounded-2xl">
            Ajouter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Event Dialog ──

function CreateEventDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const createEvent = useCreateEvent();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("Autre");
  const [scopeSchool, setScopeSchool] = useState(false);
  const [scopeDept, setScopeDept] = useState("");
  const [scopeRoles, setScopeRoles] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!title || !date || !time) { toast.error("Titre, date et heure requis"); return; }
    const scopes: { scope_type: string; scope_value: string | null }[] = [];
    if (scopeSchool) scopes.push({ scope_type: "school", scope_value: null });
    if (scopeDept) scopes.push({ scope_type: "department", scope_value: scopeDept });
    scopeRoles.forEach((r) => scopes.push({ scope_type: "role", scope_value: r }));
    if (scopes.length === 0) { toast.error("Sélectionnez au moins un public cible"); return; }
    try {
      const startTime = `${date}T${time}:00`;
      const endTimeStr = endDate && endTime ? `${endDate}T${endTime}:00` : undefined;
      await createEvent.mutateAsync({ title, description, startTime, endTime: endTimeStr, location, eventType, scopes });
      toast.success("Événement créé !");
      setOpen(false);
      setTitle(""); setDescription(""); setDate(""); setTime("");
      setEndDate(""); setEndTime(""); setLocation("");
      setScopeSchool(false); setScopeDept(""); setScopeRoles([]);
      onCreated?.();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-primary font-bold text-sm bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors">
          <Plus className="w-4 h-4" /> Événement
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem]">
        <DialogHeader><DialogTitle className="text-xl font-black">Nouvel événement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Titre *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'événement" className="rounded-2xl" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." className="rounded-2xl" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="rounded-2xl" /></div>
            <div><Label>Heure *</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-2xl" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date de fin</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={date || new Date().toISOString().split("T")[0]} className="rounded-2xl" /></div>
            <div><Label>Heure de fin</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded-2xl" /></div>
          </div>
          <div><Label>Lieu</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Amphi A, En ligne..." className="rounded-2xl" /></div>
          <div>
            <Label>Type d'événement</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>{eventTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Public cible *</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={scopeSchool} onCheckedChange={(c) => setScopeSchool(!!c)} />Toute l'école</label>
              <div>
                <Label className="text-xs text-muted-foreground">Faculté</Label>
                <Select value={scopeDept} onValueChange={setScopeDept}>
                  <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {FACULTES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={createEvent.isPending} className="w-full rounded-2xl py-5 font-bold">
            {createEvent.isPending ? "Création..." : "Créer l'événement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Event Detail Panel ──

function EventDetailPanel({ event, onClose }: { event: any; onClose: () => void }) {
  const { user, hasRole } = useAuth();
  const { data: rsvps } = useEventRsvp(event.id);
  const toggleRsvp = useToggleRsvp();
  const deleteEvent = useDeleteEvent();
  const isOwner = event.created_by === user?.id;
  const myRsvp = rsvps?.find((r: any) => r.user_id === user?.id);
  const attendingCount = rsvps?.filter((r: any) => r.status === "attending").length || 0;
  const eventDate = new Date(event.start_time);
  const scopes = event.event_scopes || [];

  return (
    <div className="bg-card p-5 rounded-[28px] border border-border shadow-card space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-black text-lg text-foreground">{event.title}</h3>
          <Badge className={`mt-1 text-xs border ${eventTypeColors[event.event_type] || eventTypeColors["other"]}`}>
            {event.event_type}
          </Badge>
        </div>
        <button onClick={onClose} className="p-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="w-4 h-4" />
          {eventDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" à "}{eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </div>
        {event.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" />{event.location}</div>}
        <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4" />{attendingCount} participant{attendingCount !== 1 ? "s" : ""}</div>
      </div>
      {scopes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {scopes.map((s: any) => (
            <Badge key={s.id} variant="secondary" className="text-xs rounded-lg">{s.scope_type === "school" ? "Toute l'école" : s.scope_value}</Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant={myRsvp?.status === "attending" ? "default" : "outline"} className="rounded-2xl"
          onClick={() => toggleRsvp.mutate({ eventId: event.id, status: "attending" })}>
          <Check className="w-3 h-3 mr-1" />Je participe
        </Button>
        <Button size="sm" variant={myRsvp?.status === "declined" ? "destructive" : "outline"} className="rounded-2xl"
          onClick={() => toggleRsvp.mutate({ eventId: event.id, status: "declined" })}>
          <X className="w-3 h-3 mr-1" />Pas dispo
        </Button>
      </div>
      {isOwner && (
        <Button variant="destructive" size="sm" className="w-full rounded-2xl"
          onClick={async () => { await deleteEvent.mutateAsync(event.id); toast.success("Événement supprimé"); onClose(); }}>
          Supprimer
        </Button>
      )}
    </div>
  );
}

// ── Schedule Timetable View ──

function ScheduleView() {
  const { profile, hasRole, user } = useAuth();
  const { data: modules, isLoading: loadingModules } = useScheduleModules();
  const isAdmin = hasRole("admin") || hasRole("global_admin") || hasRole("establishment_admin");
  const isTeacher = hasRole("teacher");
  const qc = useQueryClient();

  // Filter modules for current user
  const relevantModules = useMemo(() => {
    if (!modules) return [];
    if (isAdmin) return modules;
    if (isTeacher) return modules.filter((m: any) => m.teacher_id === user?.id);
    // Student: filter by faculty and level
    return modules.filter((m: any) => m.faculty === profile?.department && m.level === profile?.niveau);
  }, [modules, isAdmin, isTeacher, user, profile]);

  const moduleIds = relevantModules.map((m: any) => m.id);
  const { data: slots } = useScheduleSlots(moduleIds);

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule-modules"] });
      toast.success("Module supprimé");
    },
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule-slots"] });
      toast.success("Créneau supprimé");
    },
  });

  // Group slots by day
  const slotsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    (slots || []).forEach((s: any) => {
      const mod = relevantModules.find((m: any) => m.id === s.module_id);
      if (!map[s.day_of_week]) map[s.day_of_week] = [];
      map[s.day_of_week].push({ ...s, module: mod });
    });
    return map;
  }, [slots, relevantModules]);

  if (loadingModules) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Emploi du temps
        </h2>
        {isAdmin && <CreateModuleDialog />}
      </div>

      {relevantModules.length === 0 ? (
        <div className="py-8 text-center bg-secondary/50 rounded-[2rem] border border-dashed border-border">
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Aucun module créé. Ajoutez-en un !" : "Aucun cours dans votre emploi du temps."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Module list for admin */}
          {isAdmin && (
            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-bold text-muted-foreground">Modules ({relevantModules.length})</h3>
              {relevantModules.map((mod: any) => (
                <div key={mod.id} className="bg-card rounded-2xl p-3 border border-border flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground">{mod.name}</p>
                    <p className="text-xs text-muted-foreground">{mod.faculty} · {mod.level} · Prof: {mod.teacher_name}</p>
                  </div>
                  <AddSlotDialog moduleId={mod.id} />
                  <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => deleteModule.mutate(mod.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Weekly timetable */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map(day => {
              const daySlots = slotsByDay[day] || [];
              if (daySlots.length === 0 && !isAdmin) return null;
              return (
                <div key={day}>
                  <h3 className="text-sm font-bold text-foreground mb-1.5">{daysOfWeekFull[day - 1]}</h3>
                  {daySlots.length > 0 ? (
                    <div className="space-y-1.5">
                      {daySlots.map((s: any) => (
                        <div key={s.id} className="bg-primary/5 rounded-2xl p-3 border border-primary/10 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-foreground">{s.module?.name || "Module"}</p>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</span>
                              {s.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.room}</span>}
                              {s.module?.teacher_name && <span>Prof: {s.module.teacher_name}</span>}
                            </div>
                          </div>
                          {isAdmin && (
                            <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => deleteSlot.mutate(s.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground pl-2">—</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Calendar Page ──

export default function CalendarPage() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(now);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const { data: events, isLoading } = useEvents(currentMonth, currentYear);
  const { hasRole } = useAuth();
  const canCreate = hasRole("admin") || hasRole("global_admin") || hasRole("establishment_admin");

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startOffset = (() => {
    const d = new Date(currentYear, currentMonth, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();
  const today = now.getFullYear() === currentYear && now.getMonth() === currentMonth ? now.getDate() : -1;

  const eventsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    (events || []).forEach((e: any) => {
      const d = new Date(e.start_time).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return map;
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    return (events || []).filter((e: any) => {
      const d = new Date(e.start_time);
      return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
    });
  }, [events, selectedDate]);

  return (
    <div className="flex flex-col w-full max-w-[420px] md:max-w-xl lg:max-w-2xl mx-auto px-4 animate-in fade-in duration-500 pb-20 pt-4">
      {/* Header */}
      <div className="px-1 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{months[currentMonth]} {currentYear}</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez votre emploi du temps</p>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 bg-card border border-border rounded-xl hover:bg-secondary transition-colors shadow-sm active:scale-95">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <button onClick={nextMonth} className="p-2 bg-card border border-border rounded-xl hover:bg-secondary transition-colors shadow-sm active:scale-95">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Tabs: Calendar vs Schedule */}
      <Tabs defaultValue="calendar" className="mb-6">
        <TabsList className="w-full">
          <TabsTrigger value="calendar" className="flex-1">Calendrier</TabsTrigger>
          <TabsTrigger value="schedule" className="flex-1">Emploi du temps</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6 mt-4">
          {/* Calendar Grid */}
          <div className="px-1">
            <div className="bg-card rounded-[32px] p-6 shadow-card border border-border">
              <div className="grid grid-cols-7 mb-4">
                {daysOfWeek.map(day => (
                  <span key={day} className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-2">
                {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const hasEvents = !!eventsByDay[day]?.length;
                  const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear;
                  const isToday = day === today;

                  return (
                    <button key={day}
                      onClick={() => {
                        setSelectedDate(new Date(currentYear, currentMonth, day));
                        if (eventsByDay[day]?.[0]) setSelectedEvent(eventsByDay[day][0]);
                        else setSelectedEvent(null);
                      }}
                      className="relative h-11 flex items-center justify-center transition-all group"
                    >
                      <div className={clsx(
                        "w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all",
                        isSelected ? "bg-primary text-primary-foreground shadow-lg" :
                        isToday ? "bg-primary/10 text-primary" :
                        "text-foreground hover:bg-secondary"
                      )}>
                        {day}
                      </div>
                      {hasEvents && !isSelected && (
                        <div className="absolute bottom-1 w-1.5 h-1.5 bg-primary rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Events for selected day */}
          <div className="px-1 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">
                Évènements du {selectedDate.getDate()} {months[selectedDate.getMonth()]}
              </h2>
              {canCreate && <CreateEventDialog />}
            </div>

            {selectedEvent ? (
              <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            ) : selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((ev: any) => (
                <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                  className="bg-card p-5 rounded-[28px] border border-border shadow-sm flex gap-4 items-start group hover:border-primary/30 transition-all cursor-pointer"
                >
                  <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    ev.event_type === "exam" ? "bg-destructive/10 text-destructive" :
                    ev.event_type === "deadline" ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" :
                    "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                  )}>
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-1 truncate">{ev.title}</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(ev.start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium truncate">
                          <MapPin className="w-3.5 h-3.5" />{ev.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 px-6 bg-secondary/50 rounded-[32px] border border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Aucun évènement prévu pour cette journée. <br />
                  Profitez-en pour vous reposer ! 🏝️
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <ScheduleView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
