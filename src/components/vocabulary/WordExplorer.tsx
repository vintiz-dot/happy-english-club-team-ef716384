import { useState, useCallback, useEffect } from "react";
import {
  BookOpen, Volume2, Loader2, ArrowRightLeft, Save, CheckCircle2,
  GraduationCap, Languages, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getCefrLevel, type CefrLevel } from "@/lib/cefr";

import { SentenceInput } from "./SentenceInput";
import { WordChip } from "./WordChip";
import { ImageCarousel } from "./ImageCarousel";
import { VisualSortingSandbox } from "./VisualSortingSandbox";

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
  /** May be string[] (legacy) or WordForm[] (new). Normalised on read. */
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

// ─── Main Component ─────────────────────────────────────────────────────

export function WordExplorer() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Sentence parsing state
  const [sentence, setSentence] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [activeWord, setActiveWord] = useState<string | null>(null);

  // Enrichment state
  const [enrichment, setEnrichment] = useState<WordEnrichmentPayload | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [wordLevels, setWordLevels] = useState<Record<string, string>>({});

  // Pronunciation (syllable-aware) state
  const [pronunciation, setPronunciation] = useState<PronunciationPayload | null>(null);
  const [pronouncing, setPronouncing] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  // Per-example sentence playback
  const [playingSentence, setPlayingSentence] = useState<number | null>(null);

  // CEFR target from profile (falls back to A1).
  const [targetCefr, setTargetCefr] = useState<CefrLevel>("A1");

  // Save state
  const [sandboxPassed, setSandboxPassed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hydrate CEFR from profile on mount / when user changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await getCefrLevel(supabase, user?.id);
      if (!cancelled) setTargetCefr(c);
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
    setSandboxPassed(false);
    setSaved(false);
    setWordLevels({});
  }, []);

  // ── Word click → fetch enrichment ──
  const handleWordClick = useCallback(async (word: string) => {
    if (word === activeWord) return;
    setActiveWord(word);
    setEnrichment(null);
    setPronunciation(null);
    setEnrichmentLoading(true);
    setSandboxPassed(false);
    setSaved(false);

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

  // ── Fetch & play syllable-aware pronunciation ──
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
      console.error("pronounce-syllables error:", err);
      // Graceful browser-TTS fallback.
      speak(enrichment.root_word, 0.7);
      toast({
        title: "Using basic TTS",
        description: err?.message || "Syllable pronunciation unavailable.",
      });
    } finally {
      setPronouncing(false);
    }
  }, [enrichment, pronunciation, toast]);

  // ── Example-sentence playback (browser TTS only — keeps things simple) ──
  const playExampleSentence = useCallback((text: string, index: number) => {
    setPlayingSentence(index);
    speak(text, 0.85);
    // SpeechSynthesisUtterance doesn't reliably fire onend across browsers, so use a timeout.
    setTimeout(() => setPlayingSentence(null), Math.max(3000, text.length * 60));
  }, []);

  // ── Save word ──
  const handleSaveWord = useCallback(async () => {
    if (!enrichment || !activeWord) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("save-word", {
        body: {
          word: activeWord.toLowerCase(),
          root_word: enrichment.root_word,
          payload: enrichment,
          image_urls: { target: activeWord, antonyms: enrichment.antonyms },
        },
      });

      if (error) {
        toast({
          title: "Save failed",
          description: error.message || "Could not save word.",
          variant: "destructive",
        });
      } else {
        setSaved(true);
        toast({
          title: "✅ Word Saved!",
          description: `"${enrichment.root_word}" has been saved to your word bank.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Save error",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [enrichment, activeWord, toast]);

  const handleSandboxComplete = useCallback((correct: boolean) => {
    setSandboxPassed(correct);
  }, []);

  // ── Render ──
  const wordForms = enrichment ? normalizeWordForms(enrichment.word_forms || []) : [];
  const formUsages = enrichment?.form_usages || [];
  const cefrBadgeLevel = enrichment?.cefr || enrichment?.level || "A1";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ── Sentence Input ── */}
      <SentenceInput onSubmit={handleSentenceSubmit} loading={enrichmentLoading} />

      {/* ── Word Chips Row ── */}
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

      {/* ── Loading ── */}
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

      {/* ── Enrichment Panel ── */}
      {enrichment && activeWord && !enrichmentLoading && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-violet-50/30 dark:from-slate-900 dark:to-violet-950/20 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <CardContent className="p-5 sm:p-6 space-y-5">

            {/* 1. CEFR badge + root word */}
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

            {/* 2. Definitions (EN large, VI smaller muted) */}
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

            {/* 3. Image carousel */}
            <ImageCarousel query={enrichment.root_word} />

            <Separator />

            {/* 4. Audio button + syllable chips */}
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
                {playingAudio ? "Playing…" : "Hear by syllable"}
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

            {/* 5. Synonyms & Antonyms */}
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

            {/* 6. Word forms + examples */}
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

            {/* 7. Existing 3 root-word usages with Vietnamese */}
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
                      className="rounded-xl border bg-white dark:bg-slate-800/50 p-4 space-y-2 animate-in fade-in duration-300"
                      style={{ animationDelay: `${i * 100}ms` }}
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
                          aria-label="Play example sentence"
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

            {/* Visual sorting practice (kept) */}
            {enrichment.antonyms.length > 0 && (
              <>
                <Separator />
                <VisualSortingSandbox
                  targetWord={enrichment.root_word}
                  antonyms={enrichment.antonyms}
                  onComplete={handleSandboxComplete}
                />
              </>
            )}

            {/* 8. Save button */}
            <div className="pt-2">
              {saved ? (
                <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-700 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                  Word saved to your bank!
                </div>
              ) : (
                <Button
                  onClick={handleSaveWord}
                  disabled={
                    saving ||
                    (!sandboxPassed && enrichment.antonyms.length > 0)
                  }
                  className={cn(
                    "w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all",
                    sandboxPassed || enrichment.antonyms.length === 0
                      ? "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white hover:shadow-xl"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed",
                  )}
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      {sandboxPassed || enrichment.antonyms.length === 0
                        ? "Save to My Word Bank ✨"
                        : "Complete the quiz above to save 🔒"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
