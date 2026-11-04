/**
 * What the Stars Sync screens read.
 *
 * All of it is read as the signed-in admin, so row-level security stays the
 * boundary. Nothing here writes.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_ROSTER, readRoster, type StarsRoster } from "@/lib/starsRoster";
import type { StarsEventRow } from "@/lib/starsRecords";
import type { HecAward, HecChild, HecMark, PixelPalRecord } from "@/lib/starsLink";

/** PostgREST hands back at most this many rows at a time. */
const PAGE = 1000;
/**
 * Far more than a term of lessons. Past this the newest are kept and the
 * screen says so, rather than a browser tab running out of memory.
 */
const MAX_RECORDS = 20_000;

const RECORD_COLUMNS =
  "event_id, seq, kind, outcome, outcome_note, lesson_date, stars_class_id, stars_student_id, " +
  "processed_at, received_at, attempts, applied_ref, payload:raw->payload, occurred_at:raw->>occurred_at";

// Typed as plain strings: the client's query-string types overflow on the
// JSON paths and the embed, and these rows are checked by hand below.
const EVIDENCE_COLUMNS: string = "stars_student_id, stars_class_id, kind, outcome, lesson_date, payload:raw->payload";
const MARK_COLUMNS: string = "student_id, status, notes, marked_by, sessions!inner(class_id, date)";

interface LoadedRecords {
  rows: StarsEventRow[];
  truncated: boolean;
  /** The newest processed_at held: the next load only asks for what is newer. */
  watermark: string | null;
  loadedAt: string;
}

