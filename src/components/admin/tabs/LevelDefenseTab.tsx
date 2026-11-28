/**
 * Admin > Level Defence: every child enrolled now, the level they defend,
 * their standardized results, the level on the growth chart and where the
 * defence stands. The admin sets the level to defend and opens (or closes)
 * the defence for each child, one at a time or for a selection; "Manage"
 * opens the child's full panel (standardized results, everything learnt,
 * evidence audit, the adaptive test, the whole case, drafts to approve).
 *
 * Writes go through cefr-defense (`set_defense`), which checks the caller.
 * Reads are the admin's own RLS. Before migration 20261128200000 the
 * standardized column stays empty and opening a defence says it needs it.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Scale, Search } from "lucide-react";
import { CefrDefensePanel } from "@/components/cefr/CefrDefensePanel";
import { CefrDraftsCard } from "@/components/cefr/CefrDraftsCard";

const LEVELS = ["Pre-A1", "A1", "A2", "B1", "B2", "C1"];
/** set_defense calls are counted by cefr-defense's gate (60 per 10 minutes). */
const BULK_MAX = 40;

interface Row {
  studentId: string;
  name: string;
  classes: Array<{ id: string; name: string }>;
  claim: { claimed_level: string; status: string; defense_open?: boolean; defense_note?: string | null } | null;
  standardized: { test_name: string; test_date: string; cefr_level: string } | null;
  chartLevel: { level: string; assessed_at: string } | null;
  testRunning: boolean;
}

const invokeDefense = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("cefr-defense", { body });
  if (error) {
    let detail = error.message;
    try { const b = await (error as any).context?.json?.(); if (b?.error) detail = b.error; } catch { /* keep */ }
    throw new Error(detail);
  }
  if (data?.success === false) throw new Error(data.error || "request failed");
  return data;
};

const STATUS: Record<string, { label: string; tone: string }> = {
  none: { label: "No level yet", tone: "border-hec-line bg-hec-sunken text-hec-ink-soft" },
  open: { label: "Open to defend", tone: "border-hec-brass/40 bg-hec-sunken text-hec-brass" },
  test: { label: "Taking the test", tone: "border-hec-line bg-hec-sunken text-hec-ink" },
  defended: { label: "Defended", tone: "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf" },
  not_defended: { label: "Not defended", tone: "border-hec-danger/30 bg-hec-danger-tint text-hec-danger" },
  supported: { label: "Evidence supports", tone: "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf" },
  partially_supported: { label: "Partly supported", tone: "border-hec-warn/30 bg-hec-warn-tint text-hec-warn" },
  not_supported: { label: "Evidence against", tone: "border-hec-danger/30 bg-hec-danger-tint text-hec-danger" },
  unverified: { label: "Level set", tone: "border-hec-line bg-hec-sunken text-hec-ink-soft" },
};

function stateOf(r: Row): string {
  if (!r.claim) return "none";
  if (r.testRunning) return "test";
  if (r.claim.defense_open) return "open";
  return STATUS[r.claim.status] ? r.claim.status : "unverified";
}

