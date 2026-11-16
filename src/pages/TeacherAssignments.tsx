import Layout from "@/components/Layout";
import { AssignmentUpload } from "@/components/teacher/AssignmentUpload";
import { HomeworkGradingList } from "@/components/teacher/HomeworkGradingList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { AssignmentCalendar } from "@/components/assignments/AssignmentCalendar";
import { ClassSelector } from "@/components/assignments/ClassSelector";

export default function TeacherAssignments() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  return (
    <Layout title="Assignments">
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="font-display text-hec-display font-medium text-hec-ink">Assignments</h1>
          <p className="mt-2 text-hec-body text-hec-ink-soft">Create and manage homework assignments</p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-auto">
            <TabsTrigger value="create" className="min-h-hec-target text-hec-small">
              Create
            </TabsTrigger>
            <TabsTrigger value="calendar" className="min-h-hec-target text-hec-small">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="grade" className="min-h-hec-target text-hec-small">
              Grade
            </TabsTrigger>
          </TabsList>

<TabsContent value="create" className="space-y-4 md:space-y-6 mt-4">
            <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6">
              <ClassSelector value={selectedClassId} onChange={setSelectedClassId} />
            </div>
            <AssignmentUpload classFilter={selectedClassId} />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4 md:space-y-6 mt-4">
            <div className="mb-4 space-y-4 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6">
              <p className="text-hec-small text-hec-ink-soft">
                <strong className="font-semibold text-hec-ink">Click on any date</strong> to view assignment details
              </p>
              <ClassSelector value={selectedClassId} onChange={setSelectedClassId} />
            </div>
            <AssignmentCalendar role="teacher" classId={selectedClassId} />
          </TabsContent>

<TabsContent value="grade" className="space-y-4 md:space-y-6 mt-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6">
              <ClassSelector value={selectedClassId} onChange={setSelectedClassId} />
              
              <div className="border-t border-hec-line pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-hec-ink-soft" aria-hidden="true" />
                  <p className="text-hec-small font-semibold text-hec-ink">Filter by status</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={statusFilter === "all" ? "default" : "outline"} aria-pressed={statusFilter === "all"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    className="min-h-hec-target flex-1 rounded-full sm:flex-none"
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === "not_submitted" ? "default" : "outline"} aria-pressed={statusFilter === "not_submitted"}
                    size="sm"
                    onClick={() => setStatusFilter("not_submitted")}
                    className="min-h-hec-target flex-1 rounded-full sm:flex-none"
                  >
                    <div className="h-2 w-2 rounded-full bg-hec-line-strong" aria-hidden="true" />
                    Not Submitted
                  </Button>
                  <Button
                    variant={statusFilter === "submitted" ? "default" : "outline"} aria-pressed={statusFilter === "submitted"}
                    size="sm"
                    onClick={() => setStatusFilter("submitted")}
                    className="min-h-hec-target flex-1 rounded-full sm:flex-none"
                  >
                    <div className="h-2 w-2 rounded-full bg-hec-warn" aria-hidden="true" />
                    Submitted
                  </Button>
                  <Button
                    variant={statusFilter === "graded" ? "default" : "outline"} aria-pressed={statusFilter === "graded"}
                    size="sm"
                    onClick={() => setStatusFilter("graded")}
                    className="min-h-hec-target flex-1 rounded-full sm:flex-none"
                  >
                    <div className="h-2 w-2 rounded-full bg-hec-leaf" aria-hidden="true" />
                    Graded
                  </Button>
                </div>
              </div>
            </div>

            <HomeworkGradingList statusFilter={statusFilter} classFilter={selectedClassId} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
