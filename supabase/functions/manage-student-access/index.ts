/**
 * manage-student-access — front-desk account recovery (ADMIN SIDE).
 * ==================================================================
 * Families forget their password AND which email they used, so every
 * email-based recovery path is useless to them. This re-anchors identity on
 * the STUDENT record, which the school always has.
 *
 * One admin action ("issue") covers both cases:
 *   - student has no account  → create it, link it (and their siblings), and
 *                               issue a claim code
 *   - student forgot everything → issue a fresh claim code and kill sessions
 * The admin never needs to know which case they are in, and never sees or
 * chooses a password.
 *
 * SECURITY MODEL — read before touching anything:
 *
 *   1. ADMIN ONLY. verify_jwt merely proves the caller is signed in; the
 *      admin role is checked here, from the JWT, never from the body.
 *
 *   2. STUDENTS AND FAMILIES ONLY, ENFORCED. This function refuses to touch
 *      any account holding `admin` or `teacher`. A front-desk recovery path
 *      that can reset a staff password is a privilege-escalation backdoor —
 *      exactly the class of hole that the demo-account incident opened.
 *      Staff keep ordinary email-based reset.
 *
 *   3. THE CODE IS NEVER STORED. Only its SHA-256 hash is persisted. The
 *      plaintext is returned to the issuing admin exactly once, for the
 *      printed card, and cannot be recovered afterwards — reissue instead.
 *
 *   4. ONE LIVE CODE PER STUDENT. Issuing revokes any previous live code, so
 *      an old card found in a drawer stops working the moment a new one is
 *      printed.
 *
 *   5. EVERYTHING IS AUDITED. Issue, revoke and the identity of the actor
 *      all land in audit_log.
 *
 * Actions: search | status | issue | revoke
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { authenticateUser } from "../_lib/auth.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_lib/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Crockford base32 minus I, L, O and U: nothing that can be misread on a
 *  printed card or misheard over the phone. 32 symbols = 5 bits each. */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 10;              // 50 bits of entropy
const DEFAULT_TTL_HOURS = 72;
const MAX_TTL_HOURS = 24 * 14;

/** Roles that must never be recoverable through the front desk. */
const FORBIDDEN_ROLES = ["admin", "teacher"];

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/** Display form: XXXXX-XXXXX. Easier to read aloud and to type. */
function formatCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export async function hashCode(code: string): Promise<string> {
  const normalised = normaliseCode(code);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalised),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Forgiving normalisation: strip separators and uppercase, then fold the
 * lookalikes onto the character actually used.
 *
 * CRITICAL: only characters ABSENT from CODE_ALPHABET may be remapped. O, I,
 * L and U are excluded from the alphabet precisely so that a misread 0/1/V
 * can be folded back safely. Q must NOT be folded — it IS in the alphabet,
 * so mapping Q→0 would mangle real codes and let two distinct codes collide
 * on one hash.
 */
export function normaliseCode(input: string): string {
  return String(input || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/U/g, "V");
}

