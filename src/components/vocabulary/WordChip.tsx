import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";

interface Props {
  word: string;
  isHighlighted?: boolean;
  isActive?: boolean;
  onClick: (word: string) => void;
}

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

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
      aria-pressed={!!isActive}
      className={cn(
        "group relative inline-flex min-h-hec-target items-center gap-2 rounded-full border px-4",
        "text-hec-small font-medium capitalize transition-colors duration-hec-1 ease-hec",
        FOCUS,
        isActive
          ? // selected: the brass edge (DS s.18 "selected")
            "border-hec-brass bg-hec-sunken text-hec-ink"
          : isHighlighted
          ? // a harder word (A2 and up): the caution tint
            "border-hec-warn/30 bg-hec-warn-tint text-hec-warn"
          : "border-hec-line-strong bg-hec-raised text-hec-ink-soft hover:bg-hec-sunken hover:text-hec-ink",
      )}
    >
      {word}
      <Volume2
        className="h-4 w-4 text-hec-ink-faint opacity-0 transition-opacity duration-hec-1 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          speak(word);
        }}
      />
    </button>
  );
}
