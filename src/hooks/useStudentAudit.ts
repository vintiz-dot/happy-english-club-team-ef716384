/**
 * One student's complete financial history, for the audit screen.
 *
 * Deliberately lazy: the roster shows dozens of students and fetching
 * every history up front would be both slow and pointless, so this only
 * runs once a row is actually opened. React Query then keeps it, so
 * collapsing and reopening a student costs nothing.
 *
 * The shape mirrors supabase/functions/student-audit/index.ts. Read the
 * note at the top of that file before trusting any figure here — in
 * particular, most payments in this school are a bump to a running
 * scalar rather than a row of their own, so `events` is a reconstruction
 * from three sources and each entry says which one it came from.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditActor {
  name: string;
  email: string | null;
  known: boolean;
}

export interface AuditClassLine {
  classId: string;
  className: string;
  sessionsCountStored: number;
  amount: number;
}

export interface AuditAttendanceRow {
  date: string;
  className: string;
  status: string;
  billed: boolean;
  markedAt: string | null;
  markedBy: string | null;
}

export interface AuditMonth {
  month: string;
  invoiceId: string;
  invoiceNumber: string | null;
  /** "snapshot" means closed and frozen; "invoice" means still live. */
  source: "snapshot" | "invoice";
  closedAt: string | null;
  closedBy: string | null;
  baseAmount: number;
  discountAmount: number;
  charged: number;
  paid: number;
  carryInCredit: number;
  carryInDebt: number;
  carryOutCredit: number;
  carryOutDebt: number;
  status: string | null;
  confirmationStatus: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  classes: AuditClassLine[];
  attendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    billedSessions: number;
    rows: AuditAttendanceRow[];
  } | null;
}

export interface AuditEvent {
  id: string;
  kind: "payment" | "correction" | "confirmation" | "adjustment";
  label: string;
  amount: number | null;
  /** When the money moved. Null when only the entry date was kept. */
  occurredAt: string | null;
  /** When the row was written. Always present. */
  recordedAt: string;
  month: string | null;
  method: string | null;
  memo: string | null;
  actorId: string | null;
  provenance: "payments" | "ledger" | "audit_log";
  /** False when the amount had to be inferred rather than read. */
  exact: boolean;
}

export interface StudentAudit {
  student: { id: string; name: string; familyId: string | null };
  months: AuditMonth[];
  events: AuditEvent[];
  actors: Record<string, AuditActor>;
  totals: {
    charged: number;
    paid: number;
    balance: number;
    outstanding: number;
    credit: number;
    months: number;
  };
  caveats: {
    scalarPayments: boolean;
    auditOnlyEvents: number;
    unattributedEvents: number;
  };
}

export async function fetchStudentAudit(studentId: string): Promise<StudentAudit> {
  const { data, error } = await supabase.functions.invoke("student-audit", {
    body: { studentId },
  });
  if (error) {
    // supabase-js reports "non-2xx status code"; the function's own
    // message is in the response and is the one worth showing.
    const detail = await readFunctionError(error);
    throw new Error(detail ?? error.message);
  }
  if ((data as { error?: string })?.error) {
    throw new Error((data as { error: string }).error);
  }
  return data as StudentAudit;
}

async function readFunctionError(error: unknown): Promise<string | null> {
  const response = (error as { context?: Response })?.context;
  if (!response || typeof response.json !== "function") return null;
  try {
    const parsed = await response.clone().json();
    return typeof parsed?.error === "string" ? parsed.error : null;
  } catch {
    return null;
  }
}

export function useStudentAudit(studentId: string | null, enabled: boolean) {
  return useQuery<StudentAudit>({
    queryKey: ["student-audit", studentId],
    enabled: !!studentId && enabled,
    // History changes only when someone records a payment. Holding it for
    // a few minutes makes opening and closing rows feel instant.
    staleTime: 3 * 60 * 1000,
    queryFn: () => fetchStudentAudit(studentId!),
  });
}

/** Name an actor id, admitting plainly when nobody was recorded. */
export function actorName(
  actors: Record<string, AuditActor>,
  id: string | null | undefined,
): string {
  if (!id) return "Not recorded";
  return actors[id]?.name ?? "Unknown";
}
