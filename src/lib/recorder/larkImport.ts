// The Lark import's pure parts (owner, 28 Nov 2026: four Hollyland LARK MAX 2 transmitters among the children,
// each recording internally to WAV). Nothing here reads a file or the network: the page reads the bytes
// (File.slice) and hands them in, so the same code runs in the browser, the Worker and the Node tests.
//
//   parseWavHeader      RIFF / RF64 / BW64 WAV: PCM 16/24/32-bit integer, 32/64-bit float, WAVE_FORMAT_EXTENSIBLE;
//                       bext (BWF) and iXML recorded-start metadata. Anything else is refused.
//   parseTrailingChunks bext / iXML written after the audio (some recorders do).
//   guessTransmitter    1-4 from the folder or file name ("TX2", "MIC 3", "Lark_4"); the teacher corrects it.
//   layoutTransmitter   one transmitter's files in order, on the transmitter's own timeline (split files joined;
//                       a gap the recorded start times show is kept as silence).
//   checkLength         "far from the lesson's length" - the same bounds the server holds (recorder_lark_begin).
//   chunkPlan           4-minute chunks of the 16 kHz timeline (the contract in 20261128120000_recorder_lark_tracks.sql).
//   sourceForServer     the track's `source` jsonb.

export const LARK_OUT_RATE = 16000;            // RECORDER_SAMPLE_RATE (src/lib/recorder/index.ts); kept equal in the test
export const LARK_CHUNK_MS = 240000;           // 4 minutes: a worst-case FLAC chunk (7.7 MB) fits the 8 MB bucket limit
export const LARK_CHUNK_FRAMES = (LARK_OUT_RATE / 1000) * LARK_CHUNK_MS;
/** A gap longer than this between two files of one transmitter means they are not one lesson. */
export const MAX_FILE_GAP_MS = 30 * 60000;
/** Start times closer than this to "the next file starts where the last one ended" are joined exactly. */
export const JOIN_SLACK_MS = 500;

export class LarkFileError extends Error {
  constructor(public code: "not_wav" | "unsupported" | "truncated" | "too_short", message: string) { super(message); }
}

export interface WavMeta {
  /** BWF bext OriginationDate / OriginationTime as written ("2026-11-28", "14:30:00"). */
  originationDate?: string;
  originationTime?: string;
  /** BWF TimeReference: samples since midnight at the first sample. */
  timeReferenceSamples?: number;
  /** iXML timecode fields, as written. */
  ixml?: { samplesSinceMidnight?: number; sampleRate?: number; timecodeRate?: string; timecodeFlag?: string; note?: string };
  description?: string;
  originator?: string;
}

export interface WavInfo {
  container: "RIFF" | "RF64" | "BW64";
  formatTag: number;          // 1 PCM, 3 IEEE float (after resolving EXTENSIBLE)
  isFloat: boolean;
  bitDepth: number;           // 16 | 24 | 32 | 64
  bytesPerSample: number;
  channels: number;
  sampleRate: number;
  blockAlign: number;
  dataOffset: number;         // byte offset of the first sample in the file
  dataBytes: number;          // bytes of audio actually in the file (clamped to the file)
  frames: number;
  durationMs: number;
  truncated: boolean;         // the header claimed more audio than the file holds (a recording cut by power loss)
  meta: WavMeta;
  /** Where chunks after the audio would start, when the file has more bytes after it. */
  afterDataOffset: number | null;
}

const ascii = (b: Uint8Array, o: number, n: number) => {
  let s = "";
  for (let i = 0; i < n && o + i < b.length; i++) s += String.fromCharCode(b[o + i]);
  return s;
};
const cstr = (b: Uint8Array, o: number, n: number) => ascii(b, o, n).replace(/\0[\s\S]*$/, "").trim();
const u32 = (v: DataView, o: number) => v.getUint32(o, true);
const u64 = (v: DataView, o: number) => v.getUint32(o, true) + v.getUint32(o + 4, true) * 0x100000000;

/** How many bytes of a file's start parseWavHeader wants: enough for long bext / iXML / JUNK before the audio. */
export const WAV_HEAD_BYTES = 1 << 20;

