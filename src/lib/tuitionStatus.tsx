import { Badge } from "@/components/ui/badge";

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
