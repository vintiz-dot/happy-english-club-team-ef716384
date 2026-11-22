/**
 * _lib/claude-sonnet-chat.ts - the transcript analysis's first choice of model.
 *
 * analyze-transcript was written against OpenAI's chat-completions body
 * ({ model, messages, max_tokens, response_format }). Owner's ruling, 22 Nov 2026: run the
 * text analysis through Claude Sonnet and fall back to OpenAI. So the same body is taken here,
 * sent to Claude Sonnet as a JSON-only request, and the caller (openaiJson) falls back to OpenAI
 * when this throws (no key, error, timeout, refusal, cut-off or a reply that is not JSON).
 *
 * Imports nothing, so a node test can load it. Needs ANTHROPIC_API_KEY; ANALYSIS_CLAUDE_MODEL
 * overrides the model. No temperature is sent: the newest Claude models refuse it.
 */
export const ANALYSIS_CLAUDE_MODEL_DEFAULT = "claude-sonnet-5-5";

export class SonnetUnavailable extends Error {}

type ChatMessage = { role: string; content: unknown };

/** An OpenAI chat body as a Claude messages request. Pure. */
export function chatToClaudeRequest(body: Record<string, any>, model: string): Record<string, unknown> {
  const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
  const system = messages.filter((m) => m.role === "system").map((m) => String(m.content ?? "")).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content ?? ""),
  }));
  return {
    model,
    max_tokens: Number(body.max_tokens) > 0 ? Number(body.max_tokens) : 4000,
    system: `${system}\n\nReply with ONE JSON object and nothing else: no prose, no code fences.`.trim(),
    messages: rest.length ? rest : [{ role: "user", content: "Go." }],
  };
}

/** The JSON object in a Claude reply's text, or null. */
export function jsonFromClaudeText(text: string): any | null {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    const v = JSON.parse(text.slice(a, b + 1));
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

export async function sonnetJsonFromChat(
  body: Record<string, any>,
  label: string,
  timeoutMs: number,
  opts: { apiKey?: string; model?: string; fetchImpl?: typeof fetch } = {},
): Promise<any> {
  const env = (globalThis as any).Deno?.env;
  const apiKey = opts.apiKey ?? env?.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new SonnetUnavailable("ANTHROPIC_API_KEY is not set");
  const model = opts.model ?? env?.get("ANALYSIS_CLAUDE_MODEL") ?? ANALYSIS_CLAUDE_MODEL_DEFAULT;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await (opts.fetchImpl ?? fetch)("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(chatToClaudeRequest(body, model)),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`Claude ${label} error (${res.status})`);
    const data = await res.json();
    if (data.stop_reason === "refusal") throw new Error(`Claude ${label} declined the request`);
    if (data.stop_reason === "max_tokens") throw new Error(`Claude ${label} ran out of room`);
    const text = (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const parsed = jsonFromClaudeText(text);
    if (!parsed) throw new Error(`Claude ${label} reply was not JSON`);
    return parsed;
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw new Error(`Claude ${label} timed out after ${Math.round(timeoutMs / 1000)}s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
