import { dayjs, nowBangkok } from "@/lib/date";
import { getSessionDisplayStatus, type SessionStatus } from "@/lib/sessionStatus";
import { getDurationVariance } from "@/lib/sessionDuration";

export interface CalendarEvent {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  class_name: string;
  status: SessionStatus;
  enrolled_count?: number;
  notes?: string;
  teacher_name?: string;
  /** Drives the per-class colour; falls back to the name if absent. */
  class_id?: string;
  /**
   * What this session SHOULD run for, resolved from the class's weekly slot
   * for this day of week (see lib/classSchedule). NOT the per-class default,
   * which cannot describe a class that runs 2h on Wednesday and 90m on
   * Saturday — most of them do.
   */
  expected_duration_minutes?: number | null;
  /**
   * Every length this class schedules. A session matching one of these is
   * never flagged, even on a day whose slot is a different length: a 90m
   * make-up moved onto the 2h Wednesday is a reschedule, not an error.
   */
  accepted_lengths?: number[];
}

/** Non-null only when the session runs a length its class never schedules. */
export const eventVariance = (event: CalendarEvent) => {
  const variance = getDurationVariance(
    event.start_time,
    event.end_time,
    event.expected_duration_minutes,
  );
  if (!variance) return null;
  if (event.accepted_lengths?.includes(variance.actualMinutes)) return null;
  return variance;
};

export const colorKeyFor = (event: CalendarEvent) => event.class_id || event.class_name;

export type StatusKey =
  | "scheduled"
  | "today"
  | "needsAttention"
  | "held"
  | "canceled"
  | "holiday";

/**
 * ONE LOUD STATE.
 *
 * The previous calendar gave all six statuses equal weight: six tinted fills,
 * six emoji, and a pulsing animation on every card that never stopped. Thirty
 * sessions on screen meant thirty competing signals and thirty perpetual
 * animations, so nothing stood out and the whole grid read as noise.
 *
 * Only one state actually requires the admin to DO something: a session whose
 * time has passed while it is still marked Scheduled, i.e. attendance was
 * never taken. That one is amber and surfaced in the header. Everything else
 * is a quiet 3px rail that identifies without shouting.
 */
export interface StatusMeta {
  label: string;
  /** Solid colour for the 3px identifying rail on a chip or block. */
  rail: string;
  /** Faint tint for the block body in the time grid. */
  tint: string;
  border: string;
  text: string;
  /** Small solid dot, for legends and dense rows. */
  dot: string;
  /** True for the one state that needs the admin to act. */
  actionable?: boolean;
}

