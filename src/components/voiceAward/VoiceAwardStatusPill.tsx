/**
 * A small always-visible pill while the voice assistant is on (owner, 27 Nov
 * 2026): the mic state, so a teacher never wonders whether it is listening.
 * Click opens the classroom tools on the Voice points card. Fixed bottom-left,
 * clear of the tools button (bottom-right) and the card (bottom-centre).
 */
import { Mic } from "lucide-react";
import { useVoiceAward, useVoiceLevel } from "@/contexts/VoiceAwardContext";

const LABEL: Record<string, string> = {
  loading: "Starting…",
  listening: "Listening for HEC",
  recording: "Listening to you",
  checking: "Checking…",
  asking: "Thinking…",
  card: "Awaiting you",
  saving: "Saving…",
  paused: "Paused",
  error: "Mic problem",
};

export function VoiceAwardStatusPill() {
  const { phase, openTool } = useVoiceAward();
  const level = useVoiceLevel();
  if (phase === "off") return null;
  const hot = phase === "recording";
  const bad = phase === "error";
  return (
    <button
      type="button"
      onClick={openTool}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={`Voice points: ${LABEL[phase] ?? phase}. Open the classroom tools.`}
      className="fixed bottom-4 left-4 z-40 inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold shadow-lg md:bottom-6 md:left-6"
      style={{
        background: bad ? "#7f1d1d" : "#14102B",
        color: "#FAF9FD",
        borderColor: hot ? "#25DCCB" : "rgba(255,255,255,.25)",
      }}
    >
      <span className="relative grid h-5 w-5 place-items-center">
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: hot ? "#25DCCB" : "#4FB783", opacity: 0.25 + level * 0.75, transform: `scale(${1 + level * 0.6})` }}
        />
        <Mic className="relative h-3.5 w-3.5" aria-hidden />
      </span>
      {LABEL[phase] ?? phase}
    </button>
  );
}
