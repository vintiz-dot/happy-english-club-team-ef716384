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
import { useIvory } from "@/hooks/useIvory";

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
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);

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
      <div className={ivory
        ? `overflow-hidden rounded-hec-lg border bg-hec-surface shadow-hec-1 ${isSelected ? "border-hec-brass ring-1 ring-hec-brass" : "border-hec-line"}`
        : `border border-l-4 rounded-xl overflow-hidden bg-card transition-shadow hover:shadow-md ${borderColor[status] || ''} ${isSelected ? 'ring-2 ring-primary/50' : ''}`}>
        {/* Clickable header */}
        <CollapsibleTrigger asChild>
          <button className={iv("flex min-h-hec-target w-full items-start gap-3 p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-hec-ring", "w-full text-left p-3 sm:p-4 flex items-center gap-3")}>
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
            <Avatar className={iv("h-10 w-10 shrink-0", "h-9 w-9 ring-2 ring-background shadow-sm shrink-0")}>
              <AvatarImage 
                src={getAvatarUrl((item.students as any)?.avatar_url) || undefined} 
                alt={studentName}
                className="object-cover"
              />
              <AvatarFallback className={iv("bg-hec-sunken text-hec-caption font-medium text-hec-ink-soft", "bg-primary/10 text-primary font-medium text-xs")}>
                {studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name + class + badges */}
            <div className="flex-1 min-w-0">
              <div className={iv("flex flex-wrap items-center gap-2", "flex items-center gap-1.5 flex-wrap")}>
                <span className={iv("whitespace-normal break-words hyphens-none text-balance text-hec-body font-semibold text-hec-ink", "font-semibold text-sm truncate")}>{studentName}</span>
                {(item.students as any)?.is_active === false && (
                  <Badge
                    variant={ivory ? "secondary" : "outline"}
                    className={iv("", "text-[10px] px-1.5 py-0 border-muted-foreground/40 text-muted-foreground")}
                    title="No longer enrolled — shown because they were active during this month"
                  >
                    Inactive
                  </Badge>
                )}
                {getTuitionStatusBadge(status, item.settled_in_month)}
                {item.hasDiscount && (
                  <Badge variant={ivory ? "secondary" : "outline"} className={iv("", "text-[10px] px-1.5 py-0 gap-0.5 border-blue-300 text-blue-700")}>
                    <Percent className="h-2.5 w-2.5" /> Disc
                  </Badge>
                )}
                {item.hasSiblings && (
                  <Badge variant={ivory ? "secondary" : "outline"} className={iv("", "text-[10px] px-1.5 py-0 gap-0.5 border-amber-300 text-amber-700")}>
                    <Award className="h-2.5 w-2.5" /> Sib
                  </Badge>
                )}
              </div>
              <p className={iv("mt-1 whitespace-normal break-words text-hec-small text-hec-ink-soft", "text-xs text-muted-foreground truncate mt-0.5")}>{classNames}</p>
            </div>

            {/* Balance + chevron */}
            <div className="text-right shrink-0">
              <p className={ivory
                ? `whitespace-nowrap font-sans text-hec-body font-semibold tabular-nums ${balance === 0 ? "text-hec-ink-soft" : "text-hec-ink"}`
                : `text-sm font-bold tabular-nums ${
                balance > 0 ? "text-destructive" : balance < 0 ? "text-emerald-600" : "text-muted-foreground"
              }`}>
                {balance > 0 ? fmt(balance) : balance < 0 ? `+${fmt(Math.abs(balance))}` : "Settled"}
              </p>
              <p className={iv("text-hec-caption text-hec-ink-soft", "text-[10px] text-muted-foreground")}>Balance</p>
            </div>
            <ChevronDown className={ivory ? `mt-1 h-5 w-5 shrink-0 text-hec-ink-soft transition-transform duration-hec-1 ease-hec ${open ? "rotate-180" : ""}` : `h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>

        {/* Expanded finance breakdown */}
        <CollapsibleContent>
          <div className={iv("space-y-4 border-t border-hec-line p-4", "border-t px-3 sm:px-4 py-3 space-y-3")}>
            <div className={iv("grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6", "grid grid-cols-3 sm:grid-cols-6 gap-y-3 gap-x-2 text-center")}>
              <FinanceCell ivory={ivory} label="Base" value={fmt(item.base_amount)} />
              <FinanceCell ivory={ivory} label="Discount" value={item.discount_amount > 0 ? `−${fmt(item.discount_amount)}` : "—"} accent={item.discount_amount > 0 ? "green" : undefined} />
              <FinanceCell ivory={ivory} label="Prior Bal." value={priorNet === 0 ? "—" : priorNet > 0 ? fmt(priorNet) : `+${fmt(Math.abs(priorNet))}`} accent={priorNet > 0 ? "red" : priorNet < 0 ? "green" : undefined} />
              <FinanceCell ivory={ivory} label="Payable" value={fmt(item.finalPayable)} bold />
              <FinanceCell ivory={ivory} label="Paid" value={fmt(item.recorded_payment ?? 0)} accent="blue" />
              <FinanceCell ivory={ivory} total label="Balance" value={balance > 0 ? fmt(balance) : balance < 0 ? `+${fmt(Math.abs(balance))}` : "0 ₫"} accent={balance > 0 ? "red" : balance < 0 ? "green" : undefined} bold />
            </div>

            {/* Smart Tuition Flags */}
            <TuitionFlags item={item} ivory={ivory} />

            {/* Actions */}
            <div className={iv("flex flex-wrap gap-2", "flex gap-2 pt-1")}>
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

function FinanceCell({ label, value, accent, bold, ivory, total }: { label: string; value: string; accent?: "green" | "red" | "blue"; bold?: boolean; ivory?: boolean; total?: boolean }) {
  if (ivory) {
    // Ivory: every amount is ink, sans, tabular and never cut; the Balance is
    // the one total of the card, under the 2 px ink rule.
    return (
      <div className={`min-w-0 ${total ? "border-t-2 border-hec-ink pt-2" : "pt-2"}`}>
        <p className="text-hec-caption uppercase tracking-wider text-hec-ink-soft">{label}</p>
        <p className={`whitespace-nowrap font-sans tabular-nums text-hec-ink ${total ? "text-hec-h3 font-semibold" : bold ? "text-hec-small font-semibold" : "text-hec-small"}`}>{value}</p>
      </div>
    );
  }
  const color = accent === "green" ? "text-emerald-600" : accent === "red" ? "text-destructive" : accent === "blue" ? "text-blue-600" : "text-foreground";
  return (
    <div className="min-w-0">
      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-xs sm:text-sm tabular-nums truncate ${color} ${bold ? "font-bold" : "font-medium"}`}>{value}</p>
    </div>
  );
}

function TuitionFlags({ item, ivory }: { item: any; ivory?: boolean }) {
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
                variant={ivory ? (flag.color === "orange" ? "warning" : "secondary") : "outline"}
                className={ivory ? "cursor-help" : `text-[10px] px-1.5 py-0.5 gap-1 cursor-help ${
                  flag.color === "green"
                    ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                    : flag.color === "orange"
                    ? "border-amber-300 text-amber-700 bg-amber-50"
                    : "border-blue-300 text-blue-700 bg-blue-50"
                }`}
              >
                <Info className={ivory ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                {flag.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className={ivory ? "max-w-[200px] text-hec-caption" : "text-xs max-w-[200px]"}>{flag.detail}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
