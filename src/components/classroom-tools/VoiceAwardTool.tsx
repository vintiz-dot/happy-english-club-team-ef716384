/**
 * Voice points: the classroom-tools card of the voice assistant (owner, 27 Nov 2026).
 *
 * The switch, the class, what the assistant is doing, the mic level, the last
 * few commands and the one-time voice set-up. The work itself lives in
 * VoiceAwardContext (mounted at the app root), so it keeps listening when this
 * panel is closed. A voice command saves points to the children marked Present
 * or Late in the lesson running now.
 */
import { useEffect, useState } from "react";
import { Mic, Undo2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useVoiceAward, useVoiceLevel } from "@/contexts/VoiceAwardContext";
import { VoiceEnrolDialog } from "@/components/voiceAward/VoiceEnrolDialog";
import { Hint, QuietButton, ToolCard } from "./studio/StudioKit";
import { useIvory } from "@/hooks/useIvory";

function timeOf(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function VoiceAwardTool() {
  const ivory = useIvory();
  const {
    allowed,
    enabled,
    phase,
    statusLine,
    notice,
    classId,
    setClassId,
    classes,
    session,
    profileState,
    commands,
    setEnabled,
    undo,
    refreshProfile,
  } = useVoiceAward();
  const level = useVoiceLevel();
  const [enrolOpen, setEnrolOpen] = useState(false);

  useEffect(() => {
    if (allowed && profileState === "unknown") void refreshProfile();
  }, [allowed, profileState, refreshProfile]);

  if (!allowed) return null;

  const problem = phase === "error";

  return (
    <>
      <ToolCard
        icon={Mic}
        tone="lilac"
        title="Voice points"
        description="Say HEC, then who and how many points. Only children marked Present or Late in this lesson."
        action={
          <label className="flex items-center gap-2 text-sm font-medium">
            <span>{enabled ? "On" : "Off"}</span>
            <Switch
              checked={enabled}
              onCheckedChange={(on) => void setEnabled(on)}
              aria-label="Listen for HEC"
            />
          </label>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className={ivory ? "mb-1 block font-medium text-hec-ink" : "mb-1 block font-semibold"}>Class</span>
            <select
              value={classId ?? ""}
              onChange={(e) => setClassId(e.target.value || null)}
              disabled={enabled}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="">Pick a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.running ? " (lesson running now)" : ""}
                </option>
              ))}
            </select>
          </label>

          <div
            className={
              problem
                ? "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                : "rounded-md bg-muted px-3 py-2 text-sm"
            }
            aria-live="polite"
          >
            <p className="font-semibold">{statusLine}</p>
            {notice && <p className="mt-0.5">{notice}</p>}
            {!enabled && classId && !session && profileState === "ready" && (
              <p className="mt-0.5 text-xs text-muted-foreground">It can start when a lesson of this class is running.</p>
            )}
          </div>

          {enabled && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-75"
                style={{ width: `${Math.round(level * 100)}%` }}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <QuietButton size="md" onClick={() => setEnrolOpen(true)}>
              <Mic className="h-4 w-4" aria-hidden /> {profileState === "ready" ? "Redo my voice set-up" : "Set up voice"}
            </QuietButton>
            <QuietButton size="md" onClick={undo} disabled={!enabled}>
              <Undo2 className="h-4 w-4" aria-hidden /> Undo last
            </QuietButton>
          </div>

          {commands.length > 0 && (
            <ul className="space-y-1 text-sm" aria-label="Last commands">
              {commands.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span className="shrink-0 tabular-nums text-muted-foreground">{timeOf(c.at)}</span>
                  <span className={c.kind === "error" ? "text-destructive" : undefined}>{c.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Hint>
          Try: &ldquo;HEC add 20 points to Minh for speaking&rdquo;, &ldquo;HEC take away 5 from Lan&rdquo;, &ldquo;HEC yes&rdquo;,
          &ldquo;HEC cancel&rdquo;, &ldquo;HEC undo&rdquo;. Up to 100 points a command.
        </Hint>
      </ToolCard>

      <VoiceEnrolDialog open={enrolOpen} onOpenChange={setEnrolOpen} />
    </>
  );
}
