import { supabase } from "@/integrations/supabase/client";
import { makeFileStore, type StorageLike } from "./fileStore";

/**
 * The buckets whose files live in Cloudflare R2. Add a bucket here only
 * after its files are copied (scripts/copy-bucket-to-r2.mjs); remove it to
 * move back. Empty: everything is still in Supabase Storage.
 */
export const R2_BUCKETS: ReadonlySet<string> = new Set<string>([]);

const DEFAULT_WORKER = "https://hec-files.vintizfjes.workers.dev";
const WORKER: string = (import.meta.env.VITE_HEC_FILES_URL as string | undefined) ?? DEFAULT_WORKER;

export const files = makeFileStore({
  supabase: supabase as unknown as StorageLike,
  workerUrl: WORKER,
  r2Buckets: R2_BUCKETS,
});
