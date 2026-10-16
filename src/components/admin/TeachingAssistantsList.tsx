import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { TAProfileDrawer } from "./ta/TAProfileDrawer";
import { describeRate } from "@/lib/payRate";

export function TeachingAssistantsList() {
  const queryClient = useQueryClient();
  const [selectedTA, setSelectedTA] = useState<any>(null);

  const { data: assistants, isLoading } = useQuery({
    queryKey: ["teaching-assistants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teaching_assistants")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("teaching_assistants")
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching-assistants"] });
      toast.success("Status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Loading teaching assistants...</p>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            All Teaching Assistants
          </CardTitle>
          <CardDescription>Click a teaching assistant to view profile & assign to classes</CardDescription>
        </CardHeader>
        <CardContent>
          {assistants?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No teaching assistants found</p>
          ) : (
            <div className="space-y-3">
              {assistants?.map((ta) => (
                <div
                  key={ta.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedTA(ta)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{ta.full_name}</p>
                      <Badge variant={ta.is_active ? "default" : "secondary"}>
                        {ta.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {ta.user_id && (
                        <Badge variant="outline" className="text-xs">Has Account</Badge>
                      )}
                    </div>
                    {ta.email && <p className="text-sm text-muted-foreground">{ta.email}</p>}
                    {ta.phone && <p className="text-sm text-muted-foreground">📱 {ta.phone}</p>}
                    <p className="text-sm font-medium text-primary">
                      {describeRate(ta)}
                    </p>
                    {ta.bio && <p className="text-xs text-muted-foreground line-clamp-1">{ta.bio}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); toggleActive.mutate({ id: ta.id, isActive: ta.is_active }); }}
                  >
                    {ta.is_active ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTA && (
        <TAProfileDrawer ta={selectedTA} onClose={() => setSelectedTA(null)} />
      )}
    </>
  );
}
