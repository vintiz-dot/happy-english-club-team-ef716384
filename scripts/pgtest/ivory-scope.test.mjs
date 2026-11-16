// A4.6 foundations: the given-name rule (Vietnamese names are family name
// first) and the route registry that decides where the Ivory design system
// is switched on. Drives the real src/lib/givenName.ts and src/lib/ivoryScope.ts.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const bundle = async (rel) => {
  const out = await build({ entryPoints: [resolve(repo, rel)], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
  const file = join(mkdtempSync(join(tmpdir(), "ivory-")), "module.mjs");
  writeFileSync(file, out.outputFiles[0].text);
  return import(pathToFileURL(file).href);
};
const { givenName } = await bundle("src/lib/givenName.ts");
const { isIvoryRoute, readThemeChoice, themeKey, DEFAULT_THEME, ROLLOUT_COMPLETE } = await bundle("src/lib/ivoryScope.ts");

let pass = 0, fail = 0;
const eq = (n, got, want) => { const c = got === want; console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${c ? "" : ` :: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`); c ? pass++ : fail++; };

console.log("givenName");
eq("2 words", givenName("Trần Vy"), "Vy");
eq("3 words", givenName("Nguyễn Minh Anh"), "Anh");
eq("4 words", givenName("Lê Thị Bảo Ngọc"), "Ngọc");
eq("5 words, long fixture", givenName("Nguyễn Hoàng Phương Thảo Nguyên"), "Nguyên");
eq("diacritics kept exactly (ễ ư ơ đ)", givenName("Đặng Thị Thu Hường"), "Hường");
eq("NFD input is returned as given, not normalised", givenName("Phạm Anh Thư".normalize("NFD")), "Thư".normalize("NFD"));
eq("one word", givenName("Bông"), "Bông");
eq("extra spaces and tabs", givenName("  Nguyễn   Minh\tAnh  "), "Anh");
eq("empty", givenName(""), "");
eq("null", givenName(null), "");
eq("undefined", givenName(undefined), "");
eq("preferred name wins", givenName("Nguyễn Minh Anh", "Bin"), "Bin");
eq("blank preferred name ignored", givenName("Nguyễn Minh Anh", "   "), "Anh");

console.log("isIvoryRoute");
eq("rollout not complete yet", ROLLOUT_COMPLETE, false);
eq("student dashboard", isIvoryRoute("/student/dashboard"), true);
eq("student dashboard, trailing slash", isIvoryRoute("/student/dashboard/"), true);
eq("student dashboard, any tab", isIvoryRoute("/student/dashboard", "?tab=achievements"), true);
eq("homework flipped (R08)", isIvoryRoute("/student/assignments"), true);
eq("lesson detail flipped", isIvoryRoute("/student/lessons/l-1"), true);
eq("vocabulary flipped, both paths", isIvoryRoute("/vocabulary") && isIvoryRoute("/student/vocabulary"), true);
// R21, the staff flip
eq("admin payroll flipped (R21)", isIvoryRoute("/admin", "?tab=payroll"), true);
eq("admin overview, no tab", isIvoryRoute("/admin"), true);
eq("admin overview, ?tab=overview", isIvoryRoute("/admin", "?tab=overview"), true);
for (const t of ["classes", "assignments", "journal", "exam-reports", "finance", "reports", "account", "automation", "data", "activity", "announcements", "stars-sync", "ai-actions"])
  eq(`admin ?tab=${t}`, isIvoryRoute("/admin", `?tab=${t}`), true);
eq("admin audit clips stays old (owner has not released it)", isIvoryRoute("/admin", "?tab=audit-clips"), false);
eq("admin unknown tab stays old", isIvoryRoute("/admin", "?tab=nope"), false);
for (const p of ["/admin/classes/c-1", "/admin/tuition-review", "/students", "/students/s-1", "/students/s-1/tuition", "/teachers", "/teachers/t-1", "/classes", "/families", "/families/f-1", "/board-window/c-1"])
  eq(`${p} (admin)`, isIvoryRoute(p, "", undefined, false, "admin"), true);
for (const p of ["/teacher/dashboard", "/teacher/classes/c-1", "/teacher/payroll", "/teacher/attendance", "/teacher/assignments", "/teacher/journal", "/teacher/exam-reports", "/teacher/leaderboards", "/teacher/resources", "/teacher/vocabulary-audit", "/teacher/books", "/teacher/language-support", "/teacher/smart-upload", "/teacher/transcripts", "/teacher/videos"])
  eq(`${p} (teacher)`, isIvoryRoute(p, "", undefined, false, "teacher"), true);
eq("teacher recorder stays old (owner has not released it)", isIvoryRoute("/teacher/recorder", "", undefined, false, "teacher"), false);
eq("/schedule as admin", isIvoryRoute("/schedule", "", undefined, false, "admin"), true);
eq("/schedule as teacher", isIvoryRoute("/schedule", "", undefined, false, "teacher"), true);
eq("/schedule as family stays old (R23)", isIvoryRoute("/schedule", "", undefined, false, "family"), false);
eq("/schedule as student stays old", isIvoryRoute("/schedule", "", undefined, false, "student"), false);
eq("/schedule while the role is unknown stays old", isIvoryRoute("/schedule"), false);
eq("parent dashboard not migrated yet", isIvoryRoute("/family/dashboard", "", undefined, false, "family"), false);
eq("parent videos not migrated yet", isIvoryRoute("/watch/abc"), false);
eq("sign-in not migrated yet", isIvoryRoute("/auth"), false);
eq("claim not migrated yet", isIvoryRoute("/claim"), false);
eq("home not migrated yet", isIvoryRoute("/", "", undefined, false, "family"), false);
eq("/tuition as student", isIvoryRoute("/tuition", "", undefined, false, "student"), true);
eq("/tuition as family", isIvoryRoute("/tuition", "", undefined, false, "family"), true);
eq("/tuition as admin (R21)", isIvoryRoute("/tuition", "", undefined, false, "admin"), true);
eq("/tuition as teacher (R21)", isIvoryRoute("/tuition", "", undefined, false, "teacher"), true);
eq("/tuition while the role is unknown stays old", isIvoryRoute("/tuition"), false);
eq("/dashboard as family stays old", isIvoryRoute("/dashboard", "", undefined, false, "family"), false);
eq("an unscoped entry ignores the role", isIvoryRoute("/student/journal", "", undefined, false, "admin"), true);
const R = [{ path: "/admin", tab: "payroll" }, { path: "/admin", tab: "" }, { path: "/student/lessons/:id" }];
eq("tab entry matches its tab", isIvoryRoute("/admin", "?tab=payroll", R, false), true);
eq("tab entry does not match another tab", isIvoryRoute("/admin", "?tab=finance", R, false), false);
eq("empty tab entry = no tab", isIvoryRoute("/admin", "", R, false), true);
eq(":param segment", isIvoryRoute("/student/lessons/abc-123", "", R, false), true);
eq(":param needs a value", isIvoryRoute("/student/lessons/", "", R, false), false);
eq("no prefix match", isIvoryRoute("/student/lessons/abc/x", "", R, false), false);
eq("complete = everywhere", isIvoryRoute("/anything", "", [], true), true);

console.log("theme choice");
eq("default is Light until the rollout completes", DEFAULT_THEME, "light");
eq("junk falls back to default", readThemeChoice("purple"), "light");
eq("null falls back to default", readThemeChoice(null), "light");
eq("dark kept", readThemeChoice("dark"), "dark");
eq("system kept", readThemeChoice("system"), "system");
eq("per user key", themeKey("u-1"), "hec-theme:u-1");
eq("signed-out key", themeKey(null), "hec-theme:signed-out");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
