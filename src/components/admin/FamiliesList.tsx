import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function FamiliesList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { data: families, isLoading } = useQuery({
    queryKey: ["families-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deactivated = () => {
    queryClient.invalidateQueries({ queryKey: ["families-list"] });
    toast.success("Family deleted successfully");
  };
  // D4-3B review N-2: "delete" marks the family inactive, and the family
  // discount counts only active families' children, for every month it is
  // worked out for. So the change goes through ('family_link', 'set_active')
  // as the signed-in admin: at once when nothing billed is reached, with a
  // reason dialog when it is.
  const money = useMoneyInput(() => deactivated());

  const deleteMutation = useMutation({
    mutationFn: async (familyId: string): Promise<"done" | "dialog"> => {
      const r = await money.run({ entity: "family_link", op: "set_active", args: { family_id: familyId, is_active: false } });
      if (r.status === "refused") throw new Error(r.message);
      return r.status === "dialog" ? "dialog" : "done";
    },
    onSuccess: (state) => {
      if (state === "done") deactivated();
    },
    onError: (error) => {
      toast.error("Failed to delete family: " + error.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Families List
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading families...</p>
          </div>
        ) : families && families.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Family Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {families.map((family) => (
                <TableRow key={family.id}>
                  <TableCell className="font-medium">{family.name}</TableCell>
                  <TableCell>{family.email || "-"}</TableCell>
                  <TableCell>{family.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={family.is_active ? "default" : "secondary"}>
                      {family.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/families/${family.id}`)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Family</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {family.name}? This will mark it as inactive.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(family.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No families found</p>
          </div>
        )}
      </CardContent>
      <MoneyInputDialog
        guard={money.guard}
        subject={families?.find((f) => f.id === money.guard.request?.args?.family_id)?.name}
      />
    </Card>
  );
}