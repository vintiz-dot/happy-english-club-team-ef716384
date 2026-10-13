/**
 * Night League — the display board for the middle years and up.
 *
 * A dark esports-broadcast stage: perspective grid floor, three swaying
 * spotlight beams, metallic plinths with a huge ghosted rank numeral, and —
 * instead of friendly card rows — a real standings table with a column per
 * point bucket. It is deliberately not cute. Thirteen-year-olds read a
 * cartoon board as a board made for little kids and stop looking at it, so
 * everything here is the visual language of a tournament overlay.
 *
 * Rendered inside BoardFrame, which has already applied the scale
 * transform, so this file is true-size 1920x1080 and knows nothing about
 * the viewport. Sizes are literal pixels on purpose; the style block holds
 * only keyframes, every one prefixed "nl-" so two board styles can never
 * collide.
 *
 * Judgement calls a reader would otherwise query:
 *
 *  - FOUR categories, not the three the design was drawn with. The filter
 *    row, the podium chips, the standings table and the rail all iterate
 *    BOARD_CATEGORIES. The table gains one more 84px column, which the
 *    1288px main column absorbs; the tab row gains one tab and still clears
 *    the header's right-hand controls.
 *
 *  - The MOVE column cannot be computed. BoardViewProps carries no previous
 *    ranking, so there is no honest way to print "up two places". The column
 *    stays — it is part of the standings grammar and the strip reads as
 *    broken without it — and shows an up-arrow on exactly one row: the
 *    student in extras.climber, who gained the most points this week.
 *    Everyone else gets a dash. Inventing arrows on a board a whole class
 *    reads is worse than an honest dash.
 *
 *  - No count-up on the scores. The source template drove one from
 *    requestAnimationFrame. Doing that here would re-render the whole
 *    1920x1080 board ~200 times per reveal, on a classroom projector, while
 *    blur, beam and confetti animations run. The scores land with the
 *    plinths instead, via CSS only.
 *
 *  - The strapline is derived, never hardcoded: a month name found in
 *    periodLabel becomes "<MONTH> SEASON · ENDS <last day of that month>".
 *    Anything else ("All points") is shown exactly as given, because an
 *    invented deadline on a real school board is a lie.
 *
 *  - The overflow strip is 170px, which fits its header plus two 60px rows.
 *    When more students sit below the podium, the count goes in the PLAYER
 *    column header rather than the table silently clipping them.
 *
 *  - Short category names (Book / Bolt / Flame / Words) label the tabs and
 *    the table columns, where space is tight and an icon sits beside them;
 *    the rail has room for the real names, so it uses those.
 */
import { useState, type CSSProperties } from "react";
import { Crown, RotateCcw, Star, TrendingUp } from "lucide-react";
import {
  BOARD_CATEGORIES,
  type BoardCategory,
  type BoardRow,
  type BoardViewProps,
} from "./types";

/* ------------------------------------------------------------- palette */

const BASE = "#070A12";
const INK = "#EEF2F8";
const SOFT = "#C9D0DC";
const MUTED = "#9AA3B5";
const DIM = "#8A93A6";

const ACCENT = "#C6FF3D";
const ACCENT_SOFT = "rgba(198,255,61,0.08)";
const ACCENT_LINE = "rgba(198,255,61,0.45)";
const ACCENT_GLOW = "rgba(198,255,61,0.45)";
const ACCENT_ROW = "rgba(198,255,61,0.1)";
const GRID_LINE = "rgba(198,255,61,0.18)";
const FLOOR_GLOW = "rgba(198,255,61,0.16)";

const PANEL_BG = "rgba(255,255,255,0.045)";
const PANEL_LINE = "rgba(255,255,255,0.1)";
const ROW_LINE = "rgba(255,255,255,0.09)";
const EMPTY_METAL = "#3A4256";

const METAL: Record<number, string> = { 1: "#F5C451", 2: "#CBD5E4", 3: "#E39A62" };
const PLINTH_H: Record<number, number> = { 1: 236, 2: 180, 3: 136 };
const EMPTY_PLINTH_H = 100;

const HEAD = "'Saira Condensed', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";
const BODY = "'Chakra Petch', 'Segoe UI', system-ui, sans-serif";

/** Entrance offsets: third place rises first, then second, then first. */
const DELAY = { R: 200, L: 1050, C: 1950 } as const;
type SlotKey = keyof typeof DELAY;

/* ------------------------------------------------------------ keyframes */

