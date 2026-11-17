/**
 * Admin > Overview > Points and leaderboards.
 *
 *  - Whole centre: every child's points across their classes, from
 *    leaderboard_centre (admin only; a teacher's scope is their classes).
 *  - Terms: the dates the Term boards use (school_terms).
 *  - Points audit: every award a person made, every award removed, and
 *    homework that was graded but paid no points (points_manual_changes).
 *
 * All three read the server (20261117120000). Nothing here ranks or sums.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PeriodPicker } from "@/components/leaderboard/PeriodPicker";
import { BOARD_CATEGORIES } from "@/components/leaderboard/types";
import { BOARD_KEY_OF, isMissingFunction, periodKey, type PeriodChoice, type ServerCategory } from "@/lib/leaderboard/board";
import { toast } from "sonner";

const labelOf = (c: ServerCategory) => BOARD_CATEGORIES.find((b) => b.key === BOARD_KEY_OF[c])?.label ?? c;
const NOT_PASTED = "The leaderboard migration (20261117120000) is not in the database yet.";

async function periodDates(p: PeriodChoice) {
  const { data, error } = await supabase.rpc("leaderboard_period" as never, { p_kind: p.kind, p_anchor: p.anchor } as never);
  if (error) throw error;
  const raw = data as unknown as Array<{ from_date: string; to_date: string; label: string }> | null;
  const row = Array.isArray(raw) ? raw[0] : null;
  if (!row) throw new Error("No such period");
  return row;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-hec-small text-hec-ink-soft">{children}</p>;
}

function errorText(e: unknown) {
  return isMissingFunction(e as { code?: string; message?: string }) ? NOT_PASTED : "This could not be loaded right now.";
}

/* -------------------------------------------------------- whole centre */

