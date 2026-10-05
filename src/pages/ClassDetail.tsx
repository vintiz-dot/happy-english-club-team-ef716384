import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ClassCalendar from "@/components/admin/class/ClassCalendarEnhanced";
import ClassEnrollments from "@/components/admin/class/ClassEnrollments";
import ClassHomework from "@/components/admin/class/ClassHomework";
import ClassSettings from "@/components/admin/class/ClassSettings";
import RecurringSessionsManager from "@/components/admin/class/RecurringSessionsManager";
import { ClassLeaderboard } from "@/components/admin/ClassLeaderboard";
import { ClassMonitorCard } from "@/components/admin/class/ClassMonitorCard";
import { ClassAdminActions } from "@/components/admin/class/ClassAdminActions";

const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get("tab") || "calendar";

  const { data: classData } = useQuery({
    queryKey: ["class", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleTabChange = (value: string) => {
    navigate(`/admin/classes/${id}?tab=${value}`);
  };

  if (!id) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin?tab=classes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Classes
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{classData?.name || "Class"}</h1>
            <p className="text-muted-foreground">Manage class details, enrollments, and homework</p>
          </div>
          {classData && (
            <ClassAdminActions
              classId={classData.id}
              classLabel={classData.name}
              stretch={false}
              // Archiving or deleting leaves nothing to show here.
              onDeleted={() => navigate("/admin?tab=classes")}
              onArchived={() => navigate("/admin?tab=classes")}
            />
          )}
        </div>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
            <TabsTrigger value="homework">Homework</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <ClassCalendar classId={id} />
          </TabsContent>
          <TabsContent value="enrollments" className="mt-6">
            <ClassEnrollments classId={id} />
          </TabsContent>
          <TabsContent value="homework" className="mt-6">
            <ClassHomework classId={id} />
          </TabsContent>
          <TabsContent value="leaderboard" className="mt-6">
            <ClassLeaderboard classId={id} />
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <ClassSettings classId={id} />
                <RecurringSessionsManager classId={id} />
              </div>
              <div>
                <ClassMonitorCard classId={id} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ClassDetail;
