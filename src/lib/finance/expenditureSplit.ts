/**
 * Payroll booked into expenditures is the same money as the salary line.
 *
 * The Payroll tab has a "Book to expenditures" button, and closing a month
 * does the same thing automatically. That is correct bookkeeping - salary
 * IS an expenditure, and the ledger should show it. What was not correct
 * was net profit, which read
 *
 *     net = billed - salary - every expenditure in the month
 *
 * and so subtracted the payroll once as "salary" and again as part of
 * "expenditures" the moment it was booked. A month with 44.8M of salary
 * came out 44.8M worse than it was, and only after someone pressed the
 * button, which made it look like booking the payroll had cost the school
 * money.
 *
 * So the ledger total is split. Salary is counted once, from the payroll
 * figures; the expenditure rows that ARE that salary are set aside; and
 * net subtracts the salary plus everything else.
 *
 * TWO WAYS TO RECOGNISE A PAYROLL ROW. Rows booked from 20261021092000
 * onwards carry source_kind = 'payroll', which is exact. Rows booked
 * before that carry nothing but the category the button wrote, so the
 * category is matched too - otherwise every month already on the books
 * would keep reading wrong, and a fix that only works going forwards is
 * not much of a fix for a ledger.
 */

/** Categories the payroll button has always written. */
export const PAYROLL_EXPENDITURE_CATEGORIES = ["Teacher Payroll", "TA Payroll"] as const;

export interface ExpenditureAmountRow {
  amount: number | null;
  category?: string | null;
  source_kind?: string | null;
}

export function isPayrollExpenditure(row: ExpenditureAmountRow): boolean {
  if (row.source_kind === "payroll") return true;
  const categories: readonly string[] = PAYROLL_EXPENDITURE_CATEGORIES;
  return categories.includes((row.category ?? "").trim());
}

export interface ExpenditureSplit {
  /** Everything in the ledger for the month. What the Expenditures page lists. */
  total: number;
  /** The part that is payroll, already represented by the salary figure. */
  payroll: number;
  /** total - payroll. The part net profit subtracts on top of salary. */
  operating: number;
}

export function splitExpenditures(rows: ExpenditureAmountRow[]): ExpenditureSplit {
  let total = 0;
  let payroll = 0;
  for (const row of rows) {
    const amount = Number(row?.amount ?? 0);
    if (!Number.isFinite(amount)) continue;
    total += amount;
    if (isPayrollExpenditure(row)) payroll += amount;
  }
  return { total, payroll, operating: total - payroll };
}

/**
 * The salary to subtract, given a split and what payroll reported.
 *
 * calculate-payroll failing is handled rather than ignored. Both finance
 * hooks turn a failed invoke into a salary of 0, and if the booked payroll
 * were dropped as well the month would come out looking better than it is
 * - a silent error reading as profit. When there is no payroll figure, the
 * payroll already in the ledger stands in for it.
 */
export function salaryForNet(split: ExpenditureSplit, reportedSalary: number, payrollFailed: boolean): number {
  return payrollFailed ? split.payroll : reportedSalary;
}
