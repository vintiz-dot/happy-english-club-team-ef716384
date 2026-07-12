import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ITEMS_PER_PAGE } from "@/lib/resourceConstants";
import Fuse from "fuse.js";

/**
 * The `resources` and `resource_class_access` tables are not yet in the
 * auto-generated Supabase types. We cast through `any` for those queries.
 * After running `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`
 * these casts can be replaced with the proper typed calls.
 */
const db = supabase as any;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  storage_key: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  visibility: "private" | "shared";
  blooms_levels: string[];
  pyp_themes: string[];
  vocab_tags: string[];
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  class_ids?: string[];
}

export interface ResourceFormData {
  title: string;
  description?: string;
  visibility: "private" | "shared";
  blooms_levels: string[];
  pyp_themes: string[];
  vocab_tags: string[];
  class_ids: string[];
  file?: File;
  external_url?: string;
}

/* ------------------------------------------------------------------ */
/*  Fetch resources (teacher — sees all)                               */
/* ------------------------------------------------------------------ */

export function useTeacherResources() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["teacher-resources", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Fetch resources
      const { data: resources, error } = await db
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch class access for each resource
      const resourceIds = (resources || []).map((r: any) => r.id);
      const { data: accessRows } = await db
        .from("resource_class_access")
        .select("resource_id, class_id")
        .in("resource_id", resourceIds.length > 0 ? resourceIds : ["__none__"]);

      const accessMap = new Map<string, string[]>();
      for (const row of accessRows || []) {
        const existing = accessMap.get(row.resource_id) || [];
        existing.push(row.class_id);
        accessMap.set(row.resource_id, existing);
      }

      return (resources || []).map((r: any) => ({
        ...r,
        blooms_levels: r.blooms_levels || [],
        pyp_themes: r.pyp_themes || [],
        vocab_tags: r.vocab_tags || [],
        class_ids: accessMap.get(r.id) || [],
      })) as Resource[];
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Fetch resources (student — sees shared + enrolled classes)          */
/* ------------------------------------------------------------------ */

export function useStudentResources(studentId?: string) {
  return useQuery({
    queryKey: ["student-resources", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      // Get student's enrolled class IDs
      const { data: enrollments, error: enrollErr } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", studentId!)
        .is("end_date", null);

      if (enrollErr) {
        console.error("[useStudentResources] enrollments error:", enrollErr);
        throw enrollErr;
      }

      const classIds = (enrollments || []).map((e: any) => e.class_id);
      if (classIds.length === 0) return [];

      // Get resource IDs + class mapping accessible to these classes
      const { data: accessRows, error: accessErr } = await db
        .from("resource_class_access")
        .select("resource_id, class_id")
        .in("class_id", classIds);

      if (accessErr) {
        console.error("[useStudentResources] resource_class_access error:", accessErr);
        throw accessErr;
      }

      const resourceIds = [...new Set((accessRows || []).map((a: any) => a.resource_id))];
      if (resourceIds.length === 0) return [];

      // Build class_ids mapping per resource
      const accessMap = new Map<string, string[]>();
      for (const row of accessRows || []) {
        const existing = accessMap.get(row.resource_id) || [];
        existing.push(row.class_id);
        accessMap.set(row.resource_id, existing);
      }

      // Fetch the actual resources (only shared)
      const { data: resources, error } = await db
        .from("resources")
        .select("*")
        .in("id", resourceIds)
        .eq("visibility", "shared")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[useStudentResources] resources error:", error);
        throw error;
      }

      return (resources || []).map((r: any) => ({
        ...r,
        blooms_levels: r.blooms_levels || [],
        pyp_themes: r.pyp_themes || [],
        vocab_tags: r.vocab_tags || [],
        class_ids: accessMap.get(r.id) || [],
      })) as Resource[];
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Fuzzy search via Fuse.js                                           */
/* ------------------------------------------------------------------ */

export function useResourceSearch(resources: Resource[], query: string) {
  const fuse = useMemo(
    () =>
      new Fuse(resources, {
        keys: ["title", "description", "vocab_tags", "file_name"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [resources],
  );

  return useMemo(() => {
    if (!query.trim()) return resources;
    return fuse.search(query).map((r) => r.item);
  }, [fuse, resources, query]);
}

/* ------------------------------------------------------------------ */
/*  Paginate                                                            */
/* ------------------------------------------------------------------ */

export function usePagination<T>(items: T[], page: number) {
  return useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    const paged = items.slice(start, start + ITEMS_PER_PAGE);
    return { paged, totalPages, currentPage: safePage, totalItems: items.length };
  }, [items, page]);
}

/* ------------------------------------------------------------------ */
/*  Create resource                                                     */
/* ------------------------------------------------------------------ */

export function useCreateResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: ResourceFormData) => {
      if (!user) throw new Error("Not authenticated");

      let storageKey: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;
      let fileType: string | null = null;

      // Upload file if provided
      if (data.file) {
        const ext = data.file.name.split(".").pop() || "bin";
        const key = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("resources")
          .upload(key, data.file, { contentType: data.file.type });

        if (uploadErr) throw uploadErr;

        storageKey = key;
        fileName = data.file.name;
        fileSize = data.file.size;
        fileType = data.file.type;
      }

      // Insert resource row
      const { data: resource, error } = await db
        .from("resources")
        .insert({
          title: data.title,
          description: data.description || null,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
          storage_key: storageKey,
          external_url: data.external_url || null,
          visibility: data.visibility,
          blooms_levels: data.blooms_levels,
          pyp_themes: data.pyp_themes,
          vocab_tags: data.vocab_tags,
          uploaded_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Insert class access rows
      if (data.class_ids.length > 0) {
        const rows = data.class_ids.map((classId) => ({
          resource_id: resource.id,
          class_id: classId,
        }));
        const { error: accessErr } = await db
          .from("resource_class_access")
          .insert(rows);
        if (accessErr) throw accessErr;
      }

      return resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-resources"] });
      queryClient.invalidateQueries({ queryKey: ["student-resources"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Update resource                                                     */
/* ------------------------------------------------------------------ */

export function useUpdateResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      resourceId,
      data,
    }: {
      resourceId: string;
      data: ResourceFormData;
    }) => {
      if (!user) throw new Error("Not authenticated");

      let storageKey: string | null | undefined;
      let fileName: string | null | undefined;
      let fileSize: number | null | undefined;
      let fileType: string | null | undefined;

      // Upload new file if provided
      if (data.file) {
        const ext = data.file.name.split(".").pop() || "bin";
        const key = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("resources")
          .upload(key, data.file, { contentType: data.file.type });
        if (uploadErr) throw uploadErr;

        storageKey = key;
        fileName = data.file.name;
        fileSize = data.file.size;
        fileType = data.file.type;
      }

      // Update resource row
      const updatePayload: Record<string, unknown> = {
        title: data.title,
        description: data.description || null,
        external_url: data.external_url || null,
        visibility: data.visibility,
        blooms_levels: data.blooms_levels,
        pyp_themes: data.pyp_themes,
        vocab_tags: data.vocab_tags,
      };
      if (storageKey !== undefined) {
        updatePayload.storage_key = storageKey;
        updatePayload.file_name = fileName;
        updatePayload.file_size = fileSize;
        updatePayload.file_type = fileType;
      }

      const { error } = await db
        .from("resources")
        .update(updatePayload)
        .eq("id", resourceId);
      if (error) throw error;

      // Replace class access rows
      await db
        .from("resource_class_access")
        .delete()
        .eq("resource_id", resourceId);

      if (data.class_ids.length > 0) {
        const rows = data.class_ids.map((classId) => ({
          resource_id: resourceId,
          class_id: classId,
        }));
        await db.from("resource_class_access").insert(rows);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-resources"] });
      queryClient.invalidateQueries({ queryKey: ["student-resources"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Delete resource                                                     */
/* ------------------------------------------------------------------ */

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resource: Resource) => {
      // Delete file from storage if it exists
      if (resource.storage_key) {
        await supabase.storage.from("resources").remove([resource.storage_key]);
      }

      const { error } = await db
        .from("resources")
        .delete()
        .eq("id", resource.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-resources"] });
      queryClient.invalidateQueries({ queryKey: ["student-resources"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Fetch teacher's previous vocab tags for autocomplete                */
/* ------------------------------------------------------------------ */

export function useVocabAutocomplete() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vocab-tags", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("resources")
        .select("vocab_tags")
        .eq("uploaded_by", user!.id);
      if (error) throw error;

      const allTags = new Set<string>();
      for (const row of data || []) {
        for (const tag of (row as any).vocab_tags || []) {
          allTags.add(tag);
        }
      }
      return [...allTags].sort();
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Download signed URL                                                 */
/* ------------------------------------------------------------------ */

export async function getResourceSignedUrl(storageKey: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("resources")
    .createSignedUrl(storageKey, 3600); // 1 hour expiry

  if (error || !data?.signedUrl) throw error || new Error("Failed to get signed URL");
  return data.signedUrl;
}

/* ------------------------------------------------------------------ */
/*  Fetch classes for the multi-select                                  */
/* ------------------------------------------------------------------ */

export function useClasses() {
  return useQuery({
    queryKey: ["all-classes-for-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
}
