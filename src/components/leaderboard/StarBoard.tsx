/**
 * Star Board — the early-years skin of the class board.
 *
 * A 1920x1080 display board for the youngest classes: sky, drifting clouds,
 * a slow sun-ray burst, grass, and three chunky podium steps with a crowned
 * champion. Everything is big, rounded and outlined, there is no small print,
 * and every word on it is one a five-year-old can read with a teacher. It is
 * drawn at true size inside BoardFrame, which applies the only scale
 * transform, so every number in this file is a real pixel.
 *
 * Judgement calls a reader would otherwise question:
 *
 *  - FOUR filter tabs, not three. The design was drawn with Book / Bolt /
 *    Flame, but this school awards four buckets and the total is generated
 *    across all four, so a three-tab board would show a total the tabs
 *    cannot explain. The row iterates BOARD_CATEGORIES, and with the fifth
 *    button ("All") the tab strip is 576px, which still leaves the header
 *    roughly 900px of slack — nothing else had to shrink.
 *  - The Champions panel became a 2x2 grid. Four of the drawn vertical cells
 *    would be 99px wide in the 480px rail, narrower than a child's name; a
 *    210x102 horizontal cell fits the name at full size. The panel's own
 *    geometry (flex-1, 36px radius, 22/24 padding) is unchanged.
 *  - Category icons are hand-drawn in the source's language (pastel fill,
 *    1.6px #2A2140 outline) rather than taken from BOARD_CATEGORIES.icon.
 *    The lucide icons are thin single-weight strokes; at 40px beside these
 *    they read as a different board. The fourth glyph, an "Aa" card for
 *    Vocabulary, is new — a sparkle would have been confused with the star
 *    that already means "All" and with the point star used throughout.
 *  - avatarUrl is deliberately unused. The design is built on a coloured
 *    disc plus a white initial, and `initial` and `color` are guaranteed
 *    present and stable per student; a remote photo that failed to load
 *    would leave a blank disc on a projector at the front of a classroom.
 *  - Empty podium slots keep the source's own treatment: a plain white 120px
 *    step and a white disc, with no rank numeral, no level badge and no name
 *    plate. The step still renders, so the podium never collapses to two.
 *  - The entrance plays on mount as well as on Reveal. StyledClassBoard
 *    already remounts this component on revealKey, and a board that arrives
 *    on a projector mid-animation is the point of the style; revealKey is
 *    also applied to a local key so the replay works for any caller.
 *  - The score count-up is the one piece of JavaScript animation. It owns a
 *    requestAnimationFrame per podium slot, resets by remount rather than by
 *    watching the key, and schedules nothing when `motion` is false.
 *  - The h1 is capped at 430px and ellipsised. The champion's crown sits 74px
 *    above a 208px avatar, which puts its top ~26px into the header band; at
 *    430px the title pill still stops ~8px short of the crown's column, so a
 *    long class name can never collide with it. The source hardcoded a short
 *    title and so never had to decide this.
 *  - Only the two overflow cards that fit at the drawn 500x140 are rendered;
 *    any remaining students are counted in the strip's label column rather
 *    than clipped mid-card at the edge of the canvas.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BOARD_CATEGORIES, type BoardCategory, type BoardRow, type BoardViewProps } from "./types";

/* ------------------------------------------------------------- the palette */

const BODY_FONT = "'Andika', 'Trebuchet MS', system-ui, sans-serif";
const DISPLAY_FONT = "'Baloo 2', 'Trebuchet MS', sans-serif";

const INK = "#2A2140";
const SKY = "#BDE6FB";
const MUTED = "#5B4F78";
const RING_FILL = "#FF9F1C";
const PODIUM_TRACK = "rgba(255,255,255,0.92)";
const PANEL_TRACK = "#EEF1F6";
const GRASS_INK = "#1B4D28";

/** Step 1 is the tallest and gold. The source's exact three. */
const STEP: Record<number, { h: number; face: string; lip: string; num: string }> = {
  1: { h: 250, face: "#FFC83D", lip: "#D99A00", num: "#8A5A00" },
  2: { h: 190, face: "#C3D6F2", lip: "#8EA6CC", num: "#3F5683" },
  3: { h: 140, face: "#FFAD7A", lip: "#DD7A45", num: "#8A3D12" },
};

/** Soft background per category, for the Champions cells. */
const CAT_TINT: Record<BoardCategory["key"], string> = {
  homework: "#EAF5FF",
  participation: "#FFF5D1",
  reading_theory: "#FFEADD",
  vocabulary_quiz: "#EFE6FF",
};

/**
 * The reveal timeline in milliseconds, keyed by place. Third place rises
 * first and the champion last, so the room watches the podium build upward.
 * From the source: step delays 200 / 1050 / 1950, and a count-up window of
 * 858ms opening at 660 / 1518 / 2442.
 */
