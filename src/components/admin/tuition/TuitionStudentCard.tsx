import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Eye, 
  CreditCard, 
  ChevronDown,
  Award,
  Percent,
  Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPaymentStatus, getTuitionStatusBadge, PaymentStatus } from "@/lib/tuitionStatus";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InvoiceDownloadButton } from "@/components/invoice/InvoiceDownloadButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatars";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TuitionStudentCardProps {
  item: any;
  month: string;
  onRecordPay: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (studentId: string) => void;
}

const fmt = (n: number) => n.toLocaleString("vi-VN") + " ₫";

export function TuitionStudentCard({
  item,
  month,
  onRecordPay,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}: TuitionStudentCardProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const status = getPaymentStatus({
    carryOutDebt: item.carry_out_debt ?? 0,
    carryOutCredit: item.carry_out_credit ?? 0,
    totalAmount: item.total_amount ?? 0,
    monthPayments: item.recorded_payment ?? 0,
    settledInMonth: item.settled_in_month,
  });

  const studentName = (item.students as any)?.full_name ?? "—";
  const classNames = (item as any).classes?.map((c: any) => c.name).join(", ") || "No class";
  const balance = item.balance ?? 0;
  const priorNet = (item.carry_in_debt || 0) - (item.carry_in_credit || 0);

  const borderColor: Record<string, string> = {
    overpaid: 'border-l-blue-500',
    settled: 'border-l-emerald-500',
    underpaid: 'border-l-amber-500',
    unpaid: 'border-l-destructive',
    open: 'border-l-muted-foreground',
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* Ivory: a plain card with a hairline - the status badge (icon + word)
          says the state, not a coloured edge; selected is the brass edge. */}
      <div className={`overflow-hidden rounded-hec-lg border bg-hec-surface shadow-hec-1 ${isSelected ? "border-hec-brass ring-1 ring-hec-brass" : "border-hec-line"}`}>
        {/* Clickable header */}
        <CollapsibleTrigger asChild>
          <button className="flex min-h-hec-target w-full items-start gap-3 p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-hec-ring">
            {selectionMode && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(e) => {
                  e; // prevent collapsible toggle
                  onToggleSelect?.(item.student_id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0"
              />
            )}

            {/* Avatar */}
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage 
                src={getAvatarUrl((item.students as any)?.avatar_url) || undefined} 
                alt={studentName}
                className="object-cover"
              />
              <AvatarFallback className="bg-hec-sunken text-hec-caption font-medium text-hec-ink-soft">
                {studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name + class + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-semibold text-hec-ink">{studentName}</span>
                {(item.students as any)?.is_active === false && (
                  <Badge
                    variant="secondary"
                    className=""
                    title="No longer enrolled — shown because they were active during this month"
                  >
                    Inactive
                  </Badge>
                )}
                {getTuitionStatusBadge(status, item.settled_in_month)}
                {item.hasDiscount && (
                  <Badge variant="secondary" className="">
                    <Percent className="h-2.5 w-2.5" /> Disc
                  </Badge>
                )}
                {item.hasSiblings && (
                  <Badge variant="secondary" className="">
                    <Award className="h-2.5 w-2.5" /> Sib
                  </Badge>
                )}
              </div>
              <p className="mt-1 whitespace-normal break-words text-hec-small text-hec-ink-soft">{classNames}</p>
            </div>

            {/* Balance + chevron */}
            <div className="text-right shrink-0">
              <p className={`whitespace-nowrap font-sans text-hec-body font-semibold tabular-nums ${balance === 0 ? "text-hec-ink-soft" : "text-hec-ink"}`}>
                {balance > 0 ? fmt(balance) : balance < 0 ? `+${fmt(Math.abs(balance))}` : "Settled"}
              </p>
              <p className="text-hec-caption text-hec-ink-soft">Balance</p>
            </div>
            <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-hec-ink-soft transition-transform duration-hec-1 ease-hec ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>

        {/* Expanded finance breakdown */}
        <CollapsibleContent>
          <div className="space-y-4 border-t border-hec-line p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
              <FinanceCell label="Base" value={fmt(item.base_amount)} />
              <FinanceCell label="Discount" value={item.discount_amount > 0 ? `−${fmt(item.discount_amount)}` : "—"} accent={item.discount_amount > 0 ? "green" : undefined} />
              <FinanceCell label="Prior Bal." value={priorNet === 0 ? "—" : priorNet > 0 ? fmt(priorNet) : `+${fmt(Math.abs(priorNet))}`} accent={priorNet > 0 ? "red" : priorNet < 0 ? "green" : undefined} />
              <FinanceCell label="Payable" value={fmt(item.finalPayable)} bold />
              <FinanceCell label="Paid" value={fmt(item.recorded_payment ?? 0)} accent="blue" />
              <FinanceCell total label="Balance" value={balance > 0 ? fmt(balance) : balance < 0 ? `+${fmt(Math.abs(balance))}` : "0 ₫"} accent={balance > 0 ? "red" : balance < 0 ? "green" : undefined} bold />
            </div>

            {/* Smart Tuition Flags */}
            <TuitionFlags item={item} />

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onRecordPay} className="flex-1 sm:flex-none gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Record Pay
              </Button>
              <InvoiceDownloadButton 
                studentId={item.student_id} 
                month={month}
                variant="outline"
                size="sm"
              />
              <Button size="sm" variant="outline" onClick={() => navigate(`/students/${item.student_id}`)} className="gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                View
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function FinanceCell({ label, value, accent, bold, total }: { label: string; value: string; accent?: "green" | "red" | "blue"; bold?: boolean; total?: boolean }) {
  return (
    <div className={`min-w-0 ${total ? "border-t-2 border-hec-ink pt-2" : "pt-2"}`}>
      <p className="text-hec-caption uppercase tracking-wider text-hec-ink-soft">{label}</p>
      <p className={`whitespace-nowrap font-sans tabular-nums text-hec-ink ${total ? "text-hec-h3 font-semibold" : bold ? "text-hec-small font-semibold" : "text-hec-small"}`}>{value}</p>
    </div>
  );
}

function TuitionFlags({ item }: { item: any }) {
  const flags: { label: string; detail: string; color: "green" | "orange" | "blue" }[] = [];
  
  // Check discount
  if (item.discount_amount > 0) {
    flags.push({
      label: `Discount: −${fmt(item.discount_amount)}`,
      detail: item.discountReasons?.join(", ") || "Enrollment or student discount applied",
      color: "green",
    });
  }

  // Check review_flags from invoice
  const reviewFlags = item.review_flags as any[] | null;
  if (reviewFlags && reviewFlags.length > 0) {
    for (const flag of reviewFlags) {
      if (flag.type === "tuition_adjustment") {
        const diff = flag.details?.difference;
        if (diff && diff !== 0) {
          flags.push({
            label: `Adjusted: ${diff > 0 ? "−" : "+"}${fmt(Math.abs(diff))}`,
            detail: flag.details?.reasons?.join(", ") || "Rate adjustment or cancelled sessions",
            color: diff > 0 ? "green" : "orange",
          });
        }
      }
    }
  }

  // Check carry-in credit
  const carryInCredit = item.carry_in_credit ?? 0;
  if (carryInCredit > 0) {
    flags.push({
      label: `Prior credit: +${fmt(carryInCredit)}`,
      detail: "Credit carried forward from previous month",
      color: "green",
    });
  }

  // Check carry-in debt
  const carryInDebt = item.carry_in_debt ?? 0;
  if (carryInDebt > 0) {
    flags.push({
      label: `Prior debt: ${fmt(carryInDebt)}`,
      detail: "Unpaid balance from previous month",
      color: "orange",
    });
  }

  // Check class breakdown for cancelled/excused sessions
  const classBreakdown = item.class_breakdown as any[] | null;
  if (classBreakdown) {
    for (const cb of classBreakdown) {
      if (cb.cancelled_count && cb.cancelled_count > 0) {
        flags.push({
          label: `${cb.class_name}: ${cb.cancelled_count} cancelled`,
          detail: `Sessions cancelled in ${cb.class_name}`,
          color: "green",
        });
      }
    }
  }

  if (flags.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1.5">
        {flags.map((flag, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Badge
                variant={(flag.color === "orange" ? "warning" : "secondary")}
                className="cursor-help"
              >
                <Info className="h-3.5 w-3.5" />
                {flag.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[200px] text-hec-caption">{flag.detail}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
