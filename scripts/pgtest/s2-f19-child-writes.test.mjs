// F-19 (S2): a login writes word-list rows about its own child only; the two
// family upload buckets get a size limit.
//
// Real files: 20261111110000 (is_teacher_of_class), the rollback block
// "F-19" (the two policies as 20260801090000 has them: the "before" and the
// rollback under test), 20261116096000 (the fix, pasted twice). The read,
// delete and staff policies are 20260801090000's.
import { readFileSync } from "node:fs";
import { harness, makeDb, cast, rollbackBlock } from "./s2-prelude.mjs";

const { ok, eq, done, bail } = harness("F-19");
const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const FIX = MIGS.find((f) => f.includes("20261116096000"));
if (!TA_MIG || !FIX) bail("usage: s2-f19-child-writes.test.mjs <20261111110000> <20261116096000>");
const BEFORE = rollbackBlock("F-19");
if (!BEFORE) bail("no rollback F-19 block in the evidence file");

const D = await makeDb(TA_MIG);
const { q, one, exec, as } = D;
await D.db.exec(`
  CREATE TABLE public.student_vocabulary_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, student_id uuid, class_id uuid,
    word text NOT NULL, definition_en text, image_url text, UNIQUE (user_id, word));
  ALTER TABLE public.student_vocabulary_entries ENABLE ROW LEVEL SECURITY;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_vocabulary_entries TO authenticated;
  GRANT ALL ON public.student_vocabulary_entries TO service_role;
  CREATE POLICY "vocab_select_own_or_linked" ON public.student_vocabulary_entries FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR (student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id)));
  CREATE POLICY "vocab_delete_own" ON public.student_vocabulary_entries FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR (student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id)));
  CREATE POLICY "staff_read_class_vocab" ON public.student_vocabulary_entries FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id))
      OR (student_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = student_vocabulary_entries.student_id
          AND public.is_teacher_of_class(auth.uid(), e.class_id))));
  INSERT INTO storage.buckets (id, name) VALUES ('homework','homework'), ('submissions','submissions'), ('resources','resources');
`);
ok("the rollback block installs as the starting state", (await exec(BEFORE)) === null);
const W = await cast(D);
const { P } = W;
const plant = (uid, sid, word) => as(uid, `INSERT INTO public.student_vocabulary_entries (user_id, student_id, word, definition_en, image_url) VALUES ($1,$2,$3,'rude word','https://evil.example/x.png')`, [uid, sid, word]);
const own = (await one(`INSERT INTO public.student_vocabulary_entries (user_id, student_id, word) VALUES ($1,$2,'cat') RETURNING id`, [P.KID, W.A1])).id;
const scanned = (await one(`INSERT INTO public.student_vocabulary_entries (user_id, student_id, class_id, word) VALUES (NULL,$1,$2,'dog') RETURNING id`, [W.A1, W.CA])).id;
const bLogin = P.PARENT2;

console.log("=== before ===");
eq("BEFORE: family 2's login puts a word into child A1's list", (await plant(bLogin, W.A1, "planted")).n, 1);
eq("BEFORE: an unlinked sign-up does too", (await plant(P.NEW, W.A1, "planted")).n, 1);
eq("BEFORE: the child's own word can be re-pointed at another child", (await as(P.KID, `UPDATE public.student_vocabulary_entries SET student_id = $2 WHERE id = $1`, [own, W.B1])).n, 1);

console.log("=== apply ===");
const fixText = readFileSync(FIX, "utf8");
const pols = async () => q(`SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'student_vocabulary_entries' ORDER BY 1`);
ok("the fix applies", (await exec(fixText)) === null);
const P1 = await pols();
ok("and applies a second time", (await exec(fixText)) === null);
eq("the second paste changes nothing", await pols(), P1);

