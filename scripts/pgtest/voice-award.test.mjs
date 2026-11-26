// Voice points assistant, the pure check (27 Nov 2026): supabase/functions/_lib/voice-award-parse.ts.
// Gemini says what was heard; this module decides whether it may save by itself.
import { transform } from 'esbuild';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const read = (...p) => readFileSync(join(repo, ...p), 'utf8');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 400)}` : ''}`);
  value ? pass++ : fail++;
};

const src = read('supabase', 'functions', '_lib', 'voice-award-parse.ts');
ok('voice-award-parse.ts imports nothing', !/^\s*import\s/m.test(src));
const out = join(mkdtempSync(join(tmpdir(), 'voice-award-')), 'parse.mjs');
writeFileSync(out, (await transform(src, { loader: 'ts', format: 'esm' })).code);
const V = await import(pathToFileURL(out).href);

const types = read('src', 'lib', 'voiceAward', 'types.ts');
ok('MAX_POINTS equals the contract', new RegExp(`VOICE_AWARD_MAX_POINTS = ${V.MAX_POINTS}`).test(types));
ok('SKILLS equal the contract', V.SKILLS.every((s) => types.includes(`"${s}"`)) && V.SKILLS.length === 6);
const fnSrc = read('supabase', 'functions', 'voice-award', 'index.ts');
ok('the function writes nothing and uses no service role for data',
  !/\.(insert|update|upsert|delete)\(/.test(fnSrc) && !/SERVICE_ROLE/.test(fnSrc));

const R = [
  { id: 'a', fullName: 'Nguyễn Minh Anh' },
  { id: 'b', fullName: 'Potato' },
  { id: 'c', fullName: 'Trần Đức Bảo' },
  { id: 'd', fullName: 'Lê Hoàng Khoa' },
];
const ans = (o) => JSON.stringify({ heard: 'x', intent: 'award', confidence: 'high', student_index: 1, name_heard: 'Minh Anh', points: 10, skill: null, ...o });

console.log('\n1. names');
ok('normalize strips diacritics and đ', V.normalizeName('Đức  Bảo!') === 'duc bao');
{
  const p = V.checkAnswer(ans({}), R);
  ok('"minh anh" is Nguyễn Minh Anh: high', p.confidence === 'high' && p.studentId === 'a' && p.studentName === 'Nguyễn Minh Anh' && p.points === 10, p);
}
ok('given name only ("Anh", last word) is exact', V.checkAnswer(ans({ name_heard: 'Anh' }), R).confidence === 'high');
ok('Potatoe vs Potato (typo)', V.checkAnswer(ans({ student_index: 2, name_heard: 'Potatoe' }), R).confidence === 'high');
ok('Bao for Trần Đức Bảo', V.checkAnswer(ans({ student_index: 3, name_heard: 'bao' }), R).confidence === 'high');
ok('Duc Bao pair', V.checkAnswer(ans({ student_index: 3, name_heard: 'Đức Bảo' }), R).confidence === 'high');
{
  const p = V.checkAnswer(ans({ student_index: 2, name_heard: 'Khoa' }), R);
  ok('index says Potato but the name is Khoa: low, names the mismatch', p.confidence === 'low' && /Khoa/.test(p.reason) && /Potato/.test(p.reason), p);
}
{
  const R2 = [...R, { id: 'e', fullName: 'Phạm Minh Khôi' }];
  const p = V.checkAnswer(ans({ name_heard: 'Minh' }), R2);
  ok('two Minhs: low, reason names both', p.confidence === 'low' && /Minh Anh/.test(p.reason) && /Minh Khôi/.test(p.reason), p);
  const q = V.checkAnswer(ans({ name_heard: 'Minh Anh' }), R2);
  ok('"Minh Anh" is still sure among two Minhs', q.confidence === 'high', q);
}
{
  const R3 = [{ id: 'a', fullName: 'Tom Nguyen' }, { id: 'b', fullName: 'Tommy Tran' }];
  const p = V.checkAnswer(ans({ name_heard: 'Tom' }), R3);
  ok('Tom vs Tommy: exact beats near by the gap, or both are named', p.confidence === 'high' || /Tommy/.test(p.reason), p);
}
ok('three-letter names must be exact ("ann" vs "anh")', V.nameSimilarity('ann', 'anh') === 0 && V.nameSimilarity('anh', 'anh') === 1);
ok('no name heard: low, says so', /name/.test(V.checkAnswer(ans({ name_heard: null }), R).reason));

console.log('\n2. index');
{
  const p = V.checkAnswer(ans({ student_index: 9 }), R);
  ok('index past the roster: no child, low', p.studentId === null && p.confidence === 'low' && p.intent === 'award', p);
  ok('index 0 and negative: no child', V.checkAnswer(ans({ student_index: 0 }), R).studentId === null && V.checkAnswer(ans({ student_index: -1 }), R).studentId === null);
  ok('null index: no child, reason mentions the name', /Minh Anh/.test(V.checkAnswer(ans({ student_index: null }), R).reason));
  ok('non-integer index: no child', V.checkAnswer(ans({ student_index: 1.5 }), R).studentId === null);
  ok('a uuid never comes from Gemini', V.checkAnswer(ans({ student_index: 'a' }), R).studentId === null);
}

console.log('\n3. points');
for (const [pts, bad] of [[0, true], [150, true], [-150, true], [2.5, true], [null, true], [-30, false], [100, false], [-100, false], [1, false]]) {
  const p = V.checkAnswer(ans({ points: pts }), R);
  ok(`points ${pts}: ${bad ? 'low with a reason' : 'high'}`, bad ? p.confidence === 'low' && !!p.reason : p.confidence === 'high' && p.points === pts, p);
}
ok('150 is reported as heard, never clamped', V.checkAnswer(ans({ points: 150 }), R).points === 150);
ok('points as a string are not a number', V.checkAnswer(ans({ points: '10' }), R).confidence === 'low');

console.log('\n4. confidence');
ok('Gemini low stays low', V.checkAnswer(ans({ confidence: 'low' }), R).confidence === 'low');
ok('missing confidence is low', V.checkAnswer(ans({ confidence: undefined }), R).confidence === 'low');

console.log('\n5. intents');
for (const i of ['confirm', 'cancel', 'undo']) {
  const p = V.checkAnswer(ans({ intent: i, student_index: 1, points: 10 }), R);
  ok(`${i}: passes through, no child, no points`, p.intent === i && p.studentId === null && p.studentName === null && p.points === null && p.confidence === 'high', p);
}
ok('confirm said unsurely is low', V.checkAnswer(ans({ intent: 'confirm', confidence: 'low' }), R).confidence === 'low');
{
  const p = V.checkAnswer(ans({ intent: 'none' }), R);
  ok('none: low with a reason', p.intent === 'none' && p.confidence === 'low' && !!p.reason, p);
}
ok('unknown intent becomes none', V.checkAnswer(ans({ intent: 'pay' }), R).intent === 'none');
ok('garbage text becomes none, low, no throw', V.checkAnswer('not json', R).intent === 'none' && V.checkAnswer(null, R).confidence === 'low');

console.log('\n6. skill');
for (const [w, s] of [['talk', 'speaking'], ['speak', 'speaking'], ['write', 'writing'], ['handwriting', 'writing'], ['behaviour', 'focus'], ['quiet', 'focus'], ['group work', 'teamwork'], ['Listening', 'listening'], ['reading', 'reading'], ['kindness', null], [null, null], ['none', null]]) {
  ok(`skill "${w}" -> ${s}`, V.normalizeSkill(w) === s);
}
ok('skill flows into the parse', V.checkAnswer(ans({ skill: 'write' }), R).skill === 'writing');
ok('an unknown skill does not lower a sure award', V.checkAnswer(ans({ skill: 'kindness' }), R).confidence === 'high');

console.log('\n7. prompt and schema');
{
  const roster = Array.from({ length: 14 }, (_, i) => ({ id: `s${i}`, fullName: `Child Number${i}` }));
  const prompt = V.buildPrompt(roster);
  ok('every roster index is in the prompt', roster.every((_, i) => new RegExp(`^${i + 1}\\. `, 'm').test(prompt)));
  ok('no id reaches the prompt', !roster.some((r) => prompt.includes(`${r.id} `)));
  ok('prompt names skills, negatives and accents', V.SKILLS.every((s) => prompt.includes(s)) && /take away/.test(prompt) && /accent/.test(prompt));
  const props = V.GEMINI_RESPONSE_SCHEMA.properties;
  ok('schema has every field the check reads', ['heard', 'intent', 'student_index', 'name_heard', 'points', 'skill', 'confidence'].every((k) => props[k]));
  ok('schema skill enum equals SKILLS', props.skill.enum.join() === V.SKILLS.join());
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
