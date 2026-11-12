import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Edit, XCircle, Trash2, GraduationCap } from "lucide-react";
import { AssignDiscountModal } from "./AssignDiscountModal";
import { EditDiscountModal } from "./EditDiscountModal";
import { EditEnrollmentDiscountModal } from "./EditEnrollmentDiscountModal";
import { SiblingDiscountCard } from "./SiblingDiscountCard";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlaceholderCard } from "@/components/ui/loading";
import { useIvory } from "@/hooks/useIvory";

interface StudentDiscountsTabProps {
  studentId: string;
}

export function StudentDiscountsTab({ studentId }: StudentDiscountsTabProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [endingAssignment, setEndingAssignment] = useState<string | null>(null);
  const [removingAssignment, setRemovingAssignment] = useState<string | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [editingEnrollment, setEditingEnrollment] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["student-discount-assignments", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_assignments")
        .select(`
          *,
          discount_def:discount_definitions(*)
        `)
        .eq("student_id", studentId)
        .order("effective_from", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments, isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ["student-enrollments", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          *,
          classes:class_id(name)
        `)
        .eq("student_id", studentId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const endAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const effectiveTo = yesterday.toISOString().slice(0, 10);

      const { error } = await supabase
        .from("discount_assignments")
        .update({ effective_to: effectiveTo })
        .eq("id", assignmentId);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_log").insert({
        entity: "discount_assignment",
        entity_id: assignmentId,
        action: "end",
        diff: { effective_to: effectiveTo },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-discount-assignments", studentId] });
      toast({
        title: "Success",
        description: "Discount assignment ended",
      });
      setEndingAssignment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("discount_assignments").delete().eq("id", assignmentId);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_log").insert({
        entity: "discount_assignment",
        entity_id: assignmentId,
        action: "delete",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-discount-assignments", studentId] });
      toast({
        title: "Success",
        description: "Discount assignment removed",
      });
      setRemovingAssignment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatus = (assignment: any) => {
    const today = new Date().toISOString().slice(0, 10);
    if (assignment.effective_to && assignment.effective_to < today) {
      return { label: "Ended", variant: "secondary" as const };
    }
    if (assignment.effective_from > today) {
      return { label: "Scheduled", variant: "default" as const };
    }
    return { label: "Active", variant: "default" as const };
  };

  return (
    <div className="space-y-6">
      <SiblingDiscountCard studentId={studentId} />
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className={iv("h-5 w-5 shrink-0 text-hec-ink-soft", "h-5 w-5")} />
            <div className={iv("min-w-0", "")}>
              <CardTitle>Enrollment Discounts</CardTitle>
              <CardDescription>
                Discounts applied at the enrollment level for specific classes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEnrollments ? (
            <PlaceholderCard rows={3} />
          ) : !enrollments || enrollments.length === 0 ? (
            <div className="text-center py-8">
              <p className={iv("text-hec-body text-hec-ink-soft", "text-muted-foreground")}>No enrollments found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Enrollment Period</TableHead>
                  <TableHead>Rate Override</TableHead>
                  <TableHead>Discount Type</TableHead>
                  <TableHead>Discount Value</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment: any) => {
                  // Get class default rate to show savings
                  const classData = enrollment.classes;
                  const hasRateOverride = enrollment.rate_override_vnd;
                  
                  return (
                    <TableRow key={enrollment.id}>
                      <TableCell className={iv("font-medium whitespace-normal break-words hyphens-none", "font-medium")}>{enrollment.classes.name}</TableCell>
                      <TableCell>
                        <div className={iv("flex items-center gap-1 whitespace-nowrap text-hec-small tabular-nums", "flex items-center gap-1 text-sm")}>
                          <Calendar className="h-3 w-3" />
                          {enrollment.start_date}
                          {enrollment.end_date && ` to ${enrollment.end_date}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hasRateOverride ? (
                          <div className="space-y-1">
                            <Badge variant="default" className={iv("whitespace-nowrap border-hec-line bg-transparent text-hec-ink tabular-nums", "bg-blue-600")}>
                              {enrollment.rate_override_vnd.toLocaleString('vi-VN')} ₫
                            </Badge>
                            <p className={iv("text-hec-caption text-hec-ink-soft", "text-xs text-muted-foreground")}>
                              Custom rate
                            </p>
                          </div>
                        ) : (
                          <span className={iv("text-hec-ink-soft text-hec-small", "text-muted-foreground text-sm")}>Default rate</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {enrollment.discount_type ? (
                          <Badge variant="secondary">
                            {enrollment.discount_type === "percent" ? "Percentage" : "Fixed Amount"}
                          </Badge>
                        ) : (
                          <span className={iv("text-hec-ink-soft", "text-muted-foreground")}>—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {enrollment.discount_value ? (
                          <span className={iv("whitespace-nowrap tabular-nums", "")}>
                            {enrollment.discount_value}
                            {enrollment.discount_type === "percent" ? "%" : " VND"}
                          </span>
                        ) : (
                          <span className={iv("text-hec-ink-soft", "text-muted-foreground")}>—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {enrollment.discount_cadence ? (
                          <Badge variant="outline">
                            {enrollment.discount_cadence === "once" ? "Per Session" : "Monthly"}
                          </Badge>
                        ) : (
                          <span className={iv("text-hec-ink-soft", "text-muted-foreground")}>—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEnrollment(enrollment)}
                          title="Edit enrollment discount"
                          aria-label={ivory ? "Edit enrollment discount" : undefined}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className={iv("flex flex-wrap items-start justify-between gap-3", "flex items-center justify-between")}>
            <div className={iv("min-w-0 flex-1 basis-60", "")}>
              <CardTitle>Special Discounts</CardTitle>
              <CardDescription>
                Assigned special discounts for this student. These are separate from enrollment-level and sibling discounts.
              </CardDescription>
            </div>
            <Button onClick={() => setShowAssignModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Discount
            </Button>
          </div>
        </CardHeader>
        <CardContent>
        {isLoading ? (
          <PlaceholderCard rows={3} />
        ) : !assignments || assignments.length === 0 ? (
          <div className="text-center py-8">
            <p className={iv("text-hec-body text-hec-ink-soft", "text-muted-foreground")}>No special discounts assigned yet</p>
            <p className={iv("text-hec-small text-hec-ink-soft mt-2", "text-sm text-muted-foreground mt-2")}>
              Click "Add Discount" to assign a special discount to this student
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type/Value</TableHead>
                <TableHead>Effective Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment: any) => {
                const status = getStatus(assignment);
                const isActive = status.label === "Active";
                return (
                  <TableRow key={assignment.id}>
                    <TableCell className={iv("font-medium whitespace-normal break-words", "font-medium")}>{assignment.discount_def.name}</TableCell>
                    <TableCell className={ivory ? "tabular-nums" : undefined}>
                      {assignment.discount_def.value}
                      {assignment.discount_def.type === "percent" ? "%" : " VND"} - {assignment.discount_def.cadence}
                    </TableCell>
                    <TableCell>
                      <div className={iv("flex items-center gap-1 whitespace-nowrap text-hec-small tabular-nums", "flex items-center gap-1 text-sm")}>
                        <Calendar className="h-3 w-3" />
                        {assignment.effective_from}
                        {assignment.effective_to && ` to ${assignment.effective_to}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className={ivory ? (status.label === "Active" ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf" : status.label === "Scheduled" ? "border-hec-line bg-hec-sunken text-hec-ink" : "border-hec-line bg-hec-sunken text-hec-ink-soft") : status.label === "Active" ? "bg-green-500" : status.label === "Scheduled" ? "bg-blue-500" : ""}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className={iv("text-hec-small text-hec-ink-soft max-w-xs truncate", "text-sm text-muted-foreground max-w-xs truncate")}>
                      {assignment.note || "-"}
                    </TableCell>
                    <TableCell>
                      <div className={iv("flex gap-2", "flex gap-1")}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingAssignment(assignment)}
                          title="Edit this discount"
                          aria-label={ivory ? "Edit this discount" : undefined}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEndingAssignment(assignment.id)}
                            title="End this discount now"
                            aria-label={ivory ? "End this discount now" : undefined}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemovingAssignment(assignment.id)}
                          title="Remove this assignment"
                          aria-label={ivory ? "Remove this assignment" : undefined}
                          className={ivory ? "text-hec-danger hover:bg-hec-danger-tint" : undefined}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AssignDiscountModal
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        studentId={studentId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["student-discount-assignments", studentId] })}
      />

      <AlertDialog open={!!endingAssignment} onOpenChange={() => setEndingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Discount Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the effective end date to yesterday, stopping this discount from applying to future tuition calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ivory ? "Keep the discount" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className={ivory ? "bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90" : undefined}
              onClick={() => endingAssignment && endAssignmentMutation.mutate(endingAssignment)}
            >
              {ivory ? "End the discount" : "End Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removingAssignment} onOpenChange={() => setRemovingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Discount Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this discount assignment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ivory ? "Keep the assignment" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingAssignment && removeAssignmentMutation.mutate(removingAssignment)}
              className={iv("bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90", "bg-destructive text-destructive-foreground")}
            >
              {ivory ? "Remove the assignment" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingAssignment && (
        <EditDiscountModal
          open={!!editingAssignment}
          onOpenChange={(open) => !open && setEditingAssignment(null)}
          assignment={{
            id: editingAssignment.id,
            effective_from: editingAssignment.effective_from,
            effective_to: editingAssignment.effective_to,
            note: editingAssignment.note,
            discount_definitions: {
              name: editingAssignment.discount_def.name,
            },
          }}
          studentId={studentId}
        />
      )}

      {editingEnrollment && (
        <EditEnrollmentDiscountModal
          open={!!editingEnrollment}
          onOpenChange={(open) => !open && setEditingEnrollment(null)}
          enrollment={editingEnrollment}
          studentId={studentId}
        />
      )}
    </Card>
    </div>
  );
}
