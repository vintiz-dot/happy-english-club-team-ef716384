import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Check, X, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchImagesForWord } from "./ImageCarousel";

interface ImageTile {
  id: string;
  url: string;
  alt: string;
  isTarget: boolean; // true = represents the target word, false = represents antonym
}

interface Props {
  targetWord: string;
  antonyms: string[];
  onComplete: (correct: boolean) => void;
  className?: string;
}

type Zone = "bank" | "target" | "opposite";

export function VisualSortingSandbox({ targetWord, antonyms, onComplete, className }: Props) {
  const [tiles, setTiles] = useState<ImageTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [placements, setPlacements] = useState<Record<string, Zone>>({});
  const [verified, setVerified] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Mobile-first: support both touch and pointer
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  // Load images for target word + antonyms
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setVerified(false);
      setPlacements({});
      setResults({});

      const targetImages = await fetchImagesForWord(targetWord, 3);
      const antonymWord = antonyms[0] || "opposite";
      const antonymImages = await fetchImagesForWord(antonymWord, 3);

      if (cancelled) return;

      const allTiles: ImageTile[] = [
        ...targetImages.slice(0, 3).map((img, i) => ({
          id: `target-${i}`,
          url: img.thumbnail || img.url,
          alt: img.alt,
          isTarget: true,
        })),
        ...antonymImages.slice(0, 3).map((img, i) => ({
          id: `antonym-${i}`,
          url: img.thumbnail || img.url,
          alt: img.alt,
          isTarget: false,
        })),
      ];

      // Shuffle
      for (let i = allTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allTiles[i], allTiles[j]] = [allTiles[j], allTiles[i]];
      }

      // Initialize all tiles in the bank
      const initialPlacements: Record<string, Zone> = {};
      allTiles.forEach((t) => (initialPlacements[t.id] = "bank"));

      setTiles(allTiles);
      setPlacements(initialPlacements);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [targetWord, antonyms]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    console.log("DragEnd:", { active: active?.id, over: over?.id });
    if (!over) return;

    const tileId = active.id as string;
    const dropZone = over.id as Zone;

    console.log(`Moving ${tileId} to ${dropZone}`);
    if (dropZone === "target" || dropZone === "opposite" || dropZone === "bank") {
      setPlacements((prev) => ({ ...prev, [tileId]: dropZone }));
    }
  }, []);

  const handleVerify = useCallback(() => {
    const newResults: Record<string, boolean> = {};
    tiles.forEach((tile) => {
      const zone = placements[tile.id];
      if (zone === "bank") {
        newResults[tile.id] = false;
      } else if (zone === "target") {
        newResults[tile.id] = tile.isTarget;
      } else if (zone === "opposite") {
        newResults[tile.id] = !tile.isTarget;
      }
    });
    setResults(newResults);
    setVerified(true);

    const allCorrect = Object.values(newResults).every(Boolean);
    // Delay callback to let animation play
    setTimeout(() => onComplete(allCorrect), 1500);
  }, [tiles, placements, onComplete]);

  const handleReset = useCallback(() => {
    const resetPlacements: Record<string, Zone> = {};
    tiles.forEach((t) => (resetPlacements[t.id] = "bank"));
    setPlacements(resetPlacements);
    setVerified(false);
    setResults({});
  }, [tiles]);

  const tilesInZone = useCallback(
    (zone: Zone) => tiles.filter((t) => placements[t.id] === zone),
    [tiles, placements]
  );

  const allPlaced = useMemo(
    () => tiles.length > 0 && tiles.every((t) => placements[t.id] !== "bank"),
    [tiles, placements]
  );

  const activeTile = tiles.find((t) => t.id === activeDragId);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        <span className="ml-2 text-sm text-muted-foreground">Loading visual quiz...</span>
      </div>
    );
  }

  if (tiles.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-center space-y-1">
        <p className="text-sm font-bold text-foreground">
          🧩 Visual Sorting Challenge
        </p>
        <p className="text-xs text-muted-foreground">
          Drag each picture to the correct box!
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Image Bank */}
        <DroppableZone id="bank" label="🖼️ Image Bank" className="bg-slate-50 dark:bg-slate-800/50 min-h-[80px]">
          {tilesInZone("bank").map((tile) => (
            <DraggableTile
              key={tile.id}
              tile={tile}
              result={verified ? results[tile.id] : undefined}
            />
          ))}
          {tilesInZone("bank").length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2">All pictures placed!</p>
          )}
        </DroppableZone>

        {/* Drop Zones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DroppableZone
            id="target"
            label={`✅ This means "${targetWord}"`}
            className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700 min-h-[100px]"
          >
            {tilesInZone("target").map((tile) => (
              <DraggableTile
                key={tile.id}
                tile={tile}
                result={verified ? results[tile.id] : undefined}
              />
            ))}
          </DroppableZone>

          <DroppableZone
            id="opposite"
            label={`❌ This does NOT mean "${targetWord}"`}
            className="bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700 min-h-[100px]"
          >
            {tilesInZone("opposite").map((tile) => (
              <DraggableTile
                key={tile.id}
                tile={tile}
                result={verified ? results[tile.id] : undefined}
              />
            ))}
          </DroppableZone>
        </div>

        <DragOverlay>
          {activeTile && (
            <div className="w-[90px] h-[70px] rounded-xl overflow-hidden shadow-2xl border-2 border-violet-500 opacity-90">
              <img src={activeTile.url} alt={activeTile.alt} className="w-full h-full object-cover" />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Verify / Reset buttons */}
      <div className="flex justify-center gap-3">
        {!verified ? (
          <Button
            onClick={handleVerify}
            disabled={!allPlaced}
            className="rounded-xl gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold"
          >
            <Check className="w-4 h-4" />
            Check My Answers
          </Button>
        ) : (
          <Button
            onClick={handleReset}
            variant="outline"
            className="rounded-xl gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>
        )}
      </div>

      {verified && (
        <div className={cn(
          "text-center py-3 rounded-xl font-bold text-sm animate-in fade-in zoom-in duration-300",
          Object.values(results).every(Boolean)
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
        )}>
          {Object.values(results).every(Boolean)
            ? "🎉 Perfect! All correct! You can save this word now!"
            : "🤔 Some pictures are in the wrong box. Try again!"}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";

function DroppableZone({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-2xl border-2 p-3 transition-all",
        isOver && "ring-2 ring-violet-400 scale-[1.01]",
        className
      )}
    >
      <p className="text-xs font-bold text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {children}
      </div>
    </div>
  );
}

function DraggableTile({
  tile,
  result,
}: {
  tile: ImageTile;
  result?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: tile.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "relative w-[80px] h-[60px] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing",
        "border-2 shadow-sm transition-all hover:scale-105",
        "touch-none select-none",
        isDragging && "opacity-50 scale-110 z-50",
        result === true && "border-emerald-500 ring-2 ring-emerald-300",
        result === false && "border-red-500 ring-2 ring-red-300",
        result === undefined && "border-slate-200 dark:border-slate-600"
      )}
    >
      <img
        src={tile.url}
        alt={tile.alt}
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      {result !== undefined && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            result ? "bg-emerald-500/30" : "bg-red-500/30"
          )}
        >
          {result ? (
            <Check className="w-6 h-6 text-emerald-700" />
          ) : (
            <X className="w-6 h-6 text-red-700" />
          )}
        </div>
      )}
    </div>
  );
}
