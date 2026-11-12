// The local queue: everything captured lives here until the server has
// confirmed it AND the recording is complete. It survives offline, a tab
// crash and a reload. IndexedDB database `hec-recorder`.
//
// Stores: recordings, chunks (metadata), bytes (chunk bytes, same key),
// segments (5-second pieces of the chunk in progress), markers, manifests.
//
// One rule above all: bytes are deleted only by `deleteConfirmedBytes`, which
// itself refuses any chunk that is not `confirmed`. The engine calls it only
// once the server row is `complete`.

import type { ChunkMeta, LocalRecording, MarkerRecord, TrackRole } from "./types";

export interface Segment { recordingId: string; track: TrackRole; seq: number; index: number; startFrame: number; samples: Int16Array }

export interface RecorderStore {
  putRecording(r: LocalRecording): Promise<void>;
  getRecording(id: string): Promise<LocalRecording | undefined>;
  listRecordings(): Promise<LocalRecording[]>;
  /** Store a chunk and its bytes in ONE transaction. Same key + same sha is a no-op; a different sha is refused. */
  addChunk(meta: ChunkMeta, bytes: Uint8Array): Promise<"added" | "exists">;
  updateChunk(meta: ChunkMeta): Promise<void>;
  listChunks(recordingId: string): Promise<ChunkMeta[]>;
  getBytes(recordingId: string, track: TrackRole, seq: number): Promise<Uint8Array | undefined>;
  /** Removes bytes of CONFIRMED chunks only; returns how many were removed. */
  deleteConfirmedBytes(recordingId: string): Promise<number>;
  /** Remove everything of a recording (the teacher's typed "Discard", or after complete). */
  purgeRecording(recordingId: string, opts: { allowUnconfirmed: boolean }): Promise<void>;
  putSegment(s: Segment): Promise<void>;
  listSegments(recordingId: string): Promise<Segment[]>;
  deleteSegments(recordingId: string, track: TrackRole, seq: number): Promise<void>;
  putMarker(m: MarkerRecord): Promise<void>;
  listMarkers(recordingId: string): Promise<MarkerRecord[]>;
  putManifest(recordingId: string, bytes: Uint8Array, sha256: string): Promise<void>;
  getManifest(recordingId: string): Promise<{ bytes: Uint8Array; sha256: string } | undefined>;
  /** C2 round 3 (N-M5): drop a recording's manifest (it lists marker labels). Optional for older stores. */
  deleteManifest?(recordingId: string): Promise<void>;
  /** Bytes held locally (for the UI). */
  bytesHeld(recordingId?: string): Promise<number>;
}

const key = (r: string, t: string, s: number) => `${r}|${t}|${String(s).padStart(6, "0")}`;

