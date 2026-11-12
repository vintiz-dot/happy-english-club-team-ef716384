// The error taxonomy the UI renders. Every failure the engine reports is a
// RecorderError with one of these codes; a server refusal also carries the
// refusal reason read from the database's message.

export type RecorderErrorCode =
  | "permission_denied"      // the microphone permission was refused
  | "device_missing"         // a saved microphone is not plugged in
  | "device_ambiguous"       // two devices look like the saved one: run the microphone check
  | "same_device_twice"      // both roles resolve to one device (or an alias of it)
  | "device_unplugged"       // a track ended mid-recording
  | "device_lost"            // ...and did not come back in time
  | "constraint_not_honoured"// the browser kept a processing flag on (reported, not fatal)
  | "audio_context_suspended"// the browser wants a click before audio can run
  | "unsupported"            // the browser lacks an API the engine needs
  | "offline"                // no network: queued, will retry
  | "server_refused"         // the server said no; see `refusal`
  | "not_signed_in"
  | "quota"                  // the browser refused to store more (QuotaExceededError)
  | "storage_low"            // free browser storage under the threshold
  | "another_tab"            // the recorder is already running in another tab
  | "clock_unknown"          // the server's time could not be read: do not arm
  // ---- added by the C2 revision (additive)
  | "capture_stalled"        // capturing, but no audio is arriving (context suspended / worklet dead): NOT recording
  | "server_unavailable"     // a 5xx, gateway timeout or no answer: retried with backoff
  | "mic_silent"             // a microphone delivers digital silence / nothing while the other is live
  | "start_delayed"          // the server stamped the start late: the audio before its stamp is not part of the recording
  | "start_failed"           // the server refused to start the recording; the audio captured so far is kept locally
  | "stop_pending"           // Stop has not reached the server yet; it is retried
  | "not_durable"            // this browser cannot keep audio across a crash (no IndexedDB): do not record here
  | "local_store_failed"     // the browser would not store a chunk; it is held in memory and retried, or the track ends there
  | "clipping"               // a microphone reaches full scale (0 dBFS): turn its gain down (a warning; nothing stops)
  | "internal";

export type ServerRefusal =
  | "too_early"              // capture or arming before the window
  | "window_closed"          // the lesson (window) is over
  | "switch_off"             // recording is switched off for the class
  | "consent_missing"        // a child lacks consent / older wording / no confirmation
  | "not_teacher"            // only a teacher of the class can record it
  | "no_longer_teaching"     // revision 2: taken off the lesson mid-recording; keep the bytes, ask an admin
  | "stopped_after_window"   // revision 2: the Stop came after the window + late_after; the server abandoned it
  | "session_canceled"
  | "session_invalid"        // no such session / no time
  | "already_live"           // another live recording of this session exists
  | "not_your_recording"
  | "recording_closed"       // status no longer takes audio
  | "not_started"            // the server never saw the start
  | "track_missing"          // describe the track first
  | "stop_requested"         // audio after a stop request
  | "span_too_long"
  | "below_byte_floor"
  | "ahead_of_server_clock"  // transient: retry later
  | "after_stop"
  | "after_window"
  | "conflicting_chunk"      // the seq is registered with different bytes
  | "readback_mismatch"
  | "not_in_storage"
  | "size_mismatch"
  | "complete_refused"       // finalize preconditions
  | "marker_refused"
  | "device_profile"
  | "unknown";

export class RecorderError extends Error {
  readonly code: RecorderErrorCode;
  readonly refusal?: ServerRefusal;
  readonly retryable: boolean;
  readonly detail?: unknown;
  constructor(code: RecorderErrorCode, message: string, opts: { refusal?: ServerRefusal; retryable?: boolean; detail?: unknown } = {}) {
    super(message);
    this.name = "RecorderError";
    this.code = code;
    this.refusal = opts.refusal;
    this.retryable = opts.retryable ?? (code === "offline");
    this.detail = opts.detail;
  }
}

