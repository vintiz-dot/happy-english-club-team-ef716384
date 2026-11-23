// D5: every write path to the money tables, pinned (docs/evidence/D5-audit.md,
// section "Write paths"). A static scan of src/ and supabase/functions/.
//
// What this suite holds:
//   1. THE INVENTORY. Every `.from("<money table>").insert|update|upsert|delete`
//      in the app and the edge functions is in the pinned list below, by file,
//      table and operation. A NEW writer fails here until someone has read it,
//      decided which guard it goes through and added it to the list and to the
//      audit's table; a writer that is GONE fails too, so the list stays true.
//      Writes through a table name held in a variable are pinned the same way.
//   2. Every RPC the app and the functions call is in a pinned list: a new RPC
//      is a new way to change data and is read before it is added.
//   3. Money never written from the browser: no file under src/ writes
//      payments, payment_allocations, ledger_entries, ledger_accounts,
//      payroll_lines, payroll_periods, payroll_summaries, settlements or
//      monthly_finance_snapshots.
//   4. recorded_payment: outside the compare-and-set helper (both copies) and
//      the one insert of a brand-new bill in smart-family-payment, no write
//      payload in TypeScript names recorded_payment; in SQL only the AI
//      action (row-locked) and the past-credit script (compare-and-set) set it.
//   5. invoices.status: every TypeScript file that writes the invoices table
//      with a status takes the label from the one rule (invoice-status /
//      invoiceStatus) - except InvoiceStatusManager's hand-set, pinned as
//      gap G-5.
//   6. No NEW browser pricing: outside src/lib, the pricing functions
//      (sessionPayVnd, totalPayVnd, varianceCostVnd, rateOnDate,
//      datedPayrollTotal, splitPayrollByClass, apportion) are imported only by
//      the files pinned as gap G-8 (being moved to the functions by the
//      browser-pricing task). Removing a file from that list is the fix.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 1500)}` : ''}`);
  value ? pass++ : fail++;
};

const MONEY_TABLES = ['invoices', 'payments', 'payment_allocations', 'ledger_entries', 'ledger_accounts', 'payroll_lines',
  'payroll_periods', 'payroll_summaries', 'payroll_adjustments', 'attendance', 'sessions', 'enrollments', 'expenditures',
  'settlements', 'monthly_finance_snapshots', 'class_fee_history', 'classes', 'discount_assignments', 'discount_definitions',
  'sibling_discount_state', 'session_participants', 'staff_pay_rates', 'referral_bonuses', 'families', 'students',
  'payment_deletions', 'payment_modifications'];

const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules') walk(p); continue; }
    if (/\.(ts|tsx)$/.test(n) && !n.endsWith('.d.ts') && !p.endsWith(join('supabase', 'types.ts'))) files.push(p);
  }
};
walk(join(repo, 'src'));
walk(join(repo, 'supabase', 'functions'));
const rel = (p) => relative(repo, p).replace(/\\/g, '/');
const src = new Map(files.map((f) => [rel(f), readFileSync(f, 'utf8').replace(/\r\n/g, '\n')]));
// Generated from src/lib/mcp by the Vite plugin; its tools are scanned at their source.
src.delete('supabase/functions/mcp/index.ts');

