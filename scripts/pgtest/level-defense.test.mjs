// Defend My Level (28 Nov 2026): the combined case and the facts
// (supabase/functions/_lib/level-defense-case.ts) and the standardized-test
// score -> CEFR suggestions (src/lib/levelDefense/standardizedTests.ts).
//
// What it holds: a recent standardized result outweighs the AI audit; an
// old one counts for less and a very old one not at all; the weighted median
// leans to the cautious side on a tie; the facts carry no model output;
// Cambridge / IELTS bands land where the published scales put them.
import assert from 'node:assert/strict';
import { transform } from 'esbuild';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'level-defense-'));
async function loadTs(rel, name) {
  const out = join(dir, `${name}.mjs`);
  writeFileSync(out, (await transform(readFileSync(resolve(rel), 'utf8'), { loader: 'ts', format: 'esm' })).code);
  return import(pathToFileURL(out).href);
}

let passed = 0;
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); passed++; };
const ok = (c, msg) => { assert.ok(c, msg); passed++; };

const lib = await loadTs('supabase/functions/_lib/level-defense-case.ts', 'case');
const std = await loadTs('src/lib/levelDefense/standardizedTests.ts', 'std');
const today = new Date('2026-11-28T00:00:00Z');

// ---- the case ------------------------------------------------------------
{
  const c = lib.combineCase({ claimed: 'A2', standardized: [], approvedPoints: [], today });
  eq([c.combined_level, c.defended], [null, null], 'nothing to weigh: no answer, not a "not defended"');
}
{
  // A KET at A2 last spring outweighs an AI audit saying A1.
  const c = lib.combineCase({
    claimed: 'A2', today,
    standardized: [{ test_name: 'Cambridge A2 Key (KET)', test_date: '2026-05-10', cefr_level: 'A2', score_label: 'Scale 128' }],
    approvedPoints: [],
    auditLevel: { level: 'A1', date: '2026-11-20' },
  });
  eq([c.combined_level, c.defended], ['A2', true], 'recent standardized result carries the case');
  eq(c.sources.find((s) => s.kind === 'standardized').weight, 3, 'recent standardized weight 3');
}
{
  // The same certificate three years old is not counted; two years old weighs 1.
  const old = lib.combineCase({ claimed: 'B1', today, approvedPoints: [],
    standardized: [{ test_name: 'PET', test_date: '2023-06-01', cefr_level: 'B1' }], auditLevel: { level: 'A2', date: null } });
  eq(old.sources.map((s) => s.kind), ['evidence_audit'], 'a result over 36 months old is left out');
  const mid = lib.combineCase({ claimed: 'B1', today, approvedPoints: [],
    standardized: [{ test_name: 'PET', test_date: '2024-11-01', cefr_level: 'B1' }] });
  eq(mid.sources[0].weight, 1, 'a 2-year-old result weighs 1');
}
{
  // Tie: A2 (test, 2) vs B1 (teacher, 2) -> the cautious side, A2.
  const c = lib.combineCase({ claimed: 'B1', today, standardized: [],
    approvedPoints: [{ level: 'B1', assessed_at: '2026-10-01' }],
    testEstimate: { level: 'A2', date: '2026-11-25' } });
  eq([c.combined_level, c.defended], ['A2', false], 'a tie leans to the lower level');
}
{
  // A2+ counts as A2, C2 as C1; teacher points older than 12 months are dropped; only the two latest count.
  eq([lib.baseLevelIndex('A2+'), lib.baseLevelIndex('C2'), lib.baseLevelIndex('nope')], [2, 5, -1], 'level scale');
  const c = lib.combineCase({ claimed: 'A1', today, standardized: [], approvedPoints: [
    { level: 'A2', assessed_at: '2026-11-01' }, { level: 'A2', assessed_at: '2026-09-01' },
    { level: 'Pre-A1', assessed_at: '2026-08-01' }, { level: 'Pre-A1', assessed_at: '2025-01-01' }] });
  eq(c.sources.length, 2, 'two latest teacher levels only');
  eq(c.combined_level, 'A2', 'teacher levels decide when nothing else is held');
}
{
  const c = lib.combineCase({ claimed: 'B1', today, approvedPoints: [{ level: 'B1', assessed_at: '2026-11-01' }, { level: 'B1', assessed_at: '2026-10-01' }],
    standardized: [{ test_name: 'KET', test_date: '2026-09-01', cefr_level: 'A2' }], testEstimate: { level: 'B1', date: null } });
  ok(c.standardized_below_claim && /below the claim/.test(c.summary), 'a recent standardized result below the claim is flagged');
}

