import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Camera, Edit2, MapPin, BookOpen, Users, Calendar, Mail, Save, X,
  GraduationCap, Trophy, MessageCircle, UserPlus, Briefcase, Award,
  Star, Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, FileText, BarChart3, Flag, MoreHorizontal, LogOut, Settings
} from "lucide-react";
import ReportDialog from "@/components/ReportDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useProfileData, useProfileRoles, useProfileStats, useProfilePosts,
  useProfileGroups, useProfileExperiences, useProfileEducation,
  useProfileSkills, useProfileRecommendations, useUpdateProfile,
  useAddExperience, useDeleteExperience, useAddEducation, useDeleteEducation,
  useAddSkill, useDeleteSkill, useToggleEndorsement, useAddRecommendation
} from "@/hooks/use-profile";
import { useIsFollowing, useFollowUser, useUnfollowUser } from "@/hooks/use-follows";
import { useCompletedCourses } from "@/hooks/use-student-data";
import { useQueryClient } from "@tanstack/react-query";

const ROLE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  student: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-800 dark:text-blue-200", label: "Étudiant" },
  teacher: { bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-800 dark:text-purple-200", label: "Professeur" },
  alumni: { bg: "bg-teal-50 dark:bg-teal-950", text: "text-teal-800 dark:text-teal-200", label: "Alumni" },
  admin: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-800 dark:text-red-200", label: "Administrateur" },
  establishment_admin: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-800 dark:text-red-200", label: "Admin Établissement" },
  global_admin: { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-900 dark:text-purple-100", label: "Super Admin" },
};

import { FACULTES, NIVEAUX_ETUDIANT } from "@/lib/constants";

function RoleBadge({ role }: { role: string }) {
  const badge = ROLE_BADGES[role] || { bg: "bg-muted", text: "text-muted-foreground", label: role };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>;
}

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const { signOut } = useAuth();
  const qc = useQueryClient();
  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  const [editOpen, setEditOpen] = useState(false);
  const [expOpen, setExpOpen] = useState(false);
  const [eduOpen, setEduOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useProfileData(targetUserId);
  const { data: userRoles } = useProfileRoles(targetUserId);
  const { data: stats } = useProfileStats(targetUserId);
  const { data: posts } = useProfilePosts(targetUserId);
  const { data: groups } = useProfileGroups(targetUserId);
  const { data: completedCourses } = useCompletedCourses(targetUserId);
  const { data: experiences } = useProfileExperiences(targetUserId);
  const { data: education } = useProfileEducation(targetUserId);
  const { data: skills } = useProfileSkills(targetUserId);
  const { data: recommendations } = useProfileRecommendations(targetUserId);

  const updateProfile = useUpdateProfile();
  const addExperience = useAddExperience();
  const deleteExperience = useDeleteExperience();
  const addEducation = useAddEducation();
  const deleteEducation = useDeleteEducation();
  const addSkill = useAddSkill();
  const deleteSkill = useDeleteSkill();
  const toggleEndorsement = useToggleEndorsement();
  const addRecommendation = useAddRecommendation();

  const { data: isFollowing } = useIsFollowing(targetUserId || "");
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const handleFollowToggle = () => {
    if (!targetUserId) return;
    if (isFollowing) {
      unfollowUser.mutate(targetUserId);
    } else {
      followUser.mutate(targetUserId);
    }
  };

  const primaryRole = (userRoles || roles)?.[0] || "student";
  const isTeacher = (userRoles || []).includes("teacher");
  const isStudent = (userRoles || []).includes("student");
  const privacy = (profile as any)?.privacy_settings || { publications: true, cours: true, epreuves: true, groupes: true };
  const canSeePublications = isOwnProfile || privacy.publications;
  const canSeeCours = isOwnProfile || privacy.cours;
  const canSeeGroupes = isOwnProfile || privacy.groupes;

  const initials = (profile?.full_name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const uploadImage = async (file: File, type: "avatar" | "cover") => {
    const ext = file.name.split(".").pop();
    const bucket = type === "cover" ? "covers" : "avatars";
    const path = `${user!.id}/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    const col = type === "avatar" ? "avatar_url" : "cover_url";
    await supabase.from("profiles").update({ [col]: publicUrl } as any).eq("user_id", user!.id);
    toast.success(type === "avatar" ? "Photo de profil mise à jour" : "Couverture mise à jour");
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const handleSendMessage = async () => {
    if (!targetUserId || !user) return;
    // Use the existing hook to create/find direct conversations
    navigate(`/messages?new=${targetUserId}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 px-4">
        <Skeleton className="h-56 rounded-xl" />
        <div className="flex gap-4"><Skeleton className="w-24 h-24 rounded-full" /><Skeleton className="h-20 flex-1" /></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full mx-0 space-y-0">
      {/* ZONE A — Cover */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative h-40 md:h-56 w-full overflow-hidden">
        {(profile as any)?.cover_url ? (
          <img src={(profile as any).cover_url} alt="Couverture" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full rounded-xl h-full bg-gradient-primary" />
        )}
        {isOwnProfile && (
          <>
            <input ref={coverRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], "cover")} />
            <Button size="sm" variant="secondary" className="absolute bottom-3 right-3 opacity-80 hover:opacity-100" onClick={() => coverRef.current?.click()}>
              <Camera className="w-4 h-4 mr-1" /> Couverture
            </Button>
          </>
        )}
      </motion.div>

      {/* ZONE B — Header */}
      <div className="flex flex-col md:flex-row gap-4 -mt-16 md:-mt-14 px-4 relative z-10 pb-5">
        <div className="relative flex-shrink-0">
          <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-background shadow-lg">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          {isOwnProfile && (
            <>
              <input ref={avatarRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], "avatar")} />
              <button onClick={() => avatarRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        <div className="flex-1 pt-2 md:pt-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{profile?.full_name}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                {(userRoles || roles).map((r: string) => <RoleBadge key={r} role={r} />)}
              </div>
              {profile?.department && <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {profile.department}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">Membre depuis {new Date(profile?.created_at || "").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
            </div>
            {/* ZONE C — Actions */}
            <div className="flex gap-2 flex-wrap">
              {!isOwnProfile && (
                <>
                  {isFollowing ? (
                    <Button onClick={handleFollowToggle} variant="outline" disabled={followUser.isPending || unfollowUser.isPending}>
                      Abonné
                    </Button>
                  ) : (
                    <Button onClick={handleFollowToggle} className="bg-primary text-primary-foreground" disabled={followUser.isPending || unfollowUser.isPending}>
                      <UserPlus className="w-4 h-4 mr-1" /> Suivre
                    </Button>
                  )}
                  <Button onClick={handleSendMessage} className="bg-primary text-primary-foreground">
                    <MessageCircle className="w-4 h-4 mr-1" /> Message
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!isOwnProfile && <DropdownMenuItem onClick={() => setReportOpen(true)}><Flag className="w-3 h-3 mr-2" /> Signaler ce profil</DropdownMenuItem>}
                      {isOwnProfile && (
                        <>
                          <DropdownMenuItem onClick={() => setEditOpen(true)}><Edit2 className="w-3 h-3 mr-2" /> Modifier le profil</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate("/settings")}><Settings className="w-3 h-3 mr-2" /> Paramètres</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => signOut()} className="text-destructive"><LogOut className="w-3 h-3 mr-2" /> Se déconnecter</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {isOwnProfile && (
                <Sheet open={editOpen} onOpenChange={setEditOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline"><Edit2 className="w-4 h-4 mr-1" /> Modifier le profil</Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
                    <EditProfileForm profile={profile} primaryRole={primaryRole} onClose={() => setEditOpen(false)} onSave={updateProfile.mutate} />
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ZONE D — Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6">
        {[
          { label: "Publications", value: stats?.posts || 0, icon: FileText },
          { label: "Cours", value: isTeacher ? (stats?.coursesCreated || 0) : (stats?.enrollments || 0), icon: BookOpen },
          { label: "Groupes", value: stats?.groups || 0, icon: Users },
          { label: "Épreuves", value: stats?.exams || 0, icon: GraduationCap },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* BODY — Two columns */}
      <div className="grid lg:grid-cols-[35%_65%] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Bio card */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">À propos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {profile?.bio ? (
                <p className="text-foreground">{profile.bio}</p>
              ) : isOwnProfile ? (
                <p className="text-muted-foreground italic cursor-pointer" onClick={() => setEditOpen(true)}>Ajoutez une bio pour vous présenter →</p>
              ) : null}
              <div className="space-y-2 text-muted-foreground">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {profile?.department || "—"}</div>
                <div className="flex items-center gap-2"><Award className="w-4 h-4" /> <RoleBadge role={primaryRole} /></div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Membre depuis {new Date(profile?.created_at || "").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</div>
              </div>
            </CardContent>
          </Card>

          {/* Contact card (own profile) */}
          {isOwnProfile && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Contact</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" /> {user?.email}</div>
              </CardContent>
            </Card>
          )}

          {/* Privacy card (own profile) */}
          {isOwnProfile && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Confidentialité</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "publications", label: "Publications" },
                  { key: "cours", label: "Cours terminés" },
                  { key: "epreuves", label: "Épreuves déposées" },
                  { key: "groupes", label: "Groupes" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <Label className="text-sm">{item.label} visible</Label>
                    <Switch
                      checked={privacy[item.key] ?? true}
                      onCheckedChange={(val) => {
                        const newPrivacy = { ...privacy, [item.key]: val };
                        updateProfile.mutate({ privacy_settings: newPrivacy } as any);
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — Tabs */}
        <div className="space-y-6">
          <Tabs defaultValue="publications">
            <TabsList className="w-full justify-start overflow-x-auto">
              {canSeePublications && <TabsTrigger value="publications">Publications</TabsTrigger>}
              {canSeeCours && <TabsTrigger value="cours">Cours</TabsTrigger>}
              {canSeeGroupes && <TabsTrigger value="groupes">Groupes</TabsTrigger>}
              <TabsTrigger value="activite">Activité</TabsTrigger>
            </TabsList>

            {canSeePublications && (
              <TabsContent value="publications" className="space-y-3 mt-4">
                {posts && posts.length > 0 ? posts.map((post: any) => (
                  <Card key={post.id} className="bg-card border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/feed")}>
                    <CardContent className="p-4">
                      <p className="text-sm text-foreground line-clamp-3">{post.content}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>❤️ {post.reactionCount}</span>
                        <span>💬 {post.commentCount}</span>
                        <span>{new Date(post.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <p className="text-sm text-muted-foreground p-4">Aucune publication pour l'instant</p>
                )}
              </TabsContent>
            )}
            {!canSeePublications && !isOwnProfile && (
              <TabsContent value="publications">
                <p className="text-sm text-muted-foreground p-4 italic">Ce contenu est privé</p>
              </TabsContent>
            )}

            {canSeeCours && (
              <TabsContent value="cours" className="space-y-3 mt-4">
                {completedCourses && completedCourses.length > 0 ? completedCourses.map((c: any) => (
                  <Card key={c.id} className="bg-card border-border">
                    <CardContent className="p-4 flex items-center gap-3">
                      <GraduationCap className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{c.courses?.title || "Cours"}</p>
                        <p className="text-xs text-muted-foreground">{c.teacherName} · {c.completed_at ? new Date(c.completed_at).toLocaleDateString("fr-FR") : "—"}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0 text-xs">Complété</Badge>
                    </CardContent>
                  </Card>
                )) : (
                  <p className="text-sm text-muted-foreground p-4">Aucun cours terminé</p>
                )}
              </TabsContent>
            )}

            {canSeeGroupes && (
              <TabsContent value="groupes" className="space-y-3 mt-4">
                {groups && groups.length > 0 ? groups.map((g: any) => (
                  <Card key={g.id} className="bg-card border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/groups/${g.id}`)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{g.memberCount} membres · {g.userRole === "admin" ? "Admin" : "Membre"}</p>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <p className="text-sm text-muted-foreground p-4">Aucun groupe public</p>
                )}
              </TabsContent>
            )}

            <TabsContent value="activite" className="mt-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4 grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-secondary">
                    <p className="text-2xl font-bold text-foreground">{stats?.posts || 0}</p>
                    <p className="text-xs text-muted-foreground">Publications</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary">
                    <p className="text-2xl font-bold text-foreground">{completedCourses?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Cours terminés</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary">
                    <p className="text-2xl font-bold text-foreground">{stats?.groups || 0}</p>
                    <p className="text-xs text-muted-foreground">Groupes</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary">
                    <p className="text-2xl font-bold text-foreground">{stats?.exams || 0}</p>
                    <p className="text-xs text-muted-foreground">Épreuves</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Experience Section */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> Expérience</CardTitle>
              {isOwnProfile && (
                <Sheet open={expOpen} onOpenChange={setExpOpen}>
                  <SheetTrigger asChild><Button variant="outline" size="sm"><Plus className="w-4 h-4" /></Button></SheetTrigger>
                  <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
                    <ExperienceForm onSave={(data) => { addExperience.mutate(data); setExpOpen(false); }} />
                  </SheetContent>
                </Sheet>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {experiences && experiences.length > 0 ? experiences.map((exp: any) => (
                <div key={exp.id} className="flex gap-3 group">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{exp.title}</p>
                        <p className="text-sm text-muted-foreground">{exp.organization}</p>
                        <p className="text-xs text-muted-foreground">
                          {exp.start_date && new Date(exp.start_date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                          {" — "}
                          {exp.is_current ? "Présent" : exp.end_date ? new Date(exp.end_date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : ""}
                        </p>
                        {exp.location && <p className="text-xs text-muted-foreground">{exp.location}</p>}
                      </div>
                      {isOwnProfile && (
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7" onClick={() => deleteExperience.mutate(exp.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    {exp.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{exp.description}</p>}
                    <Badge variant="secondary" className="text-xs mt-1">{exp.exp_type === "emploi" ? "Emploi" : exp.exp_type === "stage" ? "Stage" : exp.exp_type === "bénévolat" ? "Bénévolat" : "Autre"}</Badge>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">Aucune expérience ajoutée</p>}
            </CardContent>
          </Card>

          {/* Education Section */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" /> Formation</CardTitle>
              {isOwnProfile && (
                <Sheet open={eduOpen} onOpenChange={setEduOpen}>
                  <SheetTrigger asChild><Button variant="outline" size="sm"><Plus className="w-4 h-4" /></Button></SheetTrigger>
                  <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
                    <EducationForm onSave={(data) => { addEducation.mutate(data); setEduOpen(false); }} />
                  </SheetContent>
                </Sheet>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {education && education.length > 0 ? education.map((edu: any) => (
                <div key={edu.id} className="flex gap-3 group">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{edu.degree}</p>
                        <p className="text-sm text-muted-foreground">{edu.institution}</p>
                        {edu.field_of_study && <p className="text-xs text-muted-foreground">{edu.field_of_study}</p>}
                        <p className="text-xs text-muted-foreground">{edu.start_year} — {edu.is_current ? "Présent" : edu.end_year || ""}</p>
                      </div>
                      {isOwnProfile && (
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7" onClick={() => deleteEducation.mutate(edu.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">Aucune formation ajoutée</p>}
            </CardContent>
          </Card>

          {/* Skills Section */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2"><Star className="w-4 h-4 text-primary" /> Compétences</CardTitle>
              {isOwnProfile && <Button variant="outline" size="sm" onClick={() => setShowSkillForm(!showSkillForm)}><Plus className="w-4 h-4" /></Button>}
            </CardHeader>
            <CardContent className="space-y-3">
              {isOwnProfile && showSkillForm && <SkillForm onSave={(data) => { addSkill.mutate(data); setShowSkillForm(false); }} />}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {skills && skills.length > 0 ? skills.map((skill: any) => {
                  const endorsers = skill.skill_endorsements || [];
                  const hasEndorsed = endorsers.some((e: any) => e.endorsed_by === user?.id);
                  const levelColors: Record<string, string> = {
                    "débutant": "bg-muted text-muted-foreground",
                    "intermédiaire": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                    "avancé": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                    "expert": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
                  };
                  return (
                    <div key={skill.id} className="p-3 rounded-lg border border-border bg-card group">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{skill.skill_name}</p>
                          <div className="flex gap-1.5 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${levelColors[skill.skill_level] || "bg-muted text-muted-foreground"}`}>{skill.skill_level}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{skill.category}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{skill.endorsement_count || 0} validations</p>
                        </div>
                        <div className="flex gap-1">
                          {!isOwnProfile && (
                            <Button variant={hasEndorsed ? "default" : "outline"} size="sm" className="text-xs h-7"
                              onClick={() => toggleEndorsement.mutate({ skillId: skill.id, isEndorsed: hasEndorsed })}>
                              {hasEndorsed ? "Validé ✓" : "Valider"}
                            </Button>
                          )}
                          {isOwnProfile && (
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => deleteSkill.mutate(skill.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : <p className="text-sm text-muted-foreground col-span-2">Aucune compétence ajoutée</p>}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations Section */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Recommandations ({recommendations?.length || 0})</CardTitle>
              {!isOwnProfile && (
                <Sheet open={recOpen} onOpenChange={setRecOpen}>
                  <SheetTrigger asChild><Button variant="outline" size="sm">Recommander</Button></SheetTrigger>
                  <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
                    <RecommendationForm userName={profile?.full_name || ""} userId={targetUserId!} onSave={(data) => { addRecommendation.mutate(data); setRecOpen(false); }} />
                  </SheetContent>
                </Sheet>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendations && recommendations.length > 0 ? recommendations.map((rec: any) => (
                <div key={rec.id} className="border-l-2 border-primary/30 pl-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      {rec.authorAvatar ? <AvatarImage src={rec.authorAvatar} /> : null}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{rec.authorName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{rec.authorName}</span>
                    {rec.relationship && <span className="text-xs text-muted-foreground">· {rec.relationship}</span>}
                  </div>
                  <p className="text-sm text-foreground">{rec.content}</p>
                  <p className="text-xs text-muted-foreground">{new Date(rec.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">Aucune recommandation</p>}
            </CardContent>
          </Card>
        </div>
      </div>
      {!isOwnProfile && targetUserId && (
        <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} contentType="profile" contentId={targetUserId} />
      )}
    </div>
  );
}

// ── Sub-components ──

function EditProfileForm({ profile, primaryRole, onClose, onSave }: { profile: any; primaryRole: string; onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    bio: profile?.bio || "",
    department: profile?.department || "",
    niveau: profile?.niveau || "",
    extra_info: (profile as any)?.extra_info || {},
  });

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="space-y-6 pt-6">
      <SheetHeader><SheetTitle>Modifier le profil</SheetTitle></SheetHeader>
      <div className="space-y-4">
        <div><Label>Nom complet</Label><Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></div>
        <div>
          <Label>Bio ({form.bio.length}/300)</Label>
          <Textarea value={form.bio} maxLength={300} rows={3} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
        </div>
        <div>
          <Label>Faculté</Label>
          <Select value={form.department} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>{FACULTES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {(primaryRole === "student") && (
          <div>
            <Label>Niveau / Année</Label>
            <Select value={form.niveau} onValueChange={v => setForm(p => ({ ...p, niveau: v }))}>
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>{NIVEAUX_ETUDIANT.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        {primaryRole === "alumni" && (
          <>
            <div><Label>Promotion (année)</Label><Input type="number" value={form.extra_info.promotion_year || ""} onChange={e => setForm(p => ({ ...p, extra_info: { ...p.extra_info, promotion_year: e.target.value } }))} /></div>
            <div><Label>Spécialité</Label><Input value={form.extra_info.specialite || ""} onChange={e => setForm(p => ({ ...p, extra_info: { ...p.extra_info, specialite: e.target.value } }))} /></div>
            <div><Label>Entreprise actuelle</Label><Input value={form.extra_info.entreprise || ""} onChange={e => setForm(p => ({ ...p, extra_info: { ...p.extra_info, entreprise: e.target.value } }))} /></div>
            <div><Label>Poste actuel</Label><Input value={form.extra_info.poste || ""} onChange={e => setForm(p => ({ ...p, extra_info: { ...p.extra_info, poste: e.target.value } }))} /></div>
          </>
        )}
      </div>
      <Button className="w-full" onClick={handleSave}><Save className="w-4 h-4 mr-1" /> Sauvegarder</Button>
    </div>
  );
}

function ExperienceForm({ onSave }: { onSave: (data: any) => void }) {
  const [form, setForm] = useState({ title: "", organization: "", exp_type: "emploi", start_date: "", end_date: "", is_current: false, description: "", location: "" });
  return (
    <div className="space-y-6 pt-6">
      <SheetHeader><SheetTitle>Ajouter une expérience</SheetTitle></SheetHeader>
      <div className="space-y-4">
        <div>
          <Label>Type</Label>
          <Select value={form.exp_type} onValueChange={v => setForm(p => ({ ...p, exp_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="emploi">Emploi</SelectItem>
              <SelectItem value="stage">Stage</SelectItem>
              <SelectItem value="bénévolat">Bénévolat</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Titre du poste *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
        <div><Label>Organisation *</Label><Input value={form.organization} onChange={e => setForm(p => ({ ...p, organization: e.target.value }))} /></div>
        <div><Label>Lieu</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
        <div><Label>Date de début *</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
        <div className="flex items-center gap-2"><Switch checked={form.is_current} onCheckedChange={v => setForm(p => ({ ...p, is_current: v }))} /><Label>Poste actuel</Label></div>
        {!form.is_current && <div><Label>Date de fin</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>}
        <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
      </div>
      <Button className="w-full" disabled={!form.title || !form.organization || !form.start_date} onClick={() => onSave(form)}>Ajouter</Button>
    </div>
  );
}

function EducationForm({ onSave }: { onSave: (data: any) => void }) {
  const [form, setForm] = useState({ degree: "", field_of_study: "", institution: "", start_year: "", end_year: "", is_current: false, description: "" });
  return (
    <div className="space-y-6 pt-6">
      <SheetHeader><SheetTitle>Ajouter une formation</SheetTitle></SheetHeader>
      <div className="space-y-4">
        <div><Label>Diplôme *</Label><Input value={form.degree} onChange={e => setForm(p => ({ ...p, degree: e.target.value }))} /></div>
        <div><Label>Spécialité / filière</Label><Input value={form.field_of_study} onChange={e => setForm(p => ({ ...p, field_of_study: e.target.value }))} /></div>
        <div><Label>Établissement *</Label><Input value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} /></div>
        <div><Label>Année de début</Label><Input type="number" value={form.start_year} onChange={e => setForm(p => ({ ...p, start_year: e.target.value }))} /></div>
        <div className="flex items-center gap-2"><Switch checked={form.is_current} onCheckedChange={v => setForm(p => ({ ...p, is_current: v }))} /><Label>En cours</Label></div>
        {!form.is_current && <div><Label>Année de fin</Label><Input type="number" value={form.end_year} onChange={e => setForm(p => ({ ...p, end_year: e.target.value }))} /></div>}
        <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
      </div>
      <Button className="w-full" disabled={!form.degree || !form.institution} onClick={() => onSave({ ...form, start_year: form.start_year ? parseInt(form.start_year) : null, end_year: form.end_year ? parseInt(form.end_year) : null })}>Ajouter</Button>
    </div>
  );
}

function SkillForm({ onSave }: { onSave: (data: any) => void }) {
  const [form, setForm] = useState({ skill_name: "", skill_level: "intermédiaire", category: "Autre" });
  return (
    <div className="flex gap-2 flex-wrap p-3 rounded-lg border border-border bg-secondary/30">
      <Input placeholder="Compétence..." value={form.skill_name} onChange={e => setForm(p => ({ ...p, skill_name: e.target.value }))} className="flex-1 min-w-[120px]" />
      <Select value={form.skill_level} onValueChange={v => setForm(p => ({ ...p, skill_level: v }))}>
        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="débutant">Débutant</SelectItem>
          <SelectItem value="intermédiaire">Intermédiaire</SelectItem>
          <SelectItem value="avancé">Avancé</SelectItem>
          <SelectItem value="expert">Expert</SelectItem>
        </SelectContent>
      </Select>
      <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {["Technique", "Langues", "Soft skills", "Outils", "Recherche", "Autre"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button size="sm" disabled={!form.skill_name} onClick={() => onSave(form)}>Ajouter</Button>
    </div>
  );
}

function RecommendationForm({ userName, userId, onSave }: { userName: string; userId: string; onSave: (data: any) => void }) {
  const [form, setForm] = useState({ relationship: "", content: "" });
  return (
    <div className="space-y-6 pt-6">
      <SheetHeader><SheetTitle>Recommander {userName}</SheetTitle></SheetHeader>
      <div className="space-y-4">
        <div><Label>Votre relation avec {userName}</Label><Input placeholder="Ex: Encadrant de stage" value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))} /></div>
        <div>
          <Label>Recommandation ({form.content.length}/500)</Label>
          <Textarea placeholder="Décrivez les qualités de cette personne..." value={form.content} maxLength={500} rows={5} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
        </div>
      </div>
      <Button className="w-full" disabled={form.content.length < 50} onClick={() => onSave({ toUserId: userId, ...form })}>Envoyer la recommandation</Button>
    </div>
  );
}
