import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { BookOpen, Zap, Star, Clock, Award, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export function PointHistoryTab({ studentId, classId, selectedMonth }: PointHistoryTabProps) {
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
      <div className="text-center py-12 text-muted-foreground">
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
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-full bg-background ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                  {tx.homework_title && (
                    <span className="text-xs text-muted-foreground truncate">
                      {tx.homework_title}
                    </span>
                  )}
                </div>
                {tx.notes && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {tx.notes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {format(parseISO(tx.created_at), "MMM d, h:mm a")}
                </p>
              </div>

              <div
                className={`text-lg font-bold ${
                  isPositive ? "text-green-500" : "text-red-500"
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
