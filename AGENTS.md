# Payroll rules
- Admin payroll totals and duration variances resolve effective-dated staff rates per session through the existing pay-history resolver; this keeps corrections consistent with calculate-payroll.
- Closed payroll expenditure rows are protected by a database trigger as well as a fresh period check before UI booking; this prevents stale clients from rewriting booked costs.
- Run payroll regression tests with `bun test src/lib/payrollCalculation.test.ts`.