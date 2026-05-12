/**
 * VisemePlayer — 3D-head pronunciation viewer
 * ============================================
 * Renders a real 3D head (Three.js + glTF/GLB) whose mouth animates in sync
 * with audio returned by the `pronounce-viseme` edge function. The edge
 * function returns Azure's "FacialExpression" blend-shape animation track
 * (55-channel, ~60 fps); we drive `mesh.morphTargetInfluences` from it.
 *
 * Asset:
 *   VITE_VISEME_HEAD_URL — URL of a GLB head with ARKit-compatible morph
 *   targets (Ready Player Me default works). If unset or load fails we fall
 *   back to a lightweight SVG mouth so the page still pronounces.
 *
 * Backend response shape (see supabase/functions/pronounce-viseme):
 *   { audioBase64, mime, visemes: [{ audioOffset, blendShapes: number[55][] }] }
 *
 * Package versions (top of package.json):
 *   three@^0.170.0  (+ @types/three)
 *   microsoft-cognitiveservices-speech-sdk@^1.49.0 (browser fallback only)
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────

interface VisemeBatch {
  audioOffset: number;     // ms from audio start
  visemeId?: number;       // Azure's 2D viseme ID (0-21); added by pronounce-viseme
  blendShapes: number[][]; // each row is 55 floats (Azure order)
}

/**
 * Azure 2D viseme ID → lip-shape image overlay.
 * IDs follow https://learn.microsoft.com/azure/ai-services/speech-service/how-to-speech-synthesis-viseme?tabs=visemeid
 * Files live in /public/lip/ (served at /lip/ at runtime). Spaces are URL-encoded.
 * id 0 is silence — we return null so the overlay hides between syllables.
 */
const LIP_IMAGES: { src: string | null; alt: string }[] = [
  { src: null,                                             alt: "silence" },                       // 0
  { src: "/lip/e.png",                                     alt: "vowel ae / uh" },                 // 1
  { src: "/lip/o.png",                                     alt: "open vowel aa" },                 // 2
  { src: "/lip/o.png",                                     alt: "vowel aw" },                      // 3
  { src: "/lip/e.png",                                     alt: "vowel eh / oo" },                 // 4
  { src: "/lip/r.png",                                     alt: "r-colored vowel er" },            // 5
  { src: "/lip/e.png",                                     alt: "vowel ee / ih / y" },             // 6
  { src: "/lip/u.png",                                     alt: "vowel oo / w" },                  // 7
  { src: "/lip/o.png",                                     alt: "vowel oh" },                      // 8
  { src: "/lip/o.png",                                     alt: "diphthong ow" },                  // 9
  { src: "/lip/o.png",                                     alt: "diphthong oy" },                  // 10
  { src: "/lip/e.png",                                     alt: "diphthong eye" },                 // 11
  { src: "/lip/ch%20sh%20j.png",                           alt: "h sound" },                       // 12
  { src: "/lip/r.png",                                     alt: "r sound" },                       // 13
  { src: "/lip/l.png",                                     alt: "l sound" },                       // 14
  { src: "/lip/c%20d%20g%20k%20n%20s%20t.png",             alt: "s / z" },                         // 15
  { src: "/lip/ch%20sh%20j.png",                           alt: "ch / sh / j" },                   // 16
  { src: "/lip/th.png",                                    alt: "th sound" },                      // 17
  { src: "/lip/f%20v.png",                                 alt: "f / v" },                         // 18
  { src: "/lip/c%20d%20g%20k%20n%20s%20t.png",             alt: "d / t / n" },                     // 19
  { src: "/lip/c%20d%20g%20k%20n%20s%20t%20x%20y%20z.png", alt: "k / g / ng" },                    // 20
  { src: "/lip/b%20m%20p.png",                             alt: "b / m / p" },                     // 21
];

/**
 * Derive a viseme ID (0-21) from a blend-shape row, used as a fallback when
 * the edge function response predates the visemeId field. The mapping looks
 * at the dominant mouth-related shape and picks the closest 2D viseme.
 * This is a coarse heuristic — visemeId from Azure is always preferred.
 */
