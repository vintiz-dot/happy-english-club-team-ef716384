import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaLink } from "@/lib/lessonDecks/types";
import { openHttpUrl } from "@/lib/safeUrl";
import { ExternalLink, Headphones, Video, X } from "lucide-react";

// Drive file ids are letters, digits, - and _; anything else is never put in a URL.
const isDriveId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{20,}$/.test(id);
// A course-media key: lower-case folders and a video or audio file name.
const isR2Key = (k: unknown): k is string => typeof k === "string" && /^[a-z0-9][a-z0-9/_.-]{0,200}\.(mp4|mp3|m4a)$/.test(k) && !k.includes("..");
const preview = (id: string) => `https://drive.google.com/file/d/${id}/preview`;
const view = (id: string) => `https://drive.google.com/file/d/${id}/view`;

type Track = MediaLink["tracks"][number];

/**
 * One track from the school's own R2 store (bucket course-media), asked for as
 * the signed-in teacher; the Worker hands out a 5-minute link only if the
 * database says this person may read it. A link that expires mid-lesson (a
 * seek after five minutes) is renewed once and playback resumes where it was;
 * anything else that fails hands the track to the Drive backup.
 */
function R2Player({ track, isVideo, title, onFail }: { track: Track & { r2: string }; isVideo: boolean; title: string; onFail: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const el = useRef<HTMLMediaElement | null>(null);
  const resumeAt = useRef(0);
  const renewed = useRef(false);
  const live = useRef(0);
  // The parent passes a new function each render; only the latest one is called.
  const fail = useRef(onFail);
  fail.current = onFail;

  const sign = useCallback(async () => {
    const mine = ++live.current;
    // Loaded on first play: slides are also rendered outside the app (printed
    // copies), where the file client and its Supabase session do not exist.
    const u = await import("@/lib/files").then(({ files }) => files.signedUrl("course-media", track.r2)).catch(() => null);
    if (mine !== live.current) return;
    if (u) setUrl(u); else fail.current();
  }, [track.r2]);

  useEffect(() => {
    renewed.current = false;
    resumeAt.current = 0;
    setUrl(null);
    void sign();
    return () => { live.current++; };
  }, [sign]);

  const onError = () => {
    if (renewed.current) { fail.current(); return; }
    renewed.current = true;
    resumeAt.current = el.current?.currentTime ?? 0;
    setUrl(null);
    void sign();
  };
  const onLoaded = () => {
    const m = el.current;
    if (m && resumeAt.current > 0) {
      m.currentTime = resumeAt.current;
      resumeAt.current = 0;
      void m.play().catch(() => undefined);
    }
  };
  // Playing again means the link works: a later expiry may be renewed again.
  const onPlaying = () => { renewed.current = false; };

  if (!url) {
    return <div className={`flex items-center justify-center rounded-xl border border-sky-200 bg-black text-sm text-white/80 dark:border-sky-800 ${isVideo ? "aspect-video" : "h-14"}`}>Loading…</div>;
  }
  const common = {
    src: url, controls: true, autoPlay: true, preload: "metadata" as const, title,
    onError, onLoadedMetadata: onLoaded, onPlaying,
    controlsList: "nodownload",
  };
  return isVideo
    ? <video ref={(n) => { el.current = n; }} {...common} playsInline className="w-full rounded-xl border border-sky-200 bg-black aspect-video dark:border-sky-800" />
    : <audio ref={(n) => { el.current = n; }} {...common} className="w-full" />;
}

/**
 * The class audio / video a slide links to. A track with an R2 copy plays from
 * the school's own store; otherwise (or when that fails) it plays in Google
 * Drive's player, the backup. One button per track; a reading has one track per
 * Student Book page, played in order.
 */
export function MediaBar({ media }: { media?: MediaLink[] }) {
  const [open, setOpen] = useState<{ m: number; t: number } | null>(null);
  // Tracks whose R2 copy could not be played this session: they use Drive.
  const [driveOnly, setDriveOnly] = useState<Record<string, true>>({});
  // Close the player when the slide's media change. Compared by content, not by
  // identity: the player rebuilds its slides (new names, a roster refetch, no class
  // chosen), and that must not stop a track that is playing.
  const sig = (media ?? []).map((m) => `${m.kind}:${(m.tracks ?? []).map((t) => `${t.driveId}~${t.r2 ?? ""}`).join(",")}`).join("|");
  useEffect(() => setOpen(null), [sig]);
  const toDrive = useCallback((id: string) => setDriveOnly((d) => (d[id] ? d : { ...d, [id]: true })), []);
  // Tracks keep their own index in `tracks`, so a skipped (malformed) one never
  // shifts which file a button plays. The Drive copy is required: it is the backup.
  const rows = (media ?? [])
    .map((m, i) => ({ m, i, tracks: (m.tracks ?? []).map((t, j) => ({ t, j })).filter(({ t }) => isDriveId(t.driveId)) }))
    .filter((r) => r.tracks.length > 0);
  if (!rows.length) return null;
  const from = open ? media?.[open.m] : undefined;
  const track = open ? from?.tracks?.[open.t] : undefined;
  const playing = from && track && isDriveId(track.driveId) ? track : undefined;
  const isVideo = from?.kind === "video";
  const fromR2 = !!playing && isR2Key(playing.r2) && !driveOnly[playing.driveId];
  return (
    <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/40">
      {rows.map(({ m, i, tracks }) => (
        <div key={i} className="flex flex-wrap items-center gap-2" role="group" aria-label={m.label}>
          <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-sky-800 dark:text-sky-200">
            {m.kind === "video" ? <Video className="h-4 w-4" aria-hidden /> : <Headphones className="h-4 w-4" aria-hidden />}
            {m.label}
          </span>
          {tracks.map(({ t, j }) => {
            const on = open?.m === i && open?.t === j;
            return (
              <button
                key={j}
                type="button"
                aria-pressed={on}
                aria-label={`${m.kind === "video" ? "Play video" : "Play audio"}: ${m.label}, ${t.label}`}
                onClick={() => setOpen(on ? null : { m: i, t: j })}
                className={`rounded-full border px-3 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${on ? "border-sky-700 bg-sky-700 text-white" : "border-sky-300 bg-white text-sky-900 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100 dark:hover:bg-sky-900"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      ))}
      {from && playing && (
        <div className="space-y-2 print:hidden">
          {fromR2 ? (
            <R2Player
              key={playing.r2}
              track={playing as Track & { r2: string }}
              isVideo={isVideo}
              title={`${from.label}: ${playing.label}`}
              onFail={() => toDrive(playing.driveId)}
            />
          ) : (
            <iframe
              key={playing.driveId}
              src={preview(playing.driveId)}
              title={`${from.label}: ${playing.label}`}
              allow="autoplay; fullscreen"
              className={`w-full rounded-xl border border-sky-200 bg-black dark:border-sky-800 ${isVideo ? "aspect-video" : "h-24"}`}
            />
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-sky-900 dark:text-sky-100">
            <span className="text-sky-700/80 dark:text-sky-300/80">{fromR2 ? "From the school's file store" : isR2Key(playing.r2) ? "From the Google Drive backup" : "From Google Drive"}</span>
            {fromR2 && (
              <button type="button" className="rounded underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700" onClick={() => toDrive(playing.driveId)}>
                Use the Drive copy
              </button>
            )}
            <button type="button" className="inline-flex items-center gap-1 rounded underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700" onClick={() => openHttpUrl(view(playing.driveId))}>
              <ExternalLink className="h-4 w-4" aria-hidden />Open in Drive
            </button>
            <button type="button" className="inline-flex items-center gap-1 rounded underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700" onClick={() => setOpen(null)}>
              <X className="h-4 w-4" aria-hidden />Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
