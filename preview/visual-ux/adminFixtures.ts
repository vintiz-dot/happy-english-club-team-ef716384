// Made-up admin data for the preview (overview alerts, tuition list, payroll, dialogs).
// Nobody here is real; every name and figure is invented.
import { dayjs } from "@/lib/date";

const params = new URLSearchParams(window.location.search);
const STATE = params.get("state") || "ok";
// payroll: &period=closed shows a Closed month (frozen lines + `live` block).
const PERIOD_CLOSED = params.get("period") === "closed";
// overview, with state=error: &part=counts fails only the four review counts
// (the alerts list still loads, so the "Count unavailable" rows are visible).
const PART = params.get("part");

const CURRENT = dayjs().format("YYYY-MM");
const PRIOR = dayjs().subtract(1, "month").format("YYYY-MM");
const today = dayjs().format("YYYY-MM-DD");
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// ---- people and classes --------------------------------------------------
const CLASSES = {
  starters: { id: "cls-a1", name: "Starters Stars (Mon/Wed)", is_active: true },
  movers: { id: "cls-a2", name: "Movers Sparks (Tue/Thu)", is_active: true },
  flyers: { id: "cls-a3", name: "Flyers Comets", is_active: true },
  kindy: { id: "cls-a4", name: "Kindy Sunbeams", is_active: true },
};

const mk = (id: string, full_name: string, family_id: string | null) => ({
  id, full_name, family_id, avatar_url: null, is_active: true, deactivated_at: null,
});
const STUDENTS = {
  han: mk("stu-han", "Nguyễn Gia Hân", "fam-1"),
  quan: mk("stu-quan", "Trần Minh Quân", null),
  ngoc: mk("stu-ngoc", "Lê Bảo Ngọc", null),
  duc: mk("stu-duc", "Phạm Đức Anh", null),
  my: mk("stu-my", "Nguyễn Thảo My", "fam-1"),
  linh: mk("stu-linh", "Hoàng Khánh Linh", null),
};

// ---- calculate-tuition-bulk ---------------------------------------------
// Each entry is shaped like one of the real function's `results`.
type Bill = {
  student: (typeof STUDENTS)[keyof typeof STUDENTS];
  cls: (typeof CLASSES)[keyof typeof CLASSES];
  n: number;
  base: number;
  discount: number;
  total: number;
  paid: number;
  inDebt: number;
  inCredit: number;
  outDebt: number;
  outCredit: number;
  status: string;
  confirmation: string;
  unresolved?: boolean;
};
const BILLS: Bill[] = [
  // paid in full
  { student: STUDENTS.han, cls: CLASSES.starters, n: 1, base: 2_400_000, discount: 0, total: 2_400_000, paid: 2_400_000, inDebt: 0, inCredit: 0, outDebt: 0, outCredit: 0, status: "paid", confirmation: "confirmed" },
  // partial: some paid, an older 600,000 carried in
  { student: STUDENTS.quan, cls: CLASSES.movers, n: 2, base: 2_400_000, discount: 0, total: 2_400_000, paid: 1_000_000, inDebt: 600_000, inCredit: 0, outDebt: 2_000_000, outCredit: 0, status: "partial", confirmation: "auto_approved" },
  // issued: nothing recorded yet
  { student: STUDENTS.ngoc, cls: CLASSES.flyers, n: 3, base: 1_800_000, discount: 0, total: 1_800_000, paid: 0, inDebt: 0, inCredit: 0, outDebt: 1_800_000, outCredit: 0, status: "issued", confirmation: "needs_review" },
  // credit: paid more than the month asks, 200,000 credit carried in
  { student: STUDENTS.duc, cls: CLASSES.kindy, n: 4, base: 1_800_000, discount: 0, total: 1_800_000, paid: 2_300_000, inDebt: 0, inCredit: 200_000, outDebt: 0, outCredit: 700_000, status: "paid", confirmation: "confirmed" },
  // sibling discount, paid
  { student: STUDENTS.my, cls: CLASSES.starters, n: 5, base: 2_400_000, discount: 240_000, total: 2_160_000, paid: 2_160_000, inDebt: 0, inCredit: 0, outDebt: 0, outCredit: 0, status: "paid", confirmation: "confirmed" },
  // family discount still being worked out: no figures
  { student: STUDENTS.linh, cls: CLASSES.flyers, n: 6, base: 1_800_000, discount: 0, total: 1_800_000, paid: 0, inDebt: 0, inCredit: 0, outDebt: 1_800_000, outCredit: 0, status: "issued", confirmation: "needs_review", unresolved: true },
];

