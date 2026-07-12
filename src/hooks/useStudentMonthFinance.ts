import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  
  // Raw invoice data for download
  invoice?: {
    base_amount: number;
    discount_amount: number;
    total_amount: number;
    paid_amount: number;
  };
  
  // Prior balance breakdown for detailed view
  priorBalanceBreakdown?: PriorBalanceBreakdown;
  
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
        
        // Discounts
        discounts: data.discounts ?? [],
        
        // Sibling state
        siblingState: data.siblingState,
        
        // Class breakdown
        classBreakdown: data.breakdown?.classes ?? [],
        
        // Session details
        sessionDetails: data.sessionDetails ?? [],
        
        // Raw invoice
        invoice: data.invoice,
        
        // Prior balance breakdown
        priorBalanceBreakdown: data.priorBalanceBreakdown,
      };

      return normalized;
    },
    enabled: options?.enabled !== false && !!studentId,
  });
}

/**
 * Format VND currency - identical to Admin Finance
 * Asia/Bangkok timezone
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

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
