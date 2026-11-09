#!/usr/bin/env node
/**
 * Checks the API keys the video homework feature needs, without spending
 * anything: each check only lists or looks up a model, or asks Azure for a
 * 10-minute token. Keys are read from the environment and never printed.
 *
 *   PowerShell:
 *     $env:AZURE_SPEECH_KEY="..."; $env:OPENAI_API_KEY="..."
 *     $env:ANTHROPIC_API_KEY="..."; $env:GEMINI_API_KEY="..."
 *     node scripts/check-ai-keys.mjs
 *
 * Leave out any key you don't have yet; it is reported as "not set".
 * AZURE_SPEECH_REGION defaults to southeastasia (what the app uses).
 * CLAUDE_MODEL / GEMINI_MODEL default to what the functions use.
 */
const env = process.env;
const region = env.AZURE_SPEECH_REGION || "southeastasia";
const claudeModel = env.CLAUDE_MODEL || "claude-opus-5-5";
const geminiModel = env.GEMINI_MODEL || "gemini-2.5-flash";

const explain = (status) =>
  ({ 400: "bad request", 401: "key rejected (wrong or revoked)", 403: "key not allowed (wrong region, quota, or billing)",
     404: "not found (model name or region wrong)", 429: "rate limited / out of credit" })[status] ?? `HTTP ${status}`;

async function check(name, key, run) {
  if (!key) return { name, result: "not set", ok: null };
  try {
    const res = await run(key);
    const body = await res.text();
    if (res.ok) return { name, result: "works", ok: true };
    const msg = (() => { try { const j = JSON.parse(body); return j.error?.message || j.error?.type || j.message || ""; } catch { return body.slice(0, 120); } })();
    return { name, result: `${explain(res.status)}${msg ? ` - ${String(msg).slice(0, 160)}` : ""}`, ok: false };
  } catch (e) {
    return { name, result: `could not connect: ${e.message}`, ok: false };
  }
}

const results = await Promise.all([
  check(`Azure Speech (${region})`, env.AZURE_SPEECH_KEY, (k) =>
    fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: "POST", headers: { "Ocp-Apim-Subscription-Key": k, "Content-Length": "0" },
    })),
  check("OpenAI (whisper-1)", env.OPENAI_API_KEY, (k) =>
    fetch("https://api.openai.com/v1/models/whisper-1", { headers: { Authorization: `Bearer ${k}` } })),
  check(`Anthropic (${claudeModel})`, env.ANTHROPIC_API_KEY, (k) =>
    fetch(`https://api.anthropic.com/v1/models/${claudeModel}`, {
      headers: { "x-api-key": k, "anthropic-version": "2023-06-01" },
    })),
  check(`Gemini (${geminiModel})`, env.GEMINI_API_KEY, (k) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}`, { headers: { "x-goog-api-key": k } })),
]);

for (const r of results) {
  const mark = r.ok === null ? "  -  " : r.ok ? " OK  " : "FAIL ";
  console.log(`${mark} ${r.name.padEnd(36)} ${r.result}`);
}
console.log("\nGemini is optional. A key that works here still has to be added to Supabase as a secret.");
process.exitCode = results.some((r) => r.ok === false) ? 1 : 0;
