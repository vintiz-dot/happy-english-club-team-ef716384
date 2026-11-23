import { useState, useCallback, useRef } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POINT_OPTIONS } from "@/lib/skillConfig";
import { Check } from "lucide-react";
import { noteTapOrigin } from "@/components/fx/flight";

interface SkillButtonProps {
  icon: LucideIcon;
  label: string;
  skill: string;
  variant?: "positive" | "negative";
  onTap: (skill: string, points: number) => void;
}

export function SkillButton({ 
  icon: Icon, 
  label, 
  skill, 
  variant = "positive",
  onTap 
}: SkillButtonProps) {
  const [showPointOptions, setShowPointOptions] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    // where the tapped skill is on screen: the point token flies from here (nothing is saved or sent from this)
    noteTapOrigin(e.currentTarget);
    setShowPointOptions(true);
    setCustomValue("");
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const handlePointSelect = (points: number) => {
    onTap(skill, points);
    setShowPointOptions(false);
  };

  const handleCustomSubmit = () => {
    const val = parseInt(customValue, 10);
    if (!isNaN(val) && val > 0 && val <= 100) {
      handlePointSelect(val);
    }
  };

  const ivory = useIvory();
  const baseClasses = ivory
    ? cn(
        "flex w-full min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 rounded-hec-md border min-h-[56px] transition-colors duration-hec-1 ease-hec touch-manipulation select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
        variant === "positive"
          ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf hover:border-hec-leaf"
          : "border-hec-danger/30 bg-hec-danger-tint text-hec-danger hover:border-hec-danger"
      )
    : cn(
    "flex flex-col items-center justify-center gap-1 p-3 rounded-xl min-w-[56px] min-h-[56px] transition-all active:scale-95 touch-manipulation select-none",
    variant === "positive"
      ? "border border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf"
      : "border border-hec-danger/30 bg-hec-danger-tint text-hec-danger"
  );

  return (
    <Popover open={showPointOptions} onOpenChange={setShowPointOptions}>
      <PopoverTrigger asChild>
        <button
          className={baseClasses}
          onClick={handleClick}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Icon className="h-6 w-6" />
          <span className={ivory ? "text-hec-caption font-medium" : "text-[10px] font-medium leading-tight"}>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className={ivory ? "w-auto max-w-[calc(100vw-2rem)] p-2" : "w-auto p-2"} side="top" align="center" aria-label={ivory ? `Points for ${label}` : undefined}>
        <div className={ivory ? "flex flex-wrap gap-2 items-center justify-center" : "flex gap-1 items-center"}>
          {POINT_OPTIONS.map((pts) => (
            <Button
              key={pts}
              variant="outline"
              size="sm"
              className={ivory
                ? "min-h-hec-target min-w-hec-target p-0 text-hec-body font-semibold tabular-nums"
                : "min-h-hec-target min-w-hec-target p-0 text-hec-body font-semibold tabular-nums"}
              onClick={() => handlePointSelect(pts)}
            >
              +{pts}
            </Button>
          ))}
          <div className={ivory ? "flex items-center gap-2" : "flex items-center gap-0.5 ml-1"}>
            <Input
              ref={inputRef}
              type="number"
              min={1}
              max={100}
              placeholder="#"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCustomSubmit(); }}
              aria-label={`Custom points for ${label}`}
              className={ivory
                ? "w-16 min-h-hec-target text-center text-hec-body font-semibold tabular-nums p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                : "w-12 h-10 [@media(hover:none)]:h-11 text-center text-sm font-bold p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"}
            />
            <Button
              variant="outline"
              size="sm"
              className={ivory ? "min-h-hec-target min-w-hec-target p-0" : "w-8 h-10 p-0"}
              disabled={!customValue || isNaN(parseInt(customValue)) || parseInt(customValue) < 1}
              onClick={handleCustomSubmit}
              aria-label={ivory ? `Give the custom points for ${label}` : undefined}
            >
              <Check className={ivory ? "h-5 w-5" : "h-4 w-4"} />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
