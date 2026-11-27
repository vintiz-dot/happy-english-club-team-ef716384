# The AI progress report: what it gives parents, and why (27 Nov 2026)

`generate-student-report` writes a child's progress report for a period (90 days from the screens). Since 27 Nov 2026 it has two parts:

- **The staff analysis** (unchanged shape): the model's CEFR estimate (a staff-only draft until a teacher approves it), skill matrix, strengths, growth areas, learning styles, next steps for the teacher, narrative.
- **The family page** (`report.parent`, English with Vietnamese) and **the period's figures** (`report.facts`, counted by the function, never by the model). The **Family PDF** (report dialog; the bulk export's "Family copy" switch, on by default) prints only these, through HEC Docs (`progress-report`, variant `family`), with the level only when a teacher approved it.

Code: `supabase/functions/_lib/student-report.ts` (figures, instructions, the cleaner), `generate-student-report/index.ts` (reads the rows), `hec-docs/templates/progress-report/document.njk` (the family branch), `src/lib/reports/familyReportContext.ts` (class, teacher, approved level). Tests: `scripts/pgtest/student-report.test.mjs`, the hec-docs snapshot `progress-report/family.html`.

## What was wrong before

1. **Parents got the staff document.** The only PDF showed the model's unapproved CEFR level with a "78% confidence", "Growth areas", "Next steps for the teacher" and "21 errors · 120 words" evidence counts. That broke the rule that families see only an approved level, and it read like an audit, not a report to a family.
2. **English only**, for families who mostly read Vietnamese.
3. **Wrong figures.** Attendance was counted by when the mark row was created (seeded placeholders and late typing moved lessons in and out of the period; cancelled lessons counted). "Total words" was the last 120 words of the bank, all-time, capped.
4. **Thin evidence.** The teacher-approved lesson reports (each child's highlight, the teacher's comment, the next focus, the words and topics taught) and homework were not read at all.
5. **No next step for the family**: no idea of what to do at home or what comes next.

## What the family page does, and the research behind each part

| Part | What it is | Why |
| --- | --- | --- |
| A moment to be proud of | One specific thing the child said, made or managed, from the evidence | People judge an experience mostly by its peak and its end (peak-end rule, Kahneman et al. 1993); specific praise is believed, general praise is not (Hattie & Timperley 2007). |
| This period at a glance | Lessons attended, new words, homework handed in, work reviewed, lesson reports sent, points | Showing the work done for a customer raises perceived value and trust (operational transparency, Buell & Norton 2011). The numbers are the school's, so they are exact. |
| English level | Only a level a teacher approved, with a plain English and Vietnamese description | CEFR "can do" wording (Council of Europe, Companion Volume 2020) instead of codes; a family never sees a model's guess. |
| What your child can do now | 3-4 can-do statements, each with its evidence | "Where am I / how am I going" feedback with evidence (Hattie & Timperley 2007); praise for effort and strategy, never fixed talent (Mueller & Dweck 1998). |
| Our next goals | At most two, each with why it matters and what the teacher will do in class | "Where to next" (Hattie & Timperley); a difficulty framed as the next step the school owns, not a fault of the child or the family. Individual teacher-to-family messages that say what to improve next raised engagement and cut drop-out (Kraft & Rogers 2015; Kraft & Dougherty 2013). |
| How you can help at home | 2-3 activities of 5-10 minutes, no English needed by the parent, nothing to buy, tied to the period's words and topics | Parents' involvement in learning at home is among the strongest family factors in achievement (Henderson & Mapp 2002; Hill & Tyson 2009, "academic socialization"); it must be easy for parents who do not speak English. |
| Ask your child | Two dinner questions about something the class really did | Gives the parent a way in to talk about learning (Epstein's "learning at home"); the child retells in their own words. |
| Next period | One shared goal for child, family and teacher | A goal with visible progress keeps people going (goal-gradient effect, Kivetz, Urminsky & Zheng 2006); framed as a goal, never a promised result. |
| From the teacher | 2-3 warm, specific sentences | Ends on a high point (peak-end); loyalty rests on trust and a relationship with a person (commitment-trust theory, Morgan & Hunt 1994). |

## What it never does

- Promise a result, a score, a band or a school place. The cleaner drops any family line with "guarantee", "will pass/get into", "cam kết", "đảm bảo".
- Label the child ("lazy", "struggles", "slow learner", "lười", "yếu kém", "chậm hiểu"): dropped.
- Compare with other children, market, or mention money.
- Invent evidence: the model sees only the data package, and the figures come from the function.

## How to use it

1. Open a student's AI Report and press **Generate report**. Read the green **Family page** box: it is what parents get.
2. Approve the level on the growth chart (CefrDraftsCard) if it is right; only then does the Family PDF show a level.
3. **Family PDF** for parents; **Teacher copy** for staff. In bulk: Reports > export with "Family copy" on.

The model is Claude (`_lib/claude-json.ts`, better Vietnamese), with gpt-4o-mini as the fallback when Claude is unavailable.
