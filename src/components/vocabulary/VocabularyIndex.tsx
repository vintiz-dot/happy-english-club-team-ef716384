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
  Search, ArrowDownAZ, ArrowUpZA, Volume2, Star, Trash2, Pencil, Save, Loader2, ImageIcon,
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
// Mastery is growth, not danger: neutral while learning, leaf once known.
// The word and the stars carry the level; the colour only adds to it.
const MASTERY_COLORS = [
  "border-hec-line bg-hec-sunken text-hec-ink-soft",
  "border-hec-line bg-hec-sunken text-hec-ink-soft",
  "border-hec-line bg-hec-sunken text-hec-ink-soft",
  "border-hec-line bg-hec-sunken text-hec-ink-soft",
  "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf",
  "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf",
];

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

function speak(text: string, lang = "en-US", rate = 0.8) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  speechSynthesis.speak(u);
}

function MasteryStars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < level ? "fill-hec-brass text-hec-brass" : "fill-transparent text-hec-line-strong",
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
      <div className="space-y-4 py-16 text-center">
        <div className="text-6xl" aria-hidden="true">📚</div>
        <h3 className="font-display text-hec-h2 font-medium text-hec-ink">Your Word Bank is Empty</h3>
        <p className="mx-auto max-w-md text-hec-body text-hec-ink-soft">
          Use the <strong>Explore</strong> tab to look up a word, write your own examples, and save it here. 🚀
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-80 lg:shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hec-ink-faint" />
          <Input
            placeholder="Search words..."
            aria-label="Search words"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="tabular-nums">{processed.length} words</Badge>
          {[0, 1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => { setFilterMastery(filterMastery === level ? null : level); setPage(1); }}
              aria-pressed={filterMastery === level}
              className={cn(
                "inline-flex min-h-hec-target items-center rounded-full border px-3 text-hec-caption font-medium transition-colors duration-hec-1 ease-hec",
                FOCUS,
                filterMastery === level
                  ? "border-hec-brass bg-hec-sunken text-hec-ink"
                  : "border-transparent bg-transparent text-hec-ink-soft hover:border-hec-line-strong hover:text-hec-ink",
              )}
            >
              {MASTERY_LABELS[level]}
            </button>
          ))}
          <Button variant="outline" size="icon" onClick={toggleSort} aria-label="Sort order">
            {sortOrder === "asc" ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpZA className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      {pageItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden"
            >
              {/* The picture opens the word; the title sits below it on the card
                  surface (no white text over a photo). The open target is a real
                  button laid over the picture, so the Listen button is not nested in it. */}
              <div className="relative h-36 w-full overflow-hidden bg-hec-sunken">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.word}
                    width={400}
                    height={144}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  // No picture yet: a quiet mark, so the well does not read as a hole (dark theme).
                  <div className="flex h-full w-full items-center justify-center" aria-hidden>
                    <ImageIcon className="h-8 w-8 text-hec-ink-faint" />
                  </div>
                )}
                <button
                  type="button"
                  className={cn(FOCUS, "absolute inset-0 h-full w-full cursor-pointer focus-visible:-outline-offset-2")}
                  onClick={() => setDetail(item)}
                  aria-label={`Open ${item.word}`}
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute right-2 top-2 rounded-full"
                  onClick={(e) => { e.stopPropagation(); pronounceWord(item); }}
                  aria-label="Listen to word"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>

              <CardContent className="space-y-3 p-4">
                <div className="min-w-0">
                  <h3 className="break-words font-display text-hec-h2 font-medium capitalize text-hec-ink">
                    {item.word}
                  </h3>
                  <span className="text-hec-small text-hec-ink-soft">
                    {item.cefr ? `CEFR ${item.cefr}` : item.partOfSpeech}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <MasteryStars level={item.masteryLevel} />
                  <Badge variant="secondary" className={MASTERY_COLORS[item.masteryLevel]}>
                    {MASTERY_LABELS[item.masteryLevel]}
                  </Badge>
                </div>

                {item.meaning && (
                  <div>
                    <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">Meaning</p>
                    <p className="line-clamp-2 text-hec-body font-medium text-hec-ink">{item.meaning}</p>
                  </div>
                )}

                <div>
                  <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">Your example</p>
                  <p className="line-clamp-2 text-hec-small italic text-hec-ink-soft">
                    {item.example ? `"${item.example}"` : <span className="text-hec-ink-faint">No example yet.</span>}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-hec-line pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-hec-ink-soft"
                    onClick={() => pronounceWord(item)}
                  >
                    <Volume2 className="h-4 w-4" /> Listen
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-hec-ink-soft"
                      onClick={() => setEditing(item)}
                      aria-label="Edit word"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        {/* Quiet like Edit beside it (one per card, many in view); the red is kept for the confirm. */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-hec-ink-soft hover:bg-hec-danger-tint hover:text-hec-danger"
                          aria-label="Delete word"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{item.word}"?</AlertDialogTitle>
                          <AlertDialogDescription>This removes the word from your bank permanently.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep the word</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90">Delete the word</AlertDialogAction>
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
        <div className="py-16 text-center">
          <p className="text-hec-body text-hec-ink-soft">No words match your search.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination>
            <PaginationContent className="flex-wrap justify-center rounded-hec-lg border border-hec-line bg-hec-surface p-1 shadow-hec-1">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={cn("min-h-hec-target", page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer")}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <PaginationItem key={p}>
                      {showEllipsis && <span className="px-2 text-hec-ink-faint">…</span>}
                      <PaginationLink onClick={() => setPage(p)} isActive={page === p} className="min-h-hec-target min-w-hec-target cursor-pointer tabular-nums">
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={cn("min-h-hec-target", page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer")}
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="break-words capitalize">Edit: {word.word}</DialogTitle>
          <DialogDescription>
            Tweak your examples, change the image, or update the meaning.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-6">
          <div className="space-y-2">
            <label htmlFor="edit-word-meaning" className="text-hec-small font-medium text-hec-ink">Meaning</label>
            <Textarea id="edit-word-meaning" value={meaning} onChange={(e) => setMeaning(e.target.value)} rows={2} />
          </div>

          <div className="min-w-0 space-y-2">
            <p className="text-hec-small font-medium text-hec-ink">Pick an image</p>
            <ImageCarousel query={word.rootWord || word.word} pickedUrl={pickedUrl} onPick={handlePick} />
          </div>

          <div className="space-y-2">
            <p className="text-hec-small font-medium text-hec-ink">Your examples</p>
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
                aria-label={`Example ${i + 1}`}
                rows={2}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" />Save changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