function readBext(b: Uint8Array, o: number, size: number, meta: WavMeta) {
  if (size < 346) return;
  const v = new DataView(b.buffer, b.byteOffset + o, Math.min(size, b.length - o));
  meta.description = cstr(b, o, 256) || undefined;
  meta.originator = cstr(b, o + 256, 32) || undefined;
  meta.originationDate = cstr(b, o + 320, 10) || undefined;
  meta.originationTime = cstr(b, o + 330, 8) || undefined;
  const tr = u64(v, 338);
  if (tr > 0) meta.timeReferenceSamples = tr;
}

function readIxml(b: Uint8Array, o: number, size: number, meta: WavMeta) {
  const xml = ascii(b, o, Math.min(size, 65536));
  const tag = (t: string) => { const m = new RegExp(`<${t}>\\s*([^<]*?)\\s*</${t}>`, "i").exec(xml); return m ? m[1] : undefined; };
  const hi = tag("TIMESTAMP_SAMPLES_SINCE_MIDNIGHT_HI"), lo = tag("TIMESTAMP_SAMPLES_SINCE_MIDNIGHT_LO");
  const ix: NonNullable<WavMeta["ixml"]> = {};
  if (hi != null && lo != null && /^\d+$/.test(hi) && /^\d+$/.test(lo)) ix.samplesSinceMidnight = Number(hi) * 0x100000000 + Number(lo);
  const sr = tag("TIMESTAMP_SAMPLE_RATE");
  if (sr && /^\d+$/.test(sr)) ix.sampleRate = Number(sr);
  ix.timecodeRate = tag("TIMECODE_RATE");
  ix.timecodeFlag = tag("TIMECODE_FLAG");
  ix.note = tag("NOTE");
  if (Object.values(ix).some((x) => x !== undefined)) meta.ixml = ix;
}

function readMetaChunk(id: string, b: Uint8Array, o: number, size: number, meta: WavMeta) {
  if (id === "bext") readBext(b, o, size, meta);
  else if (id === "iXML") readIxml(b, o, size, meta);
}

/**
 * Parse a WAV file's header from its first bytes (`head`, ideally WAV_HEAD_BYTES of it) and its size.
 * Throws LarkFileError for anything that is not a WAV the import can read.
 */
