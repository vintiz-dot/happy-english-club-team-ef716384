/**
 * VocabularyIndex — the student's Word Bank tab.
 *
 * Reads from the DB-backed useVocabularyStore. Each card now offers two
 * actions: Edit (inline modal to rewrite examples or pick a different
 * image) and Delete.
 */

import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import {
  Search, ArrowDownAZ, ArrowUpZA, Volume2, Star, Trash2, Pencil, Save, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import type { VocabularyWord } from "@/hooks/useVocabularyStore";
import { ImageCarousel, type ImageItem } from "./ImageCarousel";
import { WordDetailSheet } from "./WordDetailSheet";

interface Props {
  items: VocabularyWord[];
  onDelete: (id: string) => void | Promise<void>;
  onUpdate: (
    id: string,
    patch: Partial<{ examples: string[]; imageUrl: string; meaning: string }>,
  ) => void | Promise<void>;
}

const ITEMS_PER_PAGE = 30;

const MASTERY_LABELS = ["New", "Seen", "Learning", "Familiar", "Known", "Mastered"];
const MASTERY_COLORS = [
  "bg-slate-100 text-slate-500 dark:bg-[hsl(240_8%_16%)] dark:text-foreground/50",
  "bg-red-50 text-red-600 dark:bg-[hsl(0_30%_14%)] dark:text-red-400/70",
  "bg-orange-50 text-orange-600 dark:bg-[hsl(25_30%_14%)] dark:text-orange-400/70",
  "bg-yellow-50 text-yellow-600 dark:bg-[hsl(45_30%_14%)] dark:text-yellow-400/70",
  "bg-emerald-50 text-emerald-600 dark:bg-[hsl(155_25%_14%)] dark:text-emerald-400/70",
  "bg-blue-50 text-blue-600 dark:bg-[hsl(265_25%_16%)] dark:text-blue-400/70",
];

function speak(text: string, lang = "en-US", rate = 0.8) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  speechSynthesis.speak(u);
}

function MasteryStars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5 transition-colors",
            i < level ? "fill-amber-400/60 text-amber-400/60" : "fill-transparent text-[hsl(240_8%_22%)]",
          )}
        />
      ))}
    </div>
  );
}

