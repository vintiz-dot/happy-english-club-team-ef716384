import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calculator } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatVND } from "@/lib/money";

interface Student {
  id: string;
  full_name: string;
}

export function ManualTuitionRecalc() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

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

  const handleRecalculate = async () => {
    if (!selectedStudent || !month) {
      toast.error("Please select student and month");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-tuition", {
        body: { studentId: selectedStudent, month },
      });

      if (error) throw error;

      setResult(data);
      toast.success("Tuition recalculated successfully");

      // Log audit
      await supabase.from("audit_log").insert({
        action: "manual_tuition_recalc",
        entity: "invoice",
        entity_id: `${selectedStudent}-${month}`,
        diff: {
          student_id: selectedStudent,
          month,
          result: {
            base_amount: data.baseAmount,
            total_discount: data.totalDiscount,
            total_amount: data.totalAmount,
          },
        },
      });
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
          Force recalculate tuition for a specific student and month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
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
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        </div>

        {result && (
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Recalculation Complete</p>
                <div className="text-sm space-y-1">
                  <p>Sessions: {result.sessionCount}</p>
                  <p>Base Amount: {formatVND(result.baseAmount)}</p>
                  <p>Total Discount: {formatVND(result.totalDiscount)}</p>
                  <p>Total Amount: {formatVND(result.totalAmount)}</p>
                  <p>Status: {result.carry?.status || "unknown"}</p>
                  {result.carry?.carryOutDebt > 0 && (
                    <p className="text-destructive">Debt: {formatVND(result.carry.carryOutDebt)}</p>
                  )}
                  {result.carry?.carryOutCredit > 0 && (
                    <p className="text-success">Credit: {formatVND(result.carry.carryOutCredit)}</p>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleRecalculate}
          disabled={loading || !selectedStudent || !month}
          className="w-full"
        >
          Recalculate Tuition
        </Button>
      </CardContent>
    </Card>
  );
}
