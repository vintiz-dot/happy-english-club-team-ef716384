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
eq("homework not migrated yet", isIvoryRoute("/student/assignments"), false);
eq("admin not migrated yet", isIvoryRoute("/admin", "?tab=payroll"), false);
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
