/**
 * A child's speaking journey across their approved videos: how the grades
 * are moving, and the things that keep coming up (a knowledge gap is
 * something seen in two or more of the last five videos, not one slip).
 * Encouraging wording; no ranking against anyone else.
 */
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dayjs } from "@/lib/date";
import { videoDb } from "@/lib/video/recorder";
import { gradeForScore, summarizeProgress, type ProgressVideo } from "@/lib/videoHomework";

const TREND = {
  up: { icon: TrendingUp, text: "You're getting better and better! 🚀", tone: "text-emerald-600" },
  steady: { icon: Minus, text: "Nice and steady - keep it up! 👍", tone: "text-sky-600" },
  down: { icon: TrendingDown, text: "Let's practise a little more together 💪", tone: "text-amber-600" },
} as const;

const TYPE_EMOJI: Record<string, string> = { grammar: "🧩", vocabulary: "📚", pronunciation: "🗣️", syntax: "🧱", other: "✏️" };

export function VideoProgressCard({ studentId }: { studentId: string }) {
  const { data, isError } = useQuery({
    queryKey: ["video-progress", studentId],
    queryFn: async () => {
      const { data, error } = await videoDb.rpc("get_video_progress", { p_student: studentId });
      if (error) throw error;
      return (data?.videos ?? []) as ProgressVideo[];
    },
    enabled: !!studentId,
    retry: false,
  });
  if (isError || !data || data.length === 0) return null;

  const p = summarizeProgress(data);
  const trend = p.trend ? TREND[p.trend] : null;
  const practise = [...p.recurring.map((r) => ({ ...r, recurring: true })), ...p.recent.map((r) => ({ ...r, recurring: false, times: 1 }))].slice(0, 5);

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">🎥 My speaking journey</CardTitle>
        <CardDescription>{p.count} video{p.count === 1 ? "" : "s"} checked by your teacher</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {trend && (
          <p className={`flex items-center gap-2 text-sm font-medium ${trend.tone}`}>
            <trend.icon className="h-4 w-4" /> {trend.text}
          </p>
        )}

        <div className="space-y-1.5">
          {p.scores.slice(-5).reverse().map((s) => (
            <div key={`${s.date}-${s.title}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{s.title}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{dayjs(s.date).format("MMM D")}</span>
                <Badge variant="secondary">{gradeForScore(s.score)}</Badge>
              </span>
            </div>
          ))}
        </div>

        {practise.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" /> Things to practise
            </p>
            {practise.map((g) => (
              <div key={g.topic} className="rounded-lg bg-muted/40 p-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <span>{TYPE_EMOJI[g.type] ?? "✏️"}</span>
                  <span className="font-medium">{g.topic}</span>
                  {g.recurring && <Badge variant="outline" className="text-[10px] ml-auto">came up {g.times}×</Badge>}
                </div>
                {g.fix && g.example && g.fix !== g.topic && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    “{g.example}” → <span className="text-foreground">“{g.fix}”</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
