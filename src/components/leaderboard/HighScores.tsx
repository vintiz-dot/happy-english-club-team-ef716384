/**
 * High Scores — the arcade-cabinet board, for the primary years.
 *
 * A 1920x1080 display board drawn to look like the front of an arcade
 * machine: a flat blue stage behind a dot screen, a grid floor, a marquee
 * of blinking bulbs under the podium, and one rule holding it together —
 * every surface is outlined in the same ink (#14102B) and sits on a hard
 * offset shadow in that ink, with no blur and no gradient anywhere except
 * the avatar level rings. The scale transform is applied by BoardFrame,
 * so everything here is true-size pixels.
 *
 * Judgement calls a reader would otherwise question:
 *
 *  - FOUR filter tabs, not three. The source template was drawn with
 *    Book / Bolt / Flame; this school awards a fourth bucket
 *    (vocabulary), and `total_points` already counts it, so hiding it
 *    would mean the chips never add up to the number beside them. The
 *    fourth tab is paid for by shrinking only the tab row (20px Bungee
 *    instead of 24px, a 12px gap) — the 68px title, the 104px header,
 *    the 380/440/380 podium columns, the 170px strip and the 470px rail
 *    are all untouched. Vocabulary took the remaining arcade green,
 *    #2FE0AE, as its colour; it is the one palette member not already
 *    carrying a category.
 *
 *  - The category icons come from BOARD_CATEGORIES (lucide, stroked)
 *    rather than the template's hand-drawn filled glyphs, so that adding
 *    a fifth bucket one day needs no new SVG here. A stroked glyph loses
 *    the template's category colour, so each one sits in a small square
 *    of that colour — which is what the template's "Category Champs"
 *    rows already did.
 *
 *  - Initials, not photos. `BoardRow.avatarUrl` is deliberately unused:
 *    this style's avatar is a Bungee initial on the student's colour
 *    inside a double ink ring, and the rail panels only ever get an
 *    initial from `BoardExtras`, so using photos on the podium would
 *    make the same child look like two different people on one screen.
 *
 *  - The entrance plays on mount as well as on Reveal — a board that
 *    draws itself is the point of it. Confetti is held back for an
 *    actual Reveal press, so remounting the page does not throw a party.
 *    Changing a category replays the short 900ms version, as the
 *    template did.
 *
 *  - Empty podium steps keep their step and their "1ST / 2ND / 3RD"
 *    label at 30% ink instead of going blank (the template blanked
 *    them), because an unlabelled white block reads as a rendering bug
 *    rather than as a free space.
 *
 *  - The strip is 170px and its cards are 518px, exactly as drawn, which means
 *    two of them fit. A class of six already has three children below the
 *    podium, so the strip pages: two cards at a time, moving on every few
 *    seconds, with the "NEXT UP" label carrying the slice it is showing
 *    ("3–4 of 3"). Nothing is dropped without the board saying so.
 *
 * Reduced motion is honoured twice: `motion === false` drops every
 * animation string and freezes the tally on its final number, and a
 * `prefers-reduced-motion` block in the scoped <style> stops the idle
 * loops and collapses the entrance for anyone the prop missed.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import {
  BOARD_CATEGORIES,
  BOARD_STYLE_INFO,
  type BoardCategory,
  type BoardRow,
  type BoardViewProps,
} from "./types";
import { fitCount } from "./restPaging";
import { useRestPaging } from "./useRestPaging";

/* ------------------------------------------------- the strip's arithmetic
 * Every number here is the same number the layout below draws with, so the
 * page count can never drift away from the pixels a card is actually given:
 * 1920 board - 2x56 padding - 40 rail gap - 470 rail - 200 label - 26 gap
 * leaves a 1072px track, which is two 518px cards and nothing more. */
const BOARD_W = 1920;
const PAD_X = 56;
const RAIL_GAP = 40;
const RAIL_W = 470;
const LABEL_W = 200;
const LABEL_GAP = 26;
const CARD_W = 518;
const CARD_GAP = 26;
const STRIP_H = 170;
const REST_PER_PAGE = fitCount(BOARD_W - PAD_X * 2 - RAIL_GAP - RAIL_W - LABEL_W - LABEL_GAP, CARD_W, CARD_GAP);

/* ------------------------------------------------------------- palette */

const INK = "#14102B";
const STAGE = "#2349C7";
const WHITE = "#FFFFFF";
const YELLOW = "#FFE14D";
const GOLD = "#FFC21A";
const MAGENTA = "#F2437F";
const CYAN = "#35D6E0";
const GREEN = "#2FE0AE";
const ORANGE = "#FF8C42";
const SILVER = "#C3D3EE";
const TRACK_DARK = "#1A1548";
const TRACK_LIGHT = "#E7ECF8";
const NICK_INK = "#4A4670";
const ROW_IDLE = "#F2F4FF";

const BODY_FONT = "'Lexend', 'Segoe UI', system-ui, sans-serif";
/** Bungee ships one weight. Asking for bold would synthesise a smear. */
const DISPLAY_FONT = "'Bungee', 'Arial Black', sans-serif";

/** Blends two hex colours, used only for the floor band. */
function mix(from: string, to: string, w: number): string {
  const parse = (hex: string): [number, number, number] => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const a = parse(from);
  const b = parse(to);
  const c = (i: number) => Math.round(a[i] + (b[i] - a[i]) * w);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}

const FLOOR = mix(STAGE, INK, 0.45);

const CAT_COLOR: Record<BoardCategory["key"], string> = {
  homework: CYAN,
  participation: YELLOW,
  reading_theory: ORANGE,
  vocabulary_quiz: GREEN,
};

