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
import { useEffect, useState } from "react";
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
import { showSeal } from "@/components/fx/showSeal";
import { dur, ease, stagger, useMotionLevel } from "@/components/fx/motion";
import { useAgeBand } from "@/hooks/useAgeBand";
import { fill } from "@/lib/copy/student";
import { studentDefendCopy, type StudentDefendKey } from "@/lib/copy/studentDefend";
import { DefensePortfolio, type PortfolioData } from "@/components/cefr/DefensePortfolio";
import {
  Scale, Loader2, ShieldCheck, PenLine, CheckCircle2, ArrowRight,
} from "lucide-react";

/** Reject when a promise has not settled in `ms`: a send must end, never spin. */
function within<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    p.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

const STUCK = "Couldn't reach the server. Your answers are saved on this device - reload the page (F5) and press the button again.";

const invokeDefense = async (body: Record<string, unknown>) => {
  // The sign-in token lasts an hour and a test can take longer. A renewal
  // that hangs (a sleeping tab, a dropped connection) used to leave the
  // button spinning with nothing sent (28 Nov 2026): check it first, bounded.
  const { data: sess } = await within(supabase.auth.getSession(), 15_000, STUCK);
  const exp = sess.session?.expires_at ?? 0;
  if (!sess.session || exp * 1000 < Date.now() + 60_000) {
    const { error: rErr } = await within(supabase.auth.refreshSession(), 15_000, STUCK);
    if (rErr) throw new Error("You were signed out. Your answers are saved on this device - sign in again and come back to this page.");
  }
  const { data, error } = await within(
    supabase.functions.invoke("cefr-defense", { body }),
    180_000,
    STUCK,
  );
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

const LEVEL_ORDER = ["Pre-A1", "A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C2"];
const levelRank = (l?: string | null) => (l ? LEVEL_ORDER.indexOf(l) : -1);

/** Where a level on record came from, in a child's words. */
const SOURCE_WORDS: Record<string, string> = {
  manual: "set by your teacher",
  level_defense_test: "from your defence test, checked by your teacher",
  student_report: "from your progress report, checked by your teacher",
  exam_report: "from your exam, checked by your teacher",
};

const shortDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

type ChildSummary = {
  stages: { stage: number | null; correct: number; total: number; writing_tasks: number; words_written: number }[];
  correct: number;
  total: number;
  words_written: number;
  submitted_at: string | null;
};

/** The Vietnamese draft beneath a key label, for the bands (and devices) that ask for it. */
function ViBeneath({ k, vars, show }: { k: StudentDefendKey; vars?: Record<string, string | number>; show: boolean }) {
  if (!show) return null;
  return (
    <span lang="vi" className="block text-hec-small font-normal text-hec-ink-soft">
      {fill(studentDefendCopy[k].vi, vars)}
    </span>
  );
}

export default function StudentDefendLevel() {
  const { viBeneath } = useAgeBand();
  const motionLevel = useMotionLevel();
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
  const teacherLevel: { level: string; assessed_at: string } | null = state?.teacher_level ?? null;
  // Only the statuses the reviewed function sends count as "a teacher acted".
  // Anything else - including the AI statuses an older cefr-defense still
  // sends (defended, not_supported, ...) - reads as "submitted, waiting".
  const reviewedByTeacher = claim?.status === "reviewed" || claim?.status === "set_by_teacher";
  const stage = activeTest?.active_stage;
  // Answers are kept on this device until the stage is sent, so a reload or
  // a lost connection never costs a child their writing.
  const draftKey = activeTest && stage ? `hec-defend-answers:${activeTest.id}:${activeTest.current_stage}` : null;
  useEffect(() => {
    if (!draftKey) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) setAnswers((a) => (Object.keys(a).length ? a : JSON.parse(saved)));
    } catch { /* nothing saved */ }
  }, [draftKey]);
  useEffect(() => {
    if (!draftKey || !Object.keys(answers).length) return;
    try { localStorage.setItem(draftKey, JSON.stringify(answers)); } catch { /* storage full or off */ }
  }, [draftKey, answers]);
  const defense: { open: boolean; note: string | null } | null = state?.defense ?? null;
  const portfolio: PortfolioData | null = state?.portfolio ?? null;
  const currentLevel: { level: string; assessed_at: string; source: string } | null = state?.current_level ?? null;
  const summary: ChildSummary | null = gradedTest?.summary ?? null;
  const defendedIt = !!approved && !!claim && levelRank(approved.level) >= levelRank(claim.claimed_level);

  const startMutation = useMutation({
    mutationFn: () => invokeDefense({ action: "start_test" }),
    onSuccess: () => {
      toast.success("Your defence test is ready - good luck!");
      queryClient.invalidateQueries({ queryKey: ["cefr-defense-own"] });
    },
    onError: (e: any) => toast.error("Couldn't start the test", { description: e.message }),
  });

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
      if (draftKey) { try { localStorage.removeItem(draftKey); } catch { /* ignore */ } }
      setAnswers({});
      if (d.test?.status === "graded") {
        toast.success("Test submitted! Your teacher will review it.");
        showSeal(studentDefendCopy["defend.sealSent"].en);
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
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">
              Defend My Level
              <ViBeneath k="defend.title" show={viBeneath} />
            </h1>
            <p className="text-hec-small text-hec-ink-soft">
              Prove your English level in an adaptive challenge — the questions adjust to how well you do.
              <ViBeneath k="defend.intro" show={viBeneath} />
            </p>
          </div>
        </div>

        {/* My level now: the latest level a teacher approved or set. */}
        {!isLoading && (
          <Card className="overflow-hidden">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-hec-lg bg-hec-sunken font-display text-hec-h1 font-medium text-hec-ink">
                {currentLevel?.level ?? "?"}
              </div>
              <div className="min-w-0">
                <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">My level now</p>
                {currentLevel ? (
                  <p className="text-hec-body text-hec-ink">
                    <span className="font-semibold">{currentLevel.level}</span>
                    {" - "}{SOURCE_WORDS[currentLevel.source] ?? "checked by your teacher"}
                    {shortDate(currentLevel.assessed_at) && <span className="text-hec-ink-soft">, {shortDate(currentLevel.assessed_at)}</span>}
                  </p>
                ) : (
                  <p className="text-hec-body text-hec-ink-soft">Your teacher hasn't recorded a level for you yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                  <p className="text-hec-body font-semibold text-hec-ink">Level you're defending: {claim.claimed_level}</p>
                  <p className="mt-0.5 text-hec-small text-hec-ink-soft">
                    {claim.status === "reviewed" && approved ? `Your teacher reviewed your test: your level is ${approved.level}.`
                      : claim.status === "reviewed" ? "Your teacher has reviewed your test."
                      : claim.status === "set_by_teacher" && teacherLevel ? `Your teacher set your level: ${teacherLevel.level}.`
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
                      <ViBeneath k="defend.stage" vars={{ n: activeTest.current_stage, total: activeTest.total_stages }} show={viBeneath} />
                    </CardTitle>
                    <Badge variant="secondary" className="h-auto flex-col items-start whitespace-normal">
                      {answeredCount}/{totalCount} answered
                      <ViBeneath k="defend.answered" vars={{ n: answeredCount, total: totalCount }} show={viBeneath} />
                    </Badge>
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
                      initial={motionLevel === "off" ? false : { opacity: 0, ...(motionLevel === "full" ? { y: 8 } : {}) }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={motionLevel === "off" ? { duration: 0 } : { duration: dur.reveal, ease, delay: stagger(i) }}
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
                    className="h-auto min-h-hec-target w-full gap-2 whitespace-normal"
                    disabled={submitMutation.isPending || answeredCount < totalCount}
                    onClick={() => submitMutation.mutate()}
                  >
                    {submitMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />
                        {activeTest.current_stage === 3 ? "Sending your test…" : "Preparing the next stage…"}</>
                    ) : (
                      <><span className="text-left">
                        {activeTest.current_stage === 3 ? "Finish & send to my teacher" : "Submit stage"}
                        <ViBeneath k={activeTest.current_stage === 3 ? "defend.finish" : "defend.submitStage"} show={viBeneath} />
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0" /></>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* After the test: what the child did, then the level a teacher approved */}
            {!activeTest && gradedTest && (
              <Card className={approved ? "border-hec-leaf/30" : undefined}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {approved ? (
                      <><ShieldCheck className="h-5 w-5 text-hec-leaf" />
                        {defendedIt ? `You defended ${claim.claimed_level}!` : `Your teacher's review: ${approved.level}`}</>
                    ) : reviewedByTeacher ? (
                      <><CheckCircle2 className="h-5 w-5 text-hec-leaf" />Reviewed by your teacher</>
                    ) : (
                      <><CheckCircle2 className="h-5 w-5 text-hec-ink-soft" />Test sent to your teacher</>
                    )}
                  </CardTitle>
                  <CardDescription className="text-hec-small">
                    {approved
                      ? defendedIt
                        ? `Your teacher looked at your test and everything you have done, and confirmed ${approved.level}.`
                        : `Your teacher looked at your test and everything you have done, and confirmed ${approved.level}. Keep going - you can defend ${claim.claimed_level} again later.`
                      : !reviewedByTeacher
                        ? "Your teacher now looks at your test together with all your evidence below. Your level shows at the top of this page once they have."
                        : teacherLevel
                          ? `Your teacher set your level: ${teacherLevel.level}.`
                          : "Your teacher has looked at your test."}
                  </CardDescription>
                </CardHeader>
                {summary && (
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-hec-md bg-hec-sunken p-2">
                        <p className="font-display text-hec-h2 font-medium text-hec-ink">{summary.correct}/{summary.total}</p>
                        <p className="text-hec-caption text-hec-ink-soft">questions right</p>
                      </div>
                      <div className="rounded-hec-md bg-hec-sunken p-2">
                        <p className="font-display text-hec-h2 font-medium text-hec-ink">{summary.words_written}</p>
                        <p className="text-hec-caption text-hec-ink-soft">words written</p>
                      </div>
                      <div className="rounded-hec-md bg-hec-sunken p-2">
                        <p className="font-display text-hec-h2 font-medium text-hec-ink">{summary.stages.length}</p>
                        <p className="text-hec-caption text-hec-ink-soft">stages done</p>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {summary.stages.map((st, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 rounded-hec-md border border-hec-line px-3 py-1.5 text-hec-small">
                          <span className="text-hec-ink">Stage {st.stage ?? i + 1}</span>
                          <span className="text-hec-ink-soft">
                            {st.correct} of {st.total} right
                            {st.writing_tasks > 0 && ` · ${st.writing_tasks} writing ${st.writing_tasks === 1 ? "task" : "tasks"}, ${st.words_written} words`}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {shortDate(summary.submitted_at) && (
                      <p className="text-hec-caption text-hec-ink-soft">Sent on {shortDate(summary.submitted_at)}.</p>
                    )}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Open: the child starts the adaptive test themselves. */}
            {!activeTest && defense?.open && (
              <Card className="border-hec-brass/40">
                <CardContent className="py-5 space-y-3">
                  <p className="text-hec-body font-semibold text-hec-ink">
                    You can defend {claim.claimed_level} now!
                    <ViBeneath k="defend.openTitle" vars={{ level: claim.claimed_level }} show={viBeneath} />
                  </p>
                  {defense.note && <p className="text-hec-small text-hec-ink">{defense.note}</p>}
                  <p className="text-hec-small text-hec-ink-soft">
                    Three short stages: the questions get harder or easier as you go, and the last stage has two small writing tasks.
                    Take your time - about 30 minutes.
                    <ViBeneath k="defend.openHelp" show={viBeneath} />
                  </p>
                  <Button
                    className="h-auto min-h-hec-target w-full gap-2 whitespace-normal"
                    disabled={startMutation.isPending}
                    onClick={() => startMutation.mutate()}
                  >
                    {startMutation.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Preparing your test…</>
                      : <><span className="text-left">Start my defence<ViBeneath k="defend.start" show={viBeneath} /></span><ArrowRight className="h-4 w-4 shrink-0" /></>}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!activeTest && !gradedTest && !defense?.open && (
              <Card>
                <CardContent className="py-10 text-center text-hec-small text-hec-ink-soft">
                  No defense test yet — your teacher can assign one when you're ready.
                </CardContent>
              </Card>
            )}

            {/* The evidence the child defends with: facts only. */}
            {portfolio && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-hec-ink-soft" />My evidence
                    <ViBeneath k="defend.evidence" show={viBeneath} />
                  </CardTitle>
                  <CardDescription className="text-hec-small">
                    Everything you have learnt and done at HEC, and your test certificates. Your teacher looks at all of it together with your defence test.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DefensePortfolio portfolio={portfolio} compact />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
