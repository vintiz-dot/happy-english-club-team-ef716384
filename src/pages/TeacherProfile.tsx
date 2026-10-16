import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Mail, Phone, DollarSign, Link } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeacherProfileOverview } from "@/components/admin/teacher/TeacherProfileOverview";
import { TeacherProfileSchedule } from "@/components/admin/teacher/TeacherProfileSchedule";
import { TeacherProfileClasses } from "@/components/admin/teacher/TeacherProfileClasses";
import { getAvatarUrl } from "@/lib/avatars";
import { TeacherProfilePayroll } from "@/components/admin/teacher/TeacherProfilePayroll";
import { TeacherProfileFilesNotes } from "@/components/admin/teacher/TeacherProfileFilesNotes";
import { TeacherProfileAudit } from "@/components/admin/teacher/TeacherProfileAudit";
import { TeacherEditDrawer } from "@/components/admin/TeacherEditDrawer";
import { TeacherLinkDialog } from "@/components/admin/TeacherLinkDialog";
import { TeacherProfileEdit } from "@/components/teacher/TeacherProfileEdit";
import { PdfExportLogCard } from "@/components/teacher/PdfExportLogCard";
import { describeRate } from "@/lib/payRate";

const TeacherProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: teacher, isLoading } = useQuery({
    queryKey: ["teacher-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // If teacher has user_id, get the user's email
      let linkedUserEmail = null;
      if (data?.user_id) {
        const response = await supabase.functions.invoke('manage-admin-users', {
          body: { action: 'listUsers' }
        });
        
        if (!response.error && response.data?.users) {
          const linkedUser = response.data.users.find((u: any) => u.id === data.user_id);
          if (linkedUser) {
            linkedUserEmail = linkedUser.email;
          }
        }
      }

      return { ...data, linkedUserEmail };
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!teacher) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Teacher not found</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16 ring-2 ring-border">
                  <AvatarImage src={getAvatarUrl(teacher.avatar_url) || undefined} alt={teacher.full_name} className="object-cover" />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                    {teacher.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">{teacher.full_name}</h1>
                    <Badge variant={teacher.is_active ? "default" : "secondary"} className={teacher.is_active ? "bg-green-500" : ""}>
                      {teacher.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    {teacher.user_id && teacher.linkedUserEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Registered Email:</span>
                        <span className="font-medium text-foreground">{teacher.linkedUserEmail}</span>
                        <Badge variant="outline" className="text-xs">
                          Linked
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    {teacher.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{teacher.email}</span>
                      </div>
                    )}
                    {teacher.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{teacher.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>{describeRate(teacher)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(teacher.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowLinkDialog(true)}>
                  <Link className="h-4 w-4 mr-2" />
                  {teacher.user_id ? 'Manage Link' : 'Connect to User'}
                </Button>
                <Button variant="outline" onClick={() => setShowEditDrawer(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="files">Files & Notes</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <TeacherProfileOverview teacherId={teacher.id} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
          </TabsContent>

          <TabsContent value="schedule">
            <TeacherProfileSchedule teacherId={teacher.id} selectedMonth={selectedMonth} />
          </TabsContent>

          <TabsContent value="classes">
            <TeacherProfileClasses teacherId={teacher.id} />
          </TabsContent>

          <TabsContent value="payroll">
            <TeacherProfilePayroll teacherId={teacher.id} selectedMonth={selectedMonth} payRate={teacher} onMonthChange={setSelectedMonth} />
          </TabsContent>

          <TabsContent value="profile">
            <TeacherProfileEdit teacherId={teacher.id} />
          </TabsContent>

          <TabsContent value="files">
            <TeacherProfileFilesNotes teacherId={teacher.id} />
          </TabsContent>

          <TabsContent value="audit">
            <TeacherProfileAudit teacherId={teacher.id} />
          </TabsContent>

          <TabsContent value="diagnostics">
            <PdfExportLogCard />
          </TabsContent>
        </Tabs>

        {showEditDrawer && (
          <TeacherEditDrawer
            teacher={teacher}
            onClose={() => setShowEditDrawer(false)}
          />
        )}

        {showLinkDialog && (
          <TeacherLinkDialog
            teacher={teacher}
            onClose={() => setShowLinkDialog(false)}
            onSuccess={() => {
              setShowLinkDialog(false);
              window.location.reload();
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default TeacherProfile;