/** Map a database message (the migration's RAISE texts) to a refusal. Order matters. */
const PATTERNS: [RegExp, ServerRefusal][] = [
  [/asked to stop/i, "stop_requested"],
  [/switched off/i, "switch_off"],
  [/consent/i, "consent_missing"],
  [/no longer teach this lesson/i, "no_longer_teaching"],
  [/only a teacher of this class/i, "not_teacher"],
  [/cancelled|canceled/i, "session_canceled"],
  [/no such session|has no time|belongs to a lesson/i, "session_invalid"],
  [/class_recordings_one_live_per_session|duplicate key.*armed_session/i, "already_live"],
  [/too early/i, "too_early"],
  [/too late|window is over|can no longer start/i, "window_closed"],
  [/after the lesson window/i, "after_window"],
  [/after stop/i, "after_stop"],
  [/later than the server'?s clock/i, "ahead_of_server_clock"],
  [/at most \d+ ms of audio/i, "span_too_long"],
  [/too small to hold/i, "below_byte_floor"],
  [/already registered with different audio/i, "conflicting_chunk"],
  [/does not match the audio/i, "readback_mismatch"],
  [/not in storage|no longer in storage/i, "not_in_storage"],
  [/storage holds/i, "size_mismatch"],
  [/did not see this recording start/i, "not_started"],
  [/describe the .* track/i, "track_missing"],
  [/takes no more audio|cannot go from/i, "recording_closed"],
  [/not your recording|not your class/i, "not_your_recording"],
  [/manifest|not confirmed|chunks in storage|overlap|longer than the server saw|no audio cannot be complete/i, "complete_refused"],
  [/marker|name chip|not in this class/i, "marker_refused"],
  [/device profile/i, "device_profile"],
];

export function classifyRefusal(message: string): ServerRefusal {
  for (const [re, r] of PATTERNS) if (re.test(message)) return r;
  return "unknown";
}

/** Refusals worth retrying later without anyone acting. */
export function isTransientRefusal(r: ServerRefusal): boolean {
  return r === "ahead_of_server_clock" || r === "not_in_storage" || r === "too_early";
}

/** Does this thrown thing look like "the network is down" rather than "the server said no"? */
export function looksOffline(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return true;
  const m = String((err as any)?.message ?? err ?? "");
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|ERR_INTERNET_DISCONNECTED|ECONNREFUSED|offline/i.test(m)
    || (err as any)?.name === "TypeError" && /fetch/i.test(m);
}

/**
 * A gateway / server failure rather than an answer: 5xx, "upstream request
 * timeout", a timed-out request. Never a refusal the database stated, so it
 * is always worth retrying (C2 review B4: one 503 at Stop must not be final).
 */
export function looksUnavailable(err: unknown): boolean {
  const e = err as any;
  const status = String(e?.status ?? e?.statusCode ?? e?.code ?? "");
  if (/^5\d\d$/.test(status)) return true;
  const m = errMessage(err);
  return /upstream request timeout|gateway time-?out|bad gateway|service unavailable|temporarily unavailable|timed out|request timeout|ECONNRESET|socket hang up|did not answer in time/i.test(m);
}

/** Normalise anything a backend call threw or returned as `error` into a RecorderError. */
export function toRecorderError(err: unknown, fallback = "The server did not answer"): RecorderError {
  if (err instanceof RecorderError) return err;
  if (looksOffline(err)) return new RecorderError("offline", "No connection: it will be sent when the network is back", { retryable: true, detail: errMessage(err) });
  const msg = errMessage(err) || fallback;
  if ((err as any)?.name === "QuotaExceededError") return new RecorderError("quota", "The browser refused to store more audio", { detail: msg });
  if (/jwt|not authenticated|sign in first/i.test(msg)) return new RecorderError("not_signed_in", "Sign in again to keep uploading", { detail: msg, retryable: true });
  if (looksUnavailable(err)) return new RecorderError("server_unavailable", "The server did not answer properly: it is tried again", { detail: msg, retryable: true });
  const refusal = classifyRefusal(msg);
  return new RecorderError("server_refused", msg, { refusal, retryable: isTransientRefusal(refusal), detail: (err as any)?.code });
}

export function errMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  const e = err as any;
  return String(e.message ?? e.error_description ?? e.error ?? e.details ?? JSON.stringify(e));
}