/** Reads every page of a query, up to `limit` rows. */
async function readPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  limit: number,
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  for (let from = 0; from < limit; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const got = (data ?? []) as T[];
    rows.push(...got);
    if (got.length < PAGE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

/**
 * The record log, newest first.
 *
 * Records before the sync's start date are left out unless asked for: a
 * first run can bring months of them, and they will never need anybody.
 * After the first load only what changed since is fetched, because the
 * sync touches this table every five minutes and the log can be large.
 */
export function useStarsRecords(includeBeforeStart: boolean) {
  const queryClient = useQueryClient();
  const queryKey = ["stars-records", includeBeforeStart] as const;

  const query = useQuery<LoadedRecords>({
    queryKey,
    refetchInterval: 60_000,
    queryFn: async () => {
      const held = queryClient.getQueryData<LoadedRecords>(queryKey);
      const since = held?.watermark ?? null;

      const { rows, truncated } = await readPages<StarsEventRow>((from, to) => {
        let q = supabase.from("stars_sync_events").select(RECORD_COLUMNS);
        if (!includeBeforeStart) q = q.neq("outcome", "skipped_before_start");
        if (since) q = q.gte("processed_at", since);
        return q.order("seq", { ascending: false }).range(from, to);
      }, MAX_RECORDS);

      const merged = new Map((held?.rows ?? []).map((row) => [row.event_id, row]));
      for (const row of rows) merged.set(row.event_id, row);

      let watermark = since;
      for (const row of rows) {
        if (!watermark || row.processed_at > watermark) watermark = row.processed_at;
      }
      return {
        rows: [...merged.values()],
        truncated: since ? Boolean(held?.truncated) : truncated,
        watermark,
        loadedAt: new Date().toISOString(),
      };
    },
  });

  return query;
}

/** How many records are from before the start date, without loading them. */
export function useBeforeStartCount() {
  return useQuery({
    queryKey: ["stars-records-before-start"],
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("stars_sync_events")
        .select("event_id", { count: "exact", head: true })
        .eq("outcome", "skipped_before_start");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export type RosterState =
  /** Names are coming straight from Pixel Pal. */
  | "live"
  /** HEC's function is deployed but Pixel Pal has no roster endpoint yet. */
  | "not_ready"
  /** The stars-roster function is not deployed yet. */
  | "not_deployed"
  /** Pixel Pal refused the shared secret, or there is none. */
  | "refused"
  /** Pixel Pal did not answer properly. */
  | "unavailable"
  | "loading";

export interface LiveRoster {
  state: RosterState;
  roster: StarsRoster | null;
  fetchedAt: string | null;
}

/**
 * Pixel Pal's names, straight from Pixel Pal, held only in this page's
 * memory. A function or an endpoint that is not there yet is a normal state
 * here, not an error: the page falls back on a pasted list, so the two
 * halves can ship in either order.
 */
export function useLiveRoster() {
  return useQuery<LiveRoster>({
    queryKey: ["stars-roster"],
    retry: false,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("stars-roster", { body: {} });
      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status;
        // 404 from the gateway, or the preflight of a function that is
        // not there failing outright, both mean it has not been deployed.
        return { state: status && status !== 404 ? "unavailable" : "not_deployed", roster: null, fetchedAt: null };
      }
      const body = data as { status?: string; fetched_at?: string } | null;
      if (body?.status === "ok") {
        const roster = readRoster(body);
        if (roster) return { state: "live", roster, fetchedAt: body.fetched_at ?? new Date().toISOString() };
        return { state: "unavailable", roster: null, fetchedAt: null };
      }
      if (body?.status === "not_ready") return { state: "not_ready", roster: null, fetchedAt: null };
      if (body?.status === "refused" || body?.status === "no_secret") return { state: "refused", roster: null, fetchedAt: null };
      return { state: "unavailable", roster: null, fetchedAt: null };
    },
  });
}

/** Pixel Pal's own list comes first; a pasted one fills in what it lacks. */
export function mergeRosters(live: StarsRoster | null | undefined, pasted: StarsRoster | null | undefined): StarsRoster {
  if (!live && !pasted) return EMPTY_ROSTER;
  if (!live) return pasted as StarsRoster;
  if (!pasted) return live;
  return {
    classes: new Map([...pasted.classes, ...live.classes]),
    students: new Map([...pasted.students, ...live.students]),
    studentClasses: new Map([...pasted.studentClasses, ...live.studentClasses]),
    inactive: new Set([...pasted.inactive, ...live.inactive]),
  };
}

export interface LinkEvidence {
  hecChildren: HecChild[];
  records: PixelPalRecord[];
  marks: HecMark[];
  awards: HecAward[];
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/**
 * Everything the link tool weighs: who is in HEC, what Pixel Pal has said
 * about each unlinked child, and what people have marked in HEC on the same
 * days. Only when the tool is open, and only for the classes involved.
 *
 * Pixel Pal's records include those before the start date on purpose. Those
 * are the days both apps were being kept by hand, so they say the most.
 */
export function useLinkEvidence(childRefs: string[], classIds: string[], enabled: boolean) {
  const refsKey = [...childRefs].sort().join(",");
  const classKey = [...classIds].sort().join(",");

  return useQuery<LinkEvidence>({
    queryKey: ["stars-link-evidence", refsKey, classKey],
    enabled,
    staleTime: 60_000,
    // Each answer changes who is being asked about, and so this key. Keep
    // what is on screen meanwhile, or the tool would blank after every answer.
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const [studentsRes, enrolmentsRes] = await Promise.all([
        readPages<{ id: string; full_name: string; is_active: boolean | null }>(
          (from, to) => supabase.from("students").select("id, full_name, is_active").order("full_name").range(from, to),
          10_000,
        ),
        classIds.length === 0
          ? Promise.resolve({ rows: [] as EnrolmentRow[], truncated: false })
          : readPages<EnrolmentRow>(
              (from, to) => supabase.from("enrollments")
                .select("student_id, class_id, start_date, end_date, allowed_days")
                .in("class_id", classIds)
                .range(from, to),
              10_000,
            ),
      ]);

      const enrolmentsOf = new Map<string, HecChild["enrollments"]>();
      for (const e of enrolmentsRes.rows) {
        const list = enrolmentsOf.get(e.student_id) ?? [];
        list.push({ classId: e.class_id, start: e.start_date, end: e.end_date, allowedDays: e.allowed_days });
        enrolmentsOf.set(e.student_id, list);
      }
      const hecChildren: HecChild[] = studentsRes.rows.map((s) => ({
        id: s.id,
        name: s.full_name,
        active: s.is_active !== false,
        enrollments: enrolmentsOf.get(s.id) ?? [],
      }));

      let records: PixelPalRecord[] = [];
      if (childRefs.length > 0) {
        const { rows } = await readPages<EvidenceRow>(
          (from, to) => supabase.from("stars_sync_events")
            .select(EVIDENCE_COLUMNS)
            .in("stars_student_id", childRefs)
            .in("kind", ["attendance", "points", "grade"])
            .neq("outcome", "retracted")
            .neq("outcome", "duplicate")
            .order("seq", { ascending: false })
            .range(from, to),
          10_000,
        );
        records = rows
          .filter((r) => r.stars_student_id && r.stars_class_id && r.lesson_date)
          .map((r) => {
            const payload = asObject(r.payload);
            return {
              ref: r.stars_student_id as string,
              classRef: r.stars_class_id as string,
              date: r.lesson_date as string,
              kind: r.kind as PixelPalRecord["kind"],
              status: typeof payload.status === "string" ? payload.status : null,
              points: typeof payload.points === "number" ? payload.points : null,
              waiting: r.outcome === "skipped_unmapped",
            };
          });
      }

      const dates = records.map((r) => r.date).sort();
      const first = dates[0];
      const last = dates[dates.length - 1];
      let marks: HecMark[] = [];
      let awards: HecAward[] = [];

      if (first && classIds.length > 0) {
        // A seeded placeholder is Present with nobody's name on it, and says
        // nothing about whether the child came. A mark the sync wrote says
        // only what Pixel Pal already said. Neither is evidence.
        const [marksRes, awardsRes] = await Promise.all([
          readPages<MarkRow>(
            (from, to) => supabase.from("attendance")
              .select(MARK_COLUMNS)
              .in("sessions.class_id", classIds)
              .gte("sessions.date", first)
              .lte("sessions.date", last)
              .or("marked_by.not.is.null,status.neq.Present")
              .range(from, to),
            20_000,
          ),
          readPages<AwardRow>(
            (from, to) => supabase.from("point_transactions")
              .select("student_id, class_id, date, points, notes")
              .in("class_id", classIds)
              .gte("date", first)
              .lte("date", last)
              .range(from, to),
            20_000,
          ),
        ]);
        marks = marksRes.rows
          .filter((m) => m.notes !== "Pixel Pal" && m.sessions)
          .map((m) => ({
            studentId: m.student_id,
            classId: (m.sessions as { class_id: string }).class_id,
            date: (m.sessions as { date: string }).date,
            status: m.status,
          }));
        awards = awardsRes.rows
          .filter((a) => !(a.notes ?? "").startsWith("[Pixel Pal]"))
          .map((a) => ({ studentId: a.student_id, classId: a.class_id, date: a.date, points: a.points }));
      }

      return { hecChildren, records, marks, awards };
    },
  });
}

interface EnrolmentRow {
  student_id: string;
  class_id: string;
  start_date: string;
  end_date: string | null;
  allowed_days: number[] | null;
}

interface EvidenceRow {
  stars_student_id: string | null;
  stars_class_id: string | null;
  kind: string;
  outcome: string;
  lesson_date: string | null;
  payload: unknown;
}

interface MarkRow {
  student_id: string;
  status: string;
  notes: string | null;
  marked_by: string | null;
  sessions: { class_id: string; date: string } | null;
}

interface AwardRow {
  student_id: string;
  class_id: string;
  date: string;
  points: number;
  notes: string | null;
}
