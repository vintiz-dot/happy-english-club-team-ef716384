import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Wallet,
  BadgePercent,
  ChevronRight
} from "lucide-react";
import { formatVND } from "@/lib/money";

interface TuitionStats {
  totalStudents: number;
  settledCount: number;
  overpaidCount: number;
  underpaidCount: number;
  unpaidCount: number;
  totalBilled: number;
  /** This month's own charges, summed: before any debt or credit carried in. */
  monthCharges: number;
  /** Debt carried in from earlier months, and how many students owe it. */
  carryInDebt: number;
  carryDebtStudents: number;
  /** Credit carried in from earlier months, and how many students hold it. */
  carryInCredit: number;
  carryCreditStudents: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  discountStudents: number;
  siblingStudents: number;
}

interface TuitionSummaryCardsProps {
  stats: TuitionStats | null;
  isLoading?: boolean;
  /** Shows (or hides again) the students who have a balance carried in. */
  onShowCarriedOver?: () => void;
  carriedOverActive?: boolean;
}


const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string;
}) => {
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
};

export function TuitionSummaryCards({ stats, isLoading, onShowCarriedOver, carriedOverActive }: TuitionSummaryCardsProps) {
  // Guard against a null stats object (query still loading, or errored) —
  // the cards below dereference stats.* and would otherwise crash the tab.
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 sm:p-6">
              <div className="h-20 rounded-hec-md bg-hec-sunken" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Students whose bill carries a balance in: unpaid debt or credit.
  const carriedCount = stats.carryDebtStudents + stats.carryCreditStudents;

  return (
    <div className="space-y-4">
      {/* Primary Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.totalStudents}
          subValue={`${stats.discountStudents} with discounts`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Fully Paid"
          value={stats.settledCount + stats.overpaidCount}
          subValue={`${stats.overpaidCount} overpaid`}
        />
        <StatCard
          icon={AlertCircle}
          label="Outstanding"
          value={stats.underpaidCount + stats.unpaidCount}
          subValue={`${stats.unpaidCount} unpaid`}
        />
        <StatCard
          icon={BadgePercent}
          label="Sibling Discounts"
          value={stats.siblingStudents}
          subValue="Active sibling rates"
        />
      </div>

      {/* Financial Overview Row */}
      {(
        // Ivory: this month's bill is the one total of this card - the largest
        // figure, under the 2 px ink rule. Every amount is ink, sans and
        // tabular; the icon and the word carry the state, not the colour.
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))]">
              {/* This month's bill, what is carried over, then what is payable */}
              <div className="min-w-0 space-y-3 border-t-2 border-hec-ink pt-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden="true" />
                    <span className="text-hec-small font-semibold text-hec-ink">This month's bill</span>
                  </div>
                  <p className="whitespace-nowrap font-sans text-hec-h1 font-semibold tabular-nums text-hec-ink">{formatVND(stats.monthCharges)}</p>
                  <p className="text-hec-caption text-hec-ink-soft">Charged for this month's lessons, before any carry-over</p>
                </div>

                {carriedCount > 0 ? (
                  <button
                    type="button"
                    onClick={onShowCarriedOver}
                    aria-pressed={!!carriedOverActive}
                    className={`flex min-h-hec-target w-full items-center justify-between gap-2 rounded-hec-md border px-3 py-2 text-left transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-hec-ring ${carriedOverActive ? "border-hec-brass bg-hec-sunken" : "border-hec-line"}`}
                  >
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-hec-small font-semibold text-hec-ink">Carried over</span>
                      {stats.carryInDebt > 0 && (
                        <span className="block text-hec-caption tabular-nums text-hec-ink-soft">
                          + {formatVND(stats.carryInDebt)} unpaid · {stats.carryDebtStudents} {stats.carryDebtStudents === 1 ? "student" : "students"}
                        </span>
                      )}
                      {stats.carryInCredit > 0 && (
                        <span className="block text-hec-caption tabular-nums text-hec-ink-soft">
                          − {formatVND(stats.carryInCredit)} credit · {stats.carryCreditStudents} {stats.carryCreditStudents === 1 ? "student" : "students"}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-hec-small font-medium text-hec-ink">
                      {carriedOverActive ? "Showing" : "View"}
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </button>
                ) : (
                  <p className="text-hec-caption text-hec-ink-soft">Nothing carried over from earlier months.</p>
                )}

                {/* It is carry.payable summed: this month's charges, plus the
                    debt and less the credit carried in. */}
                <div className="flex items-baseline justify-between gap-3 border-t border-hec-line pt-2">
                  <span className="text-hec-small font-medium text-hec-ink-soft">Payable incl. carry-over</span>
                  <span className="whitespace-nowrap font-sans text-hec-body font-semibold tabular-nums text-hec-ink">{formatVND(stats.totalBilled)}</span>
                </div>
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
                  aria-label="Collection rate"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
