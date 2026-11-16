// Render-time benchmark: warm browser, one document at a time, best of N.
//   node scripts/bench.ts [runs=3]
// Wall-clock time is sensitive to other load on the machine; the report
// records the 1-minute load sample so numbers can be judged.
import { readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ROOT } from "../src/config.ts";
import { render } from "../src/render/render.ts";
import { getBrowser, closeBrowser } from "../src/render/browser.ts";
import { getRegistry } from "../src/templates/registry.ts";

const runs = Number(process.argv[2] ?? 3);
await getBrowser();
const rows: { doc: string; pages: number; kb: number; best: number; median: number }[] = [];
const cpuBefore = os.cpus().map((c) => c.times);
const t0 = Date.now();
for (const [type, e] of await getRegistry()) {
  for (const f of (await readdir(path.join(e.dir, "fixtures"))).filter((x) => x.endsWith(".json")).sort()) {
    const fx = JSON.parse(await readFile(path.join(e.dir, "fixtures", f), "utf8"));
    const times: number[] = [];
    let pages = 0;
    let bytes = 0;
    for (let i = 0; i < runs; i++) {
      const r = await render({ type, data: fx.data, variant: fx.variant, generatedAt: fx.generatedAt });
      times.push(r.ms);
      pages = r.pages;
      bytes = r.bytes;
    }
    times.sort((a, b) => a - b);
    rows.push({ doc: `${type}/${f.replace(/\.json$/, "")}`, pages, kb: Math.round(bytes / 1024), best: times[0], median: times[Math.floor(times.length / 2)] });
  }
}
const cpuAfter = os.cpus().map((c) => c.times);
let busy = 0;
let total = 0;
cpuAfter.forEach((a, i) => {
  const b = cpuBefore[i];
  const d = { user: a.user - b.user, nice: a.nice - b.nice, sys: a.sys - b.sys, idle: a.idle - b.idle, irq: a.irq - b.irq };
  busy += d.user + d.nice + d.sys + d.irq;
  total += d.user + d.nice + d.sys + d.irq + d.idle;
});
await closeBrowser();
const load = Math.round((busy / total) * 100);
const md = [
  "# Render benchmark",
  "",
  `Warm browser, sequential, best and median of ${runs} runs. ${os.cpus().length} logical CPUs at ${load}% average utilisation during the run (all processes on the machine), ${Math.round((Date.now() - t0) / 1000)} s total. Flags: over 3 s or over 1.5 MB.`,
  "",
  "| Document | Pages | Size | Best | Median | Flag |",
  "|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.doc} | ${r.pages} | ${r.kb} KB | ${r.best} ms | ${r.median} ms | ${r.best > 3000 || r.kb > 1536 ? "**over**" : ""} |`),
  "",
];
await writeFile(path.join(ROOT, "qa", "BENCHMARK.md"), md.join("\n"));
console.log(md.join("\n"));
