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

// The provider is told apart by its name; one quiet chip for all of them.
const SOURCE_BADGE: Record<string, { label: string }> = {
  pixabay:   { label: "Pixabay" },
  pexels:    { label: "Pexels" },
  wikimedia: { label: "Wiki" },
  google:    { label: "Google" },
  unsplash:  { label: "Unsplash" },
};

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

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
        <p className="flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Finding pictures…
        </p>
        <div className="flex overflow-hidden gap-3 p-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[105px] w-[140px] shrink-0 animate-pulse rounded-hec-md bg-hec-sunken" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center gap-2 py-6 text-hec-ink-soft", className)}>
        <ImageOff className="h-5 w-5" />
        <span className="text-hec-small">{error}</span>
      </div>
    );
  }

  if (images.length === 0) return null;

  const totalImages = images.length;
  const showProgress = pending > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
          🖼️ Pictures for this word
          {onPick && <span className="ml-2 font-normal normal-case tracking-normal text-hec-ink-soft">— tap one to pick</span>}
        </p>
        {showProgress && (
          <div
            className="flex shrink-0 items-center gap-1 rounded-full border border-hec-line bg-hec-sunken px-2 py-1 text-hec-caption font-medium tabular-nums text-hec-ink-soft"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading {pending} / {totalImages}</span>
          </div>
        )}
      </div>
      <ScrollArea className="w-full whitespace-nowrap rounded-hec-lg">
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

  const badge = SOURCE_BADGE[img.source] ?? { label: img.source };
  const isClickable = !!onPick;
  const Wrapper: any = isClickable ? "button" : "div";

  return (
    <Wrapper
      ref={ref}
      {...(isClickable
        ? { type: "button", onClick: () => onPick!(img), "aria-pressed": picked }
        : {})}
      className={cn(
        "relative h-[105px] w-[140px] shrink-0 overflow-hidden rounded-hec-md border bg-hec-sunken transition-colors duration-hec-1 ease-hec",
        isClickable && cn("cursor-pointer", FOCUS),
        picked
          ? "border-hec-brass ring-2 ring-inset ring-hec-brass"
          : "border-hec-line hover:border-hec-line-strong",
      )}
    >
      {/* Skeleton stays visible until the actual <img> paints or errors. */}
      {!hidden && (src === null || (!resolvedRef.current && !didFallback)) && (
        <div className="absolute inset-0 animate-pulse bg-hec-sunken" />
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
      <div className="absolute right-1 top-1">
        <span className="rounded-hec-sm bg-hec-raised/90 px-1 text-hec-caption font-medium text-hec-ink shadow-hec-1">
          {badge.label}
        </span>
      </div>
      {picked && (
        <div className="absolute inset-0 flex items-center justify-center bg-hec-brass/20">
          <div className="rounded-full bg-hec-action p-1 text-hec-on-action shadow-hec-2">
            <Check className="h-4 w-4" />
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
