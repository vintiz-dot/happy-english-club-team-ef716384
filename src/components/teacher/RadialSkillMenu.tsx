import { AlertTriangle, GraduationCap } from "lucide-react";
import { SkillButton } from "./SkillButton";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SKILL_CONFIG, BEHAVIOR_CONFIG, CORRECTION_OPTIONS, DEDUCTION_OPTIONS } from "@/lib/skillConfig";

interface RadialSkillMenuProps {
  onSkillTap: (skill: string, points: number, subTag?: string) => void;
  onClose: () => void;
  onReadingTheoryClick?: () => void;
}

export function RadialSkillMenu({ onSkillTap, onClose, onReadingTheoryClick }: RadialSkillMenuProps) {
  const [stage, setStage] = useState<"main" | "correction-reasons" | "correction-points">("main");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const handleSkillTap = (skill: string, points: number) => {
    onSkillTap(skill, points);
    onClose();
  };

  const handleBehaviorTap = (behavior: string, points: number) => {
    onSkillTap(behavior, points);
    onClose();
  };

  const handleCorrectionClick = () => {
    setStage("correction-reasons");
  };

  const handleReadingTheoryButtonClick = () => {
    if (onReadingTheoryClick) {
      onReadingTheoryClick();
      onClose();
    }
  };

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
    setStage("correction-points");
  };

  const handleDeductionSelect = (points: number) => {
    if (selectedReason) {
      onSkillTap("correction", points, selectedReason);
    }
    setStage("main");
    setSelectedReason(null);
    onClose();
  };

  const handleBack = () => {
    if (stage === "correction-points") {
      setStage("correction-reasons");
      setSelectedReason(null);
    } else {
      setStage("main");
    }
  };

  // Correction reasons stage
  if (stage === "correction-reasons") {
    return (
      <div className="rounded-hec-lg border border-hec-line bg-hec-raised p-3 text-hec-ink shadow-hec-2">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 px-2">
            ← Back
          </Button>
          <span className="text-hec-small font-medium text-hec-ink-soft">Select Reason</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CORRECTION_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant="destructive-quiet"
              size="sm"
              className="h-auto whitespace-normal py-2 px-3"
              onClick={() => handleReasonSelect(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Correction points stage
  if (stage === "correction-points") {
    const reasonLabel = CORRECTION_OPTIONS.find(o => o.value === selectedReason)?.label || selectedReason;
    return (
      <div className="rounded-hec-lg border border-hec-line bg-hec-raised p-3 text-hec-ink shadow-hec-2">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 px-2">
            ← Back
          </Button>
          <span className="text-hec-small font-medium text-hec-ink-soft truncate">{reasonLabel}</span>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {DEDUCTION_OPTIONS.map((pts) => (
            <Button
              key={pts}
              variant="destructive-quiet"
              size="sm"
              className="w-12 h-12 p-0 font-sans text-hec-body font-bold tabular-nums"
              onClick={() => handleDeductionSelect(pts)}
            >
              {pts}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Main stage - skills and behaviors
  return (
    <div className="rounded-hec-lg border border-hec-line bg-hec-raised p-3 text-hec-ink shadow-hec-2">
      {/* Skills Row */}
      <div className="flex flex-wrap justify-center gap-2 mb-2">
        {Object.entries(SKILL_CONFIG).map(([key, config]) => (
          <SkillButton
            key={key}
            icon={config.icon}
            label={config.label}
            skill={key}
            variant="positive"
            onTap={handleSkillTap}
          />
        ))}
      </div>

      {/* Behaviors Row + Reading Theory + Correction */}
      <div className="flex flex-wrap gap-2 justify-center">
        {Object.entries(BEHAVIOR_CONFIG).map(([key, config]) => (
          <SkillButton
            key={key}
            icon={config.icon}
            label={config.label}
            skill={key}
            variant="positive"
            onTap={handleBehaviorTap}
          />
        ))}
        
        {/* Reading Theory Button - Opens cumulative score entry */}
        {onReadingTheoryClick && (
          <button
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-hec-md border min-w-[64px] min-h-[56px] transition-colors duration-hec-1 ease-hec touch-manipulation select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken"
            onClick={handleReadingTheoryButtonClick}
          >
            <GraduationCap className="h-6 w-6" aria-hidden />
            <span className="text-hec-caption font-medium">RT</span>
          </button>
        )}
        
        {/* Correction Button */}
        <button
          className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-hec-md border min-w-[64px] min-h-[56px] transition-colors duration-hec-1 ease-hec touch-manipulation select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring border-hec-danger bg-transparent text-hec-danger hover:bg-hec-danger-tint"
          onClick={handleCorrectionClick}
        >
          <AlertTriangle className="h-6 w-6" aria-hidden />
          <span className="text-hec-caption font-medium">Correction</span>
        </button>
      </div>
    </div>
  );
}
