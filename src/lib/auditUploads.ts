/**
 * The upload queue for audit clips. It lives outside any screen on purpose:
 * the admin can add files for one child, pick another child, add theirs, or
 * even leave the page for another admin tab, and every upload carries on and
 * can be watched when they come back. Two run at a time.
 *
 * Each file goes through: Waiting -> Saving record -> Uploading (with a real
 * byte percentage) -> Done. The database row is written first (it numbers the
 * clip and refuses a child with no consent on record); if the upload then
 * fails, the row is removed again so no clip points at a missing file.
 */
import { supabase } from "@/integrations/supabase/client";
import { AUDIT_BUCKET, extFor, storagePathFor, type UploadStage } from "@/lib/auditClips";

const db = supabase as any;
const MAX_PARALLEL = 2;

export interface UploadJob {
  id: string;
  studentId: string;
  studentName: string;
  code: string;
  fileName: string;
  size: number;
  stage: UploadStage;
  pct: number;
  error?: string;
}

export interface UploadRequest {
  studentId: string;
  studentName: string;
  code: string;
  file: File;
  sourceNote: string | null;
  deleteAfter: string | null;
}

interface Source extends UploadRequest {
  clipId?: string;
  xhr?: XMLHttpRequest;
  cancelled?: boolean;
}

let jobs: UploadJob[] = [];
const sources = new Map<string, Source>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const patch = (id: string, p: Partial<UploadJob>) => {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...p } : j));
  emit();
};

export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
export const getJobs = () => jobs;

export function enqueue(requests: UploadRequest[]) {
  const added: UploadJob[] = requests.map((r) => {
    const id = crypto.randomUUID();
    sources.set(id, { ...r });
    return {
      id, studentId: r.studentId, studentName: r.studentName, code: r.code,
      fileName: r.file.name, size: r.file.size, stage: "queued" as UploadStage, pct: 0,
    };
  });
  jobs = [...jobs, ...added];
  emit();
  pump();
}

export function retry(id: string) {
  const s = sources.get(id);
  if (!s) return;
  s.cancelled = false;
  patch(id, { stage: "queued", pct: 0, error: undefined });
  pump();
}

/** Stop a waiting or running upload. A running one is aborted and its row removed. */
export function cancel(id: string) {
  const s = sources.get(id);
  const j = jobs.find((x) => x.id === id);
  if (!s || !j) return;
  if (j.stage === "queued") {
    patch(id, { stage: "failed", error: "Cancelled" });
    return;
  }
  s.cancelled = true;
  s.xhr?.abort();
}

/** Remove finished and failed rows from the list (their files are already stored or discarded). */
export function clearFinished() {
  for (const j of jobs) if (j.stage === "done" || j.stage === "failed") sources.delete(j.id);
  jobs = jobs.filter((j) => j.stage !== "done" && j.stage !== "failed");
  emit();
}

function pump() {
  const running = jobs.filter((j) => j.stage === "saving" || j.stage === "uploading").length;
  const next = jobs.filter((j) => j.stage === "queued").slice(0, Math.max(0, MAX_PARALLEL - running));
  for (const j of next) {
    patch(j.id, { stage: "saving", pct: 0, error: undefined }); // before any await, so it is never started twice
    void run(j.id);
  }
}

async function run(id: string) {
  const s = sources.get(id);
  const j = jobs.find((x) => x.id === id);
  if (!s || !j) return;
  let inserted = false;
  try {
    const { data: u } = await supabase.auth.getUser();
    s.clipId = crypto.randomUUID();
    const path = storagePathFor(j.code, s.clipId, extFor(s.file.type, s.file.name));
    const ins = await db.from("audit_clips").insert({
      id: s.clipId, student_id: s.studentId, storage_path: path, original_name: s.file.name,
      mime_type: s.file.type, size_bytes: s.file.size, source_note: s.sourceNote,
      delete_after: s.deleteAfter, uploaded_by: u.user?.id ?? null,
    });
    if (ins.error) throw new Error(ins.error.message);
    inserted = true;
    if (s.cancelled) throw new Error("Cancelled");
    patch(id, { stage: "uploading", pct: 0 });
    await send(path, s, (pct) => patch(id, { pct }));
    sources.delete(id);
    patch(id, { stage: "done", pct: 100 });
  } catch (e: any) {
    if (inserted && s.clipId) await db.from("audit_clips").delete().eq("id", s.clipId);
    patch(id, { stage: "failed", pct: 0, error: s.cancelled ? "Cancelled" : e?.message ?? "Upload failed" });
  } finally {
    pump();
  }
}

/** A plain POST so the browser reports bytes sent; the bucket's admin-only rules still apply. */
async function send(path: string, s: Source, onPct: (n: number) => void) {
  const { data } = await supabase.auth.getSession(); // refreshes an expired token on a long queue
  const token = data.session?.access_token;
  if (!token) throw new Error("You are signed out. Sign in again, then press Retry.");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    s.xhr = xhr;
    xhr.open("POST", `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${AUDIT_BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("Content-Type", s.file.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onPct(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = xhr.statusText || `Upload failed (${xhr.status})`;
      try { msg = JSON.parse(xhr.responseText).message ?? msg; } catch { /* keep the status text */ }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error. Check the connection and press Retry."));
    xhr.onabort = () => reject(new Error("Cancelled"));
    xhr.send(s.file);
  });
}
