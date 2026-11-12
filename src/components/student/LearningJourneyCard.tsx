/**
 * LearningJourneyCard — the student's living AI-maintained language profile.
 *
 * Renders the continuously re-synthesized journey summary (updated on every
 * approved work, vocab scan and analyzed transcript) with strengths and
 * focus areas. Read-only view of `student_learning_profiles`; a refresh
 * button re-synthesizes on demand.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Compass, Loader2, RefreshCw, TrendingUp, Target } from "lucide-react";
import { useIvory } from "@/hooks/useIvory";
import { cn } from "@/lib/utils";

export function LearningJourneyCard({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  // Rendered today only on the staff student page (not migrated yet): keep the old classes there.
  const ivory = useIvory();

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["learning-profile", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("student_learning_profiles")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();
      return data ?? null;
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("refresh-student-profile", {
        body: { student_id: studentId },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || "refresh failed");
      return data;
    },
    onSuccess: () => {
      toast.success("Learning profile re-synthesized");
      queryClient.invalidateQueries({ queryKey: ["learning-profile", studentId] });
    },
    onError: (e: any) => toast.error("Refresh failed", { description: e.message }),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn("flex items-center gap-2", !ivory && "text-base")}>
              <Compass className={cn("h-4 w-4", ivory ? "text-hec-brass" : "text-violet-500")} />
              Learning Journey
              {profile?.cefr_estimate && (
                <Badge className={ivory ? "border-hec-line bg-hec-sunken text-hec-ink" : "bg-violet-500/15 text-violet-600 border-violet-500/30"}>
                  {profile.cefr_estimate}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className={cn("mt-1", ivory ? "text-hec-caption" : "text-xs")}>
              AI-maintained profile — updates with every approved work, vocab scan and transcript.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            disabled={refreshMutation.isPending}
            onClick={() => refreshMutation.mutate()}
          >
            {refreshMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="h-20 flex items-center justify-center">
            <Loader2 className={cn("h-5 w-5 animate-spin", ivory ? "text-hec-ink-soft" : "text-muted-foreground")} />
          </div>
        ) : !profile?.summary ? (
          <p className={cn("py-4 text-center", ivory ? "text-hec-small text-hec-ink-soft" : "text-sm text-muted-foreground")}>
            No journey data yet — approve scanned work, run a vocab scan or analyze a transcript
            and the profile builds itself. Or hit Refresh to synthesize from existing records.
          </p>
        ) : (
          <>
            <p className={cn("whitespace-pre-line", ivory ? "text-hec-body text-hec-ink-soft" : "text-sm leading-relaxed text-muted-foreground")}>
              {profile.summary}
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {Array.isArray(profile.strengths) && profile.strengths.length > 0 && (
                <div className={cn("p-3 space-y-1.5", ivory ? "rounded-hec-md border border-hec-leaf/30 bg-hec-leaf-tint" : "rounded-xl bg-emerald-500/5 ring-1 ring-emerald-500/20")}>
                  <p className={cn("flex items-center gap-1", ivory ? "text-hec-caption font-medium text-hec-leaf" : "text-xs font-bold text-emerald-600 dark:text-emerald-400")}>
                    <TrendingUp className="h-3.5 w-3.5" />Strengths
                  </p>
                  {profile.strengths.map((s: any, i: number) => (
                    <p key={i} className={ivory ? "text-hec-caption text-hec-ink-soft" : "text-xs text-muted-foreground"}>
                      <span className={cn("font-semibold", ivory ? "text-hec-ink" : "text-foreground")}>{s.area}:</span> {s.evidence}
                    </p>
                  ))}
                </div>
              )}
              {Array.isArray(profile.struggles) && profile.struggles.length > 0 && (
                <div className={cn("p-3 space-y-1.5", ivory ? "rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint" : "rounded-xl bg-amber-500/5 ring-1 ring-amber-500/20")}>
                  <p className={cn("flex items-center gap-1", ivory ? "text-hec-caption font-medium text-hec-warn" : "text-xs font-bold text-amber-600 dark:text-amber-400")}>
                    <Target className="h-3.5 w-3.5" />Focus areas
                  </p>
                  {profile.struggles.map((s: any, i: number) => (
                    <p key={i} className={ivory ? "text-hec-caption text-hec-ink-soft" : "text-xs text-muted-foreground"}>
                      <span className={cn("font-semibold", ivory ? "text-hec-ink" : "text-foreground")}>{s.area}:</span> {s.focus || s.evidence}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <p className={ivory ? "text-hec-caption text-hec-ink-soft" : "text-[11px] text-muted-foreground"}>
              Evidence: {profile.works_analyzed} works · {profile.vocab_words} words ·{" "}
              {profile.transcripts_analyzed} lesson appearances · v{profile.version}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
