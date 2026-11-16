// D4 mutation runner (docs/evidence/D4-design.md f.6). Not part of run.mjs:
// it takes minutes. Each mutant is ONE textual change to a D4 migration; the
// runner writes the mutated copy to a scratch file, re-computes the
// preflight's "this file" md5 literals for the mutated bodies (otherwise
// every body mutant would be "caught" by the second-paste check alone),
// runs the named suites with the mutated file in place of the real one, and
// reports CAUGHT (some suite failed) or SURVIVED.
//
//   node scripts/pgtest/d4-mutants.mjs            every mutant
//   node scripts/pgtest/d4-mutants.mjs M03 M07    only these
//
// Survivors are reported, not hidden: a survivor needs a new case.
import { PGlite } from '@electric-sql/pglite';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { makeDb, migPath, repo, AUDIT, CANCEL, D1, D2, FLOORS } from './d4-prelude.mjs';

const FREEZE = '20261106120000_invoice_tuition_freeze.sql';
const ENROL = '20261106090000_attendance_enrollment_guard.sql';
const CORE = '20261114091000_d4_core_register.sql';
const ROLLBACK2 = join(repo, 'scripts', 'ROLLBACK-d4-2-register.sql');
const FEE = '20261114092000_d4_class_fee_history.sql';
const ROLLBACK3 = join(repo, 'scripts', 'ROLLBACK-d4-3-class-fee.sql');
const SUITES = {
  floors: { file: 'd4-floors.test.mjs', migs: [AUDIT, CANCEL, D1, D2, FLOORS, FREEZE] },
  carry: { file: 'd4-d2-carryover.test.mjs', migs: [AUDIT, CANCEL, D1, D2, FLOORS] },
  deployed: { file: 'd4-deployed-functions.test.mjs', migs: [AUDIT, CANCEL, D1, D2, FLOORS] },
  register: { file: 'd4-register.test.mjs', migs: [AUDIT, CANCEL, ENROL, D1, D2, FREEZE, FLOORS, CORE], args: [ROLLBACK2] },
  fnreg: { file: 'd4-functions-register.test.mjs', migs: [AUDIT, CANCEL, ENROL, D1, D2, FREEZE, FLOORS, CORE] },
  fee: { file: 'd4-class-fee.test.mjs', migs: [AUDIT, CANCEL, ENROL, D1, D2, FREEZE, FLOORS, CORE, FEE], args: [ROLLBACK3] },
};