// ---- the facts -----------------------------------------------------------
{
  const p = lib.buildPortfolio({
    attendance: [{ status: 'Present' }, { status: 'Late' }, { status: 'Absent' }, { status: 'Excused' }],
    homework: [{ status: 'graded', grade: 'A', graded_at: '2026-11-01' }, { status: 'submitted', grade: null, graded_at: null }],
    skills: [{ skill: 'speaking', score: 80, date: '2026-11-01' }, { skill: 'speaking', score: 60, date: '2026-11-08' }],
    videos: [{ final_score: 70, approved_at: '2026-11-01' }, { final_score: 90, approved_at: '2026-11-02' }, { final_score: 10, approved_at: null }],
    vocabulary: [{ mastery_level: 5, cefr: 'a2' }, { mastery_level: 1, cefr: null }],
    srsCards: 7, errors: 3, lessonReports: 2,
    examReports: [{ title: 'Mid-term', exam_date: '2026-10-20' }],
    standardized: [{ test_name: 'Movers', test_date: '2026-06-01', cefr_level: 'A1', score_label: '13 shields' }],
    approvedPoints: [{ level: 'A1', assessed_at: '2026-06-02T00:00:00Z' }],
  });
  eq([p.lessons_attended, p.homework_done, p.homework_graded], [2, 2, 1], 'lessons and homework counted');
  eq(p.skill_averages.speaking, { average: 70, count: 2, latest: '2026-11-08' }, 'skill average');
  eq([p.videos_approved, p.video_average], [2, 80], 'only approved videos');
  eq([p.words_learned, p.words_mastered, p.words_by_level], [2, 1, { A2: 1, unlevelled: 1 }], 'words');
  eq(p.approved_levels, [{ level: 'A1', date: '2026-06-02' }], 'approved levels dated');
  ok(!JSON.stringify(p).match(/estimate|rationale|verdict|confidence/), 'the facts hold no model output');
  ok(lib.portfolioLines(p).some((l) => l.startsWith('STANDARDIZED TESTS')), 'the audit is told about standardized results');
}

// ---- score -> CEFR -------------------------------------------------------
{
  const s = (id, n) => std.suggestCefr(std.testKind(id), n);
  eq([s('a2-key', 119), s('a2-key', 120), s('a2-key', 140), s('a2-key', 99)], ['A1', 'A2', 'B1', null], 'A2 Key bands, out of range = none');
  eq([s('b1-preliminary', 139), s('b1-preliminary', 155), s('b1-preliminary', 160)], ['A2', 'B1', 'B2'], 'B1 Preliminary bands');
  eq([s('b2-first', 175), s('b2-first', 180)], ['B2', 'C1'], 'B2 First bands');
  eq([s('ielts', 4.5), s('ielts', 5.5), s('ielts', 7), s('ielts', 8.5)], ['B1', 'B2', 'C1', 'C2'], 'IELTS bands');
  eq([s('yle-movers', null), s('yle-flyers', 15)], ['A1', 'A2'], 'YLE certificate at its own level');
  eq([s('toefl-junior', 800), s('other', 3)], [null, null], 'tests whose report states the level: no guess');
  eq([std.scoreLabel(std.testKind('yle-starters'), 12), std.scoreLabel(std.testKind('ielts'), 6), std.scoreLabel(std.testKind('a2-key'), 133)],
    ['12 shields', 'Band 6', 'Scale 133'], 'score labels');
  ok(std.STANDARDIZED_TESTS.every((t) => (t.bands || []).every((b) => std.STANDARDIZED_LEVELS.includes(b.level))), 'every band is a stored level');
}

// ---- the function and the migration agree ---------------------------------
{
  const fn = readFileSync('supabase/functions/cefr-defense/index.ts', 'utf8');
  const sql = readFileSync('supabase/migrations/20261128200000_level_defense_portfolio.sql', 'utf8');
  ok(/action === "start_test"/.test(fn) && /claim\.defense_open !== true/.test(fn), 'a child starts a test only while the defence is open');
  ok(/\.eq\("defense_open", true\)/.test(fn), 'start_test closes the door with a conditional update (no double start)');
  ok(/childStandardized\(ev\.standardized\)/.test(fn) && !/case: claim \? caseFor[\s\S]{0,400}childTest/.test(fn.slice(fn.indexOf('// The child: the teacher'))), 'the child gets no case');
  for (const col of ['defense_open', 'defense_note', 'portfolio', 'case_summary']) ok(sql.includes(col), `migration adds ${col}`);
  ok(/GRANT SELECT, INSERT, UPDATE, DELETE ON public\.student_standardized_tests TO authenticated/.test(sql), 'new table granted');
  ok(!/FOR SELECT TO authenticated\s+USING \(public\.has_role\(auth\.uid\(\), 'student'/.test(sql), 'no student-wide policy');
}

console.log(`level-defense: ${passed} passed`);
