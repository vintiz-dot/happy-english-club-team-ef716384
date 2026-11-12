import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, Mail, Phone, Users } from "lucide-react";
import { useState } from "react";
import { FamilyLinkDialog } from "@/components/admin/FamilyLinkDialog";
import { FamilyMembersManager } from "@/components/admin/FamilyMembersManager";
import { toast } from "sonner";

const FamilyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  // Children whose sibling discount is on hold, and until when. Its own
  // query, not part of the family one: before the column exists (the
  // migration is pasted by hand) this fails quietly instead of taking the
  // whole page down.
  const { data: siblingHolds } = useQuery({
    queryKey: ["family-sibling-holds", id],
    enabled: !!id,
    retry: false,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await (supabase as any)
        .from("students")
        .select("id, sibling_discount_from")
        .eq("family_id", id)
        .not("sibling_discount_from", "is", null);
      if (error) return {};
      const thisMonth = new Date().toISOString().slice(0, 7);
      return Object.fromEntries(
        (data ?? [])
          .filter((s: any) => String(s.sibling_discount_from).slice(0, 7) > thisMonth)
          .map((s: any) => [s.id, s.sibling_discount_from]),
      );
    },
  });


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
        try {
          const response = await supabase.functions.invoke('manage-admin-users', {
            body: { action: 'listUsers' }
          });

          if (!response.error && response.data?.users) {
            const linkedUser = response.data.users.find((u: any) => u.id === data.primary_user_id);
            if (linkedUser) {
              linkedUserEmail = linkedUser.email;
            }
          }
        } catch (e) {
          console.warn("Could not resolve linked user email", e);
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
        <div className="py-12 text-center">
          <h2 className="font-display text-hec-h1 font-medium text-hec-ink">Family not found</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            {/* A family's name: wraps, never cut (DS s.13). */}
            <h1 className="whitespace-normal break-words hyphens-none text-balance font-display text-hec-display font-medium text-hec-ink">
              {family.name}
            </h1>
            <div className="flex flex-col gap-1">
              {family.primary_user_id && family.linkedUserEmail && (
                <div className="flex flex-wrap items-center gap-2 text-hec-small">
                  <span className="text-hec-ink-soft">Registered Email:</span>
                  <span className="min-w-0 break-all font-medium text-hec-ink">{family.linkedUserEmail}</span>
                  <Badge variant="outline">
                    Linked
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => setShowLinkDialog(true)}>
            <Link className="h-4 w-4" />
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-hec-small">
                    <span className="text-hec-ink-soft">Status:</span>
                    {/* The word carries the state; leaf only for "Active". */}
                    <Badge variant={family.is_active ? "success" : "secondary"}>
                      {family.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {family.email && (
                    <div className="flex items-center gap-2 text-hec-small text-hec-ink">
                      <Mail className="h-4 w-4 shrink-0 text-hec-ink-soft" />
                      <span className="min-w-0 break-all">{family.email}</span>
                    </div>
                  )}
                  {family.phone && (
                    <div className="flex items-center gap-2 text-hec-small text-hec-ink">
                      <Phone className="h-4 w-4 shrink-0 text-hec-ink-soft" />
                      <span className="tabular-nums">{family.phone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {family.address && (
                    <div className="text-hec-small text-hec-ink">
                      <span className="text-hec-ink-soft">Address:</span>
                      <p className="mt-1 break-words">{family.address}</p>
                    </div>
                  )}
                  {family.sibling_percent_override !== null && (
                    <div className="text-hec-small text-hec-ink">
                      <span className="text-hec-ink-soft">Sibling Discount Override:</span>
                      <p className="mt-1 whitespace-nowrap font-sans font-medium tabular-nums text-hec-ink">{family.sibling_percent_override}%</p>
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
                <Users className="h-5 w-5 shrink-0 text-hec-ink-soft" />
                <span>
                  Family Members (<span className="font-sans tabular-nums">{family.students?.length || 0}</span>)
                </span>
              </CardTitle>
              <CardDescription>Students linked to this family</CardDescription>
            </CardHeader>
            <CardContent>
              {family.students && family.students.length > 0 ? (
                <div className="rounded-hec-lg border border-hec-line">
                  {family.students.map((student: any) => (
                    <div
                      key={student.id}
                      className="flex flex-col gap-3 border-b border-hec-line px-4 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* DS s.13 name pattern: wraps, never cut. */}
                          <p className="min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">
                            {student.full_name}
                          </p>
                          <Badge variant={student.is_active ? "success" : "secondary"}>
                            {student.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {siblingHolds?.[student.id] && (
                            <Badge variant="outline">
                              Sibling discount from{" "}
                              {new Date(`${siblingHolds[student.id]}T00:00:00Z`).toLocaleDateString("en-GB", {
                                day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
                              })}
                            </Badge>
                          )}
                        </div>
                        {student.email && (
                          <p className="break-all text-hec-small text-hec-ink-soft">✉️ {student.email}</p>
                        )}
                        {student.phone && (
                          <p className="text-hec-small tabular-nums text-hec-ink-soft">📱 {student.phone}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
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
                <p className="py-8 text-center text-hec-small text-hec-ink-soft">No students in this family</p>
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
