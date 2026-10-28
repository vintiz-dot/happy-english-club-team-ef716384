/**
 * chat Edge Function — the HEC assistant.
 * ========================================
 * A context-aware helper for parents, students, teachers and admins.
 *
 * SECURITY MODEL — read this before touching anything:
 *
 *   1. READ-ONLY BY CONSTRUCTION. This function performs ZERO database
 *      writes. No insert/update/upsert/delete/rpc appears anywhere in it.
 *      The client carries the conversation and sends it with each turn;
 *      saving history is a CLIENT action against own-row RLS tables that the
 *      model has no tool for and never sees. If you are adding a write to
 *      this file, stop: that is a different feature with a different review
 *      bar.
 *
 *   2. THE SECURITY BOUNDARY IS POSTGRES RLS, NOT THE PROMPT. Every data
 *      tool runs on a client bound to the CALLER'S OWN JWT (anon key +
 *      forwarded Authorization header). The service-role key is used for
 *      exactly one thing: resolving the caller's identity and roles
 *      (reads). If the model is prompt-injected into requesting another
 *      child's data, RLS returns zero rows. A parent physically cannot
 *      read another family's child, whatever the model is tricked into
 *      asking for. On top of RLS, studentFor/classFor hold each role to
 *      what the panel promises (own children, own record, own classes),
 *      where RLS is wider for leaderboards and the shared calendar.
 *
 *   3. IDENTITY COMES FROM THE JWT, NEVER FROM THE CONVERSATION. The model
 *      cannot claim to be someone; who you are is resolved server-side
 *      before the model sees a token. The page path and selected child the
 *      browser sends are hints: a page's record is named only if the
 *      caller's own client can read it, and a selected child is used only
 *      if it is one of the caller's own.
 *
 *   4. EVERYTHING RETRIEVED FROM THE DATABASE IS UNTRUSTED INPUT. Lesson
 *      summaries, error logs and vocabulary examples contain user-written
 *      text — a student can type "ignore previous instructions" into an
 *      example sentence. Tool results are wrapped in explicit data
 *      delimiters and the system prompt instructs the model that data can
 *      never carry instructions.
 *
 *   5. BOUNDED. gpt-4o-mini, ≤4 tool rounds, 45s per OpenAI call
 *      (AbortController — this pipeline's recurring lesson), capped history
 *      and tool payloads, best-effort per-instance daily message cap.
 *
 * CONTEXT. Before the model runs, the server works out who is asking: the
 * name the app's header shows them, every role the login holds, their
 * teacher or TA record and classes, a parent's children or a student's own
 * records, which child a shared login has selected, today's date in Hanoi
 * and the page they are on. _lib/chat-context.ts turns that into the
 * system prompt. scripts/pgtest/chat-assistant.test.mjs runs this file
 * against a fake database and a scripted model.
 *
 * Input:  { messages: [{role:'user'|'assistant', content}],
 *           context?: { path?, search?, selected_student_id? } }
 * Output: { success, reply, tools_used: [names], tool_errors? }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { authenticateUser } from "../_lib/auth.ts";
import { safeParseJson } from "../_lib/text.ts";
import {
  asDate,
  asMonth,
  buildSystemPrompt,
  fitJson,
  isUuid,
  matchByName,
  monthBounds,
  nameFromEmail,
  readPage,
  schoolToday,
  shiftDate,
  weekdayOf,
  type AssistantRole,
  type PageRef,
  type PersonRef,
  type SchoolDay,
} from "../_lib/chat-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHAT_MODEL = "gpt-4o-mini";
const MAX_TOOL_ROUNDS = 4;
const OPENAI_TIMEOUT_MS = 45_000;
const MAX_HISTORY_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 2_000;
// An admin's school-wide lists are longer than one family's. fitJson
// shortens lists rather than cutting text, so this is a budget, not a
// guillotine.
const MAX_TOOL_RESULT_CHARS = 12_000;
const DAILY_MESSAGE_CAP = 80; // best-effort, per warm instance (no DB writes allowed)

// ── Best-effort rate limit ─────────────────────────────────────────────────
// Honest limitation: with a strict no-writes rule there is nowhere durable
// to count usage, so this only survives as long as the instance stays warm.
// It still blunts tight abuse loops, which hit the same warm instance.
const usage = new Map<string, { day: string; count: number }>();
function overDailyCap(userId: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const u = usage.get(userId);
  if (!u || u.day !== day) {
    usage.set(userId, { day, count: 1 });
    return false;
  }
  u.count++;
  return u.count > DAILY_MESSAGE_CAP;
}

async function openaiChat(key: string, body: Record<string, unknown>): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw new Error("The assistant timed out — try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ── Tool registry ──────────────────────────────────────────────────────────
// Every tool is a SELECT through the caller's own RLS-scoped client. The
// `roles` list controls which tools are OFFERED to the model; RLS remains
// the real gate on what each tool can actually return.

interface StaffRecord {
  kind: "teacher" | "teaching_assistant";
  id: string;
  name: string;
}

/** Who is asking, resolved before the model ran. */
interface ToolContext {
  role: AssistantRole;
  userId: string;
  today: SchoolDay;
  /** The teacher or TA record behind this login, if any. */
  staff: StaffRecord | null;
  /** A student's own records, or a parent's children. Empty for staff. */
  ownStudentIds: string[];
  /** A teacher's or TA's classes. Fetched at most once per request. */
  staffClasses: () => Promise<PersonRef[]>;
  /** The students enrolled now in those classes. Fetched at most once. */
  staffStudentIds: () => Promise<Set<string>>;
}

interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  roles: string[];
  run: (userDb: any, args: any, ctx: ToolContext) => Promise<unknown>;
}

/**
 * A question this caller may not ask, as opposed to a tool that broke. It
 * reaches the model as an ordinary result it can explain, and stays out of
 * tool_errors, which is for failures somebody needs to fix.
 */
class Refusal extends Error {}

const clampLimit = (n: unknown, max: number, dflt: number) => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.min(Math.floor(v), max) : dflt;
};

/** An embedded row, which postgrest-js can return as an object or a one-item array. */
const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const vnd = (v: unknown) => Math.round(Number(v) || 0);
const hhmm = (t: unknown) => (typeof t === "string" ? t.slice(0, 5) : null);
const toPerson = (s: any): PersonRef => ({ id: s.id, name: s.full_name });

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Enrolments still running today: no end date, or one not yet reached. */
const stillEnrolled = (today: SchoolDay) => `end_date.is.null,end_date.gte.${today.date}`;

/**
 * The classes a teacher or TA may open, by the app's own rule: on the
 * roster (default teacher, or named on a weekly slot) or covering a
 * non-cancelled lesson from 7 days back to 60 days ahead. The same rule as
 * fetchAccessibleClasses in src/lib/teacherAccess.ts and the
 * is_teacher_of_class predicate behind RLS.
 *
 * Not "every class they ever had a lesson in", which is what this used to
 * answer: covering one lesson last year made the class theirs for ever —
 * the leak teacherAccess.ts was written to close. It also found nothing at
 * all for teaching assistants, whose lessons live in session_participants.
 */
