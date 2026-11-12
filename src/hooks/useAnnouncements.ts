import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useMemo, useState } from "react";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  display_type: "banner" | "popup" | "sticky_header" | "footer_bar" | "splash" | "toast";
  priority: number;
  target_audience: string;
  placement: string;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  is_dismissible: boolean;
  style_config: Record<string, string>;
  created_by: string;
  created_at: string;
  updated_at: string;
  target_class_ids: string[];
  target_student_ids: string[];
}

export function useAnnouncements() {
  const { user, role, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [localDismissals, setLocalDismissals] = useState<string[]>([]);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_announcements")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Announcement[];
    },
    // Wait for the sign-in check to finish: before it does, `user` is null
    // and the key would be the signed-out one, so a signed-in page load
    // asked for the same rows twice (once under each key).
    enabled: !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  const { data: dismissals = [] } = useQuery({
    queryKey: ["announcement_dismissals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("announcement_dismissals")
        .select("announcement_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((d: { announcement_id: string }) => d.announcement_id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("announcement_dismissals")
        .insert({ announcement_id: announcementId, user_id: user.id });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcement_dismissals"] });
    },
  });

  const dismiss = useCallback(
    (id: string) => {
      setLocalDismissals((prev) => (prev.includes(id) ? prev : [...prev, id]));
      dismissMutation.mutate(id);
    },
    [dismissMutation]
  );

  // Fetch student profile for class/student-level filtering
  const { data: studentProfile } = useQuery({
    queryKey: ["announcement_student_profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("students")
        .select("id, enrollments(class_id)")
        .eq("linked_user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const now = new Date();
    return announcements.filter((a) => {
      // Time filter
      if (a.starts_at && new Date(a.starts_at) > now) return false;
      if (a.expires_at && new Date(a.expires_at) < now) return false;

      if (dismissals.includes(a.id) || localDismissals.includes(a.id)) return false;

      // Placement filter
      const isLoggedIn = !!user;
      if (a.placement === "before_login" && isLoggedIn) return false;
      if (a.placement === "after_login" && !isLoggedIn) return false;

      // Audience filter
      if (a.target_audience === "everyone") return true;
      if (a.target_audience === "authenticated") return isLoggedIn;
      if (!isLoggedIn) return false;
      if (a.target_audience === "teachers") return role === "teacher";
      if (a.target_audience === "families") return role === "family";

      if (a.target_audience === "students" || a.target_audience === "paying_students") {
        if (role !== "student") return false;

        // Class-level filter
        const classIds = a.target_class_ids ?? [];
        if (classIds.length > 0 && studentProfile) {
          const enrolledClassIds = (studentProfile.enrollments ?? []).map((e: any) => e.class_id);
          if (!classIds.some((cid) => enrolledClassIds.includes(cid))) return false;
        }

        // Student-level filter
        const studentIds = a.target_student_ids ?? [];
        if (studentIds.length > 0 && studentProfile) {
          if (!studentIds.includes(studentProfile.id)) return false;
        }

        return true;
      }

      return true;
    });
  }, [announcements, dismissals, localDismissals, user, role, studentProfile]);

  return { announcements: filtered, isLoading, dismiss };
}

export function useAdminAnnouncements() {
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin_announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Announcement[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (announcement: Partial<Announcement>) => {
      const { error } = await supabase
        .from("site_announcements")
        .insert(announcement as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_announcements"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Announcement> & { id: string }) => {
      const { error } = await supabase
        .from("site_announcements")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_announcements"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("site_announcements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_announcements"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("site_announcements")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_announcements"] }),
  });

  return {
    announcements,
    isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    toggle: toggleMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
