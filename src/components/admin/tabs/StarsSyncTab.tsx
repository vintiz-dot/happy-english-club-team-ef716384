/**
 * Stars Sync - mirrors registers and points from Pixel Pal into HEC.
 *
 * Every decision about a child's record is made in the database
 * (stars_sync_apply_page, 20261027100000); the edge function stars-sync
 * fetches Pixel Pal's feed and calls it, every five minutes or when an
 * admin presses "Run now". This page is where an admin sets it up, sees
 * what it did, and settles what it would not do on its own.
 *
 * THE ORDER ON THE PAGE IS THE ORDER OF SETTING IT UP. Start date and
 * teacher, then classes, then children, then one supervised run, then
 * the switch. Each section says what is still missing before the next
 * one can matter.
 *
 * PIXEL PAL'S LIST OF CHILDREN IS NEVER STORED. The paste helper reads it
 * into this page's memory to make matching 22 nicknames practical - each
 * one offered only the children enrolled in that class - and saves only
 * the pairs of ids. Names stay in Pixel Pal, where they came from.
 *
 * See docs/STARS_SYNC_SETUP.md.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHero } from "@/components/quest/PageHero";
import { SectionHeader } from "@/components/quest/SectionHeader";
import { toast } from "sonner";
import { dayjs } from "@/lib/date";
import {
  AlertTriangle, CheckCircle2, ClipboardPaste, Clock, Link2, Loader2,
  PauseCircle, Play, Trash2, Users,
} from "lucide-react";

/** A Select item cannot have an empty value; this stands for "none". */
const NONE = "__none__";

const PENDING = [
  "skipped_unmapped", "skipped_no_session", "skipped_no_homework", "skipped_disabled",
  "skipped_not_permitted", "skipped_not_enrolled", "skipped_unsupported",
];

const OUTCOME_LABEL: Record<string, string> = {
  applied: "Applied",
  conflict: "Conflict",
  retracted: "Withdrawn",
  rejected: "Refused",
  duplicate: "Duplicate",
  skipped_unmapped: "Waiting: not matched",
  skipped_no_session: "Waiting: no lesson",
  skipped_no_homework: "Waiting: no homework",
  skipped_disabled: "Waiting: paused",
  skipped_not_permitted: "Waiting: teacher",
  skipped_not_enrolled: "Waiting: not enrolled",
  skipped_unsupported: "Waiting: not supported yet",
  skipped_before_start: "Before start date",
};

type ReadinessStatus = "ready" | "partial" | "paused" | "blocked";

interface Readiness {
  stars_class_id: string;
  class_id: string;
  class_name: string;
  teacher_id: string | null;
  teacher_name: string | null;
  can_sync: boolean;
  via_roster: boolean;
  map_enabled: boolean;
  status: ReadinessStatus;
  detail: string;
}

interface SyncStatus {
  schedule_installed: boolean;
  http_installed: boolean;
  function_known: boolean;
  running: boolean;
  pending: number;
  open_conflicts: number;
  effects_queued?: number;
  effects_failing?: number;
}

interface RunSummary {
  counts?: Record<string, number>;
  pages?: number;
  warnings?: string[];
}

const STATUS_BADGE: Record<ReadinessStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ready: { label: "Ready", variant: "default" },
  partial: { label: "Works for now", variant: "outline" },
  paused: { label: "Paused", variant: "secondary" },
  blocked: { label: "Blocked", variant: "destructive" },
};

function describeCounts(counts: Record<string, number> | undefined): string {
  if (!counts) return "nothing to do";
  const parts = Object.entries(counts)
    .filter(([k, n]) => n > 0 && k !== "already_done")
    .map(([k, n]) => `${n} ${(OUTCOME_LABEL[k] ?? k).toLowerCase()}`);
  return parts.length ? parts.join(", ") : "nothing new";
}

/** A function error's own message, where the response carried one. */
async function functionErrorMessage(error: unknown): Promise<string> {
  const ctx = (error as { context?: { json?: () => Promise<unknown> } })?.context;
  try {
    const body = (await ctx?.json?.()) as { error?: string; message?: string } | undefined;
    if (body?.error) return body.error;
    if (body?.message) return body.message;
  } catch {
    // fall through to the generic message
  }
  return error instanceof Error ? error.message : "The sync could not be run.";
}

