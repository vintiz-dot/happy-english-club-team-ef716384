// D4 step 4: the pure helpers of src/lib/approvals.ts (wording, what the
// screens send to request_change_approval) bundled with esbuild and run in
// node, and static checks of the step 4 screens. No database: what needs
// approval is decided by the database and proved in d4-approvals.test.mjs.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { harness, repo } from './d4-prelude.mjs';

const { ok, counts } = harness(() => null);
const out = await build({
  entryPoints: [resolve(repo, 'src/lib/approvals.ts')], bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent',
  alias: { '@': resolve(repo, 'src') },
});
const p = resolve(tmpdir(), `approvals-lib.${process.pid}.mjs`);
writeFileSync(p, out.outputFiles[0].text);
const lib = await import(pathToFileURL(p).href);
const src = (f) => readFileSync(resolve(repo, f), 'utf8').replace(/\r\n/g, '\n');

// wording
ok('reasonSentence: one reason', lib.reasonSentence(['paid']) === 'This needs a second administrator because it reaches bills with 5,000,000 VND or more already paid.');
ok('reasonSentence: two reasons joined with "and"', /because it corrects a month .* and it reaches a payroll month that is closed\.$/.test(lib.reasonSentence(['tier3', 'closed_payroll'])));
ok('reasonSentence: none / unknown words', lib.reasonSentence([]) === 'This needs a second administrator.' && /could not tell/.test(lib.reasonSentence(['unknown'])));
ok('every reason the database gives has words', ['tier3', 'closed_payroll', 'families', 'paid', 'unfreeze', 'pay_adjustment', 'settings', 'unknown'].every((r) => !!lib.REASON_TEXT[r]));
const sql = src('supabase/migrations/20261114095000_d4_change_approvals.sql');
const dbReasons = [...sql.matchAll(/v_reasons := v_reasons \|\| '([a-z_0-9]+)'::text/g)].map((m) => m[1]);
ok('  (the list is the migration\'s own: every reason it appends is worded)', dbReasons.length === 7 && dbReasons.every((r) => !!lib.REASON_TEXT[r]), dbReasons);
ok('parseReasons reads an HC060 detail', JSON.stringify(lib.parseReasons('reasons=["paid","families"]')) === '["paid","families"]' && lib.parseReasons('x').length === 0);
ok('HC060 text names the reasons and says nothing was changed', /5,000,000 VND.*nothing was changed/.test(lib.approvalErrorText('HC060', 'reasons=["paid"]')));
ok('HC061 says who approves; with "withdraw" it says withdraw', /another administrator/.test(lib.approvalErrorText('self_approval', 'approvers=[]')) &&
   /Withdraw it instead/.test(lib.approvalErrorText('HC061', 'withdraw')));
ok('HC062 / HC063 / HC064 each say what to do next', /Approvals list/.test(lib.approvalErrorText('HC062')) && /approve or reject it, or ask/.test(lib.approvalErrorText('HC063')) &&
   /Ask again/.test(lib.approvalErrorText('HC064')));
ok('HC065: two administrators / loosening / solo release, each its own sentence', /two administrators/.test(lib.approvalErrorText('HC065', 'two_admins')) &&
   /other administrator/.test(lib.approvalErrorText('HC065', 'loosen')) && /not switched on/.test(lib.approvalErrorText('HC065', 'solo_release_off')) &&
   /Not yet/.test(lib.approvalErrorText('HC065', 'solo_release_not_yet;at=x')));
ok('pendingRequestId reads an HC063 detail', lib.pendingRequestId('request_id=0b6f0f4e-6a35-4b5e-9f53-1f3c8f1f2a10;requested_by=x') === '0b6f0f4e-6a35-4b5e-9f53-1f3c8f1f2a10');
ok('isApprovalRequired: HC060, and HC065 "loosen" only', lib.isApprovalRequired('HC060') && lib.isApprovalRequired('approval_required') &&
   lib.isApprovalRequired('HC065', 'loosen') && !lib.isApprovalRequired('HC065', 'two_admins') && !lib.isApprovalRequired('HC011'));

// what is sent
const plan = (o = {}) => ({ entity: 'attendance', op: 'set_marks', tier: 2, allowed: true, token: 't',
  requires: { reason_min: 15, reason: true, confirm: true, correction_reason: false }, approval: { required: true, reasons: ['paid'] }, ...o });
