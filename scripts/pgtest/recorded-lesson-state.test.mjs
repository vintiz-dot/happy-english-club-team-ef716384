// src/lib/recordedLessonState.ts: what a teacher is told about a recorded lesson.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, g, w) => { const a = JSON.stringify(g), b = JSON.stringify(w); ok(n, a === b, a === b ? "" : `got ${a}, want ${b}`); };
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = readFileSync(resolve(repo, "src/lib/recordedLessonState.ts"), "utf8");
ok("imports nothing", !/^\s*import\s/m.test(src));
const out = join(mkdtempSync(join(tmpdir(), "rls-")), "s.mjs");
writeFileSync(out, (await transform(src, { loader: "ts", format: "esm" })).code);
const { recordedLessonState: S } = await import(pathToFileURL(out).href);

const base = { status: "complete", audioDeleted: false, hasReport: false, run: null, recordedS: 3000, lessonS: 3600 };
eq("complete, no report: queued for tonight", [S(base).key, S(base).tone, S(base).canPaste], ["queued", "wait", true]);
eq("a report: ready, nothing to paste", [S({ ...base, hasReport: true }).key, S({ ...base, hasReport: true }).canPaste], ["ready", false]);
ok("a report with the audio gone says so", /deleted from the server\./.test(S({ ...base, hasReport: true, audioDeleted: true }).text));
eq("abandoned: failed, paste offered", [S({ ...base, status: "abandoned", abandonReason: "no chunks" }).key, S({ ...base, status: "abandoned" }).canPaste], ["failed", true]);
ok("abandoned says how much was saved", /50 min were saved/.test(S({ ...base, status: "abandoned" }).text));
eq("uploading is not a failure", S({ ...base, status: "uploading" }).tone, "wait");
eq("complete with no audio saved is a failure", S({ ...base, recordedS: 0 }).key, "failed");
eq("a third of the lesson recorded: queued but flagged", [S({ ...base, recordedS: 1200 }).key, S({ ...base, recordedS: 1200 }).tone], ["queued", "bad"]);
ok("the flag says how much", /Only 20 of 60 minutes/.test(S({ ...base, recordedS: 1200 }).text));
eq("audio deleted and no report: gone, paste offered", [S({ ...base, audioDeleted: true }).key, S({ ...base, audioDeleted: true }).canPaste], ["gone", true]);
eq("refused by the laptop (admin sees it)", S({ ...base, run: { outcome: "refused", reason: "audio_gone" } }).key, "refused");
eq("failed run retries tonight", S({ ...base, run: { outcome: "failed", reason: "oom" } }).key, "retry");
eq("chunks unreadable: no invented amount", /Only/.test(S({ ...base, recordedS: null }).text), false);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
