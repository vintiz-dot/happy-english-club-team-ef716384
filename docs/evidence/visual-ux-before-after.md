# Visual UX: before and after (21 Nov 2026)

Both builds were run through the same `preview/visual-ux` harness with the same
made-up data (no production data): **before** = main at `088a8fed` (the commit
before this work), **after** = main at `9b07eb1e`. Phone width 375 px.

| Check | Before | After |
|-------|--------|-------|
| Student Home: where the first homework appears | 2,256 px down ("My Homework", about three screens of scrolling) | 543 px ("What do I need to do next?", first screen) |
| Student Home when the homework read fails | Mascot says "All homework done! You rock!", Open quests 0, no error | "We couldn't load your homework." + Try again; no all-clear; quests shown as unknown |
| Home vs Homework count (6 open, 1 late, 1 old miss, 1 done) | Home filtered its own list, capped at 5 | Both show 6 to do and the same late item first (shared `src/lib/studentHomework.ts`) |
| Family page when the children lookup fails | "No students are linked to your family account yet — please contact the school." | "We couldn't load your family's records." + Try again |
| Teacher: reaching the register | "Attendance" button 1,794 px down in the agenda; the link's `?session=` was ignored, so it opened the calendar without the register | "Today's class" card at the top with "Mark attendance"; the link opens that session's register on its week |

How to repeat: start the `visual-ux-preview` launch entry and open
`http://localhost:8091/?screen=student-home|student-homework|family|teacher`
with `&state=ok|error|empty` and `&theme=light|dark`. For the "before" side,
`git archive 088a8fed` into a short folder, copy `preview/` in, change the port,
and link `node_modules`.