console.log("=== after ===");
for (const [l, u] of [["another family", bLogin], ["unlinked sign-up", P.NEW], ["no role", P.NOROLE], ["a teacher", P.TEA], ["the child's own login, for another child", P.KID]]) {
  const r = await plant(u, u === P.KID ? W.B1 : W.A1, "planted");
  ok(`${l} cannot put a word into another child's list`, r.err !== null || r.n === 0, r);
}
eq("the child's own login adds a word for itself", (await plant(P.KID, W.A1, "bird")).n, 1);
eq("...and with no child named (a word bank of its own)", (await plant(P.NEW, null, "solo")).n, 1);
eq("the family primary login adds a word for its own child", (await plant(P.PARENT, W.A1, "fish")).n, 1);
eq("the second login adds a word for its child", (await plant(P.SECOND, W.A1, "frog")).n, 1);
ok("a word cannot be re-pointed at another child", ((r) => r.err !== null || r.n === 0)(await as(P.KID, `UPDATE public.student_vocabulary_entries SET student_id = $2 WHERE id = $1`, [own, W.B1])));
eq("practising an own word (mastery update) still works", (await as(P.KID, `UPDATE public.student_vocabulary_entries SET definition_en = 'a pet' WHERE id = $1`, [own])).n, 1);
eq("practising a word a teacher scanned for the child still works", (await as(P.KID, `UPDATE public.student_vocabulary_entries SET definition_en = 'a pet' WHERE id = $1`, [scanned])).n, 1);
eq("the child still reads both", (await as(P.KID, `SELECT count(*)::int n FROM public.student_vocabulary_entries WHERE id IN ($1,$2)`, [own, scanned])).rows[0].n, 2);
eq("the class teacher still reads the class's words", (await as(P.TEA, `SELECT count(*)::int n FROM public.student_vocabulary_entries WHERE id IN ($1,$2)`, [own, scanned])).rows[0].n, 2);
eq("the child deletes its own word", (await as(P.KID, `DELETE FROM public.student_vocabulary_entries WHERE id = $1`, [own])).n, 1);
eq("save-word (service role) inserts for any child", (await as(null, `INSERT INTO public.student_vocabulary_entries (user_id, student_id, word) VALUES ($1,$2,'svc')`, [P.KID, W.A1], { role: "service_role" })).n, 1);
eq("homework and submissions now have a 50 MB limit; other buckets untouched",
  await q(`SELECT id, file_size_limit::int l FROM storage.buckets ORDER BY id`),
  [{ id: "homework", l: 52428800 }, { id: "resources", l: null }, { id: "submissions", l: 52428800 }]);
await q(`UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'homework'`);
ok("a limit the owner already set is left as it is", (await exec(fixText)) === null && (await one(`SELECT file_size_limit::int l FROM storage.buckets WHERE id='homework'`)).l === 10485760);
await q(`UPDATE storage.buckets SET file_size_limit = 52428800 WHERE id = 'homework'`);

console.log("=== refusals ===");
await q(`INSERT INTO storage.objects (bucket_id, name, metadata) VALUES ('submissions', 'x/big.mp4', '{"size": 60000000}')`);
ok("a stored file over 50 MB stops the install", /over 50 MB/.test((await exec(fixText)) ?? ""));
await q(`DELETE FROM storage.objects WHERE name = 'x/big.mp4'`);
await q(`DROP POLICY "vocab_insert_own" ON public.student_vocabulary_entries`);
ok("a database without vocab_insert_own (not production's state) stops the install", /not production's state|not there/.test((await exec(fixText)) ?? ""));

console.log("=== rollback ===");
ok("the rollback block runs", (await exec(BEFORE)) === null);
eq("the defect is back", (await plant(bLogin, W.A1, "planted-again")).n, 1);
eq("the limits are off again", (await q(`SELECT count(*)::int n FROM storage.buckets WHERE file_size_limit IS NOT NULL`))[0].n, 0);
ok("the fix pastes again", (await exec(fixText)) === null);
ok("and the plant is refused again", ((r) => r.err !== null || r.n === 0)(await plant(bLogin, W.A1, "planted-3")));
done();
