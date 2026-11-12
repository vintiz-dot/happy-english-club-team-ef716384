import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Volume2, Check, Loader2, BookOpen, Lightbulb, PenLine, Timer, SpellCheck, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getCEFRBadgeLabel, getCEFRProfile } from "@/lib/cefrMapping";
import { VisemePlayer } from "./VisemePlayer";
import { Skeleton } from "@/components/ui/skeleton";

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

interface Props {
  onAddWord: (w: { word: string; partOfSpeech: string; meaning: string; example: string; imageUrl: string }) => void;
}

interface DictDefinition { definition: string; example?: string; }
interface DictMeaning { partOfSpeech: string; definitions: DictDefinition[]; }
interface DictEntry { word: string; phonetic?: string; phonetics?: { text?: string; audio?: string }[]; meanings: DictMeaning[]; }

/** v2 ESL Dictionary entry returned by the refactored smart-dictionary edge function */
interface ESLDictEntry {
  target_word: string;
  part_of_speech: string;
  cefr_level: string;
  vietnamese_translation: string;
  english_definition: string;
  usage_examples: string[];
  synonyms: string[];
  antonyms: string[];
}

const POS_OPTIONS = [
  { value: "noun", label: "Noun (n.)" }, { value: "verb", label: "Verb (v.)" },
  { value: "adjective", label: "Adj (adj.)" }, { value: "adverb", label: "Adv (adv.)" },
  { value: "phrase", label: "Phrase" }, { value: "other", label: "Other" },
];
// Part-of-speech chips are a category palette (four things told apart): left as they are
// until a category palette is designed (DESIGN_SYSTEM s.18). Listed in docs/evidence/A4.6/R07.md.
const POS_COLORS: Record<string, string> = {
  noun: "bg-blue-100 text-blue-700", verb: "bg-emerald-100 text-emerald-700",
  adjective: "bg-amber-100 text-amber-700", adverb: "bg-purple-100 text-purple-700",
};

function speak(text: string, lang = "en-US", rate = 0.8) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = rate;
  speechSynthesis.speak(u);
}

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";
const POS_NEUTRAL = "border-hec-line bg-hec-sunken text-hec-ink-soft";
const CHIP = `inline-flex min-h-hec-target items-center rounded-full border border-hec-line-strong bg-hec-raised px-3 text-hec-small font-medium text-hec-ink transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken ${FOCUS}`;

const GRADE_KEY = "hec-vocab-grade";
const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8"];

