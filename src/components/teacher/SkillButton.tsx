import { useState, useCallback, useRef } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POINT_OPTIONS } from "@/lib/skillConfig";
import { Check } from "lucide-react";

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

  const handleClick = useCallback(() => {
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

  const baseClasses = cn(
    "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-hec-md border min-w-[64px] min-h-[56px] transition-colors duration-hec-1 ease-hec touch-manipulation select-none",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
    variant === "positive"
      ? "border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken"
      : "border-hec-danger bg-transparent text-hec-danger hover:bg-hec-danger-tint"
  );

  return (
    <Popover open={showPointOptions} onOpenChange={setShowPointOptions}>
      <PopoverTrigger asChild>
        <button
          className={baseClasses}
          onClick={handleClick}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Icon className="h-6 w-6" aria-hidden />
          <span className="text-hec-caption font-medium">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" side="top" align="center">
        <div className="flex flex-wrap justify-center gap-2 items-center">
          {POINT_OPTIONS.map((pts) => (
            <Button
              key={pts}
              variant="outline"
              size="sm"
              className="w-10 h-10 p-0 font-sans font-bold tabular-nums"
              onClick={() => handlePointSelect(pts)}
            >
              +{pts}
            </Button>
          ))}
          <div className="flex items-center gap-2">
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
              className="w-14 h-10 [@media(hover:none)]:h-11 text-center font-sans font-bold tabular-nums px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-8 h-10 p-0"
              disabled={!customValue || isNaN(parseInt(customValue)) || parseInt(customValue) < 1}
              onClick={handleCustomSubmit}
              aria-label={`Give custom points for ${label}`}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
