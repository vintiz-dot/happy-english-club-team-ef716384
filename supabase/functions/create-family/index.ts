import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { requireRole } from '../_lib/auth.ts';
import { callerClient, fail, guardError, json, readReason } from '../_lib/session-guard.ts';
import { moneyConfirm, moneyPreview, readAck } from '../_lib/money-guard.ts';

// Creates a family, its children and their enrolments in one request.
//
// D4 step 3B (docs/evidence/D4-design.md b.5): the LANE is the admin's own
// JWT. Every row is written on a client built from the caller's
// Authorization header; the service key only resolves who is calling.
//
// An enrolment is a money input, and the start date comes from the form. So:
//   1. BEFORE ANYTHING IS CREATED every enrolment is previewed as the caller
//      (money_change_preview 'enrollment' / 'enroll_new'). A missing guard is
//      503 with nothing created.
//   2. All tier 0 (a child joining today, or later): family, children and
//      enrolments are created; each enrolment still leaves one
//      money_change_overrides row.
//   3. Any tier 1+ (a start date in a past month the class was taught)
//      without `ack {reason, confirm, token}`: 409 preview_required with the
//      preview, NOTHING created. The screen shows one dialog and sends the
//      same request again with the ack. With it: family and children are
//      created, then each enrolment through money_change_checked.
// If an enrolment is refused AFTER the family exists (something moved in
// between), the family and children stay and the answer lists what was not
// enrolled - it is never reported as a failed creation.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to convert empty strings to undefined
const emptyStringToUndefined = (val: unknown) =>
  (val === '' || val === null) ? undefined : val;

// Validation schemas
const EnrollmentSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD').transform(emptyStringToUndefined).optional(),
  discountType: z.enum(['percent', 'amount']).optional(),
  discountValue: z.number().int().positive().optional(),
  discountCadence: z.enum(['monthly', 'yearly', 'once']).optional()
});

