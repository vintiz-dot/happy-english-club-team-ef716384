// Structured JSON logs, one object per line on stderr (stdout is kept for CLI
// output). Never log document data: fields here are ids, sizes and timings.
import { config } from "./config.ts";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

function emit(level: Level, event: string, fields: Record<string, unknown> = {}) {
  if (LEVELS[level] < LEVELS[config.logLevel]) return;
  if (process.env.HEC_DOCS_SILENT === "1") return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  process.stderr.write(line + "\n");
}

export const log = {
  debug: (e: string, f?: Record<string, unknown>) => emit("debug", e, f),
  info: (e: string, f?: Record<string, unknown>) => emit("info", e, f),
  warn: (e: string, f?: Record<string, unknown>) => emit("warn", e, f),
  error: (e: string, f?: Record<string, unknown>) => emit("error", e, f),
};