export function parseWavHeader(head: Uint8Array, fileSize: number): WavInfo {
  if (head.length < 12) throw new LarkFileError("not_wav", "This is not a WAV file (it is too small)");
  const v = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const riff = ascii(head, 0, 4);
  if ((riff !== "RIFF" && riff !== "RF64" && riff !== "BW64") || ascii(head, 8, 4) !== "WAVE") {
    throw new LarkFileError("not_wav", "This is not a WAV file");
  }
  const container = riff as WavInfo["container"];
  let ds64Data: number | null = null;
  let fmt: { tag: number; ch: number; rate: number; align: number; bits: number } | null = null;
  const meta: WavMeta = {};
  let o = 12;
  while (o + 8 <= head.length) {
    const id = ascii(head, o, 4);
    let size = u32(v, o + 4);
    const body = o + 8;
    if (id === "ds64" && size >= 24 && body + 24 <= head.length) {
      ds64Data = u64(v, body + 8);
    }
    if (id === "fmt ") {
      if (body + 16 > head.length) break;
      let tag = v.getUint16(body, true);
      const ch = v.getUint16(body + 2, true), rate = u32(v, body + 4), align = v.getUint16(body + 12, true);
      const bits = v.getUint16(body + 14, true);
      if (tag === 0xfffe && size >= 40 && body + 40 <= head.length) {
        tag = v.getUint16(body + 24, true);      // the SubFormat GUID's first two bytes; the container width decodes
      }
      fmt = { tag, ch, rate, align, bits };
    }
    if (id === "data") {
      if (!fmt) throw new LarkFileError("unsupported", "This WAV file has its audio before its format: it cannot be read");
      if (size === 0xffffffff && ds64Data != null) size = ds64Data;
      const isFloat = fmt.tag === 3;
      if (fmt.tag !== 1 && fmt.tag !== 3) throw new LarkFileError("unsupported", `This WAV file is compressed (format ${fmt.tag}): only PCM or float WAV can be read`);
      const okBits = isFloat ? [32, 64] : [16, 24, 32];
      if (!okBits.includes(fmt.bits)) throw new LarkFileError("unsupported", `This WAV file is ${fmt.bits}-bit ${isFloat ? "float" : "integer"}: only 16, 24 or 32-bit integer and 32-bit float are read`);
      if (fmt.ch < 1 || fmt.ch > 8) throw new LarkFileError("unsupported", `This WAV file has ${fmt.ch} channels`);
      if (fmt.rate < 8000 || fmt.rate > 192000) throw new LarkFileError("unsupported", `This WAV file is at ${fmt.rate} Hz`);
      const bytesPerSample = fmt.bits / 8;
      const blockAlign = fmt.align || bytesPerSample * fmt.ch;
      if (blockAlign !== bytesPerSample * fmt.ch) throw new LarkFileError("unsupported", "This WAV file's sample layout is not one the import reads");
      const inFile = Math.max(0, fileSize - body);
      const claimed = size;
      let dataBytes = Math.min(claimed, inFile);
      dataBytes -= dataBytes % blockAlign;
      const frames = dataBytes / blockAlign;
      const truncated = claimed > inFile + blockAlign;
      const end = body + claimed + (claimed % 2);
      return {
        container, formatTag: fmt.tag, isFloat, bitDepth: fmt.bits, bytesPerSample, channels: fmt.ch, sampleRate: fmt.rate,
        blockAlign, dataOffset: body, dataBytes, frames, durationMs: Math.floor((frames * 1000) / fmt.rate), truncated, meta,
        afterDataOffset: !truncated && end + 8 <= fileSize ? end : null,
      };
    }
    if (body + size <= head.length) readMetaChunk(id, head, body, size, meta);
    o = body + size + (size % 2);
  }
  if (o >= head.length && o < fileSize) throw new LarkFileError("unsupported", "This WAV file's header is longer than expected: it cannot be read");
  throw new LarkFileError("truncated", "This WAV file has no audio in it");
}

/** bext / iXML chunks after the audio: `tail` are the file's bytes from info.afterDataOffset. Fills info.meta. */
export function parseTrailingChunks(info: WavInfo, tail: Uint8Array): WavInfo {
  const v = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let o = 0;
  while (o + 8 <= tail.length) {
    const id = ascii(tail, o, 4);
    const size = u32(v, o + 4);
    if (!/^[\x20-\x7e]{4}$/.test(id)) break;
    if (o + 8 + size <= tail.length) readMetaChunk(id, tail, o + 8, size, info.meta);
    o += 8 + size + (size % 2);
  }
  return info;
}

/** The device's recorded start of a file, when its metadata says: seconds since 1970 on the DEVICE's clock (no zone),
 *  and the text form for the server. Date from bext OriginationDate; time of day from TimeReference, else iXML,
 *  else OriginationTime. */
export function recordedStart(info: WavInfo): { sec: number; text: string; timeOfDayOnly: boolean } | null {
  const m = info.meta;
  let tod: number | null = null;
  if (m.timeReferenceSamples != null) tod = m.timeReferenceSamples / info.sampleRate;
  else if (m.ixml?.samplesSinceMidnight != null) tod = m.ixml.samplesSinceMidnight / (m.ixml.sampleRate || info.sampleRate);
  else if (m.originationTime) {
    const t = /^(\d{1,2})[:\-.](\d{2})[:\-.](\d{2})$/.exec(m.originationTime);
    if (t) tod = Number(t[1]) * 3600 + Number(t[2]) * 60 + Number(t[3]);
  }
  if (tod == null || !Number.isFinite(tod) || tod < 0 || tod >= 86400 * 2) return null;
  const d = m.originationDate ? /^(\d{4})[-:/.](\d{2})[-:/.](\d{2})$/.exec(m.originationDate) : null;
  const day = d ? Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3])) / 1000 : 0;
  const sec = day + tod;
  const ms = Math.round((tod % 1) * 1000);
  const hh = Math.floor(tod / 3600) % 24, mm = Math.floor(tod / 60) % 60, ss = Math.floor(tod) % 60;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  const time = `${p(hh)}:${p(mm)}:${p(ss)}.${p(ms, 3)}`;
  return { sec, text: d ? `${d[1]}-${d[2]}-${d[3]}T${time}` : time, timeOfDayOnly: !d };
}

