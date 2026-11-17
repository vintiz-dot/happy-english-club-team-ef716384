import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { waitsFor } from "@/lib/approvals";
import { approvalStatus, loadQueue } from "./api";

/**
 * "N changes are waiting for a second administrator" (D4 step 4). With a
 * `targetKey` ("attendance:<lesson id>", "session:<id>", "pay_adjustment:<month>:<person>")
 * it says whether that one thing waits. Renders nothing while approval is
 * off, not installed, or nothing waits - and on any read error (a badge is
 * a hint; the database still refuses what needs approval).
 */
export function PendingApprovalBadge({ targetKey, className }: { targetKey?: string; className?: string }) {
  const { data } = useQuery({
    queryKey: ["change-approval-badge", targetKey ?? "all"],
    queryFn: async () => {
      if (targetKey) return { one: waitsFor(await loadQueue(), targetKey) };
      const r = await approvalStatus();
      return { pending: "error" in r ? 0 : Number(r.data?.pending ?? 0) + Number(r.data?.released_unread ?? 0) };
    },
    staleTime: 30_000,
    retry: false,
  });
  if (targetKey) {
    if (!data?.one) return null;
    return <Badge variant="outline" className={className}>Waiting for a second administrator</Badge>;
  }
  const n = data?.pending ?? 0;
  if (n <= 0) return null;
  return (
    <Badge variant="destructive" className={className}>
      {n} change{n === 1 ? " is" : "s are"} waiting for a second administrator
    </Badge>
  );
}