export default function StarsSyncTab() {
  const queryClient = useQueryClient();
  const refresh = () => {
    for (const k of ["stars-connection", "stars-cursor", "stars-status", "stars-class-map",
                     "stars-student-map", "stars-readiness", "stars-events", "stars-conflicts",
                     "stars-enrolled"]) {
      queryClient.invalidateQueries({ queryKey: [k] });
    }
  };
  const fail = (e: unknown, fallback: string) => toast.error(e instanceof Error ? e.message : fallback);

  /* --------------------------------------------------------- reads */

  const connection = useQuery({
    queryKey: ["stars-connection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stars_sync_connection")
        .select("enabled, default_teacher_id, sync_from, max_points_per_event, max_points_per_day")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const cursor = useQuery({
    queryKey: ["stars-cursor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stars_sync_cursor")
        .select("last_seq, last_run_at, last_error, last_summary, last_run_by")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });

  const status = useQuery({
    queryKey: ["stars-status"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("stars_sync_status");
      if (error) throw error;
      return data as unknown as SyncStatus;
    },
    refetchInterval: 60_000,
  });

  const teachers = useQuery({
    queryKey: ["stars-teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers").select("id, full_name, is_active, user_id").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const classes = useQuery({
    queryKey: ["stars-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes").select("id, name, is_active").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const students = useQuery({
    queryKey: ["stars-students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, full_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const classMap = useQuery({
    queryKey: ["stars-class-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stars_class_map").select("stars_class_id, class_id, teacher_id, enabled");
      if (error) throw error;
      return data ?? [];
    },
  });

  const studentMap = useQuery({
    queryKey: ["stars-student-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stars_student_map").select("stars_student_id, student_id, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const readiness = useQuery({
    queryKey: ["stars-readiness"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("stars_sync_readiness");
      if (error) throw error;
      return (data ?? []) as unknown as Readiness[];
    },
  });

  // Children enrolled now in each mapped class: what the matcher offers.
  const mappedClassIds = useMemo(() => (classMap.data ?? []).map((m) => m.class_id), [classMap.data]);
  const enrolled = useQuery({
    queryKey: ["stars-enrolled", mappedClassIds],
    enabled: mappedClassIds.length > 0,
    queryFn: async () => {
      const today = dayjs().format("YYYY-MM-DD");
      const { data, error } = await supabase
        .from("enrollments")
        .select("student_id, class_id, start_date, end_date")
        .in("class_id", mappedClassIds);
      if (error) throw error;
      return (data ?? []).filter((e) => e.start_date <= today && (!e.end_date || e.end_date >= today));
    },
  });

  const events = useQuery({
    queryKey: ["stars-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stars_sync_events")
        .select("event_id, seq, kind, outcome, outcome_note, lesson_date, stars_class_id, stars_student_id, processed_at, attempts")
        .order("processed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const conflicts = useQuery({
    queryKey: ["stars-conflicts"],
    // A conflict can be settled under the admin's feet - by the sync,
    // when Pixel Pal withdraws its mark, or by another admin. The settle
    // call refuses a stale one anyway; this keeps the list honest too.
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stars_sync_conflicts")
        .select("id, event_id, session_id, student_id, ours, theirs, detected_at, students(full_name), sessions(date, classes(name))")
        .is("resolved_at", null)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  /* -------------------------------------------------------- writes */

  const saveConnection = useMutation({
    mutationFn: async (patch: {
      enabled?: boolean; default_teacher_id?: string | null; sync_from?: string | null;
      max_points_per_event?: number; max_points_per_day?: number;
    }) => {
      const { error } = await supabase
        .from("stars_sync_connection")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
      return patch;
    },
    onSuccess: (patch) => {
      if (patch.enabled !== undefined) {
        toast.success(patch.enabled
          ? "Schedule on — Pixel Pal is read every five minutes"
          : "Schedule off — nothing is read until it is turned back on");
      } else {
        toast.success("Saved");
      }
      refresh();
    },
    onError: (e) => fail(e, "Could not save"),
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stars-sync", { body: {} });
      if (error) throw new Error(await functionErrorMessage(error));
      return data as { status?: string; message?: string; counts?: Record<string, number> };
    },
    onSuccess: (data) => {
      if (data?.status === "busy") toast.info(data.message ?? "A sync is already running.");
      else toast.success(`Sync finished: ${describeCounts(data?.counts)}.`);
      refresh();
    },
    onError: (e) => { fail(e, "The sync could not be run"); refresh(); },
  });

  const addClass = useMutation({
    mutationFn: async (v: { starsId: string; classId: string; teacherId: string | null }) => {
      const { error } = await supabase.from("stars_class_map").insert({
        stars_class_id: v.starsId.trim(), class_id: v.classId, teacher_id: v.teacherId,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class mapped"); refresh(); },
    onError: (e) => fail(e, "Could not map that class"),
  });

  const updateClass = useMutation({
    mutationFn: async (v: { starsId: string; patch: { teacher_id?: string | null; enabled?: boolean } }) => {
      const { error } = await supabase.from("stars_class_map").update(v.patch).eq("stars_class_id", v.starsId);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e) => fail(e, "Could not update that class"),
  });

  const removeClass = useMutation({
    mutationFn: async (starsId: string) => {
      const { error } = await supabase.from("stars_class_map").delete().eq("stars_class_id", starsId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class unmapped"); refresh(); },
    onError: (e) => fail(e, "Could not unmap that class"),
  });

  const addStudents = useMutation({
    mutationFn: async (pairs: { stars_student_id: string; student_id: string }[]) => {
      const { error } = await supabase.from("stars_student_map").insert(pairs);
      if (error) throw error;
      return pairs.length;
    },
    onSuccess: (n) => { toast.success(`${n} ${n === 1 ? "child" : "children"} matched`); refresh(); },
    onError: (e) => fail(e, "Could not save the matches"),
  });

  const removeStudent = useMutation({
    mutationFn: async (starsId: string) => {
      const { error } = await supabase.from("stars_student_map").delete().eq("stars_student_id", starsId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Child unmatched"); refresh(); },
    onError: (e) => fail(e, "Could not unmatch that child"),
  });

  // One call, one transaction. It refuses - with nothing written - if the
  // conflict was settled meanwhile, if Pixel Pal withdrew its mark, or if
  // the register no longer shows what it showed when the conflict was
  // raised. It used to call mark-attendance first and check afterwards,
  // in a second request, which could overwrite a teacher's mark with a
  // value nobody wanted any more.
  const resolve = useMutation({
    mutationFn: async (v: { conflictId: string; resolution: "kept_ours" | "took_theirs" }) => {
      const { error } = await supabase.rpc("stars_sync_resolve_conflict", {
        p_conflict_id: v.conflictId, p_resolution: v.resolution,
      });
      if (error) throw error;
      return v.resolution;
    },
    onSuccess: (r) => {
      toast.success(r === "took_theirs" ? "Pixel Pal's mark applied" : "HEC's mark kept");
      refresh();
    },
    onError: (e) => { fail(e, "Could not settle that conflict"); refresh(); },
  });

  /* ------------------------------------------------------ local state */

  const [newClassStarsId, setNewClassStarsId] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [newClassTeacher, setNewClassTeacher] = useState(NONE);
  const [singleStarsId, setSingleStarsId] = useState("");
  const [singleChildId, setSingleChildId] = useState("");
  const [pasted, setPasted] = useState("");
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [confirmUnmapClass, setConfirmUnmapClass] = useState<Readiness | null>(null);
  const [confirmUnmatch, setConfirmUnmatch] = useState<string | null>(null);
  const [confirmSwitchOn, setConfirmSwitchOn] = useState(false);
  // The start date is typed into a draft and saved deliberately. Saving on
  // every change stored half-typed dates - a browser reports "0002-10-20"
  // after the first digit of the year - and the field then snapped back
  // and lost the rest of what was typed.
  const [fromDraft, setFromDraft] = useState<string | null>(null);
  const [confirmEarlier, setConfirmEarlier] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<"attention" | "all">("attention");

  const teacherName = (id: string | null | undefined) =>
    (teachers.data ?? []).find((t) => t.id === id)?.full_name ?? "—";
  const studentName = (id: string) =>
    (students.data ?? []).find((s) => s.id === id)?.full_name ?? "Unknown child";

  const matchedStudentIds = useMemo(() => new Set((studentMap.data ?? []).map((m) => m.student_id)), [studentMap.data]);
  const matchedStarsIds = useMemo(() => new Map((studentMap.data ?? []).map((m) => [m.stars_student_id, m.student_id])), [studentMap.data]);
  const mappedHecClassIds = useMemo(() => new Set(mappedClassIds), [mappedClassIds]);
  const usedStarsClassIds = useMemo(() => new Set((classMap.data ?? []).map((m) => m.stars_class_id)), [classMap.data]);
  const hecClassForStars = useMemo(
    () => new Map((classMap.data ?? []).map((m) => [m.stars_class_id, m.class_id])),
    [classMap.data],
  );
  const enrolledIn = useMemo(() => {
    const byClass = new Map<string, Set<string>>();
    for (const e of enrolled.data ?? []) {
      const set = byClass.get(e.class_id) ?? new Set<string>();
      set.add(e.student_id);
      byClass.set(e.class_id, set);
    }
    return byClass;
  }, [enrolled.data]);

  // Pixel Pal's list, parsed in memory only.
  const pastedRows = useMemo(() => {
    if (!pasted.trim()) return { rows: [] as { id: string; name: string; starsClass: string | null }[], error: null as string | null };
    try {
      const parsed = JSON.parse(pasted) as {
        students?: Record<string, unknown>; student_classes?: Record<string, unknown>;
      };
      if (!parsed?.students || typeof parsed.students !== "object") {
        return { rows: [], error: "That list has no \"students\" section." };
      }
      const rows = Object.entries(parsed.students)
        .filter(([, name]) => typeof name === "string")
        .map(([id, name]) => ({
          id: id.trim(),
          name: name as string,
          starsClass: typeof parsed.student_classes?.[id] === "string" ? (parsed.student_classes[id] as string) : null,
        }))
        .sort((a, b) => (a.starsClass ?? "").localeCompare(b.starsClass ?? "") || a.name.localeCompare(b.name));
      return { rows, error: null };
    } catch {
      return { rows: [], error: "That is not the JSON Pixel Pal gave you. Paste the whole thing, from { to }." };
    }
  }, [pasted]);

  const pickedChildIds = useMemo(() => new Set(Object.values(picks).filter((v) => v && v !== NONE)), [picks]);
  const pendingPairs = useMemo(
    () => Object.entries(picks)
      .filter(([starsId, childId]) => childId && childId !== NONE && !matchedStarsIds.has(starsId))
      .map(([stars_student_id, student_id]) => ({ stars_student_id, student_id })),
    [picks, matchedStarsIds],
  );

  const conn = connection.data;
  const fromValid = (() => {
    if (!fromDraft || !/^\d{4}-\d{2}-\d{2}$/.test(fromDraft)) return false;
    const d = dayjs(fromDraft);
    return d.isValid() && d.year() >= 2024 && !d.isAfter(dayjs().add(1, "year"));
  })();
  const rows = readiness.data ?? [];
  const notReady = rows.filter((r) => r.status === "blocked" || r.status === "partial").length;
  const schedOn = conn?.enabled === true;
  const st = status.data;
  const lastSummary = (cursor.data?.last_summary ?? null) as RunSummary | null;

  const attentionEvents = (events.data ?? []).filter(
    (e) => e.outcome === "rejected" || PENDING.includes(e.outcome),
  );
  const shownEvents = eventFilter === "attention" ? attentionEvents : (events.data ?? []);

  // What still stands between now and a working sync, in order.
  const missing: string[] = [];
  if (!conn?.sync_from) missing.push("Choose the date to sync lessons from.");
  if (!conn?.default_teacher_id && rows.every((r) => !r.teacher_id)) missing.push("Choose the teacher the sync acts as.");
  if (rows.length === 0) missing.push("Map at least one Pixel Pal class.");
  if ((studentMap.data ?? []).length === 0) missing.push("Match the children.");
  if (st && !st.function_known) missing.push("Run it once by hand — the schedule cannot start until somebody has.");
  if (st && (!st.schedule_installed || !st.http_installed)) {
    missing.push("The automatic schedule is not installed (pg_cron / pg_net). \"Run now\" works without it; see the setup guide.");
  }

  const loadError = connection.error || cursor.error || classMap.error || readiness.error || studentMap.error;
  if (loadError) {
    return (
      <Card className="border-destructive/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Stars Sync could not be loaded
          </CardTitle>
          <CardDescription>
            {loadError instanceof Error ? loadError.message : "Something went wrong."}
            {" "}If a table is reported missing from the schema cache, migration 20261027100000 has not been applied yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const loading = connection.isLoading || classMap.isLoading || readiness.isLoading;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Integrations"
        title="Stars Sync"
        subtitle="Registers and points recorded in Pixel Pal, applied to HEC as your teacher."
        variant="glacier"
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* --------------------------------------------- state of play */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={schedOn ? "default" : "secondary"}>{schedOn ? "Schedule on" : "Schedule off"}</Badge>
                    {st?.running && <Badge variant="outline"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Running</Badge>}
                    {(st?.open_conflicts ?? 0) > 0 && <Badge variant="destructive">{st?.open_conflicts} to settle</Badge>}
                    {(st?.pending ?? 0) > 0 && <Badge variant="outline">{st?.pending} waiting</Badge>}
                    {(st?.effects_failing ?? 0) > 0 && (
                      <Badge variant="outline" title="Tuition or streak updates that were refused and will be retried">
                        {st?.effects_failing} follow-up{st?.effects_failing === 1 ? "" : "s"} retrying
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cursor.data?.last_run_at
                      ? <>Last run {dayjs(cursor.data.last_run_at).format("D MMM, HH:mm")}
                          {cursor.data.last_run_by ? ` (${cursor.data.last_run_by})` : ""}: {cursor.data.last_error ? "failed" : describeCounts(lastSummary?.counts)}.</>
                      : "Never run."}
                  </p>
                  {cursor.data?.last_error && (
                    <p className="text-xs font-medium text-destructive">{cursor.data.last_error}</p>
                  )}
                  {(lastSummary?.warnings ?? []).length > 0 && (
                    <p className="text-xs text-warning">{lastSummary?.warnings?.join(" ")}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => runNow.mutate()}
                    disabled={runNow.isPending || !conn?.sync_from || st?.running}
                    variant="outline"
                  >
                    {runNow.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Run now
                  </Button>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="stars-schedule" className="text-sm">Schedule</Label>
                    <Switch
                      id="stars-schedule"
                      checked={schedOn}
                      disabled={saveConnection.isPending}
                      onCheckedChange={(on) => (on ? setConfirmSwitchOn(true) : saveConnection.mutate({ enabled: false }))}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                "Run now" runs once, even with the schedule off — that is how the first,
                supervised run happens. The schedule then repeats it every five minutes.
                Turning it off loses nothing: records wait in Pixel Pal and arrive when it is back on.
              </p>
              {missing.length > 0 && (
                <div className="rounded-md border border-warning/50 bg-warning/5 p-3 text-xs">
                  <p className="mb-1 font-medium">Still to do</p>
                  <ol className="list-decimal space-y-0.5 pl-4">
                    {missing.map((m) => <li key={m}>{m}</li>)}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>

          {/* --------------------------------------------------- setup */}
          <SectionHeader title="Setup" subtitle="Where to start, who the sync acts as, and its limits." />
          <Card>
            <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="stars-from" className="text-sm">Sync lessons from</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="stars-from"
                    type="date"
                    className="w-full sm:w-[200px]"
                    min="2024-01-01"
                    max={dayjs().add(1, "year").format("YYYY-MM-DD")}
                    value={fromDraft ?? conn?.sync_from ?? ""}
                    onChange={(e) => setFromDraft(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!fromValid || fromDraft === (conn?.sync_from ?? "") || saveConnection.isPending}
                    onClick={() => {
                      if (!fromDraft) return;
                      // Moving the start EARLIER imports history, which is
                      // where hand-typed points get counted twice.
                      if (conn?.sync_from && fromDraft < conn.sync_from) setConfirmEarlier(fromDraft);
                      else saveConnection.mutate({ sync_from: fromDraft }, { onSuccess: () => setFromDraft(null) });
                    }}
                  >
                    Save date
                  </Button>
                </div>
                {fromDraft !== null && !fromValid && (
                  <p className="text-xs text-destructive">Choose a full date between 2024 and a year from now.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Nothing for a lesson before this date is imported. If anybody has been typing
                  Pixel Pal's points into HEC by hand, start after the last day they did —
                  otherwise those points are added twice.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stars-teacher" className="text-sm">Acts as</Label>
                <Select
                  value={conn?.default_teacher_id ?? NONE}
                  onValueChange={(v) => saveConnection.mutate({ default_teacher_id: v === NONE ? null : v })}
                >
                  <SelectTrigger id="stars-teacher" className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Choose a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nobody</SelectItem>
                    {(teachers.data ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}{t.is_active === false ? " (archived)" : ""}{!t.user_id ? " — no login" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Marks and points are recorded as this teacher, and only where they teach in
                  HEC. Nothing reaches money, families, staff or a class you have not mapped.
                  A class below can name its own teacher instead.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stars-cap-award" className="text-sm">Largest single award</Label>
                <Input
                  id="stars-cap-award"
                  type="number"
                  min={1}
                  max={1000}
                  className="w-[140px]"
                  defaultValue={conn?.max_points_per_event ?? 100}
                  key={`award-${conn?.max_points_per_event}`}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 1 && n <= 1000 && n !== conn?.max_points_per_event) {
                      saveConnection.mutate({ max_points_per_event: n });
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stars-cap-day" className="text-sm">Most points one child can gain from Pixel Pal in a day</Label>
                <Input
                  id="stars-cap-day"
                  type="number"
                  min={1}
                  max={5000}
                  className="w-[140px]"
                  defaultValue={conn?.max_points_per_day ?? 300}
                  key={`day-${conn?.max_points_per_day}`}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 1 && n <= 5000 && n !== conn?.max_points_per_day) {
                      saveConnection.mutate({ max_points_per_day: n });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  A safety limit, not a judgement: a fault in another app must not be able to
                  award a child thousands of points. Awards over it are refused and listed below.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ------------------------------------------------- classes */}
          <SectionHeader title="Classes" subtitle="Any Pixel Pal class to any HEC class." />
          {notReady > 0 && (
            <Card className="border-warning/60 bg-warning/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {notReady} class{notReady === 1 ? "" : "es"} will not sync as things stand
                </CardTitle>
                <CardDescription>Each row says why. Records for these classes wait until it is fixed.</CardDescription>
              </CardHeader>
            </Card>
          )}
          <Card>
            <CardContent className="pt-6">
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No classes mapped yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pixel Pal</TableHead>
                        <TableHead>HEC class</TableHead>
                        <TableHead>Acts as</TableHead>
                        <TableHead className="text-center">On</TableHead>
                        <TableHead>Will it work?</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => {
                        const own = (classMap.data ?? []).find((m) => m.stars_class_id === r.stars_class_id)?.teacher_id;
                        const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.blocked;
                        return (
                          <TableRow key={r.stars_class_id}>
                            <TableCell className="font-mono text-xs">{r.stars_class_id}</TableCell>
                            <TableCell className="font-medium">{r.class_name}</TableCell>
                            <TableCell>
                              <Select
                                value={own ?? NONE}
                                onValueChange={(v) => updateClass.mutate({
                                  starsId: r.stars_class_id, patch: { teacher_id: v === NONE ? null : v } })}
                              >
                                <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NONE}>Default ({teacherName(conn?.default_teacher_id)})</SelectItem>
                                  {(teachers.data ?? []).map((t) => (
                                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                aria-label={`Sync ${r.class_name}`}
                                checked={r.map_enabled}
                                disabled={updateClass.isPending}
                                onCheckedChange={(enabled) => updateClass.mutate({ starsId: r.stars_class_id, patch: { enabled } })}
                              />
                            </TableCell>
                            <TableCell className="max-w-md">
                              <Badge variant={badge.variant} className="mb-1 whitespace-nowrap">
                                {r.status === "ready" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                {r.status === "paused" && <PauseCircle className="mr-1 h-3 w-3" />}
                                {(r.status === "partial" || r.status === "blocked") && <AlertTriangle className="mr-1 h-3 w-3" />}
                                {badge.label}
                              </Badge>
                              <p className="text-xs text-muted-foreground">{r.detail}</p>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                aria-label={`Unmap ${r.class_name}`} onClick={() => setConfirmUnmapClass(r)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor="new-stars-class" className="text-xs">Pixel Pal class number</Label>
                  <Input id="new-stars-class" value={newClassStarsId} placeholder="e.g. 19"
                    onChange={(e) => setNewClassStarsId(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-hec-class" className="text-xs">HEC class</Label>
                  <Select value={newClassId} onValueChange={setNewClassId}>
                    <SelectTrigger id="new-hec-class"><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>
                      {(classes.data ?? []).filter((c) => !mappedHecClassIds.has(c.id)).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}{c.is_active === false ? " (archived)" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-class-teacher" className="text-xs">Acts as</Label>
                  <Select value={newClassTeacher} onValueChange={setNewClassTeacher}>
                    <SelectTrigger id="new-class-teacher"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Default ({teacherName(conn?.default_teacher_id)})</SelectItem>
                      {(teachers.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full sm:w-auto"
                    disabled={!newClassStarsId.trim() || usedStarsClassIds.has(newClassStarsId.trim()) || !newClassId || addClass.isPending}
                    onClick={() => addClass.mutate(
                      { starsId: newClassStarsId, classId: newClassId, teacherId: newClassTeacher === NONE ? null : newClassTeacher },
                      { onSuccess: () => { setNewClassStarsId(""); setNewClassId(""); setNewClassTeacher(NONE); } },
                    )}
                  >
                    <Link2 className="mr-2 h-4 w-4" /> Map
                  </Button>
                </div>
              </div>
              {usedStarsClassIds.has(newClassStarsId.trim()) && (
                <p className="mt-2 text-xs text-destructive">That Pixel Pal class is already mapped.</p>
              )}
            </CardContent>
          </Card>

          {/* ------------------------------------------------ children */}
          <SectionHeader title="Children" subtitle="Nothing syncs for a child who is not matched. That is deliberate." />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardPaste className="h-4 w-4" /> Match from Pixel Pal's list
              </CardTitle>
              <CardDescription>
                Paste the list Pixel Pal gave you. Each child is offered only the children
                enrolled in the HEC class their Pixel Pal class is mapped to, so a nickname
                cannot be matched to a child in another class. The list is not saved — only
                the matches are.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={pasted}
                onChange={(e) => { setPasted(e.target.value); setPicks({}); }}
                placeholder='{ "classes": { … }, "students": { … }, "student_classes": { … } }'
                className="min-h-[90px] font-mono text-xs"
              />
              {pastedRows.error && <p className="text-xs text-destructive">{pastedRows.error}</p>}
              {pastedRows.rows.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pixel Pal</TableHead>
                          <TableHead>Name in Pixel Pal</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Child in HEC</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pastedRows.rows.map((r) => {
                          const already = matchedStarsIds.get(r.id);
                          const hecClass = r.starsClass ? hecClassForStars.get(r.starsClass) : undefined;
                          const pool = hecClass ? [...(enrolledIn.get(hecClass) ?? [])] : [];
                          const choice = picks[r.id] ?? NONE;
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-mono text-xs">{r.id}</TableCell>
                              <TableCell>{r.name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{r.starsClass ?? "—"}</TableCell>
                              <TableCell>
                                {already ? (
                                  <span className="text-xs"><CheckCircle2 className="mr-1 inline h-3 w-3 text-success" />{studentName(already)}</span>
                                ) : !hecClass ? (
                                  <span className="text-xs text-muted-foreground">Map class {r.starsClass ?? "?"} first</span>
                                ) : (
                                  <Select value={choice} onValueChange={(v) => setPicks((p) => ({ ...p, [r.id]: v }))}>
                                    <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue placeholder="Choose" /></SelectTrigger>
                                    <SelectContent className="max-h-72">
                                      <SelectItem value={NONE}>Not yet</SelectItem>
                                      {pool
                                        .filter((sid) => !matchedStudentIds.has(sid) && (!pickedChildIds.has(sid) || choice === sid))
                                        .map((sid) => ({ sid, name: studentName(sid) }))
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(({ sid, name }) => <SelectItem key={sid} value={sid}>{name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Check every nickname. A wrong match moves one child's marks and points onto another.
                    </p>
                    <Button
                      disabled={pendingPairs.length === 0 || addStudents.isPending}
                      onClick={() => addStudents.mutate(pendingPairs, { onSuccess: () => setPicks({}) })}
                    >
                      <Users className="mr-2 h-4 w-4" /> Save {pendingPairs.length} match{pendingPairs.length === 1 ? "" : "es"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Matched ({(studentMap.data ?? []).length})</CardTitle>
            </CardHeader>
            <CardContent>
              {(studentMap.data ?? []).length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No children matched yet.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableBody>
                      {[...(studentMap.data ?? [])]
                        .sort((a, b) => studentName(a.student_id).localeCompare(studentName(b.student_id)))
                        .map((m) => (
                          <TableRow key={m.stars_student_id}>
                            <TableCell className="w-24 font-mono text-xs">{m.stars_student_id}</TableCell>
                            <TableCell className="font-medium">{studentName(m.student_id)}</TableCell>
                            <TableCell className="w-10">
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                aria-label={`Unmatch ${studentName(m.student_id)}`}
                                onClick={() => setConfirmUnmatch(m.stars_student_id)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_auto]">
                <Input value={singleStarsId} placeholder="Pixel Pal number" aria-label="Pixel Pal student number"
                  onChange={(e) => setSingleStarsId(e.target.value)} />
                <Select value={singleChildId} onValueChange={setSingleChildId}>
                  <SelectTrigger aria-label="Child in HEC"><SelectValue placeholder="Child in HEC" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {(students.data ?? []).filter((s) => !matchedStudentIds.has(s.id)).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={!singleStarsId.trim() || matchedStarsIds.has(singleStarsId.trim()) || !singleChildId || addStudents.isPending}
                  onClick={() => addStudents.mutate(
                    [{ stars_student_id: singleStarsId.trim(), student_id: singleChildId }],
                    { onSuccess: () => { setSingleStarsId(""); setSingleChildId(""); } },
                  )}
                >
                  Match one
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ----------------------------------------------- conflicts */}
          <SectionHeader title="To settle" subtitle="Both apps hold a different mark. HEC kept its own; you decide." />
          <Card>
            <CardContent className="pt-6">
              {(conflicts.data ?? []).length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Nothing to settle.</p>
              ) : (
                <div className="space-y-2">
                  {(conflicts.data ?? []).map((c) => {
                    const ours = (c.ours ?? {}) as { status?: string };
                    const theirs = (c.theirs ?? {}) as { status?: string };
                    const child = (c.students as { full_name?: string } | null)?.full_name ?? "A child";
                    const lessonInfo = c.sessions as { date?: string; classes?: { name?: string } | null } | null;
                    return (
                      <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                        <div className="text-sm">
                          <span className="font-medium">{child}</span>
                          <span className="text-muted-foreground">
                            {" "}· {lessonInfo?.classes?.name ?? "lesson"} {lessonInfo?.date ? dayjs(lessonInfo.date).format("D MMM") : ""}
                          </span>
                          <p className="text-xs">
                            HEC has <strong>{ours.status ?? "?"}</strong>, Pixel Pal says <strong>{theirs.status ?? "?"}</strong>.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={resolve.isPending}
                            onClick={() => resolve.mutate({ conflictId: c.id, resolution: "kept_ours" })}>
                            Keep HEC's
                          </Button>
                          <Button size="sm" disabled={resolve.isPending || !c.session_id || !c.student_id || !theirs.status}
                            onClick={() => resolve.mutate({ conflictId: c.id, resolution: "took_theirs" })}>
                            Use Pixel Pal's
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ------------------------------------------------ records */}
          <SectionHeader title="Records" subtitle="Everything Pixel Pal sent, and what became of it." />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardDescription>
                {eventFilter === "attention"
                  ? `${attentionEvents.length} waiting or refused. Waiting records are retried every run.`
                  : "The latest 200."}
              </CardDescription>
              <Select value={eventFilter} onValueChange={(v) => setEventFilter(v as "attention" | "all")}>
                <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attention">Needs attention</SelectItem>
                  <SelectItem value="all">Everything</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {shownEvents.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  {(events.data ?? []).length === 0 ? "Nothing yet — Pixel Pal has not been read." : "Nothing needs attention."}
                </p>
              ) : (
                <div className="max-h-[28rem] space-y-1 overflow-y-auto">
                  {shownEvents.map((e) => (
                    <div key={e.event_id} className="rounded-md bg-muted/40 px-3 py-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={e.outcome === "applied" ? "default" : e.outcome === "rejected" || e.outcome === "conflict" ? "destructive" : "secondary"}>
                          {OUTCOME_LABEL[e.outcome] ?? e.outcome}
                        </Badge>
                        <span className="font-medium">{e.kind}</span>
                        {e.lesson_date && <span className="text-muted-foreground">lesson {dayjs(e.lesson_date).format("D MMM")}</span>}
                        {e.stars_class_id && <span className="text-muted-foreground">class {e.stars_class_id}</span>}
                        {e.stars_student_id && <span className="text-muted-foreground">child {e.stars_student_id}</span>}
                        <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />{dayjs(e.processed_at).format("D MMM HH:mm")}
                          {e.attempts > 1 ? ` · tried ${e.attempts}×` : ""}
                        </span>
                      </div>
                      {e.outcome_note && <p className="mt-1 text-muted-foreground">{e.outcome_note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ------------------------------------------------ confirmations */}
      <AlertDialog open={confirmSwitchOn} onOpenChange={setConfirmSwitchOn}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn the schedule on?</AlertDialogTitle>
            <AlertDialogDescription>
              Pixel Pal will be read every five minutes and its registers and points applied
              to HEC as {teacherName(conn?.default_teacher_id)}. Before this, run it once by
              hand and check one child's register and points against Pixel Pal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={() => { saveConnection.mutate({ enabled: true }); setConfirmSwitchOn(false); }}>
              Turn on
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmEarlier !== null} onOpenChange={(o) => !o && setConfirmEarlier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start earlier, on {confirmEarlier ? dayjs(confirmEarlier).format("D MMM YYYY") : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Records for lessons from then until {conn?.sync_from ? dayjs(conn.sync_from).format("D MMM") : "the old start"} that
              Pixel Pal still holds will be imported on the next run. If any of those points were
              already typed into HEC by hand, they will be counted twice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the current date</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmEarlier) saveConnection.mutate({ sync_from: confirmEarlier }, { onSuccess: () => setFromDraft(null) });
              setConfirmEarlier(null);
            }}>Start earlier</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUnmapClass !== null} onOpenChange={(o) => !o && setConfirmUnmapClass(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unmap {confirmUnmapClass?.class_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Records already in HEC stay as they are. New records for this class will wait,
              unmatched, until it is mapped again. To pause it instead, use its On switch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmUnmapClass) removeClass.mutate(confirmUnmapClass.stars_class_id);
              setConfirmUnmapClass(null);
            }}>Unmap</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUnmatch !== null} onOpenChange={(o) => !o && setConfirmUnmatch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unmatch this child?</AlertDialogTitle>
            <AlertDialogDescription>
              Their records in HEC stay as they are. New Pixel Pal records for them will wait
              until they are matched again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmUnmatch) removeStudent.mutate(confirmUnmatch);
              setConfirmUnmatch(null);
            }}>Unmatch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
