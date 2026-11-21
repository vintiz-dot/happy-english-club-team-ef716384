// Which of a class's lessons today a deck is being presented in. Imports nothing
// (scripts/pgtest/lesson-decks-lib.test.mjs loads it on its own).
//
// The lesson under way (from 30 minutes before it starts to 30 minutes after
// it ends) wins; otherwise the one whose start is nearest now, so a teacher
// opening the deck an hour early still marks the right lesson. Cancelled
// lessons are never picked.

export type TodaySession = { id: string; start_time: string; end_time: string; status?: string | null };

const minutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

export function pickSession(sessions: TodaySession[], nowHHMM: string): TodaySession | null {
  const now = minutes(nowHHMM);
  const live = sessions.filter((s) => s.status !== "Canceled");
  if (!live.length) return null;
  const during = live.find((s) => now >= minutes(s.start_time) - 30 && now <= minutes(s.end_time) + 30);
  if (during) return during;
  return [...live].sort((a, b) => Math.abs(minutes(a.start_time) - now) - Math.abs(minutes(b.start_time) - now))[0];
}