const good = { reason: '  The child   was ill all week ', confirm: true, correctionReason: '' };
ok('canRequestMoneyApproval: a complete form for a change that needs approval', lib.canRequestMoneyApproval(plan(), good) === true);
ok('  not without the tick, not with a short reason, not when no approval is needed', !lib.canRequestMoneyApproval(plan(), { ...good, confirm: false }) &&
   !lib.canRequestMoneyApproval(plan(), { ...good, reason: 'ill' }) && !lib.canRequestMoneyApproval(plan({ approval: { required: false } }), good));
ok('  a T3 change needs its correction reason before it can be sent', !lib.canRequestMoneyApproval(plan({ tier: 3, requires: { reason: true, confirm: true, correction_reason: true } }), good));
const mp = lib.moneyApprovalParams('attendance', 'set_marks', { session_id: 's' }, plan(), good);
ok('moneyApprovalParams: the checked function\'s own arguments, as typed (reason cleaned, tick, no correction at T2)',
   JSON.stringify(mp) === JSON.stringify({ entity: 'attendance', op: 'set_marks', args: { session_id: 's' }, reason: 'The child was ill all week',
     confirm: true, correction_reason: null, context: { source: 'screen' } }), mp);
const sf = { reason: 'The class did not take place that day', confirm: true, correctionReason: 'The bill was confirmed wrongly' };
ok('sessionApprovalRequest: cancel / delete -> cancel_session_checked with the action', lib.sessionApprovalRequest('cancel', 'S', sf).rpc === 'cancel_session_checked' &&
   lib.sessionApprovalRequest('delete', 'S', sf).params.action === 'delete');
const mv = lib.sessionApprovalRequest('move', 'S', sf, { date: '2026-10-01', start_time: '17:30', end_time: '19:00' });
ok('  move -> move_session_checked with the new date and times', mv.rpc === 'move_session_checked' && mv.params.new_date === '2026-10-01' && mv.params.new_start === '17:30' && mv.params.new_end === '19:00');
ok('  uncancel -> uncancel_session_checked (no tick); an unknown op -> nothing', lib.sessionApprovalRequest('uncancel', 'S', sf).params.confirm === false &&
   lib.sessionApprovalRequest('hold', 'S', sf) === null);
ok('payApprovalParams: whole VND, reasons cleaned', JSON.stringify(lib.payApprovalParams([{ month: '2026-11', origin_month: '2026-10', teacher_id: 't', assistant_id: null,
   amount_vnd: 150000.4, reason: ' found  after close ' }])) === JSON.stringify({ rows: [{ month: '2026-11', origin_month: '2026-10', teacher_id: 't', assistant_id: null,
   amount_vnd: 150000, reason: 'found after close' }] }));

// the queue
const row = (o) => ({ request_id: o.id, created_at: o.at, status: o.status ?? 'pending', released_alone: !!o.rel, acknowledged: !!o.ack, target_keys: o.keys ?? [] });
const sorted = lib.sortQueue([row({ id: 'done', at: '2026-11-03', status: 'applied' }), row({ id: 'p2', at: '2026-11-02' }), row({ id: 'p1', at: '2026-11-01' }),
  row({ id: 'alone', at: '2026-11-04', status: 'applied', rel: true })]);
ok('sortQueue: released-alone unread first, then pending oldest first, then the rest', sorted.map((r) => r.request_id).join() === 'alone,p1,p2,done');
ok('waitsFor: a pending request naming the target', lib.waitsFor([row({ id: 'a', at: 'x', keys: ['session:1'] })], 'session:1')?.request_id === 'a' &&
   lib.waitsFor([row({ id: 'a', at: 'x', status: 'applied', keys: ['session:1'] })], 'session:1') === null);
const now = new Date('2026-11-10T00:00:00Z');
ok('expiryWords', lib.expiryWords('2026-11-09T00:00:00Z', now) === 'Expired' && lib.expiryWords('2026-11-10T05:00:00Z', now) === 'Expires in 5 hours' &&
   lib.expiryWords('2026-11-14T00:00:00Z', now) === 'Expires in 4 days');