async function fetchStaffClasses(userDb: any, staff: StaffRecord, today: SchoolDay): Promise<PersonRef[]> {
  const from = shiftDate(today.date, -7);
  const to = shiftDate(today.date, 60);
  const byId = new Map<string, PersonRef>();
  const add = (c: any) => {
    if (c?.id && !byId.has(c.id)) byId.set(c.id, { id: c.id, name: c.name || "Class" });
  };

  if (staff.kind === "teacher") {
    const [rostered, covering] = await Promise.all([
      userDb
        .from("classes")
        .select("id, name, default_teacher_id, schedule_template")
        .eq("is_active", true)
        .limit(500),
      userDb
        .from("sessions")
        .select("class_id, classes!inner(id, name, is_active)")
        .eq("teacher_id", staff.id)
        .neq("status", "Canceled")
        .eq("classes.is_active", true)
        .gte("date", from)
        .lte("date", to)
        .limit(1000),
    ]);
    if (rostered.error) throw new Error(rostered.error.message);
    if (covering.error) throw new Error(covering.error.message);
    for (const c of rostered.data ?? []) {
      const slots = c.schedule_template?.weeklySlots;
      const onSlot = Array.isArray(slots) && slots.some((s: any) => s?.teacherId === staff.id);
      if (c.default_teacher_id === staff.id || onSlot) add(c);
    }
    for (const s of covering.data ?? []) add(one(s.classes));
  } else {
    const { data, error } = await userDb
      .from("session_participants")
      .select("sessions!inner(class_id, date, status, classes!inner(id, name, is_active))")
      .eq("teaching_assistant_id", staff.id)
      .eq("participant_type", "teaching_assistant")
      .neq("sessions.status", "Canceled")
      .eq("sessions.classes.is_active", true)
      .gte("sessions.date", from)
      .lte("sessions.date", to)
      .limit(1000);
    if (error) throw new Error(error.message);
    for (const p of data ?? []) add(one(one(p.sessions)?.classes));
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

interface RosterEntry {
  id: string;
  name: string;
  active: boolean;
  classes: string[];
}

/** The students enrolled now in these classes, with the classes each is in. */
async function rosterOf(userDb: any, classIds: string[], today: SchoolDay): Promise<Map<string, RosterEntry>> {
  const byStudent = new Map<string, RosterEntry>();
  for (const ids of chunk(classIds, 100)) {
    const { data, error } = await userDb
      .from("enrollments")
      .select("student_id, classes(name), students(full_name, is_active)")
      .in("class_id", ids)
      .or(stillEnrolled(today))
      .limit(1000);
    if (error) throw new Error(error.message);
    for (const e of data ?? []) {
      const s = one(e.students);
      if (!s) continue; // RLS kept the student back
      const entry = byStudent.get(e.student_id) ??
        { id: e.student_id, name: s.full_name, active: s.is_active !== false, classes: [] as string[] };
      const cls = one(e.classes)?.name;
      if (cls && !entry.classes.includes(cls)) entry.classes.push(cls);
      byStudent.set(e.student_id, entry);
    }
  }
  return byStudent;
}

/** The classes each of these students is enrolled in now, by name. */
async function classesOf(userDb: any, studentIds: string[], today: SchoolDay): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  for (const ids of chunk(studentIds, 100)) {
    const { data, error } = await userDb
      .from("enrollments")
      .select("student_id, classes(name)")
      .in("student_id", ids)
      .or(stillEnrolled(today))
      .limit(1000);
    if (error) throw new Error(error.message);
    for (const e of data ?? []) {
      const name = one(e.classes)?.name;
      if (!name) continue;
      const names = out.get(e.student_id) ?? [];
      if (!names.includes(name)) names.push(name);
      out.set(e.student_id, names);
    }
  }
  return out;
}

/**
 * The student a tool was asked about, if this caller may ask about them.
 *
 * RLS stays the real boundary. This holds the assistant to what its panel
 * promises — "sees only your own records" — where RLS is wider than that:
 * classmates are readable for the leaderboard, and older policies let
 * teachers read every student in the school.
 */
async function studentFor(args: any, ctx: ToolContext): Promise<string> {
  const sid = String(args?.student_id ?? "").trim().toLowerCase();
  if (!isUuid(sid)) throw new Refusal("No valid student_id was given — look the student up with find_students first.");
  if ((ctx.role === "family" || ctx.role === "student") && !ctx.ownStudentIds.includes(sid)) {
    throw new Refusal(
      ctx.role === "family" ? "That student is not one of this parent's children." : "That is not this student's own record.",
    );
  }
  if (ctx.role === "teacher" && !(await ctx.staffStudentIds()).has(sid)) {
    throw new Refusal("That student is not in any of this teacher's classes.");
  }
  return sid;
}

/** The class a tool was asked about, if this caller may ask about it. */
async function classFor(args: any, ctx: ToolContext): Promise<string> {
  const cid = String(args?.class_id ?? "").trim().toLowerCase();
  if (!isUuid(cid)) throw new Refusal("No valid class_id was given — look the class up with get_class_details first.");
  if (ctx.role === "teacher" && !(await ctx.staffClasses()).some((c) => c.id === cid)) {
    throw new Refusal("That class is not one of this teacher's classes.");
  }
  return cid;
}

const studentShape = (s: any) => ({
  id: s.id,
  name: s.full_name,
  active: s.is_active !== false,
  family: one(s.families)?.name ?? null,
  classes: null as string[] | null,
});

const TOOLS: ToolDef[] = [
  {
    name: "find_students",
    description:
      "Find students by name — or, with no name, list the students this user can see — with each " +
      "one's student_id (which the other tools need), current classes and family. Admins search the " +
      "whole school, teachers their own classes, parents their own children, a student only " +
      "themself. Names match without accents and in any order. Call this first when asked about a " +
      "student whose student_id you do not have yet.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "all or part of the student's name" },
        include_inactive: { type: "boolean", description: "admins: also search students who have left" },
      },
      required: [],
    },
    roles: ["family", "student", "teacher", "admin"],
    run: async (userDb, args, ctx) => {
      const wanted = String(args.name ?? "").trim().slice(0, 80);
      let pool: ReturnType<typeof studentShape>[];

      if (ctx.role === "admin") {
        // Every student, matched here rather than with ILIKE so accents and
        // word order do not matter. This used to be an unordered 60-row
        // list, which in a school of more than 60 left most students
        // unfindable — the commonest wrong answer an admin got.
        let q = userDb
          .from("students")
          .select("id, full_name, is_active, families(name)")
          .order("full_name")
          .limit(1000);
        if (!args.include_inactive) q = q.eq("is_active", true);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        pool = (data ?? []).map(studentShape);
      } else if (ctx.role === "teacher") {
        const roster = await rosterOf(userDb, (await ctx.staffClasses()).map((c) => c.id), ctx.today);
        pool = [...roster.values()].map((s) => ({ ...s, family: null }));
      } else {
        if (!ctx.ownStudentIds.length) return { total: 0, students: [], note: "No students are linked to this account yet." };
        const { data, error } = await userDb
          .from("students")
          .select("id, full_name, is_active, families(name)")
          .in("id", ctx.ownStudentIds);
        if (error) throw new Error(error.message);
        pool = (data ?? []).map(studentShape);
      }

      const matches = matchByName(pool, wanted, (s) => s.name);
      const shown = matches.slice(0, 25);
      const unclassed = shown.filter((s) => s.classes === null);
      if (unclassed.length) {
        const classes = await classesOf(userDb, unclassed.map((s) => s.id), ctx.today);
        for (const s of unclassed) s.classes = classes.get(s.id) ?? [];
      }

      const where = { admin: "in the school", teacher: "in this teacher's classes", family: "among this parent's children", student: "on this account" }[ctx.role];
      const notes: string[] = [];
      if (matches.length > shown.length) {
        notes.push(`${matches.length} students match; showing the first ${shown.length}. Search by name to narrow it down.`);
      }
      if (wanted && !matches.length) notes.push(`No student matching "${wanted}" was found ${where}.`);
      return {
        total: matches.length,
        students: shown.map((s) => ({
          student_id: s.id,
          name: s.name,
          ...(s.active ? {} : { left_the_school: true }),
          classes: s.classes ?? [],
          ...(s.family ? { family: s.family } : {}),
        })),
        ...(notes.length ? { note: notes.join(" ") } : {}),
      };
    },
  },
  {
    name: "get_student_overview",
    description:
      "The learning snapshot for one student: points total, classes, attendance rate, word-bank " +
      "size, CEFR history, plus the AI journey summary/strengths/struggles WHEN one has been " +
      "generated. The main tool for 'how is X doing?' and 'tell me about myself'. The concrete " +
      "numbers are always present even if the AI summary is not.",
    parameters: {
      type: "object",
      properties: { student_id: { type: "string", description: "student_id from find_students" } },
      required: ["student_id"],
    },
    roles: ["family", "student", "teacher", "admin"],
    run: async (userDb, args, ctx) => {
      const sid = await studentFor(args, ctx);
      const since = shiftDate(ctx.today.date, -60);

      const [profile, points, cefr, student, vocab, attend, enr] = await Promise.all([
        userDb.from("student_learning_profiles")
          .select("summary, strengths, struggles, cefr_estimate, vocab_words, transcripts_analyzed, updated_at")
          .eq("student_id", sid).maybeSingle(),
        // NOT maybeSingle(): student_points is UNIQUE(student_id, class_id,
        // month), so a student has one row PER CLASS PER MONTH. maybeSingle()
        // errored on the second row and the error was being discarded, which
        // silently reported "no points" for every multi-class student.
        userDb.from("student_points")
          .select("total_points, vocabulary_quiz_points, homework_points, participation_points, reading_theory_points, month")
          .eq("student_id", sid),
        userDb.from("cefr_assessments")
          .select("level, source, assessed_at").eq("student_id", sid)
          .order("assessed_at", { ascending: false }).limit(5),
        userDb.from("students").select("full_name, date_of_birth").eq("id", sid).maybeSingle(),
        userDb.from("student_vocabulary_entries")
          .select("id", { count: "exact", head: true }).eq("student_id", sid),
        // attendance carries no date of its own — it hangs off the session.
        userDb.from("attendance")
          .select("status, sessions!inner(date)")
          .eq("student_id", sid).gte("sessions.date", since).limit(200),
        // Current classes only: a student who moved class is not still in
        // the old one.
        userDb.from("enrollments")
          .select("class_id, classes(name)").eq("student_id", sid).or(stillEnrolled(ctx.today)).limit(10),
      ]);

      const rows: any[] = points.data ?? [];
      const sum = (k: string) => rows.reduce((t, r) => t + (Number(r[k]) || 0), 0);
      const att: any[] = attend.data ?? [];
      const present = att.filter((a) => a.status === "Present").length;

      // Surface failures instead of quietly reporting nothing — a silently
      // empty answer is what made this assistant look broken.
      const issues = [
        profile.error && `profile: ${profile.error.message}`,
        points.error && `points: ${points.error.message}`,
        cefr.error && `cefr: ${cefr.error.message}`,
        vocab.error && `vocabulary: ${vocab.error.message}`,
        attend.error && `attendance: ${attend.error.message}`,
        enr.error && `classes: ${enr.error.message}`,
      ].filter(Boolean);

      return {
        student_name: student.data?.full_name ?? null,
        total_points: rows.length ? sum("total_points") : 0,
        points_breakdown: rows.length
          ? {
              vocabulary: sum("vocabulary_quiz_points"),
              homework: sum("homework_points"),
              participation: sum("participation_points"),
              reading_theory: sum("reading_theory_points"),
            }
          : null,
        classes: (enr.data ?? []).map((e: any) => one(e.classes)?.name).filter(Boolean),
        words_in_word_bank: vocab.count ?? 0,
        attendance_last_60_days: att.length
          ? { attended: present, recorded: att.length, rate_percent: Math.round((present / att.length) * 100) }
          : null,
        recent_cefr: cefr.data ?? [],
        ai_profile: profile.data ?? null,
        ai_profile_note: profile.data
          ? undefined
          : "No AI learning profile has been generated for this student yet — use the concrete numbers above and do not say you know nothing about them.",
        ...(issues.length ? { retrieval_problems: issues } : {}),
      };
    },
  },
  {
    name: "get_recent_lessons",
    description:
      "Recent lesson summaries (date, class, title, summary, materials, homework) for one class " +
      "(class_id) or for one student's classes (student_id). Parents and students may leave both out " +
      "to get their own; teachers may leave both out to get all their classes. These are the " +
      "student-safe overviews — use for 'what did they learn?', 'any homework?', 'summarise the last lesson'.",
    parameters: {
      type: "object",
      properties: {
        class_id: { type: "string" },
        student_id: { type: "string" },
        limit: { type: "number", description: "max lessons, default 5" },
      },
      required: [],
    },
    roles: ["family", "student", "teacher", "admin"],
    run: async (userDb, args, ctx) => {
      const limit = clampLimit(args.limit, 10, 5);
      let classIds: string[];
      if (args.class_id) {
        classIds = [await classFor(args, ctx)];
      } else if (args.student_id || ctx.role === "family" || ctx.role === "student") {
        const studentIds = args.student_id ? [await studentFor(args, ctx)] : ctx.ownStudentIds;
        if (!studentIds.length) return [];
        const { data: enr, error: e1 } = await userDb
          .from("enrollments").select("class_id").in("student_id", studentIds).limit(20);
        if (e1) throw new Error(e1.message);
        classIds = [...new Set<string>((enr || []).map((r: any) => r.class_id))];
      } else if (ctx.role === "teacher") {
        classIds = (await ctx.staffClasses()).map((c) => c.id);
      } else {
        throw new Refusal("Pass a class_id (get_class_details) or a student_id (find_students).");
      }
      if (!classIds.length) return [];
      const { data, error } = await userDb
        .from("lesson_overviews")
        .select("lesson_date, title, summary, materials, homework, classes(name)")
        .in("class_id", classIds)
        .order("lesson_date", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map(({ classes, ...lesson }: any) => ({ ...lesson, class: one(classes)?.name ?? null }));
    },
  },
  {
    name: "get_attendance",
    description:
      "Attendance records for one student in the last N days (default 30), each with the lesson " +
      "date and class name, plus a summary count.",
    parameters: {
      type: "object",
      properties: { student_id: { type: "string" }, days: { type: "number" } },
      required: ["student_id"],
    },
    roles: ["family", "student", "teacher", "admin"],
    run: async (userDb, args, ctx) => {
      const sid = await studentFor(args, ctx);
      const days = clampLimit(args.days, 120, 30);
      const since = shiftDate(ctx.today.date, -days);
      // The `attendance` table has NO date column of its own — the date lives
      // on the session. Selecting `date` here returned a PostgREST 400 on
      // every single attendance question, which the model reported as "I
      // don't have that information".
      const { data, error } = await userDb
        .from("attendance")
        .select("status, sessions!inner(date, start_time, classes(name))")
        .eq("student_id", sid)
        .gte("sessions.date", since)
        .limit(120);
      if (error) throw new Error(error.message);
      // Sorted here rather than with an embedded-table order clause, which
      // has shifting option names across postgrest-js versions.
      const records = (data ?? [])
        .map((r: any) => ({
          date: one(r.sessions)?.date ?? null,
          class_name: one(one(r.sessions)?.classes)?.name ?? null,
          status: r.status,
        }))
        .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
      const attended = records.filter((r: any) => r.status === "Present").length;
      return {
        days_covered: days,
        recorded: records.length,
        attended,
        rate_percent: records.length ? Math.round((attended / records.length) * 100) : null,
        records,
      };
    },
  },
  {
    name: "get_schedule",
    description:
      "Upcoming (and optionally recent past) lessons for ONE student: date, start time and class " +
      "name. Use for 'when is my next class?', 'what time is my lesson?' and 'do I have class " +
      "tomorrow?'. For a whole day or the school's timetable use get_sessions instead.",
    parameters: {
      type: "object",
      properties: {
        student_id: { type: "string" },
        limit: { type: "number", description: "max sessions, default 5" },
        include_past: { type: "boolean", description: "also return the previous few sessions" },
      },
      required: ["student_id"],
    },
    roles: ["family", "student", "teacher", "admin"],
    run: async (userDb, args, ctx) => {
      const sid = await studentFor(args, ctx);
      const limit = clampLimit(args.limit, 20, 5);
      const today = ctx.today.date;

      // Current classes only, or a student who changed class is told about
      // the old class's lessons as if they were still theirs.
      const { data: enr, error: e1 } = await userDb
        .from("enrollments").select("class_id").eq("student_id", sid).or(stillEnrolled(ctx.today)).limit(10);
      if (e1) throw new Error(e1.message);
      const classIds = [...new Set((enr || []).map((r: any) => r.class_id))].filter(Boolean);
      if (!classIds.length) return { today, upcoming: [], note: "This student has no class enrolments." };

      const { data: upcoming, error: e2 } = await userDb
        .from("sessions")
        .select("date, start_time, end_time, status, classes(name)")
        .in("class_id", classIds)
        .gte("date", today)
        .in("status", ["Scheduled", "Held"])
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(limit);
      if (e2) throw new Error(e2.message);

      const shape = (r: any) => ({
        date: r.date,
        weekday: weekdayOf(r.date),
        start_time: hhmm(r.start_time),
        end_time: hhmm(r.end_time),
        class_name: one(r.classes)?.name ?? null,
        status: r.status,
      });

      let recent: any[] = [];
      if (args.include_past) {
        const { data: past } = await userDb
          .from("sessions")
          .select("date, start_time, end_time, status, classes(name)")
          .in("class_id", classIds)
          .lt("date", today)
          .order("date", { ascending: false })
          .limit(3);
        recent = (past ?? []).map(shape);
      }

      return { today, upcoming: (upcoming ?? []).map(shape), ...(args.include_past ? { recent } : {}) };
    },
  },
  {
    name: "get_points_history",
    description: "Recent point awards for one student (what they were praised for).",
    parameters: {
      type: "object",
      properties: { student_id: { type: "string" }, limit: { type: "number" } },
      required: ["student_id"],
    },
    roles: ["family", "student", "teacher", "admin"],
    run: async (userDb, args, ctx) => {
      const { data, error } = await userDb
        .from("point_transactions")
        .select("date, points, type, notes")
        .eq("student_id", await studentFor(args, ctx))
        .order("date", { ascending: false })
        .limit(clampLimit(args.limit, 30, 10));
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "get_student_errors",
    description:
      "Recent logged language errors for one student (verbatim error → correction → type). Use " +
      "for 'what should we practise?' and to explain mistakes. Available to the student " +
      "themselves and staff.",
    parameters: {
      type: "object",
      properties: { student_id: { type: "string" }, limit: { type: "number" } },
      required: ["student_id"],
    },
    roles: ["student", "teacher", "admin"],
    run: async (userDb, args, ctx) => {
      const { data, error } = await userDb
        .from("student_error_log")
        .select("error_text, corrected_text, error_type, created_at")
        .eq("student_id", await studentFor(args, ctx))
        .order("created_at", { ascending: false })
        .limit(clampLimit(args.limit, 20, 10));
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "get_vocabulary",
    description: "Recent words in one student's personal word bank (word, meaning, their example).",
    parameters: {
      type: "object",
      properties: { student_id: { type: "string" }, limit: { type: "number" } },
      required: ["student_id"],
    },
    roles: ["student", "teacher", "admin"],
    run: async (userDb, args, ctx) => {
      const { data, error } = await userDb
        .from("student_vocabulary_entries")
        .select("word, definition_en, user_examples, created_at")
        .eq("student_id", await studentFor(args, ctx))
        .order("created_at", { ascending: false })
        .limit(clampLimit(args.limit, 40, 15));
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "get_invoices",
    description:
      "One student's tuition invoices, newest month first: the month's charge before and after " +
      "discounts, anything brought forward from earlier months, money paid in the month, and the " +
      "balance at the end of the month (still owed, or in credit). Use to EXPLAIN a bill, never to " +
      "change it. Amounts are VND. Parents and students may leave out student_id to get their own; " +
      "admins pass one (for the whole school use get_outstanding_balances).",
    parameters: {
      type: "object",
      properties: {
        student_id: { type: "string" },
        month: { type: "string", description: "only this month, YYYY-MM" },
        limit: { type: "number", description: "max invoices, default 6" },
      },
      required: [],
    },
    // Students are included deliberately: the "Students can view their
    // invoices" RLS policy already scopes this to their own rows, and their
    // tuition is already shown on their own profile in the app.
    roles: ["family", "student", "admin"],
    run: async (userDb, args, ctx) => {
      // NOT paid_amount: calculate-tuition stores the CUMULATIVE total paid
      // across every month there, so a family that paid on time for a year
      // looked as though it had paid twelve times this month's bill.
      // recorded_payment is the month's own payments, and the carry columns
      // are kept right by the invoices_carry_sync trigger.
      let q = userDb
        .from("invoices")
        .select(
          "month, student_id, base_amount, discount_amount, total_amount, recorded_payment, " +
            "carry_in_debt, carry_in_credit, carry_out_debt, carry_out_credit, students(full_name)",
        )
        .order("month", { ascending: false })
        .limit(clampLimit(args.limit, 12, 6));
      if (args.student_id) {
        q = q.eq("student_id", await studentFor(args, ctx));
      } else if (ctx.role === "admin") {
        // An unscoped admin query used to return six invoices from anywhere
        // in the school, with no names attached.
        throw new Refusal(
          "Pass the student's student_id (look it up with find_students), or use get_outstanding_balances for the whole school.",
        );
      } else {
        if (!ctx.ownStudentIds.length) return { invoices: [], note: "No students are linked to this account yet." };
        q = q.in("student_id", ctx.ownStudentIds);
      }
      const month = asMonth(args.month);
      if (month) q = q.eq("month", month);

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return {
        how_to_read:
          "amount_due_this_month = tuition_this_month + owed_from_earlier_months - credit_from_earlier_months. " +
          "still_owed_at_month_end (or credit_at_month_end) is the running balance after that month's " +
          "payments and already includes every earlier month, so never add balances from different months " +
          "together: the newest month's balance is what is owed now.",
        invoices: (data ?? []).map((r: any) => ({
          month: r.month,
          student: one(r.students)?.full_name ?? null,
          tuition_before_discounts: vnd(r.base_amount),
          discounts: vnd(r.discount_amount),
          tuition_this_month: vnd(r.total_amount),
          owed_from_earlier_months: vnd(r.carry_in_debt),
          credit_from_earlier_months: vnd(r.carry_in_credit),
          amount_due_this_month: Math.max(0, vnd(r.total_amount) + vnd(r.carry_in_debt) - vnd(r.carry_in_credit)),
          paid_this_month: vnd(r.recorded_payment),
          still_owed_at_month_end: vnd(r.carry_out_debt),
          credit_at_month_end: vnd(r.carry_out_credit),
        })),
        ...(month && !(data ?? []).length ? { note: `There is no invoice for ${month}.` } : {}),
      };
    },
  },
  {
    name: "get_outstanding_balances",
    description:
      "Who owes tuition: every student whose balance after the month is still owed, largest first, " +
      "with their family, the month's charge and payments, and school-wide totals. Defaults to this " +
      "month. Set include_credit to also list students who have paid ahead. Admins only.",
    parameters: {
      type: "object",
      properties: {
        month: { type: "string", description: "YYYY-MM, default this month" },
        include_credit: { type: "boolean", description: "also list students in credit" },
      },
      required: [],
    },
    roles: ["admin"],
    run: async (userDb, args, ctx) => {
      const month = asMonth(args.month) ?? ctx.today.month;
      const { start } = monthBounds(month);
      // The month's roster by the tuition list's own rule
      // (src/lib/finance/studentsInMonth.ts): still active, or left during
      // or after the month.
      const [roster, bills] = await Promise.all([
        userDb
          .from("students")
          .select("id, full_name, is_active, families(name)")
          .or(`is_active.eq.true,deactivated_at.gte.${start}`)
          .limit(1000),
        userDb
          .from("invoices")
          .select("student_id, total_amount, recorded_payment, carry_out_debt, carry_out_credit, students(full_name, is_active, families(name))")
          .eq("month", month)
          .limit(1000),
      ]);
      if (roster.error) throw new Error(roster.error.message);
      if (bills.error) throw new Error(bills.error.message);

      const rows = new Map<string, any>();
      for (const b of bills.data ?? []) {
        const s = one(b.students);
        rows.set(b.student_id, {
          student: s?.full_name ?? "Unknown student",
          family: one(s?.families)?.name ?? null,
          left: s?.is_active === false,
          owed: vnd(b.carry_out_debt),
          credit: vnd(b.carry_out_credit),
          tuition_this_month: vnd(b.total_amount),
          paid_this_month: vnd(b.recorded_payment),
          balance_from: `the ${month} invoice`,
        });
      }

      // No bill for the month yet — early in the month, or not recalculated
      // since they joined. What they owe now is where their last bill left
      // off, which is also what the tuition list shows for them.
      const unbilled = (roster.data ?? []).filter((s: any) => !rows.has(s.id));
      const lastBill = new Map<string, any>();
      // 40 students x 24 months of bills stays under the API's 1000-row page.
      for (const ids of chunk(unbilled.map((s: any) => s.id), 40)) {
        const { data, error } = await userDb
          .from("invoices")
          .select("student_id, month, carry_out_debt, carry_out_credit")
          .in("student_id", ids)
          .lt("month", month)
          .order("month", { ascending: false })
          .limit(1000);
        if (error) throw new Error(error.message);
        for (const r of data ?? []) if (!lastBill.has(r.student_id)) lastBill.set(r.student_id, r);
      }
      for (const s of unbilled) {
        const r = lastBill.get(s.id);
        if (!r) continue;
        rows.set(s.id, {
          student: s.full_name,
          family: one(s.families)?.name ?? null,
          left: s.is_active === false,
          owed: vnd(r.carry_out_debt),
          credit: vnd(r.carry_out_credit),
          tuition_this_month: 0,
          paid_this_month: 0,
          balance_from: `the ${r.month} invoice (no ${month} invoice yet)`,
        });
      }

      const all = [...rows.values()];
      const owing = all.filter((r) => r.owed > 0).sort((a, b) => b.owed - a.owed);
      const ahead = all.filter((r) => r.credit > 0).sort((a, b) => b.credit - a.credit);
      const shape = (r: any, amount: "owed" | "credit") => ({
        student: r.student,
        family: r.family,
        ...(r.left ? { left_the_school: true } : {}),
        [amount]: r[amount],
        tuition_this_month: r.tuition_this_month,
        paid_this_month: r.paid_this_month,
        balance_from: r.balance_from,
      });
      return {
        month,
        students_owing: owing.length,
        total_owed: owing.reduce((t, r) => t + r.owed, 0),
        students_in_credit: ahead.length,
        total_credit: ahead.reduce((t, r) => t + r.credit, 0),
        owing: owing.map((r) => shape(r, "owed")),
        ...(args.include_credit ? { in_credit: ahead.map((r) => shape(r, "credit")) } : {}),
        note:
          "Each figure is that student's running balance after the month and already includes earlier " +
          "months — never add months together. These are the stored invoice figures; the Finance tab " +
          "recalculates the open month, so it can differ until tuition is recalculated.",
      };
    },
  },
  {
    name: "get_school_overview",
    description:
      "Headline numbers for the whole school: active students, families, classes, teachers and " +
      "teaching assistants, today's lessons, and this month's lessons by status. Admins only.",
    parameters: { type: "object", properties: {}, required: [] },
    roles: ["admin"],
    run: async (userDb, _args, ctx) => {
      const { start, end } = monthBounds(ctx.today.month);
      const head = { count: "exact", head: true };
      const counted = async (q: any) => {
        const { count, error } = await q;
        if (error) throw new Error(error.message);
        return count ?? 0;
      };
      const monthLessons = (status: string) =>
        counted(userDb.from("sessions").select("id", head).eq("status", status).gte("date", start).lte("date", end));

      const [students, families, classes, teachers, assistants, held, scheduled, canceled, today] = await Promise.all([
        counted(userDb.from("students").select("id", head).eq("is_active", true)),
        counted(userDb.from("families").select("id", head).eq("is_active", true)),
        counted(userDb.from("classes").select("id", head).eq("is_active", true)),
        counted(userDb.from("teachers").select("id", head).eq("is_active", true)),
        counted(userDb.from("teaching_assistants").select("id", head).eq("is_active", true)),
        monthLessons("Held"),
        monthLessons("Scheduled"),
        monthLessons("Canceled"),
        userDb
          .from("sessions")
          .select("start_time, end_time, status, classes(name), teachers(full_name)")
          .eq("date", ctx.today.date)
          .order("start_time", { ascending: true })
          .limit(200),
      ]);
      if (today.error) throw new Error(today.error.message);
      return {
        active_students: students,
        active_families: families,
        active_classes: classes,
        active_teachers: teachers,
        active_teaching_assistants: assistants,
        lessons_today: (today.data ?? []).map((s: any) => ({
          start: hhmm(s.start_time),
          end: hhmm(s.end_time),
          class: one(s.classes)?.name ?? null,
          teacher: one(s.teachers)?.full_name ?? null,
          status: s.status,
        })),
        lessons_this_month: { month: ctx.today.month, held, scheduled, canceled },
      };
    },
  },
  {
    name: "get_sessions",
    description:
      "Lessons on one day or across a range: date, time, class, teacher and status (Scheduled, Held, " +
      "Canceled), optionally with each lesson's attendance marks. Admins see the whole school; " +
      "teachers only their own lessons. Defaults to today. Use for 'what's on today / tomorrow / " +
      "this week?', 'who taught X on Monday?' and 'who was absent today?' (include_attendance).",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "one day, YYYY-MM-DD (default today)" },
        from: { type: "string", description: "first day of a range, YYYY-MM-DD" },
        to: { type: "string", description: "last day of a range, YYYY-MM-DD; up to 31 days" },
        class_id: { type: "string", description: "only this class" },
        include_attendance: { type: "boolean", description: "who was present / absent / excused; up to 7 days" },
      },
      required: [],
    },
    roles: ["teacher", "admin"],
    run: async (userDb, args, ctx) => {
      let from = asDate(args.date) ?? asDate(args.from) ?? ctx.today.date;
      let to = asDate(args.date) ?? asDate(args.to) ?? from;
      if (to < from) [from, to] = [to, from];
      const withMarks = Boolean(args.include_attendance);
      const span = withMarks ? 7 : 31;
      const notes: string[] = [];
      if (to > shiftDate(from, span - 1)) {
        to = shiftDate(from, span - 1);
        notes.push(`Range shortened to ${from} – ${to}: at most ${span} days${withMarks ? " with attendance" : ""}.`);
      }

      let q = userDb
        .from("sessions")
        .select("id, date, start_time, end_time, status, classes(name), teachers(full_name)")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(400);
      if (args.class_id) q = q.eq("class_id", await classFor(args, ctx));

      if (ctx.role === "teacher") {
        // RLS lets every signed-in user read every scheduled lesson — the
        // school calendar is open inside the app — so "my lessons" has to be
        // asked for explicitly.
        if (!ctx.staff) return { from, to, sessions: [], note: "No teacher record is linked to this login." };
        if (ctx.staff.kind === "teacher") {
          q = q.eq("teacher_id", ctx.staff.id);
        } else {
          const { data: mine, error } = await userDb
            .from("session_participants")
            .select("session_id, sessions!inner(date)")
            .eq("teaching_assistant_id", ctx.staff.id)
            .eq("participant_type", "teaching_assistant")
            .gte("sessions.date", from)
            .lte("sessions.date", to)
            .limit(1000);
          if (error) throw new Error(error.message);
          const ids = (mine ?? []).map((p: any) => p.session_id);
          if (!ids.length) return { from, to, today: ctx.today.date, lessons: 0, sessions: [] };
          q = q.in("id", ids);
        }
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const rows: any[] = data ?? [];
      if (rows.length === 400) notes.push("Only the first 400 lessons are listed — ask for a shorter range.");

      const marks = new Map<string, Record<string, string[]>>();
      if (withMarks && rows.length) {
        for (const ids of chunk(rows.map((r) => r.id), 100)) {
          const { data: att, error: e2 } = await userDb
            .from("attendance")
            .select("session_id, status, students(full_name)")
            .in("session_id", ids)
            .limit(1000);
          if (e2) throw new Error(e2.message);
          for (const a of att ?? []) {
            const name = one(a.students)?.full_name;
            if (!name) continue;
            const bySession = marks.get(a.session_id) ?? {};
            (bySession[String(a.status || "unmarked").toLowerCase()] ??= []).push(name);
            marks.set(a.session_id, bySession);
          }
        }
      }

      const count = (status: string) => rows.filter((r) => r.status === status).length;
      return {
        from,
        to,
        today: ctx.today.date,
        lessons: rows.length,
        by_status: { scheduled: count("Scheduled"), held: count("Held"), canceled: count("Canceled") },
        sessions: rows.map((r) => ({
          date: r.date,
          weekday: weekdayOf(r.date),
          start: hhmm(r.start_time),
          end: hhmm(r.end_time),
          class: one(r.classes)?.name ?? null,
          teacher: one(r.teachers)?.full_name ?? null,
          status: r.status,
          ...(withMarks ? { attendance: marks.get(r.id) ?? "not marked" } : {}),
        })),
        ...(notes.length ? { note: notes.join(" ") } : {}),
      };
    },
  },
  {
    name: "get_class_details",
    description:
      "One class in detail, found by name or class_id: its default teacher, age range, the students " +
      "enrolled now, and its next and most recent lessons. With neither, lists the classes this user " +
      "can open. Admins can open any class; teachers their own.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "all or part of the class name" },
        class_id: { type: "string" },
      },
      required: [],
    },
    roles: ["teacher", "admin"],
    run: async (userDb, args, ctx) => {
      let candidates: PersonRef[];
      if (ctx.role === "admin") {
        const { data, error } = await userDb.from("classes").select("id, name").eq("is_active", true).order("name").limit(500);
        if (error) throw new Error(error.message);
        candidates = (data ?? []).map((c: any) => ({ id: c.id, name: c.name }));
      } else {
        candidates = await ctx.staffClasses();
      }

      const wanted = String(args.name ?? "").trim().slice(0, 80);
      let picked: PersonRef[];
      if (args.class_id) {
        const cid = await classFor(args, ctx);
        // An admin may open an archived class by id; the list above is active classes only.
        picked = ctx.role === "admin" ? [{ id: cid, name: "" }] : candidates.filter((c) => c.id === cid);
      } else if (wanted) {
        picked = matchByName(candidates, wanted, (c) => c.name);
      } else {
        return {
          classes: candidates.map((c) => ({ class_id: c.id, name: c.name })),
          note: "Ask about one of these by name for its roster and lessons.",
        };
      }
      if (!picked.length) {
        return {
          classes: [],
          note: ctx.role === "teacher"
            ? `"${wanted}" is not one of this teacher's classes.`
            : `No active class matching "${wanted}" was found.`,
          classes_available: candidates.map((c) => c.name),
        };
      }

      const details: unknown[] = [];
      for (const c of picked.slice(0, 3)) {
        const [cls, roster, next, recent] = await Promise.all([
          userDb
            .from("classes")
            .select("id, name, age_range, is_active, default_session_length_minutes, teachers(full_name)")
            .eq("id", c.id)
            .maybeSingle(),
          userDb
            .from("enrollments")
            .select("student_id, students(full_name, is_active)")
            .eq("class_id", c.id)
            .or(stillEnrolled(ctx.today))
            .limit(200),
          userDb
            .from("sessions")
            .select("date, start_time, status, teachers(full_name)")
            .eq("class_id", c.id)
            .gte("date", ctx.today.date)
            .neq("status", "Canceled")
            .order("date", { ascending: true })
            .order("start_time", { ascending: true })
            .limit(4),
          userDb
            .from("sessions")
            .select("date, start_time, status, teachers(full_name)")
            .eq("class_id", c.id)
            .lt("date", ctx.today.date)
            .order("date", { ascending: false })
            .limit(3),
        ]);
        for (const r of [cls, roster, next, recent]) if (r.error) throw new Error(r.error.message);
        if (!cls.data) continue;

        const students = (roster.data ?? [])
          .map((e: any) => one(e.students))
          .filter((s: any) => s && s.is_active !== false)
          .map((s: any) => s.full_name)
          .sort();
        const lesson = (s: any) => ({
          date: s.date,
          weekday: weekdayOf(s.date),
          start: hhmm(s.start_time),
          teacher: one(s.teachers)?.full_name ?? null,
          status: s.status,
        });
        details.push({
          class_id: cls.data.id,
          name: cls.data.name,
          ...(cls.data.is_active === false ? { archived: true } : {}),
          age_range: cls.data.age_range ?? null,
          default_teacher: one(cls.data.teachers)?.full_name ?? null,
          lesson_length_minutes: cls.data.default_session_length_minutes ?? null,
          student_count: students.length,
          students,
          next_lessons: (next.data ?? []).map(lesson),
          recent_lessons: (recent.data ?? []).map(lesson),
        });
      }
      return {
        classes: details,
        ...(picked.length > 3 ? { note: `${picked.length} classes match; these are the closest 3. Ask which one they mean if unsure.` } : {}),
      };
    },
  },
  {
    name: "list_teachers",
    description:
      "The school's teachers and teaching assistants: name, whether they are still active, email, " +
      "phone, and the classes each one teaches (roster classes plus any lesson from a week ago to a " +
      "month ahead). Use for 'who teaches X?' and 'what does Y teach?'. Pay is not included. Admins only.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "all or part of a staff member's name" },
        include_archived: { type: "boolean", description: "also list staff who have left" },
      },
      required: [],
    },
    roles: ["admin"],
    run: async (userDb, args, ctx) => {
      const from = shiftDate(ctx.today.date, -7);
      const to = shiftDate(ctx.today.date, 30);
      const [teachers, assistants, classes, lessons, assisting] = await Promise.all([
        userDb.from("teachers").select("id, full_name, email, phone, is_active").order("full_name").limit(300),
        userDb.from("teaching_assistants").select("id, full_name, email, phone, is_active").order("full_name").limit(300),
        userDb.from("classes").select("name, default_teacher_id, schedule_template").eq("is_active", true).limit(500),
        userDb
          .from("sessions")
          .select("teacher_id, classes(name)")
          .neq("status", "Canceled")
          .gte("date", from)
          .lte("date", to)
          .limit(1000),
        userDb
          .from("session_participants")
          .select("teaching_assistant_id, sessions!inner(date, status, classes(name))")
          .eq("participant_type", "teaching_assistant")
          .neq("sessions.status", "Canceled")
          .gte("sessions.date", from)
          .lte("sessions.date", to)
          .limit(1000),
      ]);
      for (const r of [teachers, assistants, classes, lessons, assisting]) if (r.error) throw new Error(r.error.message);

      // Teacher and TA ids are both UUIDs, so one map serves both.
      const teaches = new Map<string, Set<string>>();
      const addClass = (staffId: unknown, className: unknown) => {
        if (typeof staffId !== "string" || typeof className !== "string") return;
        let names = teaches.get(staffId);
        if (!names) teaches.set(staffId, (names = new Set()));
        names.add(className);
      };
      for (const c of classes.data ?? []) {
        addClass(c.default_teacher_id, c.name);
        const slots = c.schedule_template?.weeklySlots;
        if (Array.isArray(slots)) for (const s of slots) addClass(s?.teacherId, c.name);
      }
      for (const s of lessons.data ?? []) addClass(s.teacher_id, one(s.classes)?.name);
      for (const p of assisting.data ?? []) addClass(p.teaching_assistant_id, one(one(p.sessions)?.classes)?.name);

      const staff = [
        ...(teachers.data ?? []).map((t: any) => ({ ...t, kind: "teacher" })),
        ...(assistants.data ?? []).map((t: any) => ({ ...t, kind: "teaching assistant" })),
      ].filter((t) => args.include_archived || t.is_active !== false);
      const wanted = String(args.name ?? "").trim().slice(0, 80);
      const shown = matchByName(staff, wanted, (t) => t.full_name);
      return {
        count: shown.length,
        staff: shown.map((t) => ({
          name: t.full_name,
          role: t.kind,
          ...(t.is_active === false ? { left: true } : {}),
          email: t.email ?? null,
          phone: t.phone ?? null,
          classes: [...(teaches.get(t.id) ?? [])].sort(),
        })),
        ...(wanted && !shown.length ? { note: `No staff member matching "${wanted}" was found.` } : {}),
      };
    },
  },
  {
    name: "get_class_participation",
    description:
      "Per-student speaking metrics from analyzed lesson recordings of one class (word counts, " +
      "participation share, questions asked). Staff only. Use for 'who has gone quiet?'.",
    parameters: {
      type: "object",
      properties: { class_id: { type: "string" }, limit: { type: "number" } },
      required: ["class_id"],
    },
    roles: ["teacher", "admin"],
    run: async (userDb, args, ctx) => {
      const { data, error } = await userDb
        .from("transcript_speaker_metrics")
        .select("speaker_label, student_id, word_count, participation_share, questions_asked, cefr_estimate, created_at")
        .eq("class_id", await classFor(args, ctx))
        .order("created_at", { ascending: false })
        .limit(clampLimit(args.limit, 80, 40));
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "list_my_classes",
    description:
      "The classes THIS user is connected to, by name: for an admin every active class with its " +
      "teacher and how many students are enrolled; a teacher's own classes; a parent's children's " +
      "classes (with which child is in each); a student's own classes. Use for 'what class am I in?', " +
      "'which class is my child in?' and 'what are my classes?'.",
    parameters: { type: "object", properties: {}, required: [] },
    roles: ["family", "student", "teacher", "admin"],
    run: async (userDb, _args, ctx) => {
      // NOT a plain select on `classes`.
      //
      // The "Everyone can view active classes" policy is USING (is_active =
      // true) — every signed-in user may read EVERY active class. Querying the
      // table directly therefore returned the school's entire class list with
      // nothing marking which one was the caller's, so the model could not
      // name a student's class and (correctly) refused to guess.
      //
      // Scope has to come from the RELATIONSHIP, not from RLS.
      if (ctx.role === "admin" || ctx.role === "teacher") {
        let classes: PersonRef[];
        const teacherOf = new Map<string, string | null>();
        if (ctx.role === "admin") {
          const { data, error } = await userDb
            .from("classes").select("id, name, teachers(full_name)")
            .eq("is_active", true).order("name").limit(500);
          if (error) throw new Error(error.message);
          classes = (data ?? []).map((c: any) => ({ id: c.id, name: c.name }));
          for (const c of data ?? []) teacherOf.set(c.id, one(c.teachers)?.full_name ?? null);
        } else {
          classes = await ctx.staffClasses();
        }
        const enrolled = new Map<string, number>();
        for (const ids of chunk(classes.map((c) => c.id), 100)) {
          const { data, error } = await userDb
            .from("enrollments").select("class_id").in("class_id", ids).or(stillEnrolled(ctx.today)).limit(1000);
          if (error) throw new Error(error.message);
          for (const e of data ?? []) enrolled.set(e.class_id, (enrolled.get(e.class_id) ?? 0) + 1);
        }
        // An admin who also teaches can ask "my classes" and mean theirs.
        const theirs = ctx.role === "admin" && ctx.staff ? new Set((await ctx.staffClasses()).map((c) => c.id)) : null;
        return classes.map((c) => ({
          class_id: c.id,
          name: c.name,
          ...(ctx.role === "admin" ? { default_teacher: teacherOf.get(c.id) ?? null } : {}),
          students_enrolled: enrolled.get(c.id) ?? 0,
          ...(theirs?.has(c.id) ? { they_teach_it: true } : {}),
        }));
      }

      // Student / parent: only the records resolved for this login before
      // the model ran. Going through `students` here returned classmates
      // too (the leaderboard policy lets a student read them), and with
      // them the classmates' other classes.
      if (!ctx.ownStudentIds.length) return [];
      const [studs, enr] = await Promise.all([
        userDb.from("students").select("id, full_name").in("id", ctx.ownStudentIds),
        userDb
          .from("enrollments")
          .select("student_id, classes(id, name, age_range)")
          .in("student_id", ctx.ownStudentIds)
          .or(stillEnrolled(ctx.today))
          .limit(200),
      ]);
      if (studs.error) throw new Error(studs.error.message);
      if (enr.error) throw new Error(enr.error.message);

      const nameById = new Map((studs.data ?? []).map((s: any) => [s.id, s.full_name]));
      const byClass = new Map<string, any>();
      for (const e of enr.data ?? []) {
        const c = one(e.classes);
        if (!c) continue;
        if (!byClass.has(c.id)) byClass.set(c.id, { ...c, students: [] as string[] });
        // A parent needs to know WHICH child is in which class.
        const who = nameById.get(e.student_id);
        if (who && !byClass.get(c.id).students.includes(who)) {
          byClass.get(c.id).students.push(who);
        }
      }
      return [...byClass.values()];
    },
  },
];

