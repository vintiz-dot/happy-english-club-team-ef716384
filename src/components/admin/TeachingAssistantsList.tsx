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
    return <p className="text-hec-body text-hec-ink-soft">Loading teaching assistants...</p>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 shrink-0" aria-hidden />
            All Teaching Assistants
          </CardTitle>
          <CardDescription>Click a teaching assistant to view profile & assign to classes</CardDescription>
        </CardHeader>
        <CardContent>
          {assistants?.length === 0 ? (
            <p className="py-8 text-center text-hec-body text-hec-ink-soft">No teaching assistants found</p>
          ) : (
            <div className="rounded-hec-lg border border-hec-line bg-hec-surface">
              {assistants?.map((ta) => (
                <div
                  key={ta.id}
                  className="flex min-h-hec-target cursor-pointer items-start gap-3 border-b border-hec-line px-4 py-3 transition-colors duration-hec-1 ease-hec last:border-b-0 hover:bg-hec-sunken/60"
                  onClick={() => setSelectedTA(ta)}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-start gap-2">
                      <p className="min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{ta.full_name}</p>
                      <Badge variant={ta.is_active ? "success" : "secondary"} className="shrink-0">
                        {ta.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {ta.user_id && (
                        <Badge variant="outline" className="shrink-0">Has Account</Badge>
                      )}
                    </div>
                    {ta.email && <p className="break-all text-hec-small text-hec-ink-soft">{ta.email}</p>}
                    {ta.phone && <p className="text-hec-small text-hec-ink-soft">📱 {ta.phone}</p>}
                    <p className="text-hec-small font-medium tabular-nums text-hec-ink">
                      {describeRate(ta)}
                    </p>
                    {ta.bio && <p className="line-clamp-1 text-hec-caption text-hec-ink-soft">{ta.bio}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label={ta.is_active ? `Deactivate ${ta.full_name}` : `Activate ${ta.full_name}`}                    onClick={(e) => { e.stopPropagation(); toggleActive.mutate({ id: ta.id, isActive: ta.is_active }); }}
                  >
                    {ta.is_active ? <ToggleRight className="h-5 w-5 text-hec-leaf" aria-hidden /> : <ToggleLeft className="h-5 w-5 text-hec-ink-faint" aria-hidden />}
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