export function VocabularyCreator({ onAddWord }: Props) {
  const [grade, setGrade] = useState(() => localStorage.getItem(GRADE_KEY) || "");
  const [word, setWord] = useState("");
  const [pos, setPos] = useState("noun");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [images, setImages] = useState<{ url: string; alt: string; source?: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [fetchingImages, setFetchingImages] = useState(false);
  const [listeningField, setListeningField] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [dictData, setDictData] = useState<DictEntry | null>(null);
  const [eslEntry, setEslEntry] = useState<ESLDictEntry | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [viTranslation, setViTranslation] = useState("");
  const [viDefinitions, setViDefinitions] = useState<Record<string, string>>({});
  const [grammarResult, setGrammarResult] = useState<string | null>(null);
  const [checkingGrammar, setCheckingGrammar] = useState(false);

  const recRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const grammarRef = useRef<ReturnType<typeof setTimeout>>();
  const { toast } = useToast();

  const gradeNum = parseInt(grade) || 0;
  const setAndSaveGrade = (g: string) => { setGrade(g); localStorage.setItem(GRADE_KEY, g); };

  // ---- Word change: triggers dictionary + images + translation ----
  const onWordChange = (val: string) => {
    setWord(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setImages([]); setSelectedImage(""); setDictData(null); setEslEntry(null); setViTranslation("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      const q = val.trim().toLowerCase();
      fetchDictionary(q);
      fetchImages(q);
      fetchVietnamese(q);
    }, 700);
  };

  // ---- Dictionary API (v2 ESL Dictionary via Edge Function) ----
  const fetchDictionary = async (q: string) => {
    setDictLoading(true); setDictData(null); setEslEntry(null); setViDefinitions({});
    try {
      // Use v2 API with target_word + cefr_level
      const cefrLevel = getCEFRProfile(gradeNum || 3).level;
      const { data, error } = await supabase.functions.invoke("smart-dictionary", {
        body: {
          target_word: q,
          part_of_speech: pos !== "other" ? pos : "",
          cefr_level: cefrLevel,
        },
      });

      if (!error && data && !data.error) {
        // v2 response — single ESLDictEntry object
        if (data.target_word && data.english_definition) {
          const entry = data as ESLDictEntry;
          setEslEntry(entry);
          // Auto-set part of speech from LLM response
          const m = POS_OPTIONS.find(p => entry.part_of_speech?.startsWith(p.value));
          if (m) setPos(m.value);
          // Auto-fill Vietnamese translation
          if (entry.vietnamese_translation) {
            setViTranslation(entry.vietnamese_translation);
            if (!meaning.trim()) setMeaning(entry.vietnamese_translation);
          }
          // Convert to legacy DictEntry for the existing UI rendering
          setDictData({
            word: entry.target_word,
            meanings: [{
              partOfSpeech: entry.part_of_speech,
              definitions: [{
                definition: entry.english_definition,
                example: entry.usage_examples?.[0] || "",
              }],
            }],
          });
          setDictLoading(false);
          return;
        }
        // v1 legacy response — array of DictEntry
        if (Array.isArray(data) && data[0]) {
          setDictData(data[0]);
          const firstPos = data[0].meanings[0]?.partOfSpeech;
          if (firstPos) {
            const m = POS_OPTIONS.find(p => firstPos.startsWith(p.value));
            if (m) setPos(m.value);
          }
        }
      } else {
        // Fallback to free dictionary API
        const res = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(q));
        if (res.ok) {
          const fallbackData: DictEntry[] = await res.json();
          if (fallbackData?.[0]) {
            setDictData(fallbackData[0]);
            const firstPos = fallbackData[0].meanings[0]?.partOfSpeech;
            if (firstPos) {
              const m = POS_OPTIONS.find(p => firstPos.startsWith(p.value));
              if (m) setPos(m.value);
            }
          }
        }
      }
    } catch { /* silent */ }
    setDictLoading(false);
  };

  // ---- Vietnamese translation (MyMemory API, free, no key) ----
  const fetchVietnamese = async (q: string) => {
    setViTranslation("");
    try {
      const res = await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(q) + "&langpair=en|vi");
      if (res.ok) {
        const data = await res.json();
        const t = data?.responseData?.translatedText;
        if (t && t.toLowerCase() !== q.toLowerCase()) {
          setViTranslation(t);
          if (!meaning.trim()) setMeaning(t);
        }
      }
    } catch { /* silent */ }
  };

  // ---- Image search (Pixabay/Pexels via Edge Function) ----
  const fetchImages = async (q: string) => {
    setFetchingImages(true); setImages([]); setSelectedImage("");
    try {
      const { data, error } = await supabase.functions.invoke("image-search", {
        body: { query: q, count: 12 },
      });
      if (!error && data?.images && data.images.length > 0) {
        const imgs = data.images.map((img: any) => ({ url: img.thumbnail || img.url, alt: img.alt, source: img.source }));
        setImages(imgs);
        setSelectedImage(imgs[0].url);
      }
    } catch { /* silent */ }
    setFetchingImages(false);
  };

  // ---- Grammar check on example sentence (debounced, via edge function) ----
  const onExampleChange = (val: string) => {
    setExample(val);
    setGrammarResult(null);
    clearTimeout(grammarRef.current);
    if (val.trim().length < 5) return;
    grammarRef.current = setTimeout(() => checkGrammar(val.trim()), 1200);
  };

  const checkGrammar = async (text: string) => {
    setCheckingGrammar(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-dictation", {
        body: { rawText: text, targetLanguage: "en" },
      });
      if (!error && data?.correctedText && !data.warning) {
        const corrected = data.correctedText;
        if (corrected.toLowerCase() !== text.toLowerCase()) {
          setGrammarResult(corrected);
        } else {
          setGrammarResult(null); // No corrections needed
        }
      }
    } catch { /* AI unavailable, silent */ }
    setCheckingGrammar(false);
  };

  const acceptGrammarFix = () => {
    if (grammarResult) { setExample(grammarResult); setGrammarResult(null); }
  };

  // ---- Dictionary audio ----
  const playDictAudio = () => {
    if (!dictData?.phonetics) { speak(dictData?.word || word); return; }
    const audioUrl = dictData.phonetics.find(p => p.audio)?.audio;
    if (audioUrl) { new Audio(audioUrl).play(); } else { speak(dictData.word); }
  };

  // ---- Voice with countdown timer ----
  const startVoiceWithCountdown = (field: string, lang: string) => {
    if (listeningField === field) { recRef.current?.stop(); setListeningField(null); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast({ title: "Not Supported", description: "Speech recognition unavailable.", variant: "destructive" }); return; }

    // 3-second countdown
    setCountdown(3);
    let count = 3;
    const timer = setInterval(() => {
      count--;
      if (count > 0) { setCountdown(count); return; }
      clearInterval(timer);
      setCountdown(null);
      // Start recording
      const rec = new SR();
      rec.lang = lang; rec.continuous = false; rec.interimResults = false;
      rec.onresult = (e: any) => {
        const t = e.results[0][0].transcript;
        if (field === "word") onWordChange(t);
        else if (field === "meaning") setMeaning(prev => prev ? prev + " " + t : t);
        else if (field === "example") setExample(prev => prev ? prev + " " + t : t);
        setListeningField(null);
      };
      rec.onerror = () => setListeningField(null);
      rec.onend = () => setListeningField(null);
      recRef.current = rec;
      rec.start();
      setListeningField(field);
    }, 1000);
  };

  // ---- Submit ----
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) {
      toast({ title: "Required", description: "Please enter the word and its meaning.", variant: "destructive" }); return;
    }
    onAddWord({
      word: word.trim(), partOfSpeech: pos, meaning: meaning.trim(),
      example: example.trim() || ("I learned the word " + word.trim() + " today."),
      imageUrl: selectedImage || ("https://picsum.photos/seed/" + Date.now() + "/400/300"),
    });
    setWord(""); setMeaning(""); setExample(""); setSelectedImage(""); setImages([]);
    setDictData(null); setEslEntry(null); setViTranslation(""); setGrammarResult(null);
    toast({ title: "Word Added! ✨", description: word.trim() + " is now in your vocabulary." });
  };

  const MicBtn = ({ field, lang }: { field: string; lang: string }) => {
    const active = listeningField === field;
    return (
      <Button type="button" variant={active ? "default" : "ghost"} size="icon"
        onClick={() => startVoiceWithCountdown(field, lang)}
        aria-label={active ? "Stop" : "Speak"} aria-pressed={active}
        className="shrink-0 rounded-full">
        {active ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </Button>
    );
  };

  return (
    <>
      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-hec-scrim/60 p-4">
          <div role="status" aria-live="assertive" className="space-y-4 rounded-hec-lg border border-hec-line bg-hec-raised p-8 text-center shadow-hec-3 animate-in fade-in">
            <div className="text-8xl font-semibold tabular-nums text-hec-ink">{countdown}</div>
            <p className="text-hec-h3 font-medium text-hec-ink-soft">Get ready to speak...</p>
            <Timer className="mx-auto h-8 w-8 text-hec-brass" aria-hidden="true" />
          </div>
        </div>
      )}

      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-center">
            Add a New Word
          </CardTitle>
          <p className="text-center text-hec-small text-hec-ink-soft">Tap 🎤 to speak or type your word</p>
        </CardHeader>
        <CardContent>
          {/* Grade Selector (shown if not set) */}
          {!grade ? (
            <div className="space-y-4 py-6 text-center">
              <div className="text-5xl" aria-hidden="true">🎓</div>
              <h3 className="font-display text-hec-h2 font-medium text-hec-ink">What grade are you in?</h3>
              <p className="text-hec-small text-hec-ink-soft">This helps us show definitions you can understand.</p>
              <div className="mx-auto grid max-w-xs grid-cols-4 gap-3">
                {GRADES.map(g => (
                  <Button key={g} variant="outline" onClick={() => setAndSaveGrade(g)}
                    className="h-14 text-hec-h3 font-semibold tabular-nums">
                    {g}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Grade + CEFR indicator */}
            <div className="flex items-center justify-end gap-2">
              <Badge variant="brass">
                {getCEFRBadgeLabel(gradeNum)}
              </Badge>
              <button type="button" onClick={() => setAndSaveGrade("")} className={`flex min-h-hec-target items-center gap-1 rounded-hec-sm px-2 text-hec-caption text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:text-hec-ink ${FOCUS}`}>
                🎓 Grade {grade}
                <span className="underline">change</span>
              </button>
            </div>

            {/* Word + POS */}
            <div className="space-y-2">
              <Label className="text-hec-body font-semibold text-hec-ink">English Word</Label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Input placeholder="e.g. exercise" value={word} onChange={e => onWordChange(e.target.value)} className="h-12 pr-24 text-hec-body" />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {word && <Button type="button" variant="ghost" size="icon" className="rounded-full text-hec-brass" aria-label="Listen" onClick={() => speak(word)}><Volume2 className="w-4 h-4" aria-hidden="true" /></Button>}
                    <MicBtn field="word" lang="en-US" />
                  </div>
                </div>
                <Select value={pos} onValueChange={setPos}>
                  <SelectTrigger className="h-12 w-[120px] shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>{POS_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Smart Word Explorer */}
            {dictLoading && <div className="flex items-center gap-2 text-hec-small text-hec-ink-soft"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Looking up word...</div>}

            {dictData && (
              <div className="space-y-3 rounded-hec-lg border border-hec-line bg-hec-sunken p-4 animate-in fade-in slide-in-from-top-2">
                {/* Header with Viseme Pronunciation */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <BookOpen className="w-5 h-5 shrink-0 text-hec-brass" aria-hidden="true" />
                    <h3 className={cn("break-words font-display font-medium capitalize text-hec-ink", gradeNum <= 3 ? "text-hec-h1" : "text-hec-h2")}>{dictData.word}</h3>
                    {gradeNum >= 4 && dictData.phonetic && <span className="font-mono text-hec-small text-hec-ink-soft">{dictData.phonetic}</span>}
                    {eslEntry && <Badge variant="brass">{eslEntry.cefr_level}</Badge>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <VisemePlayer word={dictData.word} compact />
                    <Button type="button" variant="ghost" size="sm" onClick={playDictAudio}>
                      <Volume2 className="w-4 h-4" aria-hidden="true" /> {gradeNum <= 3 ? "🔊" : "Listen"}
                    </Button>
                  </div>
                </div>

                {/* Vietnamese translation — always prominent */}
                {viTranslation && (
                  <div className={cn("flex items-center gap-2 rounded-hec-md border border-hec-line bg-hec-raised px-3", gradeNum <= 3 ? "py-3" : "py-2")}>
                    <span className={gradeNum <= 3 ? "text-2xl" : "text-sm"}>🇻🇳</span>
                    <span className={cn("min-w-0 break-words font-semibold text-hec-ink", gradeNum <= 3 ? "text-hec-h3" : "text-hec-small")}>{viTranslation}</span>
                  </div>
                )}

                <Separator className="bg-hec-line" />

                {/* ── v2 ESL Entry (LLM-generated) ── */}
                {eslEntry ? (
                  <div className="space-y-3">
                    {/* Part of speech badge */}
                    <Badge className={cn("text-hec-caption font-semibold uppercase", POS_COLORS[eslEntry.part_of_speech] || POS_NEUTRAL)}>
                      {eslEntry.part_of_speech === "noun" && gradeNum <= 3 ? "📦 Thing (Noun)" : eslEntry.part_of_speech === "verb" && gradeNum <= 3 ? "🏃 Action (Verb)" : eslEntry.part_of_speech === "adjective" && gradeNum <= 3 ? "🌈 Describing (Adjective)" : eslEntry.part_of_speech}
                    </Badge>

                    {/* English definition */}
                    <div className="space-y-2 rounded-hec-md border border-hec-line bg-hec-raised p-3">
                      <p className="text-hec-caption font-semibold uppercase tracking-wider text-hec-ink-soft">📖 Definition</p>
                      <p className={cn("font-medium text-hec-ink", gradeNum <= 3 ? "text-hec-body" : "text-hec-small")}>{eslEntry.english_definition}</p>
                    </div>

                    {/* Usage examples */}
                    {eslEntry.usage_examples.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-hec-caption font-semibold uppercase tracking-wider text-hec-ink-soft">💬 Examples</p>
                        {eslEntry.usage_examples.map((ex, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-hec-md border border-hec-line bg-hec-raised px-3 py-1">
                            <span className="shrink-0 text-hec-caption font-semibold tabular-nums text-hec-ink-soft">{i + 1}.</span>
                            <p className={cn("min-w-0 flex-1 break-words italic text-hec-ink", gradeNum <= 3 ? "text-hec-small font-medium" : "text-hec-small")}>"{ex}"</p>
                            <Button type="button" variant="ghost" size="icon" className="shrink-0 text-hec-brass" aria-label="Listen" onClick={() => speak(ex, "en-US", gradeNum <= 3 ? 0.7 : 0.85)}>
                              <Volume2 className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Synonyms & Antonyms */}
                    {(eslEntry.synonyms.length > 0 || eslEntry.antonyms.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {eslEntry.synonyms.length > 0 && (
                          <div className="space-y-2 rounded-hec-md border border-hec-line bg-hec-raised p-3">
                            <p className="text-hec-caption font-semibold uppercase tracking-wider text-hec-ink-soft">✅ Synonyms</p>
                            <div className="flex flex-wrap gap-2">
                              {eslEntry.synonyms.map((s, i) => (
                                <button key={i} type="button" onClick={() => speak(s)} className={CHIP}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {eslEntry.antonyms.length > 0 && (
                          <div className="space-y-2 rounded-hec-md border border-hec-line bg-hec-raised p-3">
                            <p className="flex items-center gap-1 text-hec-caption font-semibold uppercase tracking-wider text-hec-ink-soft"><ArrowRightLeft className="w-3 h-3" aria-hidden="true" /> Antonyms</p>
                            <div className="flex flex-wrap gap-2">
                              {eslEntry.antonyms.map((a, i) => (
                                <button key={i} type="button" onClick={() => speak(a)} className={CHIP}>
                                  {a}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* === Legacy fallback: GRADE 1-3 === */}
                    {gradeNum >= 1 && gradeNum <= 3 && (
                      <div className="space-y-3">
                        {dictData.meanings.slice(0, 1).map((m, mi) => (
                          <div key={mi} className="space-y-2">
                            <Badge className={cn("text-hec-small font-semibold", POS_COLORS[m.partOfSpeech] || POS_NEUTRAL)}>
                              {m.partOfSpeech === "noun" ? "📦 Thing (Noun)" : m.partOfSpeech === "verb" ? "🏃 Action (Verb)" : m.partOfSpeech === "adjective" ? "🌈 Describing (Adjective)" : "📝 " + m.partOfSpeech}
                            </Badge>
                            {m.definitions.slice(0, 1).map((d, di) => (
                              <div key={di} className="space-y-2 rounded-hec-md border border-hec-line bg-hec-raised p-3">
                                {d.example && (
                                  <div className="flex items-center gap-2 rounded-hec-md bg-hec-sunken px-3 py-1">
                                    <span className="text-lg" aria-hidden="true">💬</span>
                                    <p className="min-w-0 flex-1 break-words text-hec-small font-medium italic text-hec-ink">"{d.example}"</p>
                                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-hec-brass" aria-label="Listen" onClick={() => speak(d.example!, "en-US", 0.7)}>
                                      <Volume2 className="w-4 h-4" aria-hidden="true" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* === Legacy fallback: GRADE 4-8 === */}
                    {gradeNum >= 4 && (
                      <div className="space-y-3">
                        {dictData.meanings.slice(0, 2).map((m, mi) => (
                          <div key={mi} className="space-y-2">
                            <Badge className={cn("text-hec-caption font-semibold uppercase", POS_COLORS[m.partOfSpeech] || POS_NEUTRAL)}>
                              {m.partOfSpeech}
                            </Badge>
                            <ul className="space-y-2 pl-1">
                              {m.definitions.slice(0, 3).map((d, di) => (
                                <li key={di} className="space-y-1 text-hec-small text-hec-ink">
                                  <p><span className="mr-1 font-medium tabular-nums text-hec-ink-soft">{di + 1}.</span>{d.definition}</p>
                                  {d.example && (
                                    <p className="border-l border-hec-line-strong pl-4 text-hec-caption italic text-hec-ink-soft">
                                      "{d.example}"
                                      <Button type="button" variant="ghost" size="icon" className="ml-1 text-hec-brass" aria-label="Listen" onClick={() => speak(d.example!, "en-US", 0.8)}>
                                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                                      </Button>
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Prompt */}
                <div className="flex items-start gap-2 rounded-hec-md border border-hec-line bg-hec-raised p-3">
                  <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-hec-brass" aria-hidden="true" />
                  <p className={cn("min-w-0 text-hec-ink", gradeNum <= 3 ? "text-hec-body" : "text-hec-small")}>
                    {gradeNum <= 3
                      ? <><strong>Đến lượt em!</strong> Viết một câu có từ "<strong>{dictData.word}</strong>" ở bên dưới nhé! ✍️</>
                      : <><strong>Your turn!</strong> Write your own sentence using "<strong>{dictData.word}</strong>" below!</>}
                  </p>
                </div>
              </div>
            )}

            {/* Image Gallery */}
            {(fetchingImages || images.length > 0) && (
              <div className="space-y-2 rounded-hec-md border border-hec-line bg-hec-sunken p-3">
                <Label className="flex items-center gap-2 text-hec-small font-medium text-hec-ink-soft">
                  {fetchingImages ? (
                    <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Finding best pictures...</>
                  ) : (
                    "Pick the best picture for this word"
                  )}
                </Label>
                <ScrollArea className="w-full whitespace-nowrap rounded-hec-md">
                  <div className="flex w-max gap-3 p-1">
                    {fetchingImages ? (
                      [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[95px] w-[130px] shrink-0 rounded-hec-md" />)
                    ) : (
                      images.map((img, i) => (
                        <button type="button" key={i} aria-pressed={selectedImage === img.url}
                          className={cn(`relative h-[95px] w-[130px] shrink-0 cursor-pointer overflow-hidden rounded-hec-md transition-opacity duration-hec-1 ease-hec ${FOCUS}`,
                            selectedImage === img.url ? "shadow-hec-2 outline outline-2 outline-offset-2 outline-hec-brass" : "opacity-70 hover:opacity-100"
                          )} onClick={() => setSelectedImage(img.url)}>
                          <img src={img.url} alt={img.alt} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute top-1 left-1">
                            <span className={cn(
                              "rounded-hec-sm bg-hec-action px-1 text-hec-caption font-medium text-hec-on-action"
                            )}>
                              {img.source === "pixabay" ? "Pixabay" : "Pexels"}
                            </span>
                          </div>
                          {selectedImage === img.url && <div className="absolute right-1 top-1 rounded-full bg-hec-action p-1 text-hec-on-action shadow-hec-1"><Check className="w-3 h-3" aria-hidden="true" /></div>}
                        </button>
                      ))
                    )}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Vietnamese Meaning */}
            <div className="space-y-2">
              <Label className="text-hec-body font-semibold text-hec-ink">Vietnamese Meaning (Nghĩa tiếng Việt)</Label>
              <div className="relative">
                <Input placeholder="e.g. bài tập" value={meaning} onChange={e => setMeaning(e.target.value)} className="h-12 pr-12 text-hec-body" />
                <div className="absolute right-1 top-1/2 -translate-y-1/2"><MicBtn field="meaning" lang="vi-VN" /></div>
              </div>
              {viTranslation && meaning !== viTranslation && (
                <button type="button" className={`min-h-hec-target text-left text-hec-small text-hec-brass underline-offset-4 hover:underline ${FOCUS}`} onClick={() => setMeaning(viTranslation)}>
                  💡 Suggested: {viTranslation}
                </button>
              )}
            </div>

            {/* ── ESL Quick Reference (explicitly rendered from LLM payload) ── */}
            {eslEntry && (
              <div className="space-y-3 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 animate-in fade-in">
                <p className="text-hec-caption font-semibold uppercase tracking-wider text-hec-ink-soft">📚 Quick Reference</p>

                {/* English Meaning */}
                {eslEntry.english_definition && (
                  <div className="space-y-1">
                    <p className="text-hec-caption font-semibold text-hec-ink-soft">English Meaning:</p>
                    <p className={cn("rounded-hec-md bg-hec-sunken px-3 py-2 font-medium text-hec-ink", gradeNum <= 3 ? "text-hec-body" : "text-hec-small")}>
                      {eslEntry.english_definition}
                    </p>
                  </div>
                )}

                {/* Examples as bullet points */}
                {eslEntry.usage_examples.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-hec-caption font-semibold text-hec-ink-soft">Examples:</p>
                    <ul className="space-y-1 pl-1">
                      {eslEntry.usage_examples.map((ex, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 shrink-0 text-hec-ink-faint" aria-hidden="true">•</span>
                          <p className={cn("min-w-0 italic text-hec-ink", gradeNum <= 3 ? "text-hec-small" : "text-hec-small")}>{ex}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Similar words (synonyms) */}
                {eslEntry.synonyms.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-hec-caption font-semibold text-hec-ink-soft">Similar words:</p>
                    <p className="rounded-hec-md bg-hec-sunken px-3 py-2 text-hec-small font-medium text-hec-ink">
                      {eslEntry.synonyms.join(", ")}
                    </p>
                  </div>
                )}

                {/* Opposite words (antonyms) */}
                {eslEntry.antonyms.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-hec-caption font-semibold text-hec-ink-soft">Opposite words:</p>
                    <p className="rounded-hec-md bg-hec-sunken px-3 py-2 text-hec-small font-medium text-hec-ink">
                      {eslEntry.antonyms.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Example Sentence with grammar check */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-hec-body font-semibold text-hec-ink">Your Example Sentence</Label>
                {checkingGrammar && <Badge variant="secondary"><SpellCheck className="w-3 h-3" aria-hidden="true" /> Checking...</Badge>}
              </div>
              <div className="relative">
                <Textarea placeholder="Write a sentence using this word..." value={example} onChange={e => onExampleChange(e.target.value)} className="min-h-[80px] resize-none pr-12 text-hec-body" />
                <div className="absolute top-2 right-1"><MicBtn field="example" lang="en-US" /></div>
              </div>
              {grammarResult && (
                <div className="flex flex-wrap items-start gap-2 rounded-hec-md border border-hec-line bg-hec-sunken p-3 animate-in fade-in">
                  <SpellCheck className="mt-1 h-4 w-4 shrink-0 text-hec-brass" aria-hidden="true" />
                  <div className="min-w-0 flex-1 text-hec-small">
                    <p className="font-medium text-hec-ink-soft">AI suggests:</p>
                    <p className="break-words italic text-hec-ink">"{grammarResult}"</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={acceptGrammarFix}>
                    Accept ✓
                  </Button>
                </div>
              )}
            </div>

            <Button type="submit" className="h-14 w-full text-hec-h3 font-semibold">
              {gradeNum <= 3 ? "Thêm từ vựng ✨" : "Add to My Vocabulary ✨"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
