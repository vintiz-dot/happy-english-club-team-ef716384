import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, FolderOpen, Loader2, Mic, RotateCcw, Upload, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { files as fileStore } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { sha256Hex } from "@/lib/recorder/hash";
import {
  WAV_HEAD_BYTES, LarkFileError, checkLength, chunkPlan, guessTransmitter, layoutTransmitter, parseTrailingChunks,
  parseWavHeader, sourceForServer, type LarkFile, type TransmitterLayout,
} from "@/lib/recorder/larkImport";
import { encodePlan } from "@/lib/recorder/larkEncode";

/**
 * "Add the Lark microphones" (owner, 28 Nov 2026): after class the lesson's teacher adds the four transmitters'
 * own recordings to the lesson's recording, as tracks mic1..mic4 (supabase/migrations/20261128120000_recorder_lark_tracks.sql).
 * The files never leave the browser as WAV: each 4-minute piece is decoded, resampled to 16 kHz and encoded FLAC
 * in a Worker (src/lib/recorder/larkWorker.ts, File.slice: nothing is held whole), registered, uploaded through the
 * one file store, read back and confirmed by the server; the server then checks every piece's byte count before the
 * page says a transmitter may be wiped. Picking the same files again after a dropped connection carries on.
 */

const BUCKET = "class-recorder-audio";

interface Picked { key: string; file: File; relativePath: string; info?: LarkFile["info"]; error?: string; tx: number | null }
type TxState =
  | { kind: "idle" }
  | { kind: "working"; done: number; total: number; note: string }
  | { kind: "paused"; done: number; total: number; error: string }
  | { kind: "done"; chunks: number; minutes: number }
  | { kind: "refused"; error: string };

interface ServerTrack { track: string; import_state: string | null; import_completed_at: string | null; total_ms: number | null }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errText = (e: unknown) => String((e as any)?.message ?? e ?? "error");
const isDup = (e: unknown) => /already (exists|there)|duplicate|409/i.test(errText(e));
/** Refusals that another try will not change. */
const isFinal = (e: unknown) => /not a microphone import|only a teacher|switched off|deletion|different audio|other files|someone else|already added|not this lesson|not the whole lesson|complete recording/i.test(errText(e));

async function rpc<T = any>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw new Error(String(error.message ?? error));
  return data as T;
}

/** One chunk from the Worker. */
function workerCall(w: Worker, msg: Record<string, unknown>): Promise<{ bytes: Uint8Array; sha256: string; tStartMs: number; tEndMs: number }> {
  return new Promise((resolve, reject) => {
    const id = Math.random();
    const on = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      w.removeEventListener("message", on);
      if (e.data.ok) resolve({ ...e.data, bytes: new Uint8Array(e.data.bytes) });
      else reject(new Error(e.data.message));
    };
    w.addEventListener("message", on);
    w.postMessage({ ...msg, id });
  });
}

async function readHeader(file: File): Promise<LarkFile["info"]> {
  const head = new Uint8Array(await file.slice(0, Math.min(file.size, WAV_HEAD_BYTES)).arrayBuffer());
  const info = parseWavHeader(head, file.size);
  if (info.afterDataOffset != null && (!info.meta.timeReferenceSamples && !info.meta.ixml)) {
    const tail = new Uint8Array(await file.slice(info.afterDataOffset, Math.min(file.size, info.afterDataOffset + (256 << 10))).arrayBuffer());
    parseTrailingChunks(info, tail);
  }
  return info;
}

