export function isPaymentMonthConfirmed(month: string, confirmedMonth: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && confirmedMonth === month;
}