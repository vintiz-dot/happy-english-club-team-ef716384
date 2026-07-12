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
  stats: TuitionStats;
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
}) => (
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

export function TuitionSummaryCards({ stats, isLoading }: TuitionSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5">
              <div className="h-20 bg-muted rounded" />
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
    </div>
  );
}
