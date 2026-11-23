/**
 * Reports > Forensic > Payment trail: every payment row of a month, each
 * traced to the bills it landed on (public.payment_bill_amounts) and to its
 * cash / bank ledger legs, beside the findings of the month's checks.
 * Read only; the same loader as Finance > Recorded (usePaymentChecks).
 */
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { dayjs } from "@/lib/date";
import { formatVND } from "@/lib/money";
import { CHECK_INFO, ledgerByPayment } from "@/lib/finance/paymentChecks";
import { usePaymentChecks } from "@/hooks/usePaymentChecks";
import { PaymentChecksPanel, SEVERITY_BADGE } from "@/components/admin/finance/PaymentChecksPanel";
import { monthOptions } from "./ExecutiveReport";

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function ForensicPaymentTrail() {
  const [month, setMonth] = useState(() => dayjs().tz().format("YYYY-MM"));
  const [search, setSearch] = useState("");
  const q = usePaymentChecks(month);
  const d = q.data?.month === month ? q.data : undefined;

  const rows = useMemo(() => {
    if (!d?.payments) return [];
    const onBills = new Map<string, { month: string; amount: number }[]>();
    for (const r of d.billAmounts ?? []) onBills.set(r.payment_id, [...(onBills.get(r.payment_id) ?? []), { month: r.month, amount: Number(r.amount) }]);
    const ledger = d.cashLegs && d.knownPaymentIds ? ledgerByPayment(d.cashLegs, d.knownPaymentIds).legsByPayment : null;
    const flagsByPayment = new Map<string, string[]>();
    for (const f of d.checks.findings) if (f.paymentId) flagsByPayment.set(f.paymentId, [...(flagsByPayment.get(f.paymentId) ?? []), f.kind]);
    const needle = search.trim().toLowerCase();
    return d.payments
      .map((p) => {
        const legs = ledger?.get(p.id.toLowerCase());
        const historical = p.source === "historical";
        const ledgerState = historical ? "opening balance (no legs by design)" : !ledger ? "not checked" : !legs ? "missing" : legs.net === Number(p.amount) ? "matches" : `differs (${formatVND(legs.net)})`;
        return { p, name: d.names.get(p.student_id) ?? "Unknown student", bills: onBills.get(p.id) ?? [], ledgerState, flags: flagsByPayment.get(p.id) ?? [] };
      })
      .filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.p.id.startsWith(needle))
      .sort((a, b) => a.p.occurred_at.localeCompare(b.p.occurred_at));
  }, [d, search]);

  const exportCsv = () => {
    const head = ["occurred_at", "student", "amount_vnd", "method", "source", "on_bills", "ledger", "flags", "payment_id"];
    const lines = rows.map((r) => [
      r.p.occurred_at, r.name, r.p.amount, r.p.method, r.p.source,
      r.bills.map((b) => `${b.month}:${b.amount}`).join(" "), r.ledgerState, r.flags.join(" "), r.p.id,
    ].map(csvCell).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payment-trail-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const total = rows.reduce((s, r) => s + (r.p.source === "historical" ? 0 : Number(r.p.amount)), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[200px]" aria-label="Month"><SelectValue /></SelectTrigger>
          <SelectContent>{monthOptions().map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-hec-ink-soft" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Student or payment id" className="w-[220px] pl-8" aria-label="Filter payments" />
        </div>
        <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4" aria-hidden /> CSV
        </Button>
      </div>

      {d && (
        <PaymentChecksPanel checks={d.checks} names={d.names} monthLabel={dayjs(`${month}-01`).format("MMMM YYYY")} onSelectStudent={(id) => setSearch(d.names.get(id) ?? "")} />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment trail</CardTitle>
          <CardDescription>
            Every receipt dated in the month and every opening balance on its bills: where the money landed and whether the cash / bank ledger agrees.
            {d && <> Receipts shown: <span className="tabular-nums">{formatVND(total)}</span>.</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!d ? (
            q.isError ? <p className="text-sm text-hec-danger">The trail could not be loaded: {(q.error as Error)?.message}</p> : <Loading size="sm" className="py-4" />
          ) : !d.payments ? (
            <p className="text-sm text-hec-danger">The payments list did not load.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>How</TableHead>
                  <TableHead>On bills</TableHead>
                  <TableHead>Ledger</TableHead>
                  <TableHead>Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-hec-ink-soft">No payments for this month{search ? " match" : ""}.</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.p.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {r.p.source === "historical" ? <span className="text-hec-ink-soft">before 17 Nov 2026</span> : dayjs(r.p.occurred_at).tz().format("DD MMM HH:mm")}
                      <div className="font-mono text-[10px] text-hec-ink-soft">{r.p.id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className={`text-right tabular-nums ${Number(r.p.amount) < 0 ? "text-hec-danger" : ""}`}>{formatVND(r.p.amount)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.p.source === "historical" ? <Badge variant="secondary">opening balance</Badge> : r.p.method}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {r.bills.length === 0 ? <span className="text-hec-ink-soft">none (credit / leftover)</span> : r.bills.map((b) => (
                        <div key={b.month}>{dayjs(`${b.month}-01`).format("MMM YYYY")}: {formatVND(b.amount)}</div>
                      ))}
                    </TableCell>
                    <TableCell className={`whitespace-nowrap text-xs ${r.ledgerState === "matches" ? "text-hec-leaf" : r.ledgerState.startsWith("opening") || r.ledgerState === "not checked" ? "text-hec-ink-soft" : "text-hec-danger font-semibold"}`}>
                      {r.ledgerState}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.flags.map((k) => (
                          <Badge key={k} variant={SEVERITY_BADGE[CHECK_INFO[k as keyof typeof CHECK_INFO].severity]}>{CHECK_INFO[k as keyof typeof CHECK_INFO].title}</Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
