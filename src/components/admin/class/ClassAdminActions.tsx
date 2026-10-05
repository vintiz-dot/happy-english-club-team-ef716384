import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Pencil, Archive, Trash2, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";

/**
 * Renaming and removing classes.
 *
 * REMOVAL IS TWO-TIER, AND THAT IS DELIBERATE.
 * Nineteen tables carry `class_id ... ON DELETE CASCADE` — enrollments,
 * homeworks, points, journals, lesson overviews, resources, vocabulary links.
 * A hard DELETE of a class that has been taught does not remove a class, it
 * erases that class's entire history from the school's records. On top of
 * that `sessions.class_id` is ON DELETE RESTRICT, so the attempt would fail
 * anyway — with a raw foreign-key error, after the admin had already decided
 * they wanted it gone.
 *
 * So: a class with any history is ARCHIVED (is_active = false). It disappears
 * from every list in the app, invoices and payroll stay intact, and it can be
 * restored. A class with no sessions and no enrolments — a typo, a duplicate,
 * something created five minutes ago by mistake — can be deleted outright,
 * because there is genuinely nothing to lose.
 */

export interface ClassDependents {
  sessions: number;
  enrollments: number;
  homeworks: number;
  pointsRows: number;
  lessonOverviews: number;
  total: number;
  isEmpty: boolean;
}

const countRows = async (table: string, classId: string) => {
  const { count, error } = await supabase
    .from(table as any)
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);
  if (error) throw error;
  return count ?? 0;
};

/** What would be lost if this class were deleted outright. */
export function useClassDependents(classId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["class-dependents", classId],
    enabled: Boolean(classId) && enabled,
    // Counted fresh every time the dialog opens — an admin must never be shown
    // a cached "0 enrolments" and delete a class someone just filled.
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<ClassDependents> => {
      const id = classId!;
      const [sessions, enrollments, homeworks, pointsRows, lessonOverviews] = await Promise.all([
        countRows("sessions", id),
        countRows("enrollments", id),
        countRows("homeworks", id),
        countRows("student_points", id),
        countRows("lesson_overviews", id),
      ]);
      const total = sessions + enrollments + homeworks + pointsRows + lessonOverviews;
      return {
        sessions,
        enrollments,
        homeworks,
        pointsRows,
        lessonOverviews,
        total,
        // Sessions and enrolments are the gate. The others cannot exist
        // without one of those two, but they are counted so the admin sees
        // the real weight of what they are archiving.
        isEmpty: sessions === 0 && enrollments === 0,
      };
    },
  });
}

/**
 * Class names are how people — and the assistant — refer to a class. Two
 * active classes called the same thing makes every roster, report and
 * "which class?" answer ambiguous, so it is refused up front.
 *
 * Throws with a readable message; returns the trimmed name.
 */
export async function assertClassNameAvailable(classId: string, rawName: string) {
  const trimmed = rawName.trim();
  if (!trimmed) throw new Error("A class needs a name.");

  // Compared in JS rather than with ilike on purpose. The typed name is
  // arbitrary text, and ilike would read `%` and `_` in it as wildcards —
  // PostgREST additionally rewrites `*` to `%` in the query string, which no
  // amount of backslash-escaping on this side can prevent. A school has tens
  // of classes, so fetching the names and comparing them is both cheaper to
  // reason about and impossible to get wrong.
  const { data: active, error } = await supabase
    .from("classes")
    .select("id, name")
    .eq("is_active", true);
  if (error) throw error;

  const target = trimmed.toLocaleLowerCase();
  const clash = (active ?? []).find(
    (c) => c.id !== classId && (c.name ?? "").trim().toLocaleLowerCase() === target,
  );
  if (clash) throw new Error(`Another active class is already called "${clash.name}".`);

  return trimmed;
}

const logClassAction = async (
  action: string,
  classId: string,
  diff: Record<string, unknown>,
) => {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
    entity: "classes",
    action,
    entity_id: classId,
    actor_user_id: user?.id ?? null,
    diff: diff as any,
  });
};

const invalidateClassQueries = (queryClient: ReturnType<typeof useQueryClient>, classId: string) => {
  queryClient.invalidateQueries({ queryKey: ["classes"] });
  queryClient.invalidateQueries({ queryKey: ["archived-classes"] });
  queryClient.invalidateQueries({ queryKey: ["class", classId] });
  queryClient.invalidateQueries({ queryKey: ["class-dependents", classId] });
};

