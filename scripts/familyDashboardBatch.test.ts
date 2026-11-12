// A3.3: the batched family dashboard query must return exactly what the old
// per-child query returned. "Before" is the queryFn of FamilyDashboard.tsx at
// commit 6f0af6e (read with git), "after" is fetchChildren in the working file.
import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ORIGINAL_REF = "6f0af6e";
const FILE = "src/pages/FamilyDashboard.tsx";
const transpiler = new Bun.Transpiler({ loader: "ts" });

function compile(code: string, param: string): any {
  const js = transpiler.transformSync(`async function __f(${param}: any): Promise<any> {${code}
}`);
  return new Function(`${js}
return __f;`)();
}

function loadBefore(): (supabase: any) => Promise<any> {
  const src = execFileSync("git", ["show", `${ORIGINAL_REF}:${FILE}`], { encoding: "utf8" }).replace(/\r\n/g, "\n");
  const a = src.indexOf("queryFn: async () => {") + "queryFn: async () => {".length;
  const b = src.indexOf("\n    },\n  });\n}\n\nexport default");
  return compile(src.slice(a, b), "supabase");
}

function loadAfter(): (client: any) => Promise<any> {
  const src = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  const a = src.indexOf("// BEGIN fetchChildren");
  const b = src.indexOf("// END fetchChildren");
  const body = src.slice(a, b).replace("export async function fetchChildren", "async function fetchChildren");
  return (client: any) => new Function("client", `${transpiler.transformSync(body)}
return fetchChildren(client);`)(client);
}

type Db = Record<string, any[]>;
let requests: { table: string; filters: string }[] = [];

function fakeClient(db: Db, opts: { errorOn?: string } = {}) {
  class Q {
    f: any[] = []; one = false; lim: number | null = null; ord: any[] = [];
    constructor(public t: string) {}
    select() { return this; }
    eq(c: string, v: any) { this.f.push((r: any) => r[c] === v); return this; }
    in(c: string, v: any[]) { this.f.push((r: any) => v.includes(r[c])); return this; }
    gte(c: string, v: any) { this.f.push((r: any) => r[c] >= v); return this; }
    order(c: string, o?: any) { this.ord.push([c, o?.ascending !== false]); return this; }
    limit(n: number) { this.lim = n; return this; }
    maybeSingle() { this.one = true; return this; }
    then(res: any, rej: any) {
      return Promise.resolve().then(() => {
        requests.push({ table: this.t, filters: String(this.f.length) });
        if (opts.errorOn === this.t) return { data: null, error: { message: "boom" } };
        let rows = (db[this.t] || []).filter((r) => this.f.every((p) => p(r)));
        for (const [c, asc] of [...this.ord].reverse())
          rows = [...rows].sort((x, y) => (x[c] < y[c] ? -1 : x[c] > y[c] ? 1 : 0) * (asc ? 1 : -1));
        if (this.lim != null) rows = rows.slice(0, this.lim);
        rows = JSON.parse(JSON.stringify(rows));
        if (this.one) {
          if (rows.length > 1) return { data: null, error: { code: "PGRST116" } }; // real PostgREST
          return { data: rows[0] ?? null, error: null };
        }
        return { data: rows, error: null };
      }).then(res, rej);
    }
  }
  return { from: (t: string) => new Q(t) };
}

const today = new Date();
const dayStr = (back: number) => new Date(today.getTime() - back * 86_400_000).toISOString().slice(0, 10);

