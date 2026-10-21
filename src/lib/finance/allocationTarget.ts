/**
 * Who pays for a cost.
 *
 * One vocabulary, shared by the recurring-template form, the one-off
 * expenditure form and the class report, so the words an admin picks in
 * one place are the words they read back in another.
 *
 * The four answers match expenditures.allocation_mode and
 * recurring_expenditures.allocation_mode (20261021098000).
 */

export type AllocationMode = "none" | "all" | "class" | "staff";

export const ALLOCATION_MODES: ReadonlyArray<{
  value: AllocationMode;
  label: string;
  hint: string;
}> = [
  {
    value: "all",
    label: "Every class that ran",
    hint: "Split across the classes that held lessons this month, in proportion to how many each held. Rent, electricity, internet.",
  },
  {
    value: "none",
    label: "Nobody — school-wide",
    hint: "Comes out of the school's net profit, but no class is charged for it. Marketing, the owner's costs.",
  },
  {
    value: "class",
    label: "One class",
    hint: "The whole cost lands on the class you choose, whether or not it ran lessons. Materials or equipment bought for one room.",
  },
  {
    value: "staff",
    label: "The classes one person works in",
    hint: "Split across the classes that teacher or assistant actually worked in this month, by their sessions in each. Follows them when the timetable changes.",
  },
];

/** The short label the lists use. */
export function describeAllocation(mode: string | null | undefined): string {
  switch (mode) {
    case "all":
      return "Shared across classes";
    case "class":
      return "Charged to one class";
    case "staff":
      return "Follows a staff member";
    default:
      return "School-wide";
  }
}

/**
 * A teacher and an assistant can share an id space only by accident, and
 * a form field holds one string. These two keep the pair packed into one
 * value and unpacked again without either side guessing the convention.
 */
export function staffKey(
  teacherId: string | null | undefined,
  assistantId: string | null | undefined,
): string {
  if (teacherId) return `teacher:${teacherId}`;
  if (assistantId) return `assistant:${assistantId}`;
  return "";
}

export function splitStaffKey(key: string | null | undefined): {
  teacherId: string | null;
  assistantId: string | null;
} {
  const value = (key ?? "").trim();
  if (value.startsWith("teacher:")) {
    return { teacherId: value.slice("teacher:".length) || null, assistantId: null };
  }
  if (value.startsWith("assistant:")) {
    return { teacherId: null, assistantId: value.slice("assistant:".length) || null };
  }
  return { teacherId: null, assistantId: null };
}
