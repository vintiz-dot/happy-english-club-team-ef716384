import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Search } from "lucide-react";
import type { StudentStats, AssignmentRecord } from "@/hooks/useAssignmentAnalytics";

interface Props {
  byStudent: Map<string, StudentStats>;
  assignments: AssignmentRecord[];
  homeworkPointsMap: Map<string, Map<string, number>>;
}

export function AssignmentByStudentView({ byStudent, assignments, homeworkPointsMap }: Props) {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentStats | null>(null);

  const students = useMemo(() => {
    const all = [...byStudent.values()].sort((a, b) => b.assignedCount - a.assignedCount);
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((s) => s.studentName.toLowerCase().includes(q));
  }, [byStudent, search]);

  // Top chart: submission rates of top 15 students
  const chartData = [...byStudent.values()]
    .filter((s) => s.assignedCount > 0)
    .sort((a, b) => a.submissionRate - b.submissionRate)
    .slice(0, 15)
    .map((s) => ({ name: s.studentName.split(" ").pop() || s.studentName, rate: Math.round(s.submissionRate) }));

  // Detail data for selected student
  const studentDetail = useMemo(() => {
    if (!selectedStudent) return [];
    const classSet = new Set(selectedStudent.classIds);
    const relevant = assignments.filter((a) => classSet.has(a.class_id));
    const pointsMap = homeworkPointsMap.get(selectedStudent.studentId) || new Map();
    return relevant.map((a) => {
      const sub = a.submissions.find((s) => s.student_id === selectedStudent.studentId);
      return {
        id: a.id,
        title: a.title,
        className: a.className,
        dueDate: a.due_date || "—",
        status: sub?.status || "not_submitted",
        grade: sub?.grade || "—",
        points: pointsMap.get(a.id) ?? "—",
        submittedAt: sub?.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "—",
      };
    });
  }, [selectedStudent, assignments, homeworkPointsMap]);

  return (
    <div className="space-y-6">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hec-ink-faint" />
        <Input aria-label="Search students" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {!search && chartData.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h3 className="mb-3 text-hec-h3 font-semibold text-hec-ink">Submission Rates (lowest first)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Assigned</TableHead>
              <TableHead className="text-right">Submitted</TableHead>
              <TableHead className="text-right">Graded</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Grades</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.slice(0, 50).map((s) => (
              <TableRow
                key={s.studentId}
                className="cursor-pointer"
                onClick={() => setSelectedStudent(s)}
              >
                {/* The child's name wraps, never cut (DESIGN_SYSTEM s.13). */}
                <TableCell className="min-w-[10rem] whitespace-normal break-words hyphens-none font-medium text-hec-ink">{s.studentName}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">{s.assignedCount}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">{s.submittedCount}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">{s.gradedCount}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  <Badge variant={s.submissionRate >= 80 ? "default" : s.submissionRate >= 50 ? "secondary" : "destructive"}>
                    {s.submissionRate.toFixed(0)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-hec-caption text-hec-ink-soft">
                  {s.grades.length > 0 ? s.grades.slice(0, 5).join(", ") : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {students.length === 0 && (
          <p className="py-8 text-center text-hec-small text-hec-ink-soft">No students found</p>
        )}
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="whitespace-normal break-words pr-8 text-balance">{selectedStudent.studentName}</DialogTitle>
                <DialogDescription>Assignment details & performance</DialogDescription>
              </DialogHeader>

              <div className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
                <Card className="bg-hec-sunken p-3 shadow-none">
                  <div className="text-hec-caption text-hec-ink-soft">Assigned</div>
                  <div className="font-sans text-hec-h3 font-semibold tabular-nums text-hec-ink">{selectedStudent.assignedCount}</div>
                </Card>
                <Card className="bg-hec-sunken p-3 shadow-none">
                  <div className="text-hec-caption text-hec-ink-soft">Submitted</div>
                  <div className="font-sans text-hec-h3 font-semibold tabular-nums text-hec-ink">{selectedStudent.submittedCount}</div>
                </Card>
                <Card className="bg-hec-sunken p-3 shadow-none">
                  <div className="text-hec-caption text-hec-ink-soft">Graded</div>
                  <div className="font-sans text-hec-h3 font-semibold tabular-nums text-hec-ink">{selectedStudent.gradedCount}</div>
                </Card>
                <Card className="bg-hec-sunken p-3 shadow-none">
                  <div className="text-hec-caption text-hec-ink-soft">Rate</div>
                  <div className="font-sans text-hec-h3 font-semibold tabular-nums text-hec-ink">{selectedStudent.submissionRate.toFixed(0)}%</div>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentDetail.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell className="min-w-[8rem] whitespace-normal break-words">{d.className}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{d.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "graded" ? "default" : d.status === "submitted" ? "secondary" : "outline"} className="whitespace-nowrap">
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.grade}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{d.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