// ── Who is asking ──────────────────────────────────────────────────────────

interface Identity {
  /** profiles.display_name — what the header shows when it is set. */
  profileName: string | null;
  staff: StaffRecord | null;
  /** Student records signed in with this login (siblings can share one). */
  linked: PersonRef[];
  family: { id: string; name: string } | null;
  /** The active children of the families this login is primary user of. */
  children: PersonRef[];
}

/**
 * Everything the login is, read through the caller's own client — the same
 * lookups the app's header makes (src/hooks/useIdentity.ts). This used to
 * stop at students and families, so an admin or a teacher reached the
 * model as an anonymous "a admin" with no name and no classes.
 */
async function resolveIdentity(userDb: any, userId: string): Promise<Identity> {
  const [profile, teacher, assistant, linked, families] = await Promise.all([
    userDb.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    userDb.from("teachers").select("id, full_name").eq("user_id", userId).limit(1),
    userDb.from("teaching_assistants").select("id, full_name").eq("user_id", userId).limit(1),
    // NOT maybeSingle(): link-student-user attaches every sibling in a
    // family to the same login, so this legitimately returns several rows.
    userDb.from("students").select("id, full_name").eq("linked_user_id", userId).order("full_name").limit(10),
    userDb.from("families").select("id, name").eq("primary_user_id", userId).limit(5),
  ]);

  const familyRows: any[] = families.data ?? [];
  let children: PersonRef[] = [];
  if (familyRows.length) {
    const { data } = await userDb
      .from("students")
      .select("id, full_name")
      .in("family_id", familyRows.map((f) => f.id))
      .eq("is_active", true)
      .order("full_name")
      .limit(20);
    children = (data ?? []).map(toPerson);
  }

  const t = (teacher.data ?? [])[0];
  const a = (assistant.data ?? [])[0];
  return {
    profileName: String(profile.data?.display_name ?? "").trim() || null,
    staff: t
      ? { kind: "teacher", id: t.id, name: t.full_name }
      : a
        ? { kind: "teaching_assistant", id: a.id, name: a.full_name }
        : null,
    linked: (linked.data ?? []).map(toPerson),
    family: familyRows[0] ? { id: familyRows[0].id, name: familyRows[0].name } : null,
    children,
  };
}

