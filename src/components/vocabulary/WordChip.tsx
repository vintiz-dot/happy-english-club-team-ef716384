import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";

interface Props {
  word: string;
  isHighlighted?: boolean;
  isActive?: boolean;
  onClick: (word: string) => void;
}

/** Difficulty level badge colors */
const LEVEL_COLORS: Record<string, string> = {
  "Pre-A1": "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700",
  "A1": "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700",
  "A2": "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700",
  "B1": "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700",
};

function speak(text: string) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.75;
  speechSynthesis.speak(u);
}

export function WordChip({ word, isHighlighted, isActive, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={() => onClick(word)}
      className={cn(
        "group relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full",
        "text-sm font-medium capitalize transition-all duration-200",
        "border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(265_50%_45%)]",
        isActive
          ? "bg-blue-100 dark:bg-[hsl(265_50%_18%)] border-blue-200 dark:border-[hsl(265_50%_30%)] text-blue-700 dark:text-blue-200 shadow-[0_0_16px_rgba(139,92,246,0.12)]"
          : isHighlighted
          ? "bg-amber-50 dark:bg-[hsl(38_30%_14%)] border-amber-200 dark:border-[hsl(38_30%_22%)] text-amber-700 dark:text-amber-300/80 hover:text-amber-800 dark:hover:text-amber-200"
          : "bg-slate-50 dark:bg-[hsl(240_8%_12%)] border-slate-200 dark:border-[hsl(240_8%_18%)] text-slate-600 dark:text-foreground/60 hover:text-slate-800 dark:hover:text-foreground/80 hover:bg-slate-100 dark:hover:bg-[hsl(240_8%_15%)] hover:border-slate-300 dark:hover:border-[hsl(240_8%_22%)]"
      )}
    >
      {word}
      <Volume2
        className={cn(
          "w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity",
          isActive ? "text-blue-300" : "text-foreground/40"
        )}
        onClick={(e) => {
          e.stopPropagation();
          speak(word);
        }}
      />

      {/* Active indicator dot */}
      {isActive && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400/60" />
      )}
    </button>
  );
}
