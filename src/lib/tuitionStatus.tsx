import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle2, Circle, PlusCircle, type LucideIcon } from "lucide-react";

export type PaymentStatus = 'overpaid' | 'settled' | 'underpaid' | 'unpaid' | 'open' | 'settled_later';

export interface TuitionStatusInput {
  carryOutDebt: number;
  carryOutCredit: number;
  totalAmount: number;
  monthPayments: number;
  settledInMonth?: string | null;
}

/**
 * Determine payment status based on carry-out balances
 * Single source of truth for both Admin and Student views
 */
export function getPaymentStatus(data: TuitionStatusInput): PaymentStatus {
  const { carryOutDebt, carryOutCredit, totalAmount, monthPayments, settledInMonth } = data;

  if (carryOutCredit > 0) return 'overpaid';
  if (carryOutDebt === 0 && carryOutCredit === 0 && totalAmount > 0) return 'settled';
  if (carryOutDebt > 0 && settledInMonth) return 'settled_later';
  if (monthPayments > 0 && carryOutDebt > 0) return 'underpaid';
  if (carryOutDebt > 0) return 'unpaid';
  return 'open';
}

/**
 * Render status badge for tuition - shared across Admin and Student views
 */
export function getTuitionStatusBadge(status: PaymentStatus, settledInMonth?: string | null) {
  switch (status) {
    case 'overpaid':
      return <Badge className="bg-blue-500">Overpaid</Badge>;
    case 'settled':
      return <Badge className="bg-green-500">Settled</Badge>;
    case 'settled_later':
      return (
        <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30">
          {settledInMonth ? `Settled in ${settledInMonth}` : 'Settled Later'}
        </Badge>
      );
    case 'underpaid':
      return <Badge variant="outline" className="border-amber-500 text-amber-700">Underpaid</Badge>;
    case 'unpaid':
      return <Badge variant="destructive">Unpaid</Badge>;
    default:
      return <Badge variant="secondary">Open</Badge>;
  }
}

/**
 * Ivory (A4.6) look for the same statuses, beside the old map (admin screens keep
 * getTuitionStatusBadge until the staff area flips). Same words as the old badges;
 * each state carries an icon and a word, never colour alone (DESIGN_SYSTEM s.14).
 * Credit (overpaid) and open are not alarms: neutral.
 */
export const ivoryTuitionStatus: Record<PaymentStatus, { variant: "success" | "warning" | "destructive" | "secondary"; Icon: LucideIcon }> = {
  overpaid: { variant: "secondary", Icon: PlusCircle },
  settled: { variant: "success", Icon: CheckCircle2 },
  settled_later: { variant: "success", Icon: CheckCircle2 },
  underpaid: { variant: "warning", Icon: AlertTriangle },
  unpaid: { variant: "destructive", Icon: AlertCircle },
  open: { variant: "secondary", Icon: Circle },
};

export function getIvoryTuitionStatusBadge(status: PaymentStatus, settledInMonth?: string | null) {
  const { variant, Icon } = ivoryTuitionStatus[status] ?? ivoryTuitionStatus.open;
  const label =
    status === 'overpaid' ? 'Overpaid'
    : status === 'settled' ? 'Settled'
    : status === 'settled_later' ? (settledInMonth ? `Settled in ${settledInMonth}` : 'Settled Later')
    : status === 'underpaid' ? 'Underpaid'
    : status === 'unpaid' ? 'Unpaid'
    : 'Open';
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </Badge>
  );
}
