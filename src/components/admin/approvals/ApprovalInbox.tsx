import { useId, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReasonField } from "@/components/admin/session-guard/Fields";
import { checkReason, cleanReason, formatClock, formatDay, REASON_MIN } from "@/lib/sessionGuard";
import {
  approvalErrorText,
  decidedText,
  expiryWords,
  reasonSentence,
  RPC_WORDS,
  sortQueue,
  STATUS_WORDS,
  type ApprovalKind,
  type ApprovalQueueRow,
} from "@/lib/approvals";
import {
  acknowledgeReleased,
  approveRequest,
  loadQueue,
  previewRequest,
  refreshApprovedBills,
  rejectRequest,
  releaseOwnRequest,
  requestApproval,
  withdrawRequest,
  type ApprovalError,
} from "./api";
import { formatVND } from "@/lib/money";

const db = supabase as any;

async function loadAll() {
  const [rows, me] = await Promise.all([loadQueue(), supabase.auth.getUser()]);
  const ids = [...new Set(rows.flatMap((r) => [r.requested_by, r.decided_by]).filter(Boolean))] as string[];
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data } = await db.from("profiles").select("id, display_name").in("id", ids);
    for (const p of data ?? []) names[p.id] = p.display_name || "an administrator";
  }
  return { rows, names, me: me.data.user?.id ?? null };
}

/**
 * Changes waiting for a second administrator (D4 step 4), and what happened
 * to the earlier ones. Reads change_approval_queue (admins only, RLS) on the
 * signed-in admin's client. Every decision is one RPC: the database checks
 * who may decide (never the one who asked), recomputes the change and refuses
 * a stale one. Nothing waits here while approval is switched off.
 */
