import { beforeEach, expect, mock, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

// A stand-in for the Supabase client: two families, each with its own children,
// and a counter of requests so the tests can see what was asked.
const families: Record<string, string> = { "u-a": "f-a", "u-b": "f-b" };
const kids: Record<string, any[]> = {
  "f-a": [
    { id: "a1", full_name: "Anh An", date_of_birth: null, is_active: true },
    { id: "a2", full_name: "Bao An", date_of_birth: null, is_active: true },
  ],
  "f-b": [{ id: "b1", full_name: "Chi Binh", date_of_birth: null, is_active: true }],
};
let calls: string[] = [];
let failStudents = false;

function builder(table: string) {
  const f: Record<string, any> = {};
  const q: any = {
    select: () => q,
    eq: (c: string, v: any) => ((f[c] = v), q),
    order: () => q,
    maybeSingle: () => q,
    then: (res: any, rej: any) => {
      calls.push(table + ":" + JSON.stringify(f));
      let out: any;
      if (table === "families") {
        const id = families[f.primary_user_id];
        out = { data: id ? { id } : null, error: null };
      } else if (failStudents) {
        out = { data: null, error: { message: "boom" } };
      } else {
        out = { data: f.family_id ? kids[f.family_id] ?? [] : [], error: null };
      }
      return Promise.resolve(out).then(res, rej);
    },
  };
  return q;
}
mock.module("@/integrations/supabase/client", () => ({ supabase: { from: builder } }));

const { loadMyStudents, clearShellCache, shellStudentsKey } = await import("../src/hooks/useShellQueries");

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient();
  calls = [];
  failStudents = false;
});

const names = (rows: any[] | null) => (rows ?? []).map((r) => r.full_name);

test("simultaneous asks for one user share a single pair of requests", async () => {
  const [x, y, z] = await Promise.all([loadMyStudents(qc, "u-a"), loadMyStudents(qc, "u-a"), loadMyStudents(qc, "u-a")]);
  expect(names(x)).toEqual(["Anh An", "Bao An"]);
  expect(y).toBe(x);
  expect(z).toBe(x);
  expect(calls.length).toBe(2); // families, students
});

test("user A's cached children are never returned for user B", async () => {
  await loadMyStudents(qc, "u-a");
  const b = await loadMyStudents(qc, "u-b");
  expect(names(b)).toEqual(["Chi Binh"]);
  expect(qc.getQueryData(shellStudentsKey("u-a"))).toBeDefined();
  expect(qc.getQueryData(shellStudentsKey("u-b"))).toBeDefined();
  // and back again: each id still gets its own list
  expect(names(await loadMyStudents(qc, "u-a"))).toEqual(["Anh An", "Bao An"]);
});

test("the cache key contains the user id", () => {
  expect(shellStudentsKey("u-a")).toContain("u-a");
  expect(shellStudentsKey("u-a")).not.toEqual(shellStudentsKey("u-b"));
});

test("sign-out clears everything the shell remembered", async () => {
  await loadMyStudents(qc, "u-a");
  qc.setQueryData(["identity", "u-a"], { name: "Anh An" });
  qc.setQueryData(["unrelated", "x"], 1);
  clearShellCache(qc);
  expect(qc.getQueryData(shellStudentsKey("u-a"))).toBeUndefined();
  expect(qc.getQueryData(["identity", "u-a"])).toBeUndefined();
  expect(qc.getQueryData(["unrelated", "x"])).toBe(1);
  // after sign-out and a different family signing in, nothing of A comes back
  calls = [];
  const b = await loadMyStudents(qc, "u-b");
  expect(names(b)).toEqual(["Chi Binh"]);
  expect(calls.length).toBe(2);
});

test("a failed request is returned as before but never remembered", async () => {
  failStudents = true;
  const first = await loadMyStudents(qc, "u-a");
  expect(first).toBeNull();
  expect(qc.getQueryData(shellStudentsKey("u-a"))).toBeUndefined();
  failStudents = false;
  const second = await loadMyStudents(qc, "u-a");
  expect(names(second)).toEqual(["Anh An", "Bao An"]);
});

test("a login with no family falls back to the linked student row", async () => {
  const rows = await loadMyStudents(qc, "u-nobody");
  expect(rows).toEqual([]);
  expect(calls[1]).toContain("linked_user_id");
});

test("profile switch: the list is the same, the chosen child comes from the selection", async () => {
  // The list is per login, not per selected child, so switching child neither
  // refetches nor serves a stale name: the name shown is list.find(selectedId).
  const list = (await loadMyStudents(qc, "u-a"))!;
  let selected = "a1";
  const shown = () => list.find((s: any) => s.id === selected)?.full_name;
  expect(shown()).toBe("Anh An");
  selected = "a2";
  expect(shown()).toBe("Bao An");
  const again = await loadMyStudents(qc, "u-a");
  expect(again).toBe(list);
  expect(calls.length).toBe(2);
});
