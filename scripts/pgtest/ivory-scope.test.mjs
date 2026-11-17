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
eq("rollout complete (R24)", ROLLOUT_COMPLETE, true);
// With the rollout complete, everything is in the system except the screens whose owners keep them.
eq("complete: an unlisted path", isIvoryRoute("/no-such-page"), true);
eq("complete: OAuth consent", isIvoryRoute("/.lovable/oauth/consent"), true);
eq("complete: unknown admin tab", isIvoryRoute("/admin", "?tab=nope"), true);
eq("complete: /dashboard as family", isIvoryRoute("/dashboard", "", undefined, undefined, "family"), true);
eq("complete: / while the role is unknown", isIvoryRoute("/"), true);
eq("complete: audit clips stays outside", isIvoryRoute("/admin", "?tab=audit-clips"), false);
eq("complete: audit clips stays outside for an admin", isIvoryRoute("/admin", "?tab=audit-clips", undefined, undefined, "admin"), false);
eq("complete: recorder stays outside", isIvoryRoute("/teacher/recorder", "", undefined, undefined, "teacher"), false);
eq("complete: recorder, trailing slash", isIvoryRoute("/teacher/recorder/"), false);
eq("complete: public feedback page stays outside", isIvoryRoute("/feedback"), false);
eq("complete: admin overview still in", isIvoryRoute("/admin", "?tab=overview"), true);
eq("complete: an empty outside list leaves nothing out", isIvoryRoute("/teacher/recorder", "", [], true, "teacher", []), true);
// Below: the registry itself (the record of what flipped when), read with complete = false.
const listedIn = (p, s = "", R = undefined, _c = false, role = null) => isIvoryRoute(p, s, R, false, role);
eq("student dashboard", listedIn("/student/dashboard"), true);
eq("student dashboard, trailing slash", listedIn("/student/dashboard/"), true);
eq("student dashboard, any tab", listedIn("/student/dashboard", "?tab=achievements"), true);
eq("homework flipped (R08)", listedIn("/student/assignments"), true);
eq("lesson detail flipped", listedIn("/student/lessons/l-1"), true);
eq("vocabulary flipped, both paths", listedIn("/vocabulary") && listedIn("/student/vocabulary"), true);
// R21, the staff flip
eq("admin payroll flipped (R21)", listedIn("/admin", "?tab=payroll"), true);
eq("admin overview, no tab", listedIn("/admin"), true);
eq("admin overview, ?tab=overview", listedIn("/admin", "?tab=overview"), true);
for (const t of ["classes", "assignments", "journal", "exam-reports", "finance", "reports", "account", "automation", "data", "activity", "announcements", "stars-sync", "ai-actions"])
  eq(`admin ?tab=${t}`, listedIn("/admin", `?tab=${t}`), true);
eq("admin audit clips stays old (owner has not released it)", listedIn("/admin", "?tab=audit-clips"), false);
eq("admin unknown tab stays old", listedIn("/admin", "?tab=nope"), false);
for (const p of ["/admin/classes/c-1", "/admin/tuition-review", "/students", "/students/s-1", "/students/s-1/tuition", "/teachers", "/teachers/t-1", "/classes", "/families", "/families/f-1", "/board-window/c-1"])
  eq(`${p} (admin)`, listedIn(p, "", undefined, false, "admin"), true);
for (const p of ["/teacher/dashboard", "/teacher/classes/c-1", "/teacher/payroll", "/teacher/attendance", "/teacher/assignments", "/teacher/journal", "/teacher/exam-reports", "/teacher/leaderboards", "/teacher/resources", "/teacher/vocabulary-audit", "/teacher/books", "/teacher/language-support", "/teacher/smart-upload", "/teacher/transcripts", "/teacher/videos"])
  eq(`${p} (teacher)`, listedIn(p, "", undefined, false, "teacher"), true);
eq("teacher recorder stays old (owner has not released it)", listedIn("/teacher/recorder", "", undefined, false, "teacher"), false);
eq("/schedule as admin", listedIn("/schedule", "", undefined, false, "admin"), true);
eq("/schedule as teacher", listedIn("/schedule", "", undefined, false, "teacher"), true);
eq("/schedule as family flipped (R24)", listedIn("/schedule", "", undefined, false, "family"), true);
eq("/schedule as student flipped (R24)", listedIn("/schedule", "", undefined, false, "student"), true);
eq("/schedule while the role is unknown stays old", listedIn("/schedule"), false);
// R23, the parent + public flip
eq("parent dashboard flipped (R23)", listedIn("/family/dashboard", "", undefined, false, "family"), true);
eq("parent videos flipped (R23)", listedIn("/watch/abc"), true);
eq("parent videos needs a token", listedIn("/watch"), false);
eq("sign-in flipped (R23)", listedIn("/auth"), true);
eq("password reset flipped (R23)", listedIn("/auth/reset-password"), true);
eq("claim flipped (R23)", listedIn("/claim"), true);
eq("family hub on / flipped (R23)", listedIn("/", "", undefined, false, "family"), true);
eq("teacher hub on / flipped (R24)", listedIn("/", "", undefined, false, "teacher"), true);
eq("/ while the role is unknown stays old", listedIn("/"), false);
eq("OAuth consent not in the R23 list", listedIn("/.lovable/oauth/consent"), false);
eq("/tuition as student", listedIn("/tuition", "", undefined, false, "student"), true);
eq("/tuition as family", listedIn("/tuition", "", undefined, false, "family"), true);
eq("/tuition as admin (R21)", listedIn("/tuition", "", undefined, false, "admin"), true);
eq("/tuition as teacher (R21)", listedIn("/tuition", "", undefined, false, "teacher"), true);
eq("/tuition while the role is unknown stays old", listedIn("/tuition"), false);
eq("/dashboard as family stays old", listedIn("/dashboard", "", undefined, false, "family"), false);
eq("an unscoped entry ignores the role", listedIn("/student/journal", "", undefined, false, "admin"), true);
const R = [{ path: "/admin", tab: "payroll" }, { path: "/admin", tab: "" }, { path: "/student/lessons/:id" }];
eq("tab entry matches its tab", listedIn("/admin", "?tab=payroll", R, false), true);
eq("tab entry does not match another tab", listedIn("/admin", "?tab=finance", R, false), false);
eq("empty tab entry = no tab", listedIn("/admin", "", R, false), true);
eq(":param segment", listedIn("/student/lessons/abc-123", "", R, false), true);
eq(":param needs a value", listedIn("/student/lessons/", "", R, false), false);
eq("no prefix match", listedIn("/student/lessons/abc/x", "", R, false), false);
eq("complete = everywhere", isIvoryRoute("/anything", "", [], true), true);

console.log("theme choice");
eq("default is System now the rollout is complete", DEFAULT_THEME, "system");
eq("junk falls back to default", readThemeChoice("purple"), "system");
eq("null falls back to default", readThemeChoice(null), "system");
eq("light kept", readThemeChoice("light"), "light");
eq("dark kept", readThemeChoice("dark"), "dark");
eq("system kept", readThemeChoice("system"), "system");
eq("per user key", themeKey("u-1"), "hec-theme:u-1");
eq("signed-out key", themeKey(null), "hec-theme:signed-out");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
