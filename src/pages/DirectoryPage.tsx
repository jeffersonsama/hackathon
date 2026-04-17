import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, MessageCircle, ArrowRight, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FACULTES } from "@/lib/constants";

const ROLE_BADGES: Record<string, { className: string; label: string }> = {
  student: { className: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200", label: "Étudiant" },
  teacher: { className: "bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200", label: "Professeur" },
  alumni: { className: "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200", label: "Alumni" },
  admin: { className: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200", label: "Admin" },
  establishment_admin: { className: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200", label: "Admin Étab." },
  global_admin: { className: "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100", label: "Super Admin" },
};

const DEPARTMENTS = ["Tous", ...FACULTES];
const ROLES = [
  { value: "all", label: "Tous" },
  { value: "student", label: "Étudiants" },
  { value: "teacher", label: "Professeurs" },
  { value: "alumni", label: "Alumni" },
  { value: "admin", label: "Administration" },
];

const PAGE_SIZE = 24;

export default function DirectoryPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("Tous");
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasActiveFilters = roleFilter !== "all" || deptFilter !== "Tous";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["directory", debouncedSearch, roleFilter, deptFilter],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      // Fetch profiles
      let query = (supabase as any)
        .from("profiles")
        .select("user_id, full_name, avatar_url, department, created_at")
        .eq("account_status", "active")
        .neq("user_id", user!.id)
        .order("full_name")
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (debouncedSearch) {
        query = query.or(`full_name.ilike.%${debouncedSearch}%,department.ilike.%${debouncedSearch}%`);
      }
      if (deptFilter !== "Tous") {
        query = query.eq("department", deptFilter);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Fetch roles for these users
      const userIds = (profiles || []).map((p: any) => p.user_id);
      let roleMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: roles } = await (supabase as any).from("user_roles").select("user_id, role").in("user_id", userIds);
        (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));
      }

      let results = (profiles || []).map((p: any) => ({ ...p, role: roleMap.get(p.user_id) || "student" }));

      // Client-side role filter (since roles are in separate table)
      if (roleFilter !== "all") {
        results = results.filter(p => p.role === roleFilter);
      }

      return results;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined;
    },
    enabled: !!user,
  });

  const allMembers = data?.pages.flat() || [];
  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col w-full bg-background pb-24 md:pb-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 md:px-6 pt-5 pb-3">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Annuaire UPF-Connect
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">ouvez tous les membres de la communauté</p>
        </div>

        {/* Filter bar */}
        <div className="px-4 pb-3 flex flex-col gap-2">
          {/* Row: search + mobile filter toggle */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher par nom..." className="pl-10 bg-secondary border-border rounded-full" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-semibold transition-colors shrink-0 ${hasActiveFilters
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtres{hasActiveFilters ? " ●" : ""}
            </button>
            {/* Desktop filters always visible */}
            <div className="hidden sm:flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px] bg-secondary border-border rounded-full"><SelectValue placeholder="Rôle" /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[150px] bg-secondary border-border rounded-full"><SelectValue placeholder="Département" /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile expanded filter panel */}
          {showFilters && (
            <div className="sm:hidden flex flex-col gap-2 p-3 bg-secondary/50 rounded-2xl border border-border animate-in slide-in-from-top-2 duration-150">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Filtres</p>
              <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); }}>
                <SelectTrigger className="w-full bg-card border-border rounded-xl"><SelectValue placeholder="Rôle" /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); }}>
                <SelectTrigger className="w-full bg-card border-border rounded-xl"><SelectValue placeholder="Département" /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              {hasActiveFilters && (
                <button
                  onClick={() => { setRoleFilter("all"); setDeptFilter("Tous"); }}
                  className="text-xs font-bold text-destructive hover:underline text-left mt-1"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 md:px-6 pb-8">
        <p className="text-sm text-muted-foreground mt-4">{allMembers.length} membre{allMembers.length !== 1 ? "s" : ""} trouvé{allMembers.length !== 1 ? "s" : ""}</p>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : allMembers.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {allMembers.map((member, i) => {
                const badge = ROLE_BADGES[member.role] || ROLE_BADGES.student;
                return (
                  <motion.div key={member.user_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                    <Card className="bg-card border-border hover:shadow-md hover:border-primary/20 transition-all">
                      <CardContent className="p-4 flex items-center gap-4">
                        <Avatar className="w-14 h-14">
                          {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(member.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{member.full_name}</p>
                          <Badge className={`border-0 text-[10px] mt-0.5 ${badge.className}`}>{badge.label}</Badge>
                          {member.department && <p className="text-xs text-muted-foreground mt-0.5">{member.department}</p>}
                          <p className="text-[10px] text-muted-foreground">Membre depuis {new Date(member.created_at).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate(`/profile/${member.user_id}`)}>
                            Profil <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate(`/messages?new=${member.user_id}`)}>
                            <MessageCircle className="w-3 h-3 mr-1" /> Message
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            {hasNextPage && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? "Chargement..." : "Charger plus"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Aucun membre trouvé pour ces critères.</p>
          </div>
        )}
      </div>
    </div>
  );
}
