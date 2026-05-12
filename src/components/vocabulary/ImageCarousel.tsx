import { useState, useEffect } from "react";
import { Loader2, ImageOff } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface ImageItem {
  url: string;
  thumbnail: string;
  alt: string;
  source: string;
}

interface Props {
  query: string;
  className?: string;
}

export function ImageCarousel({ query, className }: Props) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setImages([]);
      return;
    }

    let cancelled = false;
    const fetchImages = async () => {
      setImages([]); // State Reset: clear previous images explicitly
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "image-search",
          { body: { query: query.trim(), count: 8 } }
        );

        if (cancelled) return;

        if (fnErr) {
          console.error("Image search error:", fnErr);
          setError("Could not load images");
          setImages([]);
          return;
        }

        if (data?.images && data.images.length > 0) {
          setImages(data.images);
        } else {
          setImages([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Image fetch error:", err);
          setError("Could not load images");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchImages();
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> Finding pictures...
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

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        🖼️ Pictures for this word
      </p>
      <ScrollArea className="w-full whitespace-nowrap rounded-xl">
        <div className="flex w-max gap-3 p-1">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative rounded-xl overflow-hidden w-[140px] h-[105px] shrink-0 shadow-sm border-2 border-slate-200 dark:border-slate-700 hover:border-violet-400 transition-all hover:scale-105"
            >
              <img
                src={img.thumbnail || img.url}
                alt={img.alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute top-1.5 right-1.5">
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-md text-white shadow-sm uppercase tracking-wider",
                  img.source === "pixabay" ? "bg-green-500/80" : "bg-teal-500/80"
                )}>
                  {img.source === "pixabay" ? "Pixabay" : "Pexels"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

/** Fetch images for a given query — used by VisualSortingSandbox */
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
