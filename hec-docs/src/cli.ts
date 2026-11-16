// hec-docs CLI.
//   hec-docs render <type> <data.json> [--variant v] [--tenant t] [--out path] [--generated-at iso]
//   hec-docs batch <jobs.json> [--out-dir dir] [--concurrency n]
//   hec-docs list
//   hec-docs validate <type> <data.json>
// data.json is either the bare data object or an envelope {data, variant?, tenant?, generatedAt?}.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { render, renderHtml, type RenderRequest } from "./render/render.ts";
import { closeBrowser } from "./render/browser.ts";
import { getRegistry } from "./templates/registry.ts";
import { SchemaError } from "./schema.ts";
import { runBatch, writeManifest } from "./batch.ts";
import { config } from "./config.ts";

const USAGE = `Usage:
  hec-docs render <type> <data.json> [--variant <v>] [--tenant <t>] [--out <path>] [--generated-at <iso>] [--html]
  hec-docs batch <jobs.json> [--out-dir <dir>] [--concurrency <n>]
  hec-docs validate <type> <data.json>
  hec-docs list`;

export async function readEnvelope(file: string): Promise<Omit<RenderRequest, "type">> {
  const raw = JSON.parse(await readFile(file, "utf8"));
  if (raw && typeof raw === "object" && "data" in raw && typeof raw.data === "object") {
    return { data: raw.data, variant: raw.variant, tenant: raw.tenant, generatedAt: raw.generatedAt };
  }
  return { data: raw };
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      variant: { type: "string" },
      tenant: { type: "string" },
      out: { type: "string" },
      "out-dir": { type: "string" },
      "generated-at": { type: "string" },
      concurrency: { type: "string" },
      html: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [cmd, ...rest] = positionals;
  if (values.help || !cmd) {
    process.stdout.write(USAGE + "\n");
    return cmd ? 0 : 2;
  }
  if (cmd === "list") {
    for (const [type, e] of await getRegistry()) {
      process.stdout.write(`${type}@${e.manifest.version}  ${e.manifest.output}  variants: ${Object.keys(e.manifest.variants).join(", ")} (default ${e.manifest.defaultVariant})\n`);
    }
    return 0;
  }
  if (cmd === "validate" || cmd === "render") {
    const [type, file] = rest;
    if (!type || !file) throw new UsageError(`${cmd} needs <type> and <data.json>`);
    const env = await readEnvelope(file);
    const req: RenderRequest = {
      type,
      ...env,
      variant: values.variant ?? env.variant,
      tenant: values.tenant ?? env.tenant,
      generatedAt: values["generated-at"] ?? env.generatedAt,
    };
    if (cmd === "validate") {
      await renderHtml(req);
      process.stdout.write(`valid: ${type}\n`);
      return 0;
    }
    if (values.html) {
      const { html } = await renderHtml(req);
      const out = values.out ?? path.join(config.outDir, `${type}.html`);
      await mkdir(path.dirname(path.resolve(out)), { recursive: true });
      await writeFile(out, html);
      process.stdout.write(out + "\n");
      return 0;
    }
    const r = await render(req);
    const out = path.resolve(values.out ?? path.join(config.outDir, r.filename));
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, r.body);
    await writeManifest(path.dirname(out), [{ ok: true, id: path.basename(out), result: r, path: out }]);
    process.stdout.write(JSON.stringify({ out, filename: r.filename, pages: r.pages, bytes: r.bytes, ms: r.ms, sha256: r.sha256, warnings: r.warnings }) + "\n");
    return 0;
  }
  if (cmd === "batch") {
    const [file] = rest;
    if (!file) throw new UsageError("batch needs <jobs.json>");
    const jobs = JSON.parse(await readFile(file, "utf8"));
    if (!Array.isArray(jobs)) throw new UsageError("jobs.json must be an array of {type, data, variant?, tenant?, generatedAt?, out?}");
    const outDir = path.resolve(values["out-dir"] ?? config.outDir);
    const conc = values.concurrency ? Number(values.concurrency) : config.concurrency;
    const results = await runBatch(jobs, { concurrency: conc, outDir });
    await writeManifest(outDir, results);
    const failed = results.filter((r) => !r.ok).length;
    process.stdout.write(JSON.stringify({ outDir, total: results.length, failed }) + "\n");
    return failed ? 1 : 0;
  }
  throw new UsageError(`unknown command "${cmd}"`);
}

class UsageError extends Error {}

const isMain = process.argv[1] && /(cli\.ts|hec-docs(\.mjs)?)$/.test(process.argv[1]);
if (isMain) {
  main(process.argv.slice(2))
    .then((code) => (process.exitCode = code))
    .catch((err) => {
      if (err instanceof SchemaError) {
        process.stderr.write(`Invalid input for ${err.subject}:\n${err.errors.map((e) => `  ${e.path || "/"}: ${e.message}`).join("\n")}\n`);
        process.exitCode = 3;
      } else if (err instanceof UsageError) {
        process.stderr.write(`${err.message}\n${USAGE}\n`);
        process.exitCode = 2;
      } else {
        process.stderr.write(`${err?.stack ?? err}\n`);
        process.exitCode = 1;
      }
    })
    .finally(() => closeBrowser());
}