// [id, what it breaks, find (must occur exactly once), replace, suites]
export const MUTANTS = [
  ['M01', 'a caller D1 refuses writes a floor (R-6)',
    "    RETURN;   -- R-6: a caller D1 refuses writes no floor", "    NULL;", ['floors']],
  ['M02', 'a D1 error is stored as STRONG (R-6)',
    "    v_level := CASE WHEN p_own_level IN ('SOFT', 'STRONG') THEN p_own_level ELSE 'NONE' END;", "    v_level := 'STRONG';", ['floors']],
  ['M03', 'the cancel\'s excuse-all writes a floor',
    "  IF pg_trigger_depth() > 1 AND COALESCE(p_cause ->> 'table', '') = 'attendance' THEN", "  IF false THEN", ['floors']],
  ['M04', 'deleting a CANCELLED lesson reads the effective level (D2 5.3 step 9 broken)',
    "OR (s.status = 'Canceled' AND v_level_now <> 'NONE')", "OR (s.status = 'Canceled' AND v_level <> 'NONE')", ['floors', 'carry']],
  ['M05', 'the lesson guard\'s settled does not read the bill floor',
    "     WHERE COALESCE(f.ever_paid OR f.ever_signed OR f.ever_frozen, false)\n        OR (i.id IS NOT NULL",
    "     WHERE false\n        OR (i.id IS NOT NULL", ['floors']],
  ['M06', 'the bill floor skips recorded_payment',
    "      IF v_rec > 0 AND COALESCE(NEW.recorded_payment, 0) < v_rec THEN", "      IF false THEN", ['floors']],
  ['M07', 'the effective level ignores a STRONG floor',
    "    WHEN v_now = 'STRONG' OR v_floor = 'STRONG' THEN 'STRONG'", "    WHEN v_now = 'STRONG' THEN 'STRONG'", ['floors']],
  ['M08', 'HC024 dropped (a mark can be re-pointed)',
    "  IF TG_OP = 'UPDATE' AND (OLD.session_id IS DISTINCT FROM NEW.session_id", "  IF false AND (OLD.session_id IS DISTINCT FROM NEW.session_id", ['floors', 'carry']],
  ['M09', 'HC025 only for DELETE (un-signing a mark passes)',
    "       AND (TG_OP = 'DELETE' OR NEW.marked_by IS NULL) THEN", "       AND (TG_OP = 'DELETE') THEN", ['floors']],
  ['M10', "the point keep ignores a re-dated row",
    "WHEN r_class = p_class AND r_date = p_date", "WHEN r_class = p_class", ['floors']],
  ['M11', "the transcript keep ignores an unlinked row",
    "              WHEN r_session = p_lesson THEN 2", "              WHEN r_session = p_lesson OR r_session IS NULL THEN 2", ['floors']],
  ['M12', "the submission keep ignores a cleared graded_at",
    "      IF TG_OP = 'UPDATE' AND NEW.graded_at IS NOT NULL\n", "      IF TG_OP = 'UPDATE'\n", ['floors']],
  ['M13', "the lesson keep ignores Held -> Scheduled",
    "  WHEN ((OLD.status = 'Held' AND NEW.status IS DISTINCT FROM 'Held' AND NEW.status IS DISTINCT FROM 'Canceled')\n     OR OLD.date", "  WHEN ((false)\n     OR OLD.date", ['floors', 'carry']],
  ['M14', 'the floor\'s causes are not in erased_recently (no review)',
    "       AND (c ->> 'at')::timestamptz >= now() - interval '30 days'", "       AND false", ['floors']],
  ['M15', 'the token does not cover the floor\'s causes',
    "      v_level_now, v_floor ->> 'level', jsonb_array_length(COALESCE(v_floor -> 'causes', '[]'::jsonb)),\n      md5(COALESCE(v_floor -> 'causes', '[]'::jsonb)::text)\n  )::text, 'UTF8')), 'hex');\n  v_fp",
    "      v_level_now, v_floor ->> 'level'\n  )::text, 'UTF8')), 'hex');\n  v_fp", ['floors']],
  ['M16', 'the G-10 residue is not refreshed',
    "          SELECT unnest(v_res)) st                            -- D4: G-10 residue",
    "          SELECT NULL::uuid WHERE false) st", ['floors']],
  ['M17', 'a floor may be lowered',
    "         OR (OLD.level = 'STRONG' AND NEW.level IS DISTINCT FROM 'STRONG')", "         OR false", ['floors']],
  ['M18', 'a lesson that has not started gets a floor',
    "  IF NOT FOUND OR NOT COALESCE(public.session_has_started(s.date, s.start_time), false) THEN", "  IF NOT FOUND THEN", ['floors']],
  ['M19', 'with a floor, settled is judged over billable rows only',
    "     WHERE a.session_id = s.id AND (v_floor IS NOT NULL OR a.status IN ('Present', 'Absent', 'Late'))",
    "     WHERE a.session_id = s.id AND (a.status IN ('Present', 'Absent', 'Late'))", ['floors']],
  ['M20', 'causes are not capped',
    "     ORDER BY n DESC LIMIT 20) q", "     ORDER BY n DESC LIMIT 200) q", ['floors']],
  ['M21', 'a deleted bill leaves no floor',
    "      v_what := ARRAY['deleted'];", "      v_what := ARRAY[]::text[];", ['floors']],
  ['M22', 'the floor table guard lets the service role write',
    "  IF current_user::text IN ('anon', 'authenticated', 'service_role', 'authenticator')\n     OR current_user <> (SELECT c.relowner::regrole::name FROM pg_class c WHERE c.oid = TG_RELID) THEN\n    RAISE EXCEPTION '% rows are written only by the floor functions'",
    "  IF false THEN\n    RAISE EXCEPTION '% rows are written only by the floor functions'", ['floors']],
  ['M23', 'the keep returns before D1 for every person (no floor from admins / teachers)',
    "  IF v_lane IN ('person', 'unknown')\n     AND NOT COALESCE(", "  IF v_lane IN ('person', 'unknown')\n     OR NOT COALESCE(", ['floors', 'deployed']],
  ['M24', "the sessions keep fires on a cancel (Held -> Canceled)",
    [["AND NEW.status IS DISTINCT FROM 'Held' AND NEW.status IS DISTINCT FROM 'Canceled')\n     OR OLD.date", "AND NEW.status IS DISTINCT FROM 'Held')\n     OR OLD.date"], ["v_unhold boolean := OLD.status = 'Held' AND NEW.status IS DISTINCT FROM 'Held' AND NEW.status IS DISTINCT FROM 'Canceled';", "v_unhold boolean := OLD.status = 'Held' AND NEW.status IS DISTINCT FROM 'Held';"]], null, ['floors', 'carry']],
  ['M25', "C-1: the lesson trigger ignores a start_time change",
    "\n     OR OLD.start_time IS DISTINCT FROM NEW.start_time)", "\n    )", ['floors']],
  ['M26', "C-1: an un-start is not kept",
    "  v_unstart boolean := COALESCE(", "  v_unstart boolean := false AND COALESCE(", ['floors']],
  ['M27', "C-2: the register keeps on any change, not only a lowering",
    "  IF v_new < v_old THEN\n    PERFORM public._session_evidence_keep(OLD.session_id,", "  IF v_new <= v_old AND (TG_OP = 'DELETE' OR NEW IS DISTINCT FROM OLD) THEN\n    PERFORM public._session_evidence_keep(OLD.session_id,", ['floors']],
  ['M28', "C-2: the transcript keeps on any change",
    "    IF v_new < v_old THEN\n      PERFORM public._session_evidence_keep(l.id,\n        jsonb_build_object('table', 'class_transcripts'", "    IF v_new <= v_old AND v_old > 0 THEN\n      PERFORM public._session_evidence_keep(l.id,\n        jsonb_build_object('table', 'class_transcripts'", ['floors']],
  ['M29', "C-2: the register cause does not name the old signature",
    "                         'old_marked_by', OLD.marked_by,", "", ['floors']],
  ['M30', "C-2: a point keeps on any change",
    "    IF v_new < v_old THEN\n      PERFORM public._session_evidence_keep(l.id,\n        jsonb_build_object('table', 'point_transactions'", "    IF v_new <= v_old AND v_old > 0 THEN\n      PERFORM public._session_evidence_keep(l.id,\n        jsonb_build_object('table', 'point_transactions'", ['floors']],
  ['M31', "C-2: a homework keeps on any change",
    "  IF v_old_counts AND NOT (v_new_counts AND v_new_class = v_class AND v_new_day = v_day) THEN", "  IF v_old_counts THEN", ['floors']],
  ['R01', "transcript keep ignores a status change (-> failed)",
    "OR NOT (r_status IS DISTINCT FROM 'failed' OR r_audio IS NOT NULL) THEN 0", "OR false THEN 0", ['floors']],
  ['R02', "transcript keep ignores audio_storage_path",
    "NEW.status::text, NEW.audio_storage_path::text) END;", "NEW.status::text, OLD.audio_storage_path::text) END;", ['floors']],
  ['R03', "point keep ignores a points change (5 -> 0)",
    "NEW.type::text, NEW.points::integer", "NEW.type::text, OLD.points::integer", ['floors']],
  ['R04', "bill floor ignores un-freezing",
    "      IF v_frozen AND NOT COALESCE(NEW.tuition_frozen, false) THEN", "      IF false THEN", ['floors']],
  ['R05', "bill floor ignores un-confirming",
    "      IF v_signed AND NOT COALESCE(NEW.confirmation_status IN ('confirmed', 'adjusted'), false) THEN", "      IF false THEN", ['floors']],
  ['R06', "a re-keyed bill leaves no floor",
    "      v_what := ARRAY['moved'];", "      v_what := ARRAY[]::text[];", ['floors']],
  ['R07', "floor rows can be deleted",
    "  IF TG_OP IN ('DELETE', 'TRUNCATE') THEN", "  IF TG_OP IN ('TRUNCATE') THEN", ['floors']],
  ['R08', "attendance keep ignores a signature-only change",
    "public._floor_mark_level(NEW.status::text, NEW.marked_by)", "public._floor_mark_level(NEW.status::text, OLD.marked_by)", ['floors']],
  ['R09', "homework keep ignores a re-dated homework",
    "        v_new_day := (NEW.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;", "        v_new_day := v_day;", ['floors']],
  ['R10', "lesson keep ignores a date move",
    "  v_moved boolean := OLD.date IS DISTINCT FROM NEW.date;", "  v_moved boolean := false;", ['floors', 'carry']],
  ['R11', "move destination ignores the bill floor",
    "                          OR EXISTS (SELECT 1 FROM unnest(v_kids) AS k(id)\n                                       JOIN public.invoice_state_floor f", "                          OR false AND EXISTS (SELECT 1 FROM unnest(v_kids) AS k(id)\n                                       JOIN public.invoice_state_floor f", ['floors']],
  ['R12', "HC025 also on the service lane",
    "    IF v_lane IN ('person', 'unknown')\n       AND (TG_OP = 'DELETE' OR NEW.marked_by IS NULL) THEN", "    IF v_lane IN ('person', 'unknown', 'service')\n       AND (TG_OP = 'DELETE' OR NEW.marked_by IS NULL) THEN", ['floors']],
  ['C01', "G-11 rule 1 dropped (an upsert's BEFORE INSERT judged as a new row)",
    "    IF FOUND THEN\n      RETURN NEW;\n    END IF;\n  END IF;\n", "    IF false THEN\n      RETURN NEW;\n    END IF;\n  END IF;\n", ['register'], CORE],
  ['C02', "G-11 rule 3 dropped (no free week)",
    "  IF public._lesson_in_free_week(s.date, s.start_time, s.end_time) THEN\n    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;\n  END IF;\n\n  v_month", "  IF false THEN\n    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;\n  END IF;\n\n  v_month", ['register'], CORE],
  ['C03', "teacher rule ignores a past month",
    "  v_teacher_refuse := public._money_month_is_past(v_month) OR v_unbill_person;", "  v_teacher_refuse := v_unbill_person;", ['register'], CORE],
  ['C04', "A-6 dropped (a person's Present un-billed in an unbilled month passes)",
    "  IF v_unbill_person AND v_tier < 1 THEN v_tier := 1; END IF;", "", ['register'], CORE],
  ['C05', "the service lane is refused like a person",
    "  IF v_lane = 'service' THEN\n    -- 7", "  IF false THEN\n    -- 7", ['register'], CORE],
  ['C06', "service_retro_mark not written",
    "    IF v_tier > 0 OR v_teacher_refuse THEN\n      INSERT INTO public.money_change_events (kind, payload)\n      VALUES ('service_retro_mark'", "    IF false THEN\n      INSERT INTO public.money_change_events (kind, payload)\n      VALUES ('service_retro_mark'", ['register'], CORE],
  ['C07', "owner_lane event not written",
    "    IF v_tier > 0 THEN\n      INSERT INTO public.money_change_events (kind, payload)\n      VALUES ('owner_lane'", "    IF false THEN\n      INSERT INTO public.money_change_events (kind, payload)\n      VALUES ('owner_lane'", ['register'], CORE],
  ['C08', "DQ-1 dropped (one-off cover lowers an old mark)",
    "     AND NOT public._lesson_in_free_week(s.date, s.start_time, s.end_time)\n     AND public._floor_mark_level(", "     AND false\n     AND public._floor_mark_level(", ['register'], CORE],
  ['C09', "DQ-1 also refuses the class's regular teacher",
    "                                             OR public.is_teacher_of_class(v_uid, s.class_id)), false)\n     AND NOT public._lesson_in_free_week", "                                             ), false)\n     AND NOT public._lesson_in_free_week", ['register'], CORE],
  ['C10', "the acknowledgement does not check the status written",
    "                            WHERE m ->> 'student_id' = v_kid::text AND m ->> 'status' = v_new_status))", "                            WHERE m ->> 'student_id' = v_kid::text))", ['register'], CORE],
  ['C11', "the acknowledgement does not compare tiers (A-8)",
    "  IF o.tier < COALESCE(p_tier, 3) THEN", "  IF false THEN", ['register'], CORE],
  ['C12', "the acknowledgement accepts a row of another transaction (replay)",
    "   WHERE ov.id::text = v_ack AND ov.txid = txid_current() AND ov.entity = ANY (p_entities);", "   WHERE ov.id::text = v_ack AND ov.entity = ANY (p_entities);", ['register'], CORE],
  ['C13', "tuition_month_state ignores the bill floor's signature",
    "      WHEN COALESCE(i.confirmation_status IN ('confirmed', 'adjusted'), false) OR COALESCE(f.ever_signed, false) THEN 'signed'", "      WHEN COALESCE(i.confirmation_status IN ('confirmed', 'adjusted'), false) THEN 'signed'", ['register'], CORE],
  ['C14', "a past month with no bill but a lesson is T0",
    "             THEN 1 ELSE 0 END\n        END;", "             THEN 0 ELSE 0 END\n        END;", ['register'], CORE],
  ['C15', "a confirmed current month is T0",
    "      v_tier := CASE WHEN v_state IN ('frozen', 'signed') THEN 2 ELSE 0 END;", "      v_tier := 0;", ['register'], CORE],
  ['C16', "no confirmation needed",
    "  IF v_tier >= 1 AND NOT COALESCE(p_confirm, false) THEN", "  IF false THEN", ['register'], CORE],
  ['C17', "the token is not checked",
    "  IF (v_tier >= 1 OR p_token IS NOT NULL) AND p_token IS DISTINCT FROM v ->> 'token' THEN", "  IF false THEN", ['register'], CORE],
  ['C18', "HC050 dropped (writes with the trigger disabled)",
    "  IF v_enabled IS DISTINCT FROM 'O' THEN", "  IF false THEN", ['register'], CORE],
  ['C19', "bulk: a T2 item rides on the batch reason",
    "  IF p_via = 'bulk' AND v_tier >= 2 AND NOT", "  IF false AND v_tier >= 2 AND NOT", ['register'], CORE],
  ['C20', "a T2 bulk change is not reviewed",
    "    'review_required', v_tier = 3 OR (v_tier = 2 AND p_via = 'bulk')", "    'review_required', v_tier = 3", ['register'], CORE],
  ['C21', "the plan ignores the free week",
    "      SELECT j.*, CASE WHEN j.crossing AND NOT public._lesson_in_free_week(s.date, s.start_time, s.end_time)", "      SELECT j.*, CASE WHEN j.crossing", ['register'], CORE],
  ['C22', "repair ignores the enrollment (Present outside it)",
    "             CASE WHEN public.student_enrolled_on(v_kid, v_class, ss.date) THEN v_status ELSE 'Excused' END AS status", "             v_status AS status", ['register'], CORE],
  ['C23', "the service role may run the checked path",
    "TO authenticated;\nGRANT EXECUTE ON FUNCTION public.log_money_automation_refused", "TO authenticated, service_role;\nGRANT EXECUTE ON FUNCTION public.log_money_automation_refused", ['register'], CORE],
  ['C24', "trigger-made writes are judged (the cancel's excuse-all)",
    "  IF pg_trigger_depth() > 1 THEN\n    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;\n  END IF;\n  -- 1", "  -- 1", ['register'], CORE],
  ['C25', "an admin's old billed mark passes raw (rule 5 dropped)",
    "    IF v_tier = 0 THEN\n      RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;\n    END IF;\n    -- Conductor", "    IF true THEN\n      RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;\n    END IF;\n    -- Conductor", ['register', 'fnreg'], CORE],
  // round 2: the reviewer's three real survivors, and the round's own changes
  ['X01', "DQ-1 refuses an equal level too (a cover re-saving an old mark unchanged)",
    "         < public._floor_mark_level(v_old_status, v_old_by) THEN", "         <= public._floor_mark_level(v_old_status, v_old_by) THEN", ['register'], CORE],
  ['X07', "record_money_change_event open to any signed-in user",
    "  v_uid uuid := public._session_require_admin();\n  o public.money_change_overrides;\n  v_payload", "  v_uid uuid := auth.uid();\n  o public.money_change_overrides;\n  v_payload", ['register'], CORE],
  ['F01', "mark-attendance: a teacher may un-bill a person's Present after the week in the current month",
    "          return crossing && (past || unbillPerson);", "          return crossing && past;", ['fnreg'], 'supabase/functions/mark-attendance/index.ts'],
  ['C26', "rule 1 sees the row without locking it (R-2 race)",
    " WHERE a.session_id = NEW.session_id AND a.student_id = NEW.student_id FOR UPDATE;", " WHERE a.session_id = NEW.session_id AND a.student_id = NEW.student_id;", ['register'], CORE],
  ['C27', "the ruling dropped: an enrolment RPC's backdated mark refused with a raw code",
    "    IF v_rpc IS NOT NULL\n", "    IF false\n", ['register'], CORE],
  ['C28', "the ruling widened: every admin statement treated as an enrolment RPC",
    "  IF v_name IS NULL THEN\n    RETURN NULL;\n  END IF;\n  v_name := split_part", "  IF v_name IS NULL THEN\n    RETURN 'end_enrollment';\n  END IF;\n  v_name := split_part", ['register'], CORE],
  ['C29', "the ruling widened: an RPC's raw UPDATE of a person's mark (not Excused) passes",
    "            OR (v_rpc = 'stars_sync_resolve_conflict' AND TG_OP = 'UPDATE' AND NEW.marked_by = v_uid)) THEN", "            OR TG_OP = 'UPDATE') THEN", ['register'], CORE],
  ['C30', "preflight no longer checks the 1a bodies",
    "IS DISTINCT FROM r.want THEN", "IS DISTINCT FROM r.want AND false THEN", ['register'], CORE],
  ['C31', "preflight compares the raw md5 (live 1a is CRLF: a healthy database refused)",
    "AND (SELECT md5(replace(p.prosrc, E'\\r', '')) FROM pg_proc p WHERE p.oid = to_regprocedure(r.sig))", "AND (SELECT md5(p.prosrc) FROM pg_proc p WHERE p.oid = to_regprocedure(r.sig))", ['register'], CORE],
  // round 3 (review R2-1): the RPC from the server's call stack, not the client's text
  ['C32', "current_query() restored (the client's text decides: alias / literal / comment forgeries pass)",
    "  GET DIAGNOSTICS v_ctx = PG_CONTEXT;\n", "  RETURN substring(lower(COALESCE(current_query(), '')) from '(?:^|[^a-z0-9_])\"?(end_enrollment|pause_enrollment|modify_enrollment_transfer|ai_action_undo|ai_action_apply|stars_sync_resolve_conflict)\"?[[:space:]]*\\(');\n  GET DIAGNOSTICS v_ctx = PG_CONTEXT;\n", ['register'], CORE],
  ['C33', "a same-named function in another schema or pg_temp is taken for the live RPC (uniqueness dropped)",
    "  IF (SELECT count(*) FROM pg_catalog.pg_proc p WHERE p.proname = v_name) <> 1\n     OR NOT EXISTS", "  IF NOT EXISTS", ['register'], CORE],
  ['C34', "any frame of the stack counts, not the outermost (dynamic SQL text can forge a frame line)",
    "v_lines[array_length(v_lines, 1)]", "(SELECT x FROM unnest(v_lines) x WHERE x ~ '^PL/pgSQL function (?:public\\.)?(end_enrollment|pause_enrollment|modify_enrollment_transfer|ai_action_undo|ai_action_apply|stars_sync_resolve_conflict)\\(' LIMIT 1)", ['register'], CORE],
  // D4 step 2 (file 3, the dated class fee; docs/evidence/D4-build-2.md)
  ['K01', "the fee resolver takes the newest row regardless of date",
    "   WHERE h.class_id = p_class AND h.effective_from <= p_date\n", "   WHERE h.class_id = p_class\n", ['fee'], FEE],
  ['K02', "a fee row need not start on the first of a month",
    "CHECK (effective_from = DATE '1900-01-01' OR EXTRACT(DAY FROM effective_from) = 1)", "CHECK (true)", ['fee'], FEE],
  ['K03', "refresh_pairs of a fee row include months before its date",
    "     WHERE s.class_id = p_class AND s.date >= p_from AND (v_next IS NULL OR s.date < v_next)", "     WHERE s.class_id = p_class AND (v_next IS NULL OR s.date < v_next)", ['fee'], FEE],
  ['K04', "the window runs past the next row",
    "     WHERE s.class_id = p_class AND s.date >= p_from AND (v_next IS NULL OR s.date < v_next)", "     WHERE s.class_id = p_class AND s.date >= p_from", ['fee'], FEE],
  ['K05', "the design's literal 'T0 passes': a raw T0 write by the service role leaves no override row",
    "  RAISE EXCEPTION 'money_change_requires_checked_path' USING ERRCODE = 'HC120',\n    DETAIL = 'entity=class_fee; tier=' || v_tier",
    "  IF v_tier = 0 THEN RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END; END IF;\n  RAISE EXCEPTION 'money_change_requires_checked_path' USING ERRCODE = 'HC120',\n    DETAIL = 'entity=class_fee; tier=' || v_tier", ['fee'], FEE],
  ['K06', "the service role is let through on the history",
    "  IF public._caller_lane() = 'owner' THEN\n    IF v_tier > 0 THEN\n      INSERT INTO public.money_change_events (kind, payload)\n      VALUES ('owner_lane', jsonb_build_object('table', 'class_fee_history'",
    "  IF public._caller_lane() IN ('owner', 'service') THEN\n    IF v_tier > 0 THEN\n      INSERT INTO public.money_change_events (kind, payload)\n      VALUES ('owner_lane', jsonb_build_object('table', 'class_fee_history'", ['fee'], FEE],
  ['K07', "the acknowledgement does not check the fee written",
    "AND o.op = 'set' AND (o.change ->> 'session_rate_vnd')::int = NEW.session_rate_vnd)", "AND o.op = 'set')", ['fee'], FEE],
  ['K08', "the acknowledgement does not check the op",
    "         AND ((TG_OP <> 'DELETE' AND o.op = 'set' AND", "         AND ((TG_OP <> 'DELETE' AND", ['fee'], FEE],
  ['K09', "the acknowledgement's tier is not compared (A-8)",
    "  IF public._money_ack(ARRAY['class_fee'], v_class, NULL, v_from, NULL, v_tier) THEN", "  IF public._money_ack(ARRAY['class_fee'], v_class, NULL, v_from, NULL, 0) THEN", ['fee'], FEE],
  ['K10', "the 1900 row may be deleted",
    "  IF TG_OP = 'DELETE' AND OLD.effective_from = DATE '1900-01-01' THEN\n    RAISE", "  IF false THEN\n    RAISE", ['fee'], FEE],
  ['K11', "a fee row may change class or month",
    "  IF TG_OP = 'UPDATE' AND (OLD.class_id IS DISTINCT FROM NEW.class_id", "  IF false AND (OLD.class_id IS DISTINCT FROM NEW.class_id", ['fee'], FEE],
  ['K12', "the mirror takes any value",
    "  IF v_fee IS NOT NULL AND NEW.session_rate_vnd = v_fee THEN", "  IF true THEN", ['fee'], FEE],
  ['K13', "the mirror guard fires on a save that sends the fee unchanged",
    "  FOR EACH ROW WHEN (OLD.session_rate_vnd IS DISTINCT FROM NEW.session_rate_vnd)\n", "  FOR EACH ROW\n", ['fee'], FEE],
  ['K14', "a fee change that moves no fee is still judged by its reach",
    "  v_moves boolean := p_fee_before IS DISTINCT FROM p_fee_after;", "  v_moves boolean := true;", ['fee'], FEE],
  ['K15', "the exec does not bring the mirror level",
    "  UPDATE public.classes c SET session_rate_vnd = public.class_fee_on(c.id, v_today)\n   WHERE c.id = v_class", "  UPDATE public.classes c SET session_rate_vnd = c.session_rate_vnd\n   WHERE c.id = v_class", ['fee'], FEE],
  ['K16', "the exec writes with the mirror's guard switched off",
    "   WHERE t.tgrelid = 'public.classes'::regclass AND t.tgname = 'zz_class_fee_mirror_guard';\n  IF v_enabled IS DISTINCT FROM 'O' THEN",
    "   WHERE t.tgrelid = 'public.classes'::regclass AND t.tgname = 'zz_class_fee_mirror_guard';\n  IF false THEN", ['fee'], FEE],
  ['K17', "an Excused mark counts as reached",
    "AND a.status::text IN ('Present', 'Absent', 'Late');", "AND a.status::text IN ('Present', 'Absent', 'Late', 'Excused');", ['fee'], FEE],
  ['K18', "any trigger-made write passes (not only the baseline and the cascade)",
    "  IF pg_trigger_depth() > 1 THEN\n    IF TG_OP = 'INSERT'", "  IF pg_trigger_depth() > 1 THEN\n    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;\n    IF TG_OP = 'INSERT'", ['fee'], FEE],
  ['K19', "the owner lane leaves no event",
    "  IF public._caller_lane() = 'owner' THEN\n    IF v_tier > 0 THEN\n      INSERT INTO public.money_change_events (kind, payload)\n      VALUES ('owner_lane', jsonb_build_object('table', 'class_fee_history'",
    "  IF public._caller_lane() = 'owner' THEN\n    IF false THEN\n      INSERT INTO public.money_change_events (kind, payload)\n      VALUES ('owner_lane', jsonb_build_object('table', 'class_fee_history'", ['fee'], FEE],
  ['K20', "preflight no longer checks the 1b bodies",
    "IS DISTINCT FROM r.want THEN", "IS DISTINCT FROM r.want AND false THEN", ['fee'], FEE],
  ['K21', "preflight compares the raw md5 (a CRLF paste of 1b refused)",
    "AND (SELECT md5(replace(p.prosrc, E'\\r', '')) FROM pg_proc p WHERE p.oid = to_regprocedure(r.sig))", "AND (SELECT md5(p.prosrc) FROM pg_proc p WHERE p.oid = to_regprocedure(r.sig))", ['fee'], FEE],
  ['K22', "a fee function callable by authenticated",
    "FROM PUBLIC, anon, authenticated, service_role;\n\nNOTIFY", "FROM PUBLIC, anon, authenticated, service_role;\nGRANT EXECUTE ON FUNCTION public.class_fee_on(uuid, date) TO authenticated;\n\nNOTIFY", ['fee'], FEE],
  ['K23', "authenticated may insert into the history",
    "GRANT SELECT ON public.class_fee_history TO authenticated;", "GRANT SELECT, INSERT ON public.class_fee_history TO authenticated;", ['fee'], FEE],
  ['K24', "TRUNCATE of the history allowed",
    "BEGIN\n  RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',\n    DETAIL = 'code=fee_history_truncate", "BEGIN\n  RETURN NULL;\n  RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',\n    DETAIL = 'code=fee_history_truncate", ['fee'], FEE],
  ['K25', "the baseline is not inserted for existing classes",
    "SELECT c.id, DATE '1900-01-01', COALESCE(c.session_rate_vnd, 0), 'Baseline: the fee when dated fees were installed'\n  FROM public.classes c\n WHERE NOT EXISTS",
    "SELECT c.id, DATE '1900-01-01', COALESCE(c.session_rate_vnd, 0), 'Baseline: the fee when dated fees were installed'\n  FROM public.classes c\n WHERE false AND NOT EXISTS", ['fee'], FEE],
  ['K34', "F-3 undone: teachers read every class's fee history",
    "  USING (public.has_role(auth.uid(), 'admin'::public.app_role));", "  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role));", ['fee'], FEE],
  ['K35', "F-4 undone: the mirror guard is a column trigger again (a fee rewritten by another trigger is not judged)",
    "CREATE TRIGGER zz_class_fee_mirror_guard BEFORE UPDATE ON public.classes", "CREATE TRIGGER zz_class_fee_mirror_guard BEFORE UPDATE OF session_rate_vnd ON public.classes", ['fee'], FEE],
  ['K36', "OQ-1 undone: a fee change reaching a paid bill of this month (or next) is T0 again, no reason",
    "    IF COALESCE((v ->> 'tier')::int, 3) < 1\n       AND EXISTS", "    IF false\n       AND EXISTS", ['fee'], FEE],
  // the functions (mutated in place for the run, restored after)
  ['K26', "calculate-tuition prices every lesson at the mirror again",
    "      const defaultRate = classFeeOn(feeHistory, s.class_id, s.date, Number(classData?.session_rate_vnd ?? 0));", "      const defaultRate = Number(classData?.session_rate_vnd ?? 0);", ['fee'], 'supabase/functions/calculate-tuition/index.ts'],
  ['K27', "calculate-tuition-bulk prices every lesson at the mirror again",
    "          const defaultRate = classFeeOn(feeHistory, s.class_id, s.date, Number(classInfo?.session_rate_vnd ?? 0));", "          const defaultRate = Number(classInfo?.session_rate_vnd ?? 0);", ['fee'], 'supabase/functions/calculate-tuition-bulk/index.ts'],
  ['K28', "projected-per-class at the mirror again",
    "        sum + classFeeOn(feeHistory, enrollment.class_id, s.date, enrollment.classes?.session_rate_vnd || 0), 0);", "        sum + (enrollment.classes?.session_rate_vnd || 0), 0);", ['fee'], 'supabase/functions/_lib/projected-per-class.ts'],
  ['K29', "classFeeOn takes the newest row regardless of the lesson's date",
    "  for (const r of rows) if (r.from <= d) return r.fee;", "  return rows[0].fee;", ['fee'], 'supabase/functions/_lib/class-fee.ts'],
  ['K30', "any history read error is taken for 'no table' (the past silently at today's fee)",
    "  if (!error) return false;\n  const code", "  return true;\n  const code", ['fee'], 'supabase/functions/_lib/class-fee.ts'],
  ['K31', "a missing table by code alone is not recognised",
    "  return code === \"42P01\" || code === \"PGRST205\";", "  return false;", ['fee'], 'supabase/functions/_lib/class-fee.ts'],
  ['K33', "F-1 undone: a message naming the table and 'does not exist' is taken for 'no table' (a column error prices at the mirror)",
    "  return code === \"42P01\" || code === \"PGRST205\";", "  return code === \"42P01\" || code === \"PGRST205\" || (/class_fee_history/.test(String(error.message ?? \"\")) && /(schema cache|does not exist)/i.test(String(error.message ?? \"\")));", ['fee'], 'supabase/functions/_lib/class-fee.ts'],
  ['K32', "the class breakdown reports the mirror, not the month's fee",
    "      const sessionRate = classFeeOn(feeHistory, classId, startDate, Number(classData?.session_rate_vnd ?? 0));", "      const sessionRate = Number(classData?.session_rate_vnd ?? 0);", ['fee'], 'supabase/functions/calculate-tuition/index.ts'],
  // D4-2 independent review (docs/evidence/D4-2-review.md): things the review thought were not pinned
  ['V01', "the reach's tier is taken over the FIRST reached month only (a later confirmed month ignored)",
    "public.tuition_reach(v_kids, p_class, v_min, v_max)", "public.tuition_reach(v_kids, p_class, v_min, v_min)", ['fee'], FEE],
  ['V02', "an Absent mark (billable) is not counted as reached",
    "AND a.status::text IN ('Present', 'Absent', 'Late');", "AND a.status::text IN ('Present', 'Late');", ['fee'], FEE],
  ['V03', "the trigger does not check the acknowledged month (an ack for an earlier month writes a later one)",
    " AND (o.change ->> 'effective_from')::date = v_from", "", ['fee'], FEE],
  ['V04', "any trigger-made DELETE passes (not only the cascade of a deleted class)",
    "IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = OLD.class_id) THEN", "IF TG_OP = 'DELETE' THEN", ['fee'], FEE],
  ['V05', "the trigger's tier fails open on a NULL",
    "v_tier := COALESCE((v_reach ->> 'tier')::int, 3);", "v_tier := COALESCE((v_reach ->> 'tier')::int, 0);", ['fee'], FEE],
];

