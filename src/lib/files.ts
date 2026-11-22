import { supabase } from "@/integrations/supabase/client";
import { makeFileStore, type StorageLike } from "./fileStore";

/**
 * The buckets whose files live in Cloudflare R2. Add a bucket here only
 * after its files are copied (scripts/copy-bucket-to-r2.mjs); remove it to
 * move back. Files not copied yet are still read from Supabase.
 *   homework   18 Nov 2026 (access rule checked against the live policies:
 *              1,313 reads and 1,248 uploads by real accounts, no difference)
 *   student-work  18 Nov 2026 (2,541 reads and 286 uploads, uploader rules
 *              included, no difference; the OCR functions read and move
 *              files through supabase/functions/_lib/file-store.ts)
 *   course-media  22 Nov 2026: the course books' videos and audio, uploaded
 *              straight to R2 (scripts/upload-course-media.mjs); Supabase never
 *              had them, and a slide falls back to the Google Drive copy.
 */
// Paused for a few hours on 18 Nov 2026: uploads failed with "No bucket
// called ..." until migration 20261118110000; re-enabled after it, with 121
// real upload records by 10 accounts checked (all recorded, then undone).
export const R2_BUCKETS: ReadonlySet<string> = new Set<string>(["homework", "student-work", "course-media"]);

const DEFAULT_WORKER = "https://hec-files.vintizfjes.workers.dev";
const WORKER: string = (import.meta.env.VITE_HEC_FILES_URL as string | undefined) ?? DEFAULT_WORKER;

export const files = makeFileStore({
  supabase: supabase as unknown as StorageLike,
  workerUrl: WORKER,
  r2Buckets: R2_BUCKETS,
});
