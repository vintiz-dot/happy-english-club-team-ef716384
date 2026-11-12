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
        <Loader2 className="w-6 h-6 animate-spin text-hec-brass" aria-hidden="true" />
        <span className="ml-2 text-hec-small text-hec-ink-soft">Loading visual quiz...</span>
      </div>
    );
  }

  if (tiles.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-center space-y-1">
        <p className="text-hec-small font-semibold text-hec-ink">
          🧩 Visual Sorting Challenge
        </p>
        <p className="text-hec-caption text-hec-ink-soft">
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
        <DroppableZone id="bank" label="🖼️ Image Bank" className="min-h-[80px] border-hec-line bg-hec-sunken">
          {tilesInZone("bank").map((tile) => (
            <DraggableTile
              key={tile.id}
              tile={tile}
              result={verified ? results[tile.id] : undefined}
            />
          ))}
          {tilesInZone("bank").length === 0 && (
            <p className="py-2 text-hec-caption italic text-hec-ink-soft">All pictures placed!</p>
          )}
        </DroppableZone>

        {/* Drop Zones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DroppableZone
            id="target"
            label={`✅ This means "${targetWord}"`}
            className="min-h-[100px] border-hec-leaf/30 bg-hec-leaf-tint"
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
            className="min-h-[100px] border-hec-danger/30 bg-hec-danger-tint"
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
            <div className="h-[70px] w-[90px] overflow-hidden rounded-hec-md border border-hec-brass shadow-hec-3">
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
            className="w-full sm:w-auto"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            Check My Answers
          </Button>
        ) : (
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Try Again
          </Button>
        )}
      </div>

      {verified && (
        <div className={cn(
          "rounded-hec-md border py-3 text-center text-hec-small font-semibold animate-in fade-in",
          Object.values(results).every(Boolean)
            ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf"
            : "border-hec-warn/30 bg-hec-warn-tint text-hec-warn"
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
        "rounded-hec-lg border p-3 transition-colors duration-hec-1 ease-hec",
        isOver && "outline outline-2 outline-offset-2 outline-hec-ring",
        className
      )}
    >
      <p className="mb-2 text-hec-caption font-semibold text-hec-ink-soft">{label}</p>
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
        "relative h-[60px] w-[80px] cursor-grab overflow-hidden rounded-hec-md active:cursor-grabbing",
        "border shadow-hec-1 transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
        "touch-none select-none",
        isDragging && "z-50 opacity-50",
        result === true && "border-hec-leaf outline outline-2 outline-hec-leaf",
        result === false && "border-hec-danger outline outline-2 outline-hec-danger",
        result === undefined && "border-hec-line"
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
            result ? "bg-hec-leaf-tint/70" : "bg-hec-danger-tint/70"
          )}
        >
          {result ? (
            <Check className="w-6 h-6 text-hec-leaf" />
          ) : (
            <X className="w-6 h-6 text-hec-danger" />
          )}
        </div>
      )}
    </div>
  );
}
