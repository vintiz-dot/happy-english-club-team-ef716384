import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { BookOpen, Zap, Star, Clock, Award, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIvory } from "@/hooks/useIvory";

interface PointHistoryTabProps {
  studentId: string;
  classId: string;
  selectedMonth: string; // YYYY-MM format
}

const typeConfig: Record<string, { icon: typeof BookOpen; label: string; color: string }> = {
  homework: { icon: BookOpen, label: "Homework", color: "text-blue-500" },
  participation: { icon: Zap, label: "Participation", color: "text-amber-500" },
  reading_theory: { icon: GraduationCap, label: "Reading Theory", color: "text-teal-500" },
  bonus: { icon: Star, label: "Bonus", color: "text-blue-500" },
  attendance: { icon: Clock, label: "Attendance", color: "text-green-500" },
  manual: { icon: Award, label: "Manual", color: "text-primary" },
};
// Ivory: type is told by icon and word, so one quiet colour; brass only for the reward-like types.
const IVORY_COLOR: Record<string, string> = {
  homework: "text-hec-ink-soft",
  participation: "text-hec-brass",
  reading_theory: "text-hec-ink-soft",
  bonus: "text-hec-brass",
  attendance: "text-hec-leaf",
  manual: "text-hec-ink-soft",
};

export function PointHistoryTab({ studentId, classId, selectedMonth }: PointHistoryTabProps) {
  // Opened from the teacher/admin class board too (not migrated yet): old classes there.
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["point-history", studentId, classId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .eq("month", selectedMonth)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className={iv("text-center py-12 text-hec-ink-soft", "text-center py-12 text-muted-foreground")}>
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No point transactions this month</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-2">
        {transactions.map((tx) => {
          const config = typeConfig[tx.type] || typeConfig.manual;
          const Icon = config.icon;
          const isPositive = tx.points > 0;

          return (
            <div
              key={tx.id}
              className={iv("flex items-start gap-3 p-3 rounded-hec-md bg-hec-surface border border-hec-line transition-colors duration-hec-1", "flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors")}
            >
              <div className={`p-2 rounded-full ${iv("bg-hec-sunken", "bg-background")} ${ivory ? (IVORY_COLOR[tx.type] || IVORY_COLOR.manual) : config.color}`}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={iv("text-hec-caption", "text-xs")}>
                    {config.label}
                  </Badge>
                  {tx.homework_title && (
                    <span className={iv("text-hec-caption text-hec-ink-soft truncate", "text-xs text-muted-foreground truncate")}>
                      {tx.homework_title}
                    </span>
                  )}
                </div>
                {tx.notes && (
                  <p className={iv("text-hec-small text-hec-ink-soft mt-1 line-clamp-2", "text-sm text-muted-foreground mt-1 line-clamp-2")}>
                    {tx.notes}
                  </p>
                )}
                <p className={iv("text-hec-caption text-hec-ink-soft mt-1", "text-xs text-muted-foreground/70 mt-1")}>
                  {format(parseISO(tx.created_at), "MMM d, h:mm a")}
                </p>
              </div>

              <div
                className={`${iv("text-hec-h3 font-semibold tabular-nums shrink-0", "text-lg font-bold")} ${
                  isPositive ? iv("text-hec-leaf", "text-green-500") : iv("text-hec-danger", "text-red-500")
                }`}
              >
                {isPositive ? "+" : ""}
                {tx.points}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