/** The 32-point burst, shared by the big spinning star and the TIE! badge. */
const BURST =
  "polygon(50% 0%, 57.4% 12.7%, 69.1% 3.8%, 71.1% 18.4%, 85.4% 14.6%, 81.6% 28.9%, 96.2% 30.9%, 87.3% 42.6%, 100% 50%, 87.3% 57.4%, 96.2% 69.1%, 81.6% 71.1%, 85.4% 85.4%, 71.1% 81.6%, 69.1% 96.2%, 57.4% 87.3%, 50% 100%, 42.6% 87.3%, 30.9% 96.2%, 28.9% 81.6%, 14.6% 85.4%, 18.4% 71.1%, 3.8% 69.1%, 12.7% 57.4%, 0% 50%, 12.7% 42.6%, 3.8% 30.9%, 18.4% 28.9%, 14.6% 14.6%, 28.9% 18.4%, 30.9% 3.8%, 42.6% 12.7%)";

/* ------------------------------------------------------------- geometry */

interface StepStyle {
  h: number;
  face: string;
  label: string;
}

/** Step height and face by rank. Rank 1 is tallest and gold. */
const STEPS: Record<1 | 2 | 3, StepStyle> = {
  1: { h: 200, face: GOLD, label: "1ST" },
  2: { h: 150, face: SILVER, label: "2ND" },
  3: { h: 110, face: ORANGE, label: "3RD" },
};

/** An unoccupied step: short, blank-faced, still a step. */
const EMPTY_STEP = { h: 90, face: WHITE };

interface SlotGeo {
  colW: number;
  disc: number;
  discBorder: number;
  discInset: number;
  initial: number;
  initialShadow: number;
  discShadow: number;
  lvBottom: number;
  lvPad: string;
  lvFont: number;
  platePad: string;
  plateRadius: number;
  plateShadow: number;
  nameFont: number;
  nickFont: number;
  ptsFont: number;
  ptsShadow: number;
  unitFont: number;
  chipH: number;
  chipFont: number;
  chipIcon: number;
  chipPad: string;
  stepPadTop: number;
  stepRadius: string;
  stepGloss: number;
  ordinal: number;
}

/** 2nd and 3rd place. */
const SIDE: SlotGeo = {
  colW: 380,
  disc: 160,
  discBorder: 5,
  discInset: 9,
  initial: 60,
  initialShadow: 4,
  discShadow: 6,
  lvBottom: -18,
  lvPad: "5px 12px 4px",
  lvFont: 20,
  platePad: "5px 22px 7px",
  plateRadius: 14,
  plateShadow: 5,
  nameFont: 36,
  nickFont: 18,
  ptsFont: 62,
  ptsShadow: 4,
  unitFont: 22,
  chipH: 36,
  chipFont: 18,
  chipIcon: 18,
  chipPad: "0 8px",
  stepPadTop: 16,
  stepRadius: "22px 22px 0 0",
  stepGloss: 12,
  ordinal: 62,
};

/** 1st place, the tall middle column. */
const CENTRE: SlotGeo = {
  colW: 440,
  disc: 184,
  discBorder: 6,
  discInset: 10,
  initial: 72,
  initialShadow: 5,
  discShadow: 7,
  lvBottom: -20,
  lvPad: "5px 13px 4px",
  lvFont: 22,
  platePad: "5px 26px 7px",
  plateRadius: 16,
  plateShadow: 6,
  nameFont: 42,
  nickFont: 20,
  ptsFont: 76,
  ptsShadow: 5,
  unitFont: 24,
  chipH: 38,
  chipFont: 19,
  chipIcon: 19,
  chipPad: "0 9px",
  stepPadTop: 18,
  stepRadius: "24px 24px 0 0",
  stepGloss: 14,
  ordinal: 76,
};

/* ------------------------------------------------------- decorative bits */

const BULBS = Array.from({ length: 34 }, (_, i) => ({ delay: i % 2 ? 600 : 0 }));

const CONFETTI_COLORS = [GOLD, MAGENTA, CYAN, GREEN, WHITE, ORANGE];

/** Deterministic, so the same party falls every time and nothing jitters. */
const CONFETTI = Array.from({ length: 44 }, (_, j) => {
  const a = (j * 37 + 11) % 100;
  const b = (j * 53 + 7) % 100;
  const c = (j * 71 + 23) % 100;
  return {
    x: a,
    w: 16 + (b % 3) * 5,
    h: 16 + (c % 3) * 5,
    color: CONFETTI_COLORS[j % CONFETTI_COLORS.length],
    radius: j % 2 === 0 ? "50%" : "4px",
    dur: 2300 + c * 18,
    delay: 2550 + b * 9,
  };
});

/* ----------------------------------------------------------------- style */

const CSS = `
.hs-board button{font:inherit;color:inherit;cursor:pointer;margin:0;padding:0}
.hs-board button:focus-visible{outline:4px solid #FFFFFF;outline-offset:6px}
.hs-board.hs-still .hs-idle{animation:none !important}
@keyframes hs-rise{0%{transform:scaleY(0)}50%{transform:scaleY(1.14)}70%{transform:scaleY(.93)}86%{transform:scaleY(1.03)}100%{transform:scaleY(1)}}
@keyframes hs-drop{0%{opacity:0;transform:translateY(-170px) rotate(-12deg) scale(.6)}55%{opacity:1;transform:translateY(14px) rotate(4deg) scale(1.07)}78%{transform:translateY(-6px) rotate(-1deg) scale(.98)}100%{opacity:1;transform:none}}
@keyframes hs-up{0%{opacity:0;transform:translateY(30px) scale(.9)}100%{opacity:1;transform:none}}
@keyframes hs-pop{0%{opacity:0;transform:scale(0) rotate(-45deg)}60%{opacity:1;transform:scale(1.25) rotate(8deg)}100%{opacity:1;transform:none}}
@keyframes hs-conf{0%{opacity:0;transform:translate(0,-60px) rotate(0deg)}6%{opacity:1}30%{transform:translate(30px,300px) rotate(260deg)}60%{transform:translate(-26px,680px) rotate(540deg)}88%{opacity:1}100%{opacity:0;transform:translate(12px,1160px) rotate(820deg)}}
@keyframes hs-spin{to{transform:rotate(360deg)}}
@keyframes hs-wobble{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(5deg)}}
@keyframes hs-blink{0%,49.9%{opacity:1}50%,100%{opacity:.22}}
@keyframes hs-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes hs-glint{0%,72%{transform:translateX(-160%) skewX(-18deg)}100%{transform:translateX(330%) skewX(-18deg)}}
@media (prefers-reduced-motion: reduce){
.hs-board .hs-idle{animation:none !important}
.hs-board .hs-rv{animation-duration:1ms !important;animation-delay:0ms !important}
}
`;

