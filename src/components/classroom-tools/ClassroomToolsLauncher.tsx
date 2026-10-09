/**
 * Classroom tools — one panel, every tool on it.
 *
 * This used to be eleven tabs in a 384px drawer. Two problems with that,
 * both of them things a teacher hit every lesson: you could only see one
 * tool at a time (the timer disappeared the moment you went to pick a
 * name), and the tab strip itself was a horizontally scrolling row of
 * 9px labels, which is not a target you hit while facing a class.
 *
 * Now it is a wide sheet with every tool laid out as a card. The jump bar
 * at the top scrolls to one; nothing hides anything else. The tools that
 * need data wait until they are nearly on screen (see Deferred) so
 * opening the panel does not fire eight queries at once.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Bot,
  ClipboardCheck,
  CircleDollarSign,
  Dices,
  Disc3,
  HelpCircle,
  LayoutGrid,
  Music4,
  TrafficCone,
  Timer as TimerIcon,
  Trophy,
  Users,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AssistantChat } from "@/components/chat/AssistantChat";
import { cn } from "@/lib/utils";
import { useTimer } from "@/contexts/TimerContext";
import { useNoiseMeter } from "@/contexts/NoiseMeterContext";

import { VisualTimer } from "./VisualTimer";
import { WheelSpinner } from "./WheelSpinner";
import { NoiseMeter } from "./NoiseMeter";
import { FocusChime } from "./FocusChime";
import { TeamMaker } from "./TeamMaker";
import { DiceRoller } from "./DiceRoller";
import { TrafficLight } from "./TrafficLight";
import { RandomPicker, CoinFlip } from "./RandomPicker";
import { AttendanceTool } from "./AttendanceTool";
import { LeaderboardTool } from "./LeaderboardTool";
import { BackgroundMusic } from "./BackgroundMusic";
import { Deferred } from "./studio/Deferred";
import {
  ToolCard,
} from "./studio/StudioKit";

interface ToolEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Data-backed tools wait until they are nearly in view. */
  defer?: boolean;
  wide?: boolean;
  render: () => JSX.Element;
}

const TOOLS: ToolEntry[] = [
  { id: "timer", label: "Timer", icon: TimerIcon, render: () => <VisualTimer /> },
  { id: "dice", label: "Dice", icon: Dices, render: () => <DiceRoller /> },
  { id: "number", label: "Number", icon: HelpCircle, render: () => <RandomPicker /> },
  { id: "music", label: "Music", icon: Music4, render: () => <BackgroundMusic /> },
  { id: "spinner", label: "Spinner", icon: Disc3, render: () => <WheelSpinner /> },
  { id: "coin", label: "Coin", icon: CircleDollarSign, render: () => <CoinFlip /> },
  { id: "voice", label: "Voice", icon: TrafficCone, render: () => <TrafficLight /> },
  { id: "chime", label: "Chime", icon: Bell, render: () => <FocusChime /> },
  { id: "noise", label: "Noise", icon: Volume2, render: () => <NoiseMeter /> },
  { id: "teams", label: "Teams", icon: Users, wide: true, defer: true, render: () => <TeamMaker /> },
  {
    id: "attendance",
    label: "Attendance",
    icon: ClipboardCheck,
    wide: true,
    defer: true,
    render: () => <AttendanceTool />,
  },
  {
    id: "board",
    label: "Board",
    icon: Trophy,
    wide: true,
    defer: true,
    render: () => <LeaderboardTool />,
  },
  {
    id: "assistant",
    label: "Ask AI",
    icon: Bot,
    wide: true,
    defer: true,
    render: () => (
      <ToolCard
        icon={Bot}
        tone="lilac"
        title="Ask AI"
        description="Lesson ideas, quick explanations, anything about your own classes."
        wide
      >
        <div className="h-[420px] overflow-hidden rounded-2xl border border-studio">
          <AssistantChat className="h-full" />
        </div>
      </ToolCard>
    ),
  },
];

