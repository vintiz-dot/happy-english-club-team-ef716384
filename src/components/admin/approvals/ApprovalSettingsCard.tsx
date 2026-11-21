import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReasonField } from "@/components/admin/session-guard/Fields";
import { checkReason, cleanReason, REASON_MIN } from "@/lib/sessionGuard";
import { approvalErrorText, isApprovalRequired, settingsLoosen, type ApprovalSettings } from "@/lib/approvals";
import { approvalStatus, requestApproval, setApprovalSettings } from "./api";

/**
 * The approval setting (D4 step 4). Ships OFF; while off nothing waits for a
 * second administrator. Switching on and tightening apply at once (switching
 * on needs two administrators); switching off or loosening while on is sent
 * to the other administrator. The database enforces all of it; this card
 * only shows the setting and sends the change.
 */
export function ApprovalSettingsCard() {
  const qc = useQueryClient();
  const { data: st, isLoading, error, refetch } = useQuery({
    queryKey: ["change-approval-status"],
    queryFn: async () => {
      const r = await approvalStatus();
      if ("error" in r) throw r.error;
      return r.data;
    },
  });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inFlight = useRef(false);
  const s: ApprovalSettings | null = st?.settings ?? null;

  const change = async (patch: Partial<ApprovalSettings>) => {
    if (!s || inFlight.current || !checkReason(reason, REASON_MIN).ok) return;
    inFlight.current = true;
    setBusy(true);
    setMsg(null);
    try {
      const why = cleanReason(reason);
      const r = await setApprovalSettings(patch, why);
      if ("error" in r) {
        if (isApprovalRequired(r.error.code, r.error.detail)) {
          const q = await requestApproval("settings", "set_change_approval_settings", { patch, reason: why }, null);
          setMsg("error" in q ? approvalErrorText(q.error.code, q.error.detail) : "Sent to the other administrator: it changes when they approve.");
        } else {
          setMsg(approvalErrorText(r.error.code, r.error.detail));
        }
      } else {
        setMsg("Saved.");
        setReason("");
      }
      void refetch();
      void qc.invalidateQueries({ queryKey: ["change-approvals"] });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const reasonOk = checkReason(reason, REASON_MIN).ok;
  const turnOff = s ? { ...s, enabled: false } : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          Second administrator for big money changes
        </CardTitle>
        <CardDescription>
          When this is on, a change that corrects a confirmed month, reaches a closed payroll month, unfreezes a bill, carries pay
          forward, or reaches settled bills of {s?.min_families ?? 3}+ families or {Number(s?.min_paid_vnd ?? 5000000).toLocaleString()} VND+
          paid waits until another administrator approves it. The person who asks can never approve it themselves.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading && <p className="text-muted-foreground" role="status">Loading...</p>}
        {error && <p role="alert">The setting could not be read. If the approval step of the database update is not applied yet, approval is simply not there.</p>}
        {st && s && (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={st.enabled ? "destructive" : "outline"}>{st.enabled ? "On" : "Off"}</Badge>
              {st.rolled_back && <Badge variant="outline">Rolled back: reads as off</Badge>}
              <Badge variant="outline">{st.admin_count} administrator{st.admin_count === 1 ? "" : "s"}</Badge>
              {st.pending > 0 && <Badge variant="outline">{st.pending} waiting</Badge>}
              <Badge variant="outline">Requests expire after {Math.round(s.expiry_hours / 24)} days</Badge>
              <Badge variant="outline">{s.solo_release_after_hours ? `Asker may do it alone after ${s.solo_release_after_hours} h` : "Never done alone"}</Badge>
            </div>
            {!st.can_switch_on && !st.enabled && (
              <p className="text-muted-foreground">It can be switched on only with two administrators{st.installed ? "" : ", once the approval step is installed"}.</p>
            )}
            <ReasonField label="Why are you changing this? (required)" value={reason} onChange={setReason} min={REASON_MIN} disabled={busy} />
            <div className="flex flex-wrap gap-2">
              {!st.enabled ? (
                <Button className="min-h-11" disabled={busy || !reasonOk || !st.can_switch_on} onClick={() => change({ enabled: true })}>
                  {busy && <Loader2 className="animate-spin" aria-hidden="true" />} Switch on
                </Button>
              ) : (
                <Button variant="outline" className="min-h-11" disabled={busy || !reasonOk} onClick={() => change({ enabled: false })}>
                  {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {turnOff && settingsLoosen(s, turnOff) ? "Ask the other administrator to switch it off" : "Switch off"}
                </Button>
              )}
            </div>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">If the school is left with one administrator</summary>
              <p className="mt-1 break-words">The owner can switch it off in the SQL editor: <code>{st.off_statement}</code></p>
              <p className="mt-1">Administrators now: check the list on the day it is switched on; a second login held by the same person defeats the rule.</p>
            </details>
          </>
        )}
        {msg && <p role="status" className="break-words font-medium">{msg}</p>}
      </CardContent>
    </Card>
  );
}
