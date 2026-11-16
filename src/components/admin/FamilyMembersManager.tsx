import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Loading } from "@/components/ui/loading";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";

interface Props {
  familyId: string;
  onChanged?: () => void;
}

export function FamilyMembersManager({ familyId, onChanged }: Props) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["family-candidates", familyId, search],
    queryFn: async () => {
      let query = supabase
        .from("students")
        .select("id, full_name, email, family_id, families(name)")
        .eq("is_active", true)
        .order("full_name")
        .limit(20);

      if (search.trim()) query = query.ilike("full_name", `%${search.trim()}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).filter((s: any) => s.family_id !== familyId);
    },
  });

  // D4 step 3B (G-19): linking a child to a family is a checked change made
  // as the signed-in admin. A child with nothing billed is linked at once
  // (tier 0); when the child, or a child of either family, has billed months
  // the dialog asks for a reason - the sibling discount of all of them can move.
  const linked = () => {
    toast.success("Student added to family");
    queryClient.invalidateQueries({ queryKey: ["family-detail"] });
    queryClient.invalidateQueries({ queryKey: ["family-candidates"] });
    queryClient.invalidateQueries({ queryKey: ["students"] });
    onChanged?.();
  };
  const money = useMoneyInput(linked);

  const linkMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const r = await money.run({ entity: "family_link", op: "set_family", args: { student_id: studentId, family_id: familyId } });
      if (r.status === "refused") throw new Error(r.message);
      return r.status;
    },
    onSuccess: (status) => {
      if (status === "done") linked();
    },
    onError: (e: any) => toast.error(e.message || "Failed to add student"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add students to this family
        </CardTitle>
        <CardDescription>Search a student and link them as a sibling in this family</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student by name..."
        />
        {isLoading ? (
          <Loading size="sm" />
        ) : candidates && candidates.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {candidates.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="font-medium">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.families?.name ? `Currently in: ${s.families.name}` : "No family"}
                  </p>
                </div>
                <Button size="sm" disabled={linkMutation.isPending} onClick={() => linkMutation.mutate(s.id)}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No matching students.</p>
        )}
      </CardContent>
      <MoneyInputDialog
        guard={money.guard}
        subject={(candidates ?? []).find((s: any) => s.id === money.guard.request?.args?.student_id)?.full_name}
        names={Object.fromEntries((candidates ?? []).map((s: any) => [s.id, s.full_name]))}
      />
    </Card>
  );
}
