import { useState } from "react";
import { motion } from "framer-motion";
import { Users, CheckCircle, XCircle, Clock, Shield, BarChart3, AlertTriangle, Trash2, Search, Check, X, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  student: "Étudiant", teacher: "Professeur", alumni: "Alumni",
  admin: "Admin", establishment_admin: "Admin Établissement", global_admin: "Admin Global",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
  pending: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
  rejected: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300",
  refused: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300",
  suspended: "bg-secondary text-muted-foreground",
};

function useAllProfiles(statusFilter: string) {
  return useQuery({
    queryKey: ["admin-profiles", statusFilter],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("account_status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      const userIds = (data || []).map((p) => p.user_id);
      if (userIds.length === 0) return [];
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      const roleMap = new Map<string, string[]>();
      (roles || []).forEach((r) => { if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []); roleMap.get(r.user_id)!.push(r.role); });
      return (data || []).map((p) => ({ ...p, roles: roleMap.get(p.user_id) || ["student"] }));
    },
  });
}

function useReports() {
  return useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => { const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(50); if (error) throw error; return data; },
  });
}

function useStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profiles, posts, groups, reports] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("groups").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return { users: profiles.count || 0, posts: posts.count || 0, groups: groups.count || 0, pendingReports: reports.count || 0 };
    },
  });
}

