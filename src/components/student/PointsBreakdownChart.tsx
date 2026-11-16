import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PointsBreakdownChartProps {
  studentId: string;
  classId?: string;
}

export function PointsBreakdownChart({ studentId, classId }: PointsBreakdownChartProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Fetch point transactions for the selected month
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["point-breakdown", studentId, classId, selectedMonth],
    queryFn: async () => {
      let query = supabase
        .from("point_transactions")
        .select("*")
        .eq("student_id", studentId)
        .eq("month", selectedMonth)
        .order("date", { ascending: true });

      if (classId) {
        query = query.eq("class_id", classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Get available months
  const { data: availableMonths } = useQuery({
    queryKey: ["available-months", studentId, classId],
    queryFn: async () => {
      let query = supabase
        .from("point_transactions")
        .select("month")
        .eq("student_id", studentId);

      if (classId) {
        query = query.eq("class_id", classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const uniqueMonths = [...new Set(data?.map(t => t.month))].sort().reverse();
      return uniqueMonths;
    },
  });

  // Process data for cumulative chart
  const cumulativeData = transactions?.reduce((acc, transaction) => {
    const lastTotal = acc.length > 0 ? acc[acc.length - 1].total : 0;
    acc.push({
      date: format(parseISO(transaction.date), "MMM d"),
      points: transaction.points,
      total: lastTotal + transaction.points,
      type: transaction.type,
    });
    return acc;
  }, [] as any[]) || [];

  // Process data for type breakdown
  const typeBreakdown = transactions?.reduce((acc, transaction) => {
    const existing = acc.find((item: any) => item.type === transaction.type);
    if (existing) {
      existing.points += transaction.points;
      existing.count += 1;
    } else {
      acc.push({
        type: transaction.type,
        points: transaction.points,
        count: 1,
      });
    }
    return acc;
  }, [] as any[]) || [];

  const totalPoints = transactions?.reduce((sum, t) => sum + t.points, 0) || 0;

  const chartConfig = {
    homework: {
      label: "Homework",
      color: "hsl(var(--chart-1))",
    },
    participation: {
      label: "Participation",
      color: "hsl(var(--chart-2))",
    },
    bonus: {
      label: "Bonus",
      color: "hsl(var(--chart-3))",
    },
    penalty: {
      label: "Penalty",
      color: "hsl(var(--chart-4))",
    },
    total: {
      label: "Total Points",
      color: "hsl(var(--primary))",
    },
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">
            Points Breakdown {classId ? '(This Class)' : '(All Classes)'}
          </h3>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]" aria-label="Month">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths?.map((month) => (
              <SelectItem key={month} value={month}>
                {format(parseISO(`${month}-01`), "MMMM yyyy")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Points</CardDescription>
            <CardTitle className="font-sans text-3xl tabular-nums">{totalPoints}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {transactions?.length || 0} transactions
            </p>
          </CardContent>
        </Card>

        {typeBreakdown.slice(0, 2).map((item) => (
          <Card key={item.type}>
            <CardHeader className="pb-2">
              <CardDescription className="capitalize">{item.type}</CardDescription>
              <CardTitle className="font-sans text-3xl tabular-nums">{item.points}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {item.count} {item.count === 1 ? 'transaction' : 'transactions'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {cumulativeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Points Over Time</CardTitle>
            <CardDescription>
              Cumulative points earned throughout {format(parseISO(`${selectedMonth}-01`), "MMMM yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {typeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Points by Type</CardTitle>
            <CardDescription>
              Breakdown of points earned by activity type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="type" 
                    className="text-xs capitalize"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="points" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {transactions?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No points earned yet for {format(parseISO(`${selectedMonth}-01`), "MMMM yyyy")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
