# Lesson monitor: teacher check of one 5-minute stretch

Instructions only. The printed sheets and the recording stay on the evaluation computer and are never put in this repository.

**Why:** nobody has yet written down what the children really said, so we cannot tell which transcriber is accurate. Your marks make the reference. It takes about 45 minutes for 5 minutes of lesson.

**You get:** one audio clip of 5 minutes from one lesson, and the printed transcript of that clip from each system (System 1, 2, 3...). Mark only **System 1**. Keep the others in a folder; they are for us.

**How to do it:** listen to the clip while you read System 1's sheet. Stop and replay as often as you like. Use a red pen. The letters A, B, C are the transcriber's guesses of who is speaking; they do not mean the same person from one system to the next.

**Four kinds of mark**

| What you hear | What you do on the sheet |
|---|---|
| **Wrong word**: the sheet has a word the child did not say | Cross it out. Write the word the child really said above it. |
| **Missed word**: the child said something and the sheet has nothing | Put a ^ where it belongs. Write the missing word(s) above it. |
| **Fixed-up grammar**: the child made a mistake (for example "he go", "two cat", "I am agree") and the sheet shows the correct English | Write **F** in the margin. Cross out the corrected words and write exactly what the child said, mistake included. Do not correct the child. |
| **Wrong speaker**: the letter at the start of the line is not the person talking | Circle the letter. Write who is speaking: **T** for you or another teacher, or the child's first initial or seat number. No full names. |

**Also**

- Vietnamese the child says: if the sheet has no Vietnamese or has strange English words instead, treat it as a wrong or missed word and write the Vietnamese you heard.
- Not sure? Write a **?** next to it. A "?" is better than a guess.
- Do not tidy punctuation or capital letters; we ignore them.
- Words nobody can understand: write **(x)**.

**When you finish:** hand back the marked System 1 sheet. We type it in as the reference and compare every system against it. Marks you made show us three numbers per system: wrong and missed words, how often the system silently fixed a child's mistake, and how often it named the wrong speaker.

Nothing from this check goes to parents or into any child's record.


---

## The teacher's folder (built 12 Nov 2026)

`python scripts\lesson-eval\make_teacher_pack.py` builds `C:\Users\Dell\hec-audio-eval\FOR-TEACHER\` (outside this repository):

- `0-START-HERE.html` - the instructions above plus Task 2, written for the teacher; print it.
- `Task-1-transcript\` - `lesson-clip-5-minutes.mp3` and `transcript-to-mark.html` (System 1, numbered lines, the time into the clip on each line, wide spacing for red-pen marks).
- `Task-2-who-is-speaking\` - eleven clips of about 20 seconds (`clip-01.mp3` ...) in shuffled order and `answer-sheet.html`: for each clip the teacher writes who is speaking (a child's code, T for an adult, ? if unsure) and whether it is one voice or several. This checks the voice clusters the computer made; the computer named nobody.

**The office must add one thing by hand:** a printed list of the children's codes (S01 ...) with their names, from the key file. No model reads that file, so it is not in the folder. The teacher writes codes on the sheets, never names.

**Coming back:** the two marked sheets. Task 1 is typed into `work\teacher-check\b1\annotated.tsv`; then `python scripts\lesson-eval\b1_score.py preserve` gives each system's wrong and missed words, how often it silently corrected a child's mistake, and how often it named the wrong speaker.