function family(n: number): Db {
  const db: Db = { students: [], student_learning_profiles: [], student_points: [], attendance: [], enrollments: [], lesson_overviews: [] };
  const names = ["Zed", "Amy", "Bao", "Chi", "Dung", "Em"];
  for (let i = 0; i < n; i++) {
    const id = `s${i}`;
    db.students.push({ id, full_name: names[i], avatar_url: i % 2 ? null : `http://a/${i}`, is_active: true });
    if (i !== 1) db.student_learning_profiles.push({ student_id: id, summary: `journey ${i}`, cefr_estimate: i % 3 ? "A1" : null });
    if (i !== 2) db.student_points.push({ student_id: id, total_points: 10 + i });
    if (i !== 3) db.enrollments.push({ student_id: id, class_id: i % 2 ? "cB" : "cA" }, { student_id: id, class_id: "cA" });
    for (let d = 0; d < 6; d++) db.attendance.push({ student_id: id, date: dayStr(d * 7), status: ["Present", "Late", "Absent"][(d + i) % 3] });
  }
  db.students.push({ id: "inactive", full_name: "Gone", avatar_url: null, is_active: false });
  for (let d = 0; d < 6; d++) {
    db.lesson_overviews.push({ class_id: "cA", lesson_date: dayStr(d), title: `A${d}`, summary: `sa${d}`, homework: d % 2 ? null : "hw" });
    db.lesson_overviews.push({ class_id: "cB", lesson_date: dayStr(d + 1), title: `B${d}`, summary: null, homework: null });
  }
  return db;
}

for (const n of [1, 2, 6]) {
  test(`family of ${n}: batched output is byte-identical to the per-child output`, async () => {
    const db = family(n);
    // the fake must tell children apart or this proof would be vacuous
    const probe = fakeClient(db);
    const one = await (probe as any).from("student_points").eq("student_id", "s0");
    expect(one.data.length).toBe(1);
    expect(JSON.stringify(one.data)).not.toContain("s1");

    requests = [];
    const before = JSON.stringify(await loadBefore()(fakeClient(db)));
    const nBefore = requests.length;
    requests = [];
    const after = JSON.stringify(await loadAfter()(fakeClient(db)));
    const nAfter = requests.length;
    expect(after).toBe(before);
    expect(JSON.parse(after).length).toBe(n);
    console.log(`family=${n} requests before=${nBefore} after=${nAfter} bytes=${before.length}`);
    expect(nAfter).toBeLessThanOrEqual(nBefore);
    if (n >= 2) expect(nAfter).toBeLessThan(nBefore);
  });
}

test("edge rows: no profile (s1), no points (s2), no enrolment (s3) appear in the output", async () => {
  const out = JSON.parse(JSON.stringify(await loadAfter()(fakeClient(family(6)))));
  const by = Object.fromEntries(out.map((c: any) => [c.id, c]));
  expect(by.s1.cefr).toBeNull(); expect(by.s1.journey).toBeNull();
  expect(by.s2.total_points).toBe(0);
  expect(by.s3.lessons).toEqual([]);
});

test("a duplicate profile/points row gives null/0 exactly as maybeSingle did", async () => {
  const db = family(2);
  db.student_points.push({ student_id: "s0", total_points: 99 });
  db.student_learning_profiles.push({ student_id: "s0", summary: "dup", cefr_estimate: "B2" });
  const before = JSON.stringify(await loadBefore()(fakeClient(db)));
  const after = JSON.stringify(await loadAfter()(fakeClient(db)));
  expect(after).toBe(before);
  expect(JSON.parse(after).find((c: any) => c.id === "s0").total_points).toBe(0);
});

test("a batched result at the 1000-row cap, or an error, falls back to the per-child path", async () => {
  const db = family(2);
  const expected = JSON.stringify(await loadBefore()(fakeClient(db)));
  const big = family(2);
  for (let i = 0; i < 1000; i++) big.attendance.push({ student_id: "s0", date: dayStr(i % 20), status: "Absent" });
  requests = [];
  const bigBefore = JSON.stringify(await loadBefore()(fakeClient(big)));
  const nBefore = requests.length;
  requests = [];
  const bigAfter = JSON.stringify(await loadAfter()(fakeClient(big)));
  expect(bigAfter).toBe(bigBefore);
  // 1 students + 4 batched + per-child (2 * 5 - lessons shared none): fell back
  expect(requests.length).toBeGreaterThan(nBefore);
  requests = [];
  const errAfter = JSON.stringify(await loadAfter()(fakeClient(db, { errorOn: "attendance" })));
  const errBefore = JSON.stringify(await loadBefore()(fakeClient(db, { errorOn: "attendance" })));
  expect(errAfter).toBe(errBefore);
  expect(expected.length).toBeGreaterThan(0);
});
