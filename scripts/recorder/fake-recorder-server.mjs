// A stand-in for PostgREST + Storage that enforces the recorder contract
// (C1-revision "Contract for C2"), written from the migration
// supabase/migrations/20261112100000_class_recorder.sql: the same checks, in
// the same order, with the same messages (the engine classifies refusals by
// them). It is NOT the database: the migration itself is tested by
// scripts/pgtest/recorder.test.mjs. This lets the engine and the retention
// function be driven end to end without Postgres, in Node and in a browser.
//
// Failure injection: server.offline, server.failNext(op, n, error), server.corruptDownload(path),
// server.loseObject(path), server.now (a function).

import { b64 } from "./fake-supabase-client.mjs";
import { createHash, randomUUID } from "node:crypto";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const err = (message, code = "P0001") => ({ data: null, error: { message, code } });
const ok = (data) => ({ data, error: null });
const iso = (ms) => new Date(ms).toISOString();
const MIN = 60000;
/** Must equal BUCKET in src/lib/recorder/backend.ts (unit.test.mjs asserts it). */
export const BUCKET = "class-recorder-audio";

export function createFakeServer(opts = {}) {
  const s = {
    now: opts.now ?? (() => Date.now()),
    offline: false,
    settings: { pre_roll_minutes: 5, grace_minutes: 10, arm_window_minutes: 20, clock_tolerance_seconds: 15, retention_days: 30, stale_upload_days: 14,
      min_bytes_per_sec_opus: 2000, min_bytes_per_sec_flac: 4000, min_bytes_per_sec_wav: 15000, held_evidence_min_fraction: 0.5, ...(opts.settings ?? {}) },
    users: new Map(),        // id -> { roles: [] , token }
    sessions: new Map(),     // id -> { id, class_id, start (ms), end (ms), status, teacher_id, date }
    classes: new Map(),      // id -> { switchOn, consentOk, teachers:Set }
    recordings: new Map(),
    tracks: new Map(),       // `${rec}|${track}`
    chunks: new Map(),       // id -> chunk
    markers: new Map(),
    profiles: new Map(),
    objects: new Map(),      // `${bucket}/${path}` -> { bytes, size }
    runnerToken: opts.runnerToken ?? "runner-secret-token",
    log: [],
    injections: [],
    corrupt: new Set(),
  };

  s.addUser = (id, roles = ["teacher"]) => { s.users.set(id, { roles, token: `jwt-${id}` }); return `jwt-${id}`; };
  s.addClass = (id, o = {}) => { s.classes.set(id, { switchOn: true, consentOk: true, ...o, teachers: new Set(o.teachers ?? []) }); };
  /** start/end in epoch ms (the real schema keeps Hanoi date + times; the trigger converts). */
  s.addSession = (id, o) => { s.sessions.set(id, { id, status: "Scheduled", date: o.date ?? iso(o.start).slice(0, 10), ...o }); };
  s.failNext = (op, n = 1, error = { message: "Failed to fetch", offline: true }) => s.injections.push({ op, n, error });
  s.corruptDownload = (path) => s.corrupt.add(path);
  s.loseObject = (path) => s.objects.delete(`${BUCKET}/${path}`);
  s.chunkRows = (rec) => [...s.chunks.values()].filter((c) => c.recording_id === rec);

  const isAdmin = (uid) => !!uid && (s.users.get(uid)?.roles ?? []).includes("admin");
  const ownsOpen = (r, uid) => r && r.started_by === uid && ["armed", "recording", "uploading"].includes(r.status);
  const canListen = (r, uid) => {
    if (!uid) return false;
    if (isAdmin(uid)) return true;
    const c = s.classes.get(r.class_id);
    if (c?.teachers.has(uid)) return true;
    const sess = s.sessions.get(r.session_id);
    return sess?.teacher_id === uid;
  };

  function insertRecording(uid, row) {
    if (!uid) return err("A recording is started by a signed-in teacher, never by the system", "42501");
    if (!row.session_id) return err("A recording belongs to a lesson: choose the session");
    const sess = s.sessions.get(row.session_id);
    if (!sess) return err("No such session");
    if (sess.status === "Canceled") return err("This lesson is cancelled: it cannot be recorded");
    const cls = s.classes.get(sess.class_id);
    if (!(isAdmin(uid) || cls?.teachers.has(uid) || sess.teacher_id === uid)) return err("Only a teacher of this class can record it", "42501");
    if (!cls?.switchOn) return err("Recording is switched off for this class", "42501");
    if (!cls?.consentOk) return err("Recording is refused: 1 child(ren) in this class have no consent on record under wording v1-2026-11", "42501");
    const now = s.now();
    const st = s.settings;
    if (now < sess.start - st.arm_window_minutes * MIN) return err(`Too early: this lesson can be armed from ${st.arm_window_minutes} minutes before it starts`);
    if (now >= sess.end) return err("Too late: this lesson has ended");
    if (!["opus-webm", "flac", "pcm-wav"].includes(row.format)) return err('new row for relation "class_recordings" violates check constraint', "23514");
    const chunk_ms = row.chunk_ms ?? 30000;
    if (chunk_ms < 10000 || chunk_ms > 60000) return err('violates check constraint "class_recordings_chunk_ms_check"', "23514");
    if (row.device_profile_id && s.profiles.get(row.device_profile_id)?.user_id !== uid) return err("That device profile is not yours");
    for (const r of s.recordings.values()) {
      if (r.armed_session_id === sess.id && ["armed", "recording"].includes(r.status))
        return err('duplicate key value violates unique constraint "class_recordings_one_live_per_session"', "23505");
    }
    const opens = sess.start - st.pre_roll_minutes * MIN, closes = sess.end + st.grace_minutes * MIN;
    const r = {
      id: randomUUID(), class_id: sess.class_id, session_id: sess.id, armed_session_id: sess.id, session_date: sess.date,
      scheduled_start: iso(sess.start), scheduled_end: iso(sess.end), capture_opens_at: iso(opens), capture_closes_at: iso(closes),
      purpose: row.purpose ?? "lesson", status: "armed", format: row.format, chunk_ms, max_duration_ms: closes - opens,
      min_bytes_per_sec: row.format === "opus-webm" ? st.min_bytes_per_sec_opus : row.format === "flac" ? st.min_bytes_per_sec_flac : st.min_bytes_per_sec_wav,
      clock_tolerance_ms: st.clock_tolerance_seconds * 1000, held_min_fraction: st.held_evidence_min_fraction, late_after_ms: (st.late_after_minutes ?? 10) * MIN, stop_request_reason: null,
      started_by: uid, device_profile_id: row.device_profile_id ?? null, client_info: row.client_info ?? {}, armed_at: iso(now),
      client_started_at: null, client_ended_at: null, started_at: null, ended_at: null, stopped_by: null, stop_reason: null,
      stop_requested_at: null, manifest_path: null, manifest_sha256: null, completed_at: null, abandoned_at: null, abandon_reason: null,
      delete_after: iso(sess.end + st.retention_days * 86400000), deletion_requested_at: null, audio_deleted_at: null,
    };
    s.recordings.set(r.id, r);
    s.log.push(["armed", r.id]);
    return ok({ ...r });
  }

  const IMMUTABLE = ["id", "class_id", "armed_session_id", "started_by", "armed_at", "session_date", "scheduled_start", "scheduled_end",
    "capture_opens_at", "capture_closes_at", "max_duration_ms", "min_bytes_per_sec", "clock_tolerance_ms", "held_min_fraction", "purpose", "format", "chunk_ms"];

  function updateRecording(uid, id, patch, service) {
    const old = s.recordings.get(id);
    if (!old) return ok(null);
    if (!service && !(ownsOpen(old, uid) || isAdmin(uid))) return ok(null); // RLS: no row
    for (const k of IMMUTABLE) if (k in patch && patch[k] !== old[k]) return err("A recording's class, session, owner, window and format cannot be changed");
    const n = { ...old, ...patch };
    for (const k of ["started_at", "ended_at", "stopped_by", "stop_reason", "completed_at", "abandoned_at", "audio_deleted_at"]) n[k] = old[k];
    const now = s.now();
    const admin = service || isAdmin(uid);
    if (["complete", "abandoned", "deleted"].includes(old.status)) for (const k of ["manifest_path", "manifest_sha256", "abandon_reason", "client_started_at", "client_ended_at", "client_info"]) n[k] = old[k];
    if (patch.status && patch.status !== old.status) {
      const allowed = { armed: ["recording", "abandoned"], recording: ["uploading", "abandoned"], uploading: ["complete", "abandoned"], complete: ["deleted"], abandoned: ["deleted"] };
      if (!(allowed[old.status] ?? []).includes(patch.status)) return err(`A recording cannot go from ${old.status} to ${patch.status}`);
      if (patch.status === "recording") {
        if (now < Date.parse(old.capture_opens_at)) return err(`Too early: capture opens at ${old.capture_opens_at} (the pre-roll before the lesson)`);
        if (now >= Date.parse(old.capture_closes_at)) return err("The lesson window is over: this recording can no longer start");
        n.started_at = iso(now);
      } else if (patch.status === "uploading") {
        // Revision 2: a Stop later than the window + late_after is not a Stop: abandoned.
        if (now > Date.parse(old.capture_closes_at) + old.late_after_ms) {
          n.status = "abandoned"; n.abandoned_at = iso(now); n.abandon_reason = "stopped after the lesson window"; n.ended_at = iso(now); n.stop_reason = null;
          s.recordings.set(id, n);
          return ok({ ...n });
        }
        n.ended_at = iso(now);
        n.stopped_by = uid;
        const asked = patch.stop_reason;
        n.stop_reason = ["manual", "scheduled_end", "device_lost", "crash_recovered"].includes(asked) ? asked
          : (["switch_off", "session_canceled"].includes(asked) && old.stop_request_reason === asked) ? asked : "manual";
      } else if (patch.status === "complete") {
        if (n.manifest_path !== `${old.class_id}/${old.id}/manifest.json` || !n.manifest_sha256) return err("A recording is complete only with its manifest and the manifest's checksum");
        if (!old.started_at || !old.ended_at) return err("A recording the server did not see start and stop cannot be complete");
        if (!s.objects.has(`${BUCKET}/${n.manifest_path}`)) return err("The manifest is not in storage yet");
        const rows = s.chunkRows(id);
        if (rows.some((c) => !c.confirmed_at)) return err("Some chunks are registered but not confirmed in storage");
        const tr = [...s.tracks.values()].filter((t) => t.recording_id === id);
        if (!tr.some((t) => t.chunk_count > 0)) return err("A recording with no audio cannot be complete");
        for (const t of tr) {
          const mine = rows.filter((c) => c.track === t.track);
          const maxp1 = mine.length ? Math.max(...mine.map((c) => c.seq)) + 1 : 0;
          if (t.chunk_count == null || t.chunk_count !== mine.length || t.chunk_count !== maxp1) return err("The chunks in storage are not the ones the manifest counts");
        }
        for (const c of rows) { const o = s.objects.get(`${BUCKET}/${c.storage_path}`); if (!o || o.size !== c.stored_size) return err("A confirmed chunk is no longer in storage at the size it was confirmed with"); }
        for (const a of rows) { const b = rows.find((x) => x.track === a.track && x.seq === a.seq + 1); if (b && b.t_start_ms < a.t_end_ms - 100) return err("Two chunks of one track overlap: the audio would be counted twice"); }
        const span = Date.parse(old.ended_at) - Date.parse(old.started_at);
        if (rows.some((c) => c.t_end_ms > span + old.clock_tolerance_ms)) return err(`The audio claims to be longer than the server saw the recording run (${span} ms)`);
        n.completed_at = iso(now);
      } else if (patch.status === "abandoned") {
        n.abandoned_at = iso(now);
        n.abandon_reason = (patch.abandon_reason ?? "").trim() || "unspecified";
        if (old.started_at && !old.ended_at) n.ended_at = iso(Math.min(now, Date.parse(old.capture_closes_at)));
      } else if (patch.status === "deleted") {
        if (!admin) return err("Only an admin or the retention job marks audio deleted", "42501");
        const prefix = `${BUCKET}/${old.class_id}/${old.id}/`;
        if ([...s.objects.keys()].some((k) => k.startsWith(prefix))) return err("Audio is still in storage: remove the files first");
        n.audio_deleted_at = iso(now);
      }
    }
    s.recordings.set(id, n);
    s.log.push(["update", id, patch.status ?? "fields"]);
    return ok({ ...n });
  }

  function registerChunk(uid, a) {
    const r = s.recordings.get(a.p_recording);
    if (!r || !uid || r.started_by !== uid) return err("Not your recording", "42501");
    if (!["recording", "uploading"].includes(r.status)) return err(`This recording is ${r.status} and takes no more audio`);
    if (!r.started_at) return err("The server did not see this recording start: no audio is accepted");
    if (!["teacher", "room"].includes(a.p_track)) return err("The track is teacher or room");
    if (!s.tracks.has(`${r.id}|${a.p_track}`)) return err(`Describe the ${a.p_track} track before sending its audio`);
    if (a.p_seq == null || a.p_seq < 0 || a.p_seq > 99999 || !(a.p_byte_size > 0) || !/^[0-9a-f]{64}$/.test(a.p_sha256 ?? "") || a.p_t_start_ms < 0 || !(a.p_t_end_ms > a.p_t_start_ms))
      return err("A chunk needs a number, a size, a SHA-256 and a time span");
    const started = Date.parse(r.started_at);
    if (r.stop_requested_at && a.p_t_start_ms > Date.parse(r.stop_requested_at) - started + 60000) return err("Recording was asked to stop: audio captured after that is refused");
    const span = a.p_t_end_ms - a.p_t_start_ms;
    if (span > r.chunk_ms + r.clock_tolerance_ms) return err(`A chunk is at most ${r.chunk_ms} ms of audio: refused`);
    if (a.p_byte_size * 1000 < r.min_bytes_per_sec * span) return err(`This chunk is too small to hold ${span} ms of ${r.format} audio (at least ${r.min_bytes_per_sec} bytes a second): refused`);
    const elapsed = s.now() - started;
    if (a.p_t_end_ms > elapsed + r.clock_tolerance_ms) return err(`This audio ends later than the server's clock says capture has run (${elapsed} ms): refused`);
    if (r.ended_at && a.p_t_end_ms > Date.parse(r.ended_at) - started + r.clock_tolerance_ms) return err("This audio is from after Stop: refused");
    if (started + a.p_t_end_ms > Date.parse(r.capture_closes_at) + r.clock_tolerance_ms) return err("This audio is from after the lesson window: it is refused");
    const ext = r.format === "opus-webm" ? "webm" : r.format === "flac" ? "flac" : "wav";
    const path = `${r.class_id}/${r.id}/${a.p_track}/${String(a.p_seq).padStart(6, "0")}.${ext}`;
    const have = s.chunkRows(r.id).find((c) => c.track === a.p_track && c.seq === a.p_seq);
    if (have) {
      if (have.sha256 !== a.p_sha256.toLowerCase() || have.byte_size !== a.p_byte_size || have.t_start_ms !== a.p_t_start_ms || have.t_end_ms !== a.p_t_end_ms)
        return err(`Chunk ${a.p_seq} of the ${a.p_track} track is already registered with different audio`);
      return ok({ chunk_id: have.id, storage_path: have.storage_path, already_registered: true, confirmed: !!have.confirmed_at, late: !!have.late });
    }
    // Revision 2: registered later than started_at + t_end_ms + late_after_ms:
    // stored but marked late (never evidence).
    const late = s.now() > started + a.p_t_end_ms + r.late_after_ms;
    const c = { id: randomUUID(), recording_id: r.id, track: a.p_track, seq: a.p_seq, storage_path: path, byte_size: a.p_byte_size, sha256: a.p_sha256.toLowerCase(),
      t_start_ms: a.p_t_start_ms, t_end_ms: a.p_t_end_ms, registered_by: uid, registered_at: iso(s.now()), stored_size: null, confirmed_at: null, late };
    s.chunks.set(c.id, c);
    return ok({ chunk_id: c.id, storage_path: path, already_registered: false, confirmed: false, late });
  }

  function confirmChunk(uid, a) {
    const c = s.chunks.get(a.p_chunk);
    if (!c) return err("No such chunk");
    const r = s.recordings.get(c.recording_id);
    if (!uid || r?.started_by !== uid) return err("Not your recording", "42501");
    if (c.confirmed_at) return ok(true);
    if (!a.p_readback_sha256 || a.p_readback_sha256.toLowerCase() !== c.sha256) return err("What storage returned does not match the audio that was recorded: keep the local copy");
    const o = s.objects.get(`${BUCKET}/${c.storage_path}`);
    if (!o) return err("The file is not in storage: keep the local copy");
    if (o.size !== c.byte_size) return err(`Storage holds ${o.size} bytes, the recorder made ${c.byte_size}: keep the local copy`);
    c.stored_size = o.size; c.confirmed_at = iso(s.now());
    return ok(true);
  }

  function canUpload(uid, path) {
    const m = /^([0-9a-f-]{36})\/([0-9a-f-]{36})\/(manifest\.json|(teacher|room)\/[0-9]{6}\.(webm|flac|wav))$/.exec(path);
    if (!m || !uid) return false;
    const r = s.recordings.get(m[2]);
    if (!r || r.class_id !== m[1] || r.started_by !== uid) return false;
    if (m[3] === "manifest.json") return r.status === "uploading";
    return ["recording", "uploading"].includes(r.status) && s.chunkRows(r.id).some((c) => c.storage_path === path && !c.confirmed_at);
  }

  function handle(q, uid, service = false) {
    // Failure injection first: as if the network had dropped.
    if (s.offline) throw new TypeError("Failed to fetch");
    const key = q.op === "rpc" ? `rpc:${q.fn}` : q.op === "insert" || q.op === "update" || q.op === "select" || q.op === "upsert" ? `${q.op}:${q.table}` : q.op;
    const inj = s.injections.find((i) => i.op === key && i.n > 0);
    if (inj) { inj.n--; if (inj.error.offline) throw new TypeError("Failed to fetch"); return { data: null, error: inj.error }; }
    s.log.push(["op", key]);
    const filt = Object.fromEntries(q.filters ?? []);
    switch (key) {
      case "getUser": {
        const u = [...s.users.entries()].find(([, v]) => v.token === q.token);
        return u ? ok({ user: { id: u[0], email: `${u[0]}@hec.test` } }) : { data: { user: null }, error: { message: "invalid JWT" } };
      }
      case "select:user_roles": return ok((s.users.get(filt.user_id)?.roles ?? []).map((role) => ({ role })));
      case "select:schedule_runner": return service ? ok({ token: s.runnerToken }) : ok(null);
      case "rpc:recorder_server_time": return ok(iso(s.now()));
      case "insert:class_recordings": {
        const r = insertRecording(uid, q.row);
        return r;
      }
      case "select:class_recordings": {
        const r = s.recordings.get(filt.id);
        if (!r || !(service || ownsOpen(r, uid) || canListen(r, uid))) return q.single === "single" ? err("JSON object requested, multiple (or no) rows returned", "PGRST116") : ok(null);
        return ok({ ...r });
      }
      case "update:class_recordings": {
        const r = updateRecording(uid, filt.id, q.patch, service);
        if (!r.error && r.data === null && q.single === "single") return err("JSON object requested, multiple (or no) rows returned", "PGRST116");
        return r;
      }
      case "insert:class_recording_tracks": {
        const row = q.row; const r = s.recordings.get(row.recording_id);
        if (!ownsOpen(r, uid)) return err('new row violates row-level security policy for table "class_recording_tracks"', "42501");
        if (row.sample_rate != null && (row.sample_rate < 8000 || row.sample_rate > 48000)) return err('violates check constraint "class_recording_tracks_sample_rate_check"', "23514");
        if (row.channel_count !== 1) return err('violates check constraint "class_recording_tracks_channel_count_check"', "23514");
        const k = `${row.recording_id}|${row.track}`;
        if (s.tracks.has(k)) return err('duplicate key value violates unique constraint "class_recording_tracks_pkey"', "23505");
        s.tracks.set(k, { ...row, chunk_count: null });
        return ok(null);
      }
      case "update:class_recording_tracks": {
        const k = `${filt.recording_id}|${filt.track}`; const t = s.tracks.get(k); const r = s.recordings.get(filt.recording_id);
        if (!t || !ownsOpen(r, uid)) return ok(null);
        s.tracks.set(k, { ...t, ...q.patch });
        return ok(null);
      }
      case "rpc:recorder_register_chunk": return registerChunk(uid, q.args);
      case "rpc:recorder_confirm_chunk": return confirmChunk(uid, q.args);
      case "insert:class_recording_markers": {
        const m = q.row; const r = s.recordings.get(m.recording_id);
        if (!ownsOpen(r, uid)) return err('new row violates row-level security policy for table "class_recording_markers"', "42501");
        if (m.t_ms > r.max_duration_ms) return err("This marker is after the end of the recording window");
        if ((m.kind === "student_name") !== (m.student_id != null)) return err("A name chip names a child, and only a name chip does");
        const k = `${m.recording_id}|${m.client_marker_id}`;
        if (s.markers.has(k)) return err('duplicate key value violates unique constraint "class_recording_markers_once"', "23505");
        s.markers.set(k, { ...m, created_by: uid });
        return ok(null);
      }
      case "upsert:recorder_device_profiles": {
        const row = q.row;
        if (row.user_id !== uid) return err('new row violates row-level security policy for table "recorder_device_profiles"', "42501");
        if (row.teacher_device_hash && row.teacher_device_hash === row.room_device_hash) return err('violates check constraint "recorder_device_profile_two_devices"', "23514");
        const have = [...s.profiles.values()].find((p) => p.user_id === row.user_id && p.install_id === row.install_id);
        const p = { ...(have ?? { id: randomUUID() }), ...row };
        s.profiles.set(p.id, p);
        return ok({ id: p.id });
      }
      case "select:sessions": { const x = s.sessions.get(filt.id); return ok(x ? { status: x.status } : null); }
      case "upload": {
        const k = `${q.bucket}/${q.path}`;
        if (q.bucket !== BUCKET) return err("Bucket not found");
        if (!(service || canUpload(uid, q.path))) return { data: null, error: { statusCode: "403", message: "new row violates row-level security policy" } };
        if (s.objects.has(k)) return { data: null, error: { statusCode: "409", error: "Duplicate", message: "The resource already exists" } };
        const bytes = b64.dec(q.bytes);
        if (bytes.length > 8388608) return { data: null, error: { statusCode: "413", message: "The object exceeded the maximum allowed size" } };
        s.objects.set(k, { bytes, size: bytes.length, contentType: q.contentType });
        return ok({ path: q.path });
      }
      case "download": {
        const k = `${q.bucket}/${q.path}`; const o = s.objects.get(k);
        const m = /^[0-9a-f-]{36}\/([0-9a-f-]{36})\//.exec(q.path); const r = m && s.recordings.get(m[1]);
        if (!o || !r || !(service || canListen(r, uid) || ownsOpen(r, uid)) || r.status === "deleted") return { data: null, error: { statusCode: "400", message: "Object not found" } };
        let bytes = o.bytes;
        if (s.corrupt.has(q.path)) { bytes = bytes.slice(); bytes[bytes.length - 1] ^= 0xff; }
        return ok(b64.enc(bytes));
      }
      // ---- the retention job's calls (service role only, as the grants say)
      case "rpc:recorder_expire_stale": {
        if (!service) return err("permission denied for function recorder_expire_stale", "42501");
        let n = 0;
        for (const r of s.recordings.values()) if (["armed", "recording", "uploading"].includes(r.status) && Date.parse(r.scheduled_end) + s.settings.stale_upload_days * 86400000 < s.now()) {
          updateRecording(null, r.id, { status: "abandoned", abandon_reason: "never finished" }, true); n++;
        }
        return ok(n);
      }
      case "rpc:recorder_retention_due": {
        const rows = [...s.recordings.values()].filter((r) => !r.audio_deleted_at && ["complete", "abandoned"].includes(r.status) && Date.parse(r.delete_after) <= s.now() && (service || canListen(r, uid)))
          .sort((a, b) => Date.parse(a.delete_after) - Date.parse(b.delete_after))
          .map((r) => ({ recording_id: r.id, class_id: r.class_id, storage_prefix: `${r.class_id}/${r.id}/`, status: r.status, delete_after: r.delete_after, deletion_requested: !!r.deletion_requested_at }));
        return ok(rows);
      }
      case "rpc:recorder_mark_audio_deleted": {
        const r = s.recordings.get(q.args.p_recording);
        if (!r || !["complete", "abandoned"].includes(r.status)) return ok(false);
        const u = updateRecording(uid, r.id, { status: "deleted" }, service);
        return u.error ? u : ok(true);
      }
      case "list": {
        if (!service) return ok([]);
        const prefix = q.prefix ? `${q.bucket}/${q.prefix.replace(/\/$/, "")}/` : `${q.bucket}/`;
        const names = new Map();
        for (const k of s.objects.keys()) {
          if (!k.startsWith(prefix)) continue;
          const rest = k.slice(prefix.length);
          const slash = rest.indexOf("/");
          if (slash === -1) names.set(rest, { name: rest, id: `obj-${rest}`, metadata: { size: s.objects.get(k).size } });
          else names.set(rest.slice(0, slash), { name: rest.slice(0, slash), id: null, metadata: null });
        }
        const all = [...names.values()].sort((a, b) => a.name.localeCompare(b.name));
        return ok(all.slice(q.offset, q.offset + q.limit));
      }
      case "remove": {
        if (!service) return ok([]);
        const out = [];
        for (const p of q.paths) { const k = `${q.bucket}/${p}`; if (s.objects.delete(k)) out.push({ name: p }); }
        s.log.push(["remove", q.paths.length]);
        return ok(out);
      }
      default:
        return err(`fake server: unsupported operation ${key}`, "PGRST000");
    }
  }

  s.handle = async (q, uid, service = false) => handle(q, uid, service);
  return s;
}
