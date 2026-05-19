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
import { checkGrammar, type GrammarIssue } from "@/lib/grammarChecker";

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

const LEVEL_COLORS: Record<string, string> = {
  "A1": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "A2": "bg-blue-100 text-blue-700 border-blue-300",
  "B1": "bg-amber-100 text-amber-700 border-amber-300",
  "B2": "bg-rose-100 text-rose-700 border-rose-300",
  "C1": "bg-purple-100 text-purple-700 border-purple-300",
  "C2": "bg-slate-100 text-slate-700 border-slate-300",
};

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
    if (!trimmed) return "empty";
    if (looksCopied(trimmed, suggestedExamples)) return "copied";
    if (tokenize(trimmed).size < 3) return "tooShort";
    return "ok";
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
        body: {
          user_id: user.id,
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
          "flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-sm font-medium shadow-sm",
          capReached
            ? "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-100"
            : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarClock className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {capReached
              ? `Today's word cap reached (${dailyLimit}/${dailyLimit}) — practice keeps earning points!`
              : `Today: ${savesToday} / ${dailyLimit} new words saved · ${remainingToday} left`}
          </span>
        </div>
        <div className="flex items-center gap-1" aria-hidden="true">
          {Array.from({ length: dailyLimit }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-3 rounded-full transition-colors",
                i < savesToday
                  ? "bg-violet-500"
                  : "bg-slate-200 dark:bg-slate-700",
              )}
            />
          ))}
        </div>
      </div>

      {/* Sentence Input */}
      <SentenceInput onSubmit={handleSentenceSubmit} loading={enrichmentLoading} />

      {/* Word Chips */}
      {words.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex flex-wrap gap-2 justify-center p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border shadow-sm">
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
        <div className="flex items-center justify-center py-12 animate-in fade-in duration-200">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Looking up "<span className="font-bold">{activeWord}</span>"...
            </p>
          </div>
        </div>
      )}

      {/* Enrichment Panel */}
      {enrichment && activeWord && !enrichmentLoading && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-violet-50/30 dark:from-slate-900 dark:to-violet-950/20 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <CardContent className="p-5 sm:p-6 space-y-5">

            {/* CEFR badge + root word */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black capitalize text-foreground">
                  {enrichment.root_word}
                </h2>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold border mt-0.5",
                    LEVEL_COLORS[cefrBadgeLevel] || "bg-slate-100 text-slate-600",
                  )}
                >
                  <GraduationCap className="w-3 h-3 mr-1" />
                  CEFR {cefrBadgeLevel}
                </Badge>
              </div>
            </div>

            {/* Definitions */}
            {(enrichment.definition_en || enrichment.definition_vi) && (
              <div className="rounded-xl bg-white dark:bg-slate-800/50 border p-4 space-y-2">
                {enrichment.definition_en && (
                  <p className="text-base font-medium text-foreground leading-snug">
                    {enrichment.definition_en}
                  </p>
                )}
                {enrichment.definition_vi && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                    <span>🇻🇳</span>
                    <span>{enrichment.definition_vi}</span>
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
                className="rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-lg gap-2 h-12 px-6"
              >
                {pronouncing || playingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
                {playingAudio ? "Playing…" : "Hear pronunciation"}
              </Button>
              {pronunciation?.syllables?.length ? (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {pronunciation.syllables.map((syl, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="text-sm font-bold px-3 py-1 bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300"
                      >
                        {syl}
                      </Badge>
                      {i < pronunciation.syllables.length - 1 && (
                        <span className="text-muted-foreground">·</span>
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
                    <div className="bg-teal-50 dark:bg-teal-950/20 rounded-xl p-3.5 space-y-2 border border-teal-200 dark:border-teal-800">
                      <p className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                        ✅ Similar Words
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {enrichment.synonyms.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => speak(s)}
                            className="px-3 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 text-sm font-medium hover:bg-teal-200 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {enrichment.antonyms.length > 0 && (
                    <div className="bg-rose-50 dark:bg-rose-950/20 rounded-xl p-3.5 space-y-2 border border-rose-200 dark:border-rose-800">
                      <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3" /> Opposite Words
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {enrichment.antonyms.map((a, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => speak(a)}
                            className="px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-sm font-medium hover:bg-rose-200 transition-colors"
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
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Word Forms
                  </p>
                  {wordForms.map((wf, i) => {
                    const fu = formUsages.find((f) => f.form.toLowerCase() === wf.form.toLowerCase());
                    return (
                      <div
                        key={`${wf.form}-${i}`}
                        className="rounded-xl border bg-white dark:bg-slate-800/40 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-bold">
                            {wf.form}
                            {wf.pos && (
                              <span className="ml-2 text-sm font-normal text-muted-foreground">
                                ({wf.pos})
                              </span>
                            )}
                          </h3>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-violet-500 hover:bg-violet-50"
                            onClick={() => speak(wf.form)}
                            aria-label={`Pronounce ${wf.form}`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {fu?.examples?.map((ex, j) => (
                          <div key={j} className="text-sm space-y-0.5">
                            <p className="text-foreground">{ex.english_sentence}</p>
                            <p className="text-xs text-muted-foreground italic">
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
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5" /> Examples with Vietnamese
                  </p>
                  {enrichment.usages.map((usage, i) => (
                    <div
                      key={i}
                      className="rounded-xl border bg-white dark:bg-slate-800/50 p-4 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-black text-violet-500 shrink-0 mt-0.5">
                          {i + 1}.
                        </span>
                        <p className="text-sm font-medium text-foreground flex-1">
                          {usage.english_sentence}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 rounded-full text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => playExampleSentence(usage.english_sentence, i)}
                          disabled={playingSentence === i}
                        >
                          {playingSentence === i ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                      <div className="pl-5 space-y-1">
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1.5">
                          <span>🇻🇳</span>
                          {usage.vietnamese_translation}
                        </p>
                        {usage.vietnamese_explanation && (
                          <p className="text-xs text-muted-foreground italic bg-blue-50/50 dark:bg-blue-950/20 rounded-lg px-2.5 py-1.5">
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
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Your Own Examples
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Write 1–{MAX_EXAMPLES} sentences in your own words
                </span>
              </div>
              {studentExamples.map((ex, i) => {
                const status = exampleStatuses[i];
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
                        "rounded-lg text-sm",
                        status === "copied" && "border-rose-400 focus-visible:ring-rose-300",
                        status === "ok" && "border-emerald-400 focus-visible:ring-emerald-300",
                      )}
                    />
                    {status === "copied" && (
                      <p className="text-xs text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Looks copied from a suggestion — write it in your own words.
                      </p>
                    )}
                    {status === "tooShort" && ex.trim() && (
                      <p className="text-[11px] text-muted-foreground">Add a few more words.</p>
                    )}
                    {status === "ok" && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Looks great!
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {pickedImage && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Image picked from {pickedImage.source}.
              </p>
            )}

            {/* Grammar Issues */}
            {grammarIssues.length > 0 && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                    {grammarSummary}
                  </p>
                </div>
                <div className="space-y-2">
                  {grammarIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
                      <div>
                        <p className="text-amber-900 dark:text-amber-100">
                          {issue.message}
                        </p>
                        {issue.problematicText && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                            Found: <span className="font-mono bg-amber-200/60 dark:bg-amber-900/40 px-1 rounded">"{issue.problematicText}"</span>
                            {issue.suggestion && (
                              <span> → Try: <span className="font-mono bg-emerald-200/60 dark:bg-emerald-900/40 px-1 rounded">"{issue.suggestion}"</span></span>
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
              <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 dark:border-emerald-800 p-5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <PartyPopper className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800 dark:text-emerald-200 text-base">
                      🎉 You already have this word in your Word Bank!
                    </p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      Great job! Keep practicing it in the Practice tab to master it.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2">
              {saved ? (
                <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-700 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                  Word saved to your bank!
                </div>
              ) : isDuplicate ? (
                <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-700 dark:text-emerald-300 font-bold">
                  <PartyPopper className="w-5 h-5" />
                  Already in your Word Bank — go practice it! 🚀
                </div>
              ) : (
                <Button
                  onClick={() => performSave()}
                  disabled={saving || grammarChecking || !hasAtLeastOneValid || capReached}
                  className={cn(
                    "w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all",
                    hasAtLeastOneValid && !capReached
                      ? "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white hover:shadow-xl"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed",
                  )}
                >
                  {saving || grammarChecking ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" />{grammarChecking ? "Checking grammar…" : "Saving…"}</>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
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
