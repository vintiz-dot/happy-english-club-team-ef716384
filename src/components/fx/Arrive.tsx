/**
 * Arrive - the assembly of a page in reading order, once a day per person
 * (design brief B5 and C1, DESIGN_SYSTEM s.9b). Built on `entrance()` from
 * student/nova/ivory.ts: opacity and an 8 px rise, 240 ms.
 *
 * - First arrival of the day (per signed-in user, per device, per `scope`):
 *   <ArriveItem index={n}> children enter in reading order. Every later visit
 *   that day renders instantly, with nothing to wait for.
 * - The whole group stays inside 320 ms (`stagger()`): with 240 ms entrances
 *   the last item starts at most 80 ms late.
 * - Motion level "calm" drops the stagger (everything enters together);
 *   "off" has no entrance at all. Content is usable at the first frame: an
 *   entrance never sets `pointer-events: none`.
 *
 * `useFirstArrival(scope, userId)` is exported for anything else that should
 * play only on the day's first arrival (a count-up, a bar that grows once).
 * The record is the date and the scope in localStorage; no name is stored.
 */
import { createContext, useContext, useEffect, useState, type ComponentProps } from "react";
import { motion } from "framer-motion";
import { entrance } from "@/components/student/nova/ivory";
import { stagger, useMotionLevel } from "./motion";

const arrivalKey = (userId: string | null | undefined, scope: string) => `hec-arrived:${userId || "signed-out"}:${scope}`;

/** Today's date on the Hanoi clock, "YYYY-MM-DD". */
function hanoiDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function readArrival(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * True on the first mount of `scope` each Hanoi day for this person, and
 * stays true for that mount (so a re-render does not cut an entrance short).
 * With no usable storage it is false: no entrance rather than one on every visit.
 */
export function useFirstArrival(scope: string, userId: string | null | undefined): boolean {
  const key = arrivalKey(userId, scope);
  const [first] = useState(() => {
    try {
      window.localStorage.setItem("hec-arrival-probe", "1");
      window.localStorage.removeItem("hec-arrival-probe");
    } catch {
      return false;
    }
    return readArrival(key) !== hanoiDay();
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, hanoiDay());
    } catch {
      /* storage blocked: first stays as decided */
    }
  }, [key]);
  return first;
}

const ArriveContext = createContext<boolean>(false);

export function Arrive({
  scope,
  userId,
  children,
  ...rest
}: { scope: string; userId: string | null | undefined } & ComponentProps<"div">) {
  const first = useFirstArrival(scope, userId);
  return (
    <ArriveContext.Provider value={first}>
      <div {...rest}>{children}</div>
    </ArriveContext.Provider>
  );
}

/** True inside <Arrive> when this is the day's first arrival, for anything that should play only then (a count-up, a bar that grows once). */
export const useIsFirstArrival = () => useContext(ArriveContext);

type ArriveItemProps = { index?: number } & Omit<ComponentProps<typeof motion.div>, "initial" | "animate" | "transition">;

export function ArriveItem({ index = 0, children, ...rest }: ArriveItemProps) {
  const level = useMotionLevel();
  const active = useIsFirstArrival() && level !== "off";
  const delay = level === "full" ? stagger(index) : 0;
  const rise = entrance(!active, delay);
  // calm = fade only: no rise (the motion level's rule; found in the Phase 7 audit, 23 Nov 2026)
  const enter = active && level === "calm" ? { ...rise, initial: { opacity: 0 }, animate: { opacity: 1 } } : rise;
  return (
    <motion.div {...rest} {...enter}>
      {children}
    </motion.div>
  );
}
