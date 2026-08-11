import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, Mail, Phone, Users } from "lucide-react";
import { useState } from "react";
import { FamilyLinkDialog } from "@/components/admin/FamilyLinkDialog";

const FamilyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const { data: family, isLoading } = useQuery({
    queryKey: ["family-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select(`
          *,
          students:students(
            id,
            full_name,
            email,
            phone,
            is_active
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // If family has primary_user_id, get the user's email
      let linkedUserEmail = null;
      if (data?.primary_user_id) {
        const response = await supabase.functions.invoke('manage-admin-users', {
          body: { action: 'listUsers' }
        });
        
        if (!response.error && response.data?.users) {
          const linkedUser = response.data.users.find((u: any) => u.id === data.primary_user_id);
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
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!family) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Family not found</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{family.name}</h1>
            <div className="flex flex-col gap-1">
              {family.primary_user_id && family.linkedUserEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Registered Email:</span>
                  <span className="font-medium text-foreground">{family.linkedUserEmail}</span>
                  <Badge variant="outline" className="text-xs">
                    Linked
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowLinkDialog(true)}>
            <Link className="h-4 w-4 mr-2" />
            {family.primary_user_id ? 'Manage Link' : 'Connect to User'}
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Family Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Family Information</CardTitle>
              <CardDescription>Contact details and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={family.is_active ? "default" : "secondary"} className={family.is_active ? "bg-green-500" : ""}>
                      {family.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {family.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{family.email}</span>
                    </div>
                  )}
                  {family.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{family.phone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {family.address && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Address:</span>
                      <p className="mt-1">{family.address}</p>
                    </div>
                  )}
                  {family.sibling_percent_override !== null && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Sibling Discount Override:</span>
                      <p className="mt-1 font-medium">{family.sibling_percent_override}%</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Students in Family Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Members ({family.students?.length || 0})
              </CardTitle>
              <CardDescription>Students linked to this family</CardDescription>
            </CardHeader>
            <CardContent>
              {family.students && family.students.length > 0 ? (
                <div className="space-y-3">
                  {family.students.map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{student.full_name}</p>
                          <Badge variant={student.is_active ? "default" : "secondary"}>
                            {student.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {student.email && (
                          <p className="text-sm text-muted-foreground">✉️ {student.email}</p>
                        )}
                        {student.phone && (
                          <p className="text-sm text-muted-foreground">📱 {student.phone}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/students/${student.id}`}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const { error } = await supabase
                              .from("students")
                              .update({ family_id: null })
                              .eq("id", student.id);
                            if (error) {
                              toast.error(error.message);
                            } else {
                              toast.success("Student removed from family");
                              queryClient.invalidateQueries({ queryKey: ["family-detail", id] });
                              queryClient.invalidateQueries({ queryKey: ["family-candidates"] });
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No students in this family</p>
              )}
            </CardContent>
          </Card>

          <FamilyMembersManager
            familyId={family.id}
            onChanged={() => queryClient.invalidateQueries({ queryKey: ["family-detail", id] })}
          />

        </div>

        {showLinkDialog && (
          <FamilyLinkDialog
            family={family}
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

export default FamilyDetail;