function deriveVisemeIdFromBlendShapes(row: number[] | undefined): number {
  if (!row || row.length < 25) return 0;
  // Mouth-shape signals (indices match AZURE_BLENDSHAPE_NAMES above).
  const jawOpen = row[17] ?? 0;
  const mouthFunnel = row[19] ?? 0;
  const mouthPucker = row[20] ?? 0;
  const mouthClose = row[18] ?? 0;
  const mouthSmile = ((row[23] ?? 0) + (row[24] ?? 0)) / 2;
  const mouthRollUpper = row[32] ?? 0;
  const mouthRollLower = row[31] ?? 0;

  // Mostly closed → silence or a bilabial.
  if (jawOpen < 0.05 && mouthClose < 0.2 && mouthPucker < 0.1) return 0;
  if (mouthClose > 0.4) return 21;                    // p/b/m
  if (mouthRollLower > 0.3 || mouthRollUpper > 0.3) return 18; // f/v
  if (mouthPucker > 0.45) return 7;                    // w/u
  if (mouthFunnel > 0.35) return 2;                    // o
  if (mouthSmile > 0.4 && jawOpen < 0.25) return 6;    // i/ɪ
  if (jawOpen > 0.4) return 2;                         // open vowel → o-ish
  if (jawOpen > 0.2) return 1;                         // mid vowel → e-ish
  return 15;                                            // default consonant cluster
}

interface Props {
  word: string;
  /** Compact mode — small inline pronunciation button. */
  compact?: boolean;
  className?: string;
}

// ─── Azure 3D blend-shape channel order ─────────────────────────────────
// Per https://learn.microsoft.com/azure/ai-services/speech-service/how-to-speech-synthesis-viseme?tabs=3dblendshapes
// (Indices 0–51 match ARKit; 52–54 are head/eye rolls used for procedural motion.)
const AZURE_BLENDSHAPE_NAMES: readonly string[] = [
  "eyeBlinkLeft", "eyeLookDownLeft", "eyeLookInLeft", "eyeLookOutLeft", "eyeLookUpLeft",
  "eyeSquintLeft", "eyeWideLeft",
  "eyeBlinkRight", "eyeLookDownRight", "eyeLookInRight", "eyeLookOutRight", "eyeLookUpRight",
  "eyeSquintRight", "eyeWideRight",
  "jawForward", "jawLeft", "jawRight", "jawOpen",
  "mouthClose", "mouthFunnel", "mouthPucker", "mouthLeft", "mouthRight",
  "mouthSmileLeft", "mouthSmileRight", "mouthFrownLeft", "mouthFrownRight",
  "mouthDimpleLeft", "mouthDimpleRight", "mouthStretchLeft", "mouthStretchRight",
  "mouthRollLower", "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper",
  "mouthPressLeft", "mouthPressRight",
  "mouthLowerDownLeft", "mouthLowerDownRight", "mouthUpperUpLeft", "mouthUpperUpRight",
  "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight",
  "cheekPuff", "cheekSquintLeft", "cheekSquintRight",
  "noseSneerLeft", "noseSneerRight",
  "tongueOut",
  "headRoll", "leftEyeRoll", "rightEyeRoll",
];

const HEAD_URL = import.meta.env.VITE_VISEME_HEAD_URL as string | undefined;

// ─── Component ──────────────────────────────────────────────────────────

