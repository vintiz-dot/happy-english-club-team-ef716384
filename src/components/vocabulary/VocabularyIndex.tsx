import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Search, ArrowDownAZ, ArrowUpZA, Volume2, Star, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import type { VocabularyWord } from "@/hooks/useVocabularyStore";

interface Props {
  items: VocabularyWord[];
  onDelete: (id: string) => void;
}

const ITEMS_PER_PAGE = 30;

const MASTERY_LABELS = ["New", "Seen", "Learning", "Familiar", "Known", "Mastered"];
const MASTERY_COLORS = [
  "bg-slate-100 text-slate-600",
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-yellow-100 text-yellow-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
];

// Pronunciation helper
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
            i < level ? "fill-amber-400 text-amber-400" : "fill-transparent text-slate-300"
          )}
        />
      ))}
    </div>
  );
}

export function VocabularyIndex({ items, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [filterMastery, setFilterMastery] = useState<number | null>(null);

  const fuse = useMemo(() => new Fuse(items, {
    keys: ["word", "meaning", "example"],
    threshold: 0.3,
  }), [items]);

  const processed = useMemo(() => {
    let result = query.trim()
      ? fuse.search(query).map(r => r.item)
      : [...items];

    if (filterMastery !== null) {
      result = result.filter(w => w.masteryLevel === filterMastery);
    }

    result.sort((a, b) => {
      const c = a.word.localeCompare(b.word);
      return sortOrder === "asc" ? c : -c;
    });
    return result;
  }, [items, query, sortOrder, filterMastery, fuse]);

  const totalPages = Math.ceil(processed.length / ITEMS_PER_PAGE);
  const pageItems = processed.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSearch = (val: string) => { setQuery(val); setPage(1); };
  const toggleSort = () => { setSortOrder(p => p === "asc" ? "desc" : "asc"); setPage(1); };

  // Speak word slowly, pause, then example sentence
  const pronounceWord = (word: VocabularyWord) => {
    speechSynthesis.cancel();
    // First: the word slowly
    const w = new SpeechSynthesisUtterance(word.word);
    w.lang = "en-US";
    w.rate = 0.65;
    // Then: the example sentence at normal pace
    w.onend = () => {
      setTimeout(() => {
        const s = new SpeechSynthesisUtterance(word.example);
        s.lang = "en-US";
        s.rate = 0.85;
        speechSynthesis.speak(s);
      }, 400);
    };
    speechSynthesis.speak(w);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-6xl">📚</div>
        <h3 className="text-xl font-bold text-foreground">Your Word Bank is Empty</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Go to the <strong>Add Word</strong> tab to start building your personal vocabulary.
          Every new word is a step forward! 🚀
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-3 rounded-2xl shadow-sm border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search words..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-sm">{processed.length} words</Badge>
          {/* Mastery filter chips */}
          {[0, 1, 2, 3, 4, 5].map(level => (
            <button
              key={level}
              onClick={() => { setFilterMastery(filterMastery === level ? null : level); setPage(1); }}
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium transition-all border",
                filterMastery === level ? MASTERY_COLORS[level] + " border-current" : "bg-transparent text-muted-foreground border-transparent hover:border-muted-foreground/30"
              )}
            >
              {MASTERY_LABELS[level]}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={toggleSort} className="rounded-xl h-8">
            {sortOrder === "asc" ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpZA className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      {pageItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pageItems.map(item => (
            <Card
              key={item.id}
              className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl bg-white dark:bg-slate-800"
            >
              {/* Image */}
              <div className="relative h-36 w-full overflow-hidden bg-muted">
                <img
                  src={item.imageUrl}
                  alt={item.word}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {/* Pronunciation button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm"
                  onClick={() => pronounceWord(item)}
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
                {/* Word overlay */}
                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="text-xl font-black text-white capitalize truncate drop-shadow-md">
                    {item.word}
                  </h3>
                  <span className="text-white/70 text-xs font-medium">{item.partOfSpeech}</span>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Mastery */}
                <div className="flex items-center justify-between">
                  <MasteryStars level={item.masteryLevel} />
                  <Badge variant="secondary" className={cn("text-[10px]", MASTERY_COLORS[item.masteryLevel])}>
                    {MASTERY_LABELS[item.masteryLevel]}
                  </Badge>
                </div>

                {/* Meaning */}
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nghĩa</p>
                  <p className="text-base font-bold text-foreground line-clamp-2">{item.meaning}</p>
                </div>

                {/* Example */}
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Example</p>
                  <p className="text-sm text-muted-foreground italic line-clamp-2">"{item.example}"</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-xs gap-1"
                    onClick={() => pronounceWord(item)}
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Listen
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{item.word}"?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove the word from your vocabulary bank permanently.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
            <PaginationContent className="bg-white/80 dark:bg-slate-800/80 backdrop-blur p-1.5 rounded-2xl shadow-sm border">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
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
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
