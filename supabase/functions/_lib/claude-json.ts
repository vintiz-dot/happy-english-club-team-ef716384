/**
 * _lib/claude-json.ts - one Claude call that must come back as JSON.
 *
 * Used by video-rubric and analyze-video-submission. Structured outputs
 * (output_config.format) hold the reply to the schema, so the caller
 * parses JSON rather than hoping for it. The server-side fallback is on:
 * if the model declines a request (rare for homework, but children's
 * content trips classifiers more than adults'), the API retries it on a
 * fallback model inside the same call instead of failing the analysis.
 *
 * Needs ANTHROPIC_API_KEY. CLAUDE_MODEL overrides the model.
 */
import Anthropic from "npm:@anthropic-ai/sdk@0.136.0";

export const CLAUDE_MODEL = Deno.env.get("CLAUDE_MODEL") || "claude-opus-5-5";

export class ClaudeUnavailable extends Error {}

export interface ClaudeJsonResult<T> {
  data: T;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

export async function askClaudeJson<T>(opts: {
  system: string;
  content: unknown[];
  schema: Record<string, unknown>;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<ClaudeJsonResult<T>> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new ClaudeUnavailable("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: opts.effort ?? "high",
      format: { type: "json_schema", schema: opts.schema },
    },
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
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
    model: String(response.model ?? CLAUDE_MODEL),
    usage: {
      input_tokens: Number(response.usage?.input_tokens ?? 0),
      output_tokens: Number(response.usage?.output_tokens ?? 0),
    },
  };
}
