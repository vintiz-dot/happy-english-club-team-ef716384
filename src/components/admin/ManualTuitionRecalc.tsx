import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calculator } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatVND } from "@/lib/money";
import type { Json } from "@/integrations/supabase/types";

interface Student {
  id: string;
  full_name: string;
}

interface Figures {
  base_amount: number;
  total_discount: number;
  total_amount: number;
}

interface HeldInfo {
  message?: string;
  lessons: Array<{ date: string; class_name: string }>;
  register_base: number;
  saved_base: number;
  /** True when the month was priced with the unmarked lessons counted, so the bill did not go down. */
  priced_as_charged?: boolean;
}

const figuresOf = (r: any): Figures => ({
  base_amount: Number(r?.base_amount ?? 0),
  total_discount: Number(r?.discount_amount ?? 0),
  total_amount: Number(r?.total_amount ?? 0),
});

function Compare({ before, after }: { before: Figures | null; after: Figures }) {
  const rows: Array<[string, keyof Figures]> = [
    ["Base amount", "base_amount"],
    ["Total discount", "total_discount"],
    ["Total amount", "total_amount"],
  ];
  return (
    <table className="text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="pr-4 font-normal" />
          <th className="pr-4 font-normal">Saved before</th>
          <th className="font-normal">Now</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, key]) => (
          <tr key={key}>
            <td className="pr-4">{label}</td>
            <td className="pr-4">{before ? formatVND(before[key]) : "No bill yet"}</td>
            <td>{formatVND(after[key])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ManualTuitionRecalc() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [before, setBefore] = useState<Figures | null>(null);
  const [held, setHeld] = useState<HeldInfo | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name");

    if (data) setStudents(data);
  };

  // One call to calculate-tuition. Without `force` it never lowers a saved bill
  // because lessons have no mark; it answers `held` instead.
  const recalc = async (force: boolean) => {
    if (!selectedStudent || !month) {
      toast.error("Please select student and month");
      return;
    }
    if (force && reason.trim().length < 3) {
      toast.error("Write why the lower figure is right");
      return;
    }

    setLoading(true);
    try {
      // What is saved now, read before anything is changed.
      const { data: saved, error: savedError } = await supabase
        .from("invoices")
        .select("base_amount, discount_amount, total_amount")
        .eq("student_id", selectedStudent)
        .eq("month", month)
        .maybeSingle();
      if (savedError) throw savedError;
      const oldFigures = saved ? figuresOf(saved) : null;

      const { data, error } = await supabase.functions.invoke("calculate-tuition", {
        body: force
          ? { studentId: selectedStudent, month, force: true, reason: reason.trim() }
          : { studentId: selectedStudent, month },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setBefore(oldFigures);

      // Only a truly held answer stops here. A priced-as-charged answer is a normal
      // save (the bill may have moved): it is shown and logged below.
      if (data?.held && !data.held.priced_as_charged) {
        setResult(null);
        setHeld(data.held as HeldInfo);
        toast.warning("Held: the saved bill was not changed");
        return;
      }

      setHeld(null);
      setResult(data);
      // Only the server says whether the lower figure was really forced: if the
      // holes were fixed meanwhile it saved the register's figure as usual.
      const reallyForced = force && data?.missingMarks?.forcedLower === true;
      toast.success(reallyForced ? "Lower figure saved" : "Tuition recalculated successfully");

      // Log audit: the old figures, the new figures, why, and who.
      const { data: userData } = await supabase.auth.getUser();
      const actor = userData?.user?.id ?? null;
      // Plain JSON values, so the audit row's diff type-checks without a cast.
      const newFigures: { [key: string]: Json } = {
        base_amount: Number(data.baseAmount ?? 0),
        total_discount: Number(data.totalDiscount ?? 0),
        total_amount: Number(data.totalAmount ?? 0),
      };
      const oldJson: { [key: string]: Json } | null = oldFigures
        ? { base_amount: oldFigures.base_amount, total_discount: oldFigures.total_discount, total_amount: oldFigures.total_amount }
        : null;
      await supabase.from("audit_log").insert({
        action: reallyForced ? "manual_tuition_recalc_forced_lower" : "manual_tuition_recalc",
        entity: "invoice",
        entity_id: `${selectedStudent}-${month}`,
        actor_user_id: actor,
        diff: {
          student_id: selectedStudent,
          month,
          actor_user_id: actor,
          reason: reallyForced ? reason.trim() : null,
          old: oldJson,
          new: newFigures,
          // Kept under the old key too, for anything that already reads it.
          result: newFigures,
        },
      });
      if (force) setReason("");
    } catch (error: any) {
      toast.error(error.message || "Failed to recalculate");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Manual Tuition Recalculation
        </CardTitle>
        <CardDescription>
          Recalculate tuition for a specific student and month. A saved bill is not made lower when lessons have no mark.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select
              value={selectedStudent}
              onValueChange={(v) => {
                setSelectedStudent(v);
                setHeld(null);
                setResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Month (YYYY-MM)</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setHeld(null);
                setResult(null);
              }}
            />
          </div>
        </div>

        {held && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold">The bill was not changed</p>
                <p className="text-sm">
                  {held.message ||
                    `${held.lessons.length} lessons have no mark. The bill stays as charged until the register is fixed.`}
                </p>
                <ul className="text-sm list-disc pl-5">
                  {held.lessons.map((l, i) => (
                    <li key={`${l.date}-${i}`}>
                      {l.date} - {l.class_name}
                    </li>
                  ))}
                </ul>
                <p className="text-sm">
                  Saved bill: {formatVND(held.saved_base)}. The register would make it {formatVND(held.register_base)}.
                </p>
                <p className="text-sm">
                  Mark those lessons in the register first. Only save the lower figure if the child really did not have these lessons.
                </p>
                <div className="space-y-2">
                  <Label>Why is the lower figure right?</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Write the reason" />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => recalc(true)}
                  disabled={loading || reason.trim().length < 3}
                >
                  Save the lower figure anyway
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Recalculation Complete</p>
                <Compare
                  before={before}
                  after={{
                    base_amount: Number(result.baseAmount ?? 0),
                    total_discount: Number(result.totalDiscount ?? 0),
                    total_amount: Number(result.totalAmount ?? 0),
                  }}
                />
                <div className="text-sm space-y-1">
                  <p>Sessions: {result.sessionCount}</p>
                  <p>Status: {result.carry?.status || "unknown"}</p>
                  {result.carry?.carryOutDebt > 0 && (
                    <p className="text-destructive">Debt: {formatVND(result.carry.carryOutDebt)}</p>
                  )}
                  {result.carry?.carryOutCredit > 0 && (
                    <p className="text-success">Credit: {formatVND(result.carry.carryOutCredit)}</p>
                  )}
                  {result.held?.priced_as_charged && (
                    <p>{result.held.lessons?.length ?? 0} lessons have no mark in the register. They were charged as before.</p>
                  )}
                  {result.missingMarks?.lessons?.length > 0 && (
                    <p>{result.missingMarks.lessons.length} lessons have no mark in the register. They are not charged.</p>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={() => recalc(false)}
          disabled={loading || !selectedStudent || !month}
          className="w-full"
        >
          Recalculate Tuition
        </Button>
      </CardContent>
    </Card>
  );
}