export function VisemePlayer({ word, compact, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Derived mouth-shape signal for the SVG fallback (0 = closed, 1 = open).
  const [jawOpen, setJawOpen] = useState(0);
  const [mouthPucker, setMouthPucker] = useState(0);
  const [mouthSmile, setMouthSmile] = useState(0);

  // Current 2D viseme ID (0-21) for the lip-shape image overlay.
  const [currentVisemeId, setCurrentVisemeId] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const visemesRef = useRef<VisemeBatch[]>([]);
  const flatFramesRef = useRef<{ t: number; v: number[] }[]>([]);
  const lipEventsRef = useRef<{ t: number; id: number }[]>([]);
  const rafRef = useRef(0);

  // Three.js refs (kept null until/unless the GLB head loads successfully)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const headApiRef = useRef<HeadApi | null>(null);
  const [headReady, setHeadReady] = useState(false);

  // Initialize 3D head once, if a head URL is configured.
  useEffect(() => {
    if (!HEAD_URL || !canvasRef.current) return;
    let disposed = false;
    initThreeHead(canvasRef.current, HEAD_URL)
      .then((api) => {
        if (disposed) {
          api.dispose();
          return;
        }
        headApiRef.current = api;
        setHeadReady(true);
      })
      .catch((err) => {
        console.warn("3D head failed to load, falling back to SVG mouth:", err);
      });
    return () => {
      disposed = true;
      headApiRef.current?.dispose();
      headApiRef.current = null;
    };
  }, []);

  // Cleanup audio + rAF on unmount.
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // ── Animation loop: pick the latest blend-shape row ≤ audio.currentTime ──
  const startAnimationLoop = useCallback(() => {
    let lastLipId = -1; // avoid spamming React with redundant state updates
    const tick = () => {
      const audio = audioRef.current;
      const frames = flatFramesRef.current;
      if (!audio || frames.length === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const tMs = audio.currentTime * 1000;
      // Binary search for the latest frame with t ≤ tMs.
      let lo = 0, hi = frames.length - 1, idx = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (frames[mid].t <= tMs) { idx = mid; lo = mid + 1; }
        else { hi = mid - 1; }
      }
      const row = frames[idx].v;
      // Drive 3D head if loaded.
      headApiRef.current?.applyBlendShapes(row);
      // Drive SVG fallback signals (cheap state updates, throttled by raf).
      setJawOpen(clamp01(row[17]));
      setMouthPucker(clamp01(row[20]));
      setMouthSmile(clamp01(((row[23] || 0) + (row[24] || 0)) / 2));

      // Pick the latest 2D viseme event with t ≤ tMs for the lip-image overlay.
      const events = lipEventsRef.current;
      let lipId = 0;
      if (events.length > 0) {
        let elo = 0, ehi = events.length - 1, eidx = -1;
        while (elo <= ehi) {
          const mid = (elo + ehi) >> 1;
          if (events[mid].t <= tMs) { eidx = mid; elo = mid + 1; }
          else { ehi = mid - 1; }
        }
        lipId = eidx >= 0 ? events[eidx].id : 0;
      } else {
        // Old responses without visemeId — fall back to deriving from blendShapes.
        lipId = deriveVisemeIdFromBlendShapes(row);
      }
      if (lipId !== lastLipId) {
        lastLipId = lipId;
        setCurrentVisemeId(lipId);
      }

      if (audio.paused || audio.ended) {
        setPlaying(false);
        // Settle to neutral.
        headApiRef.current?.applyBlendShapes(new Array(55).fill(0));
        setJawOpen(0);
        setMouthPucker(0);
        setMouthSmile(0);
        setCurrentVisemeId(0);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Fetch from edge function and play ──
  const play = useCallback(async () => {
    if (loading || playing || !word.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pronounce-viseme", {
        body: { word: word.trim() },
      });
      if (error) throw error;
      if (!data?.audioBase64) throw new Error("No audio in response");

      const mime = data.mime || data.contentType || "audio/mpeg";
      const audio = new Audio(`data:${mime};base64,${data.audioBase64}`);
      audioRef.current = audio;

      visemesRef.current = Array.isArray(data.visemes) ? data.visemes : [];
      flatFramesRef.current = flattenFrames(visemesRef.current);
      lipEventsRef.current = extractLipEvents(visemesRef.current);
      setCurrentVisemeId(0);

      audio.onended = () => setPlaying(false);
      audio.onerror = () => {
        console.error("Audio playback error");
        setPlaying(false);
      };

      setPlaying(true);
      setLoading(false);
      await audio.play();
      startAnimationLoop();
    } catch (err) {
      console.error("Viseme fetch/play error:", err);
      setLoading(false);
      fallbackBrowserTTS();
    }
  }, [word, loading, playing, startAnimationLoop]);

  const fallbackBrowserTTS = useCallback(() => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word.trim());
      u.lang = "en-US";
      u.rate = 0.7;
      u.onstart = () => setPlaying(true);
      u.onend = () => {
        setPlaying(false);
        setJawOpen(0); setMouthPucker(0); setMouthSmile(0);
      };
      speechSynthesis.speak(u);
    } catch (e) {
      console.error("Browser TTS fallback failed:", e);
    }
  }, [word]);

  // ── Render ──
  return (
    <div
      className={cn(
        compact ? "inline-flex items-center gap-1.5" : "flex flex-col items-center gap-2",
        className
      )}
    >
      <button
        type="button"
        onClick={play}
        disabled={loading}
        className={cn(
          "relative rounded-2xl border-2 transition-all overflow-hidden",
          compact ? "p-1.5" : "p-2",
          playing
            ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30 shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30"
            : "border-slate-200 dark:border-slate-700 hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
        )}
        title="Click to hear pronunciation and see mouth shapes"
      >
        {loading ? (
          <div className={cn("flex items-center justify-center", compact ? "w-9 h-7" : "w-24 h-20")}>
            <Loader2 className={cn("animate-spin text-violet-500", compact ? "w-4 h-4" : "w-6 h-6")} />
          </div>
        ) : HEAD_URL ? (
          // 3D head canvas (always mounted so the GLB loader has somewhere to render).
          <canvas
            ref={canvasRef}
            className={cn(compact ? "w-9 h-7" : "w-24 h-20", !headReady && "opacity-0")}
          />
        ) : null}

        {/* SVG fallback mouth — shown when 3D head isn't configured or hasn't loaded. */}
        {!loading && !headReady && (
          <SvgMouth
            jawOpen={jawOpen}
            mouthPucker={mouthPucker}
            mouthSmile={mouthSmile}
            compact={!!compact}
            playing={playing}
          />
        )}

        {playing && !compact && (
          <div className="absolute inset-0 rounded-2xl border-2 border-violet-400 animate-ping opacity-20 pointer-events-none" />
        )}
      </button>

      {/* 2D lip-shape overlay, driven by Azure's per-phoneme viseme ID. */}
      {!compact && (
        <LipImageOverlay visemeId={currentVisemeId} playing={playing} />
      )}

      {!compact && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Volume2 className="w-3 h-3" />
          <span>{playing ? "Speaking..." : "Tap to pronounce"}</span>
        </div>
      )}
      {compact && (
        <Volume2 className="w-3.5 h-3.5 text-violet-500" />
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function clamp01(n: number | undefined): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Flatten Azure's batched animation track into a single time-ordered list of
 * frames. Azure emits ~60 fps blend-shape rows; the spacing between rows is
 * 1000/60 ms, and each batch's audioOffset is the absolute time of its first
 * row.
 */
function flattenFrames(
  batches: VisemeBatch[]
): { t: number; v: number[] }[] {
  const FRAME_MS = 1000 / 60;
  const out: { t: number; v: number[] }[] = [];
  for (const b of batches) {
    if (!b || !Array.isArray(b.blendShapes)) continue;
    for (let i = 0; i < b.blendShapes.length; i++) {
      out.push({ t: b.audioOffset + i * FRAME_MS, v: b.blendShapes[i] });
    }
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

/**
 * Pull Azure's 2D viseme events (one per phoneme) out of the batched track.
 * Returns an empty list if the response predates the visemeId field — the
 * animation loop then falls back to deriveVisemeIdFromBlendShapes.
 */
function extractLipEvents(
  batches: VisemeBatch[]
): { t: number; id: number }[] {
  const out: { t: number; id: number }[] = [];
  let sawVisemeId = false;
  for (const b of batches) {
    if (!b) continue;
    if (typeof b.visemeId === "number") {
      sawVisemeId = true;
      out.push({ t: b.audioOffset, id: b.visemeId });
    }
  }
  if (!sawVisemeId) return [];
  out.sort((a, b) => a.t - b.t);
  return out;
}

// ─── 2D lip-shape overlay ──────────────────────────────────────────────
// Shows a small reference photograph of the mouth shape for the current
// phoneme. Driven by Azure's 2D visemeId (0-21). Hidden during silence so
// it doesn't flash distractingly between syllables.

function LipImageOverlay({
  visemeId,
  playing,
}: {
  visemeId: number;
  playing: boolean;
}) {
  const entry =
    visemeId >= 0 && visemeId < LIP_IMAGES.length ? LIP_IMAGES[visemeId] : null;
  const visible = playing && !!entry?.src;
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "w-20 h-20 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 transition-opacity duration-100",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {entry?.src && (
        <img
          src={entry.src}
          alt={entry.alt}
          className="w-full h-full object-contain"
          draggable={false}
        />
      )}
    </div>
  );
}

// ─── SVG fallback mouth ─────────────────────────────────────────────────

function SvgMouth({
  jawOpen, mouthPucker, mouthSmile, compact, playing,
}: {
  jawOpen: number; mouthPucker: number; mouthSmile: number;
  compact: boolean; playing: boolean;
}) {
  // Interpolate a mouth shape from blend-shape-derived signals.
  // - jawOpen widens vertical opening (lower-lip y)
  // - mouthPucker narrows horizontal extent
  // - mouthSmile raises corners
  const open = jawOpen * 18;                 // 0-18 px
  const narrow = mouthPucker * 14;           // 0-14 px
  const cornerLift = mouthSmile * 4;         // 0-4 px
  const leftX = 8 + narrow;
  const rightX = 52 - narrow;
  const cornerY = 20 - cornerLift;
  const bottomY = 20 + open;
  const lowerLip = `M ${leftX},${cornerY} Q 30,${bottomY} ${rightX},${cornerY}`;

  return (
    <svg
      viewBox="0 0 60 40"
      className={cn(compact ? "w-7 h-5" : "w-20 h-14", playing && "scale-105 transition-transform")}
    >
      <ellipse
        cx="30" cy="20" rx="28" ry="18"
        fill="none" stroke="currentColor" strokeWidth="1.5"
        className="text-slate-200 dark:text-slate-700"
      />
      {!compact && (
        <>
          <circle cx="20" cy="12" r="2" fill="currentColor" className="text-slate-400" />
          <circle cx="40" cy="12" r="2" fill="currentColor" className="text-slate-400" />
        </>
      )}
      <path
        d="M 8,20 Q 20,14 30,13 Q 40,14 52,20"
        fill="none" stroke="currentColor" strokeWidth={compact ? 2 : 2.5}
        strokeLinecap="round" className="text-rose-400"
      />
      <path
        d={lowerLip}
        fill={playing ? "rgba(239,68,68,0.15)" : "none"}
        stroke="currentColor" strokeWidth={compact ? 2 : 2.5}
        strokeLinecap="round" className="text-rose-400"
      />
    </svg>
  );
}

// ─── Three.js head integration ──────────────────────────────────────────

interface HeadApi {
  applyBlendShapes: (values: number[]) => void;
  dispose: () => void;
}

// Three.js is loaded from CDN at runtime so it doesn't need to be in the npm
// lockfile. Vite passes absolute-URL dynamic imports straight through to the
// browser unchanged (no bundling, no lockfile entry needed).
const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
const GLTF_CDN =
  "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";

async function initThreeHead(canvas: HTMLCanvasElement, url: string): Promise<HeadApi> {
  const THREE = await import(/* @vite-ignore */ THREE_CDN);
  const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_CDN);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  const resize = () => renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  resize();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    20,
    (canvas.clientWidth || 1) / (canvas.clientHeight || 1),
    0.1, 100
  );
  camera.position.set(0, 1.6, 1.2);
  camera.lookAt(0, 1.55, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(1, 2, 2);
  scene.add(dir);

  const loader = new GLTFLoader();
  const gltf: any = await new Promise((resolve, reject) =>
    loader.load(url, resolve, undefined, reject)
  );
  scene.add(gltf.scene);

  // Collect every mesh that exposes morph targets matching the Azure names.
  // RPM (and most ARKit-compatible heads) put them on a "Wolf3D_Head"/teeth/eyelashes mesh.
  type MorphTarget = { mesh: any; nameToIndex: Record<string, number> };
  const targets: MorphTarget[] = [];
  gltf.scene.traverse((obj: any) => {
    if (obj.isMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
      targets.push({ mesh: obj, nameToIndex: obj.morphTargetDictionary });
    }
  });

  if (targets.length === 0) {
    renderer.dispose();
    throw new Error("Loaded head has no morph targets — check VITE_VISEME_HEAD_URL is an ARKit-compatible glb");
  }

  let running = true;
  const animate = () => {
    if (!running) return;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  return {
    applyBlendShapes(values: number[]) {
      for (const { mesh, nameToIndex } of targets) {
        for (let i = 0; i < AZURE_BLENDSHAPE_NAMES.length && i < values.length; i++) {
          const morphIdx = nameToIndex[AZURE_BLENDSHAPE_NAMES[i]];
          if (typeof morphIdx === "number") {
            mesh.morphTargetInfluences[morphIdx] = values[i] || 0;
          }
        }
      }
    },
    dispose() {
      running = false;
      ro.disconnect();
      renderer.dispose();
    },
  };
}
