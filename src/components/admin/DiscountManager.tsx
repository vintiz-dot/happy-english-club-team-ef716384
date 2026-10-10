import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, Percent, Gift, Settings, XCircle, Trash2, Edit } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditDiscountModal } from "./discount/EditDiscountModal";
import { dayjs } from "@/lib/date";
import { PlaceholderCard } from "@/components/ui/loading";

interface FamilyDiscount {
  id: string;
  family_id: string;
  families: {
    name: string;
    sibling_percent_override: number | null;
  };
  students: Array<{
    id: string;
    full_name: string;
  }>;
}

interface DiscountAssignment {
  id: string;
  student_id: string;
  effective_from: string;
  effective_to: string | null;
  note: string | null;
  students: {
    full_name: string;
  };
  discount_definitions: {
    name: string;
    type: string;
    value: number;
    cadence: string;
  };
}

interface ReferralBonus {
  id: string;
  student_id: string;
  effective_from: string;
  effective_to: string | null;
  note: string | null;
  type: string;
  value: number;
  cadence: string;
  students: {
    full_name: string;
  };
}

export function DiscountManager() {
  const [selectedTab, setSelectedTab] = useState("family");
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [endingAssignment, setEndingAssignment] = useState<string | null>(null);
  const [removingAssignment, setRemovingAssignment] = useState<string | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [bulkEndDialogOpen, setBulkEndDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch family discounts (sibling discounts)
  const { data: familyDiscounts, isLoading: loadingFamily } = useQuery({
    queryKey: ["family-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select(`
          id,
          name,
          sibling_percent_override,
          students:students!inner(
            id,
            full_name
          )
        `)
        .eq("is_active", true)
        .gte("students.is_active", true);

      if (error) throw error;
      return data;
    },
  });

  // Fetch special discount assignments
  const { data: specialDiscounts, isLoading: loadingSpecial } = useQuery({
    queryKey: ["special-discount-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_assignments")
        .select(`
          *,
          students(full_name),
          discount_definitions(name, type, value, cadence)
        `)
        .order("effective_from", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch referral bonuses
  const { data: referralBonuses, isLoading: loadingReferral } = useQuery({
    queryKey: ["referral-bonuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_bonuses")
        .select(`
          *,
          students(full_name)
        `)
        .order("effective_from", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatus = (effectiveFrom: string, effectiveTo: string | null) => {
    const today = dayjs().tz().format("YYYY-MM-DD");
    if (effectiveTo && effectiveTo < today) {
      return { label: "Ended", color: "bg-secondary text-secondary-foreground" };
    }
    if (effectiveFrom > today) {
      return { label: "Scheduled", color: "bg-blue-500 text-white" };
    }
    return { label: "Active", color: "bg-green-500 text-white" };
  };

  const endAssignmentMutation = useMutation({
    mutationFn: async ({ id, table }: { id: string; table: string }) => {
      const yesterday = dayjs().tz().subtract(1, "day").format("YYYY-MM-DD");

      const { error } = await supabase
        .from(table as any)
        .update({ effective_to: yesterday })
        .eq("id", id);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_log" as any).insert({
        entity: table,
        entity_id: id,
        action: "end",
        diff: { effective_to: yesterday },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-discount-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["referral-bonuses"] });
      toast({
        title: "Success",
        description: "Discount ended successfully",
      });
      setEndingAssignment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async ({ id, table }: { id: string; table: string }) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_log" as any).insert({
        entity: table,
        entity_id: id,
        action: "delete",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-discount-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["referral-bonuses"] });
      toast({
        title: "Success",
        description: "Discount removed successfully",
      });
      setRemovingAssignment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkEndMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const yesterday = dayjs().tz().subtract(1, "day").format("YYYY-MM-DD");
      const table = selectedTab === "special" ? "discount_assignments" : "referral_bonuses";

      const { error } = await supabase
        .from(table as any)
        .update({ effective_to: yesterday })
        .in("id", ids);

      if (error) throw error;

      // Audit log
      await Promise.all(
        ids.map((id) =>
          supabase.from("audit_log" as any).insert({
            entity: table,
            entity_id: id,
            action: "bulk_end",
            diff: { effective_to: yesterday },
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-discount-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["referral-bonuses"] });
      toast({
        title: "Success",
        description: `${selectedAssignments.length} discounts ended successfully`,
      });
      setSelectedAssignments([]);
      setBulkEndDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renderFamilyDiscounts = () => {
    if (loadingFamily) return <PlaceholderCard rows={2} />;
    if (!familyDiscounts || familyDiscounts.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No active family discounts</p>
          <p className="text-sm text-muted-foreground mt-2">
            Family sibling discounts are applied automatically based on enrollment count
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Family</TableHead>
            <TableHead>Students</TableHead>
            <TableHead>Sibling Discount %</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {familyDiscounts.map((family: any) => {
            const siblingPercent = family.sibling_percent_override || 5;
            return (
              <TableRow key={family.id}>
                <TableCell className="font-medium">{family.name}</TableCell>
                <TableCell>
                  {family.students.map((s: any) => s.full_name).join(", ")}
                </TableCell>
                <TableCell>{siblingPercent}%</TableCell>
                <TableCell>
                  <Badge className="bg-green-500 text-white">Active</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderDiscountAssignments = (
    assignments: any[],
    loading: boolean,
    table: string,
    emptyMessage: string
  ) => {
    if (loading) return <PlaceholderCard rows={2} />;
    if (!assignments || assignments.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    const activeAssignments = assignments.filter((a) => {
      const status = getStatus(a.effective_from, a.effective_to);
      return status.label === "Active";
    });

    return (
      <div className="space-y-4">
        {selectedAssignments.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkEndDialogOpen(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              End Selected ({selectedAssignments.length})
            </Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    activeAssignments.length > 0 &&
                    activeAssignments.every((a) => selectedAssignments.includes(a.id))
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedAssignments(activeAssignments.map((a) => a.id));
                    } else {
                      setSelectedAssignments([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Definition</TableHead>
              <TableHead>Type/Value</TableHead>
              <TableHead>Effective Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment: any) => {
              const status = getStatus(assignment.effective_from, assignment.effective_to);
              const isActive = status.label === "Active";
              const discountInfo =
                table === "discount_assignments"
                  ? assignment.discount_definitions
                  : assignment;
              
              return (
                <TableRow key={assignment.id}>
                  <TableCell>
                    {isActive && (
                      <Checkbox
                        checked={selectedAssignments.includes(assignment.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAssignments([...selectedAssignments, assignment.id]);
                          } else {
                            setSelectedAssignments(
                              selectedAssignments.filter((id) => id !== assignment.id)
                            );
                          }
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {assignment.students.full_name}
                  </TableCell>
                  <TableCell>
                    {table === "discount_assignments" ? discountInfo.name : "Referral Bonus"}
                  </TableCell>
                  <TableCell>
                    {discountInfo.value}
                    {discountInfo.type === "percent" ? "%" : " VND"} - {discountInfo.cadence}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {assignment.effective_from}
                      {assignment.effective_to && ` to ${assignment.effective_to}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={status.color}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isActive && (
                          <DropdownMenuItem
                            onClick={() => setEndingAssignment(assignment.id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            End Now
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setEditingAssignment(assignment)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modify Dates/Memo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setRemovingAssignment(assignment.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Assignment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="family">Family Discounts</TabsTrigger>
          <TabsTrigger value="special">Special Discounts</TabsTrigger>
          <TabsTrigger value="referral">Referral Bonuses</TabsTrigger>
        </TabsList>

        <TabsContent value="family">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Sibling Discounts
              </CardTitle>
              <CardDescription>
                Families with multiple active students receive automatic sibling discounts
              </CardDescription>
            </CardHeader>
            <CardContent>{renderFamilyDiscounts()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="special">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Special Discount Assignments
              </CardTitle>
              <CardDescription>
                Current beneficiaries of special discounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDiscountAssignments(
                specialDiscounts || [],
                loadingSpecial,
                "discount_assignments",
                "No active beneficiaries"
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referral">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Referral Bonus Assignments
              </CardTitle>
              <CardDescription>
                Current beneficiaries of referral bonuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDiscountAssignments(
                referralBonuses || [],
                loadingReferral,
                "referral_bonuses",
                "No active beneficiaries"
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* End Discount Dialog */}
      <AlertDialog open={!!endingAssignment} onOpenChange={() => setEndingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Discount Now?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the effective end date to yesterday, stopping this discount from
              applying to future tuition calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                endingAssignment &&
                endAssignmentMutation.mutate({
                  id: endingAssignment,
                  table:
                    selectedTab === "special" ? "discount_assignments" : "referral_bonuses",
                })
              }
            >
              End Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Assignment Dialog */}
      <AlertDialog
        open={!!removingAssignment}
        onOpenChange={() => setRemovingAssignment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Discount Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this discount assignment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                removingAssignment &&
                removeAssignmentMutation.mutate({
                  id: removingAssignment,
                  table:
                    selectedTab === "special" ? "discount_assignments" : "referral_bonuses",
                })
              }
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk End Dialog */}
      <AlertDialog open={bulkEndDialogOpen} onOpenChange={setBulkEndDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End {selectedAssignments.length} Discounts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end all selected discount assignments by setting their effective end date
              to yesterday.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkEndMutation.mutate(selectedAssignments)}>
              End Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <EditDiscountModal
          open={!!editingAssignment}
          onOpenChange={(open) => !open && setEditingAssignment(null)}
          assignment={editingAssignment}
          studentId={editingAssignment.student_id}
        />
      )}
    </div>
  );
}
