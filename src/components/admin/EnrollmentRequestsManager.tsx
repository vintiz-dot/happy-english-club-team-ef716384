import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Inbox, Loader2 } from "lucide-react";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";

export function EnrollmentRequestsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-enrollment-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollment_requests" as any)
        .select("*, students(full_name), classes(name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
  });

  const markResolved = async (requestId: string, action: "approved" | "declined") => {
    const { error } = await supabase
      .from("enrollment_requests" as any)
      .update({
        status: action,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      })
      .eq("id", requestId);
    if (error) throw error;
  };
  const announce = (action: "approved" | "declined") => {
    toast({
      title: action === "approved" ? "Student Enrolled ✅" : "Request Declined",
      description: action === "approved"
        ? "The student has been enrolled in the class."
        : "The request has been declined.",
    });
    queryClient.invalidateQueries({ queryKey: ["admin-enrollment-requests"] });
    queryClient.invalidateQueries({ queryKey: ["students"] });
  };

  // D4 step 3B (G-13): approving enrols through the checked path as the
  // signed-in admin, from today. That is tier 0 unless a bill of this month is
  // already signed off for the family; then the dialog asks for a reason. The
  // request is marked approved only AFTER the child is enrolled.
  const approving = useRef<string | null>(null);
  const money = useMoneyInput(async () => {
    const requestId = approving.current;
    approving.current = null;
    if (!requestId) return;
    try {
      await markResolved(requestId, "approved");
      announce("approved");
    } catch (err: any) {
      toast({ title: "Enrolled, but the request is still listed", description: err.message, variant: "destructive" });
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ requestId, action, studentId, classId }: {
      requestId: string;
      action: "approved" | "declined";
      studentId: string;
      classId: string;
    }): Promise<"done" | "dialog"> => {
      if (action === "declined") {
        await markResolved(requestId, action);
        return "done";
      }
      const r = await money.run({
        entity: "enrollment",
        op: "enroll",
        args: { student_id: studentId, class_id: classId, start_date: new Date().toISOString().split("T")[0] },
      });
      if (r.status === "refused") throw new Error(r.message);
      if (r.status === "dialog") {
        approving.current = requestId;
        return "dialog";
      }
      await markResolved(requestId, action);
      return "done";
    },
    onSuccess: (state, vars) => {
      if (state === "done") announce(vars.action);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-hec-ink-faint" aria-hidden />
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Inbox className="h-5 w-5 shrink-0" aria-hidden />
          Enrollment Requests
          <Badge variant="warning" className="font-sans tabular-nums">{requests.length}</Badge>
        </CardTitle>
        <CardDescription>Students requesting to join classes</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="rounded-hec-lg border border-hec-line bg-hec-surface">
        {requests.map((req: any) => (
          <li key={req.id} className="flex flex-col gap-3 border-b border-hec-line px-4 py-3 last:border-b-0 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{req.students?.full_name}</p>
              <p className="text-hec-small text-hec-ink-soft">
                Wants to join <span className="break-words font-medium text-hec-ink">{req.classes?.name}</span>
              </p>
              {req.message && (
                <p className="break-words text-hec-caption italic text-hec-ink-soft">"{req.message}"</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                aria-label={`Decline ${req.students?.full_name ?? "request"}`}
                onClick={() => resolveMutation.mutate({
                  requestId: req.id,
                  action: "declined",
                  studentId: req.student_id,
                  classId: req.class_id,
                })}
                disabled={resolveMutation.isPending}
              >
                <X className="h-5 w-5" aria-hidden />
              </Button>
              <Button
                size="sm"
                onClick={() => resolveMutation.mutate({
                  requestId: req.id,
                  action: "approved",
                  studentId: req.student_id,
                  classId: req.class_id,
                })}
                disabled={resolveMutation.isPending}
              >
                <Check className="h-4 w-4" aria-hidden />
                Approve
              </Button>
            </div>
          </li>
        ))}
        </ul>
      </CardContent>
      <MoneyInputDialog
        guard={money.guard}
        names={Object.fromEntries((requests ?? []).map((r: any) => [r.student_id, r.students?.full_name ?? "A child"]))}
      />
    </Card>
  );
}