/** In-memory store with the same contract (unit tests, and a fallback when IndexedDB is unavailable). */
export class MemoryStore implements RecorderStore {
  recordings = new Map<string, LocalRecording>();
  chunks = new Map<string, ChunkMeta>();
  bytes = new Map<string, Uint8Array>();
  segments = new Map<string, Segment>();
  markers = new Map<string, MarkerRecord>();
  manifests = new Map<string, { bytes: Uint8Array; sha256: string }>();
  private clone<T>(v: T): T { return structuredClone(v); }
  async putRecording(r: LocalRecording) { this.recordings.set(r.id, this.clone(r)); }
  async getRecording(id: string) { const r = this.recordings.get(id); return r ? this.clone(r) : undefined; }
  async listRecordings() { return [...this.recordings.values()].map((r) => this.clone(r)); }
  async addChunk(meta: ChunkMeta, bytes: Uint8Array) {
    const k = key(meta.recordingId, meta.track, meta.seq);
    const have = this.chunks.get(k);
    if (have) {
      if (have.sha256 !== meta.sha256) throw new Error(`chunk ${k} already stored with different audio`);
      return "exists" as const;
    }
    this.chunks.set(k, this.clone(meta));
    this.bytes.set(k, bytes.slice());
    return "added" as const;
  }
  async updateChunk(meta: ChunkMeta) {
    const k = key(meta.recordingId, meta.track, meta.seq);
    const have = this.chunks.get(k);
    if (!have) throw new Error(`no chunk ${k}`);
    if (have.sha256 !== meta.sha256 || have.byteSize !== meta.byteSize) throw new Error(`chunk ${k}: its audio cannot change`);
    this.chunks.set(k, this.clone(meta));
  }
  async listChunks(recordingId: string) {
    return [...this.chunks.values()].filter((c) => c.recordingId === recordingId).map((c) => this.clone(c))
      .sort((a, b) => a.track.localeCompare(b.track) || a.seq - b.seq);
  }
  async getBytes(r: string, t: TrackRole, s: number) { const b = this.bytes.get(key(r, t, s)); return b ? b.slice() : undefined; }
  async deleteConfirmedBytes(recordingId: string) {
    let n = 0;
    for (const [k, c] of this.chunks) if (c.recordingId === recordingId && c.state === "confirmed" && this.bytes.delete(k)) n++;
    return n;
  }
  async purgeRecording(recordingId: string, opts: { allowUnconfirmed: boolean }) {
    const chunks = await this.listChunks(recordingId);
    if (!opts.allowUnconfirmed && chunks.some((c) => c.state !== "confirmed")) throw new Error("unconfirmed audio would be lost");
    for (const c of chunks) { const k = key(c.recordingId, c.track, c.seq); this.chunks.delete(k); this.bytes.delete(k); }
    for (const [k, s] of this.segments) if (s.recordingId === recordingId) this.segments.delete(k);
    for (const [k, m] of this.markers) if (m.recordingId === recordingId) this.markers.delete(k);
    this.manifests.delete(recordingId);
    this.recordings.delete(recordingId);
  }
  async putSegment(s: Segment) { this.segments.set(`${key(s.recordingId, s.track, s.seq)}|${s.index}`, this.clone(s)); }
  async listSegments(recordingId: string) {
    return [...this.segments.values()].filter((s) => s.recordingId === recordingId).map((s) => this.clone(s))
      .sort((a, b) => a.track.localeCompare(b.track) || a.seq - b.seq || a.index - b.index);
  }
  async deleteSegments(r: string, t: TrackRole, s: number) {
    const p = `${key(r, t, s)}|`;
    for (const k of [...this.segments.keys()]) if (k.startsWith(p)) this.segments.delete(k);
  }
  async putMarker(m: MarkerRecord) { this.markers.set(`${m.recordingId}|${m.clientMarkerId}`, this.clone(m)); }
  async listMarkers(recordingId: string) { return [...this.markers.values()].filter((m) => m.recordingId === recordingId).map((m) => this.clone(m)); }
  async putManifest(recordingId: string, bytes: Uint8Array, sha256: string) {
    const have = this.manifests.get(recordingId);
    if (have && have.sha256 !== sha256) throw new Error("a different manifest is already saved for this recording");
    this.manifests.set(recordingId, { bytes: bytes.slice(), sha256 });
  }
  async getManifest(recordingId: string) { const m = this.manifests.get(recordingId); return m ? { bytes: m.bytes.slice(), sha256: m.sha256 } : undefined; }
  async deleteManifest(recordingId: string) { this.manifests.delete(recordingId); }
  async bytesHeld(recordingId?: string) {
    let n = 0;
    for (const [k, b] of this.bytes) if (!recordingId || k.startsWith(`${recordingId}|`)) n += b.length;
    for (const s of this.segments.values()) if (!recordingId || s.recordingId === recordingId) n += s.samples.byteLength;
    return n;
  }
}

// ---------------------------------------------------------------- IndexedDB

const DB = "hec-recorder";
const VERSION = 1;

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
}
function done(tx: IDBTransaction): Promise<void> {
  return new Promise((ok, no) => { tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error); tx.onabort = () => no(tx.error ?? new Error("transaction aborted")); });
}

