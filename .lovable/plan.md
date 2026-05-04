# Optimize `class-leaderboard` for latency

## Note on inventory

The brief mentions 9 queries across `attendance`, `point_transactions`, `homework_submissions`. The actual file does **not** query those tables — it queries 9 times across 6 tables: `teachers`, `classes`, `sessions`, `students`, `enrollments` (×3), `families`, `student_points`. The plan below targets the real file. Confirm if a different revision was intended.

## 1. Dependency graph

| # | Line | Table | Filter | Depends on |
|---|------|-------|--------|------------|
| 1 | 56  | `teachers` | `user_id = user.id` | user, classId |
| 2 | 65  | `classes` | `id = classId AND default_teacher_id = teacher.id` | #1 |
| 3 | 78  | `sessions` | `class_id = classId AND teacher_id = teacher.id` | #1 |
| 4 | 93  | `students` | `linked_user_id = user.id` | user |
| 5 | 102 | `enrollments` | `student_id = student.id AND class_id = classId` | #4 |
| 6 | 121 | `families` | `primary_user_id = user.id` | user |
| 7 | 129 | `enrollments` (family) | `class_id = classId AND students.family_id = family.id` | #6 |
| 8 | 154 | `enrollments` (main) | `class_id = classId AND end_date IS NULL` | classId only |
| 9 | 179 | `student_points` | `class_id, month, student_id IN (...)` | #8 |

Key observation: the three identity lookups (#1, #4, #6) all key off `user.id` and are independent. The main leaderboard fetch (#8) only needs `classId`, so it can run alongside auth instead of after it.

## 2. Wave plan

```text
Wave 1 (parallel, 4 queries):
  - teachers           (#1)
  - students           (#4)
  - families           (#6)
  - enrollments main   (#8)   ← speculatively prefetch; we always need it on success

Wave 2 (parallel, up to 4 queries — only run the branches whose Wave 1 hit):
  - classes            (#2)   if teacher found
  - sessions           (#3)   if teacher found
  - enrollments student(#5)   if student found
  - enrollments family (#7)   if family found
  - student_points     (#9)   uses studentIds from Wave 1's main enrollments

Then: evaluate isAuthorized exactly as today; if false → 403.
Combine + sort + rank unchanged.
```

Notes:
- Teacher auth originally short-circuited #2 then #3. Running both in parallel is safe — `isAuthorized` becomes `!!classData || (teacherSession?.length > 0)`, identical outcome.
- `student_points` runs in Wave 2 alongside the secondary auth checks, hiding its latency behind them. It needs only `studentIds` from #8 (Wave 1), not auth success.
- If `Promise.all` rejects in Wave 1 or 2, the existing `try/catch` returns the same 500. Per-query `error` fields are still inspected and logged identically (e.g. `enrollError` → 500 "Failed to fetch enrollments"; `pointsError` → log only).
- Speculative prefetch wastes one query when auth fails, but auth failure is the rare path; the optimization targets the success path.

## 3. Proposed diff (sketch)

```ts
// ----- Wave 1: identity lookups + main enrollments, all in parallel -----
const [teacherRes, userStudentRes, familyRes, enrollmentsRes] = await Promise.all([
  adminClient.from("teachers")
    .select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
  adminClient.from("students")
    .select("id, family_id").eq("linked_user_id", user.id).maybeSingle(),
  adminClient.from("families")
    .select("id").eq("primary_user_id", user.id).maybeSingle(),
  adminClient.from("enrollments")
    .select(`id, student_id, students ( id, full_name, avatar_url )`)
    .eq("class_id", classId).is("end_date", null),
]);

const teacher = teacherRes.data;
const userStudent = userStudentRes.data;
const family = familyRes.data;
const { data: enrollments, error: enrollError } = enrollmentsRes;

if (enrollError) {
  console.error("Error fetching enrollments:", enrollError);
  return new Response(JSON.stringify({ error: "Failed to fetch enrollments" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const studentIds = enrollments?.map(e => e.student_id) || [];

// ----- Wave 2: secondary auth checks + points, all in parallel -----
const [classRes, teacherSessionRes, studentEnrollRes, familyEnrollRes, pointsRes] =
  await Promise.all([
    teacher
      ? adminClient.from("classes").select("id")
          .eq("id", classId).eq("default_teacher_id", teacher.id).maybeSingle()
      : Promise.resolve({ data: null }),
    teacher
      ? adminClient.from("sessions").select("id")
          .eq("class_id", classId).eq("teacher_id", teacher.id).limit(1)
      : Promise.resolve({ data: null }),
    userStudent
      ? adminClient.from("enrollments").select("id, end_date")
          .eq("student_id", userStudent.id).eq("class_id", classId).limit(1)
      : Promise.resolve({ data: null }),
    family
      ? adminClient.from("enrollments")
          .select("id, student_id, end_date, students!inner(family_id)")
          .eq("class_id", classId).eq("students.family_id", family.id).limit(1)
      : Promise.resolve({ data: null }),
    studentIds.length
      ? adminClient.from("student_points")
          .select("student_id, participation_points, homework_points, total_points")
          .eq("class_id", classId).eq("month", month).in("student_id", studentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

// ----- Evaluate authorization (same logic, just no awaits) -----
let isAuthorized = false;
let currentStudentId: string | null = null;

if (teacher) {
  if ((classRes as any).data) isAuthorized = true;
  if (!isAuthorized && (teacherSessionRes as any).data?.length > 0) isAuthorized = true;
}
if (!isAuthorized && userStudent) {
  currentStudentId = userStudent.id;
  const enr = (studentEnrollRes as any).data?.[0];
  if (enr && (!enr.end_date || new Date(enr.end_date) >= new Date())) isAuthorized = true;
}
if (!isAuthorized && family) {
  const enr = (familyEnrollRes as any).data?.[0];
  if (enr && (!enr.end_date || new Date(enr.end_date) >= new Date())) {
    isAuthorized = true;
    currentStudentId = enr.student_id;
  }
}

if (!isAuthorized) {
  return new Response(JSON.stringify({ error: "Not enrolled in this class" }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const { data: points, error: pointsError } = pointsRes as any;
if (pointsError) console.error("Error fetching points:", pointsError);

// ... rest (pointsMap, leaderboard map+sort+rank) is UNCHANGED
```

Behavioral notes:
- `.single()` on auth lookups changed to `.maybeSingle()` to avoid throwing on "no rows" (current code relied on the `data` being null silently — `.single()` returns an error in PostgREST when 0 rows; pre-existing behavior is preserved by `.maybeSingle()`).
- Sort/tie-break/rank math at lines 211–220 is untouched.
- Response shape `{ leaderboard, currentStudentId }` unchanged.
- Auth precedence (teacher → student → family) preserved by the if-chain even though queries run in parallel.

## 4. Latency estimate

Assume ~120ms per round-trip from edge runtime to Postgres.

- **Before** (success path, family branch): up to 9 sequential queries → ~1,080ms.
- **Before** (typical teacher path): 5 sequential queries → ~600ms.
- **After**: 2 waves regardless of path → **~240ms** (~75–80% reduction on the slowest path).

The unauthorized path costs one extra speculative `enrollments` fetch (~120ms wasted), which is acceptable given it's the rare case.

## Out of scope

- No SQL, RLS, or schema changes.
- No edge function deployment in this plan — switch to Agent mode to apply.
