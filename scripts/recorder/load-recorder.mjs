// Bundles src/lib/recorder (TypeScript) with esbuild and imports it, for the
// Node tests. Nothing browser-only runs at import time.
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

export const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function bundleRecorder({ format = "esm", platform = "neutral" } = {}) {
  const out = await build({
    entryPoints: [resolve(repo, "src/lib/recorder/index.ts")],
    bundle: true, format, platform, write: false, logLevel: "silent", target: "es2020",
  });
  return out.outputFiles[0].text;
}

export async function loadRecorder() {
  const file = resolve(tmpdir(), `hec-recorder.${process.pid}.${Date.now()}.mjs`);
  writeFileSync(file, await bundleRecorder());
  return import(pathToFileURL(file).href);
}
