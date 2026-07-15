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

export function LearningJourneyCard({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();

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
            <CardTitle className="text-base flex items-center gap-2">
              <Compass className="h-4 w-4 text-violet-500" />
              Learning Journey
              {profile?.cefr_estimate && (
                <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30">
                  {profile.cefr_estimate}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
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
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !profile?.summary ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No journey data yet — approve scanned work, run a vocab scan or analyze a transcript
            and the profile builds itself. Or hit Refresh to synthesize from existing records.
          </p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {profile.summary}
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {Array.isArray(profile.strengths) && profile.strengths.length > 0 && (
                <div className="rounded-xl bg-emerald-500/5 ring-1 ring-emerald-500/20 p-3 space-y-1.5">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />Strengths
                  </p>
                  {profile.strengths.map((s: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{s.area}:</span> {s.evidence}
                    </p>
                  ))}
                </div>
              )}
              {Array.isArray(profile.struggles) && profile.struggles.length > 0 && (
                <div className="rounded-xl bg-amber-500/5 ring-1 ring-amber-500/20 p-3 space-y-1.5">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />Focus areas
                  </p>
                  {profile.struggles.map((s: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{s.area}:</span> {s.focus || s.evidence}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              Evidence: {profile.works_analyzed} works · {profile.vocab_words} words ·{" "}
              {profile.transcripts_analyzed} lesson appearances · v{profile.version}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
