/**
 * Activity — who changed what, and what it was before.
 *
 * Reads the audit trail the database now writes for itself (see migration
 * 20261009130000). The point of the screen is the question a shared
 * account could never answer: given a change you disagree with, which
 * person made it, when, and what did the row look like beforehand.
 *
 * So the row is built around the actor and the diff, not the table name.
 * Expanding an entry shows every field that moved, old value beside new.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  History,
  Plus,
  Pencil,
  Trash2,
  Search,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditRow {
  id: string;
  entity: string;
  entity_id: string | null;
  action: string;
  operation: "INSERT" | "UPDATE" | "DELETE" | null;
  changed_fields: string[] | null;
  diff: { old?: Record<string, unknown>; new?: Record<string, unknown> } | null;
  actor_user_id: string | null;
  client_ip: string | null;
  user_agent: string | null;
  occurred_at: string;
}

interface Response {
  logs: AuditRow[];
  actors: Record<string, { name: string; email: string | null }>;
  entities: string[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE = 50;

const OPERATION = {
  INSERT: { label: "Created", icon: Plus, tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  UPDATE: { label: "Changed", icon: Pencil, tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  DELETE: { label: "Deleted", icon: Trash2, tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
} as const;

/** Values in a diff are arbitrary JSON; render them without exploding. */
function show(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return value.toLocaleString("vi-VN");
  if (typeof value === "string") return value === "" ? "(empty)" : value;
  return JSON.stringify(value);
}

function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Entry({
  row,
  actorName,
}: {
  row: AuditRow;
  actorName: string;
}) {
  const [open, setOpen] = useState(false);
  const op = row.operation ? OPERATION[row.operation] : null;
  const Icon = op?.icon ?? History;

  // A trigger row describes itself through operation + changed_fields; a
  // hand-written one (an edge function, an older screen) carries a verb.
  const headline = op
    ? `${op.label} ${row.entity.replace(/_/g, " ")}`
    : row.action.replace(/_/g, " ");

  const fields = row.changed_fields ?? [];
  const canExpand = !!row.diff && (fields.length > 0 || !!row.diff.old || !!row.diff.new);

  return (
    <li className="border-b border-border/60 last:border-0">
      <button
        type="button"
        onClick={() => canExpand && setOpen((v) => !v)}
        aria-expanded={canExpand ? open : undefined}
        className={cn(
          "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors",
          canExpand && "hover:bg-muted/50",
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
            op?.tone ?? "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold capitalize">{headline}</span>
            {fields.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {fields.slice(0, 4).join(", ")}
                {fields.length > 4 ? ` +${fields.length - 4} more` : ""}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{actorName}</span>
            <span>·</span>
            <time dateTime={row.occurred_at} title={dayjs(row.occurred_at).format("D MMM YYYY, HH:mm:ss")}>
              {dayjs(row.occurred_at).format("D MMM, HH:mm")}
            </time>
            {row.entity_id && (
              <>
                <span>·</span>
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                  {row.entity_id.slice(0, 8)}
                </code>
              </>
            )}
          </span>
        </span>

        {canExpand &&
          (open ? (
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ))}
      </button>

      {open && row.diff && (
        <div className="px-3 pb-3 pl-14">
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold">Field</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Before</th>
                  <th className="px-2 py-1.5 text-left font-semibold">After</th>
                </tr>
              </thead>
              <tbody>
                {(fields.length > 0
                  ? fields
                  : [...new Set([
                      ...Object.keys(row.diff.old ?? {}),
                      ...Object.keys(row.diff.new ?? {}),
                    ])]
                ).map((field) => (
                  <tr key={field} className="border-t">
                    <td className="px-2 py-1.5 font-medium">{field.replace(/_/g, " ")}</td>
                    <td className="max-w-[18rem] truncate px-2 py-1.5 text-muted-foreground">
                      {show(row.diff?.old?.[field])}
                    </td>
                    <td className="max-w-[18rem] truncate px-2 py-1.5">
                      {show(row.diff?.new?.[field])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(row.client_ip || row.user_agent) && (
            <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
              {row.client_ip ?? "unknown IP"}
              {row.user_agent ? ` · ${row.user_agent}` : ""}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default function ActivityTab() {
  const [search, setSearch] = useState("");
  const [actorId, setActorId] = useState("all");
  const [entity, setEntity] = useState("all");
  const [operation, setOperation] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error } = useQuery<Response>({
    queryKey: ["admin-activity", search, actorId, entity, operation, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(PAGE),
        offset: String(page * PAGE),
      });
      if (search) params.set("q", search);
      if (actorId !== "all") params.set("actorId", actorId);
      if (entity !== "all") params.set("entity", entity);
      if (operation !== "all") params.set("operation", operation);

      const { data: result, error: fnError } = await supabase.functions.invoke(
        "admin-activity-logs",
        { body: Object.fromEntries(params) },
      );
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      return result as Response;
    },
  });

  // Keep every actor seen so far in the dropdown, so filtering to one
  // person does not collapse the list to only that person.
  const [knownActors, setKnownActors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!data?.actors) return;
    setKnownActors((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [id, a] of Object.entries(data.actors)) {
        if (next[id] !== a.name) {
          next[id] = a.name;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [data?.actors]);

  const resetTo = (fn: () => void) => {
    fn();
    setPage(0);
  };

  const total = data?.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / PAGE) - 1);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" aria-hidden />
            Activity
          </CardTitle>
          <CardDescription>
            Every change to money, records and access — who made it, when, and what it
            was before. Written by the database itself, so nothing can be done without
            leaving an entry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => resetTo(() => setSearch(e.target.value))}
                placeholder="Search action or record id"
                className="pl-8"
                aria-label="Search the activity log"
              />
            </div>

            <Select value={actorId} onValueChange={(v) => resetTo(() => setActorId(v))}>
              <SelectTrigger aria-label="Filter by person">
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anyone</SelectItem>
                <SelectItem value="system">System / edge functions</SelectItem>
                {Object.entries(knownActors).map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entity} onValueChange={(v) => resetTo(() => setEntity(v))}>
              <SelectTrigger aria-label="Filter by record type">
                <SelectValue placeholder="Anything" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anything</SelectItem>
                {(data?.entities ?? []).map((e) => (
                  <SelectItem key={e} value={e}>
                    {e.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={operation} onValueChange={(v) => resetTo(() => setOperation(v))}>
              <SelectTrigger aria-label="Filter by kind of change">
                <SelectValue placeholder="Any change" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any change</SelectItem>
                <SelectItem value="INSERT">Created</SelectItem>
                <SelectItem value="UPDATE">Changed</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
              <span>{(error as Error)?.message ?? "Could not load the activity log."}</span>
            </div>
          )}

          <div className="rounded-xl border">
            {isLoading ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Loading activity…</p>
            ) : (data?.logs.length ?? 0) === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Nothing matches those filters.
              </p>
            ) : (
              <ul>
                {data!.logs.map((row) => (
                  <Entry
                    key={row.id}
                    row={row}
                    actorName={
                      row.actor_user_id
                        ? data!.actors[row.actor_user_id]?.name ?? "Unknown admin"
                        : "System"
                    }
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {total > 0
                ? `${page * PAGE + 1}–${Math.min((page + 1) * PAGE, total)} of ${total.toLocaleString()}`
                : "No entries"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
