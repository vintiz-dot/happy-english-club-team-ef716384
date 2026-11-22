/**
 * The week as a path (docs/EXPERIENCE_DESIGN_BRIEF.md G3): an ink line with a stop for each lesson and each
 * homework this week. Done stops are stamped in leaf, the next stop is marked in brass with a LiveDot, the rest
 * are outlined. Tapping a homework stop opens it; a lesson stop goes to the schedule. Built only from what the home
 * already read: the homework list (due this week, done or not) and the lessons of the next seven days.
 * With everything stamped, today's stop is stamped too: that is the finish line the young band ends on.
 */
import { Link } from "react-router-dom";
import { BookOpen, GraduationCap } from "lucide-react";
import { Bi } from "@/components/student/band/Bi";
import { InkCheck } from "@/components/fx/InkCheck";
import { LiveDot } from "@/components/fx/LiveDot";
import { CARD, CARD_TITLE, FOCUS } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";
import type { HomeData } from "./types";

interface Stop {
  key: string;
  kind: "homework" | "lesson";
  date: string;
  title: string;
  done: boolean;
  open?: () => void;
}

function stopsOf(data: HomeData): Stop[] {
  const monday = dayjs().startOf("isoWeek").format("YYYY-MM-DD");
  const sunday = dayjs().endOf("isoWeek").format("YYYY-MM-DD");
  const inWeek = (d?: string | null) => !!d && d.slice(0, 10) >= monday && d.slice(0, 10) <= sunday;
  const homework: Stop[] = data.homework.all
    .filter((h) => inWeek(h.due_date))
    .map((h) => ({
      key: `h-${h.id}`,
      kind: "homework",
      date: String(h.due_date).slice(0, 10),
      title: h.title || "Homework",
      done: h.submission?.status === "submitted" || h.submission?.status === "graded",
      open: () => data.onOpenHomework(h),
    }));
  const lessons: Stop[] = data.sessions
    .filter((s) => inWeek(s.date))
    .map((s) => ({
      key: `s-${s.id}`,
      kind: "lesson",
      date: String(s.date).slice(0, 10),
      title: s.classes?.name || "Class",
      done: s.status === "Held",
    }));
  return [...homework, ...lessons].sort((a, b) => a.date.localeCompare(b.date));
}

export function WeekPath({ data }: { data: HomeData }) {
  const stops = stopsOf(data);
  if (stops.length === 0) return null;
  const nextKey = stops.find((s) => !s.done)?.key;
  return (
    <section aria-labelledby="week-path" className={cn(CARD, "space-y-4")}>
      <h2 id="week-path" className={CARD_TITLE}>
        <Bi k="path.title" />
      </h2>
      <ol className="relative space-y-3">
        {/* the ink line the stops sit on */}
        <span aria-hidden className="absolute bottom-4 left-1/2 top-4 w-0.5 -translate-x-1/2 rounded-full bg-hec-ink" />
        {stops.map((stop, i) => {
          const isNext = stop.key === nextKey;
          const Icon = stop.kind === "homework" ? BookOpen : GraduationCap;
          const body = (
            <span className={cn("flex min-w-0 flex-1 flex-col text-hec-small text-hec-ink", i % 2 === 0 ? "items-end text-right" : "items-start text-left")}>
              <span className="whitespace-normal break-words font-medium">{stop.title}</span>
              <span className="tabular-nums text-hec-ink-soft">{dayjs(stop.date).format("ddd D MMM")}</span>
            </span>
          );
          const marker = (
            <span
              className={cn(
                "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2",
                stop.done ? "border-hec-leaf bg-hec-leaf-tint text-hec-leaf" : isNext ? "border-hec-brass bg-hec-surface text-hec-ink" : "border-hec-ink bg-hec-surface text-hec-ink-soft",
              )}
            >
              {stop.done ? <InkCheck size={22} label="Done" /> : <Icon className="h-5 w-5" aria-hidden />}
              {isNext && <span className="absolute -right-1 -top-1 rounded-full bg-hec-surface p-0.5"><LiveDot label="Next" /></span>}
            </span>
          );
          const row = cn("flex min-h-[3.5rem] w-full items-center gap-3 rounded-hec-md", i % 2 === 0 ? "flex-row" : "flex-row-reverse", FOCUS);
          const half = <span aria-hidden className="flex-1" />;
          const content = i % 2 === 0 ? (<>{body}{marker}{half}</>) : (<>{body}{marker}{half}</>);
          return (
            <li key={stop.key}>
              {stop.kind === "homework" && stop.open ? (
                <button type="button" onClick={stop.open} className={row}>
                  {content}
                </button>
              ) : (
                <Link to="/student/dashboard?tab=schedule" className={row}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
