import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useEvents(month?: number, year?: number) {
  return useQuery({
    queryKey: ["events", month, year],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*, event_scopes(*)")
        .order("start_time", { ascending: true });

      if (month !== undefined && year !== undefined) {
        const start = new Date(year, month, 1).toISOString();
        const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        query = query.gte("start_time", start).lte("start_time", end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      startTime,
      endTime,
      location,
      coverImageUrl,
      eventType,
      scopes,
    }: {
      title: string;
      description?: string;
      startTime: string;
      endTime?: string;
      location?: string;
      coverImageUrl?: string;
      eventType: string;
      scopes: { scope_type: string; scope_value: string | null }[];
    }) => {
      // Map French event types to DB enum
      const typeMap: Record<string, string> = {
        "Conférence": "meeting", "Examen": "exam", "Réunion": "meeting",
        "Atelier": "course", "Sortie": "other", "Autre": "other",
      };
      const dbEventType = typeMap[eventType] || eventType;

      const { data: event, error } = await supabase
        .from("events")
        .insert({
          title,
          description: description || "",
          start_time: startTime,
          end_time: endTime || null,
          location: location || "",
          cover_image_url: coverImageUrl || null,
          event_type: dbEventType as any,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert scopes
      if (scopes.length > 0) {
        const { error: scopeError } = await supabase
          .from("event_scopes" as any)
          .insert(
            scopes.map((s) => ({
              event_id: event.id,
              scope_type: s.scope_type,
              scope_value: s.scope_value,
            }))
          );
        if (scopeError) throw scopeError;
      }

      return event;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useEventRsvp(eventId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["event-rsvp", eventId],
    enabled: !!user && !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_rsvp")
        .select("*")
        .eq("event_id", eventId);
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleRsvp() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      const { data: existing } = await supabase
        .from("event_rsvp")
        .select("id, status")
        .eq("event_id", eventId)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        if (existing.status === status) {
          await supabase.from("event_rsvp").delete().eq("id", existing.id);
        } else {
          await supabase.from("event_rsvp").update({ status }).eq("id", existing.id);
        }
      } else {
        await supabase.from("event_rsvp").insert({
          event_id: eventId,
          user_id: user!.id,
          status,
        });
      }
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ["event-rsvp", eventId] });
    },
  });
}
