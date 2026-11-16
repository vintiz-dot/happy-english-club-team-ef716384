// HTML -> PNG for image documents (the profile share card). Same isolated,
// offline page as PDFs; the element marked [data-capture] is screenshotted.
import { openIsolatedPage, ASSET_ORIGIN, type AssetMount } from "./browser.ts";

export async function renderPng(opts: {
  html: string;
  mounts: AssetMount[];
  raster: { width: number; height: number; scale: number };
  timeoutMs: number;
}): Promise<{ png: Buffer; overflow: string[]; text: string }> {
  const job = await openIsolatedPage({ html: opts.html, mounts: opts.mounts, javaScript: true, deviceScaleFactor: opts.raster.scale });
  try {
    const { page } = job;
    page.setDefaultTimeout(opts.timeoutMs);
    await page.setViewportSize({ width: opts.raster.width, height: opts.raster.height });
    await page.goto(`${ASSET_ORIGIN}/doc.html`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-qa-fit]")]
        .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
        .map((el) => el.getAttribute("data-qa-fit") || ""),
    );
    const text = await page.evaluate(() => document.body.innerText);
    const el = page.locator("[data-capture]").first();
    const png = await el.screenshot({ type: "png", animations: "disabled", scale: "device", omitBackground: false });
    return { png: Buffer.from(png), overflow, text };
  } finally {
    await job.close().catch(() => {});
  }
}