export async function openIdbStore(name = DB): Promise<IdbStore> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB is not available");
  const db = await new Promise<IDBDatabase>((ok, no) => {
    const r = indexedDB.open(name, VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains("recordings")) d.createObjectStore("recordings", { keyPath: "id" });
      if (!d.objectStoreNames.contains("chunks")) d.createObjectStore("chunks").createIndex("byRecording", "recordingId");
      if (!d.objectStoreNames.contains("bytes")) d.createObjectStore("bytes");
      if (!d.objectStoreNames.contains("segments")) d.createObjectStore("segments").createIndex("byRecording", "recordingId");
      if (!d.objectStoreNames.contains("markers")) d.createObjectStore("markers").createIndex("byRecording", "recordingId");
      if (!d.objectStoreNames.contains("manifests")) d.createObjectStore("manifests");
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
    r.onblocked = () => no(new Error("the recorder database is open in an older tab"));
  });
  return new IdbStore(db);
}

export class IdbStore implements RecorderStore {
  constructor(readonly db: IDBDatabase) {}
  private tx(stores: string[], mode: IDBTransactionMode = "readonly") { return this.db.transaction(stores, mode, { durability: "strict" } as any); }

  async putRecording(r: LocalRecording) { const t = this.tx(["recordings"], "readwrite"); t.objectStore("recordings").put(r); await done(t); }
  async getRecording(id: string) { return (await req(this.tx(["recordings"]).objectStore("recordings").get(id))) as LocalRecording | undefined; }
  async listRecordings() { return (await req(this.tx(["recordings"]).objectStore("recordings").getAll())) as LocalRecording[]; }

