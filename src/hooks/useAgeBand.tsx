/**
 * The age band of the child whose screens these are (docs/EXPERIENCE_DESIGN_BRIEF.md F2, F3).
 *
 * <AgeBandProvider> sits in the student / family branch of the shell. It reads the selected child's date of
 * birth from what the shell and the student home ALREADY loaded (the `shell/students/<user>` cache that
 * ProfileSwitcher fills, and the `student-profile` query of the home): it asks the database for nothing.
 * From it `ageProfile()` gives the band, which is derived here in the browser and never stored or sent.
 *
 * What it sets: `data-hec-band` on its wrapper, and `data-hec-scale="young"` for the young scale, so CSS and the
 * Tailwind `early:` / `junior:` / `teen:` variants follow the child. On a shared login a profile switch changes
 * the band with a 240 ms fade of the whole student area.
 *
 * Banded only on the child's own pages (/student...). The parent's screens, /tuition and /schedule are adult
 * presentation always: there the wrapper carries no band.
 *
 * Look (F3): "Playful" is the child's own band, "Classic" the next band up. Remembered per student id in
 * localStorage; a child can grow into an older look, never be forced into a younger one. The word for a band is
 * never shown to a child.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, skipToken } from "@tanstack/react-query";
import { motion, useAnimationControls } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { shellStudentsKey } from "@/hooks/useShellQueries";
import { ageProfile, type AgeBand, type AgeProfile } from "@/lib/ageBand";
import { dayjs } from "@/lib/date";
import { dur, ease, useMotionLevel } from "@/components/fx/motion";

export type Look = "playful" | "classic";

const NEXT_BAND: Record<AgeBand, AgeBand> = { early: "young", young: "junior", junior: "teen", teen: "teen" };

export interface AgeBandState {
  /** The band that drives layout: the child's own, or the next one up when they chose Classic. */
  band: AgeBand;
  /** From the date of birth alone. Used for the "moving up" moment; never shown. */
  natural: AgeProfile;
  /** The design system's young scale for the band in force. */
  youngScale: boolean;
  /** false on the parent's screens, /tuition and /schedule: adult presentation, no band attributes. */
  banded: boolean;
  look: Look;
  setLook: (next: Look) => void;
  /** Pip on the screen: early, young and junior by default, teen only when chosen. */
  showPip: boolean;
  setShowPip: (next: boolean) => void;
  /** Vietnamese under the English: always for early and young; a per-device switch for junior and teen. */
  viBeneath: boolean;
  viSwitch: boolean;
  setViSwitch: (next: boolean) => void;
  studentId?: string;
  /** The school year that began in the September before today (Hanoi). */
  schoolYear: number;
}

const FALLBACK: AgeBandState = {
  band: "junior",
  natural: ageProfile(null, { year: 2000, month: 1 }),
  youngScale: false,
  banded: false,
  look: "playful",
  setLook: () => {},
  showPip: true,
  setShowPip: () => {},
  viBeneath: false,
  viSwitch: false,
  setViSwitch: () => {},
  schoolYear: 2000,
};

const AgeBandContext = createContext<AgeBandState>(FALLBACK);

export const lookKey = (studentId: string) => `hec-look:${studentId}`;
export const pipKey = (studentId: string) => `hec-pip:${studentId}`;
export const VI_KEY = "hec-vi-beneath";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the choice lasts for this visit only */
  }
}

/** Is this one of the child's own pages? (/student, /student/...) */
export const isChildPath = (pathname: string) => pathname === "/student" || pathname.startsWith("/student/");

