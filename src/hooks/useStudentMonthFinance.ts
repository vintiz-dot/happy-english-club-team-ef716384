import { useQuery } from "@tanstack/react-query";
import type { SincePaid } from '@/lib/sincePaidLine';
import { supabase } from "@/integrations/supabase/client";
import { siblingRetryDelayMs } from "@/lib/siblingRetry";
import { payableFrom } from "@/lib/tuitionFigures";

/**
 * Shared finance data selector - single source of truth
 * Used by both Admin Finance and Student Profile
 * 
 * Mirrors Admin logic exactly:
 * - Calls calculate-tuition edge function
 * - Returns normalized data matching Admin field names
 * - Same currency formatting, date handling, and math
 */

// Prior balance breakdown types
export interface PriorBalanceItem {
  type: 'charge' | 'payment' | 'canceled';
  className?: string;
  classId?: string;
  amount: number;
  description: string;
  date?: string;
}

export interface PriorBalanceMonth {
  month: string;
  label: string;
  charges: number;
  payments: number;
  netBalance: number;
  items: PriorBalanceItem[];
}

export interface PriorBalanceBreakdown {
  months: PriorBalanceMonth[];
  summary: {
    totalPriorCharges: number;
    totalPriorPayments: number;
    netCarryIn: number;
  };
}

export interface StudentMonthFinanceData {
  // Core amounts - match Admin Finance
  baseAmount: number;
  totalDiscount: number;
  totalAmount: number;
  sessionCount: number;
  
  // Payment tracking
  cumulativePaidAmount: number;
  monthPayments: number;
  priorPayments: number;
  
  // Balance calculation
  balance: number;
  balanceStatus: 'credit' | 'debt' | 'settled';
  balanceMessage: string;
  
  // Carry-over state
  carryInCredit: number;
  carryInDebt: number;
  carryOutCredit: number;
  carryOutDebt: number;
  settledInMonth: string | null;
  /** calculate-tuition's carry.payable; null = figure unavailable. */
  payable: number | null;

  // Discount details
  discounts: Array<{
    name: string;
    type: 'percent' | 'amount';
    value: number;
    amount: number;
    isSiblingWinner?: boolean;
    appliedToClass?: string;
  }>;
  
  // Sibling state
  siblingState?: {
    status: string;
    percent: number;
    isWinner?: boolean;
    reason?: string;
    winnerClassId?: string;
  };
  
  // Class breakdown for multi-enrollment students
  classBreakdown?: Array<{
    class_id: string;
    class_name: string;
    amount_vnd: number;
    sessions_count: number;
    session_rate_vnd: number;
  }>;
  
  // Session details for display
  sessionDetails: Array<{
    date: string;
    rate: number;
    status: string;
  }>;

  // Every lesson of the month with its state (billed, excused, cancelled, free,
  // trial), as calculate-tuition lists them. Absent from an older function.
  lessons?: Array<{
    session_id: string;
    date: string;
    class_id?: string;
    class_name?: string;
    price_vnd: number;
    mark?: string | null;
    held?: boolean;
    state: string;
  }>;
  
  // Raw invoice data for download
  invoice?: {
    base_amount: number;
    discount_amount: number;
    total_amount: number;
    paid_amount: number;
  };
  
  // Prior balance breakdown for detailed view
  priorBalanceBreakdown?: PriorBalanceBreakdown;

  /** What this month's payment paid for (calculate-tuition's `sincePaid`); absent from an older deploy. */
  sincePaid?: SincePaid | null;
  /** A closed month answered as charged although today's pricing differs: the function's sentence. */
  heldMessage?: string | null;
  
  // Student context
  studentId: string;
  month: string;
}

export interface UseStudentMonthFinanceOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch student finance data for a given month
 * Single source of truth - reuses Admin's calculate-tuition logic
 */
export function useStudentMonthFinance(
  studentId: string | undefined, 
  month: string,
  options?: UseStudentMonthFinanceOptions
) {
  return useQuery({
    queryKey: ['student-month-finance', studentId, month],
    queryFn: async (): Promise<StudentMonthFinanceData> => {
      if (!studentId) {
        throw new Error('Student ID is required');
      }

      // Call the same edge function Admin uses
      const { data, error } = await supabase.functions.invoke('calculate-tuition', {
        body: { studentId, month }
      });

      if (error) throw error;
      if (!data) throw new Error('No tuition data returned');

      // Normalize response to match Admin Finance field names
      const normalized: StudentMonthFinanceData = {
        studentId,
        month,
        
        // Core amounts
        baseAmount: data.baseAmount ?? 0,
        totalDiscount: data.totalDiscount ?? 0,
        totalAmount: data.totalAmount ?? 0,
        sessionCount: data.sessionCount ?? 0,
        
        // Payments - use edge function's calculation directly
        cumulativePaidAmount: data.payments?.cumulativePaidAmount ?? 0,
        monthPayments: data.payments?.monthPayments ?? 0,
        priorPayments: data.payments?.priorPayments ?? 0,
        
        // Balance
        balance: data.carry?.carryOutDebt 
          ? data.carry.carryOutDebt 
          : data.carry?.carryOutCredit 
            ? -data.carry.carryOutCredit 
            : 0,
        balanceStatus: data.carry?.status ?? 'settled',
        balanceMessage: data.carry?.message ?? 'Settled',
        
        // Carry-over
        carryInCredit: data.carry?.carryInCredit ?? 0,
        carryInDebt: data.carry?.carryInDebt ?? 0,
        carryOutCredit: data.carry?.carryOutCredit ?? 0,
        carryOutDebt: data.carry?.carryOutDebt ?? 0,
        settledInMonth: data.carry?.settledInMonth ?? null,
        // The function's own figure; null = figure unavailable (older deploy).
        payable: payableFrom(data.carry),

        // Discounts
        discounts: data.discounts ?? [],
        
        // Sibling state
        siblingState: data.siblingState,
        
        // Class breakdown
        classBreakdown: data.breakdown?.classes ?? [],
        
        // Session details
        sessionDetails: data.sessionDetails ?? [],
        lessons: Array.isArray(data.lessons) ? data.lessons : undefined,
        
        // Raw invoice
        invoice: data.invoice,
        
        // Prior balance breakdown
        priorBalanceBreakdown: data.priorBalanceBreakdown,

        // The function's own answers; nothing is worked out here.
        sincePaid: data.sincePaid ?? null,
        heldMessage: data.held && !data.held.priced_as_charged && typeof data.held.message === 'string' ? data.held.message : null,
      };

      return normalized;
    },
    enabled: options?.enabled !== false && !!studentId,
    // Family discount still being worked out elsewhere: ask again by itself.
    refetchInterval: (query) =>
      siblingRetryDelayMs(query.state.data?.siblingState?.status, Math.max(0, query.state.dataUpdateCount - 1)),
  });
}

/** Kept so existing callers keep working: the one formatter is `@/lib/money`. */
export { formatVND } from '@/lib/money';

/**
 * Get month options for selector - identical to Admin
 */
export function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = -2; i <= 2; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}
