/**
 * ImageCarousel — horizontally-scrolling image strip for a vocabulary word.
 *
 * Strict lazy loading
 * -------------------
 *   - We render the carousel shell + skeleton tiles as soon as the parent
 *     mounts, so the enrichment text is never blocked on image bytes.
 *   - Each tile uses IntersectionObserver to defer its <img src> assignment
 *     until that tile enters the viewport (with a 200px rootMargin so the
 *     swap feels instant). Native `loading="lazy"` is a safety net, but the
 *     observer is the contract — we never set src for off-screen tiles.
 *   - A "still loading X / N pictures" badge stays visible until every
 *     decoded image either renders or errors out, so students see clear
 *     progress without being distracted by a noisy spinner.
 *
 * Aggregates results from every configured image provider (Pixabay, Pexels,
 * Wikimedia, Google CSE, Unsplash) and de-dupes by URL server-side. Server
 * also stores results in `vocab_image_cache` so repeat queries skip the
 * provider fan-out entirely.
 *
 * Optional onPick callback lets parents (e.g. WordExplorer's Save flow)
 * capture which image the student associates with their saved entry.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ImageOff, Check } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface ImageItem {
  url: string;
  thumb: string;
  thumbnail: string; // back-compat alias
  alt: string;
  source: "pixabay" | "pexels" | "wikimedia" | "google" | "unsplash" | string;
}

interface Props {
  query: string;
  className?: string;
  /** Currently picked image URL. Highlights the matching tile. */
  pickedUrl?: string;
  /** Fired when a tile is clicked. If absent, tiles are not clickable. */
  onPick?: (img: ImageItem) => void;
}

const SOURCE_BADGE: Record<string, { label: string; bg: string }> = {
  pixabay:   { label: "Pixabay",   bg: "bg-green-500/85" },
  pexels:    { label: "Pexels",    bg: "bg-teal-500/85" },
  wikimedia: { label: "Wiki",      bg: "bg-slate-700/85" },
  google:    { label: "Google",    bg: "bg-blue-500/85" },
  unsplash:  { label: "Unsplash",  bg: "bg-zinc-800/85" },
};

export function ImageCarousel({ query, className, pickedUrl, onPick }: Props) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Count of tiles that have not yet finished loading (either loaded or
  // errored). Drives the "still loading X more" indicator.
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setImages([]);
      setPending(0);
      return;
    }
    let cancelled = false;
    (async () => {
      setImages([]);
      setPending(0);
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "image-search",
          { body: { query: query.trim(), count: 4 } },
        );
        if (cancelled) return;
        if (fnErr) {
          console.error("Image search error:", fnErr);
          setError("Could not load images");
          return;
        }
        const list: ImageItem[] = Array.isArray(data?.images) ? data.images : [];
        setImages(list);
        setPending(list.length);
      } catch (err) {
        if (!cancelled) {
          console.error("Image fetch error:", err);
          setError("Could not load images");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query]);

  const handleTileResolved = useCallback(() => {
    setPending((p) => (p > 0 ? p - 1 : 0));
  }, []);

  // ── Loading shell (text is already on screen by the time we reach here) ──
  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Finding pictures…
        </p>
        <div className="flex overflow-hidden gap-3 p-1">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="w-[140px] h-[105px] rounded-xl shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center py-6 text-muted-foreground gap-2", className)}>
        <ImageOff className="w-5 h-5" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (images.length === 0) return null;

  const totalImages = images.length;
  const showProgress = pending > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          🖼️ Pictures for this word
          {onPick && <span className="ml-2 normal-case font-medium text-muted-foreground">— tap one to pick</span>}
        </p>
        {showProgress && (
          <div
            className="flex items-center gap-1.5 text-[11px] font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-full px-2 py-0.5"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading {pending} / {totalImages}</span>
          </div>
        )}
      </div>
      <ScrollArea className="w-full whitespace-nowrap rounded-xl">
        <div className="flex w-max gap-3 p-1">
          {images.map((img, i) => (
            <CarouselTile
              key={`${img.url}-${i}`}
              img={img}
              picked={!!pickedUrl && img.url === pickedUrl}
              onPick={onPick}
              onResolved={handleTileResolved}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

interface TileProps {
  img: ImageItem;
  picked: boolean;
  onPick?: (img: ImageItem) => void;
  onResolved: () => void;
}

function CarouselTile({ img, picked, onPick, onResolved }: TileProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [didFallback, setDidFallback] = useState(false);
  const [hidden, setHidden] = useState(false);
  const resolvedRef = useRef(false);

  // Notify parent exactly once per tile (whether it loaded or errored).
  const resolve = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResolved();
  }, [onResolved]);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    // Browsers that don't support IntersectionObserver still get the image —
    // we just paint it immediately (graceful degradation, no console noise).
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
            return;
          }
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    setSrc(img.thumb || img.thumbnail || img.url);
  }, [inView, img.thumb, img.thumbnail, img.url]);

  const badge = SOURCE_BADGE[img.source] ?? { label: img.source, bg: "bg-slate-500/85" };
  const isClickable = !!onPick;
  const Wrapper: any = isClickable ? "button" : "div";

  return (
    <Wrapper
      ref={ref}
      {...(isClickable
        ? { type: "button", onClick: () => onPick!(img), "aria-pressed": picked }
        : {})}
      className={cn(
        "relative rounded-xl overflow-hidden w-[140px] h-[105px] shrink-0 shadow-sm border-2 transition-all bg-slate-100 dark:bg-slate-800",
        isClickable && "cursor-pointer hover:scale-[1.02]",
        picked
          ? "border-violet-500 ring-2 ring-violet-300"
          : "border-slate-200 dark:border-slate-700 hover:border-violet-400",
      )}
    >
      {/* Skeleton stays visible until the actual <img> paints or errors. */}
      {!hidden && (src === null || (!resolvedRef.current && !didFallback)) && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200/70 to-slate-100/70 dark:from-slate-700/40 dark:to-slate-800/40 animate-pulse" />
      )}
      {src && !hidden && (
        <img
          src={src}
          alt={img.alt}
          width={140}
          height={105}
          className="relative w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={resolve}
          onError={() => {
            if (!didFallback && img.url && src !== img.url) {
              setDidFallback(true);
              setSrc(img.url);
            } else {
              setHidden(true);
              resolve();
            }
          }}
        />
      )}
      <div className="absolute top-1.5 right-1.5">
        <span
          className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-md text-white shadow-sm uppercase tracking-wider",
            badge.bg,
          )}
        >
          {badge.label}
        </span>
      </div>
      {picked && (
        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
          <div className="bg-violet-600 text-white rounded-full p-1 shadow-lg">
            <Check className="w-4 h-4" />
          </div>
        </div>
      )}
    </Wrapper>
  );
}

/** Lightweight helper used by other components (e.g. legacy sandbox). */
export async function fetchImagesForWord(query: string, count = 4): Promise<ImageItem[]> {
  try {
    const { data, error } = await supabase.functions.invoke("image-search", {
      body: { query: query.trim(), count },
    });
    if (error || !data?.images) return [];
    return data.images;
  } catch {
    return [];
  }
}