/** Works out the band for the selected child. One copy runs for the whole app (AgeBandRoot). */
function useAgeBandValue(): AgeBandState {
  const { user } = useAuth();
  const { studentId } = useStudentProfile();
  const { pathname } = useLocation();

  // Read-only views of two caches the shell and the home already fill. No request is made from here.
  const shell = useQuery<{ students: { id: string; date_of_birth: string | null }[] | null }>({
    queryKey: shellStudentsKey(user?.id ?? "none"),
    queryFn: skipToken,
  });
  const home = useQuery<{ date_of_birth?: string | null } | null>({
    queryKey: ["student-profile", studentId],
    queryFn: skipToken,
  });

  const fromShell = studentId ? shell.data?.students?.find((s) => s.id === studentId) : undefined;
  const dobKnown = !!fromShell || (home.data !== undefined && home.data !== null);
  const dob = fromShell?.date_of_birth ?? home.data?.date_of_birth ?? null;

  const hanoi = dayjs().tz();
  const today = { year: hanoi.year(), month: hanoi.month() + 1 };
  const schoolYear = today.month >= 9 ? today.year : today.year - 1;
  const computed = ageProfile(dob, today);

  // While the new child's date of birth is still being read, keep the last answer: no flicker through "unknown".
  const held = useRef<{ id?: string; profile: AgeProfile } | null>(null);
  let natural = computed;
  if (!dobKnown && held.current) natural = held.current.profile;
  useEffect(() => {
    if (dobKnown) held.current = { id: studentId, profile: computed };
  }, [dobKnown, studentId, computed.band, computed.known]);

  const [look, setLookState] = useState<Look>("playful");
  const [pip, setPipState] = useState<boolean | null>(null);
  const [viSwitch, setViState] = useState(false);
  useEffect(() => {
    setLookState(studentId && read(lookKey(studentId)) === "classic" ? "classic" : "playful");
    const savedPip = studentId ? read(pipKey(studentId)) : null;
    setPipState(savedPip === "1" ? true : savedPip === "0" ? false : null);
  }, [studentId]);
  useEffect(() => setViState(read(VI_KEY) === "1"), []);

  const setLook = useCallback((next: Look) => {
    setLookState(next);
    if (studentId) write(lookKey(studentId), next);
  }, [studentId]);
  const setShowPip = useCallback((next: boolean) => {
    setPipState(next);
    if (studentId) write(pipKey(studentId), next ? "1" : "0");
  }, [studentId]);
  const setViSwitch = useCallback((next: boolean) => {
    setViState(next);
    write(VI_KEY, next ? "1" : "0");
  }, []);

  const banded = isChildPath(pathname);
  const band: AgeBand = look === "classic" ? NEXT_BAND[natural.band] : natural.band;
  const youngScale = band === "early" || band === "young";
  const showPip = pip ?? band !== "teen";
  const viBeneath = band === "early" || band === "young" || viSwitch;

  const value = useMemo<AgeBandState>(
    () => ({ band, natural, youngScale, banded, look, setLook, showPip, setShowPip, viBeneath, viSwitch, setViSwitch, studentId, schoolYear }),
    [band, natural, youngScale, banded, look, setLook, showPip, setShowPip, viBeneath, viSwitch, setViSwitch, studentId, schoolYear],
  );

  return value;
}

const HasRoot = createContext(false);

/**
 * The band, for every page. Mounted once above the routes (App.tsx), so a page component can read the band
 * itself and not only the components it renders inside <Layout>. It draws nothing.
 * (Found 23 Nov 2026: with the provider inside Layout, a page that called useAgeBand() at its top got the fallback.)
 */
export function AgeBandRoot({ children }: { children: ReactNode }) {
  const value = useAgeBandValue();
  return (
    <HasRoot.Provider value={true}>
      <AgeBandContext.Provider value={value}>{children}</AgeBandContext.Provider>
    </HasRoot.Provider>
  );
}

/** The wrapper that carries data-hec-band / data-hec-scale, and the 240 ms fade when a profile switch changes the band. */
function BandScope({ children }: { children: ReactNode }) {
  const { band, banded, youngScale } = useAgeBand();
  const level = useMotionLevel();
  const controls = useAnimationControls();
  const lastBand = useRef<AgeBand | null>(null);
  useEffect(() => {
    const before = lastBand.current;
    lastBand.current = band;
    if (before !== null && before !== band && level !== "off") {
      controls.start({ opacity: [0, 1], transition: { duration: dur.reveal, ease } });
    }
  }, [band, level, controls]);

  return (
    <motion.div
      animate={controls}
      data-hec-band={banded ? band : undefined}
      data-hec-scale={banded && youngScale ? "young" : undefined}
    >
      {children}
    </motion.div>
  );
}

/** In the student / family shell (Layout): the banded wrapper. Under AgeBandRoot it only draws; alone (a test, a preview) it also computes. */
export function AgeBandProvider({ children }: { children: ReactNode }) {
  const hasRoot = useContext(HasRoot);
  if (hasRoot) return <BandScope>{children}</BandScope>;
  return (
    <AgeBandRoot>
      <BandScope>{children}</BandScope>
    </AgeBandRoot>
  );
}

/** The band in force for this child. Outside the provider (staff, tests) it answers junior, unbanded. */
export function useAgeBand(): AgeBandState {
  return useContext(AgeBandContext);
}
