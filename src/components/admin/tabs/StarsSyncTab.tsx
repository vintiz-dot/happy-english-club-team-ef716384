/**
 * Stars sync — the admin's control panel for mirroring another app's
 * registers, points and homework into HEC.
 *
 * WHAT THIS PAGE CAN AND CANNOT DO TODAY. Everything here is
 * configuration: which Stars class is which HEC class, who the sync acts
 * as, which children are matched, and the switch that stops it. The
 * engine that reads the Stars feed and applies events does not exist
 * yet - the Stars app's export endpoint has not been built. So the
 * activity panels below are honest about being empty rather than
 * pretending.
 *
 * That order is deliberate and not a half-measure: mapping is the slow
 * part, it needs a person who knows the children, and it can be finished
 * long before the feed exists. The day the endpoint lands, this is
 * already done.
 *
 * WHY READINESS IS THE LOUDEST THING ON THE PAGE. The sync acts as a
 * real teacher and inherits exactly their permissions, so "will this
 * work" is a question about that person. Two different row policies
 * decide it and they fail in opposite directions, quietly:
 *
 *   registers  need the teacher to be on the SESSION rows
 *   points,    need them on the class ROSTER - as default teacher, or a
 *   homework,  weekly slot. A cover teacher works for 45 days after
 *   grades     their last lesson and then stops, mid-term.
 *
 * A half-ready class looks fine for weeks. So the readiness column says
 * which half works, in words, before anything is switched on.
 *
 * See docs/STARS_SYNC_SPEC.md and docs/STARS_SYNC_SETUP.md.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHero } from "@/components/quest/PageHero";
import { SectionHeader } from "@/components/quest/SectionHeader";
import { toast } from "sonner";
import { dayjs } from "@/lib/date";
import {
  AlertTriangle, CheckCircle2, Link2, Loader2, PauseCircle,
  Plug, Trash2, Users,
} from "lucide-react";

/** The sentinel a Select uses for "no teacher of its own". Radix Select
 *  refuses an empty string as an item value. */
const USE_DEFAULT = "__default__";

type ReadinessStatus = "ready" | "partial" | "paused" | "blocked";

interface Readiness {
  stars_class_id: string;
  class_id: string;
  class_name: string;
  teacher_id: string | null;
  teacher_name: string | null;
  teacher_is_default: boolean;
  teacher_is_active: boolean;
  teacher_has_login: boolean;
  sessions_total: number;
  sessions_with_teacher: number;
  map_enabled: boolean;
  can_sync_points: boolean;
  can_sync_attendance: boolean;
  status: ReadinessStatus;
  detail: string;
}

const STATUS_STYLE: Record<ReadinessStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ready: { label: "Ready", variant: "default" },
  partial: { label: "Half working", variant: "outline" },
  paused: { label: "Paused", variant: "secondary" },
  blocked: { label: "Blocked", variant: "destructive" },
};

