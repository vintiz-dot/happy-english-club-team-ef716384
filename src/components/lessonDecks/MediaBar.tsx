import { useEffect, useState } from "react";
import type { MediaLink } from "@/lib/lessonDecks/types";
import { openHttpUrl } from "@/lib/safeUrl";
import { ExternalLink, Headphones, Video, X } from "lucide-react";

// Drive file ids are letters, digits, - and _; anything else is never put in a URL.
const isDriveId = (id: string) => /^[A-Za-z0-9_-]{20,}$/.test(id);
const preview = (id: string) => `https://drive.google.com/file/d/${id}/preview`;
const view = (id: string) => `https://drive.google.com/file/d/${id}/view`;

/**
 * The class audio / video a slide links to, played in Drive's own player inside
 * the slide (the files stay in the school's Drive). One button per track; a
 * reading has one track per Student Book page, played in order.
 */
export function MediaBar({ media }: { media?: MediaLink[] }) {
  const [open, setOpen] = useState<{ m: number; t: number } | null>(null);
  useEffect(() => setOpen(null), [media]);
  if (!media?.length) return null;
  const playing = open ? media[open.m]?.tracks[open.t] : undefined;
  const isVideo = open ? media[open.m]?.kind === "video" : false;
  return (
    <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/40">
      {media.map((m, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-sky-800 dark:text-sky-200">
            {m.kind === "video" ? <Video className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
            {m.label}
          </span>
          {m.tracks.filter((t) => isDriveId(t.driveId)).map((t, j) => {
            const on = open?.m === i && open?.t === j;
            return (
              <button
                key={j}
                type="button"
                onClick={() => setOpen(on ? null : { m: i, t: j })}
                className={`rounded-full border px-3 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 ${on ? "border-sky-700 bg-sky-700 text-white" : "border-sky-300 bg-white text-sky-900 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      ))}
      {playing && isDriveId(playing.driveId) && (
        <div className="space-y-2">
          <iframe
            key={playing.driveId}
            src={preview(playing.driveId)}
            title={playing.label}
            allow="autoplay; fullscreen"
            className={`w-full rounded-xl border border-sky-200 bg-black dark:border-sky-800 ${isVideo ? "aspect-video" : "h-24"}`}
          />
          <div className="flex gap-3 text-sm">
            <button type="button" className="inline-flex items-center gap-1 underline" onClick={() => openHttpUrl(view(playing.driveId))}>
              <ExternalLink className="h-4 w-4" />Open in Drive
            </button>
            <button type="button" className="inline-flex items-center gap-1 underline" onClick={() => setOpen(null)}>
              <X className="h-4 w-4" />Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
