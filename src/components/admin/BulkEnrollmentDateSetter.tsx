import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";

export const BulkEnrollmentDateSetter = () => {
  const [targetDate, setTargetDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterClass, setFilterClass] = useState<string>("all");
  const [showPreview, setShowPreview] = useState(false);
  const queryClient = useQueryClient();

  const { data: classes } = useQuery({
    queryKey: ["active-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: previewData } = useQuery({
    queryKey: ["enrollment-bulk-preview", filterClass, targetDate],
    queryFn: async () => {
      let query = supabase
        .from("enrollments")
        .select(`
          id,
          start_date,
          student_id,
          class_id,
          students(full_name),
          classes(name)
        `)
        .is("end_date", null);

      if (filterClass !== "all") {
        query = query.eq("class_id", filterClass);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: showPreview,
  });

  // D4 step 3B (G-13): every start date goes through the checked path as
  // the signed-in admin, 50 a call. A date that only moves days of this
  // month is tier 0 and is made at once; one whose moved days reach a billed
  // month opens the reason dialog, one enrolment at a time. Each change
  // leaves its own row (who, when, why, before and after).
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["class-enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["enrollment-bulk-preview"] });
  };
  const money = useMoneyInput(refresh);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const enrollmentIds = previewData?.map((e) => e.id) || [];

      if (enrollmentIds.length === 0) {
        throw new Error("No enrollments to update");
      }

      const out = await money.runMany(enrollmentIds.map((id) => ({
        entity: "enrollment",
        op: "set_start_date",
        args: { enrollment_id: id, start_date: targetDate },
      })));
      if (out.error) throw new Error(out.error);
      return out;
    },
    onSuccess: (out) => {
      if (out.done > 0) toast.success(`Updated ${out.done} enrollment dates`);
      if (out.unchanged > 0 && out.done === 0 && out.needReason.length === 0) toast.message("Those enrolments already start on that date");
      if (out.refused.length > 0) toast.error(`${out.refused.length} could not be changed: ${out.refused[0].message}`);
      if (out.needReason.length > 0) {
        toast.message(`${out.needReason.length} of these reach months already billed: a reason is asked for each`);
      } else {
        setShowPreview(false);
      }
      refresh();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update enrollment dates");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Bulk Set Enrollment Date
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bulk-enrol-target-date">Target Date</Label>
            <Input
              id="bulk-enrol-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-enrol-class">Filter by Class</Label>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger id="bulk-enrol-class">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes?.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!showPreview ? (
          <Button onClick={() => setShowPreview(true)} className="w-full sm:w-auto">
            Preview Changes
          </Button>
        ) : (
          <>
            <div className="rounded-hec-md border border-hec-danger/30 bg-hec-danger-tint p-4 text-hec-ink">
              <div className="mb-3 flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-hec-danger" />
                <div className="min-w-0">
                  <p className="font-semibold text-hec-ink">Preview: {previewData?.length || 0} enrollments will be updated</p>
                  <p className="mt-1 text-hec-small text-hec-ink-soft">
                    All selected enrollments will have their start date set to {format(new Date(targetDate), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
              {previewData && previewData.length > 0 && (
                <div tabIndex={0} role="region" aria-label="Enrollments to update" className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-hec-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
                  {previewData.slice(0, 10).map((e) => (
                    <div key={e.id} className="flex items-start justify-between gap-4 text-hec-small">
                      <span className="min-w-0 whitespace-normal break-words hyphens-none text-hec-ink">{e.students?.full_name} - {e.classes?.name}</span>
                      <span className="shrink-0 whitespace-nowrap tabular-nums text-hec-ink-soft">
                        {format(new Date(e.start_date), "yyyy-MM-dd")} → {targetDate}
                      </span>
                    </div>
                  ))}
                  {previewData.length > 10 && (
                    <p className="text-hec-caption text-hec-ink-soft">
                      ...and {previewData.length - 10} more
                    </p>
                  )}
                </div>
              )}
            </div>
            {/* Ivory: overwriting every listed start date cannot be undone from
                here, so it is the one red fill and says what it does; the safe
                way back is the outline button, under the thumb at 375. */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                onClick={() => setShowPreview(false)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !previewData?.length}
                className="w-full sm:w-auto"
              >
                {updateMutation.isPending ? "Setting start dates..." : "Set start dates"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
      <MoneyInputDialog
        guard={money.guard}
        subject={(() => {
          const e = previewData?.find((x) => x.id === money.guard.request?.args?.enrollment_id);
          return e ? `${e.students?.full_name ?? ""} - ${e.classes?.name ?? ""}` : undefined;
        })()}
        names={Object.fromEntries((previewData ?? []).map((e) => [e.student_id, e.students?.full_name ?? "A child"]))}
      />
    </Card>
  );
};