export default function LevelDefenseTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLevel, setBulkLevel] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [rowLevel, setRowLevel] = useState<Record<string, string>>({});
  const [manage, setManage] = useState<Row | null>(null);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  const { data: rows = [], isLoading, error } = useQuery<Row[]>({
    queryKey: ["level-defense-admin"],
    queryFn: async () => {
      const [enr, claims, std, points, tests] = await Promise.all([
        supabase.from("enrollments").select("student_id, class_id, students(id, full_name), classes(id, name)").is("end_date", null),
        supabase.from("cefr_level_claims").select("*"),
        supabase.from("student_standardized_tests").select("student_id, test_name, test_date, cefr_level").order("test_date", { ascending: false }),
        supabase.from("cefr_assessments").select("student_id, level, assessed_at").order("assessed_at", { ascending: false }).limit(5000),
        supabase.from("cefr_defense_tests").select("student_id, status").neq("status", "graded"),
      ]);
      if (enr.error) throw enr.error;
      const byStudent = new Map<string, Row>();
      for (const e of (enr.data ?? []) as any[]) {
        const s = Array.isArray(e.students) ? e.students[0] : e.students;
        const c = Array.isArray(e.classes) ? e.classes[0] : e.classes;
        if (!s?.id) continue;
        const row = byStudent.get(s.id) ?? {
          studentId: s.id, name: s.full_name ?? "—", classes: [], claim: null, standardized: null, chartLevel: null, testRunning: false,
        };
        if (c?.id && !row.classes.some((x) => x.id === c.id)) row.classes.push({ id: c.id, name: c.name ?? "—" });
        byStudent.set(s.id, row);
      }
      for (const c of (claims.data ?? []) as any[]) { const r = byStudent.get(c.student_id); if (r) r.claim = c; }
      for (const t of (std.data ?? []) as any[]) { const r = byStudent.get(t.student_id); if (r && !r.standardized) r.standardized = t; }
      for (const p of (points.data ?? []) as any[]) { const r = byStudent.get(p.student_id); if (r && !r.chartLevel) r.chartLevel = p; }
      for (const t of (tests.data ?? []) as any[]) { const r = byStudent.get(t.student_id); if (r) r.testRunning = true; }
      return [...byStudent.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const classes = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => r.classes.forEach((c) => m.set(c.id, c.name)));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const shown = rows.filter((r) =>
    (!search || r.name.toLowerCase().includes(search.toLowerCase())) &&
    (classFilter === "all" || r.classes.some((c) => c.id === classFilter)) &&
    (stateFilter === "all" || stateOf(r) === stateFilter));

  const refresh = () => qc.invalidateQueries({ queryKey: ["level-defense-admin"] });

  const rowMutation = useMutation({
    mutationFn: (v: { row: Row; open: boolean; level?: string }) =>
      invokeDefense({ action: "set_defense", student_id: v.row.studentId, open: v.open, ...(v.level ? { level: v.level } : {}), note: v.row.claim?.defense_note ?? null }),
    onSuccess: (_d, v) => { toast.success(`${v.row.name}: ${v.open ? "defence open" : v.level ? `level ${v.level}` : "defence closed"}`); refresh(); },
    onError: (e: any) => toast.error("Couldn't change it", { description: e.message }),
  });

  const bulk = async (open: boolean) => {
    const ids = [...selected].filter((id) => shown.some((r) => r.studentId === id));
    if (!ids.length) return;
    if (ids.length > BULK_MAX) { toast.error(`Choose at most ${BULK_MAX} children at a time`); return; }
    const missing = ids.filter((id) => !rows.find((r) => r.studentId === id)?.claim);
    if (open && missing.length && !bulkLevel) { toast.error(`${missing.length} of them have no level yet: choose the level to defend`); return; }
    let ok = 0; const failed: string[] = [];
    for (const [i, id] of ids.entries()) {
      const r = rows.find((x) => x.studentId === id)!;
      setBulkProgress(`${i + 1} / ${ids.length}`);
      try {
        await invokeDefense({ action: "set_defense", student_id: id, open, ...(bulkLevel ? { level: bulkLevel } : {}), note: bulkNote.trim() || r.claim?.defense_note || null });
        ok++;
      } catch (e: any) { failed.push(`${r.name}: ${e.message}`); }
    }
    setBulkProgress(null);
    if (ok) toast.success(`${ok} child${ok === 1 ? "" : "ren"} ${open ? "can now defend their level" : "updated"}`);
    if (failed.length) toast.error(`${failed.length} not changed`, { description: failed.slice(0, 3).join("; ") });
    setSelected(new Set());
    refresh();
  };

  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.studentId));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4 text-hec-ink-soft" />Level Defence</CardTitle>
          <CardDescription className="text-hec-small">
            Set the level each child defends and open their defence. A child defends with everything they have learnt here and
            their standardized test results; once open, they take the adaptive test from Defend My Level. Levels reach the
            growth chart only when a teacher approves them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-hec-ink-soft" />
              <Input className="h-9 w-56 pl-8" placeholder="Search a child" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Every state</SelectItem>
                {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-hec-small text-hec-ink-soft">{shown.length} children</span>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-hec-md border border-hec-brass/40 bg-hec-sunken p-2">
              <span className="text-hec-small font-semibold text-hec-ink">{selected.size} selected</span>
              <Select value={bulkLevel} onValueChange={setBulkLevel}>
                <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Level to defend" /></SelectTrigger>
                <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-9 w-72" placeholder="Line for the children (optional)" value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} maxLength={300} />
              <Button size="sm" disabled={!!bulkProgress} onClick={() => bulk(true)}>
                {bulkProgress ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />{bulkProgress}</> : bulkLevel ? `Set ${bulkLevel} & open defence` : "Open defence"}
              </Button>
              <Button size="sm" variant="outline" disabled={!!bulkProgress} onClick={() => bulk(false)}>
                {bulkLevel ? `Set ${bulkLevel}, keep closed` : "Close defence"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}

          {isLoading ? (
            <p className="flex items-center gap-2 py-8 text-hec-small text-hec-ink-soft"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
          ) : error ? (
            <p className="text-hec-small text-hec-danger">{(error as Error).message}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={allShownSelected}
                        onCheckedChange={(v) => setSelected(v ? new Set(shown.map((r) => r.studentId)) : new Set())}
                        aria-label="Select every child shown"
                      />
                    </TableHead>
                    <TableHead>Child</TableHead>
                    <TableHead>Level to defend</TableHead>
                    <TableHead>Standardized</TableHead>
                    <TableHead>Growth chart</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Open</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((r) => {
                    const st = STATUS[stateOf(r)];
                    const pending = rowMutation.isPending && rowMutation.variables?.row.studentId === r.studentId;
                    return (
                      <TableRow key={r.studentId}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(r.studentId)}
                            onCheckedChange={(v) => setSelected((s) => { const n = new Set(s); v ? n.add(r.studentId) : n.delete(r.studentId); return n; })}
                            aria-label={`Select ${r.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <p className="text-hec-small font-semibold text-hec-ink">{r.name}</p>
                          <p className="text-hec-caption text-hec-ink-soft">{r.classes.map((c) => c.name).join(", ")}</p>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={rowLevel[r.studentId] ?? r.claim?.claimed_level ?? ""}
                            onValueChange={(v) => {
                              setRowLevel((m) => ({ ...m, [r.studentId]: v }));
                              rowMutation.mutate({ row: r, open: !!r.claim?.defense_open, level: v });
                            }}
                          >
                            <SelectTrigger className="h-8 w-28"><SelectValue placeholder="Set…" /></SelectTrigger>
                            <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-hec-small">
                          {r.standardized
                            ? <><span className="font-semibold text-hec-ink">{r.standardized.cefr_level}</span> <span className="text-hec-caption text-hec-ink-soft">{r.standardized.test_name} · {r.standardized.test_date}</span></>
                            : <span className="text-hec-ink-soft">—</span>}
                        </TableCell>
                        <TableCell className="text-hec-small">
                          {r.chartLevel ? <><span className="font-semibold text-hec-ink">{r.chartLevel.level}</span> <span className="text-hec-caption text-hec-ink-soft">{String(r.chartLevel.assessed_at).slice(0, 10)}</span></> : <span className="text-hec-ink-soft">—</span>}
                        </TableCell>
                        <TableCell><Badge className={`whitespace-nowrap ${st.tone}`}>{st.label}</Badge></TableCell>
                        <TableCell>
                          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                            <Switch
                              checked={!!r.claim?.defense_open}
                              disabled={!r.claim || r.testRunning}
                              onCheckedChange={(v) => rowMutation.mutate({ row: r, open: v })}
                              aria-label={`Let ${r.name} defend their level`}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => setManage(r)}>Manage</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!manage} onOpenChange={(o) => { if (!o) { setManage(null); refresh(); } }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{manage?.name} · Level Defence</DialogTitle></DialogHeader>
          {manage && (
            <div className="space-y-4">
              <CefrDefensePanel studentId={manage.studentId} classId={manage.classes[0]?.id ?? null} />
              <CefrDraftsCard studentId={manage.studentId} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