export default function AdminPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: profiles, isLoading } = useAllProfiles(statusFilter);
  const { data: reports } = useReports();
  const { data: stats } = useStats();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const [confirmAction, setConfirmAction] = useState<{ userId: string; userIdAuth: string; status: string; userName: string; requestedRole?: string | null } | null>(null);

  const confirmLabels: Record<string, { title: string; desc: string }> = {
    rejected: { title: "Refuser ce compte ?", desc: "L'utilisateur ne pourra pas accéder à la plateforme." },
    suspended: { title: "Suspendre ce compte ?", desc: "L'utilisateur perdra l'accès immédiatement." },
    active: { title: "Valider ce compte ?", desc: "L'utilisateur aura accès à la plateforme." },
  };

  const updateStatus = useMutation({
    mutationFn: async ({ userId, userIdAuth, status, userName, requestedRole }: { userId: string; userIdAuth: string; status: string; userName: string; requestedRole?: string | null }) => {
      const { error } = await supabase.from("profiles").update({ account_status: status }).eq("user_id", userIdAuth);
      if (error) throw error;
      if (status === "active" && requestedRole) {
        const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userIdAuth);
        if (delErr) throw delErr;
        const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userIdAuth, role: requestedRole as any });
        if (insErr) throw insErr;
      }
      await supabase.from("notifications").insert({
        user_id: userIdAuth, title: status === "active" ? "Compte activé" : "Compte refusé",
        content: status === "active" ? "Votre compte a été validé." : "Votre demande d'accès n'a pas été approuvée.",
        type: "system" as any,
      });
      return { userName, status };
    },
    onSuccess: (ctx) => { qc.invalidateQueries({ queryKey: ["admin-profiles"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); const label = ctx.status === "active" ? "approuvé" : ctx.status === "rejected" ? "refusé" : "suspendu"; toast.success(`${ctx.userName} — compte ${label}`); },
    onError: (err: any) => { toast.error(`Erreur: ${err.message}`); },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole, userName }: { userId: string; newRole: string; userName: string }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
      if (insErr) throw insErr;
      return { userName, newRole };
    },
    onSuccess: (ctx) => { qc.invalidateQueries({ queryKey: ["admin-profiles"] }); toast.success(`${ctx.userName} — rôle changé en ${roleLabels[ctx.newRole] || ctx.newRole}`); },
    onError: (err: any) => { toast.error(`Erreur: ${err.message}`); },
  });

  const resolveReport = useMutation({
    mutationFn: async (reportId: string) => { const { error } = await supabase.from("reports").update({ status: "resolved" } as any).eq("id", reportId); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Signalement résolu"); },
    onError: (err: any) => { toast.error(`Erreur: ${err.message}`); },
  });

  if (!hasRole("admin") && !hasRole("global_admin") && !hasRole("establishment_admin")) {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Accès refusé</h2>
        <p className="text-muted-foreground mt-2">Vous n'avez pas les droits d'accès.</p>
      </div>
    );
  }

  const filteredProfiles = (profiles || []).filter((p: any) =>
    (p.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = (profiles || []).filter((p: any) => p.account_status === "pending").length;

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Administration</h1>
        <p className="text-muted-foreground">Gérez les accès et les validations du réseau.</p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        {[
          { label: "Inscrits UPF", value: stats?.users || 0, icon: Users, iconBg: "bg-blue-50 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-300" },
          { label: "Publications", value: stats?.posts || 0, icon: BarChart3, iconBg: "bg-primary/10", iconColor: "text-primary" },
          { label: "Groupes", value: stats?.groups || 0, icon: Users, iconBg: "bg-emerald-50 dark:bg-emerald-900/30", iconColor: "text-emerald-600 dark:text-emerald-300" },
          { label: "Signalements", value: stats?.pendingReports || 0, icon: AlertTriangle, iconBg: "bg-amber-50 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-300" },
        ].map((s, i) => (
          <div key={i} className="bg-card px-5 py-3 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 ${s.iconBg} rounded-2xl flex items-center justify-center shrink-0`}>
              <s.icon className={`w-6 h-6 ${s.iconColor}`} />
            </div>
            <div>
              <p className="text-xl font-black text-foreground leading-none mb-1">{s.value.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList><TabsTrigger value="users">Utilisateurs</TabsTrigger><TabsTrigger value="reports">Signalements</TabsTrigger></TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Main Content Card */}
          <div className="bg-card rounded-[2rem] border border-border shadow-card overflow-hidden">
            {/* Toolbar */}
            <div className="px-6 py-6 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-secondary/30">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-foreground text-lg tracking-tight">Validations en attente</h2>
                <span className="bg-primary/10 text-primary text-xs font-black px-2.5 py-1 rounded-full">{pendingCount}</span>
              </div>
              <div className="relative group flex-1 md:flex-none">
                <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                <input
                  type="text" placeholder="Rechercher un dossier..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-72 pl-12 pr-4 py-3.5 bg-card border border-border rounded-[24px] shadow-sm focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all outline-none font-medium text-foreground"
                />
              </div>
            </div>

            {/* Status filters */}
            <div className="px-6 py-3 flex gap-2 overflow-x-auto hide-scrollbar border-b border-border/50">
              {["all", "pending", "active", "suspended", "rejected"].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {s === "all" ? "Tous" : s === "pending" ? "En attente" : s === "active" ? "Actifs" : s === "suspended" ? "Suspendus" : "Refusés"}
                </button>
              ))}
            </div>

            {/* Users list */}
            <div className="overflow-x-auto hide-scrollbar">
              {isLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : filteredProfiles.length > 0 ? (
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-secondary/30 text-muted-foreground text-[10px] font-black uppercase tracking-[0.15em]">
                      <th className="px-6 py-5">Identité</th>
                      <th className="px-6 py-5">Rôle</th>
                      <th className="px-6 py-5">Statut</th>
                      <th className="px-6 py-5 text-right pr-10">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredProfiles.map((p: any) => {
                      const initials = (p.full_name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-11 h-11 rounded-[14px]">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold rounded-[14px]">{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-foreground leading-snug">{p.full_name || "Sans nom"}</p>
                                {p.requested_role && p.account_status === "pending" && (
                                  <p className="text-[10px] text-warning font-bold">Demande: {roleLabels[p.requested_role] || p.requested_role}</p>
                                )}
                                {p.department && <p className="text-xs text-muted-foreground">{p.department}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <Select value={p.roles[0] || "student"} onValueChange={(v) => changeRole.mutate({ userId: p.user_id, newRole: v, userName: p.full_name || "Sans nom" })}>
                              <SelectTrigger className="h-8 w-[130px] text-xs rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>{Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-wider ${statusColors[p.account_status] || ""}`}>
                              {p.account_status === "active" ? "Actif" : p.account_status === "pending" ? "En attente" : p.account_status === "suspended" ? "Suspendu" : "Refusé"}
                            </span>
                          </td>
                          <td className="px-6 py-5 pr-8">
                            <div className="flex items-center justify-end gap-2.5">
                              {(p.account_status === "pending" || p.account_status === "rejected") && (
                                <button onClick={() => setConfirmAction({ userId: p.id, userIdAuth: p.user_id, status: "active", userName: p.full_name || "Sans nom", requestedRole: p.requested_role })}
                                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90 dark:bg-emerald-900/30">
                                  <Check className="w-5 h-5" strokeWidth={2.5} />
                                </button>
                              )}
                              {p.account_status === "pending" && (
                                <button onClick={() => setConfirmAction({ userId: p.id, userIdAuth: p.user_id, status: "rejected", userName: p.full_name || "Sans nom" })}
                                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-90 dark:bg-red-900/30">
                                  <X className="w-5 h-5" strokeWidth={2.5} />
                                </button>
                              )}
                              {p.account_status === "active" && (
                                <button onClick={() => setConfirmAction({ userId: p.id, userIdAuth: p.user_id, status: "suspended", userName: p.full_name || "Sans nom" })}
                                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-90 dark:bg-amber-900/30">
                                  <Clock className="w-5 h-5" strokeWidth={2.5} />
                                </button>
                              )}
                              {p.account_status === "suspended" && (
                                <button onClick={() => setConfirmAction({ userId: p.id, userIdAuth: p.user_id, status: "active", userName: p.full_name || "Sans nom" })}
                                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90 dark:bg-emerald-900/30">
                                  <Check className="w-5 h-5" strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Shield className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">File d'attente vide</h3>
                  <p className="text-muted-foreground text-sm font-medium">Toutes les candidatures ont été traitées !</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-3">
          {(reports || []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun signalement</p>
          ) : (
            (reports || []).map((r: any) => (
              <div key={r.id} className="bg-card rounded-[2rem] border border-border p-4 flex items-center gap-4">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{r.reason}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <Badge className={`${statusColors[r.status] || ""} border-0 text-xs rounded-lg`}>{r.status}</Badge>
                {r.status === "pending" && <Button size="sm" variant="ghost" onClick={() => resolveReport.mutate(r.id)} className="rounded-xl"><CheckCircle className="w-4 h-4 text-success" /></Button>}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction ? confirmLabels[confirmAction.status]?.title || "Confirmer ?" : ""}</AlertDialogTitle>
            <AlertDialogDescription><strong>{confirmAction?.userName}</strong> — {confirmAction ? confirmLabels[confirmAction.status]?.desc || "" : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmAction) { updateStatus.mutate(confirmAction); setConfirmAction(null); } }}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
