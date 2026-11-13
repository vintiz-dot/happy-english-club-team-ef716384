// Exact ports of src/lib/invoice/formatter.ts, the helpers InvoicePrintView
// uses, so a regenerated invoice prints every figure and date as the app did.
// The browser formatted in its own time zone; HEC's browsers run in Hanoi, so
// the zone is pinned to Asia/Ho_Chi_Minh here. Pure: no clock, no I/O.
// Names are prefixed "invoice" so they cannot collide with other families.

const TZ = "Asia/Ho_Chi_Minh";

/** formatVND(amount): Intl vi-VN grouping ("1.200.000", "-350.000", "-0"). */
function invoiceVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

/** formatDate(dateStr, locale = "vi-VN"): "03/11/2026" or "Nov 13, 2026". */
function invoiceDate(dateStr: string, locale: "vi-VN" | "en-US" = "vi-VN"): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      year: "numeric",
      month: locale === "en-US" ? "short" : "2-digit",
      day: "2-digit",
      timeZone: TZ,
    });
  } catch {
    return dateStr;
  }
}

/** formatMonth("2026-11"): "November 2026". */
function invoiceMonth(dateStr: string): string {
  try {
    return new Date(dateStr + "-01").toLocaleString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: TZ,
    });
  } catch {
    return dateStr;
  }
}

export const filters = { invoiceVND, invoiceDate, invoiceMonth };
