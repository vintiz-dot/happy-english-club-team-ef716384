// Tuition audit, phase 2: the reconciliation register (Finance > Audit).
//
// One row per disputed family-month from the audit of 16 Nov 2026, loaded by
// scripts/load-reconciliation-items.mjs. The owner settles each one once;
// a decision that moves money is a payment or correction row made by
// record_admin_payment inside decide_tuition_reconciliation_item - this
// screen never edits a bill. Totals are over the facts as loaded, so the
// whole register ties to the audit's -14,174,001 whatever has been decided.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Scale } from "lucide-react";
import { parseCash } from "@/lib/cashEntry";
import {
  AUDIT_DIFFERENCE, DECISIONS, PATTERNS, allowedDecisions, buildLegs, filterItems, legsProblem, totals,
  type Decision, type Pattern, type ReconciliationItem,
} from "@/lib/reconciliation";
import { formatVND } from "@/lib/money";

// The table and the RPC are newer than the generated types.
const db = supabase as any;
const vnd = (n: number | null | undefined) => formatVND(n);
const signed = (n: number) => formatVND(n, { signed: true });
const ALL = "all";

interface Names { students: Record<string, string>; families: Record<string, string> }

function useRegister() {
  return useQuery({
    queryKey: ["tuition-reconciliation-items"],
    queryFn: async () => {
      const { data, error } = await db.from("tuition_reconciliation_items").select("*").order("month").order("pattern").order("item_key");
      if (error) throw error;
      const items = (data ?? []).map((r: any) => ({
        ...r,
        sheet_amount: Number(r.sheet_amount), app_recorded: Number(r.app_recorded),
        app_billed: r.app_billed === null ? null : Number(r.app_billed), difference: Number(r.difference),
        student_ids: r.student_ids ?? [], payment_ids: r.payment_ids ?? [],
      })) as ReconciliationItem[];
      const studentIds = [...new Set(items.flatMap((i) => i.student_ids))];
      const familyIds = [...new Set(items.map((i) => i.family_id).filter(Boolean))] as string[];
      const [s, f] = await Promise.all([
        studentIds.length ? db.from("students").select("id, full_name").in("id", studentIds) : { data: [] },
        familyIds.length ? db.from("families").select("id, name").in("id", familyIds) : { data: [] },
      ]);
      const names: Names = {
        students: Object.fromEntries((s.data ?? []).map((x: any) => [x.id, x.full_name])),
        families: Object.fromEntries((f.data ?? []).map((x: any) => [x.id, x.name])),
      };
      return { items, names };
    },
  });
}

const who = (i: ReconciliationItem, names: Names) => {
  if (i.family_id && names.families[i.family_id]) return names.families[i.family_id];
  if (i.student_ids.length) return i.student_ids.map((id) => names.students[id] ?? "?").join(", ");
  return "Not in the app";
};