const NL_CSS = `
.nl-board button{font:inherit;color:inherit;cursor:pointer;margin:0}
.nl-board button:focus-visible{outline:3px solid #FFFFFF;outline-offset:5px}
.nl-still .nl-idle,.nl-still .nl-rv{animation:none !important}
@keyframes nl-rise{0%{transform:scaleY(0);opacity:.3}100%{transform:scaleY(1);opacity:1}}
@keyframes nl-card{0%{opacity:0;transform:translateY(46px);filter:blur(10px)}100%{opacity:1;transform:none;filter:blur(0)}}
@keyframes nl-pop{0%{opacity:0;transform:translateY(-34px) scale(.5)}100%{opacity:1;transform:none}}
@keyframes nl-sweep{0%{transform:translateX(-120%)}100%{transform:translateX(330%)}}
@keyframes nl-beam{0%{opacity:0}100%{opacity:1}}
@keyframes nl-flare{0%{opacity:0;transform:scale(.3)}30%{opacity:1;transform:scale(1.18)}100%{opacity:.6;transform:scale(1)}}
@keyframes nl-conf{0%{opacity:0;transform:translate(0,-60px) rotate(0deg)}6%{opacity:1}30%{transform:translate(30px,300px) rotate(260deg)}60%{transform:translate(-26px,680px) rotate(540deg)}88%{opacity:1}100%{opacity:0;transform:translate(12px,1160px) rotate(820deg)}}
@keyframes nl-sway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
@keyframes nl-floor{from{background-position:0 0,0 0}to{background-position:0 100px,0 100px}}
@keyframes nl-live{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes nl-hover{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes nl-mote{0%{opacity:0;transform:translateY(0)}20%{opacity:.8}100%{opacity:0;transform:translateY(-420px)}}
@media (prefers-reduced-motion: reduce){
  .nl-board .nl-idle,.nl-board .nl-rv{animation:none !important}
  .nl-board .nl-conf{display:none !important}
}
`;

/* -------------------------------------------------------------- helpers */

function hexA(hex: string, a: number): string {
  let h = String(hex || "").replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return `rgba(198,255,61,${a})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "October 2026" -> "October season · ends 31 Oct". A label with no month in
 * it ("All points") is passed straight through.
 */
function strapline(periodLabel: string): string {
  const label = (periodLabel || "").trim();
  if (!label) return "Season standings";
  const lower = label.toLowerCase();
  const idx = MONTHS.findIndex((m) => lower.includes(m));
  if (idx < 0) return label;
  const matched = label.match(/\b(20\d{2})\b/);
  const year = matched ? Number(matched[1]) : new Date().getFullYear();
  const lastDay = new Date(year, idx + 1, 0).getDate();
  return `${MONTHS[idx]} season · ends ${lastDay} ${MONTH_SHORT[idx]}`;
}

function ordinal(n: number): string {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] || "th"}`;
}

/** The conic ring around an avatar: progress through the current level. */
function levelRing(pct: number, col: string): string {
  const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return `conic-gradient(${col} ${p}%, rgba(255,255,255,0.1) 0)`;
}

/* Decoration is deterministic, so two reveals look identical. */
const MOTES = Array.from({ length: 16 }, (_, q) => {
  const a = (q * 41 + 13) % 100;
  const b = (q * 59 + 29) % 100;
  const c = (q * 23 + 7) % 100;
  return { x: Math.round(120 + a * 11.4), y: 420 + b * 4, s: 3 + (c % 3), d: 6000 + c * 60, delay: -(b * 80) };
});

const CONFETTI_COLORS = [ACCENT, "#F5C451", "#CBD5E4", "#E39A62", "#FFFFFF"];
const CONFETTI = Array.from({ length: 40 }, (_, j) => {
  const a = (j * 37 + 11) % 100;
  const b = (j * 53 + 7) % 100;
  const c = (j * 71 + 23) % 100;
  return {
    x: a,
    w: 6 + (b % 3) * 2,
    h: 18 + (c % 3) * 5,
    color: CONFETTI_COLORS[j % CONFETTI_COLORS.length],
    dur: 2400 + c * 18,
    delay: 2500 + b * 9,
  };
});

/** The two podium builds: the centre plinth, and the two side plinths. */
const GEOM = {
  big: {
    colW: 440, stepW: 400, av: 184, ring1: 7, ring2: 14, initial: 76,
    lv: 16, lvBottom: -13, deltaLeft: -14, deltaTop: 8,
    name: 54, nick: 16, score: 96, meta: 15, metaGap: 6, pointsGap: 14,
    chipGap: 20, chipSize: 20, chipIcon: 19,
    numeral: 190, numeralTop: 6, halo: 60, sweep: 0.24,
    stepShadow: "0 -14px 48px -14px", stepTint: 0.1,
    glowBottom: -18, glowH: 36,
  },
  small: {
    colW: 380, stepW: 340, av: 152, ring1: 6, ring2: 12, initial: 62,
    lv: 15, lvBottom: -12, deltaLeft: -16, deltaTop: 4,
    name: 44, nick: 15, score: 76, meta: 14, metaGap: 5, pointsGap: 12,
    chipGap: 18, chipSize: 19, chipIcon: 18,
    numeral: 140, numeralTop: 8, halo: 44, sweep: 0.22,
    stepShadow: "0 -12px 40px -14px", stepTint: 0.09,
    glowBottom: -16, glowH: 32,
  },
} as const;

type Variant = keyof typeof GEOM;
type Geom = (typeof GEOM)[Variant];

/* ------------------------------------------------------------ the board */

