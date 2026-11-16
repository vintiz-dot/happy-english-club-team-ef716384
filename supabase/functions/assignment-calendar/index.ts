// supabase/functions/assignment-calendar/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Row = {
  id: string;
  title?: string | null;
  due_date?: string | null; // DATE or TIMESTAMP
  class_id?: string | null;
  classes?: { id: string; name?: string | null } | null;
  homework_submissions?: Array<{
    id: string;
    status?: string | null;
    student_id?: string | null;
    submitted_at?: string | null;
    graded_at?: string | null;
  }>;
};

/* ---------- helpers ---------- */
function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function fmtDate(y: number, m1to12: number, d: number): string {
  const mm = String(m1to12).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
function coerceISODateUTC(s: string | null): string | null {
  if (!s || !isISODate(s)) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7)); // 1..12
  const d = Number(s.slice(8, 10));
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || m < 1 || m > 12) return null;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dd = Math.min(Math.max(1, d), last); // clamp 1..last
  return fmtDate(y, m, dd);
}
function parseISODateUTC(s: string): Date {
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  return new Date(Date.UTC(y, m - 1, d));
}
function addDaysUTC(d: Date, n: number): string {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy.toISOString().slice(0, 10);
}
function monthBounds(y: number, m1to12: number): { from: string; to: string; days: number } {
  const start = new Date(Date.UTC(y, m1to12 - 1, 1));
  const end = new Date(Date.UTC(y, m1to12, 0));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), days: end.getUTCDate() };
}
function computeRange(search: URLSearchParams) {
  // 1) explicit from/to (coerced)
  const f0 = coerceISODateUTC(search.get("from"));
  const t0 = coerceISODateUTC(search.get("to"));
  if (f0 && t0) {
    const from = f0;
    const to = t0;
    const toExclusive = addDaysUTC(parseISODateUTC(to), 1);
    return { from, to, toExclusive, daysInMonth: new Date(from.slice(0, 7) + "-01").getUTCDate() };
  }

  // 2) ym=YYYY-MM
  const ym = search.get("ym");
  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    const y = Number(ym.slice(0, 4));
    const m = Number(ym.slice(5, 7));
    const { from, to, days } = monthBounds(y, m);
    const toExclusive = addDaysUTC(parseISODateUTC(to), 1);
    return { from, to, toExclusive, daysInMonth: days };
  }

  // 3) year + month (accept 1..12 and 0..11)
  const now = new Date();
  const y = search.get("year") ? Number(search.get("year")) : now.getUTCFullYear();
  const mIn = search.get("month") !== null ? Number(search.get("month")) : now.getUTCMonth() + 1;
  const m = mIn >= 1 && mIn <= 12 ? mIn : mIn >= 0 && mIn <= 11 ? mIn + 1 : NaN;
  if (!Number.isInteger(y) || !Number.isInteger(m)) throw new Error("invalid year/month");
  const { from, to, days } = monthBounds(y, m);
  const toExclusive = addDaysUTC(parseISODateUTC(to), 1);
  return { from, to, toExclusive, daysInMonth: days };
}
function corsHeaders(reqHeaders: HeadersInit) {
  const origin = (reqHeaders as Headers).get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}
function json(body: unknown, status: number, reqHeaders: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(reqHeaders) });
}

/* ---------- handler ---------- */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req.headers) });

  try {
    const url = new URL(req.url);
    const { from, to, toExclusive, daysInMonth } = computeRange(url.searchParams);

    // trace once to verify coercion in logs
    console.log("[assignment-calendar] range", { raw: Object.fromEntries(url.searchParams), from, to, toExclusive });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // Get user role to filter assignments appropriately
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check user role
    // From user_roles (the caller's own rows, under RLS), never from
    // user_metadata, which the account holder can edit (audit F-13). An
    // account holding several roles is taken at its widest staff role; one
    // holding none gets the student branch, which needs a student_id and
    // reads only what RLS shows it.
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const held = new Set((roleRows ?? []).map((r: { role: string }) => String(r.role)));
    const userRole = held.has("admin") ? "admin" : held.has("teacher") ? "teacher" : "student";
    
    let query = supabase
      .from("homeworks")
      .select("id,title,due_date,class_id,classes!inner(id,name),homework_submissions(id,status,student_id,submitted_at,graded_at)")
      .gte("due_date", from)
      .lt("due_date", toExclusive);

    // Filter based on user role
    if (userRole === "student") {
      // Students see assignments from their enrolled classes with their own submissions
      const studentId = url.searchParams.get("student_id");
      if (!studentId) throw new Error("student_id parameter required for student users");
      
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", studentId)
        .is("end_date", null);
      
      const classIds = enrollments?.map(e => e.class_id) || [];
      if (classIds.length === 0) {
        return json({ from, to, items: [], days: [] }, 200, req.headers);
      }
      
      // Note: Cannot filter nested relations with .eq(), will filter in mapping step
      query = query.in("class_id", classIds);
    } else if (userRole === "teacher") {
      // Teachers see assignments from their classes with all submissions
      const classIdParam = url.searchParams.get("class_id");
      
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!teacher) throw new Error("Teacher not found");
      
      // If specific class_id provided, filter by that
      if (classIdParam && classIdParam !== "all") {
        query = query.eq("class_id", classIdParam);
      } else {
        // Otherwise get all classes the teacher teaches
        const { data: sessions } = await supabase
          .from("sessions")
          .select("class_id")
          .eq("teacher_id", teacher.id);
        
        const classIds = [...new Set(sessions?.map(s => s.class_id) || [])];
        if (classIds.length === 0) {
          return json({ from, to, items: [], days: [] }, 200, req.headers);
        }
        
        query = query.in("class_id", classIds);
      }
    }
    // Admin sees all assignments with all submissions (no additional filter needed)

    const { data, error } = await query.order("due_date", { ascending: true });

    if (error) {
      console.error("[assignment-calendar] query error:", error);
      throw error;
    }

    // Map to items format - classes comes as array but we need single object
    const studentIdParam = url.searchParams.get("student_id");
    console.log("[assignment-calendar] Filtering for studentId:", studentIdParam, "role:", userRole);
    
    const items = (data ?? []).map((row: any) => {
      // Strictly filter submissions for ONLY this student
      const filteredSubmissions = (row.homework_submissions || []).filter((sub: any) => {
        const matches = userRole === "student" ? sub.student_id === studentIdParam : true;
        return matches;
      });

      return {
        id: row.id,
        title: row.title,
        due_date: row.due_date,
        class_id: row.class_id,
        classes: row.classes?.[0] || null,
        homework_submissions: filteredSubmissions
      };
    }) as Row[];

    console.log("[assignment-calendar] Returning", items.length, "items for student:", studentIdParam);

    // optional day buckets for full-month ranges
    const firstOfMonth = from.endsWith("-01");
    const isMonthRange = firstOfMonth && addDaysUTC(parseISODateUTC(to), 1) === toExclusive;
    const dayIndex: Record<string, Row[]> = {};
    if (isMonthRange) {
      const y = Number(from.slice(0, 4));
      const m = Number(from.slice(5, 7));
      for (let d = 1; d <= daysInMonth; d++) dayIndex[fmtDate(y, m, d)] = [];
    }
    for (const r of items) {
      const key = r.due_date?.slice(0, 10) ?? null;
      if (!key || !isISODate(key)) continue;
      (dayIndex[key] ??= []).push(r);
    }
    const days = Object.keys(dayIndex)
      .sort()
      .map((date) => ({ date, items: dayIndex[date], count: dayIndex[date].length }));

    return json({ from, to, items, days }, 200, req.headers);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400, req.headers);
  }
});