export function LarkImport({ recordingId, scheduledStart, scheduledEnd, onClose }: {
  recordingId: string; scheduledStart: string; scheduledEnd: string; onClose?: () => void;
}) {
  const lessonMs = Date.parse(scheduledEnd) - Date.parse(scheduledStart);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [server, setServer] = useState<ServerTrack[]>([]);
  const [state, setState] = useState<Record<number, TxState>>({});
  const [busy, setBusy] = useState(false);
  const stop = useRef(false);
  const worker = useRef<Worker | null>(null);

  const loadServer = useCallback(async () => {
    const { data } = await (supabase as any).from("class_recording_tracks")
      .select("track, import_state, import_completed_at, total_ms").eq("recording_id", recordingId);
    setServer((data ?? []).filter((t: ServerTrack) => /^mic[1-4]$/.test(t.track)));
  }, [recordingId]);
  useEffect(() => { void loadServer(); }, [loadServer]);
  useEffect(() => () => { stop.current = true; worker.current?.terminate(); }, []);
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const onPick = async (list: FileList | null) => {
    if (!list?.length) return;
    const fresh: Picked[] = [];
    for (const file of Array.from(list)) {
      const relativePath = (file as any).webkitRelativePath || file.name;
      if (/^\./.test(file.name)) continue;                       // macOS ._ files on the card
      const p: Picked = { key: `${relativePath}|${file.size}|${file.lastModified}`, file, relativePath, tx: guessTransmitter(file.name, relativePath) };
      try {
        if (!/\.(wav|wave|bwf)$/i.test(file.name)) throw new LarkFileError("not_wav", "Not a WAV file");
        p.info = await readHeader(file);
      } catch (e) { p.error = errText(e); p.tx = null; }
      fresh.push(p);
    }
    setPicked((old) => {
      const seen = new Set(old.map((x) => x.key));
      return [...old, ...fresh.filter((x) => !seen.has(x.key))];
    });
  };

  const layouts: TransmitterLayout[] = [1, 2, 3, 4].map((tx) => {
    const fs = picked.filter((p) => p.tx === tx && p.info).map((p): LarkFile => ({
      key: p.key, name: p.file.name, relativePath: p.relativePath, bytes: p.file.size, lastModified: p.file.lastModified, info: p.info!,
    }));
    return fs.length ? layoutTransmitter(tx, fs) : null;
  }).filter((x): x is TransmitterLayout => !!x);
  const problemsOf = (l: TransmitterLayout) => {
    const len = checkLength(l.durationMs, lessonMs);
    return len ? [...l.problems, len] : l.problems;
  };
  const doneOnServer = (tx: number) => server.find((t) => t.track === `mic${tx}`)?.import_state === "complete";

  async function importOne(l: TransmitterLayout) {
    const tx = l.transmitter;
    const spans = chunkPlan(l.outFrames);
    const set = (s: TxState) => setState((o) => ({ ...o, [tx]: s }));
    const blobs: Record<string, Blob> = {};
    for (const p of picked) if (p.tx === tx) blobs[p.key] = p.file;
    const plan = encodePlan(l);
    let done = 0;
    try {
      set({ kind: "working", done: 0, total: spans.length, note: "Checking with the server" });
      const begin = await rpc<{ chunks: { seq: number; sha256: string; confirmed: boolean }[] }>("recorder_lark_begin", {
        p_recording: recordingId, p_transmitter: tx, p_duration_ms: l.durationMs, p_source: sourceForServer(l),
      });
      const had = new Map(begin.chunks.map((c) => [c.seq, c]));
      for (const span of spans) {
        if (stop.current) throw new Error("Stopped");
        const prior = had.get(span.seq);
        if (prior?.confirmed) { done++; set({ kind: "working", done, total: spans.length, note: "Already on the server" }); continue; }
        for (let attempt = 0; ; attempt++) {
          try {
            if (!navigator.onLine) { set({ kind: "working", done, total: spans.length, note: "Offline: waiting for the connection" }); await sleep(3000); attempt--; continue; }
            set({ kind: "working", done, total: spans.length, note: `Making part ${span.seq + 1} of ${spans.length}` });
            if (!worker.current) worker.current = new Worker(new URL("../../lib/recorder/larkWorker.ts", import.meta.url), { type: "module" });
            const c = await workerCall(worker.current, { plan, span, files: blobs });
            if (prior && prior.sha256 !== c.sha256) throw new Error(`Part ${span.seq + 1} came out different from the first try: pick the same files again`);
            set({ kind: "working", done, total: spans.length, note: `Uploading part ${span.seq + 1} of ${spans.length}` });
            const reg = await rpc<{ chunk_id: string; storage_path: string; confirmed: boolean }>("recorder_lark_chunk", {
              p_recording: recordingId, p_transmitter: tx, p_seq: span.seq, p_byte_size: c.bytes.length, p_sha256: c.sha256,
              p_t_start_ms: c.tStartMs, p_t_end_ms: c.tEndMs,
            });
            if (!reg.confirmed) {
              try { await fileStore.upload(BUCKET, reg.storage_path, new Blob([c.bytes as BlobPart], { type: "audio/flac" }), "audio/flac"); }
              catch (e) { if (!isDup(e)) throw e; }
              const back = new Uint8Array(await (await fileStore.download(BUCKET, reg.storage_path)).arrayBuffer());
              await rpc("recorder_lark_confirm", { p_chunk: reg.chunk_id, p_readback_sha256: await sha256Hex(back) });
            }
            break;
          } catch (e) {
            if (isFinal(e) || attempt >= 5 || stop.current) throw e;
            set({ kind: "working", done, total: spans.length, note: `Trying again (${errText(e)})` });
            await sleep(Math.min(30000, 2000 * 2 ** attempt));
          }
        }
        done++;
        set({ kind: "working", done, total: spans.length, note: "" });
      }
      set({ kind: "working", done, total: spans.length, note: "The server is checking every part" });
      const fin = await rpc<{ chunks: number; audio_ms: number }>("recorder_lark_finish", { p_recording: recordingId, p_transmitter: tx });
      set({ kind: "done", chunks: fin.chunks, minutes: Math.round(fin.audio_ms / 60000) });
    } catch (e) {
      if (isFinal(e)) set({ kind: "refused", error: errText(e) });
      else set({ kind: "paused", done, total: spans.length, error: errText(e) });
    }
  }

  const run = async () => {
    stop.current = false;
    setBusy(true);
    try {
      for (const l of layouts) {
        if (doneOnServer(l.transmitter) || problemsOf(l).length) continue;
        if (state[l.transmitter]?.kind === "done") continue;
        await importOne(l);
      }
    } finally {
      setBusy(false);
      worker.current?.terminate(); worker.current = null;
      void loadServer();
    }
  };

  const ready = layouts.filter((l) => !doneOnServer(l.transmitter) && !problemsOf(l).length && state[l.transmitter]?.kind !== "done");

  return (
    <div className="rounded-md border p-3 space-y-3 text-sm" data-lark-import="">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium flex items-center gap-1.5"><Mic className="h-4 w-4" aria-hidden /> Add the Lark microphones</span>
        {onClose && <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>Close</Button>}
      </div>
      <p className="text-muted-foreground">
        Plug in each transmitter and pick its recordings (a folder or the files). The number is the sticker on the transmitter:
        check it below. Keep this page open until every transmitter says it may be wiped.
      </p>
      {server.length > 0 && (
        <p className="text-xs">On the server: {server.map((t) => `mic ${t.track.slice(3)} ${t.import_state === "complete" ? "added" : "unfinished"}`).join(", ")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex">
          <input type="file" multiple accept=".wav,.WAV,audio/wav,audio/x-wav" className="sr-only" disabled={busy}
            onChange={(e) => { void onPick(e.target.files); e.target.value = ""; }} />
          <span className="inline-flex items-center gap-1.5 rounded-md border px-3 min-h-9 cursor-pointer"><Upload className="h-4 w-4" aria-hidden /> Pick files</span>
        </label>
        <label className="inline-flex">
          <input type="file" multiple className="sr-only" disabled={busy} {...({ webkitdirectory: "", directory: "" } as any)}
            onChange={(e) => { void onPick(e.target.files); e.target.value = ""; }} />
          <span className="inline-flex items-center gap-1.5 rounded-md border px-3 min-h-9 cursor-pointer"><FolderOpen className="h-4 w-4" aria-hidden /> Pick a folder</span>
        </label>
      </div>

      {picked.length > 0 && (
        <ul className="divide-y">
          {picked.map((p) => (
            <li key={p.key} className="py-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-all">
                {p.relativePath}
                {p.info && <span className="text-muted-foreground"> · {Math.round(p.info.durationMs / 60000)} min, {p.info.sampleRate / 1000} kHz {p.info.bitDepth}-bit{p.info.isFloat ? " float" : ""}</span>}
                {p.error && <span className="block text-rose-700">Refused: {p.error}</span>}
              </span>
              {p.info && (
                <select aria-label={`Transmitter for ${p.file.name}`} className="border rounded px-2 min-h-9" disabled={busy}
                  value={p.tx ?? ""} onChange={(e) => {
                    const tx = e.target.value ? Number(e.target.value) : null;
                    setPicked((o) => o.map((x) => (x.key === p.key ? { ...x, tx } : x)));
                  }}>
                  <option value="">Not used</option>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>Transmitter {n}</option>)}
                </select>
              )}
            </li>
          ))}
        </ul>
      )}

      {layouts.length > 0 && (
        <ul className="space-y-2">
          {layouts.map((l) => {
            const s = state[l.transmitter] ?? { kind: "idle" };
            const probs = problemsOf(l);
            return (
              <li key={l.transmitter} className="rounded border p-2" data-transmitter={l.transmitter}>
                <div className="font-medium">Transmitter {l.transmitter}: {l.files.length} file{l.files.length === 1 ? "" : "s"}, {Math.round(l.durationMs / 60000)} min</div>
                {l.notes.map((n) => <div key={n} className="text-xs text-muted-foreground">{n}</div>)}
                {doneOnServer(l.transmitter) && s.kind !== "done" && <div className="text-emerald-700">Already added to this lesson.</div>}
                {probs.map((n) => <div key={n} className="text-rose-700">Refused: {n}</div>)}
                {(s.kind === "working" || s.kind === "paused") && (
                  <div className="mt-1 space-y-1">
                    <Progress value={s.total ? (100 * s.done) / s.total : 0} />
                    <div className="text-xs text-muted-foreground">{s.done} of {s.total} parts on the server{s.kind === "working" && s.note ? ` · ${s.note}` : ""}</div>
                    {s.kind === "paused" && <div className="text-amber-700">Paused: {s.error}. Press Continue; nothing is lost.</div>}
                  </div>
                )}
                {s.kind === "refused" && <div className="text-rose-700 flex items-center gap-1"><XCircle className="h-4 w-4" aria-hidden /> {s.error}</div>}
                {s.kind === "done" && (
                  <div className="text-emerald-700 flex items-center gap-1 font-medium" data-wipe-ok={l.transmitter}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Uploaded and checked: you can now wipe transmitter {l.transmitter}.
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {(ready.length > 0 || busy) && (
        <div className="flex gap-2">
          <Button size="sm" className="min-h-9" onClick={() => void run()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden /> : Object.values(state).some((s) => s.kind === "paused") ? <RotateCcw className="h-4 w-4 mr-1" aria-hidden /> : <Upload className="h-4 w-4 mr-1" aria-hidden />}
            {busy ? "Uploading…" : Object.values(state).some((s) => s.kind === "paused") ? "Continue" : `Upload ${ready.length} transmitter${ready.length === 1 ? "" : "s"}`}
          </Button>
          {busy && <Button size="sm" variant="outline" className="min-h-9" onClick={() => { stop.current = true; }}>Pause</Button>}
        </div>
      )}
    </div>
  );
}