/**
 * Puts a name to the record on the user's screen, looked up AS the user:
 * a page they cannot open names nothing, whatever path the browser sent.
 */
async function describePage(userDb: any, page: PageRef | null): Promise<string | null> {
  if (!page) return null;
  if (page.kind === "screen" || !page.id) return page.label;

  const nameOf = async (table: string, column: string) => {
    const { data } = await userDb.from(table).select(column).eq("id", page.id).maybeSingle();
    return (data?.[column] as string | undefined) || null;
  };

  if (page.kind === "student") {
    const name = await nameOf("students", "full_name");
    return name ? `${page.label} ${name} (student_id: ${page.id})` : null;
  }
  if (page.kind === "class") {
    const name = await nameOf("classes", "name");
    return name ? `${page.label} ${name} (class_id: ${page.id})` : null;
  }
  if (page.kind === "teacher") {
    const name = (await nameOf("teachers", "full_name")) ?? (await nameOf("teaching_assistants", "full_name"));
    return name ? `${page.label} ${name}` : null;
  }
  // A family page: name the children too, since every money and progress
  // question about "this family" is really about them.
  const name = await nameOf("families", "name");
  if (!name) return null;
  const { data: kids } = await userDb
    .from("students")
    .select("id, full_name")
    .eq("family_id", page.id)
    .eq("is_active", true)
    .order("full_name")
    .limit(10);
  const children = (kids ?? []).map((k: any) => `${k.full_name} (student_id: ${k.id})`).join(", ");
  return `${page.label} ${name}${children ? `, whose children are ${children}` : ""}`;
}

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Service client ONLY for identity resolution (reads).
    const adminDb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const caller = await authenticateUser(req, adminDb);
    if (!caller || caller.isServiceRole) {
      return respond({ success: false, error: "Unauthorized" }, 401);
    }
    if (overDailyCap(caller.userId)) {
      return respond(
        { success: false, error: "Daily assistant limit reached — try again tomorrow." },
        429,
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return respond({ success: false, error: "OPENAI_API_KEY is not configured" }, 500);

    // EVERY data read below runs on the caller's own JWT — RLS enforced.
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!anonKey) return respond({ success: false, error: "SUPABASE_ANON_KEY is not configured" }, 500);
    const userDb = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const hints = body?.context && typeof body.context === "object" ? body.context : {};
    const today = schoolToday();
    const who = await resolveIdentity(userDb, caller.userId);

    // Effective role for tool selection (highest privilege wins the label;
    // RLS still decides row-by-row).
    let role: AssistantRole | null =
      caller.roles.has("admin") ? "admin"
      : caller.roles.has("teacher") ? "teacher"
      : caller.roles.has("family") ? "family"
      : caller.roles.has("student") ? "student"
      : null;

    // Some older accounts hold no user_roles row at all. Rather than defaulting
    // an unknown account into a role, prove who they are from rows RLS already
    // lets them see; refuse only when there is no evidence either way.
    if (!role) {
      if (who.linked.length) role = "student";
      else if (who.family) role = "family";
      else {
        return respond(
          {
            success: false,
            error:
              "Your account doesn't have a role assigned yet, so I can't look anything up. " +
              "Please ask the school admin to finish setting up your account.",
          },
          403,
        );
      }
    }

    // A parent's children and a student's own records, as one list: a
    // login can be a family's primary user and linked to a child at once.
    const own = new Map<string, PersonRef>();
    if (role === "family" || role === "student") {
      for (const p of [...who.linked, ...who.children]) own.set(p.id, p);
    }
    const ownStudents = [...own.values()];

    // The child the app has selected (the profile switcher). A sibling login
    // used to be answered as whichever child sorted first. Only ever one of
    // the caller's own; anything else the browser sends is ignored.
    const selectedId = typeof hints.selected_student_id === "string" ? hints.selected_student_id.toLowerCase() : "";
    const selected = own.get(selectedId) ?? null;

    let classesOnce: Promise<PersonRef[]> | null = null;
    const staffClasses = () =>
      (classesOnce ??= who.staff ? fetchStaffClasses(userDb, who.staff, today) : Promise.resolve([]));
    let rosterOnce: Promise<Set<string>> | null = null;
    const staffStudentIds = () =>
      (rosterOnce ??= staffClasses().then(async (cs) => new Set((await rosterOf(userDb, cs.map((c) => c.id), today)).keys())));

    const ctx: ToolContext = {
      role,
      userId: caller.userId,
      today,
      staff: who.staff,
      ownStudentIds: ownStudents.map((s) => s.id),
      staffClasses,
      staffStudentIds,
    };

    // The name the app's header shows them, so the assistant and the screen
    // agree — except that a student is the child the app has selected.
    const studentName = role === "student"
      ? (selected ?? (ownStudents.length === 1 ? ownStudents[0] : null))?.name ?? null
      : null;
    const name = studentName ?? who.profileName ?? who.staff?.name ?? who.family?.name ?? nameFromEmail(caller.email);

    const [classes, page] = await Promise.all([
      role === "teacher" ? staffClasses().catch(() => [] as PersonRef[]) : Promise.resolve([] as PersonRef[]),
      describePage(userDb, readPage(hints.path, hints.search)).catch(() => null),
    ]);

    // ── Sanitize the conversation the client sent ────────────────────────
    const rawMessages: any[] = Array.isArray(body.messages) ? body.messages : [];
    const history = rawMessages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, MAX_MESSAGE_CHARS) }));
    if (!history.length || history[history.length - 1].role !== "user") {
      return respond({ success: false, error: "messages must end with a user message" }, 400);
    }

    const availableTools = TOOLS.filter((t) => t.roles.includes(role));
    const toolSchemas = availableTools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));

    const messages: any[] = [
      {
        role: "system",
        content: buildSystemPrompt({
          role,
          roles: [...caller.roles],
          name,
          email: caller.email ?? null,
          staff: who.staff ? { kind: who.staff.kind, name: who.staff.name } : null,
          students: ownStudents,
          selected,
          classes,
          today,
          page,
        }),
      },
      ...history,
    ];

    // ── Tool loop ────────────────────────────────────────────────────────
    const toolsUsed: string[] = [];
    // Tool failures used to vanish into the model's context and come back out
    // as a polite "I don't have that information" — which is exactly how three
    // broken queries masqueraded as a weak model for weeks. Record them and
    // return them so a failure is visible in the browser console and the logs.
    const toolErrors: { tool: string; error: string }[] = [];
    let reply = "";
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const lastRound = round === MAX_TOOL_ROUNDS;
      const data = await openaiChat(openaiKey, {
        model: CHAT_MODEL,
        temperature: 0.4,
        max_tokens: 1200,
        messages,
        ...(lastRound ? {} : { tools: toolSchemas }),
      });
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new Error("empty model response");

      const calls: any[] = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
      if (!calls.length) {
        reply = String(msg.content || "").trim();
        break;
      }

      messages.push(msg);
      for (const call of calls) {
        const tool = availableTools.find((t) => t.name === call.function?.name);
        let resultText: string;
        const toolName = String(call.function?.name || "unknown");
        if (!tool) {
          resultText = `Error: tool not available.`;
          toolErrors.push({ tool: toolName, error: "tool not available for this role" });
        } else {
          try {
            const args = safeParseJson(call.function?.arguments || "{}");
            const result = await tool.run(userDb, args, ctx);
            toolsUsed.push(tool.name);
            const partial = (result as any)?.retrieval_problems;
            if (Array.isArray(partial) && partial.length) {
              toolErrors.push({ tool: tool.name, error: `partial: ${partial.join("; ")}` });
              console.warn(`chat tool ${tool.name} partial failure:`, partial.join("; "));
            }
            // Untrusted-data wrapping: user-authored text lives in here.
            resultText = "<data>\n" + fitJson(result, MAX_TOOL_RESULT_CHARS) + "\n</data>";
          } catch (e) {
            if (e instanceof Refusal) {
              toolsUsed.push(tool.name);
              resultText = "<data>\n" + JSON.stringify({ not_available: e.message }) + "\n</data>";
            } else {
              const msg = (e as Error).message?.slice(0, 300) || "unknown error";
              toolErrors.push({ tool: toolName, error: msg });
              console.error(`chat tool ${toolName} FAILED:`, msg);
              resultText = `Error: ${msg.slice(0, 200)}`;
            }
          }
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: resultText,
        });
      }
    }

    if (!reply) {
      reply = "Sorry — I couldn't put together an answer this time. Could you rephrase that?";
    }
    return respond({
      success: true,
      reply,
      tools_used: [...new Set(toolsUsed)],
      ...(toolErrors.length ? { tool_errors: toolErrors } : {}),
    });
  } catch (error) {
    console.error("chat error:", error);
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