/* --------------------------------------------------------------- helpers */

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** conic-gradient level ring: how far through the current level they are. */
function ring(pct: number, track: string): string {
  return `conic-gradient(${GREEN} ${clamp01(pct / 100) * 100}%, ${track} 0)`;
}

/**
 * The score ticking up to its real value, inside its own component so
 * sixty frames a second repaint one number rather than the whole board.
 * `w0`/`w1` are the slice of the reveal this slot counts during.
 */
function Tally({
  value,
  w0,
  w1,
  dur,
  play,
}: {
  value: number;
  w0: number;
  w1: number;
  dur: number;
  play: boolean;
}) {
  const [shown, setShown] = useState(() => (play ? 0 : value));

  useEffect(() => {
    if (!play) {
      setShown(value);
      return;
    }
    let raf = 0;
    let start = 0;
    const frame = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / dur);
      const x = clamp01((t - w0) / (w1 - w0));
      setShown(Math.round(value * (1 - Math.pow(1 - x, 3))));
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    setShown(0);
    raf = requestAnimationFrame(frame);
    // requestAnimationFrame does not run while the document is hidden, so a
    // board mounted on a background tab - a projector set up before the
    // lesson, a second monitor, a teacher who opened the tab and switched
    // away - would animate no frames and leave every child showing zero.
    // This timer settles the true number whatever happened to the frames.
    const settle = window.setTimeout(() => setShown(value), dur + 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [value, w0, w1, dur, play]);

  return <>{shown}</>;
}

/** The double-ringed initial disc. One shape, five sizes. */
function Disc({
  size,
  border,
  inset,
  innerBorder,
  font,
  shadow,
  hardShadow,
  color,
  initial,
  pct,
  track,
}: {
  size: number;
  border: number;
  inset: number;
  innerBorder: number;
  font: number;
  shadow: number;
  hardShadow?: number;
  color: string;
  initial: string;
  pct: number;
  track: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        boxSizing: "border-box",
        borderRadius: "50%",
        border: `${border}px solid ${INK}`,
        background: ring(pct, track),
        boxShadow: hardShadow ? `${hardShadow}px ${hardShadow}px 0 ${INK}` : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset,
          boxSizing: "border-box",
          borderRadius: "50%",
          border: `${innerBorder}px solid ${INK}`,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: DISPLAY_FONT,
          fontWeight: 400,
          fontSize: font,
          lineHeight: 1,
          color: WHITE,
          textShadow: `${shadow}px ${shadow}px 0 ${INK}`,
        }}
      >
        {initial}
      </div>
    </div>
  );
}

/** "TIE!" on a little burst, pinned to the top-right of a step. */
function TieBadge({ anim }: { anim?: string }) {
  return (
    <div
      className="hs-rv"
      style={{ position: "absolute", top: -42, right: -20, width: 96, height: 96, animation: anim }}
    >
      <div style={{ position: "absolute", inset: 0, background: INK, clipPath: BURST }} />
      <div style={{ position: "absolute", inset: 6, background: MAGENTA, clipPath: BURST }} />
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: DISPLAY_FONT,
          fontWeight: 400,
          fontSize: 22,
          lineHeight: 1,
          color: INK,
          transform: "rotate(12deg)",
        }}
      >
        TIE!
      </span>
    </div>
  );
}

/** The paper crown over first place. */
function Crown({ anim }: { anim?: string }) {
  return (
    <div
      className="hs-rv"
      style={{ position: "absolute", left: 31, top: -62, width: 110, height: 86, animation: anim }}
    >
      <svg
        className="hs-idle"
        width="110"
        height="86"
        viewBox="0 0 24 19"
        aria-hidden="true"
        style={{ display: "block", transformOrigin: "50% 100%", animation: "hs-wobble 2.2s ease-in-out infinite" }}
      >
        <path
          d="M2.2 6.6 7 10.4 12 3.4 17 10.4 21.8 6.6 19.9 16.8H4.1Z"
          fill={GOLD}
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M4.6 13.8h14.8" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="12" cy="2.4" r="1.5" fill={MAGENTA} stroke={INK} strokeWidth="1" />
        <circle cx="2.2" cy="5.6" r="1.3" fill={CYAN} stroke={INK} strokeWidth="1" />
        <circle cx="21.8" cy="5.6" r="1.3" fill={CYAN} stroke={INK} strokeWidth="1" />
      </svg>
    </div>
  );
}

/** A "YOU!" flag, so a child finds themselves without reading every name. */
function YouChip({ font = 16 }: { font?: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        padding: "3px 9px 2px",
        border: `3px solid ${INK}`,
        borderRadius: 8,
        background: MAGENTA,
        color: INK,
        fontFamily: DISPLAY_FONT,
        fontWeight: 400,
        fontSize: font,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
      }}
    >
      YOU!
    </span>
  );
}

/* ----------------------------------------------------------- podium slot */

interface SlotAnims {
  step?: string;
  disc?: string;
  text?: string;
  crown?: string;
  tie?: string;
}