// --------------------------------------------------------------- scanning
const writes = [];      // { file, table, op, at }
const dynamic = [];     // { file, op } writes through a variable table name
for (const [file, text] of src) {
  const re = /\.from\(\s*(["'`])([a-z_]+)\1\s*\)/g; let m;
  while ((m = re.exec(text))) {
    const table = m[2];
    if (!MONEY_TABLES.includes(table)) continue;
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 300);
    const w = /^\s*(?:\/\/[^\n]*\n\s*)*\.(insert|update|upsert|delete)\s*\(/.exec(tail);
    if (w) writes.push({ file, table, op: w[1], at: m.index + m[0].length + w.index });
  }
  const dyn = /\.from\(\s*([A-Za-z_$][\w$.]*)\s*(?:as\s+any\s*)?\)\s*\.(insert|update|upsert|delete)\s*\(/g;
  while ((m = dyn.exec(text))) dynamic.push({ file, op: m[2], name: m[1] });
}
const key = (w) => `${w.file} ${w.table} ${w.op}`;
const inventory = {};
for (const w of writes) inventory[key(w)] = (inventory[key(w)] ?? 0) + 1;

// ------------------------------------------------------- 1. the inventory
// file table op: how many call sites. The audit's "Write paths" table says,
// for each, which guard it goes through.
const PINNED = {
  'src/components/admin/AddSessionModal.tsx session_participants insert': 1,
  'src/components/admin/ClassForm.tsx classes insert': 1,
  'src/components/admin/EditSessionModal.tsx session_participants delete': 1,
  'src/components/admin/EditSessionModal.tsx session_participants upsert': 1,
  'src/components/admin/ExpendituresManager.tsx expenditures delete': 1,
  'src/components/admin/ExpendituresManager.tsx expenditures insert': 1,
  'src/components/admin/ExpendituresManager.tsx expenditures update': 1,
  'src/components/admin/InvoiceStatusManager.tsx invoices update': 1,
  'src/components/admin/PaymentIntegrityRepair.tsx invoices update': 1,
  'src/components/admin/RecurringExpendituresManager.tsx expenditures upsert': 1,
  'src/components/admin/TeacherScheduleTransfer.tsx sessions update': 2,
  'src/components/admin/class/AttendanceDrawer.tsx session_participants update': 1,
  'src/components/admin/class/AttendanceDrawer.tsx sessions update': 1,
  'src/components/admin/class/ClassAdminActions.tsx classes delete': 1,
  'src/components/admin/class/ClassAdminActions.tsx classes update': 3,
  'src/components/admin/class/ClassSettings.tsx classes update': 1,
  'src/components/admin/class/RecurringSessionsManager.tsx classes update': 1,
  'src/components/admin/class/SessionDetailDrawer.tsx sessions update': 1,
  'src/components/admin/ta/TAClassAssignment.tsx session_participants delete': 1,
  'src/components/admin/ta/TAClassAssignment.tsx session_participants upsert': 2,
  'src/components/admin/tabs/PayrollTab.tsx expenditures upsert': 1,
  'src/components/leaderboard/useClassBoardStyle.ts classes update': 1,
  'src/components/student/BillFreezePanel.tsx invoices update': 1,
  'src/components/teacher/AttendanceMarking.tsx sessions update': 1,
  'src/components/teacher/ClassEconomySettings.tsx classes update': 1,
  'src/lib/recordedPaymentWrite.ts invoices insert': 1,
  'src/lib/recordedPaymentWrite.ts invoices update': 2,
  'supabase/functions/_lib/recorded-payment-write.ts invoices insert': 1,
  'supabase/functions/_lib/recorded-payment-write.ts invoices update': 2,
  'supabase/functions/auto-mark-attendance/index.ts attendance insert': 1,
  'supabase/functions/calculate-payroll/index.ts payroll_summaries upsert': 1,
  'supabase/functions/calculate-tuition/index.ts invoices upsert': 2,
  'supabase/functions/close-payroll-month/index.ts payroll_periods update': 1,
  'supabase/functions/compute-sibling-discounts/index.ts sibling_discount_state upsert': 3,
  'supabase/functions/confirm-tuition/index.ts invoices update': 2,
  'supabase/functions/delete-payment/index.ts ledger_entries insert': 1,
  'supabase/functions/delete-payment/index.ts payment_deletions insert': 1,
  'supabase/functions/delete-payment/index.ts payments delete': 1,
  'supabase/functions/manage-demo-student/index.ts classes insert': 1,
  'supabase/functions/manage-demo-student/index.ts enrollments delete': 1,
  'supabase/functions/manage-demo-student/index.ts enrollments insert': 1,
  'supabase/functions/manage-session/index.ts sessions insert': 1,
  'supabase/functions/manage-session/index.ts sessions update': 3,
  'supabase/functions/mark-attendance/index.ts attendance upsert': 1,
  'supabase/functions/mark-attendance/index.ts sessions update': 1,
  'supabase/functions/schedule-sessions/index.ts sessions delete': 1,
  'supabase/functions/schedule-sessions/index.ts sessions insert': 1,
  'supabase/functions/schedule-sessions/index.ts sessions update': 3,
  'supabase/functions/snapshot-monthly-finance/index.ts monthly_finance_snapshots insert': 1,
  'supabase/functions/snapshot-monthly-finance/index.ts monthly_finance_snapshots update': 1,
  'supabase/functions/watch-sibling-threshold/index.ts sibling_discount_state upsert': 1,
  // Re-pinned 23 Nov 2026 against main as it is. This list was first written on a branch where
  // D4 step 3B put enrolment writes through money_change_checked; on main these two still write
  // directly, admin-only (create-family: admin check; update-enrollment-rate: authenticateUser +
  // admin, audit row). Open gap D5 G-13 (D5-audit.md section 8): move them onto the checked path with 3B.
  'supabase/functions/create-family/index.ts enrollments insert': 1,
  'supabase/functions/update-enrollment-rate/index.ts enrollments update': 1,
  // Gone since the audit: family-payment / smart-family-payment write through record_family_payment
  // (20261121130000), modify-payment is a 410 stub, close-payroll-month closes through
  // close_payroll_month_apply (20261117153000).
  // families / students (family link and sibling fields: D4 G-19, step 3B, NOT live), discount definitions, adjustments
  'src/components/admin/discount/AssignDiscountModal.tsx discount_definitions insert': 1,
  'src/components/admin/FamilyLinkDialog.tsx families update': 1,
  'src/components/admin/payroll/PayrollMonthLock.tsx payroll_adjustments insert': 1,
  'src/components/admin/StudentEditDrawer.tsx families insert': 1,
  'src/components/admin/StudentEditDrawer.tsx students update': 1,
  'src/components/admin/StudentForm.tsx students insert': 1,
  'src/components/shared/EconomyActions.tsx students update': 1,
  'src/components/student/StudentProfileEdit.tsx students update': 2,
  'supabase/functions/create-family/index.ts families insert': 1,
  'supabase/functions/create-family/index.ts students insert': 1,
  'supabase/functions/link-student-user/index.ts families insert': 1,
  'supabase/functions/link-student-user/index.ts families update': 1,
  'supabase/functions/link-student-user/index.ts students update': 6,
  'supabase/functions/manage-admin-users/index.ts families update': 1,
  'supabase/functions/manage-demo-student/index.ts students insert': 1,
  'supabase/functions/manage-student-access/index.ts students update': 3,
  'supabase/functions/student-create-migration-account/index.ts students update': 1,
  'supabase/functions/update-student-avatar/index.ts students update': 1,
};

console.log('\n1. every direct write to a money table is pinned');
{
  const added = Object.keys(inventory).filter((k) => !(k in PINNED)).map((k) => `${k} x${inventory[k]}`);
  const gone = Object.keys(PINNED).filter((k) => !(k in inventory));
  const moved = Object.keys(PINNED).filter((k) => k in inventory && inventory[k] !== PINNED[k]).map((k) => `${k}: pinned ${PINNED[k]}, found ${inventory[k]}`);
  ok(`no new writer (${Object.keys(inventory).length} file/table/op found; read a new one, then pin it here and in D5-audit.md)`, added.length === 0, added);
  ok('no pinned writer has gone (remove it here and from D5-audit.md)', gone.length === 0, gone);
  ok('the number of call sites of each pinned writer is unchanged', moved.length === 0, moved);
  if (process.env.D5_PRINT_INVENTORY) console.log(JSON.stringify(inventory, null, 2));
}
{
  // Writes through a table name held in a variable (a generic helper): none may reach a money table unseen.
  const PINNED_DYNAMIC = {
    'supabase/functions/admin-data-import/index.ts': 'the import writes whitelisted tables; D4 G-20 took sessions, attendance, enrollments, discounts out of the whitelist and drops classes.session_rate_vnd',
  };
  // G-9 (fixed in D5 fix round 1): the unmounted browser CSV importer is deleted.
  ok('G-9: src/components/admin/DataImportExport.tsx is gone and nothing names it', ![...src.keys()].some((f) => /DataImportExport/.test(f) || /DataImportExport/.test(src.get(f))));
  const found = [...new Set(dynamic.map((d) => d.file))];
  const unknown = found.filter((f) => !(f in PINNED_DYNAMIC));
  ok('writes through a variable table name: only the pinned generic writers', unknown.length === 0, dynamic.filter((d) => unknown.includes(d.file)));
  ok('the pinned generic writers still exist (else unpin them)', Object.keys(PINNED_DYNAMIC).every((f) => found.includes(f)), found);
}

// --------------------------------------------------------------- 2. RPCs
console.log('\n2. every RPC called is pinned');
{
  const rpcs = new Map();
  for (const [file, text] of src) {
    const re = /\.rpc\(\s*["'`]([a-z_0-9]+)["'`]/g; let m;
    while ((m = re.exec(text))) (rpcs.get(m[1]) ?? rpcs.set(m[1], new Set()).get(m[1])).add(file);
  }
  // name: does it change money-relevant data?  (the audit says through which guard)
  const PINNED_RPCS = {
    ai_action_preview: 'read', approve_video_feedback: 'points', archive_and_reset_monthly_leaderboard: 'points',
    assert_job_lock: 'lock', audit_clip_enrol: 'no', award_homework_points: 'points', can_view_student_in_class: 'read',
    cancel_session_checked: 'D2 checked path', cancel_sessions_checked_bulk: 'D2 checked path', claim_vocab_for_student: 'no',
    class_overhead_breakdown: 'read', class_overhead_for_month: 'read', class_overhead_pool: 'read', count_vocab_saves_today: 'read',
    get_class_skill_points: 'read', get_class_skill_summary: 'read', get_class_video_wall: 'read', get_student_homeworks: 'read',
    get_student_weekly_stats: 'read', get_video_homework_for_student: 'read', get_video_progress: 'read', has_role: 'read',
    is_teacher_of_class: 'read', log_money_automation_refused: 'D4 event',
    money_change_checked: 'D4 checked path', money_change_preview: 'read', money_changes_checked_bulk: 'D4 checked path',
    post_sibling_retro_credit: 'tuition credit (admin / cron secret only, Q7)', prune_admin_auth_state: 'no',
    record_money_change_event: 'D4 event', record_session_override_event: 'D2 event', recorder_class_missing_consent: 'read',
    recorder_confirm_chunk: 'evidence', recorder_expire_stale: 'evidence', recorder_mark_audio_deleted: 'evidence',
    recorder_register_chunk: 'evidence', recorder_retention_due: 'read', recorder_server_time: 'read',
    return_video_for_rerecord: 'no', stars_sync_apply_page: 'register (service lane, D4 G-11 rule 7)', stars_sync_effect_failed: 'queue',
    stars_sync_effects_done: 'queue', stars_sync_finish_run: 'queue', stars_sync_readiness: 'read',
    stars_sync_resolve_conflict: 'register (person, D4 G-11)', stars_sync_retry_pending: 'queue', stars_sync_status: 'read',
    stars_sync_try_lock: 'lock', toggle_video_heart: 'no', video_staff_for_class: 'read',
    // Pinned 23 Nov 2026 (read before pinning). Money first:
    record_admin_payment: 'payment: payments row + ledger legs + bill by compare-and-set under FOR UPDATE, one transaction (20261117121000)',
    record_family_payment: 'family payment: bills FOR UPDATE in id order, one transaction, service_role only (20261121130000)',
    close_payroll_month_apply: 'payroll close in one transaction (20261117153000)',
    decide_tuition_reconciliation_item: 'tuition audit decision; moves money only via record_admin_payment (20261121100000)',
    approve_change_request: 'D4 approvals', change_approval_check: 'read', change_approval_status: 'D4 approvals', release_own_request: 'D4 approvals',
    economy_process: 'class economy: points ledger row and cash in one transaction, a handled request refused',
    tuition_bill_gaps: 'read (20261123090000)',
    // Not money:
    approve_cefr_draft: 'no', discard_cefr_draft: 'no', approve_lesson_report: 'no', approve_transcript_analysis: 'no',
    withdraw_transcript_approval: 'no', can_view_student: 'read', class_work_gallery: 'read', decide_work_share: 'no',
    request_work_share: 'no', withdraw_work_share: 'no', work_share_file: 'read', get_lesson_reports_for_student: 'read',
    get_lesson_review_quiz: 'read', submit_lesson_review: 'points', leaderboard_board: 'read', leaderboard_centre: 'read',
    leaderboard_json: 'read', leaderboard_period: 'read', leaderboard_tv_feed: 'read', points_manual_changes: 'read',
    student_points_history: 'read', student_points_summary: 'read', lesson_monitor_delete_report: 'no',
    lesson_monitor_my_classes: 'read', lesson_monitor_my_lessons: 'read', lesson_monitor_report_feedback: 'no',
    lesson_monitor_set_class: 'no', lesson_monitor_set_targets: 'no', lesson_report_claim: 'queue', lesson_report_file: 'read',
    lesson_report_finish: 'queue', lesson_report_teacher_can: 'read', lesson_speaker_recording: 'read',
    lesson_speaker_roster: 'read', video_analysis_claim: 'queue', vocab_claim_daily_save: 'quota',
    vocab_release_daily_save: 'quota', vocab_saves_today: 'read',
  };
  const added = [...rpcs.keys()].filter((r) => !(r in PINNED_RPCS)).map((r) => `${r} (${[...rpcs.get(r)].join(', ')})`);
  const gone = Object.keys(PINNED_RPCS).filter((r) => !rpcs.has(r));
  ok(`no new RPC (${rpcs.size} called; read a new one, then pin it)`, added.length === 0, added);
  ok('no pinned RPC has gone', gone.length === 0, gone);
}

// --------------------------------------------------- 3. never from the browser
console.log('\n3. money tables the browser never writes');
{
  const NEVER_FROM_BROWSER = ['payments', 'payment_allocations', 'ledger_entries', 'ledger_accounts', 'payroll_lines', 'payroll_periods',
    'payroll_summaries', 'settlements', 'monthly_finance_snapshots', 'payment_deletions', 'payment_modifications', 'attendance', 'enrollments'];
  const hits = writes.filter((w) => w.file.startsWith('src/') && NEVER_FROM_BROWSER.includes(w.table)).map(key);
  ok(`no file under src/ writes ${NEVER_FROM_BROWSER.join(', ')} directly`, hits.length === 0, hits);
  const svc = [...src].filter(([f, t]) => f.startsWith('src/') && /SERVICE_ROLE|service_role_key|serviceRoleKey/i.test(t) && /createClient\(/.test(t)).map(([f]) => f);
  ok('no file under src/ builds a client with a service-role key', svc.length === 0, svc);
}

// ------------------------------------------------------- 4. recorded_payment
console.log('\n4. recorded_payment is written only by compare-and-set (or under a row lock)');
{
  const CAS_FILES = ['src/lib/recordedPaymentWrite.ts', 'supabase/functions/_lib/recorded-payment-write.ts'];
  const NEW_BILL_INSERT = 'supabase/functions/smart-family-payment/index.ts invoices insert';
  const offenders = [];
  for (const w of writes.filter((x) => x.table === 'invoices')) {
    if (CAS_FILES.includes(w.file) || key(w) === NEW_BILL_INSERT) continue;
    const text = src.get(w.file);
    // The payload: from the write call to its closing parenthesis.
    let depth = 0, i = text.indexOf('(', w.at), end = i;
    for (; end < text.length; end++) { if (text[end] === '(') depth++; else if (text[end] === ')' && --depth === 0) break; }
    if (/recorded_payment/.test(text.slice(i, end))) offenders.push(key(w));
  }
  ok('no invoices write payload outside the helper (and the new-bill insert) names recorded_payment', offenders.length === 0, offenders);
  ok('the helper is a compare-and-set: its updates filter on the value read', CAS_FILES.every((f) => /\.eq\(\s*["']recorded_payment["']/.test(src.get(f)) || /\.is\(\s*["']recorded_payment["']/.test(src.get(f))));
  // SQL: every SET recorded_payment in a migration, docs/sql or an owner script.
  const sqlFiles = [
    ...readdirSync(join(repo, 'supabase', 'migrations')).map((n) => `supabase/migrations/${n}`),
    ...readdirSync(join(repo, 'docs', 'sql')).map((n) => `docs/sql/${n}`),
    ...readdirSync(join(repo, 'scripts')).filter((n) => n.endsWith('.sql')).map((n) => `scripts/${n}`),
  ].filter((f) => f.endsWith('.sql'));
  const setters = sqlFiles.filter((f) => /\bSET\s+(?:[a-z_]+\s*=[^;]*?,\s*)*recorded_payment\s*=/i.test(readFileSync(join(repo, f), 'utf8').replace(/--[^\n]*/g, '')));
  const SQL_ALLOWED = {
    'supabase/migrations/20261107090000_ai_assisted_admin_actions.sql': 'ai_action_apply / undo: SELECT ... FOR UPDATE, then add',
    'docs/sql/ai_action_apply_undo.installed.sql': 'the same, as installed',
    // (scripts/CREDIT-past-unapplied-cash.sql was pinned here from a branch; it never reached main.)
    'supabase/migrations/20261117121000_record_admin_payment.sql': 'record_admin_payment: FOR UPDATE, then compare-and-set',
    'supabase/migrations/20261121090000_recorded_payment_guard.sql': 'record_admin_payment again, with hec.payment_writer set',
    'supabase/migrations/20261121130000_record_family_payment.sql': 'record_family_payment: bills FOR UPDATE in id order',
    'supabase/migrations/20261117150000_ai_action_payment_on_ledger.sql': 'ai_action_undo: bill FOR UPDATE, then take the payment off',
  };
  ok('SQL that sets recorded_payment: only the pinned files', setters.every((f) => f in SQL_ALLOWED) && Object.keys(SQL_ALLOWED).every((f) => setters.includes(f)), setters);
  const installed = readFileSync(join(repo, 'docs', 'sql', 'ai_action_apply_undo.installed.sql'), 'utf8');
  // apply records a payment through record_admin_payment; undo locks the bill (inv) once, then every
  // recorded_payment write is on that locked row.
  const undoWrites = [...installed.matchAll(/UPDATE public\.invoices\s+SET recorded_payment[\s\S]*?WHERE ([^;]*);/g)].map((m) => m[1]);
  ok('  the AI action reads the bill FOR UPDATE, and every recorded_payment write is on that locked row',
     /SELECT \* INTO inv FROM public\.invoices[^;]*FOR UPDATE/.test(installed) && undoWrites.length >= 1 && undoWrites.every((w) => /\bid = inv\.id\b/.test(w)), undoWrites);
  for (const f of ['supabase/migrations/20261117121000_record_admin_payment.sql', 'supabase/migrations/20261121090000_recorded_payment_guard.sql']) {
    const sql = readFileSync(join(repo, f), 'utf8');
    ok(`  ${f.split('/').pop()}: the bill write is a compare-and-set on the value read under FOR UPDATE`,
       /FOR UPDATE/.test(sql) && /coalesce\(i\.recorded_payment, 0\) = v_before/.test(sql));
  }
}

// ------------------------------------------------------- 5. invoices.status
console.log('\n5. invoices.status comes from the one rule');
{
  const statusWriters = new Set();
  for (const w of writes.filter((x) => x.table === 'invoices' && x.op !== 'delete')) {
    const text = src.get(w.file);
    if (/status/.test(text.slice(w.at, w.at + 400))) statusWriters.add(w.file);
  }
  // Files whose writes delegate the label to a callback/variable: the label module must be imported.
  const usesRule = (f) => /invoice-status(\.ts)?['"]|@\/lib\/invoiceStatus['"]|\.\/invoiceStatus['"]/.test(src.get(f));
  const without = [...statusWriters].filter((f) => !usesRule(f) && !f.includes('recorded-payment-write') && !f.includes('recordedPaymentWrite'));
  ok(`every file writing invoices.status imports the label rule (${[...statusWriters].length} files)`, without.length === 0, without);
  const ism = src.get('src/components/admin/InvoiceStatusManager.tsx');
  const offered = [...ism.matchAll(/<SelectItem value=\{?["']?([A-Za-z_]+)["']?\}?>/g)].map((m) => m[1]).filter((v) => v !== 'student');
  ok('  InvoiceStatusManager offers only "credit" (the one admin label) and "follow the payments" - never a hand-set paid / partial / issued',
     offered.length === 2 && offered.includes('credit') && offered.includes('FOLLOW') && /invoicePaidLabel\(/.test(ism), offered);
}

// ------------------------------------------------------- 6. browser pricing
console.log('\n6. no NEW browser pricing');
{
  const PRICERS = ['sessionPayVnd', 'totalPayVnd', 'varianceCostVnd', 'rateOnDate', 'datedPayrollTotal', 'splitPayrollByClass', 'apportion'];
  const importers = [];
  for (const [file, text] of src) {
    if (!file.startsWith('src/') || file.startsWith('src/lib/')) continue;
    for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
      const names = m[1].split(',').map((s) => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean);
      const hit = names.filter((n) => PRICERS.includes(n));
      if (hit.length) importers.push(`${file}: ${hit.join(', ')}`);
    }
  }
  // sessionPayVnd left OperationalReports before 23 Nov 2026; splitPayrollByClass is what is left of G-8.
  const G8 = ['src/components/admin/reports/OperationalReports.tsx: splitPayrollByClass'];
  // Not payroll figures: the staff rate form shows what one lesson pays at the rate being typed, and which history row is in force.
  const FORM_PREVIEWS = ['src/components/admin/staff/PayRateFields.tsx: sessionPayVnd', 'src/components/admin/staff/PayRateHistory.tsx: rateOnDate'];
  const added = importers.filter((x) => !G8.includes(x) && !FORM_PREVIEWS.includes(x));
  ok('outside src/lib, only the files pinned as gap G-8 import a pricing function', added.length === 0, added);
  ok('  G-8 still open as pinned (when browser-pricing lands, empty G8 here and close G-8 in the audit)', G8.every((x) => importers.includes(x)), importers);
  const noPrice = ['src/components/admin/tabs/PayrollTab.tsx', 'src/pages/TeacherPayroll.tsx', 'src/components/teacher/TeacherPayrollCalendar.tsx',
    'src/components/admin/teacher/TeacherProfilePayroll.tsx', 'src/components/admin/AdminTuitionList.tsx'];
  ok('the screens already moved to the functions import no pricing function (PayrollTab, teacher payroll x3, AdminTuitionList)',
     noPrice.every((f) => src.has(f) && !importers.some((x) => x.startsWith(`${f}:`))), noPrice.filter((f) => !src.has(f)));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