export function ReconciliationRegister() {
  const { data, isLoading, error } = useRegister();
  const [month, setMonth] = useState<string>(ALL);
  const [pattern, setPattern] = useState<string>(ALL);
  const [status, setStatus] = useState<string>("open");
  const [deciding, setDeciding] = useState<ReconciliationItem | null>(null);

  const items = data?.items ?? [];
  const months = useMemo(() => [...new Set(items.map((i) => i.month))].sort(), [items]);
  const shown = filterItems(items, {
    month: month === ALL ? null : month, pattern: pattern === ALL ? null : (pattern as Pattern),
    status: status === ALL ? null : (status as "open" | "decided"),
  });
  const whole = totals(items);
  const view = totals(shown);

  if (isLoading) return <Loading />;
  if (error) {
    const msg = (error as any)?.message ?? String(error);
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground">
        {/schema cache|does not exist/.test(msg)
          ? "The reconciliation register is not installed yet (migration 20261121100000)."
          : `The register could not be read: ${msg}`}
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" />Tuition audit: reconciliation register</CardTitle>
          <CardDescription>
            Every family-month where the fee sheet's cash and the app's recorded payment differ (Oct 2025 – May 2026).
            Settle each one once. Money moves only as a payment or a correction row; no bill is edited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Items" value={`${whole.items}`} hint={`${whole.open} open, ${whole.decided} decided`} />
            <Stat label="Sheet cash" value={vnd(whole.sheet)} />
            <Stat label="App recorded" value={vnd(whole.recorded)} />
            <Stat label="Sheet − app" value={signed(whole.difference)}
              hint={whole.ties ? "Ties to the audit" : `Audit: ${signed(AUDIT_DIFFERENCE)}`}
              tone={whole.ties ? "ok" : "warn"} />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pattern</TableHead>
                  <TableHead className="text-right">Family-months</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(PATTERNS) as Pattern[]).map((p) => (
                  <TableRow key={p}>
                    <TableCell><Badge variant="outline" className="mr-2">{p}</Badge>{PATTERNS[p]}</TableCell>
                    <TableCell className="text-right">{whole.byPattern[p].items}</TableCell>
                    <TableCell className="text-right tabular-nums">{signed(whole.byPattern[p].net)}</TableCell>
                    <TableCell className="text-right tabular-nums">{vnd(whole.byPattern[p].gross)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <FilterSelect label="Month" value={month} onChange={setMonth} options={months.map((m) => [m, m])} />
            <FilterSelect label="Pattern" value={pattern} onChange={setPattern}
              options={(Object.keys(PATTERNS) as Pattern[]).map((p) => [p, `${p} · ${PATTERNS[p]}`])} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={[["open", "Open"], ["decided", "Decided"]]} />
            <div className="text-sm text-muted-foreground ml-auto">
              {view.items} shown · sheet − app <span className="tabular-nums">{signed(view.difference)}</span>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No items loaded. Run scripts/load-reconciliation-items.mjs with --emit-sql and paste its SQL into the Supabase SQL editor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Family</TableHead>
                    <TableHead>Pattern</TableHead>
                    <TableHead className="text-right">Sheet</TableHead>
                    <TableHead className="text-right">App recorded</TableHead>
                    <TableHead className="text-right">App billed</TableHead>
                    <TableHead className="text-right">Sheet − app</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="whitespace-nowrap">{i.month}</TableCell>
                      <TableCell>
                        <div className="font-medium">{who(i, data!.names)}</div>
                        {i.evidence && <div className="text-xs text-muted-foreground max-w-md">{i.evidence}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline" title={PATTERNS[i.pattern]}>{i.pattern}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{vnd(i.sheet_amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{vnd(i.app_recorded)}</TableCell>
                      <TableCell className="text-right tabular-nums">{vnd(i.app_billed)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${i.difference < 0 ? "text-destructive" : ""}`}>{signed(i.difference)}</TableCell>
                      <TableCell>
                        {i.status === "decided" ? (
                          <div className="space-y-1">
                            <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />{DECISIONS[i.decision!]?.label ?? i.decision}</Badge>
                            {i.decision_note && <div className="text-xs text-muted-foreground max-w-xs">{i.decision_note}</div>}
                            {i.payment_ids.length > 0 && <div className="text-xs text-muted-foreground">{i.payment_ids.length} payment row{i.payment_ids.length > 1 ? "s" : ""}</div>}
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setDeciding(i)}>Decide</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {deciding && <DecideDialog item={deciding} names={data!.names} onClose={() => setDeciding(null)} />}
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {hint && (
        <div className={`text-xs flex items-center gap-1 ${tone === "warn" ? "text-destructive" : "text-muted-foreground"}`}>
          {tone === "ok" && <CheckCircle2 className="h-3 w-3" />}{tone === "warn" && <AlertTriangle className="h-3 w-3" />}{hint}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function DecideDialog({ item, names, onClose }: { item: ReconciliationItem; names: Names; onClose: () => void }) {
  const queryClient = useQueryClient();
  const options = allowedDecisions(item);
  const [decision, setDecision] = useState<Decision | "">("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("");
  const [receipt, setReceipt] = useState("");
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [otherMonth, setOtherMonth] = useState("");
  const [itemMonthIs, setItemMonthIs] = useState<"booked" | "belongs">("belongs");
  const [saving, setSaving] = useState(false);

  const money = decision ? DECISIONS[decision].money : false;
  const months = [item.month, ...(decision === "wrong_month" && /^\d{4}-\d{2}$/.test(otherMonth) ? [otherMonth] : [])];
  // What each child's bill holds NOW (the audit's figures were read at load).
  const { data: bills } = useQuery({
    queryKey: ["reconciliation-bills", item.id, months.join(",")],
    enabled: money && item.student_ids.length > 0,
    queryFn: async () => {
      const { data, error } = await db.from("invoices").select("student_id, month, recorded_payment, total_amount")
        .in("student_id", item.student_ids).in("month", months);
      if (error) throw error;
      return (data ?? []) as { student_id: string; month: string; recorded_payment: number | null; total_amount: number }[];
    },
  });
  const holds = Object.fromEntries((bills ?? []).map((b) => [`${b.student_id}|${b.month}`, Number(b.recorded_payment ?? 0)]));
  const amounts = Object.fromEntries(item.student_ids.map((id) => [id, parseCash(typed[id] ?? "")]));
  const legs = decision ? buildLegs(item, decision, amounts, decision === "wrong_month" ? { otherMonth, itemMonthIs } : undefined) : [];
  const problem = !decision ? "Choose a decision."
    : !note.trim() && decision !== "rounding_accepted" ? "Write what the decision rests on (bank statement, receipt book, the family)."
    : money && !method ? "Choose cash or bank transfer."
    : money && !receipt ? "Give the receipt date."
    : legsProblem(item, decision, legs, holds);

  const submit = async () => {
    if (!decision || problem) return;
    setSaving(true);
    try {
      const { data, error } = await db.rpc("decide_tuition_reconciliation_item", {
        p_item_id: item.id, p_decision: decision, p_note: note.trim() || null,
        p_legs: legs, p_method: money ? method : null,
        p_occurred_at: money ? new Date(`${receipt}T12:00:00+07:00`).toISOString() : null,
      });
      if (error) throw error;
      toast.success(`${DECISIONS[decision].label}: decided${data?.paymentIds?.length ? `, ${data.paymentIds.length} payment row(s) written` : ""}`);
      queryClient.invalidateQueries({ queryKey: ["tuition-reconciliation-items"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tuition"] });
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Nothing was changed.");
      queryClient.invalidateQueries({ queryKey: ["tuition-reconciliation-items"] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{who(item, names)} · {item.month}</DialogTitle>
          <DialogDescription>
            Sheet {vnd(item.sheet_amount)}, app recorded {vnd(item.app_recorded)}, billed {vnd(item.app_billed)} ·
            pattern {item.pattern} ({PATTERNS[item.pattern]}). Sheet − app {signed(item.difference)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="rc-decision">Decision</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as Decision)}>
              <SelectTrigger id="rc-decision"><SelectValue placeholder="Choose what the evidence shows" /></SelectTrigger>
              <SelectContent>
                {options.map((d) => <SelectItem key={d} value={d}>{DECISIONS[d].label}</SelectItem>)}
              </SelectContent>
            </Select>
            {decision && <p className="text-xs text-muted-foreground">{DECISIONS[decision].help}</p>}
          </div>

          {decision === "wrong_month" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rc-other">The other month</Label>
                <Input id="rc-other" type="month" value={otherMonth} onChange={(e) => setOtherMonth(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rc-dir">The money</Label>
                <Select value={itemMonthIs} onValueChange={(v) => setItemMonthIs(v as "booked" | "belongs")}>
                  <SelectTrigger id="rc-dir"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="belongs">belongs to {item.month}</SelectItem>
                    <SelectItem value="booked">is on {item.month}, belongs to the other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {money && (
            <>
              <div className="space-y-2">
                <Label>{decision === "not_received" ? "Not received, per child" : "Amount moved, per child"}</Label>
                {decision === "not_received" && (
                  <p className="text-xs text-muted-foreground">The app holds {vnd(Math.max(item.app_recorded - item.sheet_amount, 0))} over the sheet for this family-month.</p>
                )}
                {item.student_ids.map((id) => (
                  <div key={id} className="flex items-center gap-3">
                    <div className="flex-1 text-sm">
                      {names.students[id] ?? "?"}
                      <div className="text-xs text-muted-foreground">
                        {months.map((m) => `${m}: ${holds[`${id}|${m}`] === undefined ? "no bill" : vnd(holds[`${id}|${m}`])}`).join(" · ")}
                      </div>
                    </div>
                    <Input className="w-40 text-right" inputMode="numeric" placeholder="0" value={typed[id] ?? ""}
                      onChange={(e) => setTyped((t) => ({ ...t, [id]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="rc-method">Cash or bank</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger id="rc-method"><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rc-date">Receipt date</Label>
                  <Input id="rc-date" type="date" value={receipt} onChange={(e) => setReceipt(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label htmlFor="rc-note">What it rests on{decision === "rounding_accepted" ? " (optional)" : ""}</Label>
            <Textarea id="rc-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Bank statement line, receipt book page, what the family said" />
          </div>

          {legs.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <div className="font-medium">This will write</div>
              {legs.map((l, n) => (
                <div key={n} className="tabular-nums">
                  {l.kind === "correction" ? "Correction" : "Payment"} {l.kind === "correction" ? "−" : "+"}{vnd(l.amount)} on {names.students[l.student_id] ?? "?"}'s {l.month} bill
                </div>
              ))}
            </div>
          )}
          {decision && problem && <p className="text-sm text-destructive">{problem}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !!problem}>{saving ? "Saving…" : "Record decision"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