/** Transmitter 1-4 from a folder or file name, or null. The folder wins (a card copied into "TX2/"). */
export function guessTransmitter(name: string, relativePath = ""): 1 | 2 | 3 | 4 | null {
  const pats = [
    /(?<![A-Za-z0-9])(?:TX|RX)[\s_-]*([1-4])(?![0-9])/i,
    /(?<![A-Za-z0-9])(?:MIC|MICRO|MICROPHONE|CH|CHANNEL|TRANSMITTER|LARK|KID|STICKER)[\s_#-]*([1-4])(?![0-9])/i,
    /^(?:T|M|L)?([1-4])$/i,
  ];
  const dirs = relativePath.split("/").slice(0, -1).reverse();
  const base = name.replace(/\.[^.]+$/, "");
  for (const part of [...dirs, base]) {
    for (const re of pats) {
      const m = re.exec(part);
      if (m) return Number(m[1]) as 1 | 2 | 3 | 4;
    }
  }
  return null;
}

export interface LarkFile {
  /** A key the page uses for the File (index or name). */
  key: string;
  name: string;
  relativePath?: string;
  bytes: number;
  lastModified?: number;
  info: WavInfo;
}

export interface LaidOutFile extends LarkFile {
  /** Where its first sample sits on the transmitter's timeline, in source frames and in ms. */
  offsetFrames: number;
  offsetMs: number;
  start: ReturnType<typeof recordedStart>;
}

export interface TransmitterLayout {
  transmitter: number;
  files: LaidOutFile[];
  sampleRate: number;
  /** Source frames of the whole timeline (last file's end). */
  timelineFrames: number;
  /** 16 kHz frames, a whole number of ms. */
  outFrames: number;
  durationMs: number;
  /** "start-times" when every file's recorded start placed it; "contiguous" when the files were simply joined. */
  placedBy: "start-times" | "contiguous" | "single";
  problems: string[];
  notes: string[];
}

const trailingNumber = (n: string) => { const m = /(\d+)(?!.*\d)/.exec(n.replace(/\.[^.]+$/, "")); return m ? Number(m[1]) : null; };

/** One transmitter's files, in order, on its own timeline. Problems refuse the import; notes are for the teacher. */
export function layoutTransmitter(transmitter: number, input: LarkFile[]): TransmitterLayout {
  const problems: string[] = [];
  const notes: string[] = [];
  if (!input.length) problems.push("No files");
  const rates = new Set(input.map((f) => f.info.sampleRate));
  if (rates.size > 1) problems.push(`The files are at different sample rates (${[...rates].join(", ")} Hz): they are not one recording`);
  const sampleRate = input[0]?.info.sampleRate ?? 48000;
  const withStart = input.map((f) => ({ f, start: recordedStart(f.info) }));
  const allStarts = withStart.length > 1 && withStart.every((x) => x.start)
    && new Set(withStart.map((x) => x.start!.timeOfDayOnly)).size === 1;
  const ordered = [...withStart].sort((a, b) => {
    if (allStarts) return a.start!.sec - b.start!.sec || a.f.name.localeCompare(b.f.name);
    const na = trailingNumber(a.f.name), nb = trailingNumber(b.f.name);
    if (na != null && nb != null && na !== nb) return na - nb;
    if (a.f.lastModified != null && b.f.lastModified != null && a.f.lastModified !== b.f.lastModified) return a.f.lastModified - b.f.lastModified;
    return a.f.name.localeCompare(b.f.name);
  });
  const files: LaidOutFile[] = [];
  let end = 0;
  for (let i = 0; i < ordered.length; i++) {
    const { f, start } = ordered[i];
    let offset = end;
    if (i > 0 && allStarts) {
      const want = Math.round((start!.sec - ordered[0].start!.sec) * sampleRate);
      const gapMs = ((want - end) * 1000) / sampleRate;
      if (gapMs < -JOIN_SLACK_MS) problems.push(`${f.name} starts before ${ordered[i - 1].f.name} ends (${Math.round(-gapMs / 1000)} s overlap): they are not one recording`);
      else if (gapMs > MAX_FILE_GAP_MS) problems.push(`${f.name} starts ${Math.round(gapMs / 60000)} min after ${ordered[i - 1].f.name} ends: it is not the same lesson`);
      else if (gapMs > JOIN_SLACK_MS) { offset = want; notes.push(`${Math.round(gapMs / 1000)} s of silence between ${ordered[i - 1].f.name} and ${f.name} (the transmitter paused)`); }
    }
    if (f.info.truncated) notes.push(`${f.name} was cut short (the transmitter lost power?): the audio it holds is used`);
    files.push({ ...f, offsetFrames: offset, offsetMs: Math.round((offset * 1000) / sampleRate), start });
    end = offset + f.info.frames;
  }
  if (input.length > 1 && !allStarts) notes.push("The files carry no recorded start times: they are joined end to end in name order");
  const outRaw = Math.floor((end * LARK_OUT_RATE) / sampleRate);
  const outFrames = outRaw - (outRaw % (LARK_OUT_RATE / 1000));
  return {
    transmitter, files, sampleRate, timelineFrames: end, outFrames, durationMs: outFrames / (LARK_OUT_RATE / 1000),
    placedBy: input.length === 1 ? "single" : allStarts ? "start-times" : "contiguous", problems, notes,
  };
}

/** The same bounds recorder_lark_begin holds: 1 minute to the lesson + 90 minutes, and at least a quarter of it. */
export function checkLength(durationMs: number, lessonMs: number): string | null {
  const min = (ms: number) => Math.round(ms / 60000);
  if (durationMs < 60000) return `Only ${Math.round(durationMs / 1000)} s of audio: this is not a lesson recording`;
  if (durationMs > lessonMs + 90 * 60000) return `${min(durationMs)} min of audio for a ${min(lessonMs)} min lesson: these files are not this lesson`;
  if (durationMs * 4 < lessonMs) return `Only ${min(durationMs)} min of a ${min(lessonMs)} min lesson: these files are not the whole lesson`;
  return null;
}

export interface ChunkSpan { seq: number; outStart: number; outEnd: number; tStartMs: number; tEndMs: number }

/** 4-minute chunks over the 16 kHz timeline; t_start_ms = seq x 240 000, as the server checks. */
export function chunkPlan(outFrames: number): ChunkSpan[] {
  const per = LARK_OUT_RATE / 1000;
  const out: ChunkSpan[] = [];
  for (let seq = 0, s = 0; s < outFrames; seq++, s += LARK_CHUNK_FRAMES) {
    const e = Math.min(outFrames, s + LARK_CHUNK_FRAMES);
    out.push({ seq, outStart: s, outEnd: e, tStartMs: s / per, tEndMs: e / per });
  }
  return out;
}

/** The track's `source` jsonb (contract: 20261128120000_recorder_lark_tracks.sql). */
export function sourceForServer(l: TransmitterLayout) {
  const first = l.files[0];
  return {
    kind: "lark",
    transmitter: l.transmitter,
    sample_rate: l.sampleRate,
    bit_depth: first?.info.bitDepth ?? null,
    float: first?.info.isFloat ?? null,
    recorded_start: first?.start?.text ?? null,
    duration_ms: l.durationMs,
    placed_by: l.placedBy,
    files: l.files.map((f) => ({
      name: f.name,
      bytes: f.bytes,
      last_modified: f.lastModified != null ? new Date(f.lastModified).toISOString() : null,
      offset_ms: f.offsetMs,
      duration_ms: f.info.durationMs,
      sample_rate: f.info.sampleRate,
      bit_depth: f.info.bitDepth,
      float: f.info.isFloat,
      channels: f.info.channels,
      truncated: f.info.truncated,
      recorded_start: f.start?.text ?? null,
      time_reference_samples: f.info.meta.timeReferenceSamples ?? null,
      timecode: f.info.meta.ixml ?? null,
      originator: f.info.meta.originator ?? null,
    })),
  };
}
