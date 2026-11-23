/**
 * A child's speaking journey across their approved videos: how the grades
 * are moving, and the things that keep coming up (a knowledge gap is
 * something seen in two or more of the last five videos, not one slip).
 * Encouraging wording; no ranking against anyone else.
 */
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dayjs } from "@/lib/date";
import { videoDb } from "@/lib/video/recorder";
import { gradeForScore, summarizeProgress, type ProgressVideo } from "@/lib/videoHomework";
import { BiText } from "@/components/student/walls/BiText";
import { Emoji } from "@/components/student/walls/Emoji";
import { useWallBand } from "@/components/student/walls/useWallBand";
import { wallsCopy } from "@/lib/copy/studentWalls";

const TREND = {
  up: { icon: TrendingUp, text: "You're getting better and better!", emoji: " 🚀", tone: "text-hec-leaf" },
  steady: { icon: Minus, text: "Nice and steady - keep it up!", emoji: " 👍", tone: "text-hec-ink-soft" },
  down: { icon: TrendingDown, text: "Let's practise a little more together", emoji: " 💪", tone: "text-hec-warn" },
} as const;

const TYPE_EMOJI: Record<string, string> = { grammar: "🧩", vocabulary: "📚", pronunciation: "🗣️", syntax: "🧱", other: "✏️" };

export function VideoProgressCard({ studentId }: { studentId: string }) {
  const { teen } = useWallBand();
  const { data, isError, isLoading } = useQuery({
    queryKey: ["video-progress", studentId],
    queryFn: async () => {
      const { data, error } = await videoDb.rpc("get_video_progress", { p_student: studentId });
      if (error) throw error;
      return (data?.videos ?? []) as ProgressVideo[];
    },
    enabled: !!studentId,
    retry: false,
  });
  if (isLoading) return null;
  const shell = "space-y-4 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6";
  if (isError || !data || data.length === 0) {
    return (
      <section className={shell}>
        <h2 className="break-words font-display text-hec-h3 font-medium text-hec-ink"><Emoji>🎥 </Emoji><BiText entry={wallsCopy["videos.journey"]} /></h2>
        <p className="break-words text-hec-body text-hec-ink-soft">
          <BiText entry={isError ? wallsCopy["videos.journeyError"] : wallsCopy["videos.journeyEmpty"]} />
        </p>
      </section>
    );
  }

  const p = summarizeProgress(data);
  const trend = p.trend ? TREND[p.trend] : null;
  const practise = [...p.recurring.map((r) => ({ ...r, recurring: true })), ...p.recent.map((r) => ({ ...r, recurring: false, times: 1 }))].slice(0, 5);

  return (
    <section className={shell}>
      <div className="space-y-1">
        <h2 className="break-words font-display text-hec-h3 font-medium text-hec-ink"><Emoji>🎥 </Emoji><BiText entry={wallsCopy["videos.journey"]} /></h2>
        <p className="break-words text-hec-small text-hec-ink-soft">{p.count} video{p.count === 1 ? "" : "s"} checked by your teacher</p>
      </div>
      <div className="space-y-4">
        {trend && (
          <p className={`flex items-center gap-2 text-hec-body font-medium ${trend.tone}`}>
            <trend.icon className="h-4 w-4 shrink-0" /> <span className="min-w-0 break-words">{trend.text}<Emoji>{trend.emoji}</Emoji></span>
          </p>
        )}

        <div className="space-y-1.5">
          {p.scores.slice(-5).reverse().map((s) => (
            <div key={`${s.date}-${s.title}`} className="flex items-start justify-between gap-2 text-hec-body text-hec-ink">
              <span className="min-w-0 break-words">{s.title}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-hec-caption tabular-nums text-hec-ink-soft">{dayjs(s.date).format(teen ? "D MMM YYYY" : "MMM D")}</span>
                <Badge variant="secondary">{gradeForScore(s.score)}</Badge>
              </span>
            </div>
          ))}
        </div>

        {practise.length > 0 && (
          <div className="space-y-2 border-t border-hec-line pt-3">
            <p className="flex items-center gap-1.5 text-hec-small font-medium text-hec-ink-soft">
              <Target className="h-3.5 w-3.5" /> Things to practise
            </p>
            {practise.map((g) => (
              <div key={g.topic} className="rounded-hec-md bg-hec-sunken p-3 text-hec-body text-hec-ink">
                <div className="flex items-center gap-1.5">
                  <Emoji>{TYPE_EMOJI[g.type] ?? "✏️"}</Emoji>
                  <span className="min-w-0 break-words font-medium">{g.topic}</span>
                  {g.recurring && <Badge variant="outline" className="ml-auto shrink-0">came up {g.times}×</Badge>}
                </div>
                {g.fix && g.example && g.fix !== g.topic && (
                  <p className="mt-0.5 text-hec-small text-hec-ink-soft">
                    “{g.example}” → <span className="text-hec-ink">“{g.fix}”</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
