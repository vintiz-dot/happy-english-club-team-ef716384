import { useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { ClassForm } from "@/components/admin/ClassForm";
import { ClassesList } from "@/components/admin/ClassesList";
import { EnrollmentManager } from "@/components/admin/EnrollmentManager";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { PageLoading } from "@/components/ui/loading";

const Classes = () => {
  const queryClient = useQueryClient();
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <PageLoading message="Loading classes" />
      </Layout>
    );
  }

  // Only admins can access this page
  if (role !== "admin") {
    return (
      <Layout>
        <Card className="max-w-2xl mx-auto mt-12">
          <CardContent className="pt-12 pb-12 text-center">
            <ShieldAlert className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-6">
              This page is only accessible to administrators. Class management requires admin privileges.
            </p>
            <p className="text-sm text-muted-foreground">
              If you need to manage your classes, please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">Manage classes and student enrollments</p>
        </div>

        <ClassForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["classes"] })} />
        <ClassesList />
        
        <div className="pt-8">
          <h2 className="text-2xl font-bold mb-4">Enrollment Management</h2>
          <EnrollmentManager />
        </div>
      </div>
    </Layout>
  );
};

export default Classes;
