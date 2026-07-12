import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Timer, Disc3, Volume2, Bell, Users, Dices, TrafficCone, Hash, ClipboardCheck, Trophy } from "lucide-react";
import { VisualTimer } from "./VisualTimer";
import { WheelSpinner } from "./WheelSpinner";
import { NoiseMeter } from "./NoiseMeter";
import { FocusChime } from "./FocusChime";
import { GroupMaker } from "./GroupMaker";
import { DiceRoller } from "./DiceRoller";
import { TrafficLight } from "./TrafficLight";
import { RandomPicker } from "./RandomPicker";
import { AttendanceTool } from "./AttendanceTool";
import { LeaderboardTool } from "./LeaderboardTool";
import { cn } from "@/lib/utils";
import { useTimer } from "@/contexts/TimerContext";
import { useNoiseMeter } from "@/contexts/NoiseMeterContext";

// Each tool carries its own gradient identity — the active tab, and any
// hero styling inside the tool, share the same tone.
const TOOLS = [
  { id: "timer", label: "Timer", icon: Timer, active: "data-[state=active]:from-blue-500 data-[state=active]:to-sky-500" },
  { id: "wheel", label: "Spinner", icon: Disc3, active: "data-[state=active]:from-fuchsia-500 data-[state=active]:to-purple-600" },
  { id: "noise", label: "Noise", icon: Volume2, active: "data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600" },
  { id: "chime", label: "Chime", icon: Bell, active: "data-[state=active]:from-amber-400 data-[state=active]:to-orange-500" },
  { id: "groups", label: "Groups", icon: Users, active: "data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600" },
  { id: "dice", label: "Dice", icon: Dices, active: "data-[state=active]:from-rose-500 data-[state=active]:to-red-600" },
  { id: "traffic", label: "Light", icon: TrafficCone, active: "data-[state=active]:from-lime-500 data-[state=active]:to-green-600" },
  { id: "random", label: "Pick", icon: Hash, active: "data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600" },
  { id: "attendance", label: "Attend", icon: ClipboardCheck, active: "data-[state=active]:from-sky-500 data-[state=active]:to-cyan-600" },
  { id: "leaderboard", label: "Board", icon: Trophy, active: "data-[state=active]:from-yellow-400 data-[state=active]:to-amber-500" },
] as const;

type ToolId = (typeof TOOLS)[number]["id"];

