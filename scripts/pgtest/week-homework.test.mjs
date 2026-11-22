// Day-by-day homework for the IELTS course (src/lib/lessonDecks/weekHomework.ts),
// driven over the real decks. What matters: every IELTS lesson gets the homework
// buttons (a week plan), each tier's week is exactly the slide's items for that
// tier (the same totals the course rules check), the days add up to the week, a
// child's tier comes from the class's groups (Core unless listed, Support wins a
// clash), and the text posted in the app names no child. Decks with a creative
// task keep their own homework buttons.
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { build, transform } from "esbuild";
import { readFileSync } from "node:fs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const tsOut = async (rel, name) => {
  const out = resolve(tmpdir(), `${name}.${process.pid}.mjs`);
  writeFileSync(out, (await transform(readFileSync(resolve(repo, rel), "utf8"), { loader: "ts", format: "esm" })).code);
  return import(pathToFileURL(out).href);
};
const W = await tsOut("src/lib/lessonDecks/weekHomework.ts", "wh-lib");
const R = await import(pathToFileURL(resolve(repo, "scripts/lesson-decks/ielts-rules.mjs")).href);

const dir = resolve(repo, "src/content/lessonDecks");
const units = [];
for (const f of readdirSync(dir).filter((x) => /^(hec-ielts-.*|od2e-l3-u12|od2e-l1-u01)\.ts$/.test(x))) {
  const out = resolve(tmpdir(), `wh-unit-${f}.${process.pid}.mjs`);
  await build({ entryPoints: [join(dir, f)], bundle: true, format: "esm", outfile: out, logLevel: "silent" });
  for (const v of Object.values(await import(pathToFileURL(out).href))) if (v && Array.isArray(v?.decks)) units.push({ f, u: v });
}
const ielts = units.filter((x) => x.u.curriculum === "hec-ielts-sl");
ok("found the IELTS terms", ielts.length >= 2, ielts.map((x) => x.f).join(", "));

console.log("every IELTS lesson gets a week plan");
for (const { f, u } of ielts) {
  eq(`${f}: Support and Stretch groups to choose from`, W.tierGroups(u).map((g) => g.interest), ["tier-support", "tier-stretch"]);
  for (const d of u.decks) {
    const hw = W.weekSlide(d);
    if (!d.slides.some((s) => s.kind === "homework")) continue;
    ok(`${d.id}: homework is a week plan`, W.isWeekHomework(d));
    const totals = R.homeworkMinutes(hw);
    for (const t of W.TIERS) {
      const p = W.weekPlan(d, t);
      ok(`${d.id} ${t}: the slide's items for the tier, in order`, JSON.stringify(p.items) === JSON.stringify(hw.items.filter((i) => !i.tier || i.tier === t)));
      eq(`${d.id} ${t}: the week matches the course's total`, p.minutes, totals[t]);
      ok(`${d.id} ${t}: the days add up to the week (rounding aside)`, Math.abs(p.days.reduce((m, x) => m + x.minutes, 0) - p.minutes) <= p.items.length);
      ok(`${d.id} ${t}: the app text lists every task and how it is checked`, p.items.every((i) => W.weekText(d, t).includes(i.label) && (!i.check || W.weekText(d, t).includes(i.check))));
    }
  }
}

console.log("a child's tier");
const A = "aaaaaaaa-0000-4000-8000-000000000000", B = "bbbbbbbb-0000-4000-8000-000000000000", C = "cccccccc-0000-4000-8000-000000000000";
const groups = { "tier-support": [A], "tier-stretch": [B, A] };
eq("listed for Support, Stretch, neither (Support wins a clash)", [W.tierOf(A, groups), W.tierOf(B, groups), W.tierOf(C, groups)], ["Support", "Stretch", "Core"]);
eq("no groups yet: everyone Core", W.tierOf(A, null), "Core");
eq("present children split by tier, in roster order", Object.fromEntries(Object.entries(W.byTier([{ id: C }, { id: B }, { id: A }], groups)).map(([k, v]) => [k, v.map((x) => x.id)])),
  { Support: [A], Core: [C], Stretch: [B] });

console.log("other courses keep their own homework buttons");
for (const { f, u } of units.filter((x) => x.u.curriculum !== "hec-ielts-sl")) {
  ok(`${f}: decks with a creative task are not week plans`, u.decks.every((d) => !W.isWeekHomework(d)));
  eq(`${f}: no tier groups`, W.tierGroups(u), []);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