const D4_LITERALS = [/('[0-9a-f]{32}'\) THEN\s+-- this file)/g];
async function patchLiterals(text) {
  // Load the mutated file over D1 + D2 (its first paste accepts D2's bodies),
  // read the md5 of the two installed bodies, and put them in the preflight.
  const db = await makeDb(PGlite, { people: true, migrations: [AUDIT, CANCEL, D1, D2] });
  try { await db.exec(text.replace(/\r\n/g, '\n')); }
  catch (e) { await db.close(); return { text, error: e.message }; }
  const m = (await db.query(`SELECT proname, md5(replace(prosrc, E'\\r', '')) m FROM pg_proc
     WHERE proname IN ('_session_change_assess', '_session_erased_recently') ORDER BY proname`)).rows;
  await db.close();
  const [assess, erased] = m.map((r) => r.m);
  let i = 0;
  const out = text.replace(/'[0-9a-f]{32}'\) THEN(\s+)-- this file/g, (_, sp) => `'${i++ === 0 ? assess : erased}') THEN${sp}-- this file`);
  void D4_LITERALS;
  return { text: out };
}

const runSuite = (suite, mutatedPath, target = FLOORS) => new Promise((done) => {
  const args = [join(repo, 'scripts', 'pgtest', suite.file), ...suite.migs.map((f) => (f === target ? mutatedPath : migPath(f))), ...(suite.args ?? [])];
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  child.on('close', (code) => done({ code, out }));
});