export function VocabularyIndex({ items, onDelete, onUpdate }: Props) {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [filterMastery, setFilterMastery] = useState<number | null>(null);
  const [editing, setEditing] = useState<VocabularyWord | null>(null);
  const [detail, setDetail] = useState<VocabularyWord | null>(null);

  const fuse = useMemo(() => new Fuse(items, {
    keys: ["word", "meaning", "example"],
    threshold: 0.3,
  }), [items]);

  const processed = useMemo(() => {
    let result = query.trim()
      ? fuse.search(query).map((r) => r.item)
      : [...items];
    if (filterMastery !== null) result = result.filter((w) => w.masteryLevel === filterMastery);
    result.sort((a, b) => {
      const c = a.word.localeCompare(b.word);
      return sortOrder === "asc" ? c : -c;
    });
    return result;
  }, [items, query, sortOrder, filterMastery, fuse]);

  const totalPages = Math.ceil(processed.length / ITEMS_PER_PAGE);
  const pageItems = processed.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSearch = (val: string) => { setQuery(val); setPage(1); };
  const toggleSort = () => { setSortOrder((p) => p === "asc" ? "desc" : "asc"); setPage(1); };

  const pronounceWord = (word: VocabularyWord) => {
    speechSynthesis.cancel();
    const w = new SpeechSynthesisUtterance(word.word);
    w.lang = "en-US";
    w.rate = 0.65;
    w.onend = () => {
      if (word.example) {
        setTimeout(() => {
          const s = new SpeechSynthesisUtterance(word.example);
          s.lang = "en-US";
          s.rate = 0.85;
          speechSynthesis.speak(s);
        }, 400);
      }
    };
    speechSynthesis.speak(w);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-6xl gemini-float">📚</div>
        <h3 className="text-xl font-bold text-foreground">Your Word Bank is Empty</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Use the <strong>Explore</strong> tab to look up a word, write your own examples, and save it here. 🚀
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-[hsl(240_8%_10%)] border border-slate-200/80 dark:border-[hsl(240_8%_16%)] p-4 rounded-2xl shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search words..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 dark:bg-[hsl(240_8%_12%)] dark:border-[hsl(240_8%_18%)]"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-sm">{processed.length} words</Badge>
          {[0, 1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => { setFilterMastery(filterMastery === level ? null : level); setPage(1); }}
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium transition-all border",
                filterMastery === level ? MASTERY_COLORS[level] + " border-current" : "bg-transparent text-muted-foreground border-transparent hover:border-muted-foreground/30",
              )}
            >
              {MASTERY_LABELS[level]}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={toggleSort} className="rounded-xl h-8 border-slate-200 hover:bg-slate-50 dark:border-[hsl(240_8%_18%)] dark:bg-transparent dark:hover:bg-[hsl(240_8%_14%)]">
            {sortOrder === "asc" ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpZA className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      {pageItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pageItems.map((item) => (
            <Card
              key={item.id}
              className="group overflow-hidden border border-slate-200 dark:border-[hsl(240_8%_16%)] shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-[hsl(240_8%_22%)] transition-all duration-300 rounded-2xl bg-white dark:bg-[hsl(240_8%_10%)]"
            >
              <div
                className="relative h-36 w-full overflow-hidden bg-muted cursor-pointer"
                onClick={() => setDetail(item)}
                role="button"
                aria-label={`Open ${item.word}`}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.word}
                    width={400}
                    height={144}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[hsl(265_20%_12%)] to-[hsl(220_15%_12%)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm"
                  onClick={(e) => { e.stopPropagation(); pronounceWord(item); }}
                  aria-label="Listen to word"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="text-lg font-semibold text-white capitalize truncate drop-shadow-md">
                    {item.word}
                  </h3>
                  <span className="text-white/70 text-xs font-medium">
                    {item.cefr ? `CEFR ${item.cefr}` : item.partOfSpeech}
                  </span>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <MasteryStars level={item.masteryLevel} />
                  <Badge variant="secondary" className={cn("text-[10px]", MASTERY_COLORS[item.masteryLevel])}>
                    {MASTERY_LABELS[item.masteryLevel]}
                  </Badge>
                </div>

                {item.meaning && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Meaning</p>
                    <p className="text-base font-bold text-foreground line-clamp-2">{item.meaning}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Your example</p>
                  <p className="text-sm text-muted-foreground italic line-clamp-2">
                    {item.example ? `"${item.example}"` : <span className="opacity-60">No example yet.</span>}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-foreground/50 hover:text-foreground/80 hover:bg-transparent rounded-xl text-xs gap-1"
                    onClick={() => pronounceWord(item)}
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Listen
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                      onClick={() => setEditing(item)}
                      aria-label="Edit word"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" aria-label="Delete word">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{item.word}"?</AlertDialogTitle>
                          <AlertDialogDescription>This removes the word from your bank permanently.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No words match your search.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination>
            <PaginationContent className="bg-white dark:bg-[hsl(240_8%_10%)] border border-slate-200 dark:border-[hsl(240_8%_16%)] p-1.5 rounded-2xl shadow-sm">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <PaginationItem key={p}>
                      {showEllipsis && <span className="px-2 text-muted-foreground">…</span>}
                      <PaginationLink onClick={() => setPage(p)} isActive={page === p} className="cursor-pointer">
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Immersive word detail + micro-quiz */}
      <WordDetailSheet word={detail} bank={items} onClose={() => setDetail(null)} />

      {/* Edit modal */}
      {editing && (
        <EditWordDialog
          word={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await onUpdate(editing.id, patch);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Edit dialog ────────────────────────────────────────────────────────

function EditWordDialog({
  word, onClose, onSave,
}: {
  word: VocabularyWord;
  onClose: () => void;
  onSave: (patch: Partial<{ examples: string[]; imageUrl: string; meaning: string }>) => Promise<void>;
}) {
  const initialExamples = useMemo(() => {
    const arr = [...(word.examples || [])];
    while (arr.length < 4) arr.push("");
    return arr.slice(0, 4);
  }, [word.examples]);

  const [examples, setExamples] = useState<string[]>(initialExamples);
  const [meaning, setMeaning] = useState(word.meaning || "");
  const [pickedUrl, setPickedUrl] = useState(word.imageUrl);
  const [saving, setSaving] = useState(false);

  const handlePick = (img: ImageItem) => setPickedUrl(img.url);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const cleaned = examples.map((e) => e.trim()).filter(Boolean);
      await onSave({
        examples: cleaned,
        meaning: meaning.trim(),
        imageUrl: pickedUrl,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-[hsl(240_8%_10%)] border-slate-200 dark:border-[hsl(240_8%_18%)]">
        <DialogHeader>
          <DialogTitle className="capitalize">Edit: {word.word}</DialogTitle>
          <DialogDescription>
            Tweak your examples, change the image, or update the meaning.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Meaning</label>
            <Textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} rows={2} className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pick an image</label>
            <ImageCarousel query={word.rootWord || word.word} pickedUrl={pickedUrl} onPick={handlePick} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your examples</label>
            {examples.map((ex, i) => (
              <Textarea
                key={i}
                value={ex}
                onChange={(e) => {
                  const next = [...examples];
                  next[i] = e.target.value;
                  setExamples(next);
                }}
                placeholder={`Example ${i + 1}`}
                rows={2}
                className="rounded-lg text-sm"
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-[hsl(265_40%_16%)] dark:hover:bg-[hsl(265_40%_20%)] dark:text-blue-200 dark:border-[hsl(265_40%_24%)]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1.5" />Save changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
