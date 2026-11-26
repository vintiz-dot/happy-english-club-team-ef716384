/**
 * The floating card of the voice points assistant (owner, 27 Nov 2026).
 *
 * Bottom-centre, big enough to read from the back of a classroom or off a
 * projector: what was heard, "Potato +30 Writing", and either a ring counting
 * down the 3-second cancel window (a sure command) or the reason it is unsure
 * and a Confirm button (an unsure one). It is a portal and never takes focus:
 * the teacher keeps typing or clicking where they were.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Mic, X } from "lucide-react";
import { useVoiceAward } from "@/contexts/VoiceAwardContext";
import { cardTitle, signed, skillLabel } from "@/lib/voiceAward/flow";

const INDIGO = "#1E3B8A";
const INDIGO_DEEP = "#14102B";
const TEAL = "#25DCCB";
const AMBER = "#FFC83D";
const CORAL = "#FF9D6E";
const PAPER = "#FAF9FD";

const R = 26;
const CIRC = 2 * Math.PI * R;

function useSecondsLeft(startedAt: number, ms: number, active: boolean): number {
  const [left, setLeft] = useState(Math.ceil(ms / 1000));
  useEffect(() => {
    if (!active) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((startedAt + ms - Date.now()) / 1000)));
    tick();
    const t = window.setInterval(tick, 200);
    return () => window.clearInterval(t);
  }, [startedAt, ms, active]);
  return left;
}

export function VoiceAwardCard() {
  const { card, confirm, cancel } = useVoiceAward();
  const counting = card?.mode === "counting";
  const left = useSecondsLeft(card?.startedAt ?? 0, card?.cancelMs ?? 0, !!card && counting);
  if (!card || typeof document === "undefined") return null;
  const a = card.award;
  const plus = a.points > 0;
  const accent = plus ? TEAL : CORAL;

  return createPortal(
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={cardTitle(a)}
      // Never steal focus: clicking the card keeps the page's selection and typing.
      onMouseDown={(e) => e.preventDefault()}
      style={{ background: INDIGO_DEEP, color: PAPER, borderColor: counting ? accent : AMBER }}
      className="fixed bottom-6 left-1/2 z-[9999] flex w-[min(92vw,44rem)] -translate-x-1/2 items-center gap-5 rounded-3xl border-2 px-6 py-5 shadow-2xl"
    >
      <div className="relative grid h-16 w-16 shrink-0 place-items-center" aria-hidden>
        {counting ? (
          <>
            <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
              <circle cx="32" cy="32" r={R} fill="none" stroke={INDIGO} strokeWidth="6" />
              <circle
                key={card.startedAt}
                cx="32"
                cy="32"
                r={R}
                fill="none"
                stroke={accent}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={0}
                style={{ animation: `voice-award-ring ${card.cancelMs}ms linear forwards` }}
              />
            </svg>
            <span className="text-2xl font-bold tabular-nums">{left}</span>
          </>
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full" style={{ background: AMBER, color: INDIGO_DEEP }}>
            <Mic className="h-7 w-7" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm opacity-70">
          {a.heard ? <>I heard: &ldquo;{a.heard}&rdquo;</> : "I heard a command"}
        </p>
        <p className="truncate text-3xl font-bold leading-tight sm:text-4xl">
          {a.studentName} <span style={{ color: accent }}>{signed(a.points)}</span>{" "}
          <span className="text-2xl font-semibold opacity-90">{skillLabel(a.skill)}</span>
        </p>
        {counting ? (
          <p className="mt-1 text-sm opacity-80">Saving in {left} s. Tap Cancel, or say &ldquo;HEC cancel&rdquo;, to stop it.</p>
        ) : (
          <p className="mt-1 text-sm" style={{ color: AMBER }}>
            {a.reason ?? "I am not sure I heard that right."} Say &ldquo;HEC yes&rdquo; or tap Confirm.
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={cancel}
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-white/30 px-5 text-base font-semibold hover:bg-white/10"
        >
          <X className="h-5 w-5" aria-hidden /> Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full px-5 text-base font-bold"
          style={{ background: counting ? "transparent" : accent, color: counting ? PAPER : INDIGO_DEEP, border: counting ? "1px solid rgba(255,255,255,.3)" : "none" }}
        >
          <Check className="h-5 w-5" aria-hidden /> {counting ? "Save now" : "Confirm"}
        </button>
      </div>

      <style>{`
        @keyframes voice-award-ring { from { stroke-dashoffset: 0; } to { stroke-dashoffset: ${CIRC}; } }
        @media (prefers-reduced-motion: reduce) { [aria-label][role="alertdialog"] svg circle:last-child { animation: none !important; } }
      `}</style>
    </div>,
    document.body,
  );
}
