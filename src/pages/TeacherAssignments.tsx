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

// DS s.15 card recipe, for the filter panels above each tab.
const PANEL = "rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6";

export default function TeacherAssignments() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  return (
    <Layout title="Assignments">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-hec-display font-medium text-hec-ink">Assignments</h1>
          <p className="text-hec-body text-hec-ink-soft">Create and manage homework assignments</p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-auto">
            <TabsTrigger value="create">
              Create
            </TabsTrigger>
            <TabsTrigger value="calendar">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="grade">
              Grade
            </TabsTrigger>
          </TabsList>

<TabsContent value="create" className="space-y-6 mt-4">
            <div className={PANEL}>
              <ClassSelector value={selectedClassId} onChange={setSelectedClassId} />
            </div>
            <AssignmentUpload classFilter={selectedClassId} />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6 mt-4">
            <div className={`${PANEL} space-y-4`}>
              <p className="text-hec-small text-hec-ink-soft">
                <strong className="font-semibold text-hec-ink">Click on any date</strong> to view assignment details
              </p>
              <ClassSelector value={selectedClassId} onChange={setSelectedClassId} />
            </div>
            <AssignmentCalendar role="teacher" classId={selectedClassId} />
          </TabsContent>

<TabsContent value="grade" className="space-y-6 mt-4">
            {/* Filters */}
            <div className={`${PANEL} flex flex-col gap-4`}>
              <ClassSelector value={selectedClassId} onChange={setSelectedClassId} />

              <div className="border-t border-hec-line pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-hec-ink-soft" aria-hidden />
                  <p className="text-hec-small font-semibold text-hec-ink">Filter by status</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    aria-pressed={statusFilter === "all"}
                    className="flex-1 sm:flex-none"
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === "not_submitted" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("not_submitted")}
                    aria-pressed={statusFilter === "not_submitted"}
                    className="flex-1 sm:flex-none"
                  >
                    <div className="h-2 w-2 rounded-full bg-hec-ink-faint" aria-hidden />
                    Not Submitted
                  </Button>
                  <Button
                    variant={statusFilter === "submitted" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("submitted")}
                    aria-pressed={statusFilter === "submitted"}
                    className="flex-1 sm:flex-none"
                  >
                    <div className="h-2 w-2 rounded-full bg-hec-warn" aria-hidden />
                    Submitted
                  </Button>
                  <Button
                    variant={statusFilter === "graded" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("graded")}
                    aria-pressed={statusFilter === "graded"}
                    className="flex-1 sm:flex-none"
                  >
                    <div className="h-2 w-2 rounded-full bg-hec-leaf" aria-hidden />
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
