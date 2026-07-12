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
      <div className="relative group">
        {/* Floating Gemini animated glow behind input box */}
        <div className="absolute inset-0 z-0 overflow-visible pointer-events-none opacity-90 dark:opacity-70 select-none">
          {/* Blue/Cyan Blob */}
          <div className="absolute top-1/2 left-[5%] -translate-y-1/2 w-[340px] h-[160px] rounded-full bg-gradient-to-r from-blue-500/50 via-cyan-400/40 to-teal-300/10 blur-2xl gemini-glow-1" />
          {/* Blue/Indigo Blob */}
          <div className="absolute top-1/2 right-[5%] -translate-y-1/2 w-[340px] h-[160px] rounded-full bg-gradient-to-r from-blue-500/50 via-indigo-400/40 to-slate-300/10 blur-2xl gemini-glow-2" />
          {/* Violet/Indigo Center Blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[140px] rounded-full bg-gradient-to-r from-blue-500/45 via-indigo-450/35 to-blue-400/10 blur-3xl gemini-glow-3" />
        </div>

        <div
          className={cn(
            "relative z-10 flex items-center gap-2 rounded-full p-1.5 transition-all duration-300",
            "bg-white dark:bg-[hsl(240_8%_12%)] border border-slate-200 dark:border-[hsl(240_8%_20%)] shadow-[0_2px_12px_rgba(0,0,0,0.04)]",
            "group-focus-within:border-blue-400/80 dark:group-focus-within:border-[hsl(265_50%_40%)]",
            "group-focus-within:shadow-[0_4px_24px_rgba(139,92,246,0.12)]"
          )}
        >
          <div className="flex items-center pl-3 text-slate-400 dark:text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>

          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type a word or sentence…"
            className="flex-1 border-0 bg-transparent text-base h-10 focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-[hsl(220_10%_35%)]"
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
          />

          <Button
            type="submit"
            disabled={!value.trim() || loading}
            className={cn(
              "rounded-full h-9 w-9 p-0 transition-all duration-200",
              "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[hsl(240_8%_18%)] dark:hover:bg-[hsl(240_8%_22%)] dark:text-foreground/70 dark:hover:text-foreground",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CornerDownLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground/60 mt-3">
        Type a single word or a full sentence, then click a word to explore it
      </p>
    </form>
  );
}
