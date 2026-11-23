/**
 * The recording bar fixed to the bottom of the recorder screen, and the
 * "not being recorded" notice. Presentational only, so they can be rendered
 * in a test (scripts/recorder/screens.test.mjs): Stop is there in every
 * capturing state; the red dot only while `recording`; `stalled` says NOT
 * RECORDING (C2 reviews 2 and 3).
 */
import { AlertTriangle, CircleDot, Clock, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecorderState } from "@/lib/recorder";
import { Notice } from "./pieces";

export function RecordingBar({ state, startingLong, elapsed, className, bothMicsGone, onStop }: {
  state: RecorderState; startingLong: boolean; elapsed: string; className?: string | null; bothMicsGone?: boolean; onStop: () => void;
}) {
  const loud = state === "stalled" || startingLong;
  const text = state === "recording" ? "Recording"
    : state === "stalled" ? (bothMicsGone ? "Interrupted - NOT RECORDING - both microphones are gone" : "Interrupted - NOT RECORDING - restarting the audio")
    : startingLong ? "Saving on this laptop - the school server has not confirmed yet" : "Starting...";
  return (
    <div
      className={cn("fixed inset-x-0 bottom-0 z-50 border-t-2 bg-hec-surface text-hec-ink shadow-hec-2", state === "recording" ? "border-hec-danger" : "border-hec-warn")}
      role={loud ? "alert" : "status"}
      aria-live={loud ? "assertive" : "polite"}
      aria-label={state === "recording" ? "Recording in progress" : state === "stalled" ? "Not recording" : "Waiting for the school server"}
      data-recorder-bar={state}
    >
      <div className={cn("max-w-3xl mx-auto flex items-center gap-x-3 px-3 py-1", loud && "flex-wrap gap-y-1")}>
        {/* Small while all is well; a warning (NOT RECORDING) still wraps and is read out in full. */}
        <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold min-w-0", loud ? "break-words" : "truncate")}>
          {state === "recording"
            ? <CircleDot className="h-3.5 w-3.5 shrink-0 text-hec-danger fill-hec-danger motion-safe:animate-pulse" aria-hidden data-red-dot="" />
            : loud
              ? <AlertTriangle className="h-4 w-4 shrink-0 text-hec-warn" aria-hidden data-warning-sign="" />
              // A calm state (starting, under 5 s) needs no action: no warning sign (C2 review 5).
              : <Clock className="h-4 w-4 shrink-0" aria-hidden />}
          {text}
        </span>
        <span className="tabular-nums text-sm">{elapsed}</span>
        <span className="min-w-0 truncate text-sm opacity-80 hidden sm:inline">{className}</span>
        <Button size="sm" className="ml-auto h-8 min-h-8 px-3 text-sm bg-hec-action text-hec-on-action hover:bg-hec-action/90 font-semibold" onClick={onStop}>
          <Square className="h-3 w-3 mr-1.5" aria-hidden /> Stop
        </Button>
      </div>
    </div>
  );
}

/** The `error` state: the server refused to start (or the recording cannot be sent). */
export function NotRecordedNotice({ body }: { body?: string | null }) {
  return (
    <Notice tone="error" title="This lesson is not being recorded" role="alert">
      {body ?? "The school server did not start the recording. What was captured is kept on this laptop."}
    </Notice>
  );
}
