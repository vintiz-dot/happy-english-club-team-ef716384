/**
 * _lib/claude-cheap.ts - one small, cheap Claude call that comes back as JSON.
 *
 * For high-volume, simple jobs (a word's definition, checking a child's
 * sentence): Claude Haiku 5.5, thinking off, low effort, a tight max_tokens,
 * structured outputs holding the reply to the schema. The heavy helper
 * (`claude-json.ts`, Opus with adaptive thinking) stays for rubric scoring and
 * reports; do not use this one there.
 *
 * Haiku has no server-side refusal fallback, so a refusal is an error the
 * caller handles (save-word lets a save through on the deterministic checks;
 * word-enrichment answers 502 and caches nothing).
 *
 * Needs ANTHROPIC_API_KEY. CLAUDE_CHEAP_MODEL overrides the model.
 */
import Anthropic from "npm:@anthropic-ai/sdk@0.136.0";

export const CLAUDE_CHEAP_MODEL = Deno.env.get("CLAUDE_CHEAP_MODEL") || "claude-haiku-5-5";

export class ClaudeCheapUnavailable extends Error {}

export interface CheapResult<T> {
  data: T;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

export async function askClaudeCheap<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens: number;
}): Promise<CheapResult<T>> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new ClaudeCheapUnavailable("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 30_000 });
  const response: any = await (client.messages as any).create({
    model: CLAUDE_CHEAP_MODEL,
    max_tokens: opts.maxTokens,
    thinking: { type: "disabled" },
    output_config: { effort: "low", format: { type: "json_schema", schema: opts.schema } },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`The model declined this request (${response.stop_details?.category ?? "no category"})`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("The model ran out of room before finishing");
  }
  const text = (response.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error("The model's reply was not valid JSON");
  }
  return {
    data,
    model: String(response.model ?? CLAUDE_CHEAP_MODEL),
    usage: {
      input_tokens: Number(response.usage?.input_tokens ?? 0),
      output_tokens: Number(response.usage?.output_tokens ?? 0),
    },
  };
}
