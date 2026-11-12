import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { functionErrorMessage } from "../src/lib/functionError";

// What supabase-js hands back for a non-2xx answer: a generic message and the Response.
const refusal = (body: unknown, status = 409) => {
  const e: any = new Error("Edge Function returned a non-2xx status code");
  e.context = new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  return e;
};

test("a function's refusal sentence reaches the admin, not 'non-2xx status code'", async () => {
  const msg = "This payment has been modified since it was recorded. Correct the bills in Recorded Payment Manager instead.";
  expect(await functionErrorMessage(refusal({ error: msg }))).toBe(msg);
});

test("falls back to the generic message when there is no readable body", async () => {
  expect(await functionErrorMessage(refusal("<html>bad gateway</html>", 502))).toBe("Edge Function returned a non-2xx status code");
  expect(await functionErrorMessage(new Error("network down"))).toBe("network down");
  expect(await functionErrorMessage(null, "Failed")).toBe("Failed");
});

test("the body can still be read by the caller afterwards (the helper reads a clone)", async () => {
  const e = refusal({ error: "x" });
  await functionErrorMessage(e);
  expect(((await e.context.json()) as any).error).toBe("x");
});

test("every screen that calls a payment function shows its sentence", () => {
  for (const [file, fn] of [
    ["LedgerBalanceInspector.tsx", "delete-payment"],
    ["SettleBillModal.tsx", "settle-bill"],
    ["FamilyPaymentModal.tsx", "family-payment"],
    ["SmartFamilyPaymentModal.tsx", "smart-family-payment"],
    ["BatchFamilyPaymentModal.tsx", "smart-family-payment"],
  ]) {
    const src = readFileSync(`src/components/admin/${file}`, "utf8");
    const at = src.indexOf(`functions.invoke("${fn}"`);
    expect(at).toBeGreaterThan(-1);
    const after = src.slice(at, at + 700);
    expect(after).toContain("functionErrorMessage(error)");
    expect(after).not.toMatch(/if \(error\) throw error;/);
  }
});
