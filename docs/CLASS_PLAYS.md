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
  never doubles up. With fewer children, one child reads two parts, but never two parts
  that speak one after the other: a child never asks and answers themself. When every
  child is already in a part's conversation, the TEACHER reads it (actor -1, shown as
  "Teacher"). From 2 children up the suite holds every play to that.
- `teacher: true`: always the teacher's part (the Narrator for Mars). No child is cast in it
  and it counts for no child; it is never optional or a group.
- **Who gets the next child.** Past the always-cast roles, each child goes where it
  lightens the load most, the heaviest voice first, the teacher's voice included: the
  next optional role (in the order listed) or one more member of a group. A child with 3
  lines or fewer is light enough, so then a cameo wins. A group never carries half the
  play while two-line cameos take the other children.
- With 2-3 children, every way of handing out the parts is tried. No two parts that
  speak one after the other share a voice, and the teacher takes the lightest part that
  fits.
- `member: k` on a group line pins it to member k (wrapping with fewer members). The
  child who names a prop is the one who gets it back.
- `if: "role"` on a stage line shows it only when that role is cast. Stage text never
  names a cut cameo.
- A merged line keeps the part it belongs to (`as`). The screen and the print show
  "Beach Kid 1 as Mom Crab", and the suite counts it as that part when it checks for
  self-talk. A `{@role}` mention of a character the teacher voices keeps the character's name.
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

## The playwright's charter (owner, 25 Nov 2026)

Why: the owner read a Mars play and found it poor. It had no story, and one child
asked a question and answered it themself ("Is it a pen? Yes, it is!"). These
rules come from a second research pass, checked on 25 Nov 2026.

**Evidence rules** (a study supports each one):

1. **Questions are real.** The asker cannot know the answer, because another character
   holds it: a closed box or bag, hands behind a back, eyes shut, a phone, a curtain. A
   question and its answer always belong to two different roles, never to one line.
   Referential questions draw longer answers than display questions (Long & Sato 1983;
   Brock 1986). Children aged 8-13 negotiate meaning in pair tasks (Oliver 1998, *MLJ*
   82(3), 192 children).
2. **A two-way gap at least once.** Each side holds something the other needs (Oliver 1998).
3. **One matching action per target word.** The action shows the meaning (`do`), and the
   child who says the word does it. Never put an arbitrary move on a target word.
   - Gestures the children reproduce helped 5-year-olds recall words (Tellier 2008).
   - Unrelated gestures recall worse than none (García-Gámez & Macizo 2019).
4. **Whole body where the room allows:** move like the animal, put on the coat. In
   Mavilidi et al. 2015 (111 preschoolers, randomised), acting out the word beat
   gesture, which beat unrelated exercise, which beat sitting and repeating. In
   Toumpaniari et al. 2015 (67 four-year-olds, English animal words), the same order held.
5. **Two or three of the unit's frames carry the play.** Each comes 4-6 times with one
   slot changing ("Is it a cat?" / "Is it a ruler?"). Learners take apart chunks they
   learned whole and reuse the parts (Myles, Hooper & Mitchell 1998; Ellis 2002).
6. **Few words, heard many times, in the same story.** At most about 8 target words. The
   same story three times beat three stories with the same words (Horst et al. 2011).
7. **The same script, performed again.** Write it to be rehearsed at least three times
   and to come back as an `encore`. Readers' theatre builds fluency through repeated
   reading for an audience (Young & Rasinski 2009; meta-analysis by Mastrothanasis et
   al. 2023).
8. **Chorus first, then solo.** Every target chunk is said in chorus before a child says
   it alone, and every child gets at least one line of their own. Choral response
   raises participation; the evidence is thin and mostly from special education.
9. **The class teacher, in short bursts.** Drama-based pedagogy works best led by the
   class teacher, in a few hours spread out (Lee, Enciso & Brown 2020).
10. **Surprise lands on a target word.** The box holds the wrong thing, and the "cat" is
    a ruler. Surprise wins attention, but repetition makes words stick (Gambi et al.
    2021: a wrong guess did not boost preschoolers' word learning).
11. **Humour is about the thing, never about a child,** and it is visual and physical.

**Craft rules** (good theatre, no direct study):

12. **A story spine.** Someone wants something, meets an obstacle, tries, and gets it,
    or gets something better. Every play has a want, a problem, a turn and a payoff.
13. **The rule of three.** Two wrong tries, then the right one, with a twist on the
    third. Repetition then feels like suspense, not drill.
14. **Every line has a reason.** A character speaks because they want, need, fear or find
    something. A line that only shows off a word is cut.
15. **Pantomime call-and-response.** The chorus shouts the target chunk on cue ("No, it
    isn't!", "It's behind you!"), and the audience may join.
16. **The gap is on stage:** a prop hides the information.
17. **Group roles are real roles,** inside the action (the wind, the shoppers), so a shy
    child is in the story and can step up later.
18. **Each part has its moment:** a laugh, a reveal or a save. A part that only says
    "Yes" is cut or rewritten.
19. **A shared last line.** The whole cast says the key chunk together, and it resolves
    the want.
20. **Characters, not labels.** Each one wants something different and sounds different
    (the grumpy one, the hasty one, the sleepy one). Dramatic irony is welcome: the
    audience sees what a character cannot.

**Mars (Look 1, grades 1-2, American English):**
- Most lines are 2-6 words (10 at most).
- The teacher narrates.
- Listen-and-do comes first.
- Every line has a `do`.

The suite enforces what it can:
- no line asks a question and answers it;
- from 2 children up, nobody talks to themself at any size;
- nobody joins a chorus (`everyone`, or `all` of their group) that answers the question they just asked;
- up to the play's size, every child has a line of their own.

The rest is checked by a table read: a reviewer casts the play at several sizes and
reads it as the children would.

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

## Which courses follow the charter yet

All five courses follow it (25 Nov 2026). Mars (Look 1) came first, then Venus (36),
SKY 1 (36), Jupiter (15) and Sun Class (24). Every play was written by an Opus
playwright, table-read at 2-14 children by an independent reviewer, and revised.
`CHARTER_PENDING` in the test is now empty: a charter check fails for every course,
and no course goes back on that list. The plays are as written: no teacher has
staged them in class yet.
