# FIX: analyze-transcript (D-26)

Where I am / next step: started from conductor branch 6404f52b; next step is reading the function, the Teacher Transcripts screen and every reader of `cefr_assessments`, `lesson_overviews`, `student_error_log`.

## Owner's rulings

- "Yes, fix it" - to: "Fix the transcript analysis so it sends no names and nothing reaches families before a teacher approves".
- Then, relayed by the conductor, verbatim: "it's ok to send names. the students use psuedo names in class". So item 1 (neutral labels / no names to the vendor) is dropped: the prompt keeps sending the roster names as it does today, and no name-scrubber is added. Everything else stands: model attribution is a suggestion only, results are staff-only drafts until a teacher approves, spend gate, tests (without the "no roster name in the payload" case).
