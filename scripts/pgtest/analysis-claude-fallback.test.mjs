// analyze-transcript runs its text analysis through Claude Sonnet first (owner, 22 Nov 2026); the module that
// does the call must turn an OpenAI chat body into a Claude request and refuse anything that is not clean JSON,
// so that openaiJson falls back to OpenAI. Loads the real _lib file (it imports nothing).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) pass++; else { fail++; console.log("  FAIL ", n); } };
const rd = (p) => readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url)), "utf8");
const src = rd("supabase/functions/_lib/claude-sonnet-chat.ts");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const M = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

const body = { model: "gpt-4o-mini", temperature: 0.2, max_tokens: 3000, response_format: { type: "json_object" },
  messages: [{ role: "system", content: "SYS" }, { role: "user", content: "USER" }] };
const req = M.chatToClaudeRequest(body, "claude-sonnet-5-5");
ok("model is Claude's", req.model === "claude-sonnet-5-5");
ok("system moved out of messages, JSON-only rule added", req.system.startsWith("SYS") && /ONE JSON object/.test(req.system));
ok("only the user turn stays in messages", req.messages.length === 1 && req.messages[0].role === "user" && req.messages[0].content === "USER");
ok("max_tokens carried, no temperature sent", req.max_tokens === 3000 && !("temperature" in req));

ok("JSON inside a fence is found", M.jsonFromClaudeText('```json\n{"a":1}\n```').a === 1);
ok("prose is not JSON", M.jsonFromClaudeText("sorry, no") === null);
ok("a broken object is not JSON", M.jsonFromClaudeText('{"a":') === null);

const reply = (o, status = 200) => async () => ({ ok: status === 200, status, json: async () => o });
const run = (o, status) => M.sonnetJsonFromChat(body, "t", 5000, { apiKey: "k", fetchImpl: reply(o, status) });
ok("a good reply parses", (await run({ stop_reason: "end_turn", content: [{ type: "text", text: '{"x":2}' }] })).x === 2);
for (const [n, o, st] of [["HTTP error", {}, 529], ["refusal", { stop_reason: "refusal", content: [] }], ["cut off", { stop_reason: "max_tokens", content: [{ type: "text", text: "{" }] }], ["not JSON", { stop_reason: "end_turn", content: [{ type: "text", text: "no" }] }]]) {
  let threw = false; try { await run(o, st); } catch { threw = true; }
  ok(`${n} throws (so OpenAI takes over)`, threw);
}
let unavailable = false; try { await M.sonnetJsonFromChat(body, "t", 1000, { apiKey: "", fetchImpl: reply({}) }); } catch (e) { unavailable = e instanceof M.SonnetUnavailable; }
ok("no key: SonnetUnavailable (quiet fallback)", unavailable);

const fn = rd("supabase/functions/analyze-transcript/index.ts");
ok("analyze-transcript tries Sonnet inside openaiJson, before the OpenAI fetch", fn.indexOf("sonnetJsonFromChat(body") > 0 && fn.indexOf("sonnetJsonFromChat(body") < fn.indexOf("api.openai.com/v1/chat/completions"));

// Instant class report (owner, 22 Nov 2026): the laptop asks for the draft with from_monitor right after saving a
// transcript, and only an admin caller of a lesson that HAS a monitor report gets the service-key read.
const ld = rd("supabase/functions/lesson-report-draft/index.ts"), ny = rd("scripts/lesson-monitor/nightly.py");
ok("laptop requests the draft with from_monitor after saving", /"from_monitor": True/.test(ny) && /lesson_monitor_save_report[\s\S]*follow_class_report\(api, row\)/.test(ny)
  // 27 Nov 2026: after saving, the class report is followed (classwork.py: built once the lesson's class work is read)
  && /def follow_class_report[\s\S]*?request_lesson_report/.test(ny));
ok("service-key transcript read needs admin-only + from_monitor + no transcript via RLS", /!monitorBody && isAdminOnly && fromMonitor/.test(ld));
ok("service-key read is one lesson's report only", /from\("lesson_monitor_reports"\)\.select\("body"\)\.eq\("session_id", sid\)/.test(ld));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