/* ------------------------------------------------------------------ rename */

interface RenameClassDialogProps {
  classId: string;
  currentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenamed?: (newName: string) => void;
}

export function RenameClassDialog({
  classId,
  currentName,
  open,
  onOpenChange,
  onRenamed,
}: RenameClassDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const rename = useMutation({
    mutationFn: async (nextName: string) => {
      if (nextName.trim() === currentName) return currentName;
      const trimmed = await assertClassNameAvailable(classId, nextName);

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("classes")
        .update({ name: trimmed, updated_by: user?.id ?? null })
        .eq("id", classId);
      if (error) throw error;

      await logClassAction("rename", classId, { old_name: currentName, new_name: trimmed });
      return trimmed;
    },
    onSuccess: (nextName) => {
      invalidateClassQueries(queryClient, classId);
      toast.success(`Class renamed to "${nextName}"`);
      onRenamed?.(nextName);
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename class</DialogTitle>
          <DialogDescription>
            The new name appears everywhere at once — schedules, reports, invoices and
            the student app. Nothing else about the class changes.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            rename.mutate(name);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="class-rename-input">Class name</Label>
            <Input
              id="class-rename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Class A1 — Morning"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={rename.isPending || !name.trim()}>
              {rename.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save name
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ delete */

interface DeleteClassDialogProps {
  classId: string;
  /** The class's name (not a CSS class). */
  classLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a hard delete, when the class no longer exists. */
  onDeleted?: () => void;
  /** Called after an archive. */
  onArchived?: () => void;
}

export function DeleteClassDialog({
  classId,
  classLabel,
  open,
  onOpenChange,
  onDeleted,
  onArchived,
}: DeleteClassDialogProps) {
  const queryClient = useQueryClient();
  const { data: deps, isLoading } = useClassDependents(classId, open);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (open) setConfirmText("");
  }, [open]);

  const archive = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("classes")
        .update({ is_active: false, updated_by: user?.id ?? null })
        .eq("id", classId);
      if (error) throw error;
      await logClassAction("archive", classId, { name: classLabel, dependents: deps ?? null });
    },
    onSuccess: () => {
      invalidateClassQueries(queryClient, classId);
      toast.success(`"${classLabel}" archived`, {
        description: "History kept. You can restore it from Archived classes.",
      });
      onArchived?.();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error("Could not archive class: " + error.message),
  });

  const hardDelete = useMutation({
    mutationFn: async () => {
      // Re-check immediately before deleting. The counts on screen may be
      // seconds old, and in those seconds someone could have enrolled a
      // student. Deleting then would cascade that enrolment away silently.
      const [sessions, enrollments] = await Promise.all([
        countRows("sessions", classId),
        countRows("enrollments", classId),
      ]);
      if (sessions > 0 || enrollments > 0) {
        throw new Error(
          "This class is no longer empty — it picked up sessions or enrolments just now. Archive it instead.",
        );
      }

      await logClassAction("delete", classId, { name: classLabel });

      const { error } = await supabase.from("classes").delete().eq("id", classId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateClassQueries(queryClient, classId);
      toast.success(`"${classLabel}" deleted`);
      onDeleted?.();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error("Could not delete class: " + error.message),
  });

  const busy = archive.isPending || hardDelete.isPending;
  const canHardDelete = deps?.isEmpty === true;
  const confirmed = confirmText.trim().toLowerCase() === classLabel.trim().toLowerCase();

  const breakdown = deps
    ? [
        { label: "sessions", n: deps.sessions },
        { label: "enrolments", n: deps.enrollments },
        { label: "homework assignments", n: deps.homeworks },
        { label: "points records", n: deps.pointsRows },
        { label: "lesson overviews", n: deps.lessonOverviews },
      ].filter((r) => r.n > 0)
    : [];

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete "{classLabel}"</DialogTitle>
          <DialogDescription>
            {isLoading
              ? "Checking what this class holds…"
              : canHardDelete
                ? "This class has no sessions and no enrolments, so it can be removed completely."
                : "This class has history, so it is archived rather than erased."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Counting records…
          </div>
        ) : canHardDelete ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                This cannot be undone.
              </p>
              <p className="mt-1 text-muted-foreground">
                Type the class name to confirm. Prefer archiving if you might want it back.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-delete-confirm">
                Type <span className="font-semibold text-foreground">{classLabel}</span>
              </Label>
              <Input
                id="class-delete-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={classLabel}
                autoComplete="off"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Archiving hides the class from every list — schedules, enrolment pickers,
              the student app — while leaving its records untouched, so past invoices and
              payroll stay correct. You can restore it later.
            </p>
            {breakdown.length > 0 && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="mb-1.5 font-medium">This class holds:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {breakdown.map((row) => (
                    <li key={row.label} className="tabular-nums">
                      {row.n.toLocaleString()} {row.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          {canHardDelete ? (
            <>
              <Button variant="secondary" onClick={() => archive.mutate()} disabled={busy}>
                <Archive className="h-4 w-4 mr-1.5" />
                Archive instead
              </Button>
              <Button
                variant="destructive"
                onClick={() => hardDelete.mutate()}
                disabled={busy || !confirmed}
              >
                {hardDelete.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1.5" />
                )}
                Delete permanently
              </Button>
            </>
          ) : (
            <Button variant="destructive" onClick={() => archive.mutate()} disabled={busy || isLoading}>
              {archive.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-1.5" />
              )}
              Archive class
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- restore */

export function useRestoreClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, name }: { classId: string; name: string }) => {
      // An archived "A1" can collide with an "A1" created since. Bringing it
      // back would leave two active classes with the same name.
      await assertClassNameAvailable(classId, name);

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("classes")
        .update({ is_active: true, updated_by: user?.id ?? null })
        .eq("id", classId);
      if (error) throw error;
      await logClassAction("restore", classId, { name });
      return name;
    },
    onSuccess: (name, { classId }) => {
      invalidateClassQueries(queryClient, classId);
      toast.success(`"${name}" restored`);
    },
    onError: (error: Error) =>
      toast.error("Could not restore class", { description: error.message }),
  });
}

/* -------------------------------------------------------- combined trigger */

interface ClassAdminActionsProps {
  classId: string;
  /** The class's name (not a CSS class). */
  classLabel: string;
  size?: "sm" | "default";
  /** Card footers stretch the pair edge to edge; a page header should not. */
  stretch?: boolean;
  onDeleted?: () => void;
  onArchived?: () => void;
  onRenamed?: (newName: string) => void;
}

/** Rename + Delete buttons, for a class card or detail header. */
export function ClassAdminActions({
  classId,
  classLabel,
  size = "sm",
  stretch = true,
  onDeleted,
  onArchived,
  onRenamed,
}: ClassAdminActionsProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // These buttons often sit inside a <Link> card. Without stopping the event
  // the click navigates away and the dialog never appears.
  const guard = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size={size}
          className={stretch ? "flex-1" : undefined}
          onClick={guard(() => setRenameOpen(true))}
        >
          <Pencil className="h-4 w-4 mr-1.5" />
          Rename
        </Button>
        <Button
          variant="outline"
          size={size}
          className={cn(
            "text-destructive hover:text-destructive hover:bg-destructive/10",
            stretch && "flex-1",
          )}
          onClick={guard(() => setDeleteOpen(true))}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Delete
        </Button>
      </div>

      <RenameClassDialog
        classId={classId}
        currentName={classLabel}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onRenamed={onRenamed}
      />
      <DeleteClassDialog
        classId={classId}
        classLabel={classLabel}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
        onArchived={onArchived}
      />
    </>
  );
}

/* --------------------------------------------------------- archived classes */

/**
 * Archived classes were previously a one-way trip: `is_active = false` hid the
 * class from every query in the app and nothing anywhere could bring it back.
 */
export function ArchivedClassesSection() {
  const restore = useRestoreClass();
  const [expanded, setExpanded] = useState(false);

  const { data: archived, isLoading } = useQuery({
    queryKey: ["archived-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, updated_at")
        .eq("is_active", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !archived || archived.length === 0) return null;

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Archive className="h-4 w-4 text-muted-foreground" />
          Archived classes
          <span className="text-muted-foreground tabular-nums">({archived.length})</span>
        </span>
        <span className="text-xs text-muted-foreground">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded && (
        <ul className="mt-3 space-y-2">
          {archived.map((cls) => (
            <li
              key={cls.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
            >
              <span className="truncate text-sm">{cls.name}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={restore.isPending}
                onClick={() => restore.mutate({ classId: cls.id, name: cls.name })}
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Restore
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