export function ApprovalInbox({ kinds, title = "Waiting for a second administrator" }: { kinds?: ApprovalKind[]; title?: string }) {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["change-approvals"], queryFn: loadAll, staleTime: 10_000 });
  const rows = useMemo(() => sortQueue((data?.rows ?? []).filter((r) => !kinds || kinds.includes(r.kind))), [data, kinds]);
  const waiting = rows.filter((r) => r.status === "pending").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" aria-hidden="true" />
          {title}
        </CardTitle>
        <CardDescription>
          A change that needs a second administrator waits here, unchanged, until another administrator approves it.
          {data ? ` ${waiting} waiting.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground" role="status">Loading...</p>}
        {error && (
          <p role="alert" className="text-sm">
            The approvals list could not be read. If the approval step of the database update is not applied yet, there is nothing to show.
          </p>
        )}
        {data && rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing has been sent for approval.</p>}
        {data && rows.length > 0 && (
          <ul className="space-y-2" aria-label="Approval requests">
            {rows.map((r) => (
              <RequestItem key={r.request_id} row={r} names={data.names} me={data.me} onChanged={() => void refetch()} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RequestItem({ row, names, me, onChanged }: { row: ApprovalQueueRow; names: Record<string, string>; me: string | null; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const when = `${formatDay(row.created_at) ?? ""} ${formatClock(row.created_at) ?? ""}`.trim();
  const asker = row.requested_by === me ? "you" : names[row.requested_by] ?? "an administrator";
  const unread = row.released_alone && !row.acknowledged && row.requested_by !== me;
  return (
    <li className="rounded-xl border border-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-start gap-3 rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block break-words text-sm font-medium">{RPC_WORDS[row.rpc] ?? row.rpc}{row.batch ? ` (${row.preview?.items?.length ?? "several"} items)` : ""}</span>
          <span className="block break-words text-xs text-muted-foreground">Asked {when} by {asker}. {reasonSentence(row.reasons, row.preview?.approval?.thresholds)}</span>
          <span className="flex flex-wrap gap-1.5">
            <Badge variant={row.status === "pending" ? "destructive" : "outline"}>{STATUS_WORDS[row.status] ?? row.status}</Badge>
            {row.status === "pending" && <Badge variant="outline">{expiryWords(row.expires_at)}</Badge>}
            {row.released_alone && <Badge variant={unread ? "destructive" : "outline"}>{unread ? "Done alone - please read" : "Done alone"}</Badge>}
            {row.decided_by && row.status !== "pending" && <Badge variant="outline">by {row.decided_by === me ? "you" : names[row.decided_by] ?? "an administrator"}</Badge>}
          </span>
        </span>
      </button>
      {open && <RequestDetail id={`${id}-body`} row={row} me={me} onChanged={onChanged} />}
    </li>
  );
}

function RequestDetail({ id, row, me, onChanged }: { id: string; row: ApprovalQueueRow; me: string | null; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: look, isLoading, refetch } = useQuery({
    queryKey: ["change-approval", row.request_id],
    queryFn: async () => {
      const r = await previewRequest(row.request_id);
      if ("error" in r) throw r.error;
      return r.data;
    },
  });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [billsLeft, setBillsLeft] = useState(false);
  const inFlight = useRef(false);

  const act = async (fn: () => Promise<{ data: any } | { error: ApprovalError }>, done: (d: any) => string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fn();
      if ("error" in r) setMsg(approvalErrorText(r.error.code, r.error.detail));
      else setMsg(done(r.data));
      onChanged();
      void refetch();
      void qc.invalidateQueries();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const items: any[] = look?.now?.items ?? [];
  const noteOk = checkReason(note, REASON_MIN).ok;
  return (
    <div id={id} className="space-y-3 border-t border-border p-3 text-sm">
      {isLoading && <p className="text-muted-foreground">Working out the change as it stands now...</p>}
      {look && (
        <>
          <section aria-label="The change now" className="space-y-1.5">
            <h4 className="font-semibold">The change, worked out again now</h4>
            {look.stale && (
              <p role="status" className="rounded-lg border border-border bg-muted/30 p-2">
                Something it reaches has changed since it was asked for, so it can no longer be approved as it is.
                {row.requested_by === me ? " Ask again from the change's screen." : ""}
              </p>
            )}
            <ul className="space-y-1">
              {items.map((it, k) => (
                <li key={`${it.target_key}-${k}`} className="break-words rounded-lg border border-border p-2">
                  {it.target_key}: level {it.tier}
                  {it.plan?.refresh_pairs?.length ? `, ${it.plan.refresh_pairs.length} bill(s) to work out again` : ""}
                </li>
              ))}
            </ul>
            {look.now?.approval?.totals && (
              <p className="text-xs text-muted-foreground">
                Reaches {String(look.now.approval.totals.families)} famil(ies) with settled bills and {formatVND(Number(look.now.approval.totals.paid_vnd ?? 0))} recorded (with the same person's last 24 hours).
              </p>
            )}
            {look.error && <p className="text-xs text-muted-foreground">It could not be worked out now ({look.error.code}).</p>}
          </section>

          {look.can_approve && (
            <section aria-label="Approve" className="space-y-2">
              <ReasonField label="Note (optional)" help="What you checked." value={note} onChange={setNote} min={0} disabled={busy} />
              <Button className="min-h-11 w-full sm:w-auto" disabled={busy || !look.token}
                onClick={() => act(() => approveRequest(row.request_id, look.token, note.trim() ? cleanReason(note) : null),
                  (d) => { const t = decidedText(d?.decision, d?.tuition); setBillsLeft(t.billsLeft); return t.text; })}>
                {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                Approve and make the change
              </Button>
            </section>
          )}
          {look.can_reject && (
            <section aria-label="Reject" className="space-y-2">
              {!look.can_approve && <ReasonField label="Why not (required to reject)" value={note} onChange={setNote} min={REASON_MIN} disabled={busy} />}
              <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={busy || !noteOk}
                onClick={() => act(() => rejectRequest(row.request_id, cleanReason(note)), () => "Rejected: nothing was changed.")}>
                Reject{noteOk ? "" : " (write why first)"}
              </Button>
            </section>
          )}
          {look.can_release && (
            <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={busy}
              onClick={() => act(() => releaseOwnRequest(row.request_id, look.token),
                (d) => { const t = decidedText(d?.decision, d?.tuition, true); setBillsLeft(t.billsLeft); return t.text; })}>
              Do it alone (the other administrator is away)
            </Button>
          )}
          {look.can_withdraw && (
            <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={busy}
              onClick={() => act(() => withdrawRequest(row.request_id), () => "Withdrawn: nothing was changed.")}>
              Withdraw my request
            </Button>
          )}
          {look.needs_acknowledgement && (
            <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={busy}
              onClick={() => act(() => acknowledgeReleased(row.request_id, null), () => "Marked as read.")}>
              I have read this
            </Button>
          )}
          {row.status === "applied" && (row.kind === "session" || (row.kind === "money" && row.rpc !== "carry_payroll_adjustments")) && (
            <section aria-label="Bills" className="space-y-1">
              {billsLeft && <p role="alert" className="text-sm">Until its bills are worked out again, families may see a bill that does not include this change.</p>}
              <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={busy}
                onClick={() => act(() => refreshApprovedBills(row.request_id),
                  (d) => { const t = decidedText(null, d?.tuition); setBillsLeft(t.billsLeft); return t.text; })}>
                Work out the bills again
              </Button>
            </section>
          )}
          {(row.status === "stale" || row.status === "expired") && row.requested_by === me && <AskAgain row={row} onDone={(t) => { setMsg(t); onChanged(); }} />}
          {row.requested_by === me && row.status === "pending" && !look.can_release && (
            <p className="text-xs text-muted-foreground">You asked for this; another administrator approves it.</p>
          )}
        </>
      )}
      {msg && <p role="status" className="break-words font-medium">{msg}</p>}
    </div>
  );
}

/** "Ask again" for a single money change: a fresh preview, then the same request with its new token. */
function AskAgain({ row, onDone }: { row: ApprovalQueueRow; onDone: (text: string) => void }) {
  const [busy, setBusy] = useState(false);
  const { data: req } = useQuery({
    queryKey: ["change-approval-params", row.request_id],
    queryFn: async () => {
      const { data, error } = await db.from("change_approval_requests").select("params").eq("id", row.request_id).maybeSingle();
      if (error) throw error;
      return data?.params ?? null;
    },
    enabled: row.rpc === "money_change_checked",
  });
  if (row.rpc !== "money_change_checked") {
    return <p className="text-xs text-muted-foreground">To ask again, make the change again from its screen: it is checked afresh.</p>;
  }
  const again = async () => {
    if (!req) return;
    setBusy(true);
    try {
      const { data: plan, error } = await db.rpc("money_change_preview", { p_entity: req.entity, p_op: req.op, p_args: req.args });
      if (error) { onDone(approvalErrorText(String(error.code ?? ""), error.details)); return; }
      const r = await requestApproval("money", "money_change_checked", req, plan?.token ?? null);
      onDone("error" in r ? approvalErrorText(r.error.code, r.error.detail) : "Asked again: it waits for a second administrator.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={busy || !req} onClick={() => again()}>
      Ask again with today's figures
    </Button>
  );
}