function StatusBadge({ status }: { status: ReadinessStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.blocked;
  return (
    <Badge variant={s.variant} className="whitespace-nowrap">
      {status === "ready" && <CheckCircle2 className="mr-1 h-3 w-3" />}
      {status === "partial" && <AlertTriangle className="mr-1 h-3 w-3" />}
      {status === "paused" && <PauseCircle className="mr-1 h-3 w-3" />}
      {status === "blocked" && <AlertTriangle className="mr-1 h-3 w-3" />}
      {s.label}
    </Badge>
  );
}

export default function StarsSyncTab() {
  const queryClient = useQueryClient();

  // Everything this page writes invalidates most of what it reads, so
  // the keys are refreshed together rather than one at a time.
  const refresh = () => {
    for (const k of ["stars-connection", "stars-class-map", "stars-student-map",
                     "stars-readiness", "stars-events", "stars-conflicts"]) {
      queryClient.invalidateQueries({ queryKey: [k] });
    }
  };

  const fail = (e: unknown, fallback: string) =>
    toast.error(e instanceof Error ? e.message : fallback);

  /* ------------------------------------------------------ the data */

  const connection = useQuery({
    queryKey: ["stars-connection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stars_sync_connection")
        .select("id, enabled, default_teacher_id, endpoint_label, updated_at")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const teachers = useQuery({
    queryKey: ["stars-teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, is_active, user_id")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const classes = useQuery({
    queryKey: ["stars-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, default_teacher_id, is_active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const students = useQuery({
    queryKey: ["stars-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const classMap = useQuery({
    queryKey: ["stars-class-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stars_class_map")
        .select("stars_class_id, class_id, teacher_id, enabled, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const studentMap = useQuery({
    queryKey: ["stars-student-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stars_student_map")
        .select("stars_student_id, student_id, created_at")
        .order("stars_student_id");
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

  const events = useQuery({
    queryKey: ["stars-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stars_sync_events")
        .select("event_id, seq, kind, outcome, outcome_note, received_at")
        .order("received_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const conflicts = useQuery({
    queryKey: ["stars-conflicts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stars_sync_conflicts")
        .select("id, event_id, ours, theirs, detected_at")
        .is("resolved_at", null)
        .order("detected_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  /* --------------------------------------------------- the writing */

  const saveConnection = useMutation({
    mutationFn: async (patch: { enabled?: boolean; default_teacher_id?: string | null }) => {
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
          ? "Connection on — the next run will read the Stars feed"
          : "Connection off — nothing will be read or written");
      } else {
        toast.success("Saved");
      }
      refresh();
    },
    onError: (e) => fail(e, "Could not change the connection"),
  });

  const addClass = useMutation({
    mutationFn: async (v: { starsId: string; classId: string; teacherId: string | null }) => {
      const { error } = await supabase.from("stars_class_map").insert({
        stars_class_id: v.starsId.trim(),
        class_id: v.classId,
        teacher_id: v.teacherId,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class mapped"); refresh(); },
    onError: (e) => fail(e, "Could not map that class"),
  });

  const updateClass = useMutation({
    mutationFn: async (v: { starsId: string; patch: { teacher_id?: string | null; enabled?: boolean } }) => {
      const { error } = await supabase
        .from("stars_class_map").update(v.patch).eq("stars_class_id", v.starsId);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); },
    onError: (e) => fail(e, "Could not update that class"),
  });

  const removeClass = useMutation({
    mutationFn: async (starsId: string) => {
      const { error } = await supabase
        .from("stars_class_map").delete().eq("stars_class_id", starsId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class unmapped"); refresh(); },
    onError: (e) => fail(e, "Could not unmap that class"),
  });

  const addStudent = useMutation({
    mutationFn: async (v: { starsId: string; studentId: string }) => {
      const { error } = await supabase.from("stars_student_map").insert({
        stars_student_id: v.starsId.trim(),
        student_id: v.studentId,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Student matched"); refresh(); },
    onError: (e) => fail(e, "Could not match that student"),
  });

  const removeStudent = useMutation({
    mutationFn: async (starsId: string) => {
      const { error } = await supabase
        .from("stars_student_map").delete().eq("stars_student_id", starsId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Student unmatched"); refresh(); },
    onError: (e) => fail(e, "Could not unmatch that student"),
  });

  /* ------------------------------------------------------- the form */

  const [newClassStarsId, setNewClassStarsId] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [newClassTeacher, setNewClassTeacher] = useState(USE_DEFAULT);
  const [newStudentStarsId, setNewStudentStarsId] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [confirmUnmapClass, setConfirmUnmapClass] = useState<Readiness | null>(null);
  const [confirmUnmapStudent, setConfirmUnmapStudent] = useState<string | null>(null);

  const mappedClassIds = useMemo(
    () => new Set((classMap.data ?? []).map((m) => m.class_id)),
    [classMap.data],
  );
  const mappedStudentIds = useMemo(
    () => new Set((studentMap.data ?? []).map((m) => m.student_id)),
    [studentMap.data],
  );
  const usedStarsClassIds = useMemo(
    () => new Set((classMap.data ?? []).map((m) => m.stars_class_id)),
    [classMap.data],
  );
  const usedStarsStudentIds = useMemo(
    () => new Set((studentMap.data ?? []).map((m) => m.stars_student_id)),
    [studentMap.data],
  );

  const teacherName = (id: string | null | undefined) =>
    (teachers.data ?? []).find((t) => t.id === id)?.full_name ?? "—";
  const studentName = (id: string) =>
    (students.data ?? []).find((s) => s.id === id)?.full_name ?? "Unknown student";

  // A teacher the sync could actually act as. Someone with no login
  // cannot be impersonated at all, and an archived one is refused by the
  // readiness check - both are offered but labelled, because hiding them
  // turns "why isn't she in the list" into a support question.
  const selectableTeachers = teachers.data ?? [];

  const connectionOn = connection.data?.enabled === true;
  const rows = readiness.data ?? [];
  const blocked = rows.filter((r) => r.status === "blocked").length;
  const partial = rows.filter((r) => r.status === "partial").length;

  const canAddClass =
    newClassStarsId.trim().length > 0 &&
    !usedStarsClassIds.has(newClassStarsId.trim()) &&
    newClassId.length > 0 &&
    !addClass.isPending;

  const canAddStudent =
    newStudentStarsId.trim().length > 0 &&
    !usedStarsStudentIds.has(newStudentStarsId.trim()) &&
    newStudentId.length > 0 &&
    !addStudent.isPending;

  const loading = connection.isLoading || classMap.isLoading || readiness.isLoading;
  const loadError = connection.error || classMap.error || readiness.error
    || studentMap.error || teachers.error || classes.error;

  if (loadError) {
    return (
      <Card className="border-destructive/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Stars sync could not be loaded
          </CardTitle>
          <CardDescription>
            {loadError instanceof Error ? loadError.message : "Something went wrong."}
            {" "}If this says a table is missing from the schema cache, the migration
            (20261023100000) has not been applied yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Integrations"
        title="Stars sync"
        subtitle="Mirror registers, points and homework from the Stars app into HEC."
        variant="glacier"
      />

      {/* The engine does not exist yet. Say so once, at the top, rather
          than leaving an admin to wonder why nothing ever arrives. */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4 text-amber-600" />
            Not connected yet
          </CardTitle>
          <CardDescription>
            The Stars app's export endpoint has not been built, so nothing is being
            read and the activity below will stay empty. Everything on this page is
            set-up you can finish now — matching children is the slow part, and it
            keeps. See <span className="font-medium">docs/STARS_SYNC_SETUP.md</span>.
          </CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* ------------------------------------------- connection */}
          <SectionHeader title="Connection" subtitle="The master switch, and who the sync acts as." />
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="stars-enabled" className="text-sm font-medium">
                    {connectionOn ? "On" : "Off"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {connectionOn
                      ? "Each run reads whatever is new and applies it. Turning this off stops everything immediately; nothing is lost, because the feed is a cursor."
                      : "Nothing is read and nothing is written. Turn this on only after you have checked one class and one child by eye."}
                  </p>
                </div>
                <Switch
                  id="stars-enabled"
                  checked={connectionOn}
                  disabled={saveConnection.isPending}
                  onCheckedChange={(enabled) => saveConnection.mutate({ enabled })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stars-default-teacher" className="text-sm">Default teacher</Label>
                <Select
                  value={connection.data?.default_teacher_id ?? USE_DEFAULT}
                  onValueChange={(v) =>
                    saveConnection.mutate({ default_teacher_id: v === USE_DEFAULT ? null : v })}
                >
                  <SelectTrigger id="stars-default-teacher" className="w-full sm:w-[320px]">
                    <SelectValue placeholder="Choose a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={USE_DEFAULT}>None</SelectItem>
                    {selectableTeachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                        {t.is_active === false ? " (archived)" : ""}
                        {!t.user_id ? " — no login" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used by any class below that does not name its own. The sync can do
                  exactly what this person can do in HEC and nothing more — it cannot
                  reach money, families, staff or any class you have not mapped.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ---------------------------------------------- classes */}
          <SectionHeader
            title="Classes"
            subtitle="Any Stars class to any HEC class, each with its own teacher if you want."
          />

          {(blocked > 0 || partial > 0) && (
            <Card className="border-warning/60 bg-warning/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {blocked > 0 && `${blocked} class${blocked === 1 ? "" : "es"} blocked`}
                  {blocked > 0 && partial > 0 && " · "}
                  {partial > 0 && `${partial} only half working`}
                </CardTitle>
                <CardDescription>
                  A half-working class syncs some of its records and not others, and
                  looks healthy until a term's marks are missing. Fix these before
                  turning the connection on.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No classes mapped yet. Add the first one below.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stars class</TableHead>
                        <TableHead>HEC class</TableHead>
                        <TableHead>Acts as</TableHead>
                        <TableHead className="text-center">On</TableHead>
                        <TableHead>Will it work?</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.stars_class_id}>
                          <TableCell className="font-mono text-xs">{r.stars_class_id}</TableCell>
                          <TableCell className="font-medium">{r.class_name}</TableCell>
                          <TableCell>
                            <Select
                              value={
                                (classMap.data ?? []).find(
                                  (m) => m.stars_class_id === r.stars_class_id,
                                )?.teacher_id ?? USE_DEFAULT
                              }
                              onValueChange={(v) =>
                                updateClass.mutate({
                                  starsId: r.stars_class_id,
                                  patch: { teacher_id: v === USE_DEFAULT ? null : v },
                                })}
                            >
                              <SelectTrigger className="h-8 w-[190px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={USE_DEFAULT}>
                                  Default ({teacherName(connection.data?.default_teacher_id)})
                                </SelectItem>
                                {selectableTeachers.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.full_name}
                                    {t.is_active === false ? " (archived)" : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              aria-label={`Sync ${r.class_name}`}
                              checked={r.map_enabled}
                              disabled={updateClass.isPending}
                              onCheckedChange={(enabled) =>
                                updateClass.mutate({
                                  starsId: r.stars_class_id,
                                  patch: { enabled },
                                })}
                            />
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="flex flex-col gap-1">
                              <StatusBadge status={r.status} />
                              <span className="text-xs text-muted-foreground">{r.detail}</span>
                              {r.status !== "blocked" && (
                                <span className="text-[11px] text-muted-foreground">
                                  Registers {r.can_sync_attendance ? "✓" : "✗"} ·
                                  {" "}Points, homework &amp; grades {r.can_sync_points ? "✓" : "✗"}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Unmap ${r.class_name}`}
                              onClick={() => setConfirmUnmapClass(r)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor="new-stars-class" className="text-xs">Stars class id</Label>
                  <Input
                    id="new-stars-class"
                    value={newClassStarsId}
                    placeholder="as the Stars app calls it"
                    onChange={(e) => setNewClassStarsId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-hec-class" className="text-xs">HEC class</Label>
                  <Select value={newClassId} onValueChange={setNewClassId}>
                    <SelectTrigger id="new-hec-class"><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>
                      {(classes.data ?? [])
                        .filter((c) => !mappedClassIds.has(c.id))
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}{c.is_active === false ? " (archived)" : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-class-teacher" className="text-xs">Acts as</Label>
                  <Select value={newClassTeacher} onValueChange={setNewClassTeacher}>
                    <SelectTrigger id="new-class-teacher"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={USE_DEFAULT}>
                        Default ({teacherName(connection.data?.default_teacher_id)})
                      </SelectItem>
                      {selectableTeachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full sm:w-auto"
                    disabled={!canAddClass}
                    onClick={() => {
                      addClass.mutate(
                        {
                          starsId: newClassStarsId,
                          classId: newClassId,
                          teacherId: newClassTeacher === USE_DEFAULT ? null : newClassTeacher,
                        },
                        {
                          onSuccess: () => {
                            setNewClassStarsId("");
                            setNewClassId("");
                            setNewClassTeacher(USE_DEFAULT);
                          },
                        },
                      );
                    }}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Map
                  </Button>
                </div>
              </div>
              {newClassStarsId.trim().length > 0 && usedStarsClassIds.has(newClassStarsId.trim()) && (
                <p className="mt-2 text-xs text-destructive">
                  That Stars class is already mapped.
                </p>
              )}
            </CardContent>
          </Card>

          {/* --------------------------------------------- students */}
          <SectionHeader
            title="Children"
            subtitle="Nothing syncs for a child who is not matched here. That is deliberate."
          />
          <Card>
            <CardContent className="pt-6">
              {(studentMap.data ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No children matched yet. A Stars record for an unmatched child is
                  skipped and listed, never guessed at.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stars id</TableHead>
                        <TableHead>Child in HEC</TableHead>
                        <TableHead>Matched</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(studentMap.data ?? []).map((m) => (
                        <TableRow key={m.stars_student_id}>
                          <TableCell className="font-mono text-xs">{m.stars_student_id}</TableCell>
                          <TableCell className="font-medium">{studentName(m.student_id)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {m.created_at ? dayjs(m.created_at).format("D MMM YYYY") : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Unmatch ${studentName(m.student_id)}`}
                              onClick={() => setConfirmUnmapStudent(m.stars_student_id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor="new-stars-student" className="text-xs">Stars student id</Label>
                  <Input
                    id="new-stars-student"
                    value={newStudentStarsId}
                    placeholder="as the Stars app calls them"
                    onChange={(e) => setNewStudentStarsId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-hec-student" className="text-xs">Child in HEC</Label>
                  <Select value={newStudentId} onValueChange={setNewStudentId}>
                    <SelectTrigger id="new-hec-student"><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(students.data ?? [])
                        .filter((s) => !mappedStudentIds.has(s.id))
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full sm:w-auto"
                    disabled={!canAddStudent}
                    onClick={() => {
                      addStudent.mutate(
                        { starsId: newStudentStarsId, studentId: newStudentId },
                        {
                          onSuccess: () => {
                            setNewStudentStarsId("");
                            setNewStudentId("");
                          },
                        },
                      );
                    }}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Match
                  </Button>
                </div>
              </div>
              {newStudentStarsId.trim().length > 0 && usedStarsStudentIds.has(newStudentStarsId.trim()) && (
                <p className="mt-2 text-xs text-destructive">
                  That Stars id is already matched to a child.
                </p>
              )}
            </CardContent>
          </Card>

          {/* --------------------------------------------- activity */}
          <SectionHeader title="Activity" subtitle="What arrived, and what became of it." />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent events</CardTitle>
                <CardDescription>
                  Every record the Stars app sends, and whether it was applied,
                  skipped or refused.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(events.data ?? []).length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    Nothing yet — the feed has never been read.
                  </p>
                ) : (
                  <div className="max-h-80 space-y-1 overflow-y-auto">
                    {(events.data ?? []).map((e) => (
                      <div key={e.event_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-1.5 text-xs">
                        <span className="font-medium">{e.kind}</span>
                        <Badge variant={e.outcome === "applied" ? "default" : "secondary"}>
                          {e.outcome}
                        </Badge>
                        <span className="text-muted-foreground">
                          {dayjs(e.received_at).format("D MMM HH:mm")}
                        </span>
                        {e.outcome_note && (
                          <span className="w-full text-muted-foreground">{e.outcome_note}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Conflicts</CardTitle>
                <CardDescription>
                  Both apps hold a different answer. HEC keeps what it has — a
                  teacher's correction is never undone by the sync.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(conflicts.data ?? []).length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    None. Nothing has been read yet.
                  </p>
                ) : (
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {(conflicts.data ?? []).map((c) => (
                      <div key={c.id} className="rounded-md border p-2 text-xs">
                        <div className="text-muted-foreground">
                          {dayjs(c.detected_at).format("D MMM HH:mm")}
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          <div><span className="font-medium">Ours:</span> {JSON.stringify(c.ours)}</div>
                          <div><span className="font-medium">Theirs:</span> {JSON.stringify(c.theirs)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ------------------------------------------- confirmations */}
      <AlertDialog
        open={confirmUnmapClass !== null}
        onOpenChange={(open) => !open && setConfirmUnmapClass(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Unmap {confirmUnmapClass?.class_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Records already in HEC stay exactly as they are — this only stops
              future Stars records for this class from arriving. To pause it
              temporarily, use the On switch instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmUnmapClass) removeClass.mutate(confirmUnmapClass.stars_class_id);
                setConfirmUnmapClass(null);
              }}
            >
              Unmap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmUnmapStudent !== null}
        onOpenChange={(open) => !open && setConfirmUnmapStudent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unmatch this child?</AlertDialogTitle>
            <AlertDialogDescription>
              Their records in HEC stay as they are. New Stars records for them will
              be skipped and listed as unmatched until you match them again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmUnmapStudent) removeStudent.mutate(confirmUnmapStudent);
                setConfirmUnmapStudent(null);
              }}
            >
              Unmatch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