function CentreBoard() {
  const [period, setPeriod] = useState<PeriodChoice>({ kind: "month", anchor: null });
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard-centre", periodKey(period)],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("leaderboard_centre" as never, { p_period: period.kind, p_anchor: period.anchor } as never);
      if (error) throw error;
      return data as unknown as {
        period: { label: string; basis: string };
        rows: Array<{ student_id: string; name: string; class_names: string | null; total: number; per_lesson: number; lessons: number; rank: number }>;
      };
    },
  });
  const perLesson = data?.period?.basis === "per_lesson";
  return (
    <div className="space-y-3">
      <PeriodPicker value={period} onChange={setPeriod} />
      {isLoading ? <Note>Loading…</Note> : error ? <Note>{errorText(error)}</Note> : (
        <>
          <p className="text-hec-small text-hec-ink-soft">
            {data!.period.label}{perLesson ? " · ranked on points per lesson" : ""} · {data!.rows.length} children
          </p>
          <ol className="divide-y divide-hec-line rounded-hec-md border border-hec-line">
            {data!.rows.slice(0, 100).map((r) => (
              <li key={r.student_id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-hec-ink">{r.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-normal break-words text-hec-small text-hec-ink">{r.name}</p>
                  {r.class_names && <p className="text-hec-caption text-hec-ink-soft">{r.class_names}</p>}
                </div>
                <span className="shrink-0 text-right text-hec-small tabular-nums text-hec-ink">
                  {perLesson ? `${Number(r.per_lesson)} / lesson` : r.total}
                  {perLesson && <span className="block text-hec-caption text-hec-ink-soft">{r.total} in {r.lessons}</span>}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- terms */

function Terms() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: terms = [], error } = useQuery({
    queryKey: ["school-terms-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_terms" as never).select("id, name, starts_on, ends_on").order("starts_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ id: string; name: string; starts_on: string; ends_on: string }>;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["school-terms-admin"] });
    qc.invalidateQueries({ queryKey: ["school-terms"] });
  };
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("school_terms" as never).insert({ name: name.trim(), starts_on: from, ends_on: to } as never);
      if (error) throw error;
    },
    onSuccess: () => { setName(""); setFrom(""); setTo(""); refresh(); toast.success("Term saved"); },
    onError: (e: { message?: string }) => toast.error("Could not save the term", { description: e.message }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("school_terms" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Term removed"); },
    onError: (e: { message?: string }) => toast.error("Could not remove the term", { description: e.message }),
  });
  if (error) return <Note>{(error as { code?: string }).code === "42P01" || /school_terms/.test(String((error as { message?: string }).message)) ? NOT_PASTED : "This could not be loaded right now."}</Note>;
  return (
    <div className="space-y-4">
      <p className="text-hec-small text-hec-ink-soft">
        The Term choice on every board uses these dates. Terms cannot overlap. Term boards rank on points per lesson, so a child who joins part-way is not last for the rest of the term.
      </p>
      <form
        className="grid gap-3 sm:grid-cols-[1fr,auto,auto,auto] sm:items-end"
        onSubmit={(e) => { e.preventDefault(); if (name.trim() && from && to) add.mutate(); }}
      >
        <div className="space-y-1">
          <Label htmlFor="term-name">Name</Label>
          <Input id="term-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Autumn term 2026" maxLength={60} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="term-from">Starts</Label>
          <Input id="term-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="term-to">Ends</Label>
          <Input id="term-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="submit" disabled={!name.trim() || !from || !to || add.isPending}>Add term</Button>
      </form>
      {terms.length === 0 ? <Note>No terms yet.</Note> : (
        <ul className="divide-y divide-hec-line rounded-hec-md border border-hec-line">
          {terms.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 text-hec-small font-medium text-hec-ink">{t.name}</span>
              <span className="text-hec-caption tabular-nums text-hec-ink-soft">{t.starts_on} to {t.ends_on}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { if (window.confirm(`Remove ${t.name}? Its boards will no longer be offered.`)) remove.mutate(t.id); }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- audit */

interface Audit {
  made: Array<{ id: string; created_at: string; date: string; by: string; student: string; class: string; category: ServerCategory; points: number; note: string | null }>;
  removed: Array<{ at: string; what: string; by: string; student: string | null; class: string | null; points: number | null; note: string | null }>;
  graded_without_points: Array<{ homework: string; class: string; student: string; grade: string; graded_at: string | null; due_date: string | null }>;
}

function AuditList() {
  const [period, setPeriod] = useState<PeriodChoice>({ kind: "month", anchor: null });
  const { data, isLoading, error } = useQuery({
    queryKey: ["points-audit", periodKey(period)],
    queryFn: async () => {
      const p = await periodDates(period);
      const { data, error } = await supabase.rpc("points_manual_changes" as never, { p_from: p.from_date, p_to: p.to_date } as never);
      if (error) throw error;
      return { label: p.label, audit: data as unknown as Audit };
    },
  });
  return (
    <div className="space-y-4">
      <PeriodPicker value={period} onChange={setPeriod} />
      {isLoading ? <Note>Loading…</Note> : error ? <Note>{errorText(error)}</Note> : (
        <>
          <section className="space-y-2">
            <h4 className="text-hec-h3 text-hec-ink">Graded homework with no points ({data!.audit.graded_without_points.length})</h4>
            <p className="text-hec-caption text-hec-ink-soft">Every time, not only {data!.label}. A teacher can add the points from the homework's grading screen.</p>
            {data!.audit.graded_without_points.length === 0 ? <Note>None.</Note> : (
              <ul className="divide-y divide-hec-line rounded-hec-md border border-hec-line">
                {data!.audit.graded_without_points.slice(0, 200).map((g, i) => (
                  <li key={i} className="px-3 py-2 text-hec-small">
                    <span className="text-hec-ink">{g.student}</span>
                    <span className="text-hec-ink-soft"> · {g.homework} · {g.class} · grade {g.grade}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="space-y-2">
            <h4 className="text-hec-h3 text-hec-ink">Awards made by staff ({data!.audit.made.length})</h4>
            {data!.audit.made.length === 0 ? <Note>None in {data!.label}.</Note> : (
              <ul className="divide-y divide-hec-line rounded-hec-md border border-hec-line">
                {data!.audit.made.slice(0, 500).map((m) => (
                  <li key={m.id} className="flex items-start gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-normal break-words text-hec-small text-hec-ink">{m.student} · {m.class}</p>
                      <p className="text-hec-caption text-hec-ink-soft">
                        {m.date} · {labelOf(m.category)} · by {m.by}{m.note ? ` · ${m.note}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 text-hec-small font-semibold tabular-nums ${m.points < 0 ? "text-hec-warn" : "text-hec-ink"}`}>
                      {m.points > 0 ? `+${m.points}` : m.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="space-y-2">
            <h4 className="text-hec-h3 text-hec-ink">Awards removed or changed ({data!.audit.removed.length})</h4>
            {data!.audit.removed.length === 0 ? <Note>None in {data!.label}.</Note> : (
              <ul className="divide-y divide-hec-line rounded-hec-md border border-hec-line">
                {data!.audit.removed.slice(0, 300).map((r, i) => (
                  <li key={i} className="px-3 py-2 text-hec-small">
                    <span className="text-hec-ink">{r.student ?? "A student"}{r.class ? ` · ${r.class}` : ""}</span>
                    <span className="text-hec-ink-soft">
                      {" "}· {r.what === "DELETE" ? "removed" : "changed"} {r.points ?? "?"} points · by {r.by} · {r.at.slice(0, 10)}{r.note ? ` · ${r.note}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function PointsCentre() {
  return (
    <Tabs defaultValue="centre" className="w-full">
      <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="centre">Whole centre</TabsTrigger>
        <TabsTrigger value="audit">Points audit</TabsTrigger>
        <TabsTrigger value="terms">Terms</TabsTrigger>
      </TabsList>
      <TabsContent value="centre"><CentreBoard /></TabsContent>
      <TabsContent value="audit"><AuditList /></TabsContent>
      <TabsContent value="terms"><Terms /></TabsContent>
    </Tabs>
  );
}
