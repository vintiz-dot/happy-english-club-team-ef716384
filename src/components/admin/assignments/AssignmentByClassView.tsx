import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import type { ClassStats } from "@/hooks/useAssignmentAnalytics";

interface Props {
  byClass: Map<string, ClassStats>;
  enrolledPerClass: Map<string, Set<string>>;
}

export function AssignmentByClassView({ byClass, enrolledPerClass }: Props) {
  const classes = [...byClass.values()].sort((a, b) => b.assignmentCount - a.assignmentCount);
  const [openClasses, setOpenClasses] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenClasses((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const chartData = classes.map((c) => ({
    name: c.className,
    submissions: Math.round(c.submissionRate),
    grading: Math.round(c.gradingRate),
  }));

  return (
    <div className="space-y-8">
      {chartData.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-hec-h3 text-hec-ink">Submission & Grading Rates</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="submissions" name="Submission %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="grading" name="Grading %" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="space-y-4">
        {classes.map((cs) => {
          const enrolled = enrolledPerClass.get(cs.classId)?.size || 0;
          const isOpen = openClasses.has(cs.classId);
          return (
            <Collapsible key={cs.classId} open={isOpen} onOpenChange={() => toggle(cs.classId)}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger className="flex min-h-hec-target w-full cursor-pointer flex-col items-start gap-2 p-4 text-left transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken/60 sm:flex-row sm:items-center sm:justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
                  <div className="flex min-w-0 items-start gap-3">
                    <ChevronRight className={`mt-1 h-4 w-4 shrink-0 text-hec-ink-soft transition-transform duration-hec-1 ease-hec ${isOpen ? "rotate-90" : ""}`} />
                    <div className="min-w-0 text-left">
                      <h3 className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-semibold text-hec-ink">{cs.className}</h3>
                      <p className="break-words text-hec-small tabular-nums text-hec-ink-soft">{cs.teacherName} · {enrolled} students · {cs.assignmentCount} assignments</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 pl-7 sm:pl-0">
                    <Badge variant="secondary" className="tabular-nums">{cs.submissionRate.toFixed(0)}% submitted</Badge>
                    <Badge variant="outline" className="tabular-nums">{cs.gradingRate.toFixed(0)}% graded</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    {cs.assignments.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Assignment</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Submitted</TableHead>
                            <TableHead className="text-right">Graded</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cs.assignments.map((a) => {
                            const subs = a.submissions.filter((s) => s.status === "submitted" || s.status === "graded").length;
                            const graded = a.submissions.filter((s) => s.status === "graded").length;
                            return (
                              <TableRow key={a.id}>
                                <TableCell className="whitespace-normal break-words font-medium">{a.title}</TableCell>
                                <TableCell className="whitespace-nowrap tabular-nums">{a.due_date || "—"}</TableCell>
                                <TableCell className="whitespace-nowrap text-right tabular-nums">{subs}/{a.forIds ? a.forIds.length : enrolled}</TableCell>
                                <TableCell className="whitespace-nowrap text-right tabular-nums">{graded}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
