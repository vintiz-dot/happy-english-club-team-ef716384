import { useState } from "react";
import { Check, Loader2, Play, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mmss, type ViewLine } from "@/lib/lessonMonitor";
import {
  VOICE_WORDING, groupsToName, linesOf, tappedIn, type GroupRow, type LineVoice, type VoiceAnswer,
} from "@/lib/lessonMonitorVoices";
import { useNameVoiceGroup } from "@/hooks/useLessonMonitor";

/**
 * "Voices in this lesson": the teacher names each voice group once (a child,
 * several voices, themself, or don't know). Every line of the group then
 * carries that name, and a named child with voiceprint consent becomes better
 * known to the laptop. The computer's suggestion is a question; nothing is
 * named until the teacher answers.
 */
export function VoiceGroups({ reportId, rows, voices, lines, kids, nameOf, play }: {
  reportId: string;
  rows: GroupRow[];
  voices: LineVoice[];
  lines: ViewLine[];
  kids: { id: string; name: string }[];
  nameOf: (id: string) => string;
  /** Absent when the lesson's audio is gone: the times are shown without a play button. */
  play?: (t: number) => void;
}) {
  const name = useNameVoiceGroup();
  const [busy, setBusy] = useState<string | null>(null);
  const answer = async (group: string, a: VoiceAnswer | null, childId?: string) => {
    setBusy(group);
    try {
      await name.mutateAsync({ reportId, group, answer: a, childId });
    } catch (e) {
      toast.error(`Not saved: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };
  const open = rows.filter((r) => !r.answer).length;

  return (
    <section className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 space-y-3" aria-label="Voices in this lesson">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium text-hec-body text-hec-ink">Voices in this lesson</h3>
        <span className="text-hec-caption text-hec-ink-soft">{open ? `${open} to name` : "all named"}</span>
      </div>
      <p className="text-hec-small text-hec-ink-soft">{VOICE_WORDING.intro}</p>
      <p className="text-hec-caption text-hec-ink-faint">{VOICE_WORDING.groupMayMix}</p>
      <ul className="space-y-3">
        {groupsToName(rows).map((g) => {
          const idx = linesOf(voices, g.group_key);
          const tapped = tappedIn(voices, g.group_key);
          const hint = g.suggested_student ?? tapped;
          const done = g.answer !== null;
          return (
            <li key={g.group_key} className={cn("rounded-hec-md border p-3 space-y-2", done ? "border-hec-line bg-hec-sunken" : "border-hec-line-strong")}
              data-voice-group={g.group_key}>
              <div className="flex flex-wrap items-center gap-2 text-hec-small">
                <span className="font-medium text-hec-ink">Voice {g.group_key.slice(1)}</span>
                <span className="text-hec-ink-soft tabular-nums">{Math.round(g.seconds)} s, {g.line_count} line{g.line_count === 1 ? "" : "s"}</span>
                {done ? (
                  <span className="inline-flex items-center gap-1 rounded-hec-sm bg-hec-leaf-tint px-2 py-0.5 text-hec-caption text-hec-leaf">
                    <Check className="h-3 w-3" aria-hidden />
                    {g.answer === "child" && g.student_id ? nameOf(g.student_id)
                      : g.answer === "several" ? VOICE_WORDING.several : g.answer === "teacher" ? VOICE_WORDING.teacher : VOICE_WORDING.unknown}
                  </span>
                ) : g.suggested_student ? (
                  <span className="rounded-hec-sm bg-hec-brass/10 px-2 py-0.5 text-hec-caption text-hec-ink">{VOICE_WORDING.suggestion(nameOf(g.suggested_student))}</span>
                ) : (
                  <span className="text-hec-caption text-hec-ink-faint">{VOICE_WORDING.notSure}</span>
                )}
              </div>
              <ul className="space-y-0.5">
                {idx.map((i) => lines[i] && (
                  <li key={i} className="flex items-baseline gap-2 text-hec-small text-hec-ink">
                    {play ? (
                      <button type="button" onClick={() => play(lines[i].t)} aria-label={`Play ${mmss(lines[i].t)}`}
                        className="inline-flex shrink-0 items-center gap-0.5 tabular-nums text-hec-brass hover:underline">
                        <Play className="h-3 w-3" aria-hidden />{mmss(lines[i].t)}
                      </button>
                    ) : <span className="shrink-0 tabular-nums text-hec-ink-soft">{mmss(lines[i].t)}</span>}
                    <span className="min-w-0 break-words">{lines[i].text}</span>
                  </li>
                ))}
              </ul>
              {tapped && !done && <p className="text-hec-caption text-hec-ink-faint">{VOICE_WORDING.tapped} ({nameOf(tapped)})</p>}
              {done ? (
                <Button type="button" variant="outline" size="sm" disabled={busy === g.group_key} onClick={() => void answer(g.group_key, null)}>
                  <Undo2 className="h-4 w-4 mr-1" aria-hidden /> Change
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {busy === g.group_key && <Loader2 className="h-4 w-4 animate-spin text-hec-ink-soft" aria-label="Saving" />}
                  {hint && (
                    <Button type="button" size="sm" disabled={!!busy} onClick={() => void answer(g.group_key, "child", hint)}>
                      Yes, {nameOf(hint)}
                    </Button>
                  )}
                  <label className="inline-flex items-center gap-1 text-hec-small text-hec-ink">
                    <span className="sr-only">Another child</span>
                    <select className="min-h-9 rounded-hec-sm border border-hec-line bg-hec-surface px-2 text-hec-small"
                      value="" disabled={!!busy} onChange={(e) => e.target.value && void answer(g.group_key, "child", e.target.value)}>
                      <option value="">{hint ? "Another child…" : "Which child…"}</option>
                      {kids.filter((k) => k.id !== hint).map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                  </label>
                  <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => void answer(g.group_key, "several")}>{VOICE_WORDING.several}</Button>
                  <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => void answer(g.group_key, "teacher")}>{VOICE_WORDING.teacher}</Button>
                  <Button type="button" variant="ghost" size="sm" disabled={!!busy} onClick={() => void answer(g.group_key, "unknown")}>{VOICE_WORDING.unknown}</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
