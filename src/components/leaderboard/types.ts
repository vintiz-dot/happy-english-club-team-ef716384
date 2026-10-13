/**
 * The contract every class board style renders against.
 *
 * Three new styles arrived as fixed 1920x1080 display boards — Star Board
 * for the youngest classes, High Scores for primary, Night League for the
 * older ones. They are skins over one shape: the same podium, the same
 * overflow strip, the same three side panels. That shape lives here so a
 * style file contains nothing but its own look.
 *
 * Two facts about this school's data drive the design of `BoardRow`:
 *
 *  - There are FOUR point buckets, not three. `student_points` carries
 *    homework, participation, reading_theory AND vocabulary_quiz, and
 *    `total_points` is generated across all four. The old board showed
 *    only the first three while displaying the four-bucket total, so the
 *    pills never added up to the number beside them. `categories` below
 *    is a list rather than three named fields precisely so that cannot
 *    happen again — a style renders what it is given.
 *  - Levels come from a formula, not a table: level n begins at
 *    25·(n−1)·n/2, giving 0, 25, 75, 150, 250, 375, 525, 700. That is
 *    what the existing board uses and what the three designs were drawn
 *    against, so it is shared here rather than reimplemented per style.
 */
import { BookOpen, Flame, SpellCheck, Zap, type LucideIcon } from "lucide-react";

/* ------------------------------------------------------------- the styles */

export const BOARD_STYLES = ["podium", "star", "arcade", "night"] as const;
export type BoardStyle = (typeof BOARD_STYLES)[number];

export const BOARD_STYLE_INFO: Record<
  BoardStyle,
  { name: string; audience: string; blurb: string }
> = {
  podium: {
    name: "Classic",
    audience: "Any age",
    blurb:
      "The warm paper board. Calm, compact, and the only one that works properly on a phone.",
  },
  star: {
    name: "Star Board",
    audience: "Early years",
    blurb:
      "Sky, clouds and a crowned champion on a grassy hill. Big friendly shapes, no small print.",
  },
  arcade: {
    name: "High Scores",
    audience: "Primary years",
    blurb:
      "An arcade cabinet. Bold outlines, a marquee of bulbs and a spinning star behind first place.",
  },
  night: {
    name: "Night League",
    audience: "Middle years and up",
    blurb:
      "A dark broadcast stage with spotlights and a full standings table. Treats them as competitors.",
  },
};

/** What a style is drawn on. The three new ones are display boards. */
export function isDisplayBoard(style: BoardStyle): boolean {
  return style !== "podium";
}

/* ------------------------------------------------------------- the levels */

/**
 * Points to level. Each level costs 25 more than the last, so the first
 * arrive quickly and the curve stretches out. Kept identical to the
 * original board's helper — changing it here would silently relabel every
 * child in the school.
 */
export function levelOf(points: number): { level: number; pct: number; toNext: number } {
  const p = Math.max(0, points);
  const level = Math.floor((-1 + Math.sqrt(1 + (8 * p) / 25)) / 2) + 1;
  const prev = (25 * (level - 1) * level) / 2;
  const next = (25 * level * (level + 1)) / 2;
  const pct = next === prev ? 0 : Math.min(100, Math.max(0, ((p - prev) / (next - prev)) * 100));
  return { level: Math.max(1, level), pct, toNext: Math.max(0, Math.ceil(next - p)) };
}

/* --------------------------------------------------------- the categories */

export interface BoardCategory {
  key: "homework" | "participation" | "reading_theory" | "vocabulary_quiz";
  label: string;
  /** Short enough for a filter tab on a board. */
  short: string;
  icon: LucideIcon;
}

/**
 * All four, in the order the awarding screens list them. The icons match
 * what the old board already used, so a child who learned "the book one
 * is homework" is not re-taught.
 */
export const BOARD_CATEGORIES: BoardCategory[] = [
  { key: "homework", label: "Homework", short: "Book", icon: BookOpen },
  { key: "participation", label: "Participation", short: "Bolt", icon: Zap },
  { key: "reading_theory", label: "Reading", short: "Flame", icon: Flame },
  // Not Sparkles: PodiumBoard already uses that to mark first place, and
  // two meanings for one glyph on the same board is how a child learns
  // the wrong thing.
  { key: "vocabulary_quiz", label: "Vocabulary", short: "Words", icon: SpellCheck },
];