function PodiumSlot({
  row,
  geo,
  seat,
  tilt,
  tallyW,
  tallyDur,
  play,
  anims,
  champOf,
  crown,
  gloss,
}: {
  row: BoardRow | undefined;
  geo: SlotGeo;
  /** The step this column is, used when nobody is standing on it. */
  seat: 1 | 2 | 3;
  tilt: number;
  tallyW: [number, number];
  tallyDur: number;
  play: boolean;
  anims: SlotAnims;
  champOf: Map<BoardCategory["key"], string>;
  crown: boolean;
  gloss: boolean;
}) {
  const step = row ? STEPS[Math.min(row.rank, 3) as 1 | 2 | 3] : null;
  const stepH = step ? step.h : EMPTY_STEP.h;
  const face = step ? step.face : EMPTY_STEP.face;
  const label = step ? step.label : STEPS[seat].label;

  return (
    <div style={{ width: geo.colW, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {row && (
        <>
          <div className="hs-rv" style={{ position: "relative", animation: anims.disc }}>
            <Disc
              size={geo.disc}
              border={geo.discBorder}
              inset={geo.discInset}
              innerBorder={5}
              font={geo.initial}
              shadow={geo.initialShadow}
              hardShadow={geo.discShadow}
              color={row.color}
              initial={row.initial}
              pct={row.levelPct}
              track={TRACK_DARK}
            />
            <span
              style={{
                position: "absolute",
                left: "50%",
                bottom: geo.lvBottom,
                transform: "translateX(-50%)",
                padding: geo.lvPad,
                border: `4px solid ${INK}`,
                borderRadius: 10,
                background: GREEN,
                color: INK,
                fontFamily: DISPLAY_FONT,
                fontWeight: 400,
                fontSize: geo.lvFont,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              LV{row.level}
            </span>
            {crown && <Crown anim={anims.crown} />}
          </div>

          <div
            className="hs-rv"
            style={{
              marginTop: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              animation: anims.text,
            }}
          >
            <div
              style={{
                maxWidth: geo.colW,
                padding: geo.platePad,
                border: `4px solid ${INK}`,
                borderRadius: geo.plateRadius,
                background: WHITE,
                boxShadow: `${geo.plateShadow}px ${geo.plateShadow}px 0 ${INK}`,
                transform: `rotate(${tilt}deg)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                color: INK,
              }}
            >
              <span
                style={{
                  maxWidth: geo.colW - 60,
                  fontSize: geo.nameFont,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.shortName}
              </span>
              {(row.nickname || row.isSelf) && (
                <span style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: geo.colW - 60 }}>
                  {row.nickname && (
                    <span
                      style={{
                        fontSize: geo.nickFont,
                        fontWeight: 600,
                        lineHeight: 1.1,
                        color: NICK_INK,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.nickname}
                    </span>
                  )}
                  {row.isSelf && <YouChip />}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 400,
                  fontSize: geo.ptsFont,
                  lineHeight: 1,
                  color: WHITE,
                  textShadow: `${geo.ptsShadow}px ${geo.ptsShadow}px 0 ${INK}`,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Tally value={row.points} w0={tallyW[0]} w1={tallyW[1]} dur={tallyDur} play={play} />
              </span>
              <span
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 400,
                  fontSize: geo.unitFont,
                  lineHeight: 1,
                  color: YELLOW,
                  textShadow: `2px 2px 0 ${INK}`,
                }}
              >
                PTS
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              {BOARD_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isChamp = champOf.get(cat.key) === row.studentId;
                return (
                  <span
                    key={cat.key}
                    title={cat.label}
                    style={{
                      height: geo.chipH,
                      boxSizing: "border-box",
                      padding: geo.chipPad,
                      border: `3px solid ${INK}`,
                      borderRadius: 10,
                      background: isChamp ? CAT_COLOR[cat.key] : WHITE,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: INK,
                      fontSize: geo.chipFont,
                      fontWeight: 700,
                    }}
                  >
                    <Icon size={geo.chipIcon} color={INK} strokeWidth={2.4} aria-hidden="true" />
                    <span>{row.categories[cat.key]}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div
        className="hs-rv"
        style={{
          position: "relative",
          marginTop: 16,
          width: "100%",
          height: stepH,
          boxSizing: "border-box",
          paddingTop: geo.stepPadTop,
          border: `5px solid ${INK}`,
          borderBottom: "none",
          borderRadius: geo.stepRadius,
          background: face,
          boxShadow: `inset 0 ${geo.stepGloss}px 0 rgba(255,255,255,0.45), 10px 0 0 ${INK}`,
          display: "flex",
          justifyContent: "center",
          transformOrigin: "50% 100%",
          animation: anims.step,
        }}
      >
        {gloss && row && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "19px 19px 0 0",
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <div
              className="hs-idle"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: "34%",
                background: "rgba(255,255,255,0.45)",
                animation: "hs-glint 4.5s ease-in-out infinite",
              }}
            />
          </div>
        )}
        <span
          style={{
            position: "relative",
            fontFamily: DISPLAY_FONT,
            fontWeight: 400,
            fontSize: geo.ordinal,
            lineHeight: 1,
            color: row ? INK : "rgba(17,13,51,0.3)",
          }}
        >
          {label}
        </span>
        {row?.tied && <TieBadge anim={anims.tie} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ rail parts */

/** The quiet stand-in a rail panel shows instead of inventing a number. */
function RailPlaceholder({ head, body }: { head: string; body: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
      <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 400, fontSize: 24, lineHeight: 1.1 }}>{head}</span>
      <span style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.25, opacity: 0.8 }}>{body}</span>
    </div>
  );
}

function PanelHead({
  title,
  sub,
  chipColor,
  children,
  titleSize,
}: {
  title: string;
  sub: string;
  chipColor: string;
  children: ReactNode;
  titleSize: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        style={{
          width: 52,
          height: 52,
          flexShrink: 0,
          borderRadius: 12,
          background: INK,
          color: chipColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h2 style={{ margin: 0, fontFamily: DISPLAY_FONT, fontWeight: 400, fontSize: titleSize, lineHeight: 1 }}>
          {title}
        </h2>
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {sub}
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- the board */

export function HighScores({
  title,
  periodLabel,
  rows,
  extras,
  activeCategory,
  onCategoryChange,
  revealKey,
  onReveal,
  motion,
}: BoardViewProps) {
  /**
   * One counter drives every entrance: bumping it remounts the board's
   * contents, which is how React restarts a CSS animation. A Reveal press
   * plays the long version; switching category plays the short one, as
   * the template did.
   */
  const [run, setRun] = useState<{ n: number; fast: boolean }>({ n: 0, fast: false });
  const seen = useRef({ revealKey, activeCategory });

  useEffect(() => {
    const was = seen.current;
    if (was.revealKey === revealKey && was.activeCategory === activeCategory) return;
    const fast = was.revealKey === revealKey;
    seen.current = { revealKey, activeCategory };
    setRun((r) => ({ n: r.n + 1, fast }));
  }, [revealKey, activeCategory]);

  const fast = run.fast;
  const play = motion;
  const tallyDur = fast ? 900 : 3300;
  const stepDur = fast ? 520 : 820;
  const delay = fast ? { L: 70, C: 140, R: 0 } : { L: 1050, C: 1950, R: 200 };
  const tallyWin: Record<"L" | "C" | "R", [number, number]> = fast
    ? { L: [0.3, 1], C: [0.35, 1], R: [0.25, 1] }
    : { L: [0.46, 0.72], C: [0.74, 1], R: [0.2, 0.46] };

  const anim = (name: string, dur: number, wait: number): string | undefined =>
    motion ? `hs-${name} ${dur}ms ease-out ${wait}ms both` : undefined;

  const animsFor = (slot: "L" | "C" | "R"): SlotAnims => ({
    step: anim("rise", stepDur, delay[slot]),
    disc: anim("drop", fast ? 500 : 720, delay[slot] + (fast ? 120 : 300)),
    text: anim("up", fast ? 360 : 520, delay[slot] + (fast ? 200 : 460)),
    crown: anim("pop", 620, delay[slot] + (fast ? 260 : 880)),
    tie: anim("pop", 520, delay[slot] + (fast ? 220 : 700)),
  });

  const champOf = new Map(extras.champions.map((c) => [c.category.key, c.studentId]));
  const championFor = (key: BoardCategory["key"]) => extras.champions.find((c) => c.category.key === key) ?? null;

  const activeLabel = activeCategory
    ? (BOARD_CATEGORIES.find((c) => c.key === activeCategory)?.label ?? "All") + " points"
    : "All points";

  const rest = rows.slice(3);
  /** Two cards fit the strip, so a bigger class is shown a page at a time. */
  const restPage = useRestPaging(rest.length, REST_PER_PAGE, motion);
  const shownRest = rest.slice(restPage.from, restPage.to);
  const showConfetti = motion && run.n > 0 && !fast;

  const pick = (key: BoardCategory["key"] | null) => {
    if (key === activeCategory) return;
    onCategoryChange(key);
  };

  /* ------------------------------------------------------------- header */

  const tabs: Array<{ key: BoardCategory["key"] | null; text: string; label: string; swatch: string; icon: ReactNode }> =
    [
      {
        key: null,
        text: "ALL",
        label: "Show all points",
        swatch: INK,
        icon: <Star size={22} color={GOLD} fill={GOLD} strokeWidth={2} aria-hidden="true" />,
      },
      ...BOARD_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        return {
          key: cat.key,
          text: cat.short.toUpperCase(),
          label: `Show ${cat.label} points only`,
          swatch: CAT_COLOR[cat.key],
          icon: <Icon size={22} color={INK} strokeWidth={2.4} aria-hidden="true" />,
        };
      }),
    ];

  const header = (
    <header
      style={{
        height: 104,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: DISPLAY_FONT,
            fontWeight: 400,
            fontSize: 68,
            lineHeight: 0.9,
            color: WHITE,
            textShadow: `6px 6px 0 ${INK}`,
            whiteSpace: "nowrap",
          }}
        >
          {BOARD_STYLE_INFO.arcade.name.toUpperCase()}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span
            style={{
              flexShrink: 0,
              padding: "7px 14px 5px",
              borderRadius: 10,
              background: INK,
              color: YELLOW,
              fontFamily: DISPLAY_FONT,
              fontWeight: 400,
              fontSize: 18,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {periodLabel.toUpperCase()}
          </span>
          <span
            style={{
              minWidth: 0,
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: WHITE,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title} · {activeLabel}
          </span>
        </div>
      </div>

      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        {tabs.map((tab) => {
          const on = tab.key === activeCategory;
          return (
            <button
              key={tab.key ?? "all"}
              type="button"
              aria-pressed={on}
              aria-label={tab.label}
              onClick={() => pick(tab.key)}
              style={{
                height: 76,
                flexShrink: 0,
                boxSizing: "border-box",
                padding: "0 16px 0 10px",
                border: `5px solid ${INK}`,
                borderRadius: 18,
                background: on ? YELLOW : WHITE,
                boxShadow: on ? `2px 2px 0 ${INK}` : `6px 6px 0 ${INK}`,
                transform: on ? "translate(4px, 4px)" : undefined,
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: INK,
                fontFamily: DISPLAY_FONT,
                fontWeight: 400,
                fontSize: 20,
                lineHeight: 1,
                whiteSpace: "nowrap",
                transition: "transform 120ms ease, box-shadow 120ms ease",
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  boxSizing: "border-box",
                  border: `3px solid ${INK}`,
                  borderRadius: 12,
                  background: tab.swatch,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {tab.icon}
              </span>
              <span>{tab.text}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onReveal}
          style={{
            height: 76,
            flexShrink: 0,
            boxSizing: "border-box",
            padding: "0 28px 0 14px",
            border: `5px solid ${INK}`,
            borderRadius: 999,
            background: MAGENTA,
            boxShadow: `6px 6px 0 ${INK}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: INK,
            fontFamily: DISPLAY_FONT,
            fontWeight: 400,
            fontSize: 26,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: INK,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="7 4 20 12 7 20 7 4" fill={YELLOW} stroke={YELLOW} strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </span>
          <span>REVEAL</span>
        </button>
      </div>
    </header>
  );

  /* --------------------------------------------------------- background */

  const backdrop = (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 2.2px, rgba(255,255,255,0) 3px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div
        className="hs-idle"
        style={{
          position: "absolute",
          left: -150,
          top: -590,
          width: 1700,
          height: 1700,
          borderRadius: "50%",
          background:
            "repeating-conic-gradient(rgba(255,255,255,0.08) 0deg 7.5deg, rgba(255,255,255,0) 7.5deg 15deg)",
          maskImage: "radial-gradient(circle, #000 22%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, #000 22%, rgba(0,0,0,0) 60%)",
          animation: "hs-spin 160s linear infinite",
        }}
      />
      <div
        className="hs-idle"
        style={{
          position: "absolute",
          left: 505,
          top: 65,
          width: 390,
          height: 390,
          animation: "hs-spin 40s linear infinite",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: INK, clipPath: BURST }} />
        <div style={{ position: "absolute", inset: 10, background: GOLD, clipPath: BURST }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 846,
          bottom: 0,
          backgroundColor: FLOOR,
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0) 2px), linear-gradient(rgba(255,255,255,0.08) 2px, rgba(255,255,255,0) 2px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );

  /* -------------------------------------------------------------- empty */

  if (rows.length === 0) {
    return (
      <div
        className={`hs-board${motion ? "" : " hs-still"}`}
        style={{
          position: "relative",
          width: BOARD_W,
          height: 1080,
          overflow: "hidden",
          background: STAGE,
          fontFamily: BODY_FONT,
          fontSynthesis: "none",
          color: WHITE,
        }}
      >
        <style>{CSS}</style>
        {backdrop}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            boxSizing: "border-box",
            padding: `36px ${PAD_X}px`,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {header}
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                width: 980,
                boxSizing: "border-box",
                padding: "48px 56px",
                border: `5px solid ${INK}`,
                borderRadius: 30,
                background: WHITE,
                boxShadow: `10px 10px 0 ${INK}`,
                color: INK,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 18,
                textAlign: "center",
              }}
            >
              <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 400, fontSize: 56, lineHeight: 1.05 }}>
                NO SCORES YET
              </span>
              <span style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.35, maxWidth: 760 }}>
                This board fills up as soon as your class starts earning points. Keep going — your name could be
                first.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------- full */

  return (
    <div
      className={`hs-board${motion ? "" : " hs-still"}`}
      style={{
        position: "relative",
        width: BOARD_W,
        height: 1080,
        overflow: "hidden",
        background: STAGE,
        fontFamily: BODY_FONT,
        fontSynthesis: "none",
        color: WHITE,
      }}
    >
      <style>{CSS}</style>
      {backdrop}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          boxSizing: "border-box",
          padding: `36px ${PAD_X}px`,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {header}

        <div key={run.n} style={{ flex: 1, minHeight: 0, display: "flex", gap: RAIL_GAP }}>
          <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <section aria-label="Podium" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: 28,
                }}
              >
                <PodiumSlot
                  row={rows[1]}
                  geo={SIDE}
                  seat={2}
                  tilt={-2}
                  tallyW={tallyWin.L}
                  tallyDur={tallyDur}
                  play={play}
                  anims={animsFor("L")}
                  champOf={champOf}
                  crown={false}
                  gloss={false}
                />
                <PodiumSlot
                  row={rows[0]}
                  geo={CENTRE}
                  seat={1}
                  tilt={-2}
                  tallyW={tallyWin.C}
                  tallyDur={tallyDur}
                  play={play}
                  anims={animsFor("C")}
                  champOf={champOf}
                  crown
                  gloss
                />
                <PodiumSlot
                  row={rows[2]}
                  geo={SIDE}
                  seat={3}
                  tilt={2}
                  tallyW={tallyWin.R}
                  tallyDur={tallyDur}
                  play={play}
                  anims={animsFor("R")}
                  champOf={champOf}
                  crown={false}
                  gloss={false}
                />
              </div>

              <div
                aria-hidden="true"
                style={{
                  position: "relative",
                  height: 36,
                  flexShrink: 0,
                  boxSizing: "border-box",
                  padding: "0 22px",
                  borderRadius: 18,
                  background: INK,
                  boxShadow: "0 10px 0 rgba(17,13,51,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {BULBS.map((bulb, i) => (
                  <span
                    key={i}
                    className="hs-idle"
                    style={{
                      width: 14,
                      height: 14,
                      flexShrink: 0,
                      borderRadius: "50%",
                      background: YELLOW,
                      boxShadow: "0 0 10px rgba(255,225,77,0.85)",
                      animation: `hs-blink 1.2s linear ${bulb.delay}ms infinite`,
                    }}
                  />
                ))}
              </div>
            </section>

            <section
              aria-label="Everyone else"
              style={{ height: STRIP_H, flexShrink: 0, display: "flex", alignItems: "center", gap: LABEL_GAP }}
            >
              <div style={{ width: LABEL_W, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: DISPLAY_FONT,
                    fontWeight: 400,
                    fontSize: 44,
                    lineHeight: 0.95,
                    color: YELLOW,
                    textShadow: `4px 4px 0 ${INK}`,
                  }}
                >
                  NEXT UP
                </h2>
                <span style={{ fontSize: 20, fontWeight: 700, color: WHITE }}>Everyone else</span>
                {restPage.label && (
                  <span
                    style={{
                      width: "fit-content",
                      padding: "4px 10px 3px",
                      border: `3px solid ${INK}`,
                      borderRadius: 8,
                      background: WHITE,
                      color: INK,
                      fontFamily: DISPLAY_FONT,
                      fontWeight: 400,
                      fontSize: 16,
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {restPage.label}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0, display: "flex", gap: CARD_GAP, overflow: "hidden" }}>
                {shownRest.length === 0 && (
                  <div
                    style={{
                      width: CARD_W,
                      height: 136,
                      flexShrink: 0,
                      boxSizing: "border-box",
                      padding: "18px 24px",
                      border: `5px solid ${INK}`,
                      borderRadius: 22,
                      background: WHITE,
                      boxShadow: `8px 8px 0 ${INK}`,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 8,
                      color: INK,
                    }}
                  >
                    <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 400, fontSize: 28, lineHeight: 1.05 }}>
                      EVERYONE IS UP THERE!
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>
                      Nobody is waiting in the queue today.
                    </span>
                  </div>
                )}

                {shownRest.map((row) => {
                  const target = row.points + row.toPodium;
                  const filled = target > 0 ? Math.round(clamp01(row.points / target) * 6) : 0;
                  return (
                    <div
                      key={row.studentId}
                      style={{
                        width: CARD_W,
                        height: 136,
                        flexShrink: 0,
                        boxSizing: "border-box",
                        padding: "14px 20px 14px 12px",
                        border: `5px solid ${INK}`,
                        borderRadius: 22,
                        background: WHITE,
                        boxShadow: `8px 8px 0 ${INK}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        color: INK,
                      }}
                    >
                      <span
                        style={{
                          width: 56,
                          flexShrink: 0,
                          fontFamily: DISPLAY_FONT,
                          fontWeight: 400,
                          fontSize: 30,
                          lineHeight: 1,
                          textAlign: "center",
                        }}
                      >
                        #{row.rank}
                      </span>
                      <Disc
                        size={88}
                        border={4}
                        inset={6}
                        innerBorder={4}
                        font={32}
                        shadow={3}
                        color={row.color}
                        initial={row.initial}
                        pct={row.levelPct}
                        track={TRACK_LIGHT}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                fontSize: 32,
                                fontWeight: 800,
                                lineHeight: 1.1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {row.shortName}
                            </span>
                            {row.isSelf && <YouChip font={15} />}
                          </span>
                          <span
                            style={{
                              flexShrink: 0,
                              fontFamily: DISPLAY_FONT,
                              fontWeight: 400,
                              fontSize: 38,
                              lineHeight: 1,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {row.points}
                          </span>
                        </div>

                        {row.points > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                flex: 1,
                                height: 22,
                                boxSizing: "border-box",
                                padding: 3,
                                border: `3px solid ${INK}`,
                                borderRadius: 7,
                                display: "flex",
                                gap: 3,
                              }}
                            >
                              {Array.from({ length: 6 }, (_, i) => (
                                <span
                                  key={i}
                                  style={{ flex: 1, borderRadius: 2, background: i < filled ? GREEN : TRACK_LIGHT }}
                                />
                              ))}
                            </div>
                            <span
                              style={{
                                flexShrink: 0,
                                padding: "4px 10px 3px",
                                border: `3px solid ${INK}`,
                                borderRadius: 8,
                                background: YELLOW,
                                fontFamily: DISPLAY_FONT,
                                fontWeight: 400,
                                fontSize: 15,
                                lineHeight: 1.1,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.toPodium > 0 ? `${row.toPodium} TO PODIUM` : "TIED FOR PODIUM"}
                            </span>
                          </div>
                        ) : (
                          <span
                            className="hs-idle"
                            style={{
                              width: "fit-content",
                              padding: "5px 12px 4px",
                              border: `3px solid ${INK}`,
                              borderRadius: 8,
                              background: MAGENTA,
                              fontFamily: DISPLAY_FONT,
                              fontWeight: 400,
                              fontSize: 18,
                              lineHeight: 1.1,
                              transformOrigin: "0 50%",
                              animation: "hs-pulse 1.6s ease-in-out infinite",
                            }}
                          >
                            PRESS START
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </main>

          <aside
            aria-label="Spotlights"
            style={{ width: RAIL_W, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}
          >
            {/* Biggest jump this week */}
            <section
              style={{
                height: 290,
                flexShrink: 0,
                boxSizing: "border-box",
                padding: "20px 24px",
                border: `5px solid ${INK}`,
                borderRadius: 26,
                background: MAGENTA,
                boxShadow: `10px 10px 0 ${INK}`,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                color: INK,
              }}
            >
              <PanelHead title="POWER-UP" sub="Biggest jump this week" chipColor={YELLOW} titleSize={32}>
                <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M3 17l6-6 4 4 8-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 7h7v7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </PanelHead>

              {extras.climber ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 20 }}>
                  <Disc
                    size={124}
                    border={5}
                    inset={7}
                    innerBorder={4}
                    font={46}
                    shadow={3}
                    color={extras.climber.color}
                    initial={extras.climber.initial}
                    pct={100}
                    track={TRACK_DARK}
                  />
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 800,
                        lineHeight: 1.1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {extras.climber.name}
                    </span>
                    <span
                      style={{
                        fontFamily: DISPLAY_FONT,
                        fontWeight: 400,
                        fontSize: 64,
                        lineHeight: 1,
                        color: WHITE,
                        textShadow: `4px 4px 0 ${INK}`,
                      }}
                    >
                      +{extras.climber.gain}
                    </span>
                    <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 400, fontSize: 18, lineHeight: 1 }}>
                      PTS THIS WEEK
                    </span>
                  </div>
                </div>
              ) : (
                <RailPlaceholder
                  head={extras.ledgerAvailable ? "NOBODY YET" : "NOT READY"}
                  body={
                    extras.ledgerAvailable
                      ? "Earn some points this week and your name goes right here."
                      : "This one needs this week's points. Have a look again later."
                  }
                />
              )}
            </section>

            {/* Longest run of days */}
            <section
              style={{
                height: 230,
                flexShrink: 0,
                boxSizing: "border-box",
                padding: "20px 24px",
                border: `5px solid ${INK}`,
                borderRadius: 26,
                background: YELLOW,
                boxShadow: `10px 10px 0 ${INK}`,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                color: INK,
              }}
            >
              <PanelHead title="COMBO STREAK" sub="Most in a row" chipColor={MAGENTA} titleSize={30}>
                <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
                  <path d="M8 3v4M16 3v4M3.5 10h17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  <path
                    d="m9 15 2 2 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </PanelHead>

              {extras.streak ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 18 }}>
                  <Disc
                    size={84}
                    border={4}
                    inset={5}
                    innerBorder={4}
                    font={30}
                    shadow={2}
                    color={extras.streak.color}
                    initial={extras.streak.initial}
                    pct={100}
                    track={TRACK_DARK}
                  />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <span
                        style={{
                          minWidth: 0,
                          fontSize: 30,
                          fontWeight: 800,
                          lineHeight: 1.1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {extras.streak.name}
                      </span>
                      <span
                        style={{
                          flexShrink: 0,
                          fontFamily: DISPLAY_FONT,
                          fontWeight: 400,
                          fontSize: 26,
                          lineHeight: 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {extras.streak.days}× COMBO
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {Array.from({ length: 10 }, (_, i) => (
                        <span
                          key={i}
                          style={{
                            width: 24,
                            height: 24,
                            flexShrink: 0,
                            boxSizing: "border-box",
                            border: `3px solid ${INK}`,
                            borderRadius: 6,
                            background: i < (extras.streak?.days ?? 0) ? MAGENTA : WHITE,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <RailPlaceholder
                  head={extras.ledgerAvailable ? "NO COMBO YET" : "NOT READY"}
                  body={
                    extras.ledgerAvailable
                      ? "Earn points two days in a row to start a combo."
                      : "This one needs a few days of points. Check back soon."
                  }
                />
              )}
            </section>

            {/* Top scorer in each of the four buckets, and the filter for it */}
            <section
              style={{
                flex: 1,
                minHeight: 0,
                boxSizing: "border-box",
                padding: "20px 22px",
                border: `5px solid ${INK}`,
                borderRadius: 26,
                background: WHITE,
                boxShadow: `10px 10px 0 ${INK}`,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                overflow: "hidden",
                color: INK,
              }}
            >
              <h2 style={{ margin: 0, fontFamily: DISPLAY_FONT, fontWeight: 400, fontSize: 28, lineHeight: 1 }}>
                CATEGORY CHAMPS
              </h2>
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {BOARD_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const champ = championFor(cat.key);
                  const on = cat.key === activeCategory;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      aria-pressed={on}
                      aria-label={`Show ${cat.label} points only`}
                      onClick={() => pick(cat.key)}
                      style={{
                        flex: "1 1 0",
                        minHeight: 0,
                        boxSizing: "border-box",
                        padding: "0 12px 0 6px",
                        border: `4px solid ${INK}`,
                        borderRadius: 16,
                        background: on ? YELLOW : ROW_IDLE,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        color: INK,
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 38,
                          height: 38,
                          flexShrink: 0,
                          boxSizing: "border-box",
                          border: `3px solid ${INK}`,
                          borderRadius: 11,
                          background: CAT_COLOR[cat.key],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={22} color={INK} strokeWidth={2.4} aria-hidden="true" />
                      </span>

                      {champ ? (
                        <>
                          <span
                            style={{
                              width: 38,
                              height: 38,
                              flexShrink: 0,
                              boxSizing: "border-box",
                              border: `3px solid ${INK}`,
                              borderRadius: "50%",
                              background: champ.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: DISPLAY_FONT,
                              fontWeight: 400,
                              fontSize: 18,
                              lineHeight: 1,
                              color: WHITE,
                              textShadow: `2px 2px 0 ${INK}`,
                            }}
                          >
                            {champ.initial}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: 23,
                              fontWeight: 800,
                              lineHeight: 1.1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {champ.name}
                          </span>
                          <span
                            style={{
                              flexShrink: 0,
                              fontFamily: DISPLAY_FONT,
                              fontWeight: 400,
                              fontSize: 26,
                              lineHeight: 1,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {champ.points}
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: 21,
                              fontWeight: 700,
                              lineHeight: 1.1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {cat.label} — up for grabs
                          </span>
                          <span
                            style={{
                              flexShrink: 0,
                              fontFamily: DISPLAY_FONT,
                              fontWeight: 400,
                              fontSize: 26,
                              lineHeight: 1,
                              opacity: 0.35,
                            }}
                          >
                            —
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {showConfetti && (
        <div
          key={`confetti-${run.n}`}
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 5, overflow: "hidden", pointerEvents: "none" }}
        >
          {CONFETTI.map((bit, i) => (
            <span
              key={i}
              className="hs-rv"
              style={{
                position: "absolute",
                top: -40,
                left: `${bit.x}%`,
                width: bit.w,
                height: bit.h,
                boxSizing: "border-box",
                border: `3px solid ${INK}`,
                borderRadius: bit.radius,
                background: bit.color,
                animation: `hs-conf ${bit.dur}ms cubic-bezier(.25,.6,.45,1) ${bit.delay}ms both`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
