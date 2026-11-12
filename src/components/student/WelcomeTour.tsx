import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, X, Sparkles, Trophy, Target, Rocket, BookOpen } from "lucide-react";

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "demo-hero",
    title: "Your Profile & Level 🎮",
    description: "This is your XP ring! As you earn experience points, you'll level up and unlock new achievements.",
    icon: <Sparkles className="h-5 w-5 text-hec-ink-soft" />,
    position: "bottom",
  },
  {
    targetId: "demo-stats",
    title: "Track Your Progress 📊",
    description: "See your total XP, rank, homework count, and daily streak at a glance. These update in real time!",
    icon: <Target className="h-5 w-5 text-hec-ink-soft" />,
    position: "bottom",
  },
  {
    targetId: "demo-leaderboard",
    title: "Class Leaderboard 🏆",
    description: "Compete with classmates for the top spot! Earn XP from homework, attendance, and participation.",
    icon: <Trophy className="h-5 w-5 text-hec-ink-soft" />,
    position: "right",
  },
  {
    targetId: "demo-challenges",
    title: "Daily Challenges ⚡",
    description: "Complete daily tasks for bonus XP. Check in, do homework, and attend class to earn rewards every day!",
    icon: <BookOpen className="h-5 w-5 text-hec-ink-soft" />,
    position: "left",
  },
  {
    targetId: "demo-enroll",
    title: "Join a Class! 🚀",
    description: "Browse available classes below and send an enrollment request. Once approved, your adventure begins!",
    icon: <Rocket className="h-5 w-5 text-hec-ink-soft" />,
    position: "top",
  },
];

const STORAGE_KEY = "demo_tour_completed";

export function WelcomeTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [arrowDir, setArrowDir] = useState<"top" | "bottom" | "left" | "right">("bottom");

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsActive(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const positionTooltip = useCallback((step: TourStep) => {
    const el = document.getElementById(step.targetId);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const tooltipW = 320;
    const tooltipH = 180;
    const gap = 16;

    let top = 0;
    let left = 0;
    let arrow: typeof arrowDir = "top";

    switch (step.position) {
      case "bottom":
        top = rect.bottom + scrollY + gap;
        left = rect.left + scrollX + rect.width / 2 - tooltipW / 2;
        arrow = "top";
        break;
      case "top":
        top = rect.top + scrollY - tooltipH - gap;
        left = rect.left + scrollX + rect.width / 2 - tooltipW / 2;
        arrow = "bottom";
        break;
      case "right":
        top = rect.top + scrollY + rect.height / 2 - tooltipH / 2;
        left = rect.right + scrollX + gap;
        arrow = "left";
        break;
      case "left":
        top = rect.top + scrollY + rect.height / 2 - tooltipH / 2;
        left = rect.left + scrollX - tooltipW - gap;
        arrow = "right";
        break;
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16));
    top = Math.max(scrollY + 16, top);

    setTooltipPos({ top, left });
    setArrowDir(arrow);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const step = TOUR_STEPS[currentStep];
    const el = document.getElementById(step.targetId);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Wait for scroll to settle
      const timer = setTimeout(() => positionTooltip(step), 400);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isActive, positionTooltip]);

  useEffect(() => {
    if (!isActive) return;
    const handler = () => positionTooltip(TOUR_STEPS[currentStep]);
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler);
    };
  }, [isActive, currentStep, positionTooltip]);

  const closeTour = () => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      closeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const arrowClasses: Record<string, string> = {
    top: "left-1/2 -translate-x-1/2 -top-2 border-b-hec-raised border-l-transparent border-r-transparent border-t-transparent",
    bottom: "left-1/2 -translate-x-1/2 -bottom-2 border-t-hec-raised border-l-transparent border-r-transparent border-b-transparent",
    left: "top-1/2 -translate-y-1/2 -left-2 border-r-hec-raised border-t-transparent border-b-transparent border-l-transparent",
    right: "top-1/2 -translate-y-1/2 -right-2 border-l-hec-raised border-t-transparent border-b-transparent border-r-transparent",
  };

  return (
    <>
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[998] bg-hec-scrim/40"
        onClick={closeTour}
      />

      {/* Highlight ring on the target element */}
      <HighlightRing targetId={step.targetId} />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-label={step.title}
          className="fixed z-[1000] w-[320px] max-w-[calc(100vw-2rem)]"
          style={{ top: tooltipPos.top, left: tooltipPos.left, position: "absolute" }}
        >
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-[8px] ${arrowClasses[arrowDir]}`}
          />

          <div className="overflow-hidden rounded-hec-lg border border-hec-line bg-hec-raised shadow-hec-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-hec-line px-5 py-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className="mt-0.5 shrink-0">{step.icon}</span>
                <span className="min-w-0 text-hec-small font-semibold text-hec-ink">{step.title}</span>
              </div>
              <Button variant="ghost" size="icon" className="min-h-hec-target min-w-hec-target shrink-0" aria-label="Close tour" onClick={closeTour}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-hec-small text-hec-ink-soft">{step.description}</p>

              <div className="flex items-center justify-between">
                {/* Step dots */}
                <div className="flex gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full ${
                        i === currentStep
                          ? "w-6 bg-hec-brass"
                          : i < currentStep
                          ? "w-1.5 bg-hec-ink-soft"
                          : "w-1.5 bg-hec-line-strong"
                      }`}
                    />
                  ))}
                </div>

                {/* Nav buttons */}
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button variant="ghost" size="sm" onClick={prevStep} className="min-h-hec-target px-2" aria-label="Previous step">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" onClick={nextStep} className="min-h-hec-target gap-1">
                    {isLast ? "Get Started!" : "Next"}
                    {!isLast && <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <button
                onClick={closeTour}
                className="min-h-hec-target w-full text-center text-hec-small text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
              >
                Skip tour
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function HighlightRing({ targetId }: { targetId: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => {
      const el = document.getElementById(targetId);
      if (el) setRect(el.getBoundingClientRect());
    };
    update();
    const timer = setTimeout(update, 400);
    window.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId]);

  if (!rect) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24 }}
      className="pointer-events-none fixed z-[999] rounded-hec-lg"
      style={{
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        border: "2px solid hsl(var(--hec-ring))",
      }}
    />
  );
}
