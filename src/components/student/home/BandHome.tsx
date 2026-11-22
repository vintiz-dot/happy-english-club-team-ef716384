/**
 * The parts of the student home that need the child's age band. A page renders its <Layout> INSIDE itself, and the
 * band provider lives in that Layout, so anything that reads the band must be a child of the Layout: these are
 * those children. StudentDashboard builds the data and hands it over; nothing here queries.
 */
import { Suspense, lazy } from "react";
import { Bi } from "@/components/student/band/Bi";
import { useMovingUp } from "@/components/student/band/useMovingUp";
import { EarlyHome } from "@/components/student/home/EarlyHome";
import { YoungHome } from "@/components/student/home/YoungHome";
import { JuniorHome } from "@/components/student/home/JuniorHome";
import { TeenHome } from "@/components/student/home/TeenHome";
import { MeLinks } from "@/components/student/home/MeLinks";
import { MonitorStatusCard } from "@/components/student/MonitorStatusCard";
import { BUTTON_QUIET } from "@/components/student/nova/ivory";
import { useAgeBand } from "@/hooks/useAgeBand";
import { cn } from "@/lib/utils";
import type { HomeData } from "./types";

// The "new school year" moment loads only on the day it plays.
const MovingUpMoment = lazy(() => import("@/components/student/band/MovingUpMoment"));

/** The home of the child's band, then the class-monitor card (if they are one) and the way into their profile. */
export function BandHome({ data, monitorClassNames }: { data: HomeData; monitorClassNames: string[] }) {
  const { band } = useAgeBand();
  return (
    <>
      {band === "early" ? (
        <EarlyHome data={data} />
      ) : band === "young" ? (
        <YoungHome data={data} />
      ) : band === "junior" ? (
        <JuniorHome data={data} />
      ) : (
        <TeenHome data={data} />
      )}
      {data.isMonitor && <MonitorStatusCard classNames={monitorClassNames} />}
      <button type="button" onClick={data.onEditProfile} className={cn(BUTTON_QUIET, "px-3 text-hec-small text-hec-ink-soft hover:text-hec-ink")}>
        <Bi k="profile.edit" />
      </button>
    </>
  );
}

/** Plays the once-per-school-year page turn when this child has moved up a band. */
export function MovingUpGate() {
  const { due, done } = useMovingUp();
  if (!due) return null;
  return (
    <Suspense fallback={null}>
      <MovingUpMoment onDone={done} />
    </Suspense>
  );
}

/** Badges, reports and the schedule are pages under "Me" for the three younger bands. */
export function MeLinksGate({ tab }: { tab: string }) {
  const { band } = useAgeBand();
  if (band === "teen" || !(tab === "achievements" || tab === "reports" || tab === "schedule")) return null;
  return <MeLinks active={tab} />;
}
