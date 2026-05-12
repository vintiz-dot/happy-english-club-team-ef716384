import { useState, useRef, useCallback } from "react";
import { Search, Loader2, Sparkles, CornerDownLeft } from "lucide-react";
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
      <div className="relative group">
        {/* Glow ring on focus */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-500/20 via-blue-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-500" />

        <div className="relative flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-slate-200 dark:border-slate-700 group-focus-within:border-violet-400 dark:group-focus-within:border-violet-500 transition-colors p-1.5">
          <div className="flex items-center pl-3 text-violet-500">
            <Sparkles className="w-5 h-5" />
          </div>

          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type a word or sentence… e.g. 'The cat is running fast'"
            className="flex-1 border-0 bg-transparent text-lg h-12 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
          />

          <Button
            type="submit"
            disabled={!value.trim() || loading}
            className={cn(
              "rounded-xl h-10 px-5 gap-2 font-bold text-sm transition-all",
              "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700",
              "text-white shadow-md hover:shadow-lg",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Explore</span>
                <CornerDownLeft className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-2 opacity-70">
        Type a single word or a full sentence, then click a word to explore it 🔍
      </p>
    </form>
  );
}
