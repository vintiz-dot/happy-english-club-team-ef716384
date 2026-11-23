/**
 * "What changed since you paid": one plain sentence for a month's bill.
 *
 * Parents pay what the bill said on the day. A lesson cancelled or excused
 * afterwards lowers the bill, and the app then shows more paid than asked.
 * calculate-tuition works out whether those lessons account for the whole
 * difference (`sincePaid`, priced by supabase/functions/_lib/tuition-pricing.ts
 * explainPayment). This file only words that answer, for families and admins
 * alike; it prices nothing.
 */
import { formatVND } from "./money";

export interface SincePaidLesson {
  date: string; // YYYY-MM-DD
  class_name?: string;
  state: string; // cancelled | excused
  price_vnd?: number;
}

export interface SincePaid {
  kind: "none" | "exact" | "explained" | "over" | "under";
  paid: number;
  payable: number;
  difference: number;
  carryCounted: boolean;
  lessons: SincePaidLesson[];
}

export interface SincePaidText {
  /** settled: nothing to do; credit: money moves to next month; owed: still to pay; check: a difference nothing explains. */
  tone: "settled" | "credit" | "owed" | "check";
  en: string;
  vi: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayEn = (date: string): string => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1] ?? ""}`.trim();
const dayVi = (date: string): string => `${Number(date.slice(8, 10))}/${Number(date.slice(5, 7))}`;
const whyEn = (state: string): string => (state === "excused" ? "excused" : "cancelled");
const whyVi = (state: string): string => (state === "excused" ? "nghỉ có phép" : "lớp nghỉ");

/** The sentence, or null when there is nothing to explain (nothing paid, or paid exactly what is asked). */
export function sincePaidLine(sp: SincePaid | null | undefined): SincePaidText | null {
  if (!sp || sp.kind === "none") return null;
  const paid = formatVND(sp.paid);
  const due = formatVND(sp.payable);
  const diff = formatVND(Math.abs(sp.difference));

  if (sp.kind === "exact") {
    // Paid against the balance too: the month is simply settled.
    if (sp.carryCounted || sp.difference <= 0) return null;
    return {
      tone: "credit",
      en: `You paid this month's lessons in full (${paid}). The ${diff} of credit you already had moves to next month.`,
      vi: `Quý phụ huynh đã thanh toán đủ học phí tháng này (${paid}). Số dư ${diff} từ trước được chuyển sang tháng sau.`,
    };
  }

  if (sp.kind === "explained" && sp.lessons.length > 0) {
    const n = sp.lessons.length;
    const listEn = sp.lessons.map((l) => `${dayEn(l.date)} (${whyEn(l.state)})`).join(", ");
    const listVi = sp.lessons.map((l) => `${dayVi(l.date)} (${whyVi(l.state)})`).join(", ");
    const after =
      sp.difference > 0
        ? { en: `The amount due for this month is now ${due}, and ${diff} is credit for next month.`, vi: `Số tiền cần thanh toán tháng này còn ${due}; ${diff} được chuyển sang tháng sau.` }
        : sp.difference < 0
          ? { en: `The amount due for this month is now ${due}; ${diff} is still to pay.`, vi: `Số tiền cần thanh toán tháng này là ${due}; còn ${diff} cần thanh toán.` }
          : { en: `The amount due for this month is now ${due}.`, vi: `Số tiền cần thanh toán tháng này là ${due}.` };
    return {
      tone: sp.difference > 0 ? "credit" : sp.difference < 0 ? "owed" : "settled",
      en: `You paid ${paid}. Since then ${n} ${n === 1 ? "lesson is" : "lessons are"} no longer billed: ${listEn}. ${after.en}`,
      vi: `Quý phụ huynh đã thanh toán ${paid}. Sau đó có ${n} buổi không còn tính phí: ${listVi}. ${after.vi}`,
    };
  }

  if (sp.difference > 0) {
    return {
      tone: "check",
      en: `You paid ${paid}; the amount due for this month is ${due}. The extra ${diff} is credit for next month. It does not come from a cancelled or excused lesson.`,
      vi: `Quý phụ huynh đã thanh toán ${paid}; số tiền cần thanh toán tháng này là ${due}. Phần dư ${diff} được chuyển sang tháng sau. Khoản này không do buổi học bị hủy hay nghỉ có phép.`,
    };
  }
  if (sp.difference < 0) {
    return {
      tone: "owed",
      en: `You paid ${paid} of ${due}. ${diff} is still to pay.`,
      vi: `Quý phụ huynh đã thanh toán ${paid} trên ${due}. Còn ${diff} cần thanh toán.`,
    };
  }
  return null;
}