export const STATUS_META: Record<StatusKey, StatusMeta> = {
  scheduled: {
    label: "Scheduled",
    rail: "bg-success",
    tint: "bg-success/5 dark:bg-success/10",
    border: "border-success/25",
    text: "text-foreground",
    dot: "bg-success",
  },
  today: {
    label: "Today",
    rail: "bg-primary",
    tint: "bg-primary/5 dark:bg-primary/10",
    border: "border-primary/30",
    text: "text-foreground",
    dot: "bg-primary",
  },
  needsAttention: {
    label: "Needs attendance",
    rail: "bg-warning",
    tint: "bg-warning/10 dark:bg-warning/15",
    border: "border-warning/40",
    text: "text-foreground",
    dot: "bg-warning",
    actionable: true,
  },
  held: {
    label: "Held",
    rail: "bg-muted-foreground/40",
    tint: "bg-muted/40 dark:bg-muted/25",
    border: "border-border/60",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
  canceled: {
    label: "Canceled",
    rail: "bg-destructive",
    tint: "bg-destructive/5 dark:bg-destructive/10",
    border: "border-destructive/25",
    text: "text-muted-foreground line-through decoration-destructive/50",
    dot: "bg-destructive",
  },
  holiday: {
    label: "Holiday",
    rail: "bg-accent",
    tint: "bg-accent/10 dark:bg-accent/15",
    border: "border-accent/30",
    text: "text-muted-foreground",
    dot: "bg-accent",
  },
};

export function getStatusKey(event: CalendarEvent): StatusKey {
  const displayStatus = getSessionDisplayStatus({
    date: event.date,
    start_time: event.start_time,
    status: event.status,
  });

  if (displayStatus === "Canceled") return "canceled";
  if (displayStatus === "Holiday") return "holiday";
  if (displayStatus === "Held") return "held";

  const isToday = dayjs(event.date).isSame(nowBangkok(), "day");
  const hasStarted = dayjs(`${event.date}T${event.start_time}`).isBefore(nowBangkok());

  // Started but never marked Held -> attendance is outstanding.
  if (hasStarted) return "needsAttention";
  if (isToday) return "today";
  return "scheduled";
}

export const isActionable = (event: CalendarEvent) =>
  STATUS_META[getStatusKey(event)].actionable === true;

/* ------------------------------------------------------------- time maths */

/** "17:30:00" or "17:30" -> minutes past midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m || 0);
}

export const formatTime = (time: string) => time.slice(0, 5);

/**
 * The visible time window for the grid, derived from the data rather than
 * fixed at 00:00-24:00.
 *
 * This school teaches between roughly 16:00 and 21:00, so a full day axis
 * would be 48 rows of which 10 carry anything. Deriving it means the grid is
 * dense with signal instead of mostly empty, and it still adapts if a morning
 * class is ever added.
 */
export function deriveTimeWindow(events: CalendarEvent[]): { startMin: number; endMin: number } {
  if (events.length === 0) return { startMin: 8 * 60, endMin: 20 * 60 };

  let min = Infinity;
  let max = -Infinity;
  for (const e of events) {
    min = Math.min(min, toMinutes(e.start_time));
    max = Math.max(max, toMinutes(e.end_time || e.start_time));
  }

  // Round out to whole hours and pad, so blocks never touch the edges.
  const startMin = Math.max(0, Math.floor(min / 60) * 60 - 60);
  const endMin = Math.min(24 * 60, Math.ceil(max / 60) * 60 + 60);

  // Always show a usable span even if everything sits in one hour.
  if (endMin - startMin < 4 * 60) {
    return { startMin, endMin: Math.min(24 * 60, startMin + 4 * 60) };
  }
  return { startMin, endMin };
}

export interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  /** Percentage, for side-by-side overlapping sessions. */
  leftPct: number;
  widthPct: number;
}

/**
 * Lay a day's events out on the time axis, placing overlapping sessions
 * side by side instead of on top of each other.
 *
 * Two classes starting at 17:30 is normal here, and the old list-based view
 * simply stacked them so you could not see they clashed.
 */
export function layoutDay(
  events: CalendarEvent[],
  windowStartMin: number,
  pxPerMin: number,
  minHeight = 28,
): PositionedEvent[] {
  const sorted = [...events].sort(
    (a, b) => toMinutes(a.start_time) - toMinutes(b.start_time),
  );

  // Group into clusters of mutually overlapping events.
  const clusters: CalendarEvent[][] = [];
  let current: CalendarEvent[] = [];
  let clusterEnd = -Infinity;

  for (const e of sorted) {
    const start = toMinutes(e.start_time);
    const end = Math.max(toMinutes(e.end_time || e.start_time), start + 30);
    if (current.length > 0 && start < clusterEnd) {
      current.push(e);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      if (current.length) clusters.push(current);
      current = [e];
      clusterEnd = end;
    }
  }
  if (current.length) clusters.push(current);

  const out: PositionedEvent[] = [];
  for (const cluster of clusters) {
    // Greedy column packing within the cluster.
    const columnEnds: number[] = [];
    const columnOf = new Map<string, number>();

    for (const e of cluster) {
      const start = toMinutes(e.start_time);
      const end = Math.max(toMinutes(e.end_time || e.start_time), start + 30);
      let col = columnEnds.findIndex((endMin) => endMin <= start);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(end);
      } else {
        columnEnds[col] = end;
      }
      columnOf.set(e.id, col);
    }

    const cols = Math.max(1, columnEnds.length);
    for (const e of cluster) {
      const start = toMinutes(e.start_time);
      const end = Math.max(toMinutes(e.end_time || e.start_time), start + 30);
      const col = columnOf.get(e.id) ?? 0;
      out.push({
        event: e,
        top: (start - windowStartMin) * pxPerMin,
        height: Math.max(minHeight, (end - start) * pxPerMin),
        leftPct: (col / cols) * 100,
        widthPct: 100 / cols,
      });
    }
  }

  return out;
}
