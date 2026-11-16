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
      <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a picture for “{cell?.text}”</DialogTitle>
          <DialogDescription>
            Your choice is remembered for this word in every set you make. Pictures are ARASAAC pictograms.
          </DialogDescription>
        </DialogHeader>

        {suggested.length > 0 && (
          <section>
            <h4 className="text-hec-h3 font-semibold text-hec-ink mb-2">Pictures chosen for this word</h4>
            <Grid ids={suggested} current={cell?.pictogram} onPick={onPick} />
          </section>
        )}

        <section>
          <form
            className="flex flex-col gap-2 mb-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(term.trim().toLowerCase());
            }}
          >
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search for a word, e.g. giraffe" aria-label="Search pictures" />
            <Button type="submit" variant="secondary"><Search className="h-4 w-4" />Search</Button>
          </form>
          {isFetching && <p className="text-hec-small text-hec-ink-soft flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</p>}
          {isError && <p className="text-hec-small text-hec-danger">The picture library could not be reached. Check the connection and search again.</p>}
          {!isFetching && !isError && submitted && found.length === 0 && (
            <p className="text-hec-small text-hec-ink-soft">No pictures for “{submitted}”. Try a simpler word.</p>
          )}
          {found.length > 0 && <Grid ids={found.map((f) => f.id)} labels={found.map((f) => f.label)} current={cell?.pictogram} onPick={onPick} />}
        </section>

        {cell && cell.kind !== "word" && (
          <Button variant="outline" className="w-full sm:w-auto sm:self-start" onClick={onRemove}>
            <ImageOff className="h-4 w-4" /> No picture for this word
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
          aria-label={labels?.[i] ? `Use the picture "${labels[i]}"` : `Use picture ${i + 1}`}
          aria-pressed={id === current}
          className={`flex min-h-hec-target min-w-0 flex-col items-center gap-1 rounded-hec-md border p-2 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring ${id === current ? "border-hec-brass bg-hec-brass/15" : "border-hec-line bg-hec-raised"}`}
        >
          <img src={pictureUrl(id)} alt="" loading="lazy" className="h-16 w-16 object-contain" />
          {labels?.[i] && <span className="text-hec-caption text-hec-ink-soft truncate max-w-full">{labels[i]}</span>}
        </button>
      ))}
    </div>
  );
}
