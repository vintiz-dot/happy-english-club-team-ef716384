// Types for engine.generated.js (built by hec-docs/scripts/build-app-engine.ts).

export interface FieldError {
  path: string;
  message: string;
}

export declare class DocumentDataError extends Error {
  readonly errors: FieldError[];
}

export interface PdfMeta {
  title: string;
  lang: string;
  author: string;
  subject?: string;
  keywords?: string[];
  creator: string;
  date: Date;
}

export interface Prepared {
  type: string;
  version: string;
  variant: string;
  html: string;
  filename: string;
  output: "pdf" | "png";
  raster?: { width: number; height: number; scale: number };
  meta: PdfMeta;
}

export declare const ENGINE_VERSION: string;
export declare const TYPES: string[];

export declare function prepare(
  type: string,
  data: Record<string, unknown>,
  opts: { sanitiseRich: (html: string) => string; variant?: string; generatedAt?: string },
): Promise<Prepared>;

export declare function finishPdf(raw: Uint8Array, meta: PdfMeta): Promise<{ pdf: Uint8Array; pages: number }>;

export declare function appendPdfs(
  base: Uint8Array,
  extras: { name: string; bytes: Uint8Array }[],
): Promise<{ pdf: Uint8Array; pages: number; appended: string[]; skipped: string[] }>;