export function NightLeague({
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
  // Streamers are the one thing that should not fire on a quiet page load —
  // they belong to a presenter pressing Reveal in front of the class.
  const [celebrated, setCelebrated] = useState(false);

  const an = (name: string, dur: number, delay: number, curve?: string): string =>
    motion ? `${name} ${dur}ms ${curve || "cubic-bezier(.2,.8,.2,1)"} ${delay}ms both` : "none";
  const loop = (value: string): string => (motion ? value : "none");

  const scoreOf = (row: BoardRow): number =>
    activeCategory ? row.categories[activeCategory] || 0 : row.points;

  const topScore = rows.length ? scoreOf(rows[0]) : 0;
  let runnerUpScore = topScore;
  for (const row of rows) {
    const s = scoreOf(row);
    if (s < topScore) {
      runnerUpScore = s;
      break;
    }
  }

  /** category key -> the student leading it, for the lime highlight. */
  const championOf = new Map<BoardCategory["key"], string>();
  for (const champ of extras.champions || []) {
    championOf.set(champ.category.key, champ.studentId);
  }

  const climber = extras.climber;
  const streak = extras.streak;
  const climberId = climber ? climber.studentId : null;
  const climberRow = climber ? rows.find((r) => r.studentId === climber.studentId) : undefined;
  const streakRow = streak ? rows.find((r) => r.studentId === streak.studentId) : undefined;
  const litBars = streak ? Math.max(0, Math.min(10, streak.days)) : 0;

  const rest = rows.slice(3);
  const visibleRest = rest.slice(0, 2);
  const hiddenRest = rest.length - visibleRest.length;

  /* --------------------------------------------------- shared fragments */

  const avatar = (row: BoardRow, fontSize: number) => (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: row.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: HEAD,
          fontWeight: 800,
          fontSize,
          lineHeight: 1,
          color: "#FFFFFF",
        }}
      >
        {row.initial}
      </div>
      {row.avatarUrl ? (
        <img
          src={row.avatarUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      ) : null}
    </>
  );

  const nameTags = (row: BoardRow, size: number) => {
    const tags: string[] = [];
    if (row.isSelf) tags.push("You");
    if (row.isMonitor) tags.push("Monitor");
    if (!tags.length) return null;
    return (
      <>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              padding: "2px 8px",
              borderRadius: 6,
              border: `1px solid ${tag === "You" ? ACCENT_LINE : "rgba(255,255,255,0.18)"}`,
              color: tag === "You" ? ACCENT : MUTED,
              fontSize: size,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {tag}
          </span>
        ))}
      </>
    );
  };

  const catChips = (row: BoardRow, g: Geom) => (
    <div style={{ marginTop: 10, display: "flex", gap: g.chipGap, fontSize: g.chipSize, fontWeight: 600, lineHeight: 1 }}>
      {BOARD_CATEGORIES.map((cat) => {
        const value = row.categories[cat.key] || 0;
        const leads = championOf.get(cat.key) === row.studentId && value > 0;
        const Icon = cat.icon;
        return (
          <span key={cat.key} title={cat.label} style={{ display: "flex", alignItems: "center", gap: 6, color: leads ? ACCENT : SOFT }}>
            <Icon size={g.chipIcon} strokeWidth={2.2} aria-hidden="true" />
            <span>{value}</span>
          </span>
        );
      })}
    </div>
  );

  /* ---------------------------------------------------------- one slot */

  const renderSlot = (row: BoardRow | undefined, variant: Variant, slot: SlotKey, nominalRank: number) => {
    const g = GEOM[variant];
    const d = DELAY[slot];

    // Fewer than three students: keep the step, lose the person. Dropping
    // the column would make the podium look broken rather than unfinished.
    if (!row) {
      return (
        <div style={{ position: "relative", width: g.colW, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: g.av,
                height: g.av,
                boxSizing: "border-box",
                borderRadius: "50%",
                border: "2px dashed rgba(255,255,255,0.13)",
              }}
            />
            <span
              style={{
                marginTop: 26,
                fontFamily: HEAD,
                fontWeight: 800,
                fontSize: Math.round(g.name * 0.62),
                lineHeight: 1,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(238,242,248,0.28)",
              }}
            >
              Open spot
            </span>
            <span
              style={{
                marginTop: 10,
                fontSize: g.meta,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: DIM,
              }}
            >
              Up for grabs
            </span>
          </div>
          <div
            className="nl-rv"
            style={{
              position: "relative",
              marginTop: 18,
              width: g.stepW,
              height: EMPTY_PLINTH_H,
              boxSizing: "border-box",
              borderTop: `3px solid ${EMPTY_METAL}`,
              borderRadius: "6px 6px 0 0",
              background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
              overflow: "hidden",
              display: "flex",
              justifyContent: "center",
              transformOrigin: "50% 100%",
              animation: an("nl-rise", 900, d),
            }}
          >
            <span
              style={{
                marginTop: g.numeralTop,
                fontFamily: HEAD,
                fontWeight: 900,
                fontSize: Math.round(g.numeral * 0.6),
                lineHeight: 1,
                color: "rgba(255,255,255,0.03)",
                WebkitTextStroke: "2px rgba(255,255,255,0.09)",
              }}
            >
              {nominalRank}
            </span>
          </div>
        </div>
      );
    }

    const rank = Math.max(1, Math.min(3, row.rank));
    const metal = METAL[rank] || EMPTY_METAL;
    const score = scoreOf(row);
    const leadGap = topScore - runnerUpScore;
    const behind = topScore - score;
    const gapText =
      row.rank === 1
        ? row.tied
          ? "Tied 1st"
          : leadGap > 0
            ? `+${leadGap} lead`
            : "First place"
        : behind > 0
          ? `−${behind} to 1st`
          : "Level with 1st";
    const isClimber = climberId === row.studentId;

    return (
      <div style={{ position: "relative", width: g.colW, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          className="nl-rv"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", animation: an("nl-card", 700, d + 380) }}
        >
          <div
            style={{
              position: "relative",
              width: g.av,
              height: g.av,
              borderRadius: "50%",
              background: levelRing(row.levelPct, metal),
              boxShadow: `0 0 ${g.halo}px ${hexA(metal, 0.3)}`,
            }}
          >
            <div style={{ position: "absolute", inset: g.ring1, borderRadius: "50%", background: BASE }} />
            <div style={{ position: "absolute", inset: g.ring2 }}>{avatar(row, g.initial)}</div>
            <span
              style={{
                position: "absolute",
                left: "50%",
                bottom: g.lvBottom,
                transform: "translateX(-50%)",
                padding: "4px 11px",
                borderRadius: 6,
                border: `1px solid ${metal}`,
                background: BASE,
                color: metal,
                fontSize: g.lv,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "0.14em",
                whiteSpace: "nowrap",
              }}
            >
              LV {row.level}
            </span>
            {isClimber && climber ? (
              <span
                title="Points gained this week"
                style={{
                  position: "absolute",
                  left: g.deltaLeft,
                  top: g.deltaTop,
                  height: 30,
                  boxSizing: "border-box",
                  padding: "0 9px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(7,10,18,0.92)",
                  color: ACCENT,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                }}
              >
                <TrendingUp size={14} strokeWidth={2.4} aria-hidden="true" />
                {`+${climber.gain}`}
              </span>
            ) : null}
            {variant === "big" ? (
              <div
                className="nl-rv"
                style={{
                  position: "absolute",
                  left: (g.av - 92) / 2,
                  top: -70,
                  width: 92,
                  height: 72,
                  animation: an("nl-pop", 600, d + 900),
                }}
              >
                <div
                  className="nl-idle"
                  style={{
                    lineHeight: 0,
                    color: "#F5C451",
                    filter: "drop-shadow(0 0 10px rgba(245,196,81,0.8))",
                    animation: loop("nl-hover 3s ease-in-out infinite"),
                  }}
                >
                  <Crown size={92} strokeWidth={1.2} absoluteStrokeWidth fill="rgba(245,196,81,0.18)" aria-hidden="true" />
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span
              style={{
                fontFamily: HEAD,
                fontWeight: 800,
                fontSize: g.name,
                lineHeight: 1,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              {row.shortName || row.name}
            </span>
            {row.nickname || row.isSelf || row.isMonitor ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {row.nickname ? (
                  <span
                    style={{
                      fontSize: g.nick,
                      fontWeight: 600,
                      lineHeight: 1.2,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: MUTED,
                    }}
                  >
                    {row.nickname}
                  </span>
                ) : null}
                {nameTags(row, g.nick - 3)}
              </span>
            ) : null}
          </div>

          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: g.pointsGap }}>
            <span
              style={{
                fontFamily: HEAD,
                fontWeight: 800,
                fontSize: g.score,
                lineHeight: 0.95,
                fontVariantNumeric: "tabular-nums",
                color: "#FFFFFF",
              }}
            >
              {score}
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: g.metaGap,
                fontSize: g.meta,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: MUTED }}>Pts</span>
              <span style={{ color: row.rank === 1 ? ACCENT : MUTED, whiteSpace: "nowrap" }}>{gapText}</span>
            </div>
          </div>

          {catChips(row, g)}
        </div>

        <div
          className="nl-rv"
          style={{
            position: "relative",
            marginTop: 18,
            width: g.stepW,
            height: PLINTH_H[rank] || EMPTY_PLINTH_H,
            boxSizing: "border-box",
            borderTop: `3px solid ${metal}`,
            borderRadius: "6px 6px 0 0",
            background: `linear-gradient(180deg, rgba(255,255,255,${g.stepTint}), rgba(255,255,255,0.015))`,
            boxShadow: `${g.stepShadow} ${metal}, inset 1px 0 0 rgba(255,255,255,0.08), inset -1px 0 0 rgba(255,255,255,0.08)`,
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            transformOrigin: "50% 100%",
            animation: an("nl-rise", 900, d),
          }}
        >
          <span
            style={{
              marginTop: g.numeralTop,
              fontFamily: HEAD,
              fontWeight: 900,
              fontSize: g.numeral,
              lineHeight: 1,
              color: hexA(metal, 0.1),
              WebkitTextStroke: `2px ${hexA(metal, 0.6)}`,
            }}
          >
            {`${row.tied ? "T" : ""}${row.rank}`}
          </span>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "36%",
              background: `linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${g.sweep}) 50%, rgba(255,255,255,0) 100%)`,
              transform: "translateX(-120%)",
              animation: an("nl-sweep", 900, d + 560, "ease-in-out"),
            }}
          />
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            bottom: g.glowBottom,
            height: g.glowH,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, ${hexA(metal, 0.3)}, rgba(0,0,0,0))`,
          }}
        />
      </div>
    );
  };

  /* -------------------------------------------------------- filter tabs */

  const tab = (key: BoardCategory["key"] | null, label: string, Icon: typeof Star) => {
    const on = activeCategory === key;
    return (
      <button
        key={key || "all"}
        type="button"
        aria-pressed={on}
        onClick={() => onCategoryChange(key)}
        style={{
          height: 62,
          padding: "0 22px 0 18px",
          border: "none",
          borderRadius: 11,
          background: on ? ACCENT : "rgba(255,255,255,0)",
          color: on ? "#0A0D06" : SOFT,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          transition: "background 160ms ease, color 160ms ease",
        }}
      >
        <Icon size={22} strokeWidth={2} aria-hidden="true" />
        <span>{label}</span>
      </button>
    );
  };

  /* ---------------------------------------------------- standings table */

  const TH: CSSProperties = {
    padding: 0,
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.4,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: DIM,
    textAlign: "left",
  };
  const TD: CSSProperties = {
    height: 60,
    boxSizing: "border-box",
    padding: 0,
    background: PANEL_BG,
    borderTop: `1px solid ${ROW_LINE}`,
    borderBottom: `1px solid ${ROW_LINE}`,
  };
  const tdFirst = (self: boolean): CSSProperties => ({
    ...TD,
    paddingLeft: 18,
    borderLeft: `1px solid ${self ? ACCENT_LINE : ROW_LINE}`,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  });
  const tdLast: CSSProperties = {
    ...TD,
    paddingRight: 18,
    borderRight: `1px solid ${ROW_LINE}`,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    textAlign: "right",
  };

  /* --------------------------------------------------------- rail parts */

  const panelStyle = (height: number | "fill"): CSSProperties => ({
    ...(height === "fill" ? { flex: 1, minHeight: 0 } : { height, flexShrink: 0 }),
    boxSizing: "border-box",
    padding: "22px 26px",
    borderRadius: 22,
    border: `1px solid ${PANEL_LINE}`,
    background: PANEL_BG,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  });

  const panelHead = (lead: string, trail: string, Icon?: typeof Star) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 15,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10, color: Icon ? ACCENT : INK }}>
        {Icon ? <Icon size={22} strokeWidth={2.2} aria-hidden="true" /> : null}
        <span>{lead}</span>
      </span>
      <span style={{ color: DIM }}>{trail}</span>
    </div>
  );

  /** One quiet line, so a panel with no data never prints 0 or undefined. */
  const quiet = (text: string) => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", fontSize: 19, fontWeight: 600, lineHeight: 1.35, color: MUTED }}>
      {text}
    </div>
  );

  /* ------------------------------------------------------------- render */

  return (
    <div
      className={`nl-board${motion ? "" : " nl-still"}`}
      style={{
        position: "relative",
        width: 1920,
        height: 1080,
        overflow: "hidden",
        background: BASE,
        fontFamily: BODY,
        fontSynthesis: "none",
        color: INK,
      }}
    >
      <style>{NL_CSS}</style>

      {/* ------------------------------------------------------ the stage */}
      <div key={`decor-${revealKey}`} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: -660,
            top: 852,
            width: 2720,
            height: 300,
            transform: "perspective(420px) rotateX(64deg)",
            transformOrigin: "50% 0",
          }}
        >
          <div
            className="nl-idle"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(${GRID_LINE} 2px, rgba(0,0,0,0) 2px), linear-gradient(90deg, ${GRID_LINE} 2px, rgba(0,0,0,0) 2px)`,
              backgroundSize: "100px 100px",
              maskImage: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 55%)",
              WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 55%)",
              animation: loop("nl-floor 4s linear infinite"),
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: 140,
            top: 790,
            width: 1120,
            height: 130,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, ${FLOOR_GLOW}, rgba(0,0,0,0))`,
          }}
        />

        <div className="nl-rv" style={{ position: "absolute", left: 2, top: -80, width: 520, height: 940, animation: an("nl-beam", 600, DELAY.L, "ease-out") }}>
          <div
            className="nl-idle"
            style={{
              position: "absolute",
              inset: 0,
              clipPath: "polygon(46% 0, 54% 0, 100% 100%, 0 100%)",
              background: "linear-gradient(180deg, rgba(203,213,228,0.2) 0%, rgba(203,213,228,0.05) 70%, rgba(203,213,228,0) 100%)",
              transformOrigin: "50% 0",
              animation: loop("nl-sway 11s ease-in-out -3s infinite"),
            }}
          />
        </div>
        <div className="nl-rv" style={{ position: "absolute", left: 878, top: -80, width: 520, height: 940, animation: an("nl-beam", 600, DELAY.R, "ease-out") }}>
          <div
            className="nl-idle"
            style={{
              position: "absolute",
              inset: 0,
              clipPath: "polygon(46% 0, 54% 0, 100% 100%, 0 100%)",
              background: "linear-gradient(180deg, rgba(203,213,228,0.2) 0%, rgba(203,213,228,0.05) 70%, rgba(203,213,228,0) 100%)",
              transformOrigin: "50% 0",
              animation: loop("nl-sway 13s ease-in-out -7s infinite"),
            }}
          />
        </div>
        <div className="nl-rv" style={{ position: "absolute", left: 400, top: -80, width: 600, height: 940, animation: an("nl-beam", 700, DELAY.C, "ease-out") }}>
          <div
            className="nl-idle"
            style={{
              position: "absolute",
              inset: 0,
              clipPath: "polygon(46% 0, 54% 0, 100% 100%, 0 100%)",
              background: "linear-gradient(180deg, rgba(245,196,81,0.3) 0%, rgba(245,196,81,0.07) 70%, rgba(245,196,81,0) 100%)",
              transformOrigin: "50% 0",
              animation: loop("nl-sway 9s ease-in-out infinite"),
            }}
          />
        </div>

        <div
          className="nl-rv"
          style={{
            position: "absolute",
            left: 490,
            top: 62,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(245,196,81,0.34), rgba(245,196,81,0))",
            opacity: 0.6,
            animation: an("nl-flare", 1400, DELAY.C + 600, "ease-out"),
          }}
        />

        {MOTES.map((m, i) => (
          <span
            key={i}
            className="nl-idle"
            style={{
              position: "absolute",
              left: m.x,
              top: m.y,
              width: m.s,
              height: m.s,
              borderRadius: "50%",
              background: "#FFFFFF",
              opacity: 0.4,
              animation: loop(`nl-mote ${m.d}ms linear ${m.delay}ms infinite`),
            }}
          />
        ))}
      </div>

      {/* --------------------------------------------------------- content */}
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
        <header style={{ height: 104, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 17,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${ACCENT_LINE}`,
                  color: ACCENT,
                }}
              >
                <span
                  className="nl-idle"
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: ACCENT,
                    boxShadow: `0 0 12px ${ACCENT}`,
                    animation: loop("nl-live 1.6s ease-in-out infinite"),
                  }}
                />
                <span>Live</span>
              </span>
              <span style={{ color: MUTED }}>{strapline(periodLabel)}</span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: HEAD,
                  fontWeight: 800,
                  fontSize: 78,
                  lineHeight: 0.86,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  color: "#F4F6FA",
                }}
              >
                Leaderboard
              </h1>
              {title ? (
                <span
                  style={{
                    fontFamily: HEAD,
                    fontWeight: 700,
                    fontSize: 30,
                    lineHeight: 1,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: MUTED,
                    whiteSpace: "nowrap",
                  }}
                >
                  {title}
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                display: "flex",
                gap: 6,
                padding: 6,
                borderRadius: 16,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {tab(null, "All", Star)}
              {BOARD_CATEGORIES.map((cat) => tab(cat.key, cat.short, cat.icon))}
            </div>
            <button
              type="button"
              onClick={() => {
                setCelebrated(true);
                onReveal();
              }}
              style={{
                height: 76,
                padding: "0 26px 0 20px",
                border: `2px solid ${ACCENT}`,
                borderRadius: 16,
                background: ACCENT_SOFT,
                color: ACCENT,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              <RotateCcw size={24} strokeWidth={2.2} aria-hidden="true" />
              <span>Reveal</span>
            </button>
          </div>
        </header>

        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 40 }}>
          <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            {rows.length === 0 ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div
                  style={{
                    width: 780,
                    boxSizing: "border-box",
                    padding: "48px 56px",
                    borderRadius: 22,
                    border: `1px solid ${PANEL_LINE}`,
                    background: PANEL_BG,
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 62, lineHeight: 1, letterSpacing: "0.03em", textTransform: "uppercase" }}>
                    No points yet
                  </div>
                  <div style={{ marginTop: 18, fontSize: 24, fontWeight: 600, lineHeight: 1.4, color: MUTED }}>
                    The season is open. The first three to earn points take the stage.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <section
                  key={`podium-${revealKey}`}
                  aria-label="Podium"
                  style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 28 }}
                >
                  {renderSlot(rows[1], "small", "L", 2)}
                  {renderSlot(rows[0], "big", "C", 1)}
                  {renderSlot(rows[2], "small", "R", 3)}
                </section>

                <section aria-label="Standings" style={{ height: 170, flexShrink: 0, overflow: "hidden" }}>
                  <table
                    aria-label="Students below the podium"
                    style={{ width: "100%", marginTop: -8, borderCollapse: "separate", borderSpacing: "0 8px", tableLayout: "fixed" }}
                  >
                    <colgroup>
                      <col style={{ width: 76 }} />
                      <col style={{ width: 72 }} />
                      <col />
                      <col style={{ width: 72 }} />
                      {BOARD_CATEGORIES.map((cat) => (
                        <col key={cat.key} style={{ width: 84 }} />
                      ))}
                      <col style={{ width: 120 }} />
                      <col style={{ width: 220 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col" style={{ ...TH, paddingLeft: 19 }}>Rank</th>
                        <th scope="col" style={TH}>Move</th>
                        <th scope="col" style={TH}>
                          Player
                          {hiddenRest > 0 ? <span style={{ color: "rgba(138,147,166,0.72)" }}>{` · +${hiddenRest} more`}</span> : null}
                        </th>
                        <th scope="col" style={TH}>Lv</th>
                        {BOARD_CATEGORIES.map((cat) => (
                          <th key={cat.key} scope="col" style={TH} title={cat.label}>
                            {cat.short}
                          </th>
                        ))}
                        <th scope="col" style={{ ...TH, textAlign: "right" }}>Pts</th>
                        <th scope="col" style={{ ...TH, textAlign: "right", paddingRight: 19 }}>Next</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRest.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6 + BOARD_CATEGORIES.length}
                            style={{
                              ...tdFirst(false),
                              paddingRight: 18,
                              borderRight: `1px solid ${ROW_LINE}`,
                              borderTopRightRadius: 12,
                              borderBottomRightRadius: 12,
                              fontSize: 19,
                              fontWeight: 600,
                              color: MUTED,
                            }}
                          >
                            Everyone with points is on the podium.
                          </td>
                        </tr>
                      ) : (
                        visibleRest.map((row) => {
                          const score = scoreOf(row);
                          const nextText =
                            score <= 0
                              ? "Ready to start"
                              : row.toPodium > 0
                                ? `${row.toPodium} to podium`
                                : "Level with podium";
                          const isClimber = climberId === row.studentId;
                          return (
                            <tr key={row.studentId}>
                              <td style={tdFirst(!!row.isSelf)}>
                                <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 32, lineHeight: 1 }}>
                                  {`${row.tied ? "T" : ""}${row.rank}`}
                                </span>
                              </td>
                              <td style={TD}>
                                {isClimber ? (
                                  <span title="Biggest gain this week" style={{ display: "flex", alignItems: "center", gap: 6, color: ACCENT }}>
                                    <TrendingUp size={20} strokeWidth={2.4} aria-hidden="true" />
                                    <span style={{ fontSize: 15, fontWeight: 700 }}>Up</span>
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 16, fontWeight: 700, color: MUTED }}>{"—"}</span>
                                )}
                              </td>
                              <td style={TD}>
                                <span style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 14 }}>
                                  <span
                                    style={{
                                      position: "relative",
                                      width: 40,
                                      height: 40,
                                      flexShrink: 0,
                                      borderRadius: "50%",
                                      boxShadow: `0 0 0 2px ${BASE}, 0 0 0 4px rgba(255,255,255,0.22)`,
                                    }}
                                  >
                                    {avatar(row, 20)}
                                  </span>
                                  <span
                                    style={{
                                      minWidth: 0,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      fontFamily: HEAD,
                                      fontWeight: 700,
                                      fontSize: 30,
                                      lineHeight: 1.1,
                                      letterSpacing: "0.03em",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {row.shortName || row.name}
                                  </span>
                                  {nameTags(row, 12)}
                                </span>
                              </td>
                              <td style={TD}>
                                <span style={{ fontSize: 18, fontWeight: 700, color: SOFT }}>{row.level}</span>
                              </td>
                              {BOARD_CATEGORIES.map((cat) => {
                                const value = row.categories[cat.key] || 0;
                                const leads = championOf.get(cat.key) === row.studentId && value > 0;
                                return (
                                  <td key={cat.key} style={TD}>
                                    <span style={{ fontSize: 20, fontWeight: 600, color: leads ? ACCENT : SOFT }}>{value}</span>
                                  </td>
                                );
                              })}
                              <td style={{ ...TD, textAlign: "right" }}>
                                <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                                  {score}
                                </span>
                              </td>
                              <td style={tdLast}>
                                <span
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    whiteSpace: "nowrap",
                                    color: score <= 0 ? ACCENT : MUTED,
                                  }}
                                >
                                  {nextText}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </main>

          <aside aria-label="Spotlights" style={{ width: 480, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <section style={panelStyle(300)}>
              {panelHead("Breakout", "Most improved", TrendingUp)}
              {climber ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 22 }}>
                  <div
                    style={{
                      position: "relative",
                      width: 112,
                      height: 112,
                      flexShrink: 0,
                      borderRadius: "50%",
                      background: levelRing(climberRow ? climberRow.levelPct : 0, ACCENT),
                      boxShadow: `0 0 40px ${ACCENT_GLOW}`,
                    }}
                  >
                    <div style={{ position: "absolute", inset: 5, borderRadius: "50%", background: BASE }} />
                    <div
                      style={{
                        position: "absolute",
                        inset: 10,
                        borderRadius: "50%",
                        background: climber.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: HEAD,
                        fontWeight: 800,
                        fontSize: 46,
                        lineHeight: 1,
                        color: "#FFFFFF",
                      }}
                    >
                      {climber.initial}
                    </div>
                  </div>
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span
                      style={{
                        fontFamily: HEAD,
                        fontWeight: 800,
                        fontSize: 40,
                        lineHeight: 1,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {climber.name}
                    </span>
                    <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 92, lineHeight: 0.88, color: ACCENT, textShadow: `0 0 30px ${ACCENT_GLOW}` }}>
                      {`+${climber.gain}`}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED }}>
                      Pts this week
                    </span>
                    {climberRow ? (
                      <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, letterSpacing: "0.18em", textTransform: "uppercase", color: ACCENT }}>
                        {`Now ${ordinal(climberRow.rank)} overall`}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                quiet(
                  extras.ledgerAvailable
                    ? "No big jumps this week yet. Earn points and this spot is yours."
                    : "This week's points are still loading.",
                )
              )}
            </section>

            <section style={panelStyle(220)}>
              {panelHead("Hot streak", "Longest run", Crown)}
              {streak ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 18 }}>
                  <div
                    style={{
                      position: "relative",
                      width: 76,
                      height: 76,
                      flexShrink: 0,
                      borderRadius: "50%",
                      background: levelRing(streakRow ? streakRow.levelPct : 100, ACCENT),
                    }}
                  >
                    <div style={{ position: "absolute", inset: 4, borderRadius: "50%", background: BASE }} />
                    <div
                      style={{
                        position: "absolute",
                        inset: 8,
                        borderRadius: "50%",
                        background: streak.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: HEAD,
                        fontWeight: 800,
                        fontSize: 30,
                        lineHeight: 1,
                        color: "#FFFFFF",
                      }}
                    >
                      {streak.initial}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                      <span
                        style={{
                          fontFamily: HEAD,
                          fontWeight: 800,
                          fontSize: 34,
                          lineHeight: 1,
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {streak.name}
                      </span>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 48, lineHeight: 1, color: ACCENT }}>{streak.days}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED }}>
                          days in a row
                        </span>
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {Array.from({ length: 10 }, (_, i) => {
                        const on = i < litBars;
                        return (
                          <span
                            key={i}
                            style={{
                              width: 22,
                              height: 28,
                              flexShrink: 0,
                              borderRadius: 4,
                              background: on ? ACCENT : "rgba(255,255,255,0.1)",
                              boxShadow: on ? `0 0 12px ${hexA(ACCENT, 0.45)}` : "none",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                quiet(
                  extras.ledgerAvailable
                    ? "No run going yet. Earn points two days in a row to start one."
                    : "Daily history is still loading.",
                )
              )}
            </section>

            <section style={panelStyle("fill")}>
              {panelHead("Category leaders", "This season")}
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {BOARD_CATEGORIES.map((cat) => {
                  const champ = (extras.champions || []).find((c) => c.category.key === cat.key);
                  const on = activeCategory === cat.key;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      aria-pressed={on}
                      aria-label={`Show ${cat.label} standings`}
                      onClick={() => onCategoryChange(on ? null : cat.key)}
                      style={{
                        flex: 1,
                        minHeight: 0,
                        boxSizing: "border-box",
                        padding: "0 18px 0 12px",
                        border: `1px solid ${on ? hexA(ACCENT, 0.6) : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 14,
                        background: on ? ACCENT_ROW : "rgba(255,255,255,0.03)",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        color: INK,
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 46,
                          height: 46,
                          flexShrink: 0,
                          boxSizing: "border-box",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.14)",
                          color: on ? ACCENT : SOFT,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={24} strokeWidth={2} aria-hidden="true" />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1, letterSpacing: "0.2em", textTransform: "uppercase", color: DIM }}>
                          {cat.label}
                        </span>
                        <span
                          style={{
                            fontFamily: HEAD,
                            fontWeight: 700,
                            fontSize: 30,
                            lineHeight: 1,
                            letterSpacing: "0.03em",
                            textTransform: "uppercase",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: champ ? INK : MUTED,
                          }}
                        >
                          {champ ? champ.name : "No points yet"}
                        </span>
                      </span>
                      <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 38, lineHeight: 1, color: champ ? INK : MUTED }}>
                        {champ ? champ.points : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Streamers, only once a presenter has pressed Reveal. */}
      {motion && celebrated && rows.length > 0 ? (
        <div
          key={`conf-${revealKey}`}
          aria-hidden="true"
          className="nl-conf"
          style={{ position: "absolute", inset: 0, zIndex: 5, overflow: "hidden", pointerEvents: "none" }}
        >
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="nl-conf"
              style={{
                position: "absolute",
                top: -40,
                left: `${c.x}%`,
                width: c.w,
                height: c.h,
                borderRadius: 2,
                background: c.color,
                animation: `nl-conf ${c.dur}ms cubic-bezier(.25,.6,.45,1) ${c.delay}ms both`,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