export function bulkAnswer(b: Bill, month: string) {
  return {
    studentId: b.student.id,
    invoiceId: uuid(b.n),
    invoiceStatus: b.status,
    confirmationStatus: b.confirmation,
    month,
    baseAmount: b.base,
    totalDiscount: b.discount,
    totalAmount: b.total,
    payments: { monthPayments: b.paid },
    carry: {
      carryInCredit: b.inCredit,
      carryInDebt: b.inDebt,
      carryOutCredit: b.outCredit,
      carryOutDebt: b.outDebt,
      settledInMonth: null,
      payable: b.total + b.inDebt - b.inCredit,
    },
    ...(b.unresolved ? { siblingState: { status: "unresolved" }, siblingUnresolved: true } : {}),
  };
}
export const BILL_OF = (id: string) => BILLS.find((b) => b.student.id === id)!;
export const PAYMENT_DEMO_STUDENT = STUDENTS.quan;
export const PAYMENT_DEMO_CLASSES = [{ id: CLASSES.movers.id, name: CLASSES.movers.name }];

// ---- calculate-payroll ----------------------------------------------------
function payrollResponse() {
  const closed = PERIOD_CLOSED;
  const rows: any[] = [
    {
      // hourly, one lesson ran 2 h against 1.5 h set: costs money
      teacherId: "tch-ha", teacherName: "Cô Trần Thu Hà", staffName: "Cô Trần Thu Hà", staffType: "teacher", isActive: true,
      payBasisInMonth: "hourly", lengthCostsMoney: true, payRateType: "hourly", hourlyRate: 180_000, perSessionRate: 0,
      sessionsCountActual: 14, sessionsCountProjected: 20,
      totalAmountActual: closed ? 3_780_000 : 3_870_000, totalAmountProjected: 5_490_000, totalAmountExpectedProjected: 5_400_000,
      varianceAmountProjected: 90_000, varianceMinutesProjected: 30,
      discrepancies: [{ id: "ses-d1", date: dayjs().startOf("month").add(4, "day").format("YYYY-MM-DD"), classes: { name: CLASSES.movers.name }, minutes: 120, expectedMinutes: 90, varianceMinutes: 30, varianceAmount: 90_000 }],
      ...(closed ? { live: { totalAmountActual: 3_870_000, sessionsCountActual: 14, totalMinutesActual: 1290, totalHoursActual: 21.5, payRateType: "hourly", hourlyRate: 180_000, perSessionRate: 0 }, liveTotalAmountActual: 3_870_000 } : {}),
    },
    {
      teacherId: "tch-son", teacherName: "Thầy Phạm Văn Sơn", staffName: "Thầy Phạm Văn Sơn", staffType: "teacher", isActive: true,
      payBasisInMonth: "hourly", lengthCostsMoney: true, payRateType: "hourly", hourlyRate: 200_000, perSessionRate: 0,
      sessionsCountActual: 10, sessionsCountProjected: 16, totalAmountActual: 3_000_000, totalAmountProjected: 4_800_000, totalAmountExpectedProjected: 4_800_000,
      varianceAmountProjected: 0, varianceMinutesProjected: 0, discrepancies: [],
      ...(closed ? { live: { totalAmountActual: 3_000_000, sessionsCountActual: 10, payRateType: "hourly", hourlyRate: 200_000, perSessionRate: 0 } } : {}),
    },
    {
      // assistant paid per session: off-length lessons cost nothing
      teacherId: "ta-mai", teacherName: "Lê Thị Mai (TA)", staffName: "Lê Thị Mai", staffType: "teaching_assistant", isActive: true,
      payBasisInMonth: "per_session", lengthCostsMoney: false, payRateType: "per_session", hourlyRate: 250_000, perSessionRate: 250_000,
      sessionsCountActual: 12, sessionsCountProjected: 20, totalAmountActual: 3_000_000, totalAmountProjected: 5_000_000, totalAmountExpectedProjected: 5_000_000,
      varianceAmountProjected: 0, varianceMinutesProjected: 30,
      discrepancies: [{ id: "ses-d2", date: dayjs().startOf("month").add(8, "day").format("YYYY-MM-DD"), classes: { name: CLASSES.kindy.name }, minutes: 60, expectedMinutes: 45, varianceMinutes: 15, varianceAmount: 0 },
        { id: "ses-d3", date: dayjs().startOf("month").add(10, "day").format("YYYY-MM-DD"), classes: { name: CLASSES.kindy.name }, minutes: 60, expectedMinutes: 45, varianceMinutes: 15, varianceAmount: 0 }],
      ...(closed ? { live: { totalAmountActual: 3_000_000, sessionsCountActual: 12, payRateType: "per_session", hourlyRate: 250_000, perSessionRate: 250_000 } } : {}),
    },
    {
      // archived: still paid for lessons already taught
      teacherId: "tch-tuan", teacherName: "Thầy Hoàng Minh Tuấn (archived)", staffName: "Thầy Hoàng Minh Tuấn", staffType: "teacher", isActive: false,
      payBasisInMonth: "hourly", lengthCostsMoney: true, payRateType: "hourly", hourlyRate: 170_000, perSessionRate: 0,
      sessionsCountActual: 4, sessionsCountProjected: 4, totalAmountActual: 1_020_000, totalAmountProjected: 1_020_000, totalAmountExpectedProjected: 1_020_000,
      varianceAmountProjected: 0, varianceMinutesProjected: 0, discrepancies: [],
      ...(closed ? { live: { totalAmountActual: 1_020_000, sessionsCountActual: 4, payRateType: "hourly", hourlyRate: 170_000, perSessionRate: 0 } } : {}),
    },
  ];
  return rows;
}

