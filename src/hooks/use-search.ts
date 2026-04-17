import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSearch(query: string, category: string) {
  return useQuery({
    queryKey: ["search", query, category],
    enabled: !!query && query.length >= 2,
    queryFn: async () => {
      const q = `%${query}%`;
      const results: any = {};

      if (category === "all" || category === "people") {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, department")
          .eq("account_status", "active")
          .or(`full_name.ilike.${q},department.ilike.${q}`)
          .limit(category === "all" ? 3 : 10);
        results.people = data || [];
      }

      if (category === "all" || category === "courses") {
        const { data } = await supabase
          .from("courses")
          .select("id, title, description, category, created_by")
          .or(`title.ilike.${q},description.ilike.${q},category.ilike.${q}`)
          .limit(category === "all" ? 3 : 10);
        results.courses = data || [];
      }

      if (category === "all" || category === "classes") {
        const { data } = await supabase
          .from("classrooms")
          .select("id, name, description, subject, created_by")
          .or(`name.ilike.${q},description.ilike.${q}`)
          .limit(category === "all" ? 3 : 10);
        results.classes = data || [];
      }

      if (category === "all" || category === "groups") {
        const { data } = await supabase
          .from("groups")
          .select("id, name, description, is_public, group_members(count)")
          .or(`name.ilike.${q},description.ilike.${q}`)
          .limit(category === "all" ? 3 : 10);
        results.groups = data || [];
      }

      if (category === "all" || category === "posts") {
        const { data } = await supabase
          .from("posts")
          .select("id, content, user_id, created_at, profiles!posts_user_id_profiles_fkey(full_name, avatar_url)")
          .ilike("content", q)
          .order("created_at", { ascending: false })
          .limit(category === "all" ? 3 : 10);
        results.posts = data || [];
      }

      if (category === "all" || category === "exams") {
        const { data } = await supabase
          .from("exams")
          .select("id, title, matiere, annee, exam_type, created_by")
          .or(`title.ilike.${q},matiere.ilike.${q},annee.ilike.${q}`)
          .limit(category === "all" ? 3 : 10);
        results.exams = data || [];
      }

      if (category === "all" || category === "events") {
        const { data } = await supabase
          .from("events")
          .select("id, title, start_time, event_type")
          .or(`title.ilike.${q},description.ilike.${q}`)
          .limit(category === "all" ? 3 : 10);
        results.events = data || [];
      }

      return results;
    },
  });
}

export function useQuickSearch(query: string) {
  return useQuery({
    queryKey: ["quick-search", query],
    enabled: !!query && query.length >= 2,
    queryFn: async () => {
      const q = `%${query}%`;
      const results: any[] = [];

      const [people, courses, groups] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url").eq("account_status", "active").ilike("full_name", q).limit(2),
        supabase.from("courses").select("id, title, category").ilike("title", q).limit(2),
        supabase.from("groups").select("id, name").ilike("name", q).limit(1),
      ]);

      (people.data || []).forEach((p) => results.push({ type: "person", id: p.user_id, title: p.full_name, avatar: p.avatar_url }));
      (courses.data || []).forEach((c) => results.push({ type: "course", id: c.id, title: c.title, subtitle: c.category }));
      (groups.data || []).forEach((g) => results.push({ type: "group", id: g.id, title: g.name }));

      return results;
    },
  });
}
