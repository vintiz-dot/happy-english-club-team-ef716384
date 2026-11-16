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
import { useIvory } from "@/hooks/useIvory";
import { ConfirmDestructiveDialog } from "@/components/ConfirmDestructiveDialog";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";

const FamilyDetail = () => {
  const ivory = useIvory();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  // The child whose "Remove" was pressed: taken out of the family only on confirm.
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; full_name: string } | null>(null);

  // D4 step 3B (G-19): removing a child from the family is a checked change
  // made as the signed-in admin; it asks for a reason when a billed month of
  // the child or a sibling is reached. Asked first (the confirm above), then
  // the checked change: tier 0 is done at once, tier 1+ opens the reason dialog.
  const removed = () => {
    toast.success("Student removed from family");
    queryClient.invalidateQueries({ queryKey: ["family-detail", id] });
    queryClient.invalidateQueries({ queryKey: ["family-candidates"] });
  };
  const money = useMoneyInput(removed);
  const removeFromFamily = async (student: { id: string }) => {
    const r = await money.run({
      entity: "family_link",
      op: "set_family",
      args: { student_id: student.id, family_id: null },
    });
    if (r.status === "refused") toast.error(r.message);
    else if (r.status === "done") removed();
  };

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
        <div className={ivory ? "py-12 text-center" : "text-center py-12"}>
          <h2 className={ivory ? "font-display text-hec-h2 font-medium text-hec-ink" : "text-2xl font-bold"}>Family not found</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={ivory ? "space-y-8" : "space-y-6"}>
        <div className={ivory ? "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" : "flex items-center justify-between"}>
          <div className={ivory ? "min-w-0 space-y-2" : "space-y-2"}>
            <h1 className={ivory ? "whitespace-normal break-words font-display text-hec-display font-medium text-hec-ink" : "text-3xl font-bold tracking-tight"}>{family.name}</h1>
            <div className="flex flex-col gap-1">
              {family.primary_user_id && family.linkedUserEmail && (
                <div className={ivory ? "flex flex-wrap items-center gap-2 text-hec-small" : "flex items-center gap-2 text-sm"}>
                  <span className={ivory ? "text-hec-ink-soft" : "text-muted-foreground"}>Registered Email:</span>
                  <span className={ivory ? "min-w-0 break-all font-medium text-hec-ink" : "font-medium text-foreground"}>{family.linkedUserEmail}</span>
                  <Badge variant={ivory ? "success" : "outline"} className={ivory ? undefined : "text-xs"}>
                    Linked
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowLinkDialog(true)} className={ivory ? "w-full shrink-0 sm:w-auto" : undefined}>
            <Link className={ivory ? "h-4 w-4" : "h-4 w-4 mr-2"} />
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
                  <div className={ivory ? "flex items-center gap-2 text-hec-small" : "flex items-center gap-2 text-sm"}>
                    <span className={ivory ? "text-hec-ink-soft" : "text-muted-foreground"}>Status:</span>
                    <Badge variant={family.is_active ? (ivory ? "success" : "default") : "secondary"} className={ivory ? undefined : family.is_active ? "bg-green-500" : ""}>
                      {family.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {family.email && (
                    <div className={ivory ? "flex items-start gap-2 text-hec-small text-hec-ink" : "flex items-center gap-2 text-sm"}>
                      <Mail className={ivory ? "mt-0.5 h-4 w-4 shrink-0 text-hec-ink-soft" : "h-4 w-4 text-muted-foreground"} />
                      <span className={ivory ? "min-w-0 break-all" : undefined}>{family.email}</span>
                    </div>
                  )}
                  {family.phone && (
                    <div className={ivory ? "flex items-start gap-2 text-hec-small tabular-nums text-hec-ink" : "flex items-center gap-2 text-sm"}>
                      <Phone className={ivory ? "mt-0.5 h-4 w-4 shrink-0 text-hec-ink-soft" : "h-4 w-4 text-muted-foreground"} />
                      <span>{family.phone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {family.address && (
                    <div className={ivory ? "text-hec-small text-hec-ink" : "text-sm"}>
                      <span className={ivory ? "text-hec-ink-soft" : "text-muted-foreground"}>Address:</span>
                      <p className={ivory ? "mt-1 break-words" : "mt-1"}>{family.address}</p>
                    </div>
                  )}
                  {family.sibling_percent_override !== null && (
                    <div className={ivory ? "text-hec-small text-hec-ink" : "text-sm"}>
                      <span className={ivory ? "text-hec-ink-soft" : "text-muted-foreground"}>Sibling Discount Override:</span>
                      <p className={ivory ? "mt-1 whitespace-nowrap font-medium tabular-nums" : "mt-1 font-medium"}>{family.sibling_percent_override}%</p>
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
                <Users className={ivory ? "h-5 w-5 shrink-0 text-hec-ink-soft" : "h-5 w-5"} />
                Family Members ({family.students?.length || 0})
              </CardTitle>
              <CardDescription>Students linked to this family</CardDescription>
            </CardHeader>
            <CardContent>
              {family.students && family.students.length > 0 ? (
                <div className="space-y-3">
                  {family.students.map((student: any) => (
                    <div key={student.id} className={ivory ? "flex flex-col gap-3 rounded-hec-md border border-hec-line bg-hec-surface p-4 sm:flex-row sm:items-start sm:justify-between" : "flex items-center justify-between p-4 border rounded-lg"}>
                      <div className={ivory ? "min-w-0 flex-1 space-y-1" : "space-y-1"}>
                        <div className={ivory ? "flex flex-wrap items-center gap-2" : "flex items-center gap-2"}>
                          <p className={ivory ? "min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink" : "font-medium"}>{student.full_name}</p>
                          <Badge variant={student.is_active ? (ivory ? "success" : "default") : "secondary"}>
                            {student.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {siblingHolds?.[student.id] && (
                            <Badge variant={ivory ? "warning" : "outline"} className={ivory ? "tabular-nums" : "border-violet-300 text-violet-700 dark:text-violet-300"}>
                              Sibling discount from{" "}
                              {new Date(`${siblingHolds[student.id]}T00:00:00Z`).toLocaleDateString("en-GB", {
                                day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
                              })}
                            </Badge>
                          )}
                        </div>
                        {student.email && (
                          <p className={ivory ? "break-all text-hec-small text-hec-ink-soft" : "text-sm text-muted-foreground"}>✉️ {student.email}</p>
                        )}
                        {student.phone && (
                          <p className={ivory ? "text-hec-small tabular-nums text-hec-ink-soft" : "text-sm text-muted-foreground"}>📱 {student.phone}</p>
                        )}
                      </div>
                      <div className={ivory ? "flex shrink-0 flex-wrap gap-2" : "flex gap-2"}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/students/${student.id}`}
                        >
                          View Details
                        </Button>
                        <Button
                          variant={ivory ? "destructive-quiet" : "ghost"}
                          size="sm"
                          onClick={() => setConfirmRemove({ id: student.id, full_name: student.full_name })}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={ivory ? "py-8 text-center text-hec-body text-hec-ink-soft" : "text-center py-8 text-muted-foreground"}>No students in this family</p>
              )}
            </CardContent>
          </Card>

          <FamilyMembersManager
            familyId={family.id}
            onChanged={() => queryClient.invalidateQueries({ queryKey: ["family-detail", id] })}
          />

        </div>

        <ConfirmDestructiveDialog
          open={confirmRemove !== null}
          onOpenChange={(open) => { if (!open) setConfirmRemove(null); }}
          title={`Remove ${confirmRemove?.full_name ?? ""} from this family?`}
          description={
            // What the code does: family_id is cleared, nothing is recalculated now. calculate-tuition
            // then finds no family for this child; sibling-state never reassigns a month already worked out.
            // D4 step 3B: when the change reaches a month already taught or billed, the reason dialog follows.
            `${confirmRemove?.full_name ?? ""}'s bills lose the family's sibling discount from the next time their tuition is worked out (a frozen bill keeps its figures). ` +
            `For the other children, months already worked out stay as they are; later months leave ${confirmRemove?.full_name ?? "this child"} out. ` +
            `If this reaches a month already taught or billed, you are asked for a reason next.`
          }
          keepLabel="Keep them in the family"
          actionLabel="Remove from the family"
          busyLabel="Removing..."
          onConfirm={() => (confirmRemove ? removeFromFamily(confirmRemove) : undefined)}
        />

        <MoneyInputDialog
          guard={money.guard}
          names={Object.fromEntries(((family as any)?.students ?? []).map((s: any) => [s.id, s.full_name]))}
        />

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