const BEAT: Record<number, { step: number; countAt: number }> = {
  3: { step: 200, countAt: 660 },
  2: { step: 1050, countAt: 1518 },
  1: { step: 1950, countAt: 2442 },
};
const COUNT_MS = 858;

/** Only two of the drawn 500px cards fit the strip; the rest are counted. */
const REST_CARDS = 2;

/* ------------------------------------------------------------- small maths */

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** The avatar's level ring. The coloured disc sits on top of it, inset. */
function ringOf(levelPct: number, track: string): string {
  return `conic-gradient(${RING_FILL} ${clampPct(levelPct)}%, ${track} 0)`;
}

/** Side panels get a first name, because their cells are narrow. */
function firstNameOf(name: string): string {
  const t = (name ?? "").trim();
  if (!t) return "?";
  return t.split(/\s+/)[0];
}

/* --------------------------------------------------------- the stylesheet */

const CSS = `
.sb-board button{font:inherit;color:inherit;cursor:pointer;margin:0;border:none}
.sb-board button:focus-visible{outline:4px solid ${INK};outline-offset:6px}
.sb-still .sb-idle,.sb-still .sb-rv,.sb-still .sb-conf{animation:none !important}
@keyframes sb-rise{0%{transform:scaleY(0)}55%{transform:scaleY(1.09)}75%{transform:scaleY(.96)}90%{transform:scaleY(1.02)}100%{transform:scaleY(1)}}
@keyframes sb-drop{0%{opacity:0;transform:translateY(-150px) scale(.5)}55%{opacity:1;transform:translateY(12px) scale(1.06)}78%{transform:translateY(-5px) scale(.98)}100%{opacity:1;transform:none}}
@keyframes sb-up{0%{opacity:0;transform:translateY(26px)}100%{opacity:1;transform:none}}
@keyframes sb-pop{0%{opacity:0;transform:scale(0) rotate(-35deg)}60%{opacity:1;transform:scale(1.22) rotate(6deg)}100%{opacity:1;transform:none}}
@keyframes sb-conf{0%{opacity:0;transform:translate(0,-60px) rotate(0deg)}6%{opacity:1}30%{transform:translate(30px,300px) rotate(260deg)}60%{transform:translate(-26px,680px) rotate(540deg)}88%{opacity:1}100%{opacity:0;transform:translate(12px,1160px) rotate(820deg)}}
@keyframes sb-drift{from{transform:translateX(-340px)}to{transform:translateX(2260px)}}
@keyframes sb-spin{to{transform:rotate(360deg)}}
@keyframes sb-bob{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-12px) rotate(-3deg)}}
@keyframes sb-twinkle{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.7);opacity:.5}}
@media (prefers-reduced-motion: reduce){
.sb-board .sb-idle,.sb-board .sb-rv{animation:none !important}
.sb-board .sb-conf{display:none !important}
}
`;

/* ------------------------------------------------------------------ glyphs */

const STAR_POINTS =
  "12 2.5 14.94 8.46 21.5 9.41 16.75 14.04 17.87 20.58 12 17.5 6.13 20.58 7.25 14.04 2.5 9.41 9.06 8.46 12 2.5";

