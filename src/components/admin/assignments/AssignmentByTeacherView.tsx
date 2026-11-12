import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TeacherStats } from "@/hooks/useAssignmentAnalytics";

interface Props {
  byTeacher: Map<string, TeacherStats>;
}

export function AssignmentByTeacherView({ byTeacher }: Props) {
  const teachers = [...byTeacher.values()].filter((t) => t.teacherId !== "unassigned").sort((a, b) => b.assignmentCount - a.assignmentCount);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [classFilters, setClassFilters] = useState<Map<string, Set<string>>>(new Map());

  const display = selectedTeacher !== "all" ? teachers.filter((t) => t.teacherId === selectedTeacher) : teachers;

  const getActiveClasses = (teacherId: string, allClassIds: string[]) => {
    const filter = classFilters.get(teacherId);
    if (!filter || filter.size === 0) return new Set(allClassIds);
    return filter;
  };

  const toggleClassFilter = (teacherId: string, values: string[]) => {
    setClassFilters((prev) => {
      const next = new Map(prev);
      next.set(teacherId, new Set(values));
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
        <SelectTrigger aria-label="Teacher" className="w-full sm:w-[250px]">
          <SelectValue placeholder="All Teachers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teachers</SelectItem>
          {teachers.map((t) => (
            <SelectItem key={t.teacherId} value={t.teacherId}>{t.teacherName}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {display.map((ts) => {
        const activeClasses = getActiveClasses(ts.teacherId, ts.classIds);
        const filteredAssignments = ts.assignments.filter((a) => activeClasses.has(a.class_id));
        const filteredSubs = filteredAssignments.reduce((n, a) => n + a.submissions.filter((s) => s.status === "submitted" || s.status === "graded").length, 0);
        const filteredGraded = filteredAssignments.reduce((n, a) => n + a.submissions.filter((s) => s.status === "graded").length, 0);

        return (
          <Card key={ts.teacherId} className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="whitespace-normal break-words hyphens-none text-balance text-hec-h3 font-semibold text-hec-ink">{ts.teacherName}</h3>
                <p className="text-hec-small tabular-nums text-hec-ink-soft">{ts.classCount} classes · {ts.assignmentCount} assignments</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Badge variant="secondary">{ts.gradingRate.toFixed(0)}% graded</Badge>
                <Badge variant="outline">{ts.avgTurnaroundDays !== null ? `${ts.avgTurnaroundDays.toFixed(1)}d turnaround` : "No data"}</Badge>
              </div>
            </div>

            {ts.classIds.length > 1 && (
              <div className="space-y-2">
                <p className="text-hec-caption font-medium text-hec-ink-soft">Filter by class:</p>
                <ToggleGroup
                  type="multiple"
                  value={[...activeClasses]}
                  onValueChange={(vals) => toggleClassFilter(ts.teacherId, vals)}
                  className="flex flex-wrap justify-start gap-2"
                >
                  {ts.classIds.map((cid, i) => (
                    <ToggleGroupItem key={cid} value={cid} size="sm" variant="outline" className="h-auto min-h-hec-target whitespace-normal break-words rounded-hec-md border-hec-line-strong px-3 py-2 text-left text-hec-small text-hec-ink data-[state=on]:border-hec-brass data-[state=on]:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
                      {ts.classNames[i]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <Card className="bg-hec-sunken p-3 shadow-none">
                <div className="text-hec-caption text-hec-ink-soft">Submissions</div>
                <div className="font-sans text-hec-h3 font-semibold tabular-nums text-hec-ink">{filteredSubs}</div>
              </Card>
              <Card className="bg-hec-sunken p-3 shadow-none">
                <div className="text-hec-caption text-hec-ink-soft">Graded</div>
                <div className="font-sans text-hec-h3 font-semibold tabular-nums text-hec-ink">{filteredGraded}</div>
              </Card>
              <Card className="bg-hec-sunken p-3 shadow-none">
                <div className="text-hec-caption text-hec-ink-soft">Pending</div>
                <div className="font-sans text-hec-h3 font-semibold tabular-nums text-hec-ink">{filteredSubs - filteredGraded}</div>
              </Card>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Submitted</TableHead>
                  <TableHead className="text-right">Graded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.slice(0, 20).map((a) => {
                  const subs = a.submissions.filter((s) => s.status === "submitted" || s.status === "graded").length;
                  const graded = a.submissions.filter((s) => s.status === "graded").length;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell className="min-w-[8rem] whitespace-normal break-words">{a.className}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{a.due_date || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{subs}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{graded}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        );
      })}

      {display.length === 0 && (
        <p className="py-8 text-center text-hec-small text-hec-ink-soft">No teacher data available</p>
      )}
    </div>
  );
}