const StudentSchema = z.object({
  fullName: z.string().min(1, 'Name required').max(200),
  email: z.preprocess(emptyStringToUndefined, z.union([z.string().email('Invalid email').max(255), z.undefined()])),
  phone: z.preprocess(emptyStringToUndefined, z.union([z.string().max(20), z.undefined()])),
  dateOfBirth: z.preprocess(emptyStringToUndefined, z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD'), z.undefined()])),
  notes: z.preprocess(emptyStringToUndefined, z.union([z.string().max(1000), z.undefined()])),
  enrollments: z.array(EnrollmentSchema).optional()
});

const FamilySchema = z.object({
  name: z.string().min(1, 'Family name required').max(200),
  email: z.preprocess(emptyStringToUndefined, z.union([z.string().email('Invalid email').max(255), z.undefined()])),
  phone: z.preprocess(emptyStringToUndefined, z.union([z.string().max(20), z.undefined()])),
  address: z.preprocess(emptyStringToUndefined, z.union([z.string().max(500), z.undefined()])),
  primaryUserId: z.string().uuid('Invalid user ID').optional(),
  students: z.array(StudentSchema).optional(),
  ack: z.object({
    reason: z.string().max(1000).optional().nullable(),
    token: z.string().max(200).optional().nullable(),
    confirm: z.boolean().optional(),
    correction_reason: z.string().max(1000).optional().nullable(),
  }).optional(),
});

/** One token for the whole request: the sha256 of every enrolment's own preview token, in order. */
async function digest(tokens: string[]): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tokens.join('|'))));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Admins only, with their own session: a service-key caller has no person to write as.
    const gate = await requireRole(req, service as any, ['admin'], corsHeaders, { allowServiceRole: false });
    if (gate instanceof Response) return gate;
    const user = { id: gate.userId };
    const asCaller = callerClient(createClient, url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', req.headers.get('Authorization')!);

    // Validate input with Zod
    const parsed = FamilySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid request' }, 400);
    }
    const { name, email, phone, address, primaryUserId, students } = parsed.data;

    // ---- 1. preview every enrolment, as the caller, before anything exists
    const today = new Date().toISOString().split('T')[0];
    const items: Array<{ si: number; ei: number; args: Record<string, unknown>; plan: any }> = [];
    for (const [si, student] of (students ?? []).entries()) {
      for (const [ei, enrollment] of (student.enrollments ?? []).entries()) {
        const args: Record<string, unknown> = { class_id: enrollment.classId, start_date: enrollment.startDate || today };
        if (enrollment.discountType && enrollment.discountValue && enrollment.discountCadence) {
          args.discount_type = enrollment.discountType;
          args.discount_value = enrollment.discountValue;
          args.discount_cadence = enrollment.discountCadence;
        }
        const p = await moneyPreview(asCaller, 'enrollment', 'enroll_new', args);
        if ('error' in p) return fail(p.error);            // nothing created (503 when the guard is not installed)
        if (!p.data?.allowed) {
          return fail(guardError(400, p.data?.refuse_code ?? 'refused',
            `The enrolment of ${student.fullName} cannot be created as entered (${p.data?.refuse_code ?? 'refused'}).`),
            { student_index: si, enrollment_index: ei });
        }
        items.push({ si, ei, args, plan: p.data });
      }
    }
    const tier = items.reduce((t, i) => Math.max(t, Number(i.plan.tier ?? 3)), 0);
    const token = await digest(items.map((i) => String(i.plan.token ?? '')));
    const preview = {
      entity: 'enrollment', op: 'enroll_new', tier, allowed: true, token,
      requires: { reason_min: 15, reason: tier >= 1, confirm: tier >= 1, correction_reason: tier === 3 },
      review_required: items.some((i) => i.plan.review_required === true),
      approval: { required: items.some((i) => i.plan.approval?.required === true), reasons: [] },
      items: items.map((i) => ({
        student_index: i.si, enrollment_index: i.ei, student_name: students![i.si].fullName,
        class_id: i.args.class_id, start_date: i.args.start_date, tier: i.plan.tier,
      })),
    };
    const ack = readAck(parsed.data.ack);
    if (tier >= 1) {
      if (!ack) {
        return json({
          ok: false, code: 'preview_required', message_key: 'moneyGuard.error.preview_required',
          message: 'A start date is in a month that was already taught. Give a reason to create the family with these enrolments.',
          preview,
        }, 409);
      }
      if (ack.token !== token) {
        return fail(guardError(409, 'token_stale', 'Something changed since the preview. Check it and confirm again.'), { preview });
      }
      const reason = readReason(ack.reason);
      if ('error' in reason) return fail(reason.error, { preview });
      if (ack.confirm !== true) return fail(guardError(422, 'confirm_required', 'Tick the confirmation first.'), { preview });
      if (tier === 3) {
        const corr = readReason(ack.correction_reason, 'correction_reason');
        if ('error' in corr) return fail(corr.error, { preview });
      }
      if (preview.approval.required) {
        return fail(guardError(409, 'approval_required', 'This needs a second administrator. Create the family first, then enrol from the enrolment screen.'), { preview });
      }
    }

    // ---- 2. the family and the children, on the caller's own client
    const { data: family, error: familyError } = await asCaller
      .from('families')
      .insert([
        {
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          primary_user_id: primaryUserId || null,
          created_by: user.id,
          updated_by: user.id,
        },
      ])
      .select()
      .single()

    if (familyError) {
      console.error('Error creating family:', familyError)
      throw familyError
    }

    console.log('Family created successfully:', family.id)

    const createdStudents: any[] = []
    const enrolled: any[] = []
    const enrollmentErrors: any[] = []
    for (const [si, student] of (students ?? []).entries()) {
      const { data: newStudent, error: studentError } = await asCaller
        .from('students')
        .insert([
          {
            full_name: student.fullName,
            email: student.email || null,
            phone: student.phone || null,
            date_of_birth: student.dateOfBirth || null,
            family_id: family.id,
            notes: student.notes || null,
            created_by: user.id,
            updated_by: user.id,
          },
        ])
        .select()
        .single()

      if (studentError) {
        console.error('Error creating student:', studentError)
        throw studentError
      }
      createdStudents.push(newStudent)

      // ---- 3. the enrolments, through the checked path, as the caller
      for (const item of items.filter((i) => i.si === si)) {
        const args = { ...item.args, student_id: newStudent.id };
        const p = await moneyPreview(asCaller, 'enrollment', 'enroll_new', args);
        const r = 'error' in p ? p : await moneyConfirm(asCaller, 'enrollment', 'enroll_new', args, {
          reason: ack?.reason ?? null, token: p.data?.token ?? null, confirm: ack?.confirm === true,
          correction_reason: ack?.correction_reason ?? null,
        }, { source: 'create-family' });
        if ('error' in r) {
          enrollmentErrors.push({ student_id: newStudent.id, student_name: student.fullName, class_id: item.args.class_id,
                                  code: r.error.code, message: r.error.message });
        } else {
          enrolled.push({ student_id: newStudent.id, class_id: item.args.class_id, override_id: r.data?.override_id ?? null,
                          tier: r.data?.tier ?? null });
        }
      }
    }

    return json({
      family, students: createdStudents, enrollments: enrolled,
      // the family exists: what follows is a warning, not a failed creation
      partial: enrollmentErrors.length > 0, enrollment_errors: enrollmentErrors,
    });

  } catch (error) {
    console.error('Error in create-family function:', error)
    const errorMessage = error instanceof Error ? error.message : (error as any)?.message ?? 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