function Star({
  size,
  fill = "#FFC83D",
  stroke = INK,
  strokeWidth = 1.5,
  style,
}: {
  size: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      <polygon
        points={STAR_POINTS}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * One chunky outlined glyph per category, drawn to match the board rather
 * than imported from the icon set — see the file header.
 */
function CategoryGlyph({ k, size }: { k: BoardCategory["key"]; size: number }) {
  const line = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      {k === "homework" && (
        <>
          <path d="M3 5.5c2.6-1 5.6-1 9 1.2v13c-3.4-2.2-6.4-2.2-9-1.2z" fill="#9FD3FF" {...line} />
          <path d="M21 5.5c-2.6-1-5.6-1-9 1.2v13c3.4-2.2 6.4-2.2 9-1.2z" fill="#9FD3FF" {...line} />
        </>
      )}
      {k === "participation" && (
        <path d="M13.5 2 4.5 13.5h6.5L9.5 22l10-12h-6.5z" fill="#FFE27A" {...line} />
      )}
      {k === "reading_theory" && (
        <path
          d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
          fill="#FFA36B"
          {...line}
        />
      )}
      {k === "vocabulary_quiz" && (
        <>
          <rect x="2.6" y="4.4" width="18.8" height="15.2" rx="3.6" fill="#D9BFFF" {...line} />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontFamily={DISPLAY_FONT}
            fontSize="10"
            fontWeight="800"
            fill={INK}
          >
            Aa
          </text>
        </>
      )}
    </svg>
  );
}

/* --------------------------------------------------------------- count-up */

/**
 * Counts a score up to its real value once, then stops. It resets by being
 * remounted, which is what the reveal key does, so it keeps no key state of
 * its own. With motion off it renders the final number and never schedules
 * a frame.
 *
 * It counts on the entrance only. Picking a filter tab changes every score
 * without remounting the board, and the steps and avatars do not re-animate
 * for that, so a number that crawled up again from zero two seconds later
 * would be the only thing moving. After the first run the value is simply
 * followed.
 */
function CountUp({
  value,
  delay,
  duration,
  motion,
  style,
}: {
  value: number;
  delay: number;
  duration: number;
  motion: boolean;
  style?: CSSProperties;
}) {
  const [shown, setShown] = useState(motion ? 0 : value);
  const counted = useRef(false);

  useEffect(() => {
    if (!motion || counted.current) {
      setShown(value);
      return;
    }
    counted.current = true;
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const x = Math.min(1, Math.max(0, (now - start - delay) / duration));
      setShown(Math.round(value * (1 - Math.pow(1 - x, 3))));
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // requestAnimationFrame does not run while the document is hidden, so a
    // board mounted on a background tab - a projector set up before the
    // lesson, a second monitor, a teacher who opened the tab and switched
    // away - would animate no frames and leave every child showing zero.
    // This timer settles the true number whatever happened to the frames.
    const settle = window.setTimeout(() => setShown(value), delay + duration + 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [value, delay, duration, motion]);

  return <span style={style}>{shown}</span>;
}

/* ------------------------------------------------------------------ decor */

function Cloud({
  w,
  h,
  top,
  opacity,
  dur,
  shift,
  blobs,
}: {
  w: number;
  h: number;
  top: number;
  opacity: number;
  dur: number;
  shift: number;
  blobs: Array<{ left: number; top: number; d: number }>;
}) {
  return (
    <div
      className="sb-idle"
      style={{
        position: "absolute",
        left: 0,
        top,
        opacity,
        animation: `sb-drift ${dur}s linear ${shift}s infinite`,
      }}
    >
      <div style={{ position: "relative", width: w, height: h, borderRadius: 999, background: "#FFFFFF" }}>
        {blobs.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.left,
              top: b.top,
              width: b.d,
              height: b.d,
              borderRadius: "50%",
              background: "#FFFFFF",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Decor() {
  const twinkle: CSSProperties = { position: "absolute" };
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Sun rays: one turn every 140 seconds, slow enough to read as light. */}
      <div
        className="sb-idle"
        style={{
          position: "absolute",
          left: 150,
          top: -220,
          width: 1100,
          height: 1100,
          borderRadius: "50%",
          background:
            "repeating-conic-gradient(rgba(255,255,255,0.55) 0deg 7deg, rgba(255,255,255,0) 7deg 18deg)",
          maskImage: "radial-gradient(circle, #000 20%, rgba(0,0,0,0) 64%)",
          WebkitMaskImage: "radial-gradient(circle, #000 20%, rgba(0,0,0,0) 64%)",
          animation: "sb-spin 140s linear infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 530,
          top: 160,
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: "#FFE07A",
          boxShadow: "0 0 0 34px rgba(255,224,122,0.4), 0 0 0 78px rgba(255,224,122,0.18)",
        }}
      />
      <Cloud
        w={250}
        h={74}
        top={118}
        opacity={0.92}
        dur={110}
        shift={-38}
        blobs={[
          { left: 38, top: -46, d: 98 },
          { left: 108, top: -70, d: 122 },
        ]}
      />
      <Cloud
        w={190}
        h={56}
        top={330}
        opacity={0.85}
        dur={150}
        shift={-95}
        blobs={[
          { left: 28, top: -36, d: 76 },
          { left: 84, top: -52, d: 92 },
        ]}
      />
      <Cloud
        w={150}
        h={44}
        top={210}
        opacity={0.8}
        dur={180}
        shift={-150}
        blobs={[
          { left: 22, top: -28, d: 60 },
          { left: 66, top: -40, d: 72 },
        ]}
      />
      <Star
        size={34}
        fill="#FFFFFF"
        stroke="none"
        strokeWidth={0}
        style={{ ...twinkle, left: 420, top: 190, animation: "sb-twinkle 2.4s ease-in-out infinite" }}
      />
      <Star
        size={26}
        fill="#FFFFFF"
        stroke="none"
        strokeWidth={0}
        style={{ ...twinkle, left: 1220, top: 220, animation: "sb-twinkle 3s ease-in-out -1s infinite" }}
      />
      <Star
        size={30}
        fill="#FFF6C9"
        stroke="none"
        strokeWidth={0}
        style={{ ...twinkle, left: 930, top: 64, animation: "sb-twinkle 2.7s ease-in-out -0.6s infinite" }}
      />
      {/* Grass: two ellipses, the darker one behind on the right. */}
      <div
        style={{
          position: "absolute",
          left: 1080,
          top: 790,
          width: 1500,
          height: 760,
          borderRadius: "50%",
          background: "#74C455",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -600,
          top: 840,
          width: 2600,
          height: 700,
          borderRadius: "50%",
          background: "#8BD46A",
        }}
      />
    </div>
  );
}

/** Deterministic, so the same reveal looks the same twice. */
function Confetti() {
  const colors = ["#FFC83D", "#E0457B", "#3FA9F5", "#36C28A", "#7C5CE0", "#FF8A3D"];
  const pieces = Array.from({ length: 46 }, (_, j) => {
    const a = (j * 37 + 11) % 100;
    const b = (j * 53 + 7) % 100;
    const c = (j * 71 + 23) % 100;
    return {
      x: a,
      w: 12 + (b % 3) * 5,
      h: 12 + (c % 4) * 5,
      color: colors[j % colors.length],
      radius: j % 3 === 0 ? "50%" : "4px",
      dur: 2400 + c * 18,
      delay: 2550 + b * 9,
    };
  });
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, zIndex: 5, overflow: "hidden", pointerEvents: "none" }}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="sb-conf"
          style={{
            position: "absolute",
            top: -40,
            left: `${p.x}%`,
            width: p.w,
            height: p.h,
            borderRadius: p.radius,
            background: p.color,
            animation: `sb-conf ${p.dur}ms cubic-bezier(.25,.6,.45,1) ${p.delay}ms both`,
          }}
        />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- podium */

/** Every size that differs between the champion's column and the other two. */
function slotMetrics(big: boolean) {
  return big
    ? {
        col: 440,
        avatar: 208,
        inset: 13,
        border: 7,
        initial: 90,
        avatarShadow: "0 12px 0 rgba(42,33,64,0.14)",
        badgeH: 44,
        badgePad: 16,
        badgeRight: -8,
        badgeBottom: 6,
        badgeFont: 22,
        namePad: "6px 32px 8px",
        nameRadius: 26,
        nameFont: 46,
        nickFont: 23,
        starSize: 54,
        pointsFont: 76,
        stepPadTop: 8,
        stepRadius: "44px 44px 26px 26px",
        stepInset: "inset 0 16px 0 rgba(255,255,255,0.4)",
        stepLip: 18,
        rankFont: 180,
        tieRight: 22,
      }
    : {
        col: 380,
        avatar: 168,
        inset: 11,
        border: 6,
        initial: 70,
        avatarShadow: "0 10px 0 rgba(42,33,64,0.14)",
        badgeH: 40,
        badgePad: 14,
        badgeRight: -10,
        badgeBottom: 2,
        badgeFont: 20,
        namePad: "6px 28px 8px",
        nameRadius: 24,
        nameFont: 40,
        nickFont: 21,
        starSize: 44,
        pointsFont: 60,
        stepPadTop: 10,
        stepRadius: "40px 40px 24px 24px",
        stepInset: "inset 0 14px 0 rgba(255,255,255,0.38)",
        stepLip: 16,
        rankFont: 150,
        tieRight: 18,
      };
}

function Crown({ motion }: { motion: boolean }) {
  return (
    <svg
      className="sb-idle"
      width={124}
      height={98}
      viewBox="0 0 24 19"
      aria-hidden="true"
      style={{
        display: "block",
        transformOrigin: "50% 100%",
        animation: motion ? "sb-bob 2.8s ease-in-out infinite" : undefined,
      }}
    >
      <path
        d="M2.2 6.6 7 10.4 12 3.4 17 10.4 21.8 6.6 19.9 16.8H4.1Z"
        fill="#FFC83D"
        stroke={INK}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <path d="M4.6 13.8h14.8" fill="none" stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
      <circle cx="12" cy="2.4" r="1.5" fill="#E0457B" stroke={INK} strokeWidth={0.9} />
      <circle cx="2.2" cy="5.6" r="1.25" fill="#3FA9F5" stroke={INK} strokeWidth={0.9} />
      <circle cx="21.8" cy="5.6" r="1.25" fill="#3FA9F5" stroke={INK} strokeWidth={0.9} />
    </svg>
  );
}

function PodiumSlot({ row, place, motion }: { row?: BoardRow; place: 1 | 2 | 3; motion: boolean }) {
  const m = slotMetrics(place === 1);
  const step = STEP[place];
  const beat = BEAT[place];
  const anim = (name: string, dur: number, delay: number) =>
    motion ? `${name} ${dur}ms ease-out ${delay}ms both` : undefined;

  /* An empty step still renders, so three columns never become two. */
  if (!row) {
    return (
      <div style={{ width: m.col, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: m.avatar,
            height: m.avatar,
            boxSizing: "border-box",
            borderRadius: "50%",
            border: `${m.border}px solid #FFFFFF`,
            background: "rgba(255,255,255,0.55)",
          }}
        />
        <div
          style={{
            marginTop: 34,
            width: "100%",
            height: 120,
            boxSizing: "border-box",
            borderRadius: m.stepRadius,
            background: "#FFFFFF",
            boxShadow: `${m.stepInset}, 0 ${m.stepLip}px 0 #DDDDDD`,
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ width: m.col, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* The outer circle IS the level ring; the coloured disc sits inset on it. */}
      <div
        className="sb-rv"
        style={{
          position: "relative",
          width: m.avatar,
          height: m.avatar,
          borderRadius: "50%",
          background: ringOf(row.levelPct, PODIUM_TRACK),
          boxShadow: m.avatarShadow,
          animation: anim("sb-drop", 720, beat.step + 300),
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: m.inset,
            boxSizing: "border-box",
            borderRadius: "50%",
            border: `${m.border}px solid #FFFFFF`,
            background: row.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: DISPLAY_FONT,
            fontWeight: 800,
            fontSize: m.initial,
            lineHeight: 1,
            color: "#FFFFFF",
          }}
        >
          {row.initial}
        </div>
        <div
          style={{
            position: "absolute",
            right: m.badgeRight,
            bottom: m.badgeBottom,
            height: m.badgeH,
            padding: `0 ${m.badgePad}px`,
            borderRadius: 999,
            background: INK,
            color: "#FFFFFF",
            fontSize: m.badgeFont,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
          }}
        >
          Lv {row.level}
        </div>
        {place === 1 && (
          <div
            className="sb-rv"
            style={{
              position: "absolute",
              left: 42,
              top: -74,
              width: 124,
              height: 98,
              animation: anim("sb-pop", 620, beat.step + 880),
            }}
          >
            <Crown motion={motion} />
          </div>
        )}
      </div>

      <div
        className="sb-rv"
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          maxWidth: "100%",
          animation: anim("sb-up", 520, beat.step + 460),
        }}
      >
        <div
          style={{
            maxWidth: "100%",
            padding: m.namePad,
            borderRadius: m.nameRadius,
            background: "#FFFFFF",
            boxShadow: "0 6px 0 rgba(42,33,64,0.12)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: m.nameFont, fontWeight: 700, lineHeight: 1.15, textAlign: "center" }}>
            {row.shortName || row.name}
          </span>
          {row.nickname ? (
            <span style={{ fontSize: m.nickFont, fontWeight: 700, lineHeight: 1.1, color: MUTED }}>
              {row.nickname}
            </span>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Star size={m.starSize} />
          <CountUp
            value={row.points}
            delay={beat.countAt}
            duration={COUNT_MS}
            motion={motion}
            style={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 800,
              fontSize: m.pointsFont,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </div>
      </div>

      {/* The step: extruded by a hard-offset shadow, lit by an inset one. */}
      <div
        className="sb-rv"
        style={{
          position: "relative",
          marginTop: 18,
          width: "100%",
          height: step.h,
          boxSizing: "border-box",
          paddingTop: m.stepPadTop,
          borderRadius: m.stepRadius,
          background: step.face,
          boxShadow: `${m.stepInset}, 0 ${m.stepLip}px 0 ${step.lip}`,
          display: "flex",
          justifyContent: "center",
          transformOrigin: "50% 100%",
          animation: anim("sb-rise", 820, beat.step),
        }}
      >
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 800,
            fontSize: m.rankFont,
            lineHeight: 1,
            color: step.num,
          }}
        >
          {row.rank}
        </span>
        {row.tied && (
          <span
            style={{
              position: "absolute",
              top: -20,
              right: m.tieRight,
              padding: "4px 20px 6px",
              borderRadius: 999,
              background: "#E0457B",
              boxShadow: "0 5px 0 #A3284F",
              color: "#FFFFFF",
              fontFamily: DISPLAY_FONT,
              fontWeight: 800,
              fontSize: 28,
              lineHeight: 1.1,
              transform: "rotate(8deg)",
            }}
          >
            Tie!
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- side panels */

const PANEL: CSSProperties = {
  boxSizing: "border-box",
  borderRadius: 36,
  background: "#FFFFFF",
  boxShadow: "0 10px 0 rgba(42,33,64,0.14)",
  display: "flex",
  flexDirection: "column",
};

function PanelHead({
  tint,
  ink,
  title,
  children,
}: {
  tint: string;
  ink: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 54,
          height: 54,
          flexShrink: 0,
          borderRadius: "50%",
          background: tint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: ink,
        }}
      >
        {children}
      </div>
      <h2 style={{ margin: 0, fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 36, lineHeight: 1 }}>
        {title}
      </h2>
    </div>
  );
}

/** A coloured disc inside its level ring. Used by every panel and card. */
function Disc({
  size,
  inset,
  border,
  font,
  color,
  initial,
  levelPct,
}: {
  size: number;
  inset: number;
  border: number;
  font: number;
  color: string;
  initial: string;
  levelPct: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        background: ringOf(levelPct, PANEL_TRACK),
      }}
    >
      <div
        style={{
          position: "absolute",
          inset,
          boxSizing: "border-box",
          borderRadius: "50%",
          border: `${border}px solid #FFFFFF`,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: DISPLAY_FONT,
          fontWeight: 800,
          fontSize: font,
          lineHeight: 1,
          color: "#FFFFFF",
        }}
      >
        {initial}
      </div>
    </div>
  );
}

/** Stands in for a person we do not have yet. Never shows a zero. */
function Waiting({ size, big }: { size: number; big: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: big ? 22 : 18 }}>
      <div
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          boxSizing: "border-box",
          borderRadius: "50%",
          border: "5px dashed #DFE4EF",
          background: "#F7F9FC",
        }}
      />
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 800,
            fontSize: big ? 38 : 32,
            lineHeight: 1.1,
            color: "#8C86A6",
          }}
        >
          Nobody yet
        </span>
        <span style={{ fontSize: big ? 22 : 20, fontWeight: 700, color: MUTED }}>Come back soon</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ board */

export function StarBoard({
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
  const active = BOARD_CATEGORIES.find((c) => c.key === activeCategory) ?? null;
  const modeLabel = active ? `${active.short} points` : "All points";

  const first = rows[0];
  const second = rows[1];
  const third = rows[2];
  const rest = rows.slice(3);
  const restShown = rest.slice(0, REST_CARDS);
  const restHidden = rest.length - restShown.length;

  /** Third place's score is the bar every climber is measured against. */
  const podiumMin = third ? third.points : 0;

  /** A panel person's ring comes from their row, when we still have it. */
  const levelPctOf = (studentId: string) => rows.find((r) => r.studentId === studentId)?.levelPct ?? 0;

  /* Without the ledger these two are not unavailable-looking, they are
     simply not known yet, so they show the same quiet placeholder. */
  const climber = extras.ledgerAvailable ? extras.climber : null;
  const streak = extras.ledgerAvailable ? extras.streak : null;
  const championOf = (key: BoardCategory["key"]) => extras.champions.find((c) => c.category.key === key);

  const tabStyle = (on: boolean): CSSProperties => ({
    width: 104,
    height: 100,
    padding: 0,
    borderRadius: 28,
    background: on ? "#FFC83D" : "#FFFFFF",
    boxShadow: `0 8px 0 ${on ? "#D99A00" : "rgba(42,33,64,0.16)"}`,
    transform: `translateY(${on ? -4 : 0}px)`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    color: INK,
    transition: motion ? "transform 160ms ease" : undefined,
  });

  return (
    <div
      className={motion ? "sb-board" : "sb-board sb-still"}
      style={{
        position: "relative",
        width: 1920,
        height: 1080,
        overflow: "hidden",
        boxSizing: "border-box",
        background: SKY,
        fontFamily: BODY_FONT,
        color: INK,
      }}
    >
      <style>{CSS}</style>
      <Decor />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          boxSizing: "border-box",
          padding: "36px 56px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* ----------------------------------------------- header, 104px */}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              minWidth: 0,
              padding: "12px 36px 12px 14px",
              borderRadius: 36,
              background: "#FFFFFF",
              boxShadow: "0 8px 0 rgba(42,33,64,0.14)",
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                flexShrink: 0,
                borderRadius: "50%",
                background: "#FFF1C2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Star size={48} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 800,
                  fontSize: 54,
                  lineHeight: 0.95,
                  color: INK,
                  maxWidth: 430,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "#4E4270",
                  whiteSpace: "nowrap",
                }}
              >
                {periodLabel ? `${periodLabel} · ${modeLabel}` : modeLabel}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* "All", then one tab per category. Four categories, five tabs. */}
            <div style={{ display: "flex", gap: 14 }}>
              <button
                type="button"
                aria-pressed={activeCategory === null}
                onClick={() => onCategoryChange(null)}
                style={tabStyle(activeCategory === null)}
              >
                <Star size={40} fill="#FFFFFF" strokeWidth={1.7} />
                <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>All</span>
              </button>
              {BOARD_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={activeCategory === c.key}
                  onClick={() => onCategoryChange(c.key)}
                  style={tabStyle(activeCategory === c.key)}
                >
                  <CategoryGlyph k={c.key} size={40} />
                  <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{c.short}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onReveal}
              style={{
                height: 100,
                padding: "0 34px 0 20px",
                borderRadius: 28,
                background: "#178A57",
                boxShadow: "0 8px 0 #0D5B38",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true">
                  <polygon
                    points="7 4 20 12 7 20 7 4"
                    fill="#FFFFFF"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 34, lineHeight: 1 }}>
                Reveal
              </span>
            </button>
          </div>
        </header>

        {rows.length === 0 ? (
          /* --------------------------------------------- nobody yet */
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                width: 900,
                boxSizing: "border-box",
                padding: "56px 64px 64px",
                borderRadius: 48,
                background: "#FFFFFF",
                boxShadow: "0 12px 0 rgba(42,33,64,0.14)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 18,
                textAlign: "center",
              }}
            >
              <Star size={150} />
              <h2 style={{ margin: 0, fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 68, lineHeight: 1 }}>
                No stars yet
              </h2>
              <p style={{ margin: 0, fontSize: 34, fontWeight: 700, lineHeight: 1.3, color: MUTED }}>
                Our board is ready. Let us go and get some stars!
              </p>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 40 }}>
            <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* ------------------------------- podium: 2nd, 1st, 3rd */}
              <section
                key={revealKey}
                aria-label="Podium"
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: 28,
                }}
              >
                <PodiumSlot row={second} place={2} motion={motion} />
                <PodiumSlot row={first} place={1} motion={motion} />
                <PodiumSlot row={third} place={3} motion={motion} />
              </section>

              {/* ------------------------------- everyone else, 170px */}
              <section
                aria-label="Everyone else"
                style={{ height: 170, flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}
              >
                <div
                  style={{
                    width: 190,
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    color: GRASS_INK,
                  }}
                >
                  <h2 style={{ margin: 0, fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 40, lineHeight: 1 }}>
                    Climbing up!
                  </h2>
                  <span style={{ fontSize: 21, fontWeight: 700 }}>Everyone else</span>
                  {restHidden > 0 && (
                    <span
                      style={{
                        marginTop: 2,
                        width: "fit-content",
                        padding: "4px 14px",
                        borderRadius: 999,
                        background: "#FFFFFF",
                        fontSize: 20,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      and {restHidden} more
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 20, overflow: "hidden" }}>
                  {restShown.map((s) => (
                    <div
                      key={s.studentId}
                      style={{
                        width: 500,
                        height: 140,
                        flexShrink: 0,
                        boxSizing: "border-box",
                        padding: "16px 26px 16px 16px",
                        borderRadius: 34,
                        background: "#FFFFFF",
                        boxShadow: "0 8px 0 rgba(27,77,40,0.28)",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                      }}
                    >
                      <span
                        style={{
                          width: 54,
                          height: 54,
                          flexShrink: 0,
                          borderRadius: "50%",
                          background: INK,
                          color: "#FFFFFF",
                          fontFamily: DISPLAY_FONT,
                          fontWeight: 800,
                          fontSize: 30,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {s.rank}
                      </span>
                      <Disc
                        size={96}
                        inset={7}
                        border={4}
                        font={42}
                        color={s.color}
                        initial={s.initial}
                        levelPct={s.levelPct}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              minWidth: 0,
                              fontSize: 34,
                              fontWeight: 700,
                              lineHeight: 1.1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.shortName || s.name}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            <Star size={30} strokeWidth={1.6} />
                            <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 38, lineHeight: 1 }}>
                              {s.points}
                            </span>
                          </span>
                        </div>
                        {s.points > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div
                              style={{
                                flex: 1,
                                height: 14,
                                borderRadius: 999,
                                background: "#E3F1DA",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${podiumMin > 0 ? clampPct((s.points / podiumMin) * 100) : 0}%`,
                                  height: "100%",
                                  borderRadius: 999,
                                  background: "#36C28A",
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 20,
                                fontWeight: 700,
                                color: GRASS_INK,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {s.toPodium > 0 ? `${s.toPodium} to the podium` : "Level with the podium"}
                            </span>
                          </div>
                        ) : (
                          <span
                            style={{
                              width: "fit-content",
                              padding: "5px 16px",
                              borderRadius: 999,
                              background: "#FFF1C2",
                              color: "#6B4300",
                              fontSize: 20,
                              fontWeight: 700,
                            }}
                          >
                            Ready, set, go!
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </main>

            {/* --------------------------------------- right rail, 480px */}
            <aside
              aria-label="Spotlights"
              style={{ width: 480, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}
            >
              <section style={{ ...PANEL, height: 300, flexShrink: 0, padding: "24px 28px", gap: 12 }}>
                <PanelHead tint="#DDF5E6" ink="#178A57" title="Big Climber">
                  <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="m8 3 4 8 5-5 5 15H2L8 3z"
                      fill="#9BE3B9"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                  </svg>
                </PanelHead>
                {climber ? (
                  <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 22 }}>
                    <Disc
                      size={132}
                      inset={9}
                      border={5}
                      font={56}
                      color={climber.color}
                      initial={climber.initial}
                      levelPct={levelPctOf(climber.studentId)}
                    />
                    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span
                        style={{
                          fontSize: 38,
                          fontWeight: 700,
                          lineHeight: 1.1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {firstNameOf(climber.name)}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontFamily: DISPLAY_FONT,
                          fontWeight: 800,
                          fontSize: 66,
                          lineHeight: 1,
                          color: "#178A57",
                        }}
                      >
                        <svg width={46} height={46} viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M12 20V5M5 12l7-7 7 7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>{climber.gain}</span>
                      </span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: MUTED }}>this week</span>
                    </div>
                  </div>
                ) : (
                  <Waiting size={132} big />
                )}
              </section>

              <section style={{ ...PANEL, height: 230, flexShrink: 0, padding: "22px 28px", gap: 16 }}>
                <PanelHead tint="#ECE6FF" ink="#5B3FD1" title="Keep it up!">
                  <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true">
                    <rect
                      x="3.5"
                      y="5"
                      width="17"
                      height="15.5"
                      rx="2.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    />
                    <path
                      d="M8 3v4M16 3v4M3.5 10h17"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                    <path
                      d="m9 15 2 2 4-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </PanelHead>
                {streak ? (
                  <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 18 }}>
                    <Disc
                      size={88}
                      inset={7}
                      border={4}
                      font={38}
                      color={streak.color}
                      initial={streak.initial}
                      levelPct={levelPctOf(streak.studentId)}
                    />
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div
                        style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}
                      >
                        <span
                          style={{
                            minWidth: 0,
                            fontSize: 32,
                            fontWeight: 700,
                            lineHeight: 1.1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {firstNameOf(streak.name)}
                        </span>
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#5B3FD1",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {streak.days} in a row
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {Array.from({ length: 10 }, (_, i) => (
                          <span
                            key={i}
                            style={{
                              width: 24,
                              height: 24,
                              flexShrink: 0,
                              borderRadius: "50%",
                              background: i < streak.days ? "#7C5CE0" : "#ECE8F7",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Waiting size={88} big={false} />
                )}
              </section>

              {/* Four champions in a 2x2 grid — see the file header. */}
              <section style={{ ...PANEL, flex: 1, minHeight: 0, padding: "22px 24px", gap: 14 }}>
                <h2
                  style={{
                    margin: "0 4px",
                    fontFamily: DISPLAY_FONT,
                    fontWeight: 800,
                    fontSize: 36,
                    lineHeight: 1,
                  }}
                >
                  Champions
                </h2>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gridTemplateRows: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  {BOARD_CATEGORIES.map((c) => {
                    const champ = championOf(c.key);
                    const on = activeCategory === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        aria-label={`Show ${c.short} points`}
                        aria-pressed={on}
                        onClick={() => onCategoryChange(c.key)}
                        style={{
                          boxSizing: "border-box",
                          minWidth: 0,
                          padding: "8px 10px",
                          border: `4px solid ${on ? INK : "rgba(42,33,64,0)"}`,
                          borderRadius: 26,
                          background: CAT_TINT[c.key],
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          color: INK,
                          textAlign: "left",
                        }}
                      >
                        {champ ? (
                          <span
                            style={{
                              width: 62,
                              height: 62,
                              flexShrink: 0,
                              boxSizing: "border-box",
                              borderRadius: "50%",
                              border: "4px solid #FFFFFF",
                              background: champ.color,
                              color: "#FFFFFF",
                              fontFamily: DISPLAY_FONT,
                              fontWeight: 800,
                              fontSize: 28,
                              lineHeight: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {champ.initial}
                          </span>
                        ) : (
                          <span
                            style={{
                              width: 62,
                              height: 62,
                              flexShrink: 0,
                              boxSizing: "border-box",
                              borderRadius: "50%",
                              border: "4px dashed rgba(42,33,64,0.2)",
                              background: "rgba(255,255,255,0.65)",
                            }}
                          />
                        )}
                        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                          <span
                            style={{
                              fontSize: 22,
                              fontWeight: 700,
                              lineHeight: 1.1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: champ ? INK : "#6B6385",
                            }}
                          >
                            {champ ? firstNameOf(champ.name) : "Nobody yet"}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <CategoryGlyph k={c.key} size={24} />
                            {champ ? (
                              <span
                                style={{
                                  fontFamily: DISPLAY_FONT,
                                  fontWeight: 800,
                                  fontSize: 30,
                                  lineHeight: 1,
                                }}
                              >
                                {champ.points}
                              </span>
                            ) : (
                              <span style={{ fontSize: 20, fontWeight: 700, color: "#6B6385" }}>{c.short}</span>
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>

      {motion && rows.length > 0 && <Confetti key={revealKey} />}
    </div>
  );
}
