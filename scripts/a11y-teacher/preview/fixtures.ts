// Made-up school data. Invented Vietnamese-style names. No real person. Deterministic.
const pad = (n: number) => String(n).padStart(2, '0');
export const NOW = new Date();
export const Y = NOW.getFullYear();
export const M = NOW.getMonth() + 1;
export const MONTH_START = `${Y}-${pad(M)}-01`;
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const TODAY = iso(NOW);

const names = [
  'Nguyễn Minh Anh', 'Trần Bảo Châu', 'Lê Gia Hân', 'Phạm Đức Khôi', 'Hoàng Thảo Nguyên', 'Vũ Quốc Bảo',
  'Đặng Ngọc Diệp', 'Bùi Anh Tuấn', 'Đỗ Khánh Linh', 'Ngô Hải Đăng', 'Dương Mai Phương', 'Lý Gia Bảo',
];
export const U = { admin: 'u-admin', teacher: 'u-teacher', student: 'u-student', family: 'u-family' };
export const CLASS_A = 'c-0001', CLASS_B = 'c-0002';
export const TEACHER_1 = 't-0001', TEACHER_2 = 't-0002';
export const FAMILY_1 = 'f-0001';
export const sid = (i: number) => `s-${pad(i + 1).padStart(4, '0')}`;