  async addChunk(meta: ChunkMeta, bytes: Uint8Array) {
    const k = key(meta.recordingId, meta.track, meta.seq);
    const t = this.tx(["chunks", "bytes"], "readwrite");
    const have = (await req(t.objectStore("chunks").get(k))) as ChunkMeta | undefined;
    if (have) {
      await done(t);
      if (have.sha256 !== meta.sha256) throw new Error(`chunk ${k} already stored with different audio`);
      return "exists" as const;
    }
    t.objectStore("chunks").put(meta, k);
    // Store an exact-length copy (a view into a bigger buffer would store the whole buffer).
    t.objectStore("bytes").put(bytes.slice().buffer, k);
    await done(t);
    return "added" as const;
  }
  async updateChunk(meta: ChunkMeta) {
    const k = key(meta.recordingId, meta.track, meta.seq);
    const t = this.tx(["chunks"], "readwrite");
    const have = (await req(t.objectStore("chunks").get(k))) as ChunkMeta | undefined;
    if (!have) { t.abort(); throw new Error(`no chunk ${k}`); }
    if (have.sha256 !== meta.sha256 || have.byteSize !== meta.byteSize) { t.abort(); throw new Error(`chunk ${k}: its audio cannot change`); }
    t.objectStore("chunks").put(meta, k);
    await done(t);
  }
  async listChunks(recordingId: string) {
    const all = (await req(this.tx(["chunks"]).objectStore("chunks").index("byRecording").getAll(recordingId))) as ChunkMeta[];
    return all.sort((a, b) => a.track.localeCompare(b.track) || a.seq - b.seq);
  }
  async getBytes(r: string, tr: TrackRole, s: number) {
    const b = (await req(this.tx(["bytes"]).objectStore("bytes").get(key(r, tr, s)))) as ArrayBuffer | undefined;
    return b ? new Uint8Array(b) : undefined;
  }
  async deleteConfirmedBytes(recordingId: string) {
    const chunks = await this.listChunks(recordingId);
    const t = this.tx(["bytes"], "readwrite");
    let n = 0;
    for (const c of chunks) if (c.state === "confirmed") { t.objectStore("bytes").delete(key(c.recordingId, c.track, c.seq)); n++; }
    await done(t);
    return n;
  }
  async purgeRecording(recordingId: string, opts: { allowUnconfirmed: boolean }) {
    const chunks = await this.listChunks(recordingId);
    if (!opts.allowUnconfirmed && chunks.some((c) => c.state !== "confirmed")) throw new Error("unconfirmed audio would be lost");
    const segs = await this.listSegments(recordingId);
    const marks = await this.listMarkers(recordingId);
    const t = this.tx(["recordings", "chunks", "bytes", "segments", "markers", "manifests"], "readwrite");
    for (const c of chunks) { const k = key(c.recordingId, c.track, c.seq); t.objectStore("chunks").delete(k); t.objectStore("bytes").delete(k); }
    for (const s of segs) t.objectStore("segments").delete(`${key(s.recordingId, s.track, s.seq)}|${s.index}`);
    for (const m of marks) t.objectStore("markers").delete(`${m.recordingId}|${m.clientMarkerId}`);
    t.objectStore("manifests").delete(recordingId);
    t.objectStore("recordings").delete(recordingId);
    await done(t);
  }
  async putSegment(s: Segment) {
    const t = this.tx(["segments"], "readwrite");
    t.objectStore("segments").put({ ...s, samples: s.samples.slice().buffer }, `${key(s.recordingId, s.track, s.seq)}|${s.index}`);
    await done(t);
  }
  async listSegments(recordingId: string) {
    const all = (await req(this.tx(["segments"]).objectStore("segments").index("byRecording").getAll(recordingId))) as any[];
    return all.map((s) => ({ ...s, samples: new Int16Array(s.samples) }) as Segment)
      .sort((a, b) => a.track.localeCompare(b.track) || a.seq - b.seq || a.index - b.index);
  }
  async deleteSegments(r: string, tr: TrackRole, s: number) {
    const p = `${key(r, tr, s)}|`;
    const t = this.tx(["segments"], "readwrite");
    t.objectStore("segments").delete(IDBKeyRange.bound(p, p + "￿"));
    await done(t);
  }
  async putMarker(m: MarkerRecord) { const t = this.tx(["markers"], "readwrite"); t.objectStore("markers").put(m, `${m.recordingId}|${m.clientMarkerId}`); await done(t); }
  async listMarkers(recordingId: string) { return (await req(this.tx(["markers"]).objectStore("markers").index("byRecording").getAll(recordingId))) as MarkerRecord[]; }
  async putManifest(recordingId: string, bytes: Uint8Array, sha256: string) {
    const t = this.tx(["manifests"], "readwrite");
    const have = (await req(t.objectStore("manifests").get(recordingId))) as any;
    if (have && have.sha256 !== sha256) { t.abort(); throw new Error("a different manifest is already saved for this recording"); }
    if (!have) t.objectStore("manifests").put({ bytes: bytes.slice().buffer, sha256 }, recordingId);
    await done(t);
  }
  async deleteManifest(recordingId: string) { const t = this.tx(["manifests"], "readwrite"); t.objectStore("manifests").delete(recordingId); await done(t); }
  async getManifest(recordingId: string) {
    const m = (await req(this.tx(["manifests"]).objectStore("manifests").get(recordingId))) as any;
    return m ? { bytes: new Uint8Array(m.bytes), sha256: m.sha256 } : undefined;
  }
  async bytesHeld(recordingId?: string) {
    let n = 0;
    const t = this.tx(["bytes", "segments"]);
    await new Promise<void>((ok, no) => {
      const c = t.objectStore("bytes").openCursor();
      c.onsuccess = () => {
        const cur = c.result;
        if (!cur) return ok();
        if (!recordingId || String(cur.key).startsWith(`${recordingId}|`)) n += (cur.value as ArrayBuffer).byteLength;
        cur.continue();
      };
      c.onerror = () => no(c.error);
    });
    return n;
  }
}