/* --------------------------------------------------------------- the rows */

export interface BoardRow {
  studentId: string;
  name: string;
  /** A shorter name for the podium plate, where space is tight. */
  shortName: string;
  nickname?: string | null;
  initial: string;
  avatarUrl?: string | null;
  rank: number;
  /** True when another student shares this rank. */
  tied: boolean;
  points: number;
  level: number;
  /** Progress through the current level, 0–100, for the avatar ring. */
  levelPct: number;
  /** Per-category points, always all four, in BOARD_CATEGORIES order. */
  categories: Record<BoardCategory["key"], number>;
  /** Points needed to reach third place. 0 when already on the podium. */
  toPodium: number;
  /** Stable colour for this student's avatar, so they stay recognisable. */
  color: string;
  isMonitor?: boolean;
  isSelf?: boolean;
}

/* -------------------------------------------------------- the side panels */

export interface BoardExtras {
  /** Biggest points gain over the last seven days. */
  climber?: { studentId: string; name: string; gain: number; color: string; initial: string } | null;
  /** Longest run of consecutive days earning points. */
  streak?: { studentId: string; name: string; days: number; color: string; initial: string } | null;
  /** Top scorer in each category. Always derivable from the rows. */
  champions: Array<{
    category: BoardCategory;
    studentId: string;
    name: string;
    points: number;
    color: string;
    initial: string;
  }>;
  /** False while the ledger query is still running or was not permitted. */
  ledgerAvailable: boolean;
}

/* --------------------------------------------------------- what a style gets */

export interface BoardViewProps {
  title: string;
  /** e.g. "October 2026" or "All points". */
  periodLabel: string;
  rows: BoardRow[];
  extras: BoardExtras;
  /** Null means "All"; otherwise only this category's points are ranked. */
  activeCategory: BoardCategory["key"] | null;
  onCategoryChange: (key: BoardCategory["key"] | null) => void;
  /** Replays the entrance animation. */
  revealKey: number;
  onReveal: () => void;
  /** False when the viewer prefers reduced motion or motion was turned off. */
  motion: boolean;
}

/* ------------------------------------------------------------- small helpers */

/** A stable colour per student, so the same child is the same colour. */
const PALETTE = [
  "#E0457B", "#7C5CE0", "#3FA9F5", "#36C28A", "#FF8A3D",
  "#2BB8A8", "#C2487B", "#5B7CFA", "#E0A91B", "#8E55C8",
];

export function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** First letter, falling back to something rather than an empty circle. */
export function initialOf(name: string): string {
  const t = name.trim();
  return t ? t[0].toUpperCase() : "?";
}

/**
 * A name that fits a podium plate. Full name if short, else first name
 * plus a surname initial — never a hard truncation mid-word, which on a
 * child's board reads as the board getting their name wrong.
 */
export function shortNameOf(name: string): string {
  const t = name.trim();
  if (t.length <= 14) return t;
  const parts = t.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 13) + "…";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/* ------------------------------------------------- choosing by age */

/** A loose guess from free-text age. Returns null when nothing matches. */
export function recommendedStyle(ageRange?: string | null): BoardStyle | null {
  const t = (ageRange ?? "").toLowerCase().trim();
  if (!t) return null;

  if (/\b(teen|secondary|middle|high|ielts|adult)\b/.test(t)) return "night";
  if (/\b(primary|junior|elementary)\b/.test(t)) return "arcade";
  if (/\b(kinder|nursery|early|starter|pre|infant|toddler)\b/.test(t)) return "star";

  // "6-8", "ages 9 to 11", "12+" — take the first number as the age.
  const n = t.match(/\d+/);
  if (n) {
    const age = Number(n[0]);
    if (age >= 3 && age <= 7) return "star";
    if (age >= 8 && age <= 11) return "arcade";
    if (age >= 12 && age <= 19) return "night";
  }
  return null;
}
