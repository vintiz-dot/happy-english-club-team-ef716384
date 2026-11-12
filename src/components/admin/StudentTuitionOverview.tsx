import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { studentsInMonthOrClause } from "@/lib/finance/studentsInMonth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Loader2, ArrowUpDown } from "lucide-react";
import { InvoiceDownloadButton } from "@/components/invoice/InvoiceDownloadButton";
import { useState, useMemo, useEffect } from "react";
import { siblingRetryDelayMs } from "@/lib/siblingRetry";
import { useNavigate } from "react-router-dom";
import { useIvory } from "@/hooks/useIvory";

interface TuitionData {
  studentId: string;
  month: string;
  baseAmount: number;
  totalDiscount: number;
  totalAmount: number;
  sessionCount: number;
  payments?: {
    monthPayments: number;
    cumulativePaidAmount: number;
  };
  carry?: {
    carryOutCredit: number;
    carryOutDebt: number;
    status: string;
  };
  siblingState?: {
    status: string;
    percent: number;
    isWinner?: boolean;
    reason?: string;
  };
}

export function StudentTuitionOverview() {
  const navigate = useNavigate();
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);
  // Ivory: amounts are ink, sans, tabular and never wrap (DESIGN_SYSTEM s.14).
  const amount = "whitespace-nowrap text-right font-sans tabular-nums text-hec-ink";
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [sortBy, setSortBy] = useState<"name" | "class" | "balance" | "total">("name");

  const { data: students, isLoading: studentsLoading } = useQuery({
    // Month-scoped: the roster depends on which month is selected, so a
    // student deactivated later still appears in their earlier months.
    queryKey: ["students-in-month", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, family:families(name)")
        .or(studentsInMonthOrClause(selectedMonth))
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch enrollments to get class info
  const { data: enrollments } = useQuery({
    queryKey: ["student-enrollments", selectedMonth],
    queryFn: async () => {
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = new Date(Date.UTC(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0))
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from("enrollments")
        .select(
          `
          student_id,
          classes(id, name)
        `,
        )
        .lte("start_date", monthEnd)
        .or(`end_date.is.null,end_date.gte.${monthStart}`);

      if (error) throw error;

      // Map student to classes
      const studentClasses = new Map<string, string[]>();
      data?.forEach((e) => {
        const existing = studentClasses.get(e.student_id) || [];
        if (e.classes) {
          const className = Array.isArray(e.classes) ? e.classes[0]?.name : e.classes.name;
          if (className) existing.push(className);
        }
        studentClasses.set(e.student_id, existing);
      });

      return studentClasses;
    },
  });

  const { data: tuitionData, isLoading: tuitionLoading } = useQuery({
    queryKey: ["all-student-tuition", selectedMonth, students],
    queryFn: async () => {
      if (!students?.length) return [];

      const results = await Promise.all(
        students.map(async (student) => {
          try {
            const { data, error } = await supabase.functions.invoke("calculate-tuition", {
              body: { studentId: student.id, month: selectedMonth },
            });

            if (error) throw error;
            return data as TuitionData;
          } catch (err) {
            console.error(`Error fetching tuition for ${student.full_name}:`, err);
            return null;
          }
        }),
      );

      return results.filter((r): r is TuitionData => r !== null);
    },
    enabled: !!students?.length,
  });

  // Students whose family discount was still being worked out are asked
  // again on their own, one by one, so the admin never has to refresh.
  const queryClient = useQueryClient();
  const [retryAttempt, setRetryAttempt] = useState(0);
  const unresolvedIds = useMemo(
    () => (tuitionData ?? []).filter((t) => t.siblingState?.status === "unresolved").map((t) => t.studentId),
    [tuitionData],
  );
  useEffect(() => setRetryAttempt(0), [selectedMonth]);
  useEffect(() => {
    const delay = siblingRetryDelayMs(unresolvedIds.length ? "unresolved" : null, retryAttempt);
    if (delay === false) return;
    const key = ["all-student-tuition", selectedMonth, students];
    const timer = setTimeout(async () => {
      const fresh = await Promise.all(
        unresolvedIds.map(async (studentId) => {
          const { data, error } = await supabase.functions.invoke("calculate-tuition", {
            body: { studentId, month: selectedMonth },
          });
          return error || !data ? null : (data as TuitionData);
        }),
      );
      queryClient.setQueryData<TuitionData[]>(key, (prev) =>
        (prev ?? []).map((row) => fresh.find((f) => f?.studentId === row.studentId) ?? row),
      );
      setRetryAttempt((n) => n + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [unresolvedIds, retryAttempt, selectedMonth, students, queryClient]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -2; i <= 2; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      options.push({ value, label });
    }
    return options;
  };

  // Sort students based on selected sort option
  const sortedStudents = useMemo(() => {
    if (!students) return [];

    return [...students].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.full_name.localeCompare(b.full_name);
        case "class":
          const aClass = enrollments?.get(a.id)?.[0] || "";
          const bClass = enrollments?.get(b.id)?.[0] || "";
          return aClass.localeCompare(bClass);
        case "balance":
          const aTuition = tuitionData?.find((t) => t.studentId === a.id);
          const bTuition = tuitionData?.find((t) => t.studentId === b.id);
          const aBalance = aTuition?.carry?.status === "debt" ? aTuition?.carry?.carryOutDebt || 0 : 0;
          const bBalance = bTuition?.carry?.status === "debt" ? bTuition?.carry?.carryOutDebt || 0 : 0;
          return bBalance - aBalance;
        case "total":
          const aTotal = tuitionData?.find((t) => t.studentId === a.id)?.totalAmount || 0;
          const bTotal = tuitionData?.find((t) => t.studentId === b.id)?.totalAmount || 0;
          return bTotal - aTotal;
        default:
          return 0;
      }
    });
  }, [students, sortBy, enrollments, tuitionData]);

  if (studentsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className={iv("h-6 w-6 animate-spin text-hec-ink-soft", "h-6 w-6 animate-spin text-muted-foreground")} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className={iv("flex flex-wrap items-center justify-between gap-4", "flex items-center justify-between")}>
          <div className={iv("min-w-0", "")}>
            <CardTitle>Student Tuition Overview</CardTitle>
            <CardDescription>View tuition details for all active students</CardDescription>
          </div>
          <div className={iv("flex flex-wrap items-center gap-3", "flex items-center gap-3")}>
            <div className="flex items-center gap-2">
              <ArrowUpDown className={iv("h-4 w-4 text-hec-ink-soft", "h-4 w-4 text-muted-foreground")} />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="balance">Balance</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tuitionLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className={iv("h-6 w-6 animate-spin text-hec-ink-soft", "h-6 w-6 animate-spin text-muted-foreground")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Base Amount</TableHead>
                <TableHead className="text-right">Discounts</TableHead>
                <TableHead className="text-right">Total Payable</TableHead>
                <TableHead className="text-right">Recorded Pay</TableHead>
                <TableHead>Balance / Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudents?.map((student) => {
                const tuition = tuitionData?.find((t) => t.studentId === student.id);
                const recordedPay = tuition?.payments?.cumulativePaidAmount || 0;
                const balanceStatus = tuition?.carry?.status || "settled";
                const balanceAmount =
                  balanceStatus === "credit"
                    ? tuition?.carry?.carryOutCredit || 0
                    : balanceStatus === "debt"
                      ? tuition?.carry?.carryOutDebt || 0
                      : 0;

                return (
                  <TableRow
                    key={student.id}
                    className={iv("cursor-pointer hover:bg-hec-sunken/60", "cursor-pointer hover:bg-muted/50")}
                    onClick={() => navigate(`/students/${student.id}`)}
                  >
                    <TableCell className={iv("whitespace-normal break-words font-medium text-hec-ink", "font-medium")}>{student.full_name}</TableCell>
                    <TableCell className={iv("whitespace-normal break-words text-hec-ink-soft", "text-muted-foreground")}>{student.family?.name || "—"}</TableCell>
                    <TableCell className={iv("whitespace-normal break-words text-hec-ink-soft", "text-muted-foreground")}>
                      {enrollments?.get(student.id)?.join(", ") || "—"}
                    </TableCell>
                    <TableCell className={iv(amount, "text-right")}>{tuition?.sessionCount || 0}</TableCell>
                    <TableCell className={iv(amount, "text-right")}>{tuition ? formatVND(tuition.baseAmount) : "—"}</TableCell>
                    <TableCell className={iv(amount, "text-right text-green-600")}>
                      {tuition && tuition.totalDiscount > 0 ? `-${formatVND(tuition.totalDiscount)}` : "—"}
                    </TableCell>
                    <TableCell className={iv(`${amount} font-semibold`, "text-right font-semibold")}>
                      {tuition ? formatVND(tuition.totalAmount) : "—"}
                    </TableCell>
                    <TableCell className={iv(amount, "text-right font-medium text-blue-600")}>
                      {recordedPay > 0 ? formatVND(recordedPay) : "—"}
                    </TableCell>
                    <TableCell>
                      {balanceStatus === "credit" && balanceAmount > 0 && (
                        <Badge variant={ivory ? "secondary" : "default"} className={iv("whitespace-nowrap tabular-nums", "bg-green-600")}>
                          Credit: {formatVND(balanceAmount)}
                        </Badge>
                      )}
                      {balanceStatus === "debt" && balanceAmount > 0 && (
                        <Badge variant="destructive" className={iv("whitespace-nowrap tabular-nums", "")}>Balance Due: {formatVND(balanceAmount)}</Badge>
                      )}
                      {balanceStatus === "settled" && <Badge variant={ivory ? "success" : "secondary"}>Settled</Badge>}
                    </TableCell>
                    <TableCell>
                      {tuition?.siblingState?.status === "assigned" && tuition.siblingState.isWinner && (
                        <Badge variant="secondary" className="gap-1">
                          <Award className="h-3 w-3" />
                          Sibling {tuition.siblingState.percent}%
                        </Badge>
                      )}
                      {tuition?.siblingState?.status === "pending" && (
                        <Badge variant={ivory ? "warning" : "outline"} className={iv("", "text-yellow-600 border-yellow-600")}>
                          Pending
                        </Badge>
                      )}
                      {tuition?.siblingState?.status === "unresolved" && (
                        <Badge variant={ivory ? "warning" : "outline"} title={tuition.siblingState.reason}>
                          Family discount calculating — updating automatically
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {tuition && (
                        <InvoiceDownloadButton studentId={student.id} month={selectedMonth} variant="ghost" size="sm" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
