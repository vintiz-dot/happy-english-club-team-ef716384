# Class plays

Short plays tied to a unit's words and grammar, two or three a month for Mars,
Venus, Jupiter, SKY 1 and Sun Class (owner, 25 Nov 2026). A play is an EXTENSION:
it lives in the Plays tab of Lesson Decks, beside the lesson, and the teacher
decides whether to add its minutes. It never takes minutes from a lesson.

- What a play is, and how it is cast: `src/lib/lessonDecks/plays.ts`.
- The plays: `src/content/lessonDecks/plays/<course>/u<NN>.ts` (or `t<N>.ts` for an
  IELTS term), listed in that folder's `index.ts`, all collected in `plays/index.ts`.
- The suite: `node scripts/pgtest/lesson-plays.test.mjs`.

## Why plays like these (the research, 25 Nov 2026)

The evidence supports play that is guided, meaningful and repeated. It does not
support play for its own sake.

- **Guided beats free.** An adult-set language goal, not free play (Skene et al. 2022,
  *Child Development*; vocabulary g = 0.93 against free play).
- **Actions that match the meaning.** Acting a word out with a gesture that shows what
  it means beats plain teaching for vocabulary (embodied-learning meta-analysis,
  *Educational Psychology Review* 2026, g = 0.65 comparing groups). How much movement
  there is matters less than whether it matches. So every young-learner line carries a
  `do`.
- **Listen and do first** for the youngest (Shintani's input-based tasks with
  6-year-old beginners): the first round is the teacher reading while the children act.
- **Repeat with spacing, and fix between rounds.** Repeating a task builds fluency
  (de Jong & Perfetti 2011, 4/3/2). Massed repetition (six in a row) slows speech and
  breeds parroting, and its advantage is gone a week later (Suzuki & Hanzawa 2022).
  So rehearsal moves through rounds: script, then key words, then own words. There is a
  one-minute teacher fix (`focusOnForm`) between rounds, and an `encore` in a later lesson.
- **Teams, not rankings,** if points are used (Sailer & Homner 2020).
- **Songs and chants** are fine for refrains and vocabulary. They are not the fluency
  method (Hamilton et al. 2024).
- There are no strong trials of plays and speaking fluency in EFL children. These
  plays are built from the nearest evidence, not a tested recipe.

## Casting: one script, any class size

A play is written once, and `castPlay(play, n)` fits it to the n children in the room.
The Plays tab takes n from today's attendance (Present and Late), or else from the
children enrolled now. It recasts the moment either changes: it listens for
enrolment and attendance changes, and rereads every minute and whenever the tab
regains focus. A child who moves class drops out of the old class's cast and joins
the new one. The teacher can also set the number by hand, for example when
the teacher takes a part.

- Roles without `optional` are always cast. **At most 4 such roles**, so a class of 4
  never doubles up. With fewer children, one child reads two parts.
- `optional: { give: "x" }`: cast only when a child is left for it, in the order the
  roles are listed. Otherwise its lines go to role x. Chains are fine: owl → dog → kids.
- `optional: { cut: true }`: a cameo whose lines are left out when nobody is left.
- `group: { max: k }`: several children share it ("Bee 1", "Bee 2"). Its lines go to
  each member in turn. A line with `all: true` is said by the whole group, and an
  `everyone` line by the whole cast. **A group has at least k solo lines**, so every
  member speaks alone at least once.
- Write `{@id}` to name a role in a line or stage direction. It reads as whoever says
  that role's lines now ("Thank you, {@owl}!" becomes "Thank you, Narrator!").
- The play gives a part of their own to at least 12 children (always-cast roles +
  optional roles + group maxima). The suite casts every play for 1 to 16 children, and
  everyone cast must have a line.
- Children's names go on the parts on screen and on paper only. Nothing about a child
  is saved, and a play never contains a child's name.

## Writing a play: the rules

- **Original text by the school.** Cite a unit's topic, words and grammar. Never copy a
  book's story, song lyrics, dialogue or characters. A play may be inspired by a folk
  tale (stone soup), but the script is ours.
- **The unit's own language.** `targets.words` are the unit's vocabulary (4+, every one
  in the script). `targets.grammar` are its patterns, and the lines use them many times.
  The OD 3 and Reach Higher plays may also use the unit's "Level 4 step" grammar from its
  Lab.
- **When:** `afterLesson` is a real lesson of the unit that has taught most of the
  play's words and grammar. In a 6-lesson unit that is usually lesson 3 and lesson 5 or 6.
- **How many:** 2 or 3 a month for the class, never more than 9 a unit.
  - Oxford Discover (2 lessons a week, ~6 lessons a unit): 2 a unit.
  - Reach Higher (8 lessons a unit, about 4 weeks): 2 a unit (Unit 1 is one lesson: 1).
  - Sun Class (one 2-hour lesson a week, ~12 a term): 6 a term, every other lesson.
  - Look 1 (2 lessons a week): 2 a unit.
- **Rehearsal rounds** add up to no more than `minutes`, and go from script to key words
  to own words. `focusOnForm` holds 2-4 fixes the teacher makes between rounds,
  naming the mistake Vietnamese learners actually make. `encore` is how to perform it
  again in a later lesson, with a change.

| Band | Class | Minutes | Longest line | Shape |
|---|---|---|---|---|
| 6-8 | Mars (Look 1) | 10-20 | 10 words | Listen-and-do first; a `do` on every line; a chorus refrain; 3-6 word lines; the teacher may narrate |
| 7-9 | Venus (OD 1, grades 2-4) | 12-25 | 14 words | Refrain + actions; lines carry the unit's grammar; a twist or joke; not babyish |
| 8-12 | SKY 1 (OD 3), Jupiter (RH 3) | 15-30 | 24 words | Readers' theatre with a problem to solve; the unit's grammar and its Level 4 step; a short improvised ending in the last round |
| 13-16 | Sun Class (IELTS, grades 8-10) | 20-35 | 40 words | A scene from the term's topic: opinions with reasons, comparing, a decision; the script ends in an improvised scene; the last round is with no script |