const S = { enabled: true, on_tier3: true, on_closed_payroll: true, on_unfreeze: true, on_pay_adjustment: true, min_families: 3, min_paid_vnd: 5000000, expiry_hours: 168, solo_release_after_hours: null };
ok('settingsLoosen mirrors the database: off, a line off, a higher line, longer expiry, solo release on or shorter',
   lib.settingsLoosen(S, { ...S, enabled: false }) && lib.settingsLoosen(S, { ...S, on_unfreeze: false }) && lib.settingsLoosen(S, { ...S, min_paid_vnd: 6000000 }) &&
   lib.settingsLoosen(S, { ...S, expiry_hours: 200 }) && lib.settingsLoosen(S, { ...S, solo_release_after_hours: 48 }) &&
   lib.settingsLoosen({ ...S, solo_release_after_hours: 48 }, { ...S, solo_release_after_hours: 24 }));
ok('  and tightening is not loosening', !lib.settingsLoosen(S, { ...S, min_families: 2 }) && !lib.settingsLoosen({ ...S, enabled: false }, S) &&
   !lib.settingsLoosen({ ...S, solo_release_after_hours: 48 }, S));

// the screens (static)
const umc = src('src/components/admin/money-guard/useMoneyChange.ts');
ok('useMoneyChange gains requestApproval: request_change_approval with money_change_checked and the preview\'s token; it does not report a save',
   /requestApproval = useCallback/.test(umc) && /requestApprovalRpc\("money", "money_change_checked"/.test(umc) && /plan\.token/.test(umc) &&
   !/onDone\?\.\(\{ approval_request_id/.test(umc));
const ugc = src('src/components/admin/session-guard/useGuardedChange.ts');
ok('useGuardedChange gains requestApproval: D2\'s checked function as typed, with the preview\'s token', /requestApproval = useCallback/.test(ugc) &&
   /sessionApprovalRequest\(op, sessionId, form/.test(ugc) && /requestApprovalRpc\("session", built\.rpc, built\.params, p\.token/.test(ugc));
const gd = src('src/components/admin/session-guard/GuardDialog.tsx');
ok('GuardDialog: an approval_required refusal offers "Send for approval"', /error\?\.code === "approval_required"/.test(gd) && /Send for approval/.test(gd));
for (const f of ['src/components/admin/money-guard/MoneyGuardDialog.tsx', 'src/components/admin/money-guard/MoneyInputDialog.tsx']) {
  const t = src(f);
  ok(`${f.split('/').pop()}: when the preview requires approval the button sends the request instead of the change`, /Send for approval/.test(t) && /approval\?\.required/.test(t));
}
const pml = src('src/components/admin/payroll/PayrollMonthLock.tsx');
ok('PayrollMonthLock: a refused carry (HC060) offers the request for the same rows; nothing is retried on its own',
   /isApprovalRequired\(/.test(pml) && /requestApproval\("money", "carry_payroll_adjustments", payApprovalParams\(needsApproval\)/.test(pml));
const cor = src('src/components/admin/session-guard/CancelOverridesReview.tsx');
ok('CancelOverridesReview: tabs (overrides / waiting for approval); "asked by" read from the approval record, not from the row\'s attached context',
   /TabsTrigger value="approvals"/.test(cor) && /change_approval_queue/.test(cor) && !/attached\.requested_by|\.attached\b/.test(cor));
const ui = ['ApprovalInbox.tsx', 'ApprovalSettingsCard.tsx', 'PendingApprovalBadge.tsx', 'api.ts'].map((f) => src(`src/components/admin/approvals/${f}`)).join('\n');
ok('the approval screens write nothing but the nine RPCs (no table write, no service key, no edge function)',
   !/\.(insert|update|upsert|delete)\(/.test(ui) && !/service_role|SERVICE_ROLE/.test(ui) && !/functions\.invoke/.test(ui));
const rpcs = [...ui.matchAll(/call<[^>]*>\("([a-z_]+)"/g)].map((m) => m[1]).sort();
ok('  and only these RPCs', JSON.stringify(rpcs) === JSON.stringify(['acknowledge_released_request', 'approval_request_preview', 'approve_change_request',
  'change_approval_status', 'reject_change_request', 'release_own_request', 'request_change_approval', 'set_change_approval_settings', 'withdraw_change_request']), rpcs);
const mounted = src('src/components/admin/tabs/AutomationTab.tsx');
ok('mounted on the admin Automation page (settings card, inbox, the waiting count)', /<ApprovalSettingsCard \/>/.test(mounted) && /<ApprovalInbox \/>/.test(mounted) && /<PendingApprovalBadge \/>/.test(mounted));

const { pass, fail } = counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
