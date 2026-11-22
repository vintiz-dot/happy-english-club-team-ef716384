import { useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cleanInterests } from "@/lib/lessonDecks/views";

// Where a class left off (class_deck_state, migration 20261122092000): the last
// flipbook page shown, the last deck and slide, and the class's homework interest
// groups (student ids only). Staff of the class read and write it; RLS decides.
// Not in the generated types yet.
const db = supabase as any;

export type ClassDeckState = {
  class_id: string;
  flipbook_id: string | null;
  flipbook_page: number | null;
  deck_id: string | null;
  slide_index: number | null;
  interests: Record<string, string[]>;
  updated_at?: string;
};

/** Read and save one class's place. Saves are merged and quiet; a failed save never blocks the lesson. */
export function useClassDeckState(classId: string | null) {
  const qc = useQueryClient();
  const key = ["class-deck-state", classId];
  const query = useQuery({
    queryKey: key,
    enabled: !!classId,
    staleTime: 10_000,
    retry: false,
    queryFn: async (): Promise<ClassDeckState | null> => {
      const { data, error } = await db.from("class_deck_state").select("*").eq("class_id", classId).maybeSingle();
      // Before the migration is applied the table is missing: behave as "no place saved yet".
      if (error) return null;
      return data ? { ...data, interests: cleanInterests(data.interests) } : null;
    },
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<ClassDeckState>>({});

  const flush = useCallback(async () => {
    if (!classId) return null;
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return null;
    const { error } = await db.from("class_deck_state").upsert({ class_id: classId, ...patch }, { onConflict: "class_id" });
    if (!error) qc.setQueryData(key, (old: ClassDeckState | null) => ({ ...(old ?? { class_id: classId, flipbook_id: null, flipbook_page: null, deck_id: null, slide_index: null, interests: {} }), ...patch }));
    return error;
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Save soon (slide changes come fast); the last call wins. */
  const save = useCallback((patch: Partial<ClassDeckState>, now = false) => {
    if (!classId) return Promise.resolve(null);
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    if (now) return flush();
    timer.current = setTimeout(() => { void flush(); }, 1200);
    return Promise.resolve(null);
  }, [classId, flush]);

  return { state: query.data ?? null, loading: query.isLoading, save };
}
