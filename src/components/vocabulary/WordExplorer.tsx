import { useState, useCallback, useEffect, useMemo } from "react";
import {
  BookOpen, Volume2, Loader2, ArrowRightLeft, Save, CheckCircle2,
  GraduationCap, Languages, Sparkles, Image as ImageIcon, AlertTriangle, Pencil,
  CalendarClock, PartyPopper, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getCefrLevel, type CefrLevel } from "@/lib/cefr";
import { checkGrammar, quickCheck, type GrammarIssue } from "@/lib/grammarChecker";

import { SentenceInput } from "./SentenceInput";
import { WordChip } from "./WordChip";
import { ImageCarousel, type ImageItem } from "./ImageCarousel";
import { ClassPointsPicker, type ClassOption } from "./ClassPointsPicker";

// ─── Types ──────────────────────────────────────────────────────────────

interface UsageExample {
  english_sentence: string;
  vietnamese_translation: string;
  vietnamese_explanation: string;
}

interface FormExample {
  english_sentence: string;
  vietnamese_translation: string;
}

interface WordForm {
  form: string;
  pos: string;
}

interface FormUsage {
  form: string;
  examples: FormExample[];
}

interface WordEnrichmentPayload {
  root_word: string;
  level: string;
  cefr?: CefrLevel;
  definition_en?: string;
  definition_vi?: string;
  synonyms: string[];
  antonyms: string[];
  word_forms: Array<string | WordForm>;
  form_usages?: FormUsage[];
  usages: UsageExample[];
}

interface PronunciationPayload {
  audioBase64: string;
  mime?: string;
  syllables: string[];
  duration: number;
  word: string;
}

interface Props {
  /** Optional callback so the parent (Vocabulary page) can refresh the Word Bank. */
  onWordSaved?: (entryId: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────

const DIFFICULT_LEVELS = new Set(["A2", "B1", "B2", "C1", "C2"]);

function speak(text: string, rate = 0.8) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  speechSynthesis.speak(u);
}

function normalizeWordForms(forms: Array<string | WordForm>): WordForm[] {
  return forms.map((f) =>
    typeof f === "string" ? { form: f, pos: "" } : f,
  );
}

/** Tokenizer + Jaccard match the server-side anti-cheat, so the client can
 *  warn the student before they hit Save. */
function tokenize(s: string): Set<string> {
  return new Set(
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2),
  );
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}
function looksCopied(userText: string, suggestions: string[]): boolean {
  const ut = tokenize(userText);
  if (ut.size < 3) return false;
  const userNorm = userText.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
  for (const s of suggestions) {
    const sNorm = s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
    if (userNorm === sNorm) return true;
    if (jaccard(ut, tokenize(s)) >= 0.85) return true;
  }
  return false;
}

const MAX_EXAMPLES = 4;

// ─── Main Component ─────────────────────────────────────────────────────