/** Strip Vietnamese diacritics so "Nguyễn Thị Hạnh" → "nguyen thi hanh". */
function deaccent(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Build the default login handle from the student's given name.
 *
 * The owner chose `firstname@firstname.com` because it is trivially
 * memorable for a child. NOTE: those domains are not owned by the school,
 * so nothing may ever be MAILED to them — accounts are created
 * pre-confirmed and students.has_synthetic_login is set so the sign-in page
 * refuses "forgot password" for them. An admin can override the address at
 * issue time when a family does have a real mailbox.
 *
 * Vietnamese names are written family-name-first, so the GIVEN name — the
 * one a child answers to — is the last word.
 */
function defaultHandle(fullName: string): { local: string; email: string } {
  const cleaned = deaccent(fullName).toLowerCase().replace(/[^a-z\s]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const given = parts.length ? parts[parts.length - 1] : "student";
  const local = given.slice(0, 20) || "student";
  return { local, email: `${local}@${local}.com` };
}

/**
 * Create the account, working around name collisions: hanh@hanh.com,
 * hanh2@hanh.com, hanh3@hanh.com, …
 *
 * Uniqueness is decided by letting createUser FAIL rather than by scanning
 * the user list first. Scanning is both racy and wrong — listUsers is
 * paginated, so a pre-check would silently miss anyone past the first page
 * and happily mint a duplicate. Postgres already enforces the constraint;
 * this just walks until it stops complaining.
 */
async function createAccountWithHandle(
  sb: SupabaseClient,
  base: string,
  studentName: string,
): Promise<{ userId: string; email: string }> {
  let lastError = "could not create the account";

  for (let n = 1; n <= 50; n++) {
    const local = n === 1 ? base : `${base}${n}`;
    const email = `${local}@${base}.com`;

    const { data, error } = await sb.auth.admin.createUser({
      email,
      // A long random password nobody ever sees. The account stays unusable
      // until the family redeems their code and chooses their own.
      password: crypto.randomUUID() + crypto.randomUUID(),
      // Skips the confirmation mail entirely — essential, because this
      // domain is not owned by the school and nothing may be delivered there.
      email_confirm: true,
      user_metadata: { created_by_front_desk: true, student_name: studentName },
    });

    if (data?.user) return { userId: data.user.id, email };

    lastError = error?.message || lastError;
    const taken = /already|registered|exists|duplicate/i.test(lastError);
    if (!taken) throw new Error(lastError);   // a real failure, not a clash
  }

  throw new Error(lastError);
}

/** Roles held by a user. Never .single() — multi-role users are normal. */
async function rolesOf(sb: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  return (data || []).map((r: any) => String(r.role));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const caller = await authenticateUser(req, sb);
    if (!caller) return respond({ success: false, error: "Unauthorized" }, 401);
    if (!(caller.isServiceRole || caller.roles.has("admin"))) {
      console.warn(`manage-student-access denied for ${caller.userId}`);
      return respond({ success: false, error: "Forbidden — admins only" }, 403);
    }

    // Issuing credentials in bulk is a signal worth throttling.
    const rl = checkRateLimit(caller.userId, 60, 60_000, "user");
    if (rl.limited) return rateLimitResponse(rl.resetAt, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "").trim();

    // ── search: find a student by name, fast, diacritic-insensitive ────
    if (action === "search") {
      const q = String(body.query ?? "").trim();
      if (q.length < 2) return respond({ success: true, students: [] });

      const { data, error } = await sb
        .from("students")
        .select("id, full_name, is_active, linked_user_id, has_synthetic_login, family_id")
        .ilike("full_name", `%${q}%`)
        .eq("is_active", true)
        .order("full_name")
        .limit(25);
      if (error) throw new Error(error.message);

      // Enrich with class names and whether an account exists, so the admin
      // can tell two children with the same name apart at a glance.
      const ids = (data || []).map((s: any) => s.id);
      const classByStudent: Record<string, string[]> = {};
      if (ids.length) {
        const { data: enr } = await sb
          .from("enrollments")
          .select("student_id, classes(name)")
          .in("student_id", ids);
        for (const e of enr || []) {
          const name = (e as any).classes?.name;
          if (!name) continue;
          (classByStudent[(e as any).student_id] ||= []).push(name);
        }
      }

      const emailByUser: Record<string, string> = {};
      const userIds = [...new Set((data || []).map((s: any) => s.linked_user_id).filter(Boolean))];
      for (const uid of userIds) {
        const { data: u } = await sb.auth.admin.getUserById(uid as string);
        if (u?.user?.email) emailByUser[uid as string] = u.user.email;
      }

      return respond({
        success: true,
        students: (data || []).map((s: any) => ({
          id: s.id,
          full_name: s.full_name,
          classes: classByStudent[s.id] || [],
          has_account: !!s.linked_user_id,
          login_email: s.linked_user_id ? emailByUser[s.linked_user_id] ?? null : null,
          has_synthetic_login: !!s.has_synthetic_login,
        })),
      });
    }

    // ── status: what would happen if I pressed Issue? ──────────────────
    if (action === "status") {
      const studentId = String(body.student_id ?? "").trim();
      if (!studentId) return respond({ success: false, error: "student_id is required" }, 400);

      const { data: student } = await sb
        .from("students")
        .select("id, full_name, family_id, linked_user_id, has_synthetic_login")
        .eq("id", studentId)
        .maybeSingle();
      if (!student) return respond({ success: false, error: "Student not found" }, 404);

      // Siblings share one login, so the card covers all of them. Saying so
      // stops staff issuing three cards to one parent.
      let siblings: string[] = [];
      if (student.family_id) {
        const { data: sib } = await sb
          .from("students")
          .select("full_name")
          .eq("family_id", student.family_id)
          .eq("is_active", true)
          .neq("id", studentId);
        siblings = (sib || []).map((s: any) => s.full_name);
      }

      let loginEmail: string | null = null;
      let blockedBy: string[] = [];
      if (student.linked_user_id) {
        const { data: u } = await sb.auth.admin.getUserById(student.linked_user_id);
        loginEmail = u?.user?.email ?? null;
        blockedBy = (await rolesOf(sb, student.linked_user_id))
          .filter((r) => FORBIDDEN_ROLES.includes(r));
      }

      const { data: live } = await sb
        .from("student_access_codes")
        .select("id, expires_at, created_at")
        .eq("student_id", studentId)
        .is("used_at", null)
        .is("revoked_at", null)
        .maybeSingle();

      return respond({
        success: true,
        student: { id: student.id, full_name: student.full_name },
        has_account: !!student.linked_user_id,
        login_email: loginEmail,
        suggested_email: student.linked_user_id ? loginEmail : defaultHandle(student.full_name).email,
        siblings,
        // A live code is not the plaintext — only the fact one is outstanding.
        outstanding_code: live ? { issued_at: live.created_at, expires_at: live.expires_at } : null,
        blocked: blockedBy.length > 0,
        blocked_reason: blockedBy.length
          ? `This account holds the ${blockedBy.join(" and ")} role. Staff accounts cannot be recovered from the front desk — use email password reset.`
          : null,
      });
    }

    // ── issue: the one button ──────────────────────────────────────────
    if (action === "issue") {
      const studentId = String(body.student_id ?? "").trim();
      if (!studentId) return respond({ success: false, error: "student_id is required" }, 400);

      const ttlHours = Math.min(
        Math.max(Number(body.ttl_hours) || DEFAULT_TTL_HOURS, 1),
        MAX_TTL_HOURS,
      );

      const { data: student } = await sb
        .from("students")
        .select("id, full_name, family_id, linked_user_id")
        .eq("id", studentId)
        .maybeSingle();
      if (!student) return respond({ success: false, error: "Student not found" }, 404);

      let userId = student.linked_user_id as string | null;
      let loginEmail: string;
      let createdAccount = false;

      // An admin may override the address when the family has a real mailbox.
      const overrideEmail = String(body.login_email ?? "").trim().toLowerCase();
      if (overrideEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(overrideEmail)) {
        return respond({ success: false, error: "That email address is not valid" }, 400);
      }

      if (userId) {
        // ── Existing account. Refuse outright if it is staff. ──────────
        const roles = await rolesOf(sb, userId);
        const forbidden = roles.filter((r) => FORBIDDEN_ROLES.includes(r));
        if (forbidden.length) {
          console.warn(`refused front-desk recovery for staff account ${userId}`);
          return respond({
            success: false,
            error: `This account holds the ${forbidden.join(" and ")} role. Staff accounts cannot be recovered from the front desk — use email password reset.`,
          }, 403);
        }

        const { data: u } = await sb.auth.admin.getUserById(userId);
        loginEmail = overrideEmail || u?.user?.email || defaultHandle(student.full_name).email;

        if (overrideEmail && overrideEmail !== (u?.user?.email || "").toLowerCase()) {
          const { error: upErr } = await sb.auth.admin.updateUserById(userId, {
            email: overrideEmail,
            email_confirm: true,
          });
          if (upErr) return respond({ success: false, error: `Could not set that email: ${upErr.message}` }, 400);
        }
      } else {
        // ── No account yet: create one, pre-confirmed. ─────────────────
        const base = defaultHandle(student.full_name);
        try {
          if (overrideEmail) {
            const { data: created, error: createErr } = await sb.auth.admin.createUser({
              email: overrideEmail,
              password: crypto.randomUUID() + crypto.randomUUID(),
              email_confirm: true,
              user_metadata: { created_by_front_desk: true, student_name: student.full_name },
            });
            if (createErr || !created?.user) {
              return respond(
                { success: false, error: createErr?.message || "Could not create the account" },
                400,
              );
            }
            userId = created.user.id;
            loginEmail = overrideEmail;
          } else {
            const made = await createAccountWithHandle(sb, base.local, student.full_name);
            userId = made.userId;
            loginEmail = made.email;
          }
        } catch (e) {
          return respond({ success: false, error: (e as Error).message }, 400);
        }
        createdAccount = true;

        // Link this student and every sibling to the new login, and give it
        // the student role. Reuses the established linking behaviour.
        await sb.from("students").update({ linked_user_id: userId }).eq("id", studentId);
        if (student.family_id) {
          await sb.from("students")
            .update({ linked_user_id: userId })
            .eq("family_id", student.family_id)
            .eq("is_active", true);
        }
        await sb.from("user_roles")
          .upsert({ user_id: userId, role: "student" }, { onConflict: "user_id,role" });

        // Adopt any vocabulary scanned for these children before they had a
        // login (see claim_vocab_for_student).
        const { data: linked } = await sb
          .from("students").select("id").eq("linked_user_id", userId);
        for (const s of linked || []) {
          await sb.rpc("claim_vocab_for_student", { p_student_id: s.id, p_user_id: userId })
            .then(() => {}, () => {});
        }
      }

      // Mark whether this login can ever receive mail.
      const synthetic = !overrideEmail;
      await sb.from("students")
        .update({ has_synthetic_login: synthetic })
        .eq("linked_user_id", userId);

      // Any card already in circulation stops working now.
      await sb.from("student_access_codes")
        .update({ revoked_at: new Date().toISOString() })
        .eq("student_id", studentId)
        .is("used_at", null)
        .is("revoked_at", null);

      const code = generateCode();
      const expiresAt = new Date(Date.now() + ttlHours * 3600_000).toISOString();
      const { error: insErr } = await sb.from("student_access_codes").insert({
        student_id: studentId,
        user_id: userId,
        code_hash: await hashCode(code),
        login_email: loginEmail,
        expires_at: expiresAt,
        created_by: caller.userId,
      });
      if (insErr) return respond({ success: false, error: insErr.message }, 500);

      await sb.from("audit_log").insert({
        actor_user_id: caller.userId,
        action: createdAccount ? "front_desk_create_and_issue" : "front_desk_issue_code",
        entity: "student",
        entity_id: studentId,
        diff: {
          student_name: student.full_name,
          login_email: loginEmail,
          synthetic_login: synthetic,
          expires_at: expiresAt,
          ip: getClientIP(req),
        },
      });

      // Siblings covered by the same login, for the printed card.
      let siblings: string[] = [];
      if (student.family_id) {
        const { data: sib } = await sb
          .from("students").select("full_name")
          .eq("family_id", student.family_id)
          .eq("is_active", true)
          .neq("id", studentId);
        siblings = (sib || []).map((s: any) => s.full_name);
      }

      // The ONLY time the plaintext code exists outside the family's hands.
      return respond({
        success: true,
        created_account: createdAccount,
        student_name: student.full_name,
        login_email: loginEmail,
        code: formatCode(code),
        expires_at: expiresAt,
        siblings,
      });
    }

    // ── revoke: kill an outstanding card ───────────────────────────────
    if (action === "revoke") {
      const studentId = String(body.student_id ?? "").trim();
      if (!studentId) return respond({ success: false, error: "student_id is required" }, 400);

      const { error } = await sb.from("student_access_codes")
        .update({ revoked_at: new Date().toISOString() })
        .eq("student_id", studentId)
        .is("used_at", null)
        .is("revoked_at", null);
      if (error) throw new Error(error.message);

      await sb.from("audit_log").insert({
        actor_user_id: caller.userId,
        action: "front_desk_revoke_code",
        entity: "student",
        entity_id: studentId,
        diff: { ip: getClientIP(req) },
      });

      return respond({ success: true });
    }

    return respond({ success: false, error: "Unknown action" }, 400);
  } catch (error) {
    console.error("manage-student-access error:", error);
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
