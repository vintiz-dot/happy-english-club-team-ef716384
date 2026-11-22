import { useEffect, useState } from "react";
import type { MediaLink } from "@/lib/lessonDecks/types";
import { openHttpUrl } from "@/lib/safeUrl";
import { ExternalLink, Headphones, Video, X } from "lucide-react";

// Drive file ids are letters, digits, - and _; anything else is never put in a URL.
const isDriveId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{20,}$/.test(id);
const preview = (id: string) => `https://drive.google.com/file/d/${id}/preview`;
const view = (id: string) => `https://drive.google.com/file/d/${id}/view`;

/**
 * The class audio / video a slide links to, played in Drive's own player inside
 * the slide (the files stay in the school's Drive). One button per track; a
 * reading has one track per Student Book page, played in order.
 */
export function MediaBar({ media }: { media?: MediaLink[] }) {
  const [open, setOpen] = useState<{ m: number; t: number } | null>(null);
  // Close the player when the slide's media changes. Compared by content, not by
  // identity: the player rebuilds its slides (new names, a roster refetch, no class
  // chosen), and that must not stop a track that is playing.
  const sig = (media ?? []).map((m) => `${m.kind}:${(m.tracks ?? []).map((t) => t.driveId).join(",")}`).join("|");
  useEffect(() => setOpen(null), [sig]);
  // Tracks keep their own index in `tracks`, so a skipped (malformed) one never
  // shifts which file a button plays.
  const rows = (media ?? [])
    .map((m, i) => ({ m, i, tracks: (m.tracks ?? []).map((t, j) => ({ t, j })).filter(({ t }) => isDriveId(t.driveId)) }))
    .filter((r) => r.tracks.length > 0);
  if (!rows.length) return null;
  const from = open ? media?.[open.m] : undefined;
  const track = open ? from?.tracks?.[open.t] : undefined;
  const playing = from && track && isDriveId(track.driveId) ? track : undefined;
  const isVideo = from?.kind === "video";
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
          <iframe
            key={playing.driveId}
            src={preview(playing.driveId)}
            title={`${from.label}: ${playing.label}`}
            allow="autoplay; fullscreen"
            className={`w-full rounded-xl border border-sky-200 bg-black dark:border-sky-800 ${isVideo ? "aspect-video" : "h-24"}`}
          />
          <div className="flex gap-3 text-sm text-sky-900 dark:text-sky-100">
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
