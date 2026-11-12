import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Wallet,
  BadgePercent
} from "lucide-react";
import { motion } from "framer-motion";
import { useIvory } from "@/hooks/useIvory";

interface TuitionStats {
  totalStudents: number;
  settledCount: number;
  overpaidCount: number;
  underpaidCount: number;
  unpaidCount: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  discountStudents: number;
  siblingStudents: number;
}

interface TuitionSummaryCardsProps {
  stats: TuitionStats | null;
  isLoading?: boolean;
}

const formatVND = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
};

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  color,
  delay = 0 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string;
  color: string;
  delay?: number;
}) => {
  const ivory = useIvory();
  if (ivory) {
    // Ivory: a solid card, no decorative blob, no coloured tile, no entry
    // motion; the count is sans and tabular. The icon keeps its meaning in ink.
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-hec-small font-medium text-hec-ink-soft">{label}</p>
              <p className="font-sans text-hec-h2 font-semibold tabular-nums text-hec-ink">{value}</p>
              {subValue && (
                <p className="text-hec-caption text-hec-ink-soft">{subValue}</p>
              )}
            </div>
            <Icon className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-card to-card/80">
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 ${color}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
  );
};

export function TuitionSummaryCards({ stats, isLoading }: TuitionSummaryCardsProps) {
  const ivory = useIvory();
  // Guard against a null stats object (query still loading, or errored) —
  // the cards below dereference stats.* and would otherwise crash the tab.
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className={ivory ? "p-4 sm:p-6" : "p-5"}>
              <div className={ivory ? "h-20 rounded-hec-md bg-hec-sunken" : "h-20 bg-muted rounded"} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.totalStudents}
          subValue={`${stats.discountStudents} with discounts`}
          color="bg-blue-500"
          delay={0}
        />
        <StatCard
          icon={CheckCircle2}
          label="Fully Paid"
          value={stats.settledCount + stats.overpaidCount}
          subValue={`${stats.overpaidCount} overpaid`}
          color="bg-emerald-500"
          delay={0.05}
        />
        <StatCard
          icon={AlertCircle}
          label="Outstanding"
          value={stats.underpaidCount + stats.unpaidCount}
          subValue={`${stats.unpaidCount} unpaid`}
          color="bg-amber-500"
          delay={0.1}
        />
        <StatCard
          icon={BadgePercent}
          label="Sibling Discounts"
          value={stats.siblingStudents}
          subValue="Active sibling rates"
          color="bg-blue-500"
          delay={0.15}
        />
      </div>

      {/* Financial Overview Row */}
      {ivory ? (
        // Ivory: Total Billed is the one total of this card - the largest
        // figure, under the 2 px ink rule. Every amount is ink, sans and
        // tabular; the icon and the word carry the state, not the colour.
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-6 md:grid-cols-4">
              {/* Total Billed */}
              <div className="min-w-0 space-y-1 border-t-2 border-hec-ink pt-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden="true" />
                  <span className="text-hec-small font-semibold text-hec-ink">Total Billed</span>
                </div>
                <p className="whitespace-nowrap font-sans text-hec-h1 font-semibold tabular-nums text-hec-ink">{formatVND(stats.totalBilled)}</p>
              </div>

              {/* Collected */}
              <div className="min-w-0 space-y-1 pt-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-hec-leaf" aria-hidden="true" />
                  <span className="text-hec-small font-medium text-hec-ink-soft">Collected</span>
                </div>
                <p className="whitespace-nowrap font-sans text-hec-h3 font-medium tabular-nums text-hec-ink">{formatVND(stats.totalCollected)}</p>
              </div>

              {/* Outstanding */}
              <div className="min-w-0 space-y-1 pt-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-hec-warn" aria-hidden="true" />
                  <span className="text-hec-small font-medium text-hec-ink-soft">Outstanding</span>
                </div>
                <p className="whitespace-nowrap font-sans text-hec-h3 font-medium tabular-nums text-hec-ink">{formatVND(stats.totalOutstanding)}</p>
              </div>

              {/* Collection Rate */}
              <div className="min-w-0 space-y-2 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <TrendingUp className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden="true" />
                    <span className="text-hec-small font-medium text-hec-ink-soft">Collection Rate</span>
                  </div>
                  <span className="shrink-0 font-sans text-hec-small font-semibold tabular-nums text-hec-ink">{stats.collectionRate.toFixed(1)}%</span>
                </div>
                <Progress
                  value={stats.collectionRate}
                  className="h-2 bg-hec-sunken [&>div]:bg-hec-brass"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="border-0 shadow-md">
          <CardContent className="p-5">
            <div className="grid gap-6 md:grid-cols-4">
              {/* Total Billed */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Total Billed</span>
                </div>
                <p className="text-xl font-bold">{formatVND(stats.totalBilled)}</p>
              </div>

              {/* Collected */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-muted-foreground">Collected</span>
                </div>
                <p className="text-xl font-bold text-emerald-600">{formatVND(stats.totalCollected)}</p>
              </div>

              {/* Outstanding */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-muted-foreground">Outstanding</span>
                </div>
                <p className="text-xl font-bold text-amber-600">{formatVND(stats.totalOutstanding)}</p>
              </div>

              {/* Collection Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Collection Rate</span>
                  </div>
                  <span className="text-sm font-bold">{stats.collectionRate.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={stats.collectionRate} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      )}
    </div>
  );
}
