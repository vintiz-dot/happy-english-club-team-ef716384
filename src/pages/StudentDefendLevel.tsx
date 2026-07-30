/**
 * StudentDefendLevel — the student's side of the CEFR Level Defense.
 *
 * Shows the level their teacher set and its verification status, and — when
 * a defense test is assigned — walks them through the adaptive multistage
 * test: three stages of CEFR-aligned questions (the difficulty adapts to how
 * they do), finishing with short writing tasks. Grading happens server-side
 * in the cefr-defense edge function; the student never sees answer keys.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Scale, Loader2, ShieldCheck, ShieldAlert, PenLine, CheckCircle2, Sparkles, ArrowRight,
} from "lucide-react";

const invokeDefense = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("cefr-defense", { body });
  if (error) {
    let detail = error.message;
    try {
      const b = await (error as any).context?.json?.();
      if (b?.error) detail = b.error;
    } catch { /* keep default */ }
    throw new Error(detail);
  }
  if (data?.success === false) throw new Error(data.error || "request failed");
  return data;
};

export default function StudentDefendLevel() {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number | string>>({});

  const { data: state, isLoading } = useQuery<any>({
    queryKey: ["cefr-defense-own"],
    queryFn: () => invokeDefense({ action: "get_state" }),
  });

  const claim = state?.claim;
  const tests: any[] = state?.tests || [];
  const activeTest = tests.find((t) => t.status !== "graded");
  const gradedTest = tests.find((t) => t.status === "graded");
  const stage = activeTest?.active_stage;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!activeTest || !stage) throw new Error("No active test");
      const items = [...(stage.items || []), ...(stage.writing_tasks || [])];
      const missing = items.filter((it: any) => answers[it.id] === undefined || answers[it.id] === "");
      if (missing.length) throw new Error(`Please answer everything — ${missing.length} left`);
      return invokeDefense({
        action: "submit_stage",
        test_id: activeTest.id,
        answers: items.map((it: any) => ({ item_id: it.id, answer: answers[it.id] })),
      });
    },
    onSuccess: (d) => {
      setAnswers({});
      if (d.test?.status === "graded") {
        toast.success("Test complete! Your result is ready 🎉");
      } else {
        toast.success(`Stage done — ${Math.round((d.stage_score ?? 0) * 100)}% correct. Next stage ready!`);
      }
      queryClient.invalidateQueries({ queryKey: ["cefr-defense-own"] });
    },
    onError: (e: any) => toast.error("Couldn't submit", { description: e.message }),
  });

  const answeredCount = stage
    ? [...(stage.items || []), ...(stage.writing_tasks || [])].filter(
        (it: any) => answers[it.id] !== undefined && answers[it.id] !== "",
      ).length
    : 0;
  const totalCount = stage ? (stage.items?.length || 0) + (stage.writing_tasks?.length || 0) : 0;

  return (
    <Layout title="Defend My Level">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Scale className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black">Defend My Level</h1>
            <p className="text-xs text-muted-foreground">
              Prove your English level in an adaptive challenge — the questions adjust to how well you do.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />Loading…
          </div>
        ) : !claim ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Your teacher hasn't set a level for you yet. Ask them to start your Level Defense!
            </CardContent>
          </Card>
        ) : (
          <>
            {/* The claim */}
            <Card className="overflow-hidden">
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0">
                  {claim.claimed_level}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Your teacher believes you're {claim.claimed_level}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {claim.status === "defended" ? "You defended it — brilliant! 🏆"
                      : claim.status === "not_defended" ? "The test suggests a different level for now — keep going!"
                      : claim.status === "test_assigned" ? "A defense test is waiting for you below."
                      : claim.status === "supported" ? "The evidence from your lessons already supports it!"
                      : "Show what you can do to prove it."}
                  </p>
                </div>
                {claim.status === "defended" && <ShieldCheck className="h-8 w-8 text-emerald-500 ml-auto shrink-0" />}
              </CardContent>
            </Card>

            {/* Active test */}
            {activeTest && stage && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">
                      Stage {activeTest.current_stage} of {activeTest.total_stages}
                    </CardTitle>
                    <Badge variant="secondary">{answeredCount}/{totalCount} answered</Badge>
                  </div>
                  <Progress value={(answeredCount / Math.max(totalCount, 1)) * 100} className="h-1.5 mt-2" />
                  <CardDescription className="text-xs mt-2">
                    Read carefully and answer every question. The next stage adapts to how you do here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {(stage.items || []).map((it: any, i: number) => (
                    <motion.div
                      key={it.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-xl border p-3 space-y-2"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-violet-500">
                        {i + 1} · {it.skill}
                      </p>
                      {it.passage && (
                        <p className="text-sm bg-muted/40 rounded-lg p-2 italic leading-relaxed">{it.passage}</p>
                      )}
                      <p className="text-sm font-medium leading-relaxed">{it.prompt}</p>
                      <RadioGroup
                        value={answers[it.id] !== undefined ? String(answers[it.id]) : undefined}
                        onValueChange={(v) => setAnswers((a) => ({ ...a, [it.id]: Number(v) }))}
                        className="space-y-1.5"
                      >
                        {(it.options || []).map((opt: string, oi: number) => (
                          <div key={oi} className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-muted/40 transition-colors">
                            <RadioGroupItem value={String(oi)} id={`${it.id}-${oi}`} />
                            <Label htmlFor={`${it.id}-${oi}`} className="text-sm font-normal cursor-pointer flex-1">
                              {opt}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </motion.div>
                  ))}

                  {(stage.writing_tasks || []).map((w: any, i: number) => (
                    <div key={w.id} className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-violet-500 flex items-center gap-1.5">
                        <PenLine className="h-3 w-3" />Writing {i + 1}
                      </p>
                      <p className="text-sm font-medium leading-relaxed">{w.prompt}</p>
                      <Textarea
                        placeholder="Write your answer in English…"
                        value={String(answers[w.id] ?? "")}
                        onChange={(e) => setAnswers((a) => ({ ...a, [w.id]: e.target.value }))}
                        className="min-h-[110px]"
                      />
                    </div>
                  ))}

                  <Button
                    className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                    disabled={submitMutation.isPending || answeredCount < totalCount}
                    onClick={() => submitMutation.mutate()}
                  >
                    {submitMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />
                        {activeTest.current_stage === 3 ? "Grading your test…" : "Preparing the next stage…"}</>
                    ) : (
                      <>{activeTest.current_stage === 3 ? "Finish & get my result" : "Submit stage"}<ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Result */}
            {!activeTest && gradedTest?.result && (
              <Card className={gradedTest.result.defended ? "border-emerald-500/40" : "border-amber-500/40"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {gradedTest.result.defended ? (
                      <><ShieldCheck className="h-5 w-5 text-emerald-500" />Level defended: {gradedTest.target_level} 🎉</>
                    ) : (
                      <><ShieldAlert className="h-5 w-5 text-amber-500" />Your level right now: {gradedTest.result.level_estimate}</>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">{gradedTest.result.rationale}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {gradedTest.result.skill_notes && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {Object.entries(gradedTest.result.skill_notes).map(([skill, note]) => (
                        <div key={skill} className="rounded-lg bg-muted/40 p-2">
                          <p className="text-[11px] font-bold capitalize">{skill}</p>
                          <p className="text-[11px] text-muted-foreground">{String(note)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {Array.isArray(gradedTest.result.next_steps) && gradedTest.result.next_steps.length > 0 && (
                    <div>
                      <p className="text-xs font-bold flex items-center gap-1.5 mb-1">
                        <Sparkles className="h-3.5 w-3.5 text-violet-500" />Your next steps
                      </p>
                      <ul className="space-y-1">
                        {gradedTest.result.next_steps.map((s: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!activeTest && !gradedTest && claim.status !== "supported" && (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No defense test yet — your teacher can assign one when you're ready.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