function formatCompact(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClassroomToolsLauncher() {
  const [open, setOpen] = useState(false);
  const { running, alarming, remaining, dismiss } = useTimer();
  const { status: noiseStatus, level: noiseLevel } = useNoiseMeter();
  const noiseLive = noiseStatus === "running";
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const jumpTo = useCallback((id: string) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-tool="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // A ringing timer opens the panel on the timer, wherever the teacher is.
  useEffect(() => {
    if (!alarming) return;
    setOpen(true);
    const t = window.setTimeout(() => jumpTo("timer"), 260);
    return () => window.clearTimeout(t);
  }, [alarming, jumpTo]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // While ringing, the button is a stop button — the fastest way
          // to silence it is the thing already under your thumb.
          if (alarming) {
            dismiss();
            return;
          }
          setOpen(true);
        }}
        aria-label={alarming ? "Stop the timer alarm" : "Open classroom tools"}
        className={cn(
          "studio-focus fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full transition-transform md:bottom-6 md:right-6",
          "hover:scale-105 active:scale-95",
          alarming
            ? "animate-bounce bg-[hsl(2_72%_46%)] text-white shadow-[0_10px_30px_-8px_hsl(2_72%_40%/0.7)]"
            : "bg-[hsl(var(--studio-ink))] text-[hsl(var(--studio-card))] shadow-studio-lg",
        )}
      >
        {alarming ? (
          <Bell className="h-6 w-6" aria-hidden />
        ) : (
          <LayoutGrid className="h-[22px] w-[22px]" strokeWidth={2.2} aria-hidden />
        )}

        {running && !alarming && (
          <span className="pointer-events-none absolute -right-1 -top-1 min-w-[2.25rem] rounded-full bg-[hsl(var(--studio-sage))] px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums text-[hsl(var(--studio-sage-ink))] shadow-studio">
            {formatCompact(remaining)}
          </span>
        )}

        {noiseLive && !alarming && !running && (
          <span
            className={cn(
              "pointer-events-none absolute -bottom-0.5 -left-0.5 min-w-[1.75rem] rounded-full px-1 py-0.5 text-[9px] font-bold leading-none tabular-nums shadow-studio",
              noiseLevel > 65
                ? "animate-pulse bg-[hsl(var(--studio-clay))] text-[hsl(var(--studio-clay-ink))]"
                : "bg-[hsl(var(--studio-sage))] text-[hsl(var(--studio-sage-ink))]",
            )}
          >
            {noiseLevel}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="studio-surface flex w-full flex-col gap-0 border-l-0 p-0 sm:max-w-[min(100vw-2rem,82rem)]"
        >
          <header className="shrink-0 border-b border-studio px-5 pb-3 pt-5 sm:px-7">
            <SheetTitle className="studio-title text-2xl">Classroom tools</SheetTitle>
            <SheetDescription className="mt-0.5 text-sm text-ink-soft">
              Everything on one page — nothing hides anything else.
            </SheetDescription>

            <nav
              aria-label="Jump to a tool"
              className="scrollbar-hide -mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1"
            >
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => jumpTo(tool.id)}
                  className="studio-focus inline-flex shrink-0 items-center gap-1.5 rounded-full border border-studio bg-studio-card px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-[hsl(var(--studio-ink))] hover:text-[hsl(var(--studio-card))]"
                >
                  <tool.icon className="h-3.5 w-3.5" aria-hidden />
                  {tool.label}
                </button>
              ))}
            </nav>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            {/* Three across only from xl. At lg the sheet is barely 1000px, and
                three columns there squeezed every card title onto two lines
                and truncated the controls. */}
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              {TOOLS.map((tool) => (
                <div
                  key={tool.id}
                  data-tool={tool.id}
                  className={cn(
                    "scroll-mt-4",
                    tool.wide && "md:col-span-2 xl:col-span-3",
                  )}
                >
                  {tool.defer ? (
                    <Deferred wide={tool.wide} minHeight={tool.wide ? 300 : 260}>
                      {tool.render()}
                    </Deferred>
                  ) : (
                    tool.render()
                  )}
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
