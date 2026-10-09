/**
 * Team maker — shuffles the class into even teams.
 *
 * Picks a class rather than a session. The old version asked for a session
 * and then used that session's attendance, which was the right idea and
 * the wrong question: if nobody had marked attendance yet — the common
 * case, because teams get made at the start of the lesson — the tool
 * simply refused to work. It now prefers today's present list when there
 * is one and quietly falls back to the enrolled roster when there is not,
 * and says which it used.
 *
 * Class membership comes from fetchAccessibleClasses, the same gate the
 * leaderboard and the calendar use, so a teacher cannot team up a class
 * they only covered once two months ago.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Shuffle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import { fetchAccessibleClasses } from "@/lib/teacherAccess";
import { one } from "@/lib/pgrst";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ActionButton,
  Segmented,
  Stage,
  ToolCard,
} from "./studio/StudioKit";
import {
  toneClass,
  type StudioTone,
} from "./studio/tokens";
import { ClassScreen, ClassScreenButton } from "./studio/ClassScreen";
import { playChime } from "./audio";

interface Member {
  id: string;
  name: string;
}

type SplitMode = "teams" | "size";

const SPLIT_OPTIONS = [
  { value: "teams", label: "Number of teams" },
  { value: "size", label: "Team size" },
] as const;

const TEAM_TONES: StudioTone[] = ["sage", "clay", "sky", "butter", "lilac", "rose"];

const TEAM_NAMES = [
  "Team One",
  "Team Two",
  "Team Three",
  "Team Four",
  "Team Five",
  "Team Six",
  "Team Seven",
  "Team Eight",
];

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Deal round-robin so sizes differ by at most one. */
function partition<T>(items: T[], teamCount: number): T[][] {
  const teams: T[][] = Array.from({ length: teamCount }, () => []);
  items.forEach((item, i) => teams[i % teamCount].push(item));
  return teams;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function TeamCard({
  index,
  members,
  big,
}: {
  index: number;
  members: Member[];
  big?: boolean;
}) {
  const tone = TEAM_TONES[index % TEAM_TONES.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 22 }}
      className="overflow-hidden rounded-2xl border border-studio bg-studio-card shadow-studio"
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2",
          toneClass(tone),
        )}
      >
        <span className={cn("studio-title", big ? "text-2xl" : "text-base")}>
          {TEAM_NAMES[index] ?? `Team ${index + 1}`}
        </span>
        <span
          className={cn(
            "rounded-full bg-[hsl(0_0%_100%/0.45)] px-2 py-0.5 font-bold tabular-nums dark:bg-[hsl(0_0%_0%/0.25)]",
            big ? "text-sm" : "text-[0.6875rem]",
          )}
        >
          {members.length}
        </span>
      </div>
      <ul className={cn("space-y-1 p-2", big && "space-y-2 p-4")}>
        {members.map((m) => (
          <li
            key={m.id}
            className={cn(
              "flex items-center gap-2 rounded-xl px-2 py-1 text-ink",
              big ? "gap-3 text-xl" : "text-sm",
            )}
          >
            <span
              className={cn(
                "grid shrink-0 place-items-center rounded-full font-bold",
                toneClass(tone),
                big ? "h-10 w-10 text-base" : "h-6 w-6 text-[0.625rem]",
              )}
              aria-hidden
            >
              {initials(m.name)}
            </span>
            <span className="truncate">{m.name}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function TeamMaker() {
  const { user } = useAuth();
  const today = dayjs().format("YYYY-MM-DD");

  const [classId, setClassId] = useState<string>("");
  const [mode, setMode] = useState<SplitMode>("teams");
  const [teamCount, setTeamCount] = useState(2);
  const [teamSize, setTeamSize] = useState(3);
  const [teams, setTeams] = useState<Member[][] | null>(null);
  const [projecting, setProjecting] = useState(false);
  const [source, setSource] = useState<"present" | "roster" | null>(null);

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["team-maker-classes", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => (user ? fetchAccessibleClasses(user.id) : []),
  });

  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  /**
   * Who is in the room. Today's "Present" marks if attendance has been
   * taken, otherwise everyone currently enrolled.
   */
  const { data: pool, isLoading: poolLoading } = useQuery({
    queryKey: ["team-maker-pool", classId, today],
    enabled: !!classId,
    staleTime: 15_000,
    queryFn: async (): Promise<{ members: Member[]; from: "present" | "roster" }> => {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id")
        .eq("class_id", classId)
        .eq("date", today)
        .neq("status", "Canceled")
        .order("start_time");

      const sessionIds = (sessions ?? []).map((s) => s.id);

      if (sessionIds.length > 0) {
        const { data: present } = await supabase
          .from("attendance")
          .select("student_id, students!inner(id, full_name)")
          .in("session_id", sessionIds)
          .eq("status", "Present");

        const seen = new Map<string, Member>();
        for (const row of present ?? []) {
          const student = one(row.students);
          if (student?.id) seen.set(student.id, { id: student.id, name: student.full_name });
        }
        if (seen.size > 0) return { members: [...seen.values()], from: "present" };
      }

      const { data: enrolled } = await supabase
        .from("enrollments")
        .select("student_id, students!inner(id, full_name, is_active)")
        .eq("class_id", classId)
        .or(`end_date.is.null,end_date.gte.${today}`);

      const members: Member[] = [];
      for (const row of enrolled ?? []) {
        const student = one(row.students);
        if (student?.id && student.is_active !== false) {
          members.push({ id: student.id, name: student.full_name });
        }
      }
      return { members, from: "roster" };
    },
  });

  const members = pool?.members ?? [];

  // Any change to the inputs invalidates the teams on screen — showing a
  // stale split next to a different class is worse than showing none.
  useEffect(() => {
    setTeams(null);
    setSource(null);
  }, [classId, mode, teamCount, teamSize]);

  const resolvedTeamCount = useMemo(() => {
    if (mode === "teams") return teamCount;
    return Math.max(1, Math.ceil(members.length / Math.max(1, teamSize)));
  }, [mode, teamCount, teamSize, members.length]);

  const canMix = members.length >= 2 && resolvedTeamCount >= 1;

  const mix = () => {
    if (!canMix) return;
    setTeams(partition(shuffle(members), Math.min(resolvedTeamCount, members.length)));
    setSource(pool?.from ?? null);
    playChime();
  };

  const className = classes.find((c) => c.id === classId)?.name ?? "Class";

  const emptyMessage = classesLoading
    ? "Loading your classes…"
    : classes.length === 0
      ? "No classes yet — teams appear once you teach one."
      : poolLoading
        ? "Counting who is here…"
        : members.length === 0
          ? "Nobody is enrolled in this class yet."
          : "Your teams will appear here.";

  return (
    <>
      <ToolCard
        icon={Users}
        tone="sage"
        title="Team maker"
        description="Shuffles the class into even teams — a new mix every time."
        wide
        action={
          <ClassScreenButton onClick={() => setProjecting(true)} disabled={!teams} />
        }
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_1fr]">
          {/* Controls */}
          <div className="space-y-3">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Class</span>
              <Select value={classId} onValueChange={setClassId} disabled={classesLoading}>
                <SelectTrigger className="h-11 rounded-2xl border-studio bg-studio-stage text-sm font-semibold text-ink focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder={classesLoading ? "Loading…" : "Pick a class"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Split by</span>
              <Segmented
                ariaLabel="Split by"
                size="sm"
                options={SPLIT_OPTIONS}
                value={mode}
                onChange={(v) => setMode(v as SplitMode)}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
                {mode === "teams" ? "Number of teams" : "Students per team"}
              </span>
              <Segmented
                ariaLabel={mode === "teams" ? "Number of teams" : "Students per team"}
                options={[2, 3, 4, 5, 6].map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
                value={String(mode === "teams" ? teamCount : teamSize)}
                onChange={(v) =>
                  mode === "teams" ? setTeamCount(Number(v)) : setTeamSize(Number(v))
                }
              />
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-studio bg-studio-stage px-3 py-2 text-xs text-ink-soft">
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {poolLoading
                  ? "Counting…"
                  : `${members.length} ${members.length === 1 ? "student" : "students"}`}
                {members.length > 0 && (
                  <>
                    {" · "}
                    {mode === "teams"
                      ? `~${Math.ceil(members.length / Math.max(1, teamCount))} each`
                      : `${resolvedTeamCount} ${resolvedTeamCount === 1 ? "team" : "teams"}`}
                  </>
                )}
              </span>
            </div>

            <ActionButton onClick={mix} disabled={!canMix}>
              <Shuffle className="h-4 w-4" aria-hidden /> Mix teams
            </ActionButton>

            {source === "roster" && teams && (
              <p className="flex items-start gap-1.5 text-[0.6875rem] leading-snug text-ink-faint">
                <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                Built from the enrolled roster — no attendance marked today yet.
              </p>
            )}
          </div>

          {/* Results */}
          {teams ? (
            <div className="grid auto-rows-min gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {teams.map((t, i) => (
                <TeamCard key={i} index={i} members={t} />
              ))}
            </div>
          ) : (
            <Stage className="min-h-[200px] p-6 text-center">
              <p className="max-w-[22ch] text-sm text-ink-faint">{emptyMessage}</p>
            </Stage>
          )}
        </div>
      </ToolCard>

      <ClassScreen
        open={projecting}
        onClose={() => setProjecting(false)}
        title={`${className} — teams`}
      >
        <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(teams ?? []).map((t, i) => (
            <TeamCard key={i} index={i} members={t} big />
          ))}
        </div>
      </ClassScreen>
    </>
  );
}