export function WordExplorer({ onWordSaved }: Props = {}) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Sentence parsing
  const [sentence, setSentence] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [activeWord, setActiveWord] = useState<string | null>(null);

  // Enrichment
  const [enrichment, setEnrichment] = useState<WordEnrichmentPayload | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [wordLevels, setWordLevels] = useState<Record<string, string>>({});

  // Pronunciation
  const [pronunciation, setPronunciation] = useState<PronunciationPayload | null>(null);
  const [pronouncing, setPronouncing] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [playingSentence, setPlayingSentence] = useState<number | null>(null);

  // Student-authored examples + image pick
  const [studentExamples, setStudentExamples] = useState<string[]>(["", "", "", ""]);
  const [pickedImage, setPickedImage] = useState<ImageItem | null>(null);

  // Save flow
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [classChoice, setClassChoice] = useState<{ open: boolean; classes: ClassOption[] } | null>(null);

  // Grammar gate state
  const [grammarChecking, setGrammarChecking] = useState(false);
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([]);
  const [grammarSummary, setGrammarSummary] = useState("");

  // Duplicate prevention state
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // CEFR target from profile
  const [targetCefr, setTargetCefr] = useState<CefrLevel>("A1");

  // Daily cap UI state — counter of words saved today + the limit.
  const [savesToday, setSavesToday] = useState<number>(0);
  const [dailyLimit, setDailyLimit] = useState<number>(10);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await getCefrLevel(supabase, user?.id);
      if (!cancelled) setTargetCefr(c);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Pull current day's save count via the SECURITY DEFINER RPC. We tolerate
  // its absence (older DB shape) — the server still enforces the cap.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      // Supabase generated types haven't been regenerated for this RPC yet —
      // route through `rpc<…>("…" as never, …)` to bypass the typed name.
      const { data, error } = await supabase.rpc(
        "count_vocab_saves_today" as never,
        { p_user_id: user.id } as never,
      );
      if (cancelled) return;
      if (!error && typeof data === "number") setSavesToday(data);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Sentence submit ──
  const handleSentenceSubmit = useCallback((text: string, parsedWords: string[]) => {
    setSentence(text);
    setWords(parsedWords);
    setActiveWord(null);
    setEnrichment(null);
    setPronunciation(null);
    setSaved(false);
    setStudentExamples(["", "", "", ""]);
    setPickedImage(null);
    setWordLevels({});
    setGrammarIssues([]);
    setGrammarSummary("");
    setIsDuplicate(false);
  }, []);

  // ── Word click → fetch enrichment ──
  const handleWordClick = useCallback(async (word: string) => {
    if (word === activeWord) return;
    setActiveWord(word);
    setEnrichment(null);
    setPronunciation(null);
    setEnrichmentLoading(true);
    setGrammarIssues([]);
    setGrammarSummary("");
    setIsDuplicate(false);
    setSaved(false);
    setStudentExamples(["", "", "", ""]);
    setPickedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke("word-enrichment", {
        body: { word, context: sentence || undefined, target_cefr: targetCefr },
      });

      if (error) {
        console.error("Enrichment error:", error);
        toast({
          title: "Could not look up word",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
        setEnrichmentLoading(false);
        return;
      }
      const payload = data as WordEnrichmentPayload;
      setEnrichment(payload);
      const levelForChip = payload.cefr || payload.level;
      if (levelForChip) {
        setWordLevels((prev) => ({ ...prev, [word.toLowerCase()]: levelForChip }));
      }

      // ── Duplicate check ──
      if (user?.id) {
        setCheckingDuplicate(true);
        try {
          const { data: existing } = await (supabase as any)
            .from("student_vocabulary_entries")
            .select("id")
            .eq("user_id", user.id)
            .eq("word", word.toLowerCase())
            .maybeSingle();
          setIsDuplicate(!!existing);
        } catch {
          setIsDuplicate(false);
        } finally {
          setCheckingDuplicate(false);
        }
      }
    } catch (err: any) {
      console.error("Enrichment fetch error:", err);
      toast({
        title: "Error",
        description: "Could not reach the AI service.",
        variant: "destructive",
      });
    } finally {
      setEnrichmentLoading(false);
    }
  }, [activeWord, sentence, targetCefr, toast]);

  // ── Natural-pronunciation playback ──
  const playPronunciation = useCallback(async () => {
    if (!enrichment) return;
    setPronouncing(true);
    try {
      let payload = pronunciation;
      if (!payload || payload.word.toLowerCase() !== enrichment.root_word.toLowerCase()) {
        const { data, error } = await supabase.functions.invoke("pronounce-syllables", {
          body: { word: enrichment.root_word },
        });
        if (error) throw error;
        if (!data?.audioBase64) throw new Error("No audio returned");
        payload = data as PronunciationPayload;
        setPronunciation(payload);
      }
      const audio = new Audio(`data:${payload.mime || "audio/mpeg"};base64,${payload.audioBase64}`);
      setPlayingAudio(true);
      audio.onended = () => setPlayingAudio(false);
      audio.onerror = () => setPlayingAudio(false);
      await audio.play();
    } catch (err: any) {
      console.error("pronounce error:", err);
      speak(enrichment.root_word, 0.7);
      toast({
        title: "Using basic TTS",
        description: err?.message || "Server pronunciation unavailable.",
      });
    } finally {
      setPronouncing(false);
    }
  }, [enrichment, pronunciation, toast]);

  const playExampleSentence = useCallback((text: string, index: number) => {
    setPlayingSentence(index);
    speak(text, 0.85);
    setTimeout(() => setPlayingSentence(null), Math.max(3000, text.length * 60));
  }, []);

  // ── Anti-cheat client-side preview ──
  const suggestedExamples = useMemo(() => {
    if (!enrichment) return [] as string[];
    const list: string[] = [];
    for (const u of enrichment.usages || []) {
      if (u?.english_sentence) list.push(u.english_sentence);
    }
    for (const fu of enrichment.form_usages || []) {
      for (const ex of fu.examples || []) {
        if (ex?.english_sentence) list.push(ex.english_sentence);
      }
    }
    return list;
  }, [enrichment]);

  const exampleStatuses = useMemo(() => studentExamples.map((ex) => {
    const trimmed = ex.trim();
    if (!trimmed) return "empty" as const;
    if (looksCopied(trimmed, suggestedExamples)) return "copied" as const;
    if (tokenize(trimmed).size < 3) return "tooShort" as const;
    // Run synchronous rule-based grammar checks (gibberish, structure, etc.)
    const grammarIssue = quickCheck(trimmed);
    if (grammarIssue) return { status: "grammar" as const, issue: grammarIssue };
    return "ok" as const;
  }), [studentExamples, suggestedExamples]);

  const hasAtLeastOneValid = exampleStatuses.some((s) => s === "ok");

  // ── Save flow ──
  const performSave = useCallback(async (classIdOverride?: string) => {
    if (!enrichment || !activeWord || !user?.id) return;

    // ── Duplicate gate (belt-and-suspenders) ──
    if (isDuplicate) {
      toast({
        title: "🎉 You already have this word!",
        description: `"${enrichment.root_word}" is already in your Word Bank. Great job learning it!`,
      });
      return;
    }

    // ── Harper grammar gate ──
    const validExamples = studentExamples
      .map((e) => e.trim())
      .filter((e, idx) => e && exampleStatuses[idx] === "ok");

    if (validExamples.length > 0) {
      setGrammarChecking(true);
      setGrammarIssues([]);
      setGrammarSummary("");
      try {
        // Check all valid examples through Harper
        let allIssues: GrammarIssue[] = [];
        for (const ex of validExamples) {
          const result = await checkGrammar(ex);
          if (!result.ok) {
            // Tag issues with which example they belong to
            allIssues = [...allIssues, ...result.issues];
          }
        }
        if (allIssues.length > 0) {
          setGrammarIssues(allIssues);
          setGrammarSummary(
            allIssues.length === 1
              ? "Almost there! Fix 1 small thing in your sentence and you're good to go! 💪"
              : `Almost there! Fix ${allIssues.length} small things in your sentences and you're good to go! 💪`,
          );
          setGrammarChecking(false);
          toast({
            title: "✏️ Check your sentences",
            description: "Fix the highlighted issues, then try saving again!",
          });
          return;
        }
      } catch {
        // If Harper fails, allow the save to proceed
        console.warn("Grammar check skipped");
      } finally {
        setGrammarChecking(false);
      }
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-word", {
        // No user_id: the function takes the student from the verified JWT,
        // so a save can only ever land on the signed-in user's word bank.
        body: {
          word: activeWord.toLowerCase(),
          root_word: enrichment.root_word,
          payload: enrichment,
          user_examples: validExamples,
          image_url: pickedImage?.url,
          class_id: classIdOverride,
          suggested_examples: suggestedExamples,
        },
      });

      if (error) {
        toast({
          title: "Save failed",
          description: error.message || "Could not save word.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success === false) {
        if (data.reason === "missing_class_choice" && Array.isArray(data.classes)) {
          setClassChoice({ open: true, classes: data.classes });
          return;
        }
        if (data.reason === "daily_limit") {
          if (typeof data.saves_today === "number") setSavesToday(data.saves_today);
          if (typeof data.daily_limit === "number") setDailyLimit(data.daily_limit);
          toast({
            title: "🌙 Daily word cap reached",
            description: data.message ||
              `You've saved your ${data.daily_limit ?? 10} new words for today — come back tomorrow!`,
            variant: "destructive",
          });
          return;
        }
        if (data.reason === "no_valid_examples") {
          toast({
            title: "Try writing your own sentences",
            description: data.message ||
              `Your example needs to use "${enrichment.root_word}" (or one of its forms) and be your own words.`,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Save failed",
          description: data.message || data.reason || "Unknown error.",
          variant: "destructive",
        });
        return;
      }

      setSaved(true);
      setClassChoice(null);
      if (typeof data?.saves_today === "number") setSavesToday(data.saves_today);
      if (typeof data?.daily_limit === "number") setDailyLimit(data.daily_limit);
      const pointsText = data?.points_awarded
        ? ` +${data.points_awarded} pts!`
        : data?.already_saved
          ? " (already in your bank)"
          : "";
      const remaining = typeof data?.saves_today === "number" && typeof data?.daily_limit === "number"
        ? Math.max(0, data.daily_limit - data.saves_today)
        : null;
      const remainingText = remaining !== null && !data?.already_saved
        ? remaining === 0
          ? " That was your last word for today!"
          : ` ${remaining} more new word${remaining === 1 ? "" : "s"} today.`
        : "";
      toast({
        title: "✅ Word saved!",
        description: `"${enrichment.root_word}" added to your word bank.${pointsText}${remainingText}`,
      });
      if (data?.id) onWordSaved?.(data.id);
    } catch (err: any) {
      toast({
        title: "Save error",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [
    enrichment, activeWord, user?.id, studentExamples,
    exampleStatuses, pickedImage, suggestedExamples, toast, onWordSaved, isDuplicate,
  ]);

  const handleClassChoice = useCallback((classId: string) => {
    setClassChoice((prev) => prev ? { ...prev, open: false } : null);
    performSave(classId);
  }, [performSave]);

  // ── Render ──
  const wordForms = enrichment ? normalizeWordForms(enrichment.word_forms || []) : [];
  const formUsages = enrichment?.form_usages || [];
  const cefrBadgeLevel = enrichment?.cefr || enrichment?.level || "A1";

  const capReached = savesToday >= dailyLimit;
  const remainingToday = Math.max(0, dailyLimit - savesToday);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Daily-cap indicator — always-on so students can pace themselves. */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-hec-lg border px-4 py-3 text-hec-small font-medium tabular-nums",
          capReached
            ? "border-hec-warn/30 bg-hec-warn-tint text-hec-ink"
            : "border-hec-line bg-hec-surface text-hec-ink-soft",
        )}
      >
        <div className="flex min-w-0 items-start gap-2">
          <CalendarClock className={cn("mt-1 h-4 w-4 shrink-0", capReached && "text-hec-warn")} />
          <span>
            {capReached
              ? `Today's word cap reached (${dailyLimit}/${dailyLimit}) — practice keeps earning points!`
              : `Today: ${savesToday} / ${dailyLimit} new words saved · ${remainingToday} left`}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1" aria-hidden="true">
          {Array.from({ length: dailyLimit }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-3 rounded-full",
                i < savesToday
                  ? "bg-hec-brass"
                  : "bg-hec-sunken",
              )}
            />
          ))}
        </div>
      </div>

      {/* Sentence Input */}
      <SentenceInput onSubmit={handleSentenceSubmit} loading={enrichmentLoading} />

      {/* Word Chips */}
      {words.length > 0 && (
        <div className="animate-in fade-in duration-hec-2">
          <div className="flex flex-wrap justify-center gap-2 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1">
            {words.map((w, i) => (
              <WordChip
                key={`${w}-${i}`}
                word={w}
                isHighlighted={DIFFICULT_LEVELS.has(wordLevels[w.toLowerCase()] || "")}
                isActive={activeWord === w}
                onClick={handleWordClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {enrichmentLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-full max-w-md space-y-4 px-4">
            <div className="mx-auto h-8 w-3/4 animate-pulse rounded-hec-md bg-hec-sunken" />
            <div className="h-5 w-full animate-pulse rounded-hec-md bg-hec-sunken" />
            <div className="h-5 w-5/6 animate-pulse rounded-hec-md bg-hec-sunken" />
            <div className="mt-2 h-24 w-full animate-pulse rounded-hec-md bg-hec-sunken" />
            <p className="pt-2 text-center text-hec-small text-hec-ink-soft">
              Looking up "<span className="font-bold">{activeWord}</span>"...
            </p>
          </div>
        </div>
      )}

      {/* Enrichment Panel */}
      {enrichment && activeWord && !enrichmentLoading && (
        <Card>
          <CardContent className="space-y-6 p-4 sm:p-6">

            {/* CEFR badge + root word */}
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md bg-hec-sunken">
                <BookOpen className="h-5 w-5 text-hec-ink-soft" />
              </div>
              <div className="min-w-0 space-y-1">
                <h2 className="break-words font-display text-hec-h1 font-medium capitalize text-hec-ink">
                  {enrichment.root_word}
                </h2>
                <Badge variant="brass">
                  <GraduationCap className="h-4 w-4" />
                  CEFR {cefrBadgeLevel}
                </Badge>
              </div>
            </div>

            {/* Definitions */}
            {(enrichment.definition_en || enrichment.definition_vi) && (
              <div className="space-y-2 rounded-hec-md border border-hec-line bg-hec-sunken p-4">
                {enrichment.definition_en && (
                  <p className="text-hec-body font-medium text-hec-ink">
                    {enrichment.definition_en}
                  </p>
                )}
                {enrichment.definition_vi && (
                  <p className="flex items-start gap-2 text-hec-body text-hec-ink-soft">
                    <span>🇻🇳</span>
                    <span className="min-w-0">{enrichment.definition_vi}</span>
                  </p>
                )}
              </div>
            )}

            {/* Image carousel with picker */}
            <ImageCarousel
              query={enrichment.root_word}
              pickedUrl={pickedImage?.url}
              onPick={(img) => setPickedImage(img)}
            />

            <Separator />

            {/* Natural pronunciation */}
            <div className="flex flex-col items-center gap-3">
              <Button
                type="button"
                onClick={playPronunciation}
                disabled={pronouncing || playingAudio}
                variant="outline"
              >
                {pronouncing || playingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
                {playingAudio ? "Playing…" : "Hear pronunciation"}
              </Button>
              {pronunciation?.syllables?.length ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {pronunciation.syllables.map((syl, i) => (
                    <span key={i} className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-hec-small font-semibold text-hec-ink"
                      >
                        {syl}
                      </Badge>
                      {i < pronunciation.syllables.length - 1 && (
                        <span className="text-hec-ink-faint">·</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Synonyms & Antonyms */}
            {(enrichment.synonyms.length > 0 || enrichment.antonyms.length > 0) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {enrichment.synonyms.length > 0 && (
                    <div className="space-y-2 rounded-hec-md border border-hec-line bg-hec-sunken p-3">
                      <p className="flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                        ✅ Similar Words
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {enrichment.synonyms.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => speak(s)}
                            className="inline-flex min-h-hec-target items-center rounded-full border border-hec-line-strong bg-hec-raised px-3 text-hec-small font-medium text-hec-ink transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {enrichment.antonyms.length > 0 && (
                    <div className="space-y-2 rounded-hec-md border border-hec-line bg-hec-sunken p-3">
                      <p className="flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                        <ArrowRightLeft className="h-4 w-4" /> Opposite Words
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {enrichment.antonyms.map((a, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => speak(a)}
                            className="inline-flex min-h-hec-target items-center rounded-full border border-hec-line-strong bg-hec-raised px-3 text-hec-small font-medium text-hec-ink transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Word forms + examples */}
            {wordForms.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <p className="flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                    <Sparkles className="h-4 w-4" /> Word Forms
                  </p>
                  {wordForms.map((wf, i) => {
                    const fu = formUsages.find((f) => f.form.toLowerCase() === wf.form.toLowerCase());
                    return (
                      <div
                        key={`${wf.form}-${i}`}
                        className="space-y-2 rounded-hec-md border border-hec-line bg-hec-surface p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="min-w-0 break-words text-hec-h3 text-hec-ink">
                            {wf.form}
                            {wf.pos && (
                              <span className="ml-2 text-hec-small font-normal text-hec-ink-soft">
                                ({wf.pos})
                              </span>
                            )}
                          </h3>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 rounded-full text-hec-ink-soft"
                            onClick={() => speak(wf.form)}
                            aria-label={`Pronounce ${wf.form}`}
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {fu?.examples?.map((ex, j) => (
                          <div key={j} className="space-y-1">
                            <p className="text-hec-body text-hec-ink">{ex.english_sentence}</p>
                            <p className="text-hec-small italic text-hec-ink-soft">
                              {ex.vietnamese_translation}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Root-word usages */}
            {enrichment.usages?.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                    <Languages className="h-4 w-4" /> Examples with Vietnamese
                  </p>
                  {enrichment.usages.map((usage, i) => (
                    <div
                      key={i}
                      className="space-y-2 rounded-hec-md border border-hec-line bg-hec-surface p-4"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-2 shrink-0 text-hec-small font-semibold tabular-nums text-hec-ink-faint">
                          {i + 1}.
                        </span>
                        <p className="min-w-0 flex-1 pt-2 text-hec-body font-medium text-hec-ink">
                          {usage.english_sentence}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 rounded-full text-hec-ink-soft"
                          onClick={() => playExampleSentence(usage.english_sentence, i)}
                          disabled={playingSentence === i}
                          aria-label="Listen to this sentence"
                        >
                          {playingSentence === i ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="space-y-1 pl-6">
                        <p className="flex items-start gap-2 text-hec-body text-hec-ink-soft">
                          <span>🇻🇳</span>
                          <span className="min-w-0">{usage.vietnamese_translation}</span>
                        </p>
                        {usage.vietnamese_explanation && (
                          <p className="rounded-hec-sm bg-hec-sunken px-3 py-2 text-hec-small italic text-hec-ink-soft">
                            💡 {usage.vietnamese_explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator />

            {/* Student examples (anti-cheat) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                  <Pencil className="h-4 w-4" /> Your Own Examples
                </p>
                <span className="text-hec-caption text-hec-ink-soft">
                  Write 1–{MAX_EXAMPLES} sentences in your own words
                </span>
              </div>
              {studentExamples.map((ex, i) => {
                const status = exampleStatuses[i];
                const statusKey = typeof status === "object" ? status.status : status;
                const grammarIssue = typeof status === "object" ? status.issue : null;
                return (
                  <div key={i} className="space-y-1">
                    <Textarea
                      value={ex}
                      onChange={(e) => {
                        const next = [...studentExamples];
                        next[i] = e.target.value;
                        setStudentExamples(next);
                      }}
                      placeholder={`Example ${i + 1} — your own sentence using "${enrichment.root_word}"`}
                      rows={2}
                      className={cn(
                        statusKey === "copied" && "border-hec-danger",
                        statusKey === "grammar" && "border-hec-warn",
                        statusKey === "ok" && "border-hec-leaf",
                      )}
                    />
                    {statusKey === "copied" && (
                      <p className="flex items-start gap-1 text-hec-caption text-hec-danger">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        Looks copied from a suggestion — write it in your own words.
                      </p>
                    )}
                    {statusKey === "tooShort" && ex.trim() && (
                      <p className="text-hec-caption text-hec-ink-soft">Add a few more words.</p>
                    )}
                    {statusKey === "grammar" && grammarIssue && (
                      <div className="flex items-start gap-2 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint px-3 py-2 text-hec-caption text-hec-ink">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-hec-warn" />
                        <div className="min-w-0">
                          <p>{grammarIssue.message}</p>
                          {grammarIssue.suggestion && (
                            <p className="mt-1">
                              Try: <span className="rounded-hec-sm bg-hec-leaf-tint px-1 font-mono text-hec-leaf">{grammarIssue.suggestion}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {statusKey === "ok" && (
                      <p className="flex items-center gap-1 text-hec-caption text-hec-leaf">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Looks great!
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {pickedImage && (
              <p className="flex items-center gap-2 text-hec-caption text-hec-ink-soft">
                <ImageIcon className="h-4 w-4 shrink-0" />
                Image picked from {pickedImage.source}.
              </p>
            )}

            {/* Grammar Issues */}
            {grammarIssues.length > 0 && (
              <div className="space-y-3 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-4">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-hec-warn" />
                  <p className="min-w-0 text-hec-small font-semibold text-hec-ink">
                    {grammarSummary}
                  </p>
                </div>
                <div className="space-y-2">
                  {grammarIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-hec-small">
                      <span className="shrink-0 text-hec-warn" aria-hidden="true">⚠️</span>
                      <div className="min-w-0">
                        <p className="text-hec-ink">
                          {issue.message}
                        </p>
                        {issue.problematicText && (
                          <p className="mt-1 text-hec-caption text-hec-ink-soft">
                            Found: <span className="rounded-hec-sm bg-hec-raised px-1 font-mono text-hec-ink">"{issue.problematicText}"</span>
                            {issue.suggestion && (
                              <span> → Try: <span className="rounded-hec-sm bg-hec-leaf-tint px-1 font-mono text-hec-leaf">"{issue.suggestion}"</span></span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicate Detection Banner */}
            {isDuplicate && (
              <div className="space-y-2 rounded-hec-md border border-hec-leaf/30 bg-hec-leaf-tint p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-hec-surface">
                    <PartyPopper className="h-6 w-6 text-hec-leaf" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-hec-body font-semibold text-hec-ink">
                      🎉 You already have this word in your Word Bank!
                    </p>
                    <p className="text-hec-small text-hec-ink-soft">
                      Great job! Keep practicing it in the Practice tab to master it.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2">
              {saved ? (
                <div className="flex items-center justify-center gap-2 rounded-hec-md border border-hec-leaf/30 bg-hec-leaf-tint px-4 py-3 text-center text-hec-body font-medium text-hec-leaf">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  Word saved to your bank!
                </div>
              ) : isDuplicate ? (
                <div className="flex items-center justify-center gap-2 rounded-hec-md border border-hec-leaf/30 bg-hec-leaf-tint px-4 py-3 text-center text-hec-body font-medium text-hec-leaf">
                  <PartyPopper className="h-5 w-5 shrink-0" />
                  Already in your Word Bank — go practice it! 🚀
                </div>
              ) : (
                <Button
                  onClick={() => performSave()}
                  disabled={saving || grammarChecking || !hasAtLeastOneValid || capReached}
                  className="h-auto w-full whitespace-normal py-3 text-center"
                >
                  {saving || grammarChecking ? (
                    <><Loader2 className="h-5 w-5 animate-spin" />{grammarChecking ? "Checking grammar…" : "Saving…"}</>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {capReached
                        ? `Daily cap reached (${dailyLimit}/${dailyLimit}) — try again tomorrow`
                        : hasAtLeastOneValid
                          ? "Save to My Word Bank ✨"
                          : "Write at least one example to save"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-class picker */}
      {classChoice && (
        <ClassPointsPicker
          open={classChoice.open}
          classes={classChoice.classes}
          onChoose={handleClassChoice}
          onClose={() => setClassChoice(null)}
        />
      )}
    </div>
  );
}