const only = process.argv.slice(2);
const original = readFileSync(migPath(FLOORS), 'utf8').replace(/\r\n/g, '\n');
const results = [];
const coreOriginal = readFileSync(migPath(CORE), 'utf8').replace(/\r\n/g, '\n');
const feeOriginal = readFileSync(migPath(FEE), 'utf8').replace(/\r\n/g, '\n');
for (const [id, what, find, repl, suites, file] of MUTANTS) {
  if (only.length && !only.includes(id)) continue;
  if (file && file.startsWith('supabase/functions/')) {
    // an edge function: mutated in place for the run, the original bytes put back after
    const fp = join(repo, file);
    const before = readFileSync(fp);
    const src = before.toString('utf8').replace(/\r\n/g, '\n');
    const n = src.split(find).length - 1;
    if (n !== 1) { results.push({ id, what, verdict: `BAD MUTANT (pattern found ${n} times)` }); console.log(`${id} BAD MUTANT (${n})`); continue; }
    const by = [];
    try {
      writeFileSync(fp, src.replace(find, () => repl));
      for (const s of suites) {
        const r = await runSuite(SUITES[s], migPath(CORE), CORE);
        if (r.code !== 0) {
          const firstFail = r.out.split('\n').find((l) => l.includes('FAIL')) ?? r.out.split('\n').slice(-3).join(' ');
          by.push(`${s}: ${firstFail.trim().slice(0, 160)}`);
          break;
        }
      }
    } finally {
      writeFileSync(fp, before);
    }
    const verdict = by.length ? `CAUGHT by ${by[0]}` : `SURVIVED (${suites.join(', ')})`;
    results.push({ id, what, verdict });
    console.log(`${id} ${verdict}`);
    continue;
  }
  if (file === CORE || file === FEE) {
    const text0 = file === CORE ? coreOriginal : feeOriginal;
    const n = text0.split(find).length - 1;
    if (n !== 1) { results.push({ id, what, verdict: `BAD MUTANT (pattern found ${n} times)` }); console.log(`${id} BAD MUTANT (${n})`); continue; }
    const p = resolve(tmpdir(), `d4-mutant-${id}-${process.pid}.sql`);
    writeFileSync(p, text0.replace(find, () => repl));
    const by = [];
    for (const s of suites) {
      const r = await runSuite(SUITES[s], p, file);
      if (r.code !== 0) {
        const firstFail = r.out.split('\n').find((l) => l.includes('FAIL')) ?? r.out.split('\n').slice(-3).join(' ');
        by.push(`${s}: ${firstFail.trim().slice(0, 160)}`);
        break;
      }
    }
    const verdict = by.length ? `CAUGHT by ${by[0]}` : `SURVIVED (${suites.join(', ')})`;
    results.push({ id, what, verdict });
    console.log(`${id} ${verdict}`);
    continue;
  }
  const pairs = Array.isArray(find) ? find : [[find, repl]];
  const counts = pairs.map(([f]) => original.split(f).length - 1);
  if (counts.some((n) => n !== 1)) { results.push({ id, what, verdict: `BAD MUTANT (pattern found ${counts.join('/')} times)` }); console.log(`${id} BAD MUTANT (${counts})`); continue; }
  let mutated = original;
  for (const [f, r] of pairs) mutated = mutated.replace(f, () => r);
  const { text, error } = await patchLiterals(mutated);
  if (error) { results.push({ id, what, verdict: `CAUGHT at install (${error.slice(0, 80)})` }); console.log(`${id} CAUGHT at install`); continue; }
  const p = resolve(tmpdir(), `d4-mutant-${id}-${process.pid}.sql`);
  writeFileSync(p, text);
  const by = [];
  for (const s of suites) {
    const r = await runSuite(SUITES[s], p);
    if (r.code !== 0) {
      const firstFail = r.out.split('\n').find((l) => l.includes('FAIL')) ?? r.out.split('\n').slice(-3).join(' ');
      by.push(`${s}: ${firstFail.trim().slice(0, 160)}`);
      break;
    }
  }
  const verdict = by.length ? `CAUGHT by ${by[0]}` : `SURVIVED (${suites.join(', ')})`;
  results.push({ id, what, verdict });
  console.log(`${id} ${verdict}`);
}
console.log('\n| Mutant | Breaks | Verdict |\n|---|---|---|');
for (const r of results) console.log(`| ${r.id} | ${r.what} | ${r.verdict.replace(/\|/g, '/')} |`);
const survivors = results.filter((r) => !r.verdict.startsWith('CAUGHT'));
console.log(`\n${results.length - survivors.length} caught, ${survivors.length} survived or bad`);
process.exit(survivors.length ? 1 : 0);
