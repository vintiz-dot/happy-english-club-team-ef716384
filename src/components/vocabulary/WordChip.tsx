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
        "group relative inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl",
        "text-base font-semibold capitalize transition-all duration-200",
        "border-2 shadow-sm hover:shadow-md active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
        isActive
          ? "bg-gradient-to-br from-violet-500 to-blue-600 text-white border-violet-600 shadow-violet-200/50 dark:shadow-violet-900/30 scale-105"
          : isHighlighted
          ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-600 dark:hover:bg-amber-950/50"
          : "bg-white text-slate-700 border-slate-200 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-violet-950/30"
      )}
    >
      {word}
      <Volume2
        className={cn(
          "w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity",
          isActive ? "text-white/70" : "text-violet-400"
        )}
        onClick={(e) => {
          e.stopPropagation();
          speak(word);
        }}
      />

      {/* Active indicator dot */}
      {isActive && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
      )}
    </button>
  );
}
