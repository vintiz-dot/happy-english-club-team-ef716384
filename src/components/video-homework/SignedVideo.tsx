/**
 * A private homework video, played through a short-lived signed link.
 * The bucket is private; the storage policy decides who may get a link.
 */
import { forwardRef, useEffect, useState } from "react";
import { signedVideoUrl } from "@/lib/video/recorder";

interface Props extends React.VideoHTMLAttributes<HTMLVideoElement> {
  path: string;
  posterPath?: string | null;
}

export const SignedVideo = forwardRef<HTMLVideoElement, Props>(function SignedVideo(
  { path, posterPath, ...rest },
  ref,
) {
  const [src, setSrc] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setSrc(null);
    setFailed(false);
    signedVideoUrl(path).then((u) => {
      if (!live) return;
      if (u) setSrc(u);
      else setFailed(true);
    });
    if (posterPath) signedVideoUrl(posterPath).then((u) => live && setPoster(u ?? undefined));
    return () => {
      live = false;
    };
  }, [path, posterPath]);

  if (failed) {
    return (
      <div className={`${rest.className ?? ""} flex items-center justify-center text-sm text-white/80`}>
        This video can't be played right now.
      </div>
    );
  }
  return (
    <video
      ref={ref}
      src={src ?? undefined}
      poster={poster}
      controls
      playsInline
      preload="metadata"
      {...rest}
      onLoadedMetadata={(e) => {
        // Browser recordings (WebM, fragmented MP4) often carry no total
        // length, so the bar is wrong and seeking to evidence fails. Asking
        // for a far-off time makes the browser find the real end.
        const el = e.currentTarget;
        if (!Number.isFinite(el.duration)) {
          const back = () => {
            el.removeEventListener("durationchange", back);
            el.currentTime = 0;
          };
          el.addEventListener("durationchange", back);
          el.currentTime = 1e9;
        }
        rest.onLoadedMetadata?.(e);
      }}
    />
  );
});
