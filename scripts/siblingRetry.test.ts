import { expect, test } from "bun:test";
import { siblingRetryDelayMs, SIBLING_RETRY_MAX_ATTEMPTS } from "../src/lib/siblingRetry";

test("an unresolved family discount is retried automatically, backing off", () => {
  expect(siblingRetryDelayMs("unresolved", 0)).toBe(3000);
  expect(siblingRetryDelayMs("unresolved", 1)).toBe(6000);
  expect(siblingRetryDelayMs("unresolved", 5)).toBe(30000);
});

test("retrying stops once the discount is settled", () => {
  expect(siblingRetryDelayMs("assigned", 0)).toBe(false);
  expect(siblingRetryDelayMs("none", 0)).toBe(false);
  expect(siblingRetryDelayMs(undefined, 0)).toBe(false);
});

test("retrying gives up after the attempt limit", () => {
  expect(siblingRetryDelayMs("unresolved", SIBLING_RETRY_MAX_ATTEMPTS)).toBe(false);
});
