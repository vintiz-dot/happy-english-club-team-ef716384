/**
 * HEC Docs in the app: premium, text-based PDFs (and the profile PNG) made
 * from the shared templates in hec-docs/.
 *
 * How a document is made:
 *  1. In this browser: the engine (engine.generated.js, built by
 *     `npm run build:app` in hec-docs/) checks the data against the
 *     template's schema and renders the page.
 *  2. In the cloud: the printer Worker (hec-docs/worker, Cloudflare free
 *     plan) prints it with Cloudflare's browser. Only signed-in users can
 *     use it, and the printing browser can reach nothing but this site.
 *  3. In this browser again: the engine finishes the PDF (title, language,
 *     tags, fixed metadata).
 *
 * Every caller keeps its old generator as a fallback: if anything here fails
 * (offline, the free daily printing allowance used up, unexpected data), the
 * document is made the old way, so no button ever stops working.
 *
 * Turn the new path off without a code change: set VITE_HEC_DOCS_PRINTER_URL
 * to "off" in the build environment.
 */
import { supabase } from "@/integrations/supabase/client";
import { cleanRichHtml } from "@/lib/richText";

const DEFAULT_PRINTER = "https://hec-docs-printer.vintizfjes.workers.dev";
const PRINTER: string = (import.meta.env.VITE_HEC_DOCS_PRINTER_URL as string | undefined) ?? DEFAULT_PRINTER;

export type HecDocType = "homework" | "progress-report" | "statement" | "invoice" | "access-card" | "profile-card";

export interface HecDocument {
  blob: Blob;
  /** The same filename the old generator used. */
  filename: string;
  pages: number;
}

export class HecDocsUnavailable extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "HecDocsUnavailable";
  }
}

export function hecDocsEnabled(): boolean {
  return !!PRINTER && PRINTER !== "off";
}

type Engine = typeof import("./engine.generated.js");
let enginePromise: Promise<Engine> | null = null;
function loadEngine(): Promise<Engine> {
  enginePromise ??= import("./engine.generated.js").catch((e) => {
    enginePromise = null;
    throw e;
  });
  return enginePromise;
}

/** Drop undefined fields and turn Dates into strings, as JSON would. */
function plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v ?? null));
}

export interface MakeOptions {
  variant?: string;
  /**
   * Part of a run of several documents (a class's reports, a month's
   * invoices): the printer keeps its browser open between them, which is
   * faster and stays within the free plan's limit on starting browsers.
   * Make bulk documents one after another, not in parallel.
   */
  bulk?: boolean;
}

/**
 * Make one document. Throws HecDocsUnavailable (or a data error) when the new
 * path cannot be used; callers then fall back to their old generator.
 */
export async function makeDocument(type: HecDocType, data: Record<string, unknown>, opts: MakeOptions = {}): Promise<HecDocument> {
  if (!hecDocsEnabled()) throw new HecDocsUnavailable("HEC Docs printer is turned off");
  const engine = await loadEngine();
  const prepared = await engine.prepare(type, plain(data), { sanitiseRich: cleanRichHtml, variant: opts.variant });

  const { data: auth } = await supabase.auth.getSession();
  const token = auth.session?.access_token;
  if (!token) throw new HecDocsUnavailable("not signed in");

  let res: Response;
  try {
    res = await fetch(`${PRINTER}/v1/print`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(opts.bulk ? { "x-hec-keep": "1" } : {}),
      },
      body: JSON.stringify({ html: prepared.html, kind: prepared.output, png: prepared.raster }),
    });
  } catch (e) {
    throw new HecDocsUnavailable(`printer unreachable: ${(e as Error).message}`);
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      /* not JSON */
    }
    throw new HecDocsUnavailable(`printer returned ${res.status} ${detail}`.trim(), res.status);
  }
  const raw = new Uint8Array(await res.arrayBuffer());
  if (prepared.output === "png") {
    return { blob: new Blob([raw], { type: "image/png" }), filename: prepared.filename, pages: 1 };
  }
  const { pdf, pages } = await engine.finishPdf(raw, prepared.meta);
  return { blob: new Blob([pdf], { type: "application/pdf" }), filename: prepared.filename, pages };
}

/**
 * Try the new path; on any failure log why and return null so the caller
 * runs its old generator.
 */
export async function tryMakeDocument(type: HecDocType, data: Record<string, unknown>, opts: MakeOptions = {}): Promise<HecDocument | null> {
  try {
    return await makeDocument(type, data, opts);
  } catch (e) {
    console.warn(`[hec-docs] ${type}: using the previous generator (${(e as Error).message})`);
    return null;
  }
}

/** Fetch an image the app can see and inline it, so the printer needs no network. */
export async function imageAsDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Data for the progress report, from a student_reports row (the same fields ReportDocument reads). */
export function progressReportData(
  studentName: string,
  latest: { report: unknown; narrative?: unknown; period_start?: unknown; period_end?: unknown; source_counts?: unknown },
): Record<string, unknown> {
  return {
    studentName,
    report: latest.report ?? {},
    narrative: latest.narrative ?? null,
    period_start: latest.period_start ?? null,
    period_end: latest.period_end ?? null,
    source_counts: latest.source_counts ?? null,
  };
}

/** Any image the app can load, re-encoded as a PNG data: URI (the invoice schema takes PNG). */
export async function imageAsPngDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const bitmap = await createImageBitmap(await r.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

const qrCache = new Map<string, Promise<string | null>>();

/** Invoice data for HEC Docs: the app's InvoiceData + BankInfo, the month, and the VietQR inlined. */
export async function invoiceDocData(
  invoice: Record<string, unknown> | object,
  bankInfo: (Record<string, unknown> & { vietqr_storage_key?: string | null }) | object | null,
  month: string,
): Promise<Record<string, unknown>> {
  let bank: Record<string, unknown> | null = null;
  if (bankInfo) {
    const b = bankInfo as Record<string, unknown> & { vietqr_storage_key?: string | null };
    let qr: string | null = null;
    if (b.vietqr_storage_key) {
      const key = b.vietqr_storage_key;
      if (!qrCache.has(key)) {
        const { data } = supabase.storage.from("qr-codes").getPublicUrl(key);
        qrCache.set(key, imageAsPngDataUri(data.publicUrl));
      }
      qr = await qrCache.get(key)!;
    }
    bank = { ...b, vietqr_image: qr };
  }
  return { invoice: { ...(invoice as Record<string, unknown>), month }, bankInfo: bank };
}