const PAYROLL_LINES = [
  { teacher_id: "tch-ha", assistant_id: null, staff_name: "Cô Trần Thu Hà", total_amount_vnd: 3_780_000 },
  { teacher_id: "tch-son", assistant_id: null, staff_name: "Thầy Phạm Văn Sơn", total_amount_vnd: 3_000_000 },
  { teacher_id: null, assistant_id: "ta-mai", staff_name: "Lê Thị Mai (TA)", total_amount_vnd: 3_000_000 },
  { teacher_id: "tch-tuan", assistant_id: null, staff_name: "Thầy Hoàng Minh Tuấn (archived)", total_amount_vnd: 1_020_000 },
];

// ---- tables ---------------------------------------------------------------
export function adminDb() {
  const students = Object.values(STUDENTS);
  const enrollments = BILLS.map((b) => ({
    student_id: b.student.id, class_id: b.cls.id, start_date: "2026-01-05", end_date: null,
    classes: { ...b.cls },
  }));
  const invoiceRow = (b: Bill, month: string, extra: Record<string, unknown> = {}) => ({
    id: uuid(100 + b.n), student_id: b.student.id, month, total_amount: b.total, base_amount: b.base,
    discount_amount: b.discount, recorded_payment: b.paid, carry_out_debt: b.outDebt,
    confirmation_status: b.confirmation, students: { full_name: b.student.full_name, family_id: b.student.family_id },
    ...extra,
  });
  const tables: Record<string, any[]> = {
    students,
    enrollments,
    classes: Object.values(CLASSES),
    teachers: [{ id: "tch-ha", is_active: true }, { id: "tch-son", is_active: true }, { id: "tch-tuan", is_active: false }],
    families: [{ id: "fam-1", name: "Nguyễn family" }],
    discount_assignments: [{ student_id: STUDENTS.my.id, discount_def_id: "disc-1", effective_from: "2026-01-01", effective_to: null }],
    // Earlier months (alerts: a family and one child owe) and this month (bills needing review).
    invoices: [
      invoiceRow(BILLS[0], PRIOR, { recorded_payment: 2_400_000, carry_out_debt: 0 }),
      invoiceRow(BILLS[4], PRIOR, { recorded_payment: 0, carry_out_debt: 2_160_000, total_amount: 2_160_000 }),
      invoiceRow(BILLS[1], PRIOR, { total_amount: 2_400_000, recorded_payment: 1_800_000, carry_out_debt: 600_000 }),
      ...BILLS.filter((b) => b.confirmation === "needs_review").map((b) => invoiceRow(b, CURRENT)),
      invoiceRow(BILLS[0], CURRENT),
    ],
    homework_submissions: [1, 2, 3].map((i) => ({ id: `sub-${i}`, status: "submitted", submitted_at: dayjs().subtract(5 + i, "day").toISOString() })),
    sessions: [
      { id: "ses-ov-1", class_id: CLASSES.movers.id, date: today, start_time: "17:30:00", end_time: "19:00:00", status: "Scheduled", class: { name: CLASSES.movers.name }, teacher: { full_name: "Cô Trần Thu Hà" } },
      { id: "ses-ov-2", class_id: CLASSES.kindy.id, date: today, start_time: "15:00:00", end_time: "16:00:00", status: "Scheduled", class: { name: CLASSES.kindy.name }, teacher: { full_name: "Thầy Phạm Văn Sơn" } },
    ],
    attendance: [],
    tuition_reconciliation_items: Array.from({ length: 5 }, (_, i) => ({ id: `rec-${i}`, status: "open" })),
    reception_feedback: [{ id: "fb-1", approved_at: null }, { id: "fb-2", approved_at: null }],
    enrollment_requests: Array.from({ length: 4 }, (_, i) => ({ id: `req-${i}`, status: "pending" })),
    payroll_periods: PERIOD_CLOSED
      ? [{ month: CURRENT, status: "locked", locked_at: dayjs().subtract(2, "day").toISOString(), locked_by: "user-preview-1", reopened_at: null, reopen_reason: null }]
      : [],
    payroll_lines: PERIOD_CLOSED ? PAYROLL_LINES.map((l) => ({ ...l, month: CURRENT })) : [],
    payroll_adjustments: [],
    monthly_finance_snapshots: [],
    expenditures: [],
  };

  let errorOn: string[] = [];
  let emptyOn: string[] = [];
  if (STATE === "error") {
    errorOn = ["tuition_reconciliation_items", "reception_feedback", "enrollment_requests", "invoices#head"];
    if (PART !== "counts") errorOn.push("families");
  }
  if (STATE === "empty") {
    emptyOn = ["students", "enrollments", "invoices", "families", "homework_submissions", "sessions",
      "tuition_reconciliation_items", "reception_feedback", "enrollment_requests"];
  }

  const functions: Record<string, (body: any) => { data: any; error: any }> = {
    "calculate-tuition-bulk": (body) => {
      if (STATE === "error") return { data: null, error: { message: "Edge Function returned a non-2xx status code" } };
      const ids: string[] = body?.studentIds ?? [];
      const month = body?.month ?? CURRENT;
      return { data: { results: BILLS.filter((b) => ids.includes(b.student.id)).map((b) => bulkAnswer(b, month)) }, error: null };
    },
    "calculate-payroll": () => {
      if (STATE === "error") return { data: null, error: { message: "The payroll service did not answer" } };
      return { data: { payrollData: STATE === "empty" ? [] : payrollResponse() }, error: null };
    },
  };

  // The overview's points board and audit list.
  const rpcs: Record<string, (args: any) => any> = {
    leaderboard_period: () => [{ from_date: dayjs().startOf("month").format("YYYY-MM-DD"), to_date: today, label: dayjs().format("MMMM YYYY") }],
    leaderboard_centre: () => ({
      period: { label: dayjs().format("MMMM YYYY"), basis: "points" },
      rows: [
        { student_id: STUDENTS.han.id, name: STUDENTS.han.full_name, class_names: CLASSES.starters.name, total: 86, per_lesson: 0, lessons: 0, rank: 1 },
        { student_id: STUDENTS.my.id, name: STUDENTS.my.full_name, class_names: CLASSES.starters.name, total: 74, per_lesson: 0, lessons: 0, rank: 2 },
        { student_id: STUDENTS.duc.id, name: STUDENTS.duc.full_name, class_names: CLASSES.kindy.name, total: 61, per_lesson: 0, lessons: 0, rank: 3 },
      ],
    }),
    points_manual_changes: () => ({ graded_without_points: [], made: [] }),
  };

  return { tables, errorOn, emptyOn, functions, rpcs };
}
