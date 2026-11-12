/**
 * Small shared pieces of the recorder screens. Status is always a word and
 * an icon, never colour alone; colours come from the existing tokens.
 */
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { levelWord, meterFraction, type StatusLine, type Tone } from "@/lib/recorderUi";
import type { Level } from "@/lib/recorder";

export const toneText: Record<Tone, string> = {
  ok: "text-success",
  info: "text-muted-foreground",
  warn: "text-warning",
  error: "text-destructive",
};
const toneBox: Record<Tone, string> = {
  ok: "border-success/40 bg-success/5",
  info: "border-border bg-muted/40",
  warn: "border-warning/50 bg-warning/10",
  error: "border-destructive/50 bg-destructive/5",
};

export function ToneIcon({ tone, className }: { tone: Tone; className?: string }) {
  const Icon = tone === "ok" ? CheckCircle2 : tone === "warn" ? AlertTriangle : tone === "error" ? XCircle : Info;
  return <Icon aria-hidden className={cn("h-5 w-5 shrink-0", toneText[tone], className)} />;
}

/** A status line: icon + words. `live` announces changes to screen readers. */
export function Status({ line, live, className }: { line: StatusLine; live?: boolean; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-base leading-snug", className)} role={live ? "status" : undefined} aria-live={live ? "polite" : undefined}>
      <ToneIcon tone={line.tone} className="mt-0.5" />
      <span className="break-words">{line.text}</span>
    </p>
  );
}

/** A boxed message with a title, a body and at most one action. */
export function Notice({ tone, title, children, action, role }: { tone: Tone; title: string; children?: ReactNode; action?: ReactNode; role?: "alert" | "status" }) {
  return (
    <div className={cn("rounded-xl border p-4 space-y-2", toneBox[tone])} role={role}>
      <div className="flex items-start gap-2">
        <ToneIcon tone={tone} className="mt-0.5" />
        <div className="space-y-1 min-w-0">
          <p className="font-semibold text-base break-words">{title}</p>
          {children ? <div className="text-sm text-muted-foreground break-words">{children}</div> : null}
        </div>
      </div>
      {action ? <div className="pl-7">{action}</div> : null}
    </div>
  );
}

/** A level bar with its word ("Good", "Quiet"...). The bar is decoration; the word is the status. */
export function LevelMeter({ label, level, device }: { label: string; level: Level | null; device?: string }) {
  const db = level?.rmsDb ?? -120;
  const frac = meterFraction(db);
  const w = levelWord(db, level?.clipped ?? 0);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-medium">{label}</span>
        <span className={cn("text-sm font-medium inline-flex items-center gap-1", toneText[w.tone])}>
          <ToneIcon tone={w.tone} className="h-4 w-4" /> {level ? w.word : "Not listening"}
        </span>
      </div>
      {device ? <p className="text-xs text-muted-foreground break-words">{device}</p> : null}
      <div
        className="h-3 w-full rounded-full bg-muted overflow-hidden"
        role="meter"
        aria-label={`${label} level`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(frac * 100)}
        aria-valuetext={level ? w.word : "Not listening"}
      >
        <div
          className={cn("h-full rounded-full motion-safe:transition-[width] motion-safe:duration-100", w.tone === "error" ? "bg-destructive" : w.tone === "warn" ? "bg-warning" : "bg-primary")}
          style={{ width: `${Math.round(frac * 100)}%` }}
        />
      </div>
    </div>
  );
}

/** "My microphone - ready" with a tick, or what is wrong. */
export function MicTick({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <ToneIcon tone={ok ? "ok" : "error"} className="mt-0.5 h-6 w-6" />
      <div className="min-w-0">
        <p className="font-medium">{label} <span className={cn("text-sm", ok ? "text-success" : "text-destructive")}>{ok ? "ready" : "not ready"}</span></p>
        <p className="text-sm text-muted-foreground break-words">{detail}</p>
      </div>
    </div>
  );
}
