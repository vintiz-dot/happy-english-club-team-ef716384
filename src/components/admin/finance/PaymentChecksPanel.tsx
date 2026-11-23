/**
 * The early-warning list for one month: every finding from
 * src/lib/finance/paymentChecks.ts, grouped by what kind of problem it is,
 * worst first. Shared by Finance > Recorded and Reports > Executive, so both
 * show the same faults in the same words. Render only.
 */
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Info, OctagonAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/money";
import {
  CHECK_INFO,
  SEVERITY_ORDER,
  type CheckKind,
  type CheckResult,
  type Finding,
  type Severity,
} from "@/lib/finance/paymentChecks";

export const SEVERITY_LABEL: Record<Severity, string> = { error: "Must fix", warning: "Check", note: "Note" };
export const SEVERITY_BADGE: Record<Severity, "destructive" | "warning" | "secondary"> = {
  error: "destructive",
  warning: "warning",
  note: "secondary",
};
const ICON: Record<Severity, typeof OctagonAlert> = { error: OctagonAlert, warning: AlertTriangle, note: Info };

interface Props {
  checks: CheckResult;
  names: Map<string, string>;
  monthLabel: string;
  /** Collapse notes by default (the Executive view only wants the count). */
  compact?: boolean;
  onSelectStudent?: (studentId: string) => void;
}

export function PaymentChecksPanel({ checks, names, monthLabel, compact, onSelectStudent }: Props) {
  const groups = new Map<CheckKind, Finding[]>();
  for (const f of checks.findings) groups.set(f.kind, [...(groups.get(f.kind) ?? []), f]);
  const ordered = [...groups.entries()].sort(
    ([a], [b]) => SEVERITY_ORDER.indexOf(CHECK_INFO[a].severity) - SEVERITY_ORDER.indexOf(CHECK_INFO[b].severity),
  );
  const serious = checks.counts.error + checks.counts.warning;
  const notInstalled = checks.notInstalled ?? [];
  const failed = checks.unavailable.filter((k) => !notInstalled.includes(k));

  return (
    <Card className={checks.counts.error ? "border-hec-danger/40" : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {serious === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-hec-leaf" aria-hidden />
          ) : (
            <OctagonAlert className={`h-5 w-5 ${checks.counts.error ? "text-hec-danger" : "text-hec-warn"}`} aria-hidden />
          )}
          Discrepancy checks · {monthLabel}
          <span className="ml-auto flex flex-wrap gap-1.5">
            {SEVERITY_ORDER.map((s) => (
              <Badge key={s} variant={checks.counts[s] ? SEVERITY_BADGE[s] : "outline"} className="tabular-nums">
                {checks.counts[s]} {SEVERITY_LABEL[s].toLowerCase()}
              </Badge>
            ))}
          </span>
        </CardTitle>
        <CardDescription>
          {serious === 0
            ? "Every bill matches its payments, every payment is in the ledger, and every label follows the rule."
            : "Bills against their payments, payments against the cash and bank ledger, labels against the rule, bills against the register."}
          {failed.length > 0 && (
            <span className="mt-1 block text-hec-warn">
              Not checked (the data did not load): {[...new Set(failed.map((k) => CHECK_INFO[k].title))].join("; ")}.
            </span>
          )}
          {notInstalled.length > 0 && (
            <span className="mt-1 block text-hec-warn">
              Not checked (not installed yet): {notInstalled.map((k) => CHECK_INFO[k].title).join("; ")}. Its database migration has not been pasted.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      {ordered.length > 0 && (
        <CardContent className="space-y-2 pt-0">
          {ordered.map(([kind, list]) => (
            <Group
              key={kind}
              kind={kind}
              list={list}
              names={names}
              defaultOpen={!compact && CHECK_INFO[kind].severity === "error"}
              onSelectStudent={onSelectStudent}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function Group({
  kind, list, names, defaultOpen, onSelectStudent,
}: { kind: CheckKind; list: Finding[]; names: Map<string, string>; defaultOpen: boolean; onSelectStudent?: (id: string) => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const info = CHECK_INFO[kind];
  const Icon = ICON[info.severity];
  const total = list.reduce((s, f) => s + Math.abs(f.amount), 0);
  return (
    <div className="rounded-lg border border-hec-line">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" aria-hidden /> : <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />}
        <Icon className={`h-4 w-4 shrink-0 ${info.severity === "error" ? "text-hec-danger" : info.severity === "warning" ? "text-hec-warn" : "text-hec-ink-soft"}`} aria-hidden />
        <span className="font-semibold">{info.title}</span>
        <Badge variant={SEVERITY_BADGE[info.severity]} className="tabular-nums">{list.length}</Badge>
        {total > 0 && <span className="ml-auto whitespace-nowrap tabular-nums text-hec-ink-soft">{formatVND(total)}</span>}
      </button>
      {open && (
        <ul className="divide-y divide-hec-line border-t border-hec-line text-sm">
          {list.map((f, i) => {
            const name = f.studentId ? names.get(f.studentId) ?? "Unknown student" : "Ledger only";
            return (
              <li key={`${f.kind}-${f.billId ?? f.paymentId ?? i}-${i}`} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3">
                {f.studentId && onSelectStudent ? (
                  <button type="button" className="shrink-0 font-medium text-hec-action underline-offset-2 hover:underline sm:w-48 sm:text-left" onClick={() => onSelectStudent(f.studentId!)}>
                    {name}
                  </button>
                ) : (
                  <span className="shrink-0 font-medium sm:w-48">{name}</span>
                )}
                <span className="text-hec-ink-soft">{f.detail}</span>
                {f.paymentId && <span className="font-mono text-xs text-hec-ink-soft sm:ml-auto">payment {f.paymentId.slice(0, 8)}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
