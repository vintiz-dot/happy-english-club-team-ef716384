/**
 * CefrGrowthChart — the student's language trajectory over time.
 *
 * Plots every CEFR assessment point (transcript analysis, AI reports,
 * exams, manual teacher assessments) on a continuous scale with CEFR level
 * bands, so growth between levels is visible — not just level jumps.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2 } from "lucide-react";

const LEVELS = ["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const SCORE_TO_LEVEL = (score: number) => LEVELS[Math.round(Math.min(Math.max(score, 0), 6))] ?? "—";

const SOURCE_LABEL: Record<string, string> = {
  transcript: "Transcript analysis",
  ai_report: "AI report",
  manual: "Teacher assessment",
  vocab_analysis: "Vocabulary analysis",
  exam: "Exam",
};

interface Props {
  studentId: string;
  compact?: boolean;
}

export function CefrGrowthChart({ studentId, compact = false }: Props) {
  const { data: points = [], isLoading } = useQuery<any[]>({
    queryKey: ["cefr-growth", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cefr_assessments")
        .select("level, level_score, source, assessed_at, confidence")
        .eq("student_id", studentId)
        .order("assessed_at", { ascending: true });
      return data || [];
    },
  });

  const chartData = points.map((p) => ({
    date: p.assessed_at,
    score: Number(p.level_score),
    level: p.level,
    source: p.source,
  }));

  const latest = points[points.length - 1];
  const first = points[0];
  const delta = latest && first ? Number(latest.level_score) - Number(first.level_score) : 0;

  return (
    <Card>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              CEFR Growth
            </CardTitle>
            {!compact && (
              <CardDescription className="text-xs mt-1">
                Every data point is an assessment from transcripts, reports or exams.
              </CardDescription>
            )}
          </div>
          {latest && (
            <div className="text-right">
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-sm">
                {latest.level}
              </Badge>
              {delta > 0 && (
                <p className="text-[10px] text-emerald-600 mt-1">
                  ▲ {delta.toFixed(1)} level{delta >= 2 ? "s" : ""} since {first.assessed_at}
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground text-center px-6">
            No assessments yet — upload a class transcript or generate an AI report to start the trajectory.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={compact ? 180 : 260}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="cefrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(d: string) => d?.slice(5)}
              />
              <YAxis
                domain={[0, 6]}
                ticks={[0, 1, 2, 3, 4, 5, 6]}
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => LEVELS[v] ?? ""}
              />
              {[1, 2, 3, 4, 5].map((v) => (
                <ReferenceLine key={v} y={v} className="stroke-muted" strokeDasharray="2 4" strokeOpacity={0.4} />
              ))}
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p: any = payload[0].payload;
                  return (
                    <div className="rounded-xl border bg-popover px-3 py-2 shadow-md text-xs">
                      <p className="font-bold">{p.level} <span className="font-normal text-muted-foreground">({SCORE_TO_LEVEL(p.score)} band)</span></p>
                      <p className="text-muted-foreground">{p.date}</p>
                      <p className="text-muted-foreground">{SOURCE_LABEL[p.source] || p.source}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(160 84% 39%)"
                strokeWidth={2.5}
                fill="url(#cefrFill)"
                dot={{ r: 3.5, strokeWidth: 2, fill: "hsl(var(--background))" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
