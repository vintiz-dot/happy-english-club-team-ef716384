import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Coins, ArrowRightLeft, Save, Info } from "lucide-react";
import { toast } from "sonner";

interface ClassEconomySettingsProps {
  classId: string;
}

export function ClassEconomySettings({ classId }: ClassEconomySettingsProps) {
  const queryClient = useQueryClient();
  const [economyMode, setEconomyMode] = useState(false);
  const [pointsToCashRate, setPointsToCashRate] = useState(50);

  const { data: classData, isLoading } = useQuery({
    queryKey: ["teacher-class-economy", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, economy_mode, points_to_cash_rate")
        .eq("id", classId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (classData) {
      setEconomyMode(classData.economy_mode ?? false);
      setPointsToCashRate(classData.points_to_cash_rate ?? 50);
    }
  }, [classData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("classes")
        .update({
          economy_mode: economyMode,
          points_to_cash_rate: pointsToCashRate,
        })
        .eq("id", classId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-class-economy", classId] });
      queryClient.invalidateQueries({ queryKey: ["teacher-class", classId] });
      queryClient.invalidateQueries({ queryKey: ["class", classId] });
      toast.success("Economy settings saved");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save settings");
    },
  });

  const hasChanges =
    classData &&
    (economyMode !== (classData.economy_mode ?? false) ||
      pointsToCashRate !== (classData.points_to_cash_rate ?? 50));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-hec-ink-faint" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 shrink-0 text-hec-brass" />
          Classroom Economy
        </CardTitle>
        <CardDescription>
          Enable a virtual banking system where students convert earned points into cash they can spend in class
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle */}
        <div className="flex items-center justify-between gap-4 rounded-hec-md border border-hec-line p-4">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="economy-toggle" className="text-hec-body font-medium text-hec-ink">
              Enable Economy Mode
            </Label>
            <p className="text-hec-small text-hec-ink-soft">
              Points accumulate indefinitely and students can convert them to virtual cash
            </p>
          </div>
          <Switch
            id="economy-toggle"
            checked={economyMode}
            onCheckedChange={setEconomyMode}
          />
        </div>

        {/* Rate setting - only shown when economy is on */}
        {economyMode && (
          <div className="rounded-hec-md border border-hec-line p-4 space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-hec-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-hec-ink-soft" />
              <Label htmlFor="rate" className="text-hec-body font-medium text-hec-ink">
                Conversion Rate
              </Label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                id="rate"
                type="number"
                min={1}
                value={pointsToCashRate}
                onChange={(e) => setPointsToCashRate(Number(e.target.value) || 1)}
                className="w-24 tabular-nums"
              />
              <span className="text-hec-small text-hec-ink-soft">
                points = 1 cash
              </span>
            </div>
            <div className="flex items-start gap-2 text-hec-small text-hec-ink-soft bg-hec-sunken rounded-hec-md p-3">
              <Info className="h-4 w-4 mt-1 shrink-0" />
              <span>
                Students with {pointsToCashRate} points can withdraw 1 cash unit.
                Monthly point resets are disabled when economy mode is active.
              </span>
            </div>
          </div>
        )}

        {/* Save button */}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Economy Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
