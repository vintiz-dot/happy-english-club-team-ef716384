import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Inbox, Loader2 } from "lucide-react";

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

  const resolveMutation = useMutation({
    mutationFn: async ({ requestId, action, studentId, classId }: {
      requestId: string;
      action: "approved" | "declined";
      studentId: string;
      classId: string;
    }) => {
      // Update request status
      const { error: updateError } = await supabase
        .from("enrollment_requests" as any)
        .update({
          status: action,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq("id", requestId);
      if (updateError) throw updateError;

      // If approved, create enrollment
      if (action === "approved") {
        const { error: enrollError } = await supabase
          .from("enrollments")
          .insert({
            student_id: studentId,
            class_id: classId,
            start_date: new Date().toISOString().split("T")[0],
          });
        if (enrollError) throw enrollError;
      }
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.action === "approved" ? "Student Enrolled ✅" : "Request Declined",
        description: vars.action === "approved"
          ? "The student has been enrolled in the class."
          : "The request has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-enrollment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          Enrollment Requests
          <Badge variant="destructive" className="ml-2">{requests.length}</Badge>
        </CardTitle>
        <CardDescription>Students requesting to join classes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((req: any) => (
          <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="font-medium truncate">{req.students?.full_name}</p>
              <p className="text-sm text-muted-foreground">
                Wants to join <span className="font-medium text-foreground">{req.classes?.name}</span>
              </p>
              {req.message && (
                <p className="text-xs text-muted-foreground italic">"{req.message}"</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => resolveMutation.mutate({
                  requestId: req.id,
                  action: "declined",
                  studentId: req.student_id,
                  classId: req.class_id,
                })}
                disabled={resolveMutation.isPending}
              >
                <X className="h-4 w-4" />
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
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
