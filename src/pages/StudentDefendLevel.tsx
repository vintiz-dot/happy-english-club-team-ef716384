/**
 * StudentDefendLevel — the student's side of the CEFR Level Defense.
 *
 * Shows the level their teacher set and where things stand, and — when
 * a defense test is assigned — walks them through the adaptive multistage
 * test: three stages of CEFR-aligned questions (the difficulty adapts to how
 * they do), finishing with short writing tasks. Grading happens server-side
 * in the cefr-defense edge function; the student never sees answer keys.
 *
 * The child never sees what the AI made of the test (estimate, defended or
 * not, rationale) or the evidence audit: cefr-defense gives a child progress
 * only - "submitted, your teacher will review it" - and the level once a
 * teacher has approved one (approved_level). Nothing derived from an AI
 * reaches a child before a teacher approves.
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
  Scale, Loader2, ShieldCheck, PenLine, CheckCircle2, ArrowRight,
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
  const approved: { level: string; assessed_at: string } | null = state?.approved_level ?? null;
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
        toast.success("Test submitted! Your teacher will review it.");
      } else {
        toast.success("Stage done. Next stage ready!");
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
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-lg bg-hec-sunken">
            <Scale className="h-6 w-6 text-hec-ink" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Defend My Level</h1>
            <p className="text-hec-small text-hec-ink-soft">
              Prove your English level in an adaptive challenge — the questions adjust to how well you do.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-hec-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin" />Loading…
          </div>
        ) : !claim ? (
          <Card>
            <CardContent className="py-12 text-center text-hec-small text-hec-ink-soft">
              Your teacher hasn't set a level for you yet. Ask them to start your Level Defense!
            </CardContent>
          </Card>
        ) : (
          <>
            {/* The claim */}
            <Card className="overflow-hidden">
              <CardContent className="py-4 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-hec-lg border border-hec-brass/40 font-display text-hec-h1 font-medium text-hec-brass">
                  {claim.claimed_level}
                </div>
                <div className="min-w-0">
                  <p className="text-hec-body font-semibold text-hec-ink">Your teacher believes you're {claim.claimed_level}</p>
                  <p className="mt-0.5 text-hec-small text-hec-ink-soft">
                    {claim.status === "reviewed" && approved ? `Your teacher reviewed your test: your level is ${approved.level}.`
                      : claim.status === "submitted" ? "Test submitted — your teacher will review it."
                      : claim.status === "test_assigned" ? "A defense test is waiting for you below."
                      : "Show what you can do to prove it."}
                  </p>
                </div>
                {claim.status === "reviewed" && <ShieldCheck className="ml-auto h-8 w-8 shrink-0 text-hec-leaf" />}
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
                  <Progress value={(answeredCount / Math.max(totalCount, 1)) * 100} aria-label="Questions answered" className="h-1.5 mt-2" />
                  <CardDescription className="mt-2 text-hec-small">
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
                      className="rounded-hec-md border border-hec-line p-3 space-y-2"
                    >
                      <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                        {i + 1} · {it.skill}
                      </p>
                      {it.passage && (
                        <p className="rounded-hec-sm bg-hec-sunken p-3 text-hec-small italic text-hec-ink">{it.passage}</p>
                      )}
                      <p className="text-hec-body font-medium text-hec-ink">{it.prompt}</p>
                      <RadioGroup
                        value={answers[it.id] !== undefined ? String(answers[it.id]) : undefined}
                        onValueChange={(v) => setAnswers((a) => ({ ...a, [it.id]: Number(v) }))}
                        className="space-y-1.5"
                      >
                        {(it.options || []).map((opt: string, oi: number) => (
                          <div key={oi} className="flex min-h-hec-target items-center gap-2 rounded-hec-md border border-hec-line-strong px-3 py-2 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken">
                            <RadioGroupItem value={String(oi)} id={`${it.id}-${oi}`} />
                            <Label htmlFor={`${it.id}-${oi}`} className="flex-1 cursor-pointer text-hec-body font-normal text-hec-ink">
                              {opt}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </motion.div>
                  ))}

                  {(stage.writing_tasks || []).map((w: any, i: number) => (
                    <div key={w.id} className="rounded-hec-md border border-hec-line bg-hec-sunken p-3 space-y-2">
                      <p className="flex items-center gap-1.5 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                        <PenLine className="h-3 w-3" />Writing {i + 1}
                      </p>
                      <p className="text-hec-body font-medium text-hec-ink">{w.prompt}</p>
                      <Textarea
                        placeholder="Write your answer in English…"
                        value={String(answers[w.id] ?? "")}
                        onChange={(e) => setAnswers((a) => ({ ...a, [w.id]: e.target.value }))}
                        className="min-h-[110px]"
                      />
                    </div>
                  ))}

                  <Button
                    className="w-full gap-2"
                    disabled={submitMutation.isPending || answeredCount < totalCount}
                    onClick={() => submitMutation.mutate()}
                  >
                    {submitMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />
                        {activeTest.current_stage === 3 ? "Sending your test…" : "Preparing the next stage…"}</>
                    ) : (
                      <>{activeTest.current_stage === 3 ? "Finish & send to my teacher" : "Submit stage"}<ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* After the test: progress, then the level a teacher approved */}
            {!activeTest && gradedTest && (
              <Card className={approved ? "border-hec-leaf/30" : undefined}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {approved ? (
                      <><ShieldCheck className="h-5 w-5 text-hec-leaf" />Your teacher's review: {approved.level}</>
                    ) : (
                      <><CheckCircle2 className="h-5 w-5 text-hec-ink-soft" />Test submitted</>
                    )}
                  </CardTitle>
                  <CardDescription className="text-hec-small">
                    {approved
                      ? "Your teacher looked at your test and confirmed this level."
                      : "Your teacher will review your test. Your level shows here once they have."}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {!activeTest && !gradedTest && (
              <Card>
                <CardContent className="py-10 text-center text-hec-small text-hec-ink-soft">
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
