/**
 * The teacher changes one picture: the lexicon's alternatives for the word
 * first, then a search of the whole ARASAAC library. Choosing remembers the
 * pick for that word, so fixing "light" once fixes it in every sentence.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { searchPictograms } from "@/lib/languageSupport/arasaac";
import { pictureUrl, type Cell, type Lexicon } from "@/lib/languageSupport/strip";

interface Props {
  cell: Cell | null;
  lexicon: Lexicon;
  onClose: () => void;
  onPick: (pictogram: number) => void;
  onRemove: () => void;
}

export function PictogramPicker({ cell, lexicon, onClose, onPick, onRemove }: Props) {
  const word = (cell?.concept ?? cell?.text ?? "").toLowerCase();
  const [term, setTerm] = useState(word);
  const [submitted, setSubmitted] = useState(word);
  useEffect(() => {
    setTerm(word);
    setSubmitted(word);
  }, [word, cell?.start]);

  const { data: found = [], isFetching, isError } = useQuery({
    queryKey: ["arasaac-search", submitted],
    queryFn: () => searchPictograms(submitted),
    enabled: !!cell && submitted.trim().length > 0,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const suggested = [lexicon[word]?.p, ...(lexicon[word]?.a ?? [])].filter((x): x is number => !!x);

  return (
    <Dialog open={!!cell} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a picture for “{cell?.text}”</DialogTitle>
          <DialogDescription>
            Your choice is remembered for this word in every set you make. Pictures are ARASAAC pictograms.
          </DialogDescription>
        </DialogHeader>

        {suggested.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold mb-2">Pictures chosen for this word</h4>
            <Grid ids={suggested} current={cell?.pictogram} onPick={onPick} />
          </section>
        )}

        <section>
          <form
            className="flex gap-2 mb-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(term.trim().toLowerCase());
            }}
          >
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search for a word, e.g. giraffe" aria-label="Search pictures" />
            <Button type="submit" variant="secondary"><Search className="h-4 w-4 mr-1.5" />Search</Button>
          </form>
          {isFetching && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</p>}
          {isError && <p className="text-sm text-destructive">The picture library could not be reached. Check the connection and search again.</p>}
          {!isFetching && !isError && submitted && found.length === 0 && (
            <p className="text-sm text-muted-foreground">No pictures for “{submitted}”. Try a simpler word.</p>
          )}
          {found.length > 0 && <Grid ids={found.map((f) => f.id)} labels={found.map((f) => f.label)} current={cell?.pictogram} onPick={onPick} />}
        </section>

        {cell && cell.kind !== "word" && (
          <Button variant="outline" className="self-start" onClick={onRemove}>
            <ImageOff className="h-4 w-4 mr-1.5" /> No picture for this word
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Grid({ ids, labels, current, onPick }: { ids: number[]; labels?: string[]; current?: number; onPick: (id: number) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {ids.map((id, i) => (
        <button
          key={`${id}-${i}`}
          type="button"
          onClick={() => onPick(id)}
          className={`flex flex-col items-center gap-1 rounded-lg border p-2 hover:bg-accent ${id === current ? "border-primary ring-2 ring-primary" : ""}`}
        >
          <img src={pictureUrl(id)} alt="" loading="lazy" className="h-16 w-16 object-contain" />
          {labels?.[i] && <span className="text-xs text-muted-foreground truncate max-w-full">{labels[i]}</span>}
        </button>
      ))}
    </div>
  );
}