function formatCompact(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Floating launcher mounted into the layout for teachers/admins. Stays
 * visible across pages so a teacher can flip between the lesson view and
 * a tool (timer, spinner, etc.) without navigating away.
 *
 * The Timer state is hoisted into TimerContext so it persists even when
 * the Sheet is closed. The NoiseMeter state is hoisted into NoiseMeterContext
 * for the same reason — mic keeps running when the sheet is minimized.
 */
export function ClassroomToolsLauncher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ToolId>("timer");
  const { running, alarming, remaining, dismiss } = useTimer();
  const { status: noiseStatus, level: noiseLevel } = useNoiseMeter();
  const noiseLive = noiseStatus === "running";

  // Auto-open the sheet and switch to timer tab when alarm fires
  useEffect(() => {
    if (alarming) {
      setOpen(true);
      setActive("timer");
    }
  }, [alarming]);

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => {
          // If alarming, dismiss immediately on FAB tap as a quick-stop
          if (alarming) {
            dismiss();
            return;
          }
          setOpen(true);
        }}
        aria-label={alarming ? "Stop Timer Alarm" : "Open Classroom Tools"}
        className={cn(
          "group fixed bottom-5 right-5 md:bottom-6 md:right-6 z-40 h-14 w-14 rounded-full lift",
          alarming
            ? "bg-gradient-to-br from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white animate-bounce shadow-[0_8px_30px_-6px_rgba(244,63,94,0.7)]"
            : "bg-gradient-to-br from-blue-500 via-indigo-500 to-sky-500 text-white ring-2 ring-white/25 shadow-[0_8px_30px_-6px_rgba(59,130,246,0.65)] hover:shadow-[0_10px_40px_-6px_rgba(59,130,246,0.85)]",
        )}
      >
        {alarming ? (
          <span className="text-2xl">⏰</span>
        ) : (
          <Sparkles className="h-6 w-6 transition-transform duration-300 group-hover:rotate-[20deg] group-hover:scale-110" />
        )}

        {/* Running timer indicator badge */}
        {running && !alarming && (
          <span
            className={cn(
              "absolute -top-1 -right-1 min-w-[2.25rem] px-1.5 py-0.5 rounded-full",
              "bg-emerald-500 text-white text-[10px] font-bold tabular-nums leading-none",
              "shadow-lg animate-pulse pointer-events-none",
            )}
          >
            {formatCompact(remaining)}
          </span>
        )}

        {/* Alarming badge */}
        {alarming && (
          <span
            className={cn(
              "absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full",
              "bg-white text-rose-600 text-[10px] font-black leading-none",
              "shadow-lg animate-pulse pointer-events-none",
            )}
          >
            STOP
          </span>
        )}

        {/* Noise meter live indicator (bottom-left of FAB) */}
        {noiseLive && !alarming && !running && (
          <span
            className={cn(
              "absolute -bottom-0.5 -left-0.5 min-w-[1.75rem] px-1 py-0.5 rounded-full",
              "text-white text-[9px] font-bold tabular-nums leading-none",
              "shadow-lg pointer-events-none",
              noiseLevel > 65 ? "bg-rose-500 animate-pulse" : "bg-emerald-500",
            )}
          >
            🎤{noiseLevel}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col gap-0 bg-card/85 backdrop-blur-2xl"
        >
          {/* Aurora hero band with light sweep */}
          <SheetHeader className="relative overflow-hidden px-5 py-4 bg-aurora hero-sheen text-left">
            <div className="nova-grid-light absolute inset-0 pointer-events-none" />
            <SheetTitle className="relative flex items-center gap-2 type-h2 text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              Classroom Tools
            </SheetTitle>
            <SheetDescription className="relative type-micro text-white/75">
              Lightweight aids you can pull up mid-lesson without losing your place.
            </SheetDescription>
            <div className="hairline-gradient absolute inset-x-0 bottom-0 h-px" />
          </SheetHeader>

          <Tabs
            value={active}
            onValueChange={(v) => setActive(v as ToolId)}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="mx-3 mt-3 shrink-0 overflow-x-auto scrollbar-hide">
              <TabsList className="inline-flex w-auto min-w-full h-auto gap-1 bg-muted/50 p-1 rounded-2xl">
                {TOOLS.map((t) => (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className={cn(
                      "flex flex-col gap-0.5 h-auto py-2 px-2.5 rounded-xl shrink-0 transition-all duration-200",
                      "hover:bg-background/70",
                      "data-[state=active]:bg-gradient-to-br data-[state=active]:text-white",
                      "data-[state=active]:shadow-[0_4px_14px_-4px_rgba(59,130,246,0.5)] data-[state=active]:scale-[1.06]",
                      t.active,
                    )}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-semibold">{t.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Timer is always rendered — state lives in TimerContext
                  so mounting/unmounting is cheap and lossless. */}
              <TabsContent value="timer" className="m-0 focus-visible:outline-none">
                <VisualTimer />
              </TabsContent>
              <TabsContent value="wheel" className="m-0 focus-visible:outline-none">
                {active === "wheel" && <WheelSpinner />}
              </TabsContent>
              {/* NoiseMeter always rendered — state in NoiseMeterContext */}
              <TabsContent value="noise" className="m-0 focus-visible:outline-none">
                <NoiseMeter />
              </TabsContent>
              <TabsContent value="chime" className="m-0 focus-visible:outline-none">
                {active === "chime" && <FocusChime />}
              </TabsContent>
              <TabsContent value="groups" className="m-0 focus-visible:outline-none">
                {active === "groups" && <GroupMaker />}
              </TabsContent>
              <TabsContent value="dice" className="m-0 focus-visible:outline-none">
                {active === "dice" && <DiceRoller />}
              </TabsContent>
              <TabsContent value="traffic" className="m-0 focus-visible:outline-none">
                {active === "traffic" && <TrafficLight />}
              </TabsContent>
              <TabsContent value="random" className="m-0 focus-visible:outline-none">
                {active === "random" && <RandomPicker />}
              </TabsContent>
              <TabsContent value="attendance" className="m-0 focus-visible:outline-none">
                {active === "attendance" && <AttendanceTool />}
              </TabsContent>
              <TabsContent value="leaderboard" className="m-0 focus-visible:outline-none">
                {active === "leaderboard" && <LeaderboardTool />}
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
