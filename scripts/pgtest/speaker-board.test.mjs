// Who's speaking, on the recorder screen (23 Nov 2026, owner): the teacher
// taps a child when they start speaking and again when they stop; two or more
// at once is a conversation / dialogue; only the children marked present are
// listed. src/lib/speakerMarks.ts holds the rules; this suite holds them:
//   1. tap toggles one child on and off; several together is a conversation;
//      teacher / chorus are exclusive; the last child off is "nobody".
//   2. the label says "Conversation: A + B" for two or more, "A speaking" for one.
//   3. present children only (Present / Late), everyone when no register is read.
//   4. the recorder screen embeds the board; the old one-shot name chips are gone;
//      both recording banners are the small ones.
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

const lib = read('src', 'lib', 'speakerMarks.ts');
ok('speakerMarks.ts imports nothing', !/^\s*import\s/m.test(lib));
const out = join(mkdtempSync(join(tmpdir(), 'speaker-board-')), 'speakerMarks.mjs');
writeFileSync(out, (await transform(lib, { loader: 'ts', format: 'esm' })).code);
const S = await import(pathToFileURL(out).href);

console.log('\n1. tapping');
{
  let s = S.NOBODY;
  s = S.tap(s, { kind: 'student', id: 'a' });
  ok('one child tapped: that child speaks', s.kind === 'student' && s.studentIds.join() === 'a' && !S.isConversation(s));
  s = S.tap(s, { kind: 'student', id: 'b' });
  ok('a second child tapped: both, a conversation', s.studentIds.join() === 'a,b' && S.isConversation(s));
  s = S.tap(s, { kind: 'student', id: 'c' });
  ok('three: still a conversation', S.isConversation(s) && s.studentIds.length === 3);
  s = S.tap(s, { kind: 'student', id: 'a' });
  ok('tapping a speaking child again stops only that child', s.studentIds.join() === 'b,c');
  s = S.tap(S.tap(s, { kind: 'student', id: 'b' }), { kind: 'student', id: 'c' });
  ok('the last child off: nobody', s.kind === 'stop' && s.studentIds.length === 0);
  const t = S.tap({ kind: 'student', studentIds: ['a', 'b'] }, { kind: 'teacher' });
  ok('the teacher tile ends the children\'s turn', t.kind === 'teacher' && t.studentIds.length === 0 && !S.isConversation(t));
  ok('a mark row with two children reads as a conversation', S.isConversation({ kind: 'student', student_ids: ['x', 'y'] }) && !S.isConversation({ kind: 'student', student_ids: ['x'] }));
}

console.log('\n1b. quicker taps (24 Nov 2026): a tap replaces, a hold adds');
{
  let s = S.tapOne(S.NOBODY, { kind: 'student', id: 'a' });
  ok('a tap: that child speaks', s.kind === 'student' && s.studentIds.join() === 'a');
  s = S.tapOne(s, { kind: 'student', id: 'b' });
  ok('the next child\'s tap ends the last one\'s turn (no tapping off)', s.studentIds.join() === 'b' && !S.isConversation(s));
  s = S.tap(s, { kind: 'student', id: 'c' });
  ok('a hold adds a second child: a conversation', s.studentIds.join() === 'b,c' && S.isConversation(s));
  s = S.tapOne(s, { kind: 'student', id: 'c' });
  ok('tapping a speaking child in a conversation stops only that child', s.studentIds.join() === 'b');
  s = S.tapOne(s, { kind: 'student', id: 'b' });
  ok('tapping the one speaking child stops them: nobody', s.kind === 'stop');
  ok('the teacher and chorus tiles behave as before', S.tapOne(S.NOBODY, { kind: 'chorus' }).kind === 'chorus');
  const panel = read('src', 'components', 'speakers', 'SpeakerTapPanel.tsx');
  ok('the board: a plain tap is tapOne, a long press is tap', /onClick=\{\(\) => void send\(tapOne\(state, \{ kind: "student"/.test(panel) && /onLongPress=\{\(\) => void send\(tap\(state, \{ kind: "student"/.test(panel));
}

console.log('\n2. the label');
{
  const names = { a: 'An', b: 'Binh' };
  const nm = (id) => names[id];
  ok('two: Conversation: An + Binh', S.speakingLabel({ kind: 'student', studentIds: ['a', 'b'] }, nm) === 'Conversation: An + Binh');
  ok('one: An speaking', S.speakingLabel({ kind: 'student', studentIds: ['a'] }, nm) === 'An speaking');
  ok('nobody / teacher / chorus', S.speakingLabel(S.NOBODY, nm) === 'Nobody marked' && S.speakingLabel({ kind: 'teacher', studentIds: [] }, nm) === 'Teacher speaking' && /chorus/.test(S.speakingLabel({ kind: 'chorus', studentIds: [] }, nm)));
}

console.log('\n3. present children only');
{
  const roster = [{ student_id: 'a' }, { student_id: 'b' }, { student_id: 'c' }, { student_id: 'd' }];
  const reg = [{ student_id: 'a', status: 'Present' }, { student_id: 'b', status: 'Absent' }, { student_id: 'c', status: 'Late' }, { student_id: 'd', status: 'Excused' }];
  ok('Present and Late are listed; Absent and Excused are not', S.presentChildren(roster, reg).map((k) => k.student_id).join() === 'a,c');
  ok('no register read: everyone enrolled', S.presentChildren(roster, null).length === 4 && S.presentChildren(roster, []).length === 4);
}

console.log('\n4. the screens');
{
  const daily = read('src', 'components', 'recorder', 'DailyRecorder.tsx');
  ok('the recorder screen embeds the board for its lesson', /<SpeakerTapPanel sessionId=\{lesson\.sessionId\} embedded \/>/.test(daily));
  ok('the one-shot name chips are gone', !/Tap a child's name when they speak/.test(daily));
  const panel = read('src', 'components', 'speakers', 'SpeakerTapPanel.tsx');
  ok('the board lists the present children (presentChildren over the register)', /presentChildren\(roster\.data/.test(panel) && /from\("attendance"\)/.test(panel));
  ok('the board writes marks through the server-filled insert', /from\("lesson_speaker_marks"\)\.insert\(/.test(panel));
  const page = read('src', 'pages', 'LessonSpeakers.tsx');
  ok('the TA phone page uses the same board', /<SpeakerTapPanel sessionId=\{sessionId\} \/>/.test(page));
  const bar = read('src', 'components', 'recorder', 'RecordingBar.tsx');
  ok('recording bar is the small one', /py-1/.test(bar) && /text-sm font-semibold/.test(bar) && !/text-lg/.test(bar));
  const session = read('src', 'components', 'recorder', 'session.ts');
  ok('floating bar is the small one', /px-3 py-1/.test(session) && /h-8 rounded-md px-3 text-sm/.test(session) && !/min-h-11 rounded-md px-4/.test(session));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
