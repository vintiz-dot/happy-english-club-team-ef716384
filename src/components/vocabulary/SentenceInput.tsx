import { useState, useRef, useCallback } from "react";
import { Search, Loader2, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onSubmit: (sentence: string, words: string[]) => void;
  loading?: boolean;
}

export function SentenceInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) return;

      // Parse into words: strip punctuation, split by whitespace
      const words = trimmed
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-ZÀ-ỹ'-]/g, ""))
        .filter((w) => w.length > 0);

      if (words.length === 0) return;
      onSubmit(trimmed, words);
    },
    [value, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <div
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-full border border-hec-line-strong bg-hec-raised p-1 shadow-hec-1",
            "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-hec-ring"
          )}
        >
          <div className="flex shrink-0 items-center pl-3 text-hec-ink-faint">
            <Search className="w-4 h-4" aria-hidden="true" />
          </div>

          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type a word or sentence…"
            aria-label="Word or sentence"
            className="min-h-hec-target min-w-0 flex-1 border-0 bg-transparent px-1 text-hec-body text-hec-ink shadow-none placeholder:text-hec-ink-faint focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
          />

          <Button
            type="submit"
            size="icon"
            variant="secondary"
            aria-label="Explore"
            disabled={!value.trim() || loading}
            className="shrink-0 rounded-full"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CornerDownLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-center text-hec-caption text-hec-ink-soft">
        Type a single word or a full sentence, then click a word to explore it
      </p>
    </form>
  );
}