export function buildFixtures() {
  const ts = '2026-01-05T08:00:00Z';
  const students = names.map((full_name, i) => ({
    id: sid(i), full_name, is_active: true, family_id: i < 2 ? FAMILY_1 : null, avatar_url: null, cash_on_hand: 12000 * (i % 4),
    created_at: ts, updated_at: ts, linked_user_id: i === 0 ? U.student : null, email: null, phone: null, status_message: null,
    date_of_birth: `${2014 + (i % 4)}-0${1 + (i % 9)}-1${i % 9}`, sibling_discount_from: null, has_synthetic_login: false,
  }));
  const classes = [
    { id: CLASS_A, name: 'Starters 1 (Mon-Wed)', is_active: true, default_teacher_id: TEACHER_1, session_rate_vnd: 180000, max_students: 12, default_session_length_minutes: 60, leaderboard_style: 'star', economy_mode: false, points_to_cash_rate: 100, schedule_template: [{ day: 1, start: '17:30', end: '18:30' }, { day: 3, start: '17:30', end: '18:30' }], created_at: ts, updated_at: ts, curriculum: 'Pre-A1', typical_start_times: null, visibility_settings: null },
    { id: CLASS_B, name: 'Movers 2 (Tue-Thu)', is_active: true, default_teacher_id: TEACHER_2, session_rate_vnd: 200000, max_students: 12, default_session_length_minutes: 60, leaderboard_style: 'arcade', economy_mode: false, points_to_cash_rate: 100, schedule_template: [{ day: 2, start: '18:00', end: '19:00' }, { day: 4, start: '18:00', end: '19:00' }], created_at: ts, updated_at: ts, curriculum: 'A1', typical_start_times: null, visibility_settings: null },
  ];
  const teachers = [
    { id: TEACHER_1, full_name: 'Trịnh Thu Hà', user_id: U.teacher, is_active: true, hourly_rate_vnd: 250000, per_session_rate_vnd: 250000, pay_rate_type: 'per_session', email: 'ha.teacher@example.test', phone: null, avatar_url: null, bio: null, created_at: ts, updated_at: ts },
    { id: TEACHER_2, full_name: 'Cao Văn Lâm', user_id: null, is_active: true, hourly_rate_vnd: 260000, per_session_rate_vnd: 260000, pay_rate_type: 'per_session', email: null, phone: null, avatar_url: null, bio: null, created_at: ts, updated_at: ts },
  ];
  const enrollments = students.map((s, i) => ({ id: `e-${pad(i + 1)}`, student_id: s.id, class_id: i < 6 ? CLASS_A : CLASS_B, start_date: '2026-01-01', end_date: null, allowed_days: null, discount_type: null, discount_value: null, rate_override_vnd: null, created_at: ts, updated_at: ts }));

  // sessions: every Mon-Wed for A, Tue-Thu for B in the current month up to today+7
  const sessions: any[] = []; const attendance: any[] = []; const participants: any[] = [];
  let sn = 0, an = 0;
  const first = new Date(Y, M - 1, 1);
  for (let d = new Date(first); d.getMonth() === M - 1; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    for (const [cid, days, tid, st, en] of [[CLASS_A, [1, 3], TEACHER_1, '17:30:00', '18:30:00'], [CLASS_B, [2, 4], TEACHER_2, '18:00:00', '19:00:00']] as any[]) {
      if (!days.includes(wd)) continue;
      const past = iso(d) <= TODAY;
      const id = `ses-${String(++sn).padStart(4, '0')}`;
      sessions.push({ id, class_id: cid, teacher_id: tid, date: iso(d), start_time: st, end_time: en, status: past ? 'Held' : 'Scheduled', is_manual: false, manual_reason: null, notes: null, canceled_at: null, canceled_by: null, canceled_reason: null, rate_override_vnd: null, created_at: ts, updated_at: ts });
      participants.push({ id: `sp-${sn}`, session_id: id, participant_type: 'teacher', teacher_id: tid, teaching_assistant_id: null, attended: past, absence_note: null, created_at: ts });
      if (past) for (const e of enrollments.filter(e => e.class_id === cid)) attendance.push({ id: `a-${++an}`, session_id: id, student_id: e.student_id, status: (an % 9 === 0) ? 'Absent' : 'Present', notes: null, marked_at: ts, marked_by: null, created_at: ts, updated_at: ts });
    }
  }
  const month = MONTH_START;
  const invoices = students.map((s, i) => ({ id: `inv-${pad(i + 1)}`, student_id: s.id, month, number: `HEC-${Y}${pad(M)}-${pad(i + 1)}`, base_amount: 1440000 + (i % 2) * 160000, discount_amount: i < 2 ? 144000 : 0, total_amount: 1440000 + (i % 2) * 160000 - (i < 2 ? 144000 : 0), paid_amount: i % 3 === 0 ? 1296000 : 0, recorded_payment: i % 3 === 0 ? 1296000 : 0, status: i % 3 === 0 ? 'paid' : 'issued', tuition_frozen: false, class_breakdown: null, carry_in_credit: 0, carry_in_debt: 0, carry_out_credit: 0, carry_out_debt: 0, review_flags: null, confirmation_status: null, confirmed_at: null, confirmed_by: null, confirmation_notes: null, frozen_reason: null, pdf_storage_key: null, created_at: ts, updated_at: ts }));
  const payments = students.filter((_, i) => i % 3 === 0).map((s, i) => ({ id: `p-${i + 1}`, student_id: s.id, family_id: s.family_id, amount: 1296000, method: 'bank_transfer', memo: null, occurred_at: `${Y}-${pad(M)}-03T09:00:00Z`, parent_payment_id: null, created_at: ts }));
  const point_transactions: any[] = []; let pn = 0;
  for (const s of students) for (let k = 0; k < 8; k++) point_transactions.push({ id: `pt-${++pn}`, student_id: s.id, class_id: enrollments.find(e => e.student_id === s.id)!.class_id, points: 1 + ((pn * 7) % 5), type: ['participation', 'homework', 'behavior', 'bonus'][k % 4], month, date: `${Y}-${pad(M)}-${pad(1 + k)}`, notes: null, homework_id: null, homework_title: null, session_id: null, created_at: ts, created_by: null });
  const student_points = students.map((s, i) => ({ id: `sp-${i}`, student_id: s.id, class_id: enrollments[i].class_id, month, total_points: 20 + i * 3 }));
  const homeworks = [CLASS_A, CLASS_B].map((c, i) => ({ id: `h-${i + 1}`, class_id: c, title: i ? 'Unit 4 - My Day (speaking)' : 'Unit 3 - Colours worksheet', body: 'Do the exercises.', due_date: `${Y}-${pad(M)}-${pad(Math.min(28, NOW.getDate() + 3))}`, submission_type: 'file', video_max_seconds: 60, created_at: ts, created_by: null }));
  const user_roles = [
    { id: 'r1', user_id: U.admin, role: 'admin', created_at: ts }, { id: 'r2', user_id: U.teacher, role: 'teacher', created_at: ts },
    { id: 'r3', user_id: U.student, role: 'student', created_at: ts }, { id: 'r4', user_id: U.family, role: 'family', created_at: ts },
  ];
  const families = [{ id: FAMILY_1, name: 'Gia đình Nguyễn', primary_user_id: U.family, is_active: true, email: 'family@example.test', phone: null, address: null, sibling_percent_override: null, created_at: ts, updated_at: ts }];
  const profiles = [{ id: U.student, display_name: names[0], avatar_url: null, cefr_level: 'A1', school_class: null, created_at: ts, updated_at: ts }];
  // ---- A2.1 additions (teacher stability). Still made-up, still no network.
  const flag = (k: string) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
  // fake_live=1: class A has a lesson in progress right now (Live Assessment, HUD attendance).
  // fake_live=0: no lesson is in progress for any class (TeacherLeaderboards' disabled Live button, H7).
  const live = flag('fake_live');
  if (live) for (const s of sessions) if (s.date === TODAY) { s.start_time = '00:00:00'; s.end_time = live === '1' ? '23:59:59' : '00:00:01'; }
  if (live === '1' && !sessions.some((s) => s.date === TODAY && s.class_id === CLASS_A)) {
    const id = 'ses-live-a';
    sessions.push({ id, class_id: CLASS_A, teacher_id: TEACHER_1, date: TODAY, start_time: '00:00:00', end_time: '23:59:59', status: 'Scheduled', is_manual: false, manual_reason: null, notes: null, canceled_at: null, canceled_by: null, canceled_reason: null, rate_override_vnd: null, created_at: ts, updated_at: ts });
    participants.push({ id: 'sp-live-a', session_id: id, participant_type: 'teacher', teacher_id: TEACHER_1, teaching_assistant_id: null, attended: true, absence_note: null, created_at: ts });
    enrollments.filter((e) => e.class_id === CLASS_A).slice(0, 4).forEach((e, k) => attendance.push({ id: `a-live-${k}`, session_id: id, student_id: e.student_id, status: k === 3 ? 'Absent' : 'Present', notes: null, marked_at: ts, marked_by: null, created_at: ts, updated_at: ts }));
  }
  // Points awarded today, so HUD chips carry a "Last engaged N min ago" hint.
  const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
  enrollments.filter((e) => e.class_id === CLASS_A).slice(0, 3).forEach((e, k) => point_transactions.push({ id: `pt-today-${k}`, student_id: e.student_id, class_id: CLASS_A, points: 2, type: 'participation', month, date: TODAY, notes: null, homework_id: null, homework_title: null, session_id: null, created_at: minsAgo(2 + k * 7), created_by: null }));
  // Teacher's books point at the LOCAL stand-in book on a different origin (localhost vs 127.0.0.1).
  const loc: any = typeof location !== 'undefined' ? location : { protocol: 'http:', port: '5321' };
  const bookBase = `${loc.protocol}//localhost:${loc.port}/book.html`;
  const teacher_flipbooks = [
    { id: 'fb-1', title: 'Stand-in book A (Unit 5)', url: `${bookBase}?b=1`, teacher_id: TEACHER_1, class_id: CLASS_A, created_at: '2026-11-02T08:00:00Z', updated_at: '2026-11-02T08:00:00Z' },
    { id: 'fb-2', title: 'Stand-in book B (Phonics)', url: `${bookBase}?b=2`, teacher_id: TEACHER_1, class_id: null, created_at: '2026-10-02T08:00:00Z', updated_at: '2026-10-02T08:00:00Z' },
  ];
  return { students, classes, teachers, enrollments, sessions, attendance, session_participants: participants, invoices, payments, point_transactions, student_points, homeworks, user_roles, families, profiles, teacher_flipbooks };
}
