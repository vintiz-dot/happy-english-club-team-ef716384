# Lesson monitor - report for the owner (B-GATE)

17 November 2026. The full design is `docs/LESSON_MONITOR_DESIGN.md`. Nothing has been built. Children are referred to by code (S01...) only.

## The idea

After each lesson, the computer listens to the class recording and gives the teacher a short report: what was said, how much the teacher talked compared with the class, which of the lesson's words came up, and who spoke.

## What we tested

- Three real lessons (about 5 hours) and short video clips of 27 children, all kept on the office laptop, never in the app's code.
- Several ways of turning speech into text: services from Microsoft (Azure), OpenAI and Google (Gemini), and a free program that runs on our own laptop.
- Telling speakers apart, and recognising a child by their voice.
- How long our laptop takes, and what each way costs.
- One of our teachers checked 5 minutes of transcript by hand, and listened to 11 "voice groups" the computer had made.

## What works

- **Writing down the words.** On the 5 minutes the teacher checked, Microsoft got about 97 words in 100 right, and kept the children's grammar mistakes as they said them (it "corrected" a child only once in 40 lines). The free program on our laptop agrees with the paid services about as well as they agree with each other - but no teacher has checked it yet.
- **Running at the school.** The free program does a 90-minute lesson in about 2 hours on our laptop, overnight, for less than one cent of electricity. No GPU is needed.

## What does not work

- **Knowing which child is speaking.** Of the 11 voice groups the teacher listened to, only one was a single child; four were several children mixed together, five were the teacher, one was a TV. Recognising children by voice named nobody at all in the real lessons (it is built to say "unknown" when unsure, and it was unsure every time); even in the best laboratory test it could name a child only about half the time on long stretches, and almost never on short answers, which is how children usually speak in class.
- **Vietnamese.** Only Google's service wrote any Vietnamese, and Google's terms are not acceptable for children's data. The others write nothing when a child speaks Vietnamese.
- **Talking over each other.** When several people speak at once, words go missing and speakers get mixed up, with every service.

So the computer can tell the teacher **what was said in the lesson**, but **not reliably who said it**. Every name must come from the teacher.

## Three options

| | A. Class report on a school computer (recommended) | B. A, plus voice recognition of children | C. A, but Microsoft writes the words |
|---|---|---|---|
| What the teacher gets | transcript she can click to hear any moment; lesson words heard / not heard; teacher-vs-class talking time (if it passes a check); she may type a child's code against a voice | the same, plus "this sounds like S07" on some long stretches, which she must confirm | the same as A, words a little better checked, ready within minutes |
| Children's voices leave the school? | no (the recording is already stored in the app; the report is made on a school computer) | no | yes, every lesson, to Microsoft abroad |
| Voiceprints of children kept? | no | yes - biometric data | no |
| Cost | pilot: nothing extra (our laptop). Whole school: one small computer, about USD 160-340 once, and about USD 1-2 a month of electricity - speed not yet tested | as A, plus class time to record each child for a minute | about USD 1.50 a lesson, about USD 195 a month at about 130 lessons (price not confirmed) |
| Main worry | teachers' time to read it | biometric data for little gain today | children's voices and spoken names go abroad; legal paperwork for that |

The biggest cost of every option is **teachers' time**: if each report takes 10 minutes to read, 130 lessons a month is about 22 teacher-hours. We have not measured this yet.

(We do not know the exact number of lessons a month; 130 is a guess from about 5 a day. Please correct it.)

## Risks for children's privacy

- **The recordings hold children's voices and their spoken names.** Option A keeps all processing in the school; B adds voiceprints (biometric data, with legal duties to protect, delete and report leaks); C sends every lesson abroad.
- **Consent.** You told us parents have agreed to biometric data. The consent form must still say, in separate lines a parent can refuse: that a computer writes down the lesson, where that happens, that only the teacher reads it, and (for B) voiceprints. A Vietnamese data-protection adviser has not checked any of this yet. One child without consent means that class is not processed - a room microphone cannot leave one child out.
- **The office laptop.** For a pilot it would hold children's recordings. It must have disk encryption switched on and a separate account, and the report must never be sent by Zalo, Facebook or email.
- **Teachers are recorded too.** The report is for the teacher; it should not be used to judge or pay teachers unless you decide so and tell them first.
- **Something that exists today.** The app's current "Transcripts" page lets an AI decide which child said what, sends children's names to OpenAI, and shows CEFR levels and lesson summaries to families without a teacher approving them. The monitor will not use it. You may want it switched off or changed; that is a separate decision.
- **Clean-up.** When the evaluation ends, the test recordings, voiceprints and the temporary vendor connection on the server should be deleted. The commands are ready.

## Recommendation: GO LATER - Option A, as a four-week pilot

**Option A, with one class and one teacher for four weeks, the report for the teacher only and nothing sent to families. Not B (voice recognition) and not C (Microsoft) for now.** It is the only option the tests support without children's voices leaving the school or voiceprints being kept, and a pilot costs nothing but teacher time.

It should start only when all four are true:
1. The new class recorder has recorded at least three real lessons of that class with both microphones working (your hardware checklist).
2. The consent form for that class includes the lines above.
3. A teacher checks 5 minutes of our own laptop's transcript (about 45 minutes of her time) and it is about as good as Microsoft's was; and the teacher-vs-class talking time matches what she hears. If the words are poor, we would come back to you about option C; if the talking time is poor, that part is left out.
4. The office laptop has disk encryption on and a separate account for this.

We stop the pilot early if the teacher needs more than 15 minutes per report, or finds nothing useful in two of the four weeks. Buying a computer, or putting the report inside the app, would be decided after the pilot.

The "MONITOR_GO" you gave on 12 November came before these tests, so we are asking again for this specific plan.

## The question you need to answer

**Do you approve a four-week pilot of Option A - one class, one teacher, the report for the teacher only, made on the office laptop, no voiceprints, nothing sent to families or abroad - to start once the four conditions above are met? (If yes, which class and which teacher?)**
