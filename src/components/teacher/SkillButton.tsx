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
    "flex flex-col items-center justify-center gap-1 p-3 rounded-xl min-w-[56px] min-h-[56px] transition-all active:scale-95 touch-manipulation select-none",
    variant === "positive" 
      ? "bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-400" 
      : "bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400"
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
          <span className="text-[10px] font-medium leading-tight">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" side="top" align="center">
        <div className="flex gap-1 items-center">
          {POINT_OPTIONS.map((pts) => (
            <Button
              key={pts}
              variant="outline"
              size="sm"
              className="w-10 h-10 p-0 text-sm font-bold hover:bg-warmGray hover:text-royalGreen hover:border-royalGreen dark:hover:bg-warmGray-dark dark:hover:text-royalGreen-light dark:hover:border-royalGreen-light"
              onClick={() => handlePointSelect(pts)}
            >
              +{pts}
            </Button>
          ))}
          <div className="flex items-center gap-0.5 ml-1">
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
              className="w-12 h-10 [@media(hover:none)]:h-11 text-center text-sm font-bold p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-8 h-10 p-0"
              disabled={!customValue || isNaN(parseInt(customValue)) || parseInt(customValue) < 1}
              onClick={handleCustomSubmit}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
