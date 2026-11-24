import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 13 "Music and
// Feelings" (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio
// Grade 6: students in grades 6-7 (ages 11-13) working on a book written for younger
// children, so the Lab raises the language, not the book: longer sentences with because,
// although, so and when, topics they care about (school, friends, phones, sport, their
// city, plans) and real talk about their own lives. Every lesson gets a grammar drill
// (the unit's grammar asked, said in the negative, joined, moved in time and changed
// to another person, then used for real talk), one more fluency routine with longer
// phrases, and a writing routine; three lessons write a full planned paragraph. Two
// lessons end with a recorded talk that students make on their own. Time comes from
// games, chants and repeats pitched at younger children, never from the book pages,
// the grammar, the checks or the homework. All text is original.

const fixMinute =
  "Between rounds, stop for one minute: put two mistakes you heard on the board (no names) and let the class fix them, then go on; students who say it again use the fixed form. For grammar, prompt the student to fix it (start the phrase and pause, point to the frame, hold up a finger for the missing word) rather than saying it for them; for a sound, just say it right and let them echo. Say every final -s clearly yourself: students copy what they hear.";

export const odL2U13Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u13-l1": {
      objectives: ["I can explain how music makes me feel, with a reason, in sentences with because, so and although."],
      drop: ["Mood music freeze", "Voice orchestra"],
      add: [
        {
          after: "My favorite song (SB 129 Think)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: how music makes me feel",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, move it to the past, change the person. Then talk about the music in your own life.",
            chunks: [
              "Fast music makes me feel excited.",
              "Does slow music make you feel sleepy?",
              "Loud music doesn't make me nervous, but it makes my little brother cry.",
              "My favorite song makes me feel happy because I remember our last school trip.",
              "Songs like this make my friends feel confident, although they are quite slow.",
              "Last night this song made me feel calm, so I fell asleep quickly.",
            ],
            recycle: ["We can reuse old things instead of throwing them away.", "I try to recycle paper at school because it saves trees."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join it with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 80, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the signal. Use I, you, he, she, we and they in turn." },
              { seconds: 80, say: "Real talk: ask your partner about music in their life. When does it help? What does it make them feel? Answer with a short answer and one more sentence with a reason." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Do / Does, X = say it with doesn't / don't, + = join it with because, although, so or when, T = last night / last week, P = a different person.",
              "Say the WHOLE new sentence. Watch the verb: music makes, songs make, my friend feels.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'Does it makes' or 'It make me feel') and fix them together; then go on.",
              "In round 3 the drill becomes real: find out what your partner really listens to and why. Remember one thing to tell the class.",
            ],
            prompts: ["Fast music makes me feel excited. (?)", "Slow songs make me sleepy. (X)", "This song makes me feel happy. (+ because it reminds me of summer)", "My cousin feels nervous before a match. (T)", "I feel calm when I hear piano music. (P: my best friend)"],
            feedback:
              "Prompt, do not tell: for 'Does slow music makes you sleepy?' hold up one finger and say 'Does slow music m...?'; for 'It make me feel' tap your wrist for the -s; for 'It makes me excited' point to the word feel on the frame; for 'Last night it makes me' hold up the T sign and say 'Last night it m...?'. Do not give the answer: wait for the student to find it. For a sound such as the end of 'excited', recast quickly and let them echo.",
            teacherNote: "A drill only helps when the last round is real: students use the new forms to say something they mean. Grades 6-7 can take the full set in one go: question, negative, a joined sentence with a reason, the past and another person. Keep it brisk; a drill that drags loses its point. Watch make / makes: music (one thing) makes, songs (more than one) make.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Does ___ music make you feel ___?", "Yes, it does. / No, it doesn't.", "___ music makes me feel ___."] },
              { level: "Core", task: "Change every sentence, with I, you, he, she, we and they, and join two ideas with because or so." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'Slow songs don't make me sleepy, although they make my sister sleepy. What about you?'" },
            ],
          },
        },
        {
          after: "Grammar drill: how music makes me feel",
          slide: {
            kind: "fluency",
            title: "Music sprint: what does it make us feel?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole long sentence, fast and smooth, with no stops, then add one idea of your own.",
            chunks: [
              "My favorite song is fast, so it makes me feel excited whenever I hear it.",
              "Slow music makes me sleepy, but it helps me relax after a long day at school.",
              "A big drum makes a low sound, while a flute makes a high and soft sound.",
              "I listen to music on my phone because it helps me forget my stress about tests.",
              "Although some people think quiet music is boring, I think it is the best for homework.",
            ],
            recycle: ["We can reuse old things instead of throwing them away.", "I try to recycle paper at school because it saves trees."],
            rounds: [
              { seconds: 75, say: "Together: the teacher shows a situation card and the class says a whole sentence about it with so, but, while or because." },
              { seconds: 75, say: "Pairs: one shows a card, the other says a long sentence and asks a question back. Swap at the signal." },
              { seconds: 60, say: "New partner. Faster! How many long sentences can you say? Count them on your fingers." },
            ],
            steps: [
              "Look at the situation card. Say a WHOLE sentence, not one word, and say why.",
              "Always ask a question back: 'What about you?'",
              "Listen for the signal: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["(card: before an exam)", "(card: a long bus ride)", "(card: a party with friends)", "(card: studying at night)", "(card: a football match)"],
            feedback:
              "Typical slips here: 'It make me feel excited' (missing -s), 'It makes me excited' (missing feel) and 'Slow music make me sleepy'. Prompt by saying 'It make...?' with a rising voice, or hold up a finger for the -s on makes. For a sound such as the end of 'feelings' or 'excited', say it right and let them echo. " + fixMinute,
            teacherNote: "Whole sentences only: the point is that 'It makes me feel excited whenever I hear it' becomes one smooth piece. Listen for the -s on makes and for the sounds at the end of excited and feelings. The two recycle phrases come from Unit 12: slip one in every few cards so they stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a partner.", frames: ["It makes me feel ___.", "___ music makes me ___ because ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board, and add a reason." },
              { level: "Stretch", task: "Add a contrast: 'Fast music makes me excited, but it makes my dad nervous because he thinks it is too loud.'", frames: ["___ music makes me ___, but ___ because ___."] },
            ],
          },
        },
        {
          after: "Squeeze the story",
          slide: {
            kind: "writing",
            title: "My favorite music: plan, write, check",
            routine: "paragraph",
            genre: "opinion paragraph",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the two details, the example and the closing sentence. Point to the linking words: first, also, however, for example, in conclusion.",
              "Plan: fill the five boxes with a few words each, not whole sentences. Say one sentence for each box to your partner.",
              "Write: turn your notes into one paragraph of six to eight sentences. Start with your topic sentence.",
              "Check: tick the checklist. Swap with a partner: they underline one linking word and one makes / make and tell you one thing they liked.",
              "Teacher: while students write, look only at makes / make and the feeling words. Put a dot in the margin of a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: My favorite music",
              text: "My favorite kind of music is pop, because it makes me feel energetic and confident. First, the songs are fast, so I want to dance when I hear them. Also, my friends and I sing them together on the school bus, which makes the ride more fun. However, I do not listen to loud music before bed, because it keeps me awake. For example, last week I tried a fast song at ten o'clock, and I could not sleep. In conclusion, music is a good friend, but I need to choose the right song for the right moment.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is your favorite music, and how does it make you feel?" },
              { label: "Detail 1: First, ...", prompt: "Why do you like it? Give a reason." },
              { label: "Detail 2: Also, ...", prompt: "When or where do you listen to it, and who with?" },
              { label: "Contrast and example: However, ...", prompt: "Is there music you do not like, or a time it does not work? Give an example." },
              { label: "Closing: In conclusion, ...", prompt: "What do you think about music and feelings?" },
            ],
            frames: ["My favorite kind of music is ___, because it makes me feel ___.", "First, ___. Also, ___.", "However, ___. For example, ___.", "In conclusion, ___."],
            checklist: [
              "makes / make is right: music makes me feel, songs make me feel",
              "feel + a feeling word (feel excited, feel calm)",
              "At least three linking words: first, also, however, because, for example, in conclusion",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "A first full paragraph for grades 6-7: six to eight sentences planned in five small boxes, with the linking words students already use in the sprint. The boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two things (makes / make and the feeling word after feel) with a dot on the line; the student finds and fixes the mistake.",
            tiers: [
              { level: "Support", task: "Use the four frames: one or two sentences for each, six sentences in all.", frames: ["My favorite kind of music is ___, because it makes me feel ___.", "First, ___.", "In conclusion, ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, with three linking words." },
              { level: "Stretch", task: "Write eight sentences and add a contrast with although: 'Although slow songs are boring for my brother, they make me feel calm.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u13-l2": {
      objectives: ["I can say how different music makes people feel and give a reason and an example, three times, faster each time."],
      drop: ["Animal music chant", "Draw what you imagine"],
      add: [
        {
          after: "Our chart: music and feelings",
          slide: {
            kind: "fluency",
            title: "Grammar drill: music makes us feel",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join it, move it in time, change the person. Then talk about how music works for you and the people around you.",
            chunks: [
              "Fast music makes people feel energetic.",
              "Does slow music make you feel sleepy?",
              "Quiet songs don't make me nervous, but loud ones sometimes do.",
              "Many people listen to calm music when they study because it helps them concentrate.",
              "My cousin plays the guitar when he feels stressed, so music helps him relax.",
              "Some people say music can change how we feel, although it is different for everyone.",
            ],
            recycle: ["Fast music makes me feel excited.", "I try to recycle paper at school because it saves trees."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence from the chart and shows a sign (? = ask it, X = say no, + = join it with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 80, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the signal. Use people, my friend, we and they as well as I and you." },
              { seconds: 80, say: "Real talk: ask your partner how music works for the people in their life: friends, family, classmates. Who listens to what, and why? Answer with a short answer and one more sentence with a reason." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Do / Does, X = say it with doesn't / don't, + = join it with because, although, so or when, T = change the time (yesterday, last year), P = a different person.",
              "Say the WHOLE new sentence. Watch the verb: music makes, people feel, my cousin feels.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'make people to feel' or 'Does it helps') and fix them together; then go on.",
              "In round 3 find out how music works for someone close to your partner, and remember one thing to tell the class.",
            ],
            prompts: ["Fast music makes people feel energetic. (?)", "Slow songs make me nervous. (X)", "Music helps me study. (+ because it blocks the noise)", "My cousin plays the guitar when he feels stressed. (T)", "Loud music makes me feel excited. (P: my parents)"],
            feedback:
              "Prompt, do not tell: for 'make people to feel' point to the frame and say 'make people f...?'; for 'Does music helps you?' hold up one finger and say 'Does music h...?'; for 'My cousin feel stressed' tap your wrist for the -s; for 'Yesterday it makes me' hold up the T sign and say 'Yesterday it m...?'. Do not give the answer. For the sound at the end of 'stressed', recast quickly and let them echo.",
            teacherNote: "The chart the class just made is the material: the drill moves its sentences through a question, a negative, a joined sentence, another time and another person. Round 3 makes it real. The two traps in this unit's grammar are the third person -s (my cousin feels) and make + a person + a bare verb or adjective (make people feel, never make people to feel). Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Does ___ music make you feel ___?", "Yes, it does. / No, it doesn't.", "___ music makes people feel ___."] },
              { level: "Core", task: "Change every sentence, with people, my friend, we and they, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'Quiet songs don't make me nervous, although they make my friend nervous. Why do you think that is?'" },
            ],
          },
        },
        {
          after: "Grammar drill: music makes us feel",
          slide: {
            kind: "fluency",
            title: "Feelings talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same short talk to three classmates: 60, 50, then 40 seconds each. Each talk is shorter, smoother and clearer.",
            chunks: [
              "Fast music makes me feel excited, so I listen to it before a football match.",
              "Slow music makes me sleepy, but it also helps me relax after school.",
              "I like this song because it reminds me of my last summer holiday.",
              "When I hear low drums, I imagine a storm coming over the mountains.",
            ],
            recycle: ["Fast music makes me feel excited.", "We can reuse old things instead of throwing them away."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A gives the feelings talk, then Partner B. The listener counts the reasons on their fingers. Then change partners." },
              { seconds: 50, say: "Round 2: new partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: new partner. Partner A, then Partner B: fast and smooth! The listener says 'Same here!' if they feel the same." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round Partner A (line A) talks first, then Partner B (line B).",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do three rounds: 60 seconds, 50 seconds, 40 seconds each. Both partners talk in every round.",
            ],
            feedback:
              "Typical slips: 'Fast music make me excited' (missing -s), 'I am like this music' (be for like), 'It reminds me about summer' (the wrong little word), 'Slow music makes me sleep' (the verb instead of sleepy). Prompt with 'Fast music make...?' and a finger for the -s, or point to the frame. A sound slip, such as 'excited' without the last -d, gets a quick recast and an echo. " + fixMinute,
            teacherNote: "Same talk, less time, new listener: 4-3-2 for grades 6-7. The new partner keeps the repetition real. The fluency gain comes from saying the same thing again, so do not add new language between rounds; the minute's correction is what lifts the accuracy of rounds 2 and 3. Listen for -s on makes and for the ending of excited. Students may choose their own reason, but the grammar stays the same.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["Fast music makes me ___, so ___.", "Slow music makes me ___, but ___."] },
              { level: "Core", task: "Say four sentences without the board, with a reason in two of them." },
              { level: "Stretch", task: "Add an opinion and ask a question back: 'I think music is the best way to relax because ___. How about you?'", frames: ["I think ___ because ___. How about you?"] },
            ],
          },
        },
        {
          after: "Guess the music",
          slide: {
            kind: "writing",
            title: "Music and my feelings: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the two details, the example and the closing sentence. Point to the linking words: on the other hand, because, for example, in conclusion.",
              "Plan: use your chart from this lesson. Fill the five boxes with a few words each, not whole sentences. Say one sentence for each box to your partner.",
              "Write: turn your notes into one paragraph of six to eight sentences.",
              "Check: tick the checklist. Swap with a partner: they underline one reason and one example and tell you which one is stronger.",
              "Teacher: look only at makes / make, feel + a feeling word and the third person -s. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Music and feelings",
              text: "Music can change how we feel in many ways. Fast music makes me feel excited, so I often play it before a football match. Slow music, on the other hand, makes me sleepy because it is quiet and soft. For example, when I listen to a calm piano song at night, I forget my homework and relax. Some low drums even make me imagine a storm over the sea. In conclusion, I believe that the right music can help us feel better.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What can music do to our feelings? Say it in one sentence." },
              { label: "Fast music", prompt: "How does fast music make you feel? Give a reason." },
              { label: "Slow music: On the other hand, ...", prompt: "How does slow music make you feel? Why?" },
              { label: "Example: For example, ...", prompt: "Give one real example from your life, or say what you imagine." },
              { label: "Closing: In conclusion, ...", prompt: "What do you believe about music and feelings?" },
            ],
            frames: ["Music can change how we feel in many ways.", "Fast music makes me ___, so ___.", "Slow music, on the other hand, makes me ___ because ___.", "For example, ___.", "In conclusion, I believe ___."],
            checklist: [
              "makes / make is right: music makes me feel, songs make people feel",
              "A feeling word after feel or make me (excited, sleepy, calm)",
              "A reason with because or so, and one example with for example",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "This replaces the dictogloss: students now write the whole idea of the lesson, music and feelings, as a paragraph. Their chart from 'Our chart: music and feelings' is the plan. The paragraph is also the script for the recorded talk 'Music makes me feel': they read it aloud at home, then say it without looking. Mark only makes / make, the feeling word after feel and the third person -s.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box, six sentences in all.", frames: ["Fast music makes me ___, so ___.", "Slow music, on the other hand, makes me ___ because ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, with a reason and an example." },
              { level: "Stretch", task: "Write eight sentences and add a contrast: 'Fast music is fun, but it is too loud at night.' Give a second example." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Music makes me feel",
        prompt: "Tell us how music makes you feel. Say what kind of music it is, how it makes you feel, why, and give one example from your life.",
        length: "90-120 seconds",
        steps: [
          "Read your paragraph from class. Underline your reasons and your example.",
          "Say your talk three times, to a friend, your phone or the mirror. Each time try to say it a little faster, with fewer stops.",
          "Record it once. Look at the camera, say what the music is, how it makes you feel and why, and give your example.",
          "Watch it once. Write down one thing you did well and one thing you want to do better next time.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what music you mean, how it makes you feel, give a reason and an example, and keep talking without long stops.",
        words: ["fast", "slow", "high", "low", "excited", "sleepy", "feelings", "imagine"],
        grammar: ["Fast / Slow music makes me ___.", "I like it because ___.", "For example, ___."],
        rubric: [
          { label: "Sound and feeling", description: "Says how the music sounds (fast, slow, high, low) and how it makes them feel.", weight: 3 },
          { label: "Reasons and examples", description: "Gives a reason with because or so and at least one example with for example.", weight: 3 },
          { label: "Makes me", description: "Says 'It makes me feel ___' or 'Fast music makes me ___' with the -s on makes.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["My music is ___.", "It makes me feel ___ because ___.", "For example, ___."], tips: ["Keep your paragraph beside you, then look up when you speak."] },
          { level: "Core", who: "Most students", frames: ["My music is ___ and ___.", "It makes me feel ___ because ___.", "For example, ___, so ___."], tips: ["Say a feeling, a reason and an example."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Fast music makes me ___, but slow music makes me ___ because ___.", "I think ___, although ___."], tips: ["Compare two kinds of music and give your opinion."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u13-l3": {
      objectives: ["I can ask 'When do you ...?' and answer with in, at or on, in longer sentences with a reason."],
      trim: { "Listen and sing (SB 133 D)": 7, "Guess the girl (SB 133 E)": 8 },
      drop: ["What time of day? chant", "Time of day line-up"],
      add: [
        {
          after: "Guess the girl (SB 133 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: when do you listen?",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join it, move it to the past, change the person. Keep in, at and on correct. Then talk about your own week.",
            chunks: [
              "I usually listen to music in the afternoon, after I finish my homework.",
              "When does your cousin practice the guitar, in the morning or at night?",
              "I don't listen to music at night because I need to sleep, but I do on Saturday morning.",
              "Last Saturday we went to a concert at seven o'clock because my cousin was singing.",
              "In the morning I take the bus to school, and I listen to my favorite playlist.",
              "My sister practices the piano at night, although she is often very tired.",
            ],
            recycle: ["Fast music makes me feel excited.", "We can reuse old things instead of throwing them away."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with When, X = say no, + = join it with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 80, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the signal. Keep the little word and the time word together: in the morning, at night, on Saturday." },
              { seconds: 80, say: "Real talk: ask your partner about their week. When do they study? When do they relax? What do they do on Saturday? Answer with a full sentence and a reason." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with When do / When does, X = say it with don't / doesn't, + = join it with because, although, so or when, T = last Saturday, P = a different person.",
              "Say the WHOLE new sentence. Say in the morning, at night and on Saturday as one group.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'on the morning', 'at Saturday' or 'She practice') and fix them together; then go on.",
              "In round 3 the drill becomes real: find out what your partner does at different times of the week. Remember one thing to tell the class.",
            ],
            prompts: ["I do my homework in the afternoon. (?)", "My brother plays games at night. (X)", "We go to the park on Saturday. (+ because the weather is good)", "She listens to music in the evening. (T: last Friday)", "I get up at six thirty. (P: my parents)"],
            feedback:
              "Prompt, do not tell: for 'on the morning' point to the card or the in / at / on frame on the board and say 'In the m...?'; for 'at Saturday' hold up a finger and say 'On...?'; for 'She practice at night' tap your wrist for the -s; for 'When you do listen?' hold up the ? sign and say 'When d...?'. Do not give the answer: wait for the student to find it.",
            teacherNote: "The slide above made the rule; this drill makes it automatic. Students move one sentence through a question, a negative, a joined sentence, the past and another person without losing the little word: in the morning, at night, on Saturday. Mature extension for this class: at + a clock time (at seven o'clock), in + a season or a year, on + a date. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the in / at / on frame on the board.", frames: ["When do you ___?", "I ___ in the morning / at night / on Saturday.", "I don't ___ at night."] },
              { level: "Core", task: "Change every sentence, with I, you, he, she, we and they, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'I don't study at night, although my brother does. When does your family relax?'" },
            ],
          },
        },
        {
          after: "Ask about Saturdays (SB 133 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: When do you ___?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer with a reason, turn and ask the next classmate. Keep the chain going with no stops!",
            chunks: [
              "When do you listen to music? I usually listen to it in the afternoon, after school.",
              "What do you do on Saturday? I play football in the morning, and I meet my friends in the evening.",
              "When does your best friend practice? She practices at night, because she is busy in the afternoon.",
              "I do my homework on Sunday afternoon, but I relax in the evening.",
              "I wake up at six thirty on school days, and I go to bed at ten.",
            ],
            recycle: ["Fast music makes me feel excited.", "We should take care of the Earth because we only have one."],
            rounds: [
              { seconds: 90, say: "Slow chain round the room. Everyone holds a time card: morning, afternoon, evening, night, Saturday or a clock time. Answer in a full sentence with a reason." },
              { seconds: 75, say: "Swap cards. Go faster, and add a second sentence." },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your time card so only you can see it.",
              "Ask the classmate on your left: 'When do you listen to music?'",
              "They answer with their card and a reason: 'I listen to music in the morning, because it wakes me up.' Then they turn and ask the next classmate.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["When do you ___?", "(card: in the morning)", "(card: at night)", "(card: on Saturday)", "(card: at 6:30)"],
            feedback:
              "Typical slips: 'on the morning', 'in night', 'at Saturday', and 'She practice' (missing -s). Prompt by starting the phrase and pausing: 'I study... ?' and point to the card or the in / at / on frame on the board. Use a finger for the missing -s. Do not say the right word for the student; wait for them to find it. " + fixMinute,
            teacherNote: "The chain makes every student ask AND answer many times in a few minutes, which is what makes the 'little word plus time word' group automatic: in the morning, at night, on Saturday. Say the groups as one chunk. Time the whole circle and tell them; students like beating their own time. In round 3 allow two sentences, never one word.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["I ___ in the morning.", "I ___ at night.", "I ___ on Saturday."] },
              { level: "Core", task: "Ask and answer without looking at the board, and give a reason." },
              { level: "Stretch", task: "Answer with a whole day and a contrast: 'I study in the afternoon and I play games at night, although I go to bed late.'" },
            ],
          },
        },
        {
          after: "A day for two new friends",
          slide: {
            kind: "writing",
            title: "Fix the time words",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong with in, at or on, or with the verb!",
              "Find the mistake and write the sentence the right way.",
              "Read the fixed sentences aloud together.",
            ],
            items: [
              { q: "I listen to music on the morning because it helps me wake up.", answer: "I listen to music in the morning because it helps me wake up." },
              { q: "My sister practices the piano in night, although she is very tired.", answer: "My sister practices the piano at night, although she is very tired." },
              { q: "We usually go to the park at Saturday, but last week it rained.", answer: "We usually go to the park on Saturday, but last week it rained." },
              { q: "When does your brother plays football? He plays in Sunday afternoon.", answer: "When does your brother play football? He plays on Sunday afternoon." },
              { q: "He listen to slow music at the evening when he feels stressed.", answer: "He listens to slow music in the evening when he feels stressed." },
            ],
            checklist: ["in the morning / afternoon / evening", "at night", "on + a day (on Saturday, on Sunday afternoon)", "he / she + verb with -s; does + the base verb"],
            sayIt: "Say all five fixed sentences to your partner, fast.",
            teacherNote: "The errors in items 1-3 are the ones the Unit 13 grammar slide predicts; items 4 and 5 add two that students at this level still make: the verb after does, and the third person -s. Fix item 1 together first. Keep to these error types today.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 3 with the in / at / on frame on the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two more sentences with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u13-l4": {
      objectives: ["I can give an opinion about music politely and say why, with because, although and so."],
      trim: {
        "Listen, point, say (SB 134 A)": 6,
        "Listen for details (SB 134 C-D)": 9,
        "Giving opinions (SB 135 E)": 9,
        "Same meaning, different word (SB 135 F)": 7,
      },
      drop: ["Feeling faces chant", "Because I feel ___, I ___"],
      add: [
        {
          after: "Giving opinions (SB 135 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: when I feel ..., I ...",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, move it to the past, change the person. Then talk about what you really do when you feel nervous, stressed or excited.",
            chunks: [
              "When I feel nervous, I listen to slow music.",
              "Do you listen to music when you feel stressed?",
              "No, I don't. I go for a run because I need to move.",
              "Some people sing when they are happy, but my brother just smiles.",
              "Please turn down the music, because I'm trying to study.",
              "I love this song, even though it is too loud for our neighbors.",
            ],
            recycle: ["Fast music makes me feel excited.", "I do my homework on Sunday afternoon."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join it with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 80, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the signal. Use I, you, he, she, we and they in turn." },
              { seconds: 80, say: "Real talk: ask your partner what they do when they feel nervous, stressed or excited, and what they think about loud music. Answer with a short answer and one more sentence with a reason." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Do / Does, X = say it with don't / doesn't, + = join it with because, although, so or when, T = last week, P = a different person.",
              "Say the WHOLE new sentence. Notice the comma: When I feel nervous, I listen to slow music.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'When I feel nervous I listening' or 'Please turn off down') and fix them together; then go on.",
              "In round 3 find out what your partner really does when they feel stressed, and what they think about loud music. Remember one thing to tell the class.",
            ],
            prompts: ["I listen to music when I feel nervous. (?)", "My friend sings when she is happy. (X)", "I turn down the music. (+ because my brother is studying)", "When I feel stressed, I go for a run. (T: last week)", "I think loud music is great. (P: my parents)"],
            feedback:
              "Prompt, do not tell: for 'When I feel nervous I listening' point to the frame 'When I feel ___, I ___' and say 'I list...?'; for 'Please turn off down' hold up a finger and say 'Please turn d...?'; for 'She sing' tap your wrist for the -s; for 'I am not like it' hold up the X sign and say 'I don't...?'. Do not give the answer.",
            teacherNote: "This lesson has no grammar slide, so the drill takes the lesson's key structure, 'When I feel ___, I ___', together with the opinion language of Giving opinions (SB 135 E). Round 3 asks for real answers. Listen for do / does (I don't like it, not I am not like it), for polite 'Please' and for the verb after when.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you ___ when you feel ___?", "Yes, I do. / No, I don't.", "When I feel ___, I ___."] },
              { level: "Core", task: "Change every sentence, with I, you, he, she, we and they, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'Slow music doesn't help me when I feel nervous, although it helps my sister. What helps you?'" },
            ],
          },
        },
        {
          after: "Grammar drill: when I feel ..., I ...",
          slide: {
            kind: "fluency",
            title: "Opinion talk: say it again, smoother",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Say the same opinion talk two times with two partners: 75 seconds, then 60 seconds each. Make it smoother the second time.",
            chunks: [
              "Could you turn down the music, please? I'm trying to concentrate on my homework.",
              "I don't like it because it's too loud, but I know a lot of people love it.",
              "I think it's great, although the words are a little hard to understand.",
              "When I feel nervous before a test, I listen to slow music to calm down.",
            ],
            recycle: ["Fast music makes me feel excited.", "I do my homework on Sunday afternoon."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives an opinion about a piece of music and a reason, and asks to turn the music up or down politely, then Partner B does the same. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A says the same talk again, a little faster, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Choose one piece of music from the cards. Decide: loud or quiet, like or don't like.",
              "Say your opinion and a reason to your partner. In each round Partner A talks, then Partner B.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "Change partners when the bell rings.",
            ],
            feedback:
              "Typical slips: 'Please turn off down', 'Because I feel nervous, I listening' and 'I am not like it'. Prompt with 'I don't... ?' and a finger for the missing do; point to the frame 'When I feel ___, I ___.' For the sound of 'nervous' or 'concentrate', recast quickly and let them echo. " + fixMinute,
            teacherNote: "Task repetition: the task stays the same and the partner changes, so students can spend their attention on speaking smoothly instead of planning. Listen for 'I don't like it' (do, not be), for polite 'Could you ... please?' and for a reason after because. Praise a student who keeps going after a slip.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["Could you turn down ___, please?", "I don't like ___ because ___."] },
              { level: "Core", task: "Say four sentences with a reason, without the board." },
              { level: "Stretch", task: "Disagree politely and ask a question: 'Really? It's my favorite, because ___. Why don't you like it?'", frames: ["Really? It's my favorite because ___."] },
            ],
          },
        },
        {
          after: "Say it before you write it",
          slide: {
            kind: "writing",
            title: "Grow my music sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add what you do, when it happens, a reason (because), a contrast (although) or a result (so).",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "Music helps me. (add: when I feel stressed, because ...)", answer: "Music helps me when I feel stressed because it makes me relax." },
              { q: "I listen to music. (add: on the bus, every morning, although ...)", answer: "I listen to music on the bus every morning, although it is sometimes crowded." },
              { q: "The song is loud. (add: too, a result with so)", answer: "The song is too loud, so I can't hear my friend." },
              { q: "My brother plays the drums. (add: at night, but ...)", answer: "My brother plays the drums at night, but my parents don't like it." },
              { q: "I love this song. (add: when, with friends, because)", answer: "I love this song when I'm with my friends because we always sing it together." },
            ],
            frames: ["___ music makes me feel ___ because ___.", "I listen to ___ when I feel ___, although ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "A joining word: because, although, so or when", "makes: the -s is there"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "This is the warm-up for the longer Write about the music activity: students who can grow one sentence orally and on paper arrive ready to write a whole paragraph. Show the answers after the students have tried; accept other correct sentences.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and change one word to make it true for you." },
              { level: "Core", task: "Write a big sentence of your own for items 1-3." },
              { level: "Stretch", task: "Write two big sentences linked with 'although' or 'but' for each item." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u13-l5": {
      objectives: ["I can tell about my music day with in, at and on, with reasons, three times, faster each time."],
      trim: { "Remember it!": 3 },
      drop: ["Time hop: music on the floor clock", "Movement break: Time freeze"],
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Grammar drill: in, at, on all together",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, move it to the past, change the person. Keep in, at and on correct. Then talk about your own week.",
            chunks: [
              "On Monday morning we have music class, and in the afternoon we play football.",
              "When does your sister practice the flute? She practices at night, after dinner.",
              "I don't listen to music in the morning because I'm usually in a hurry.",
              "Last Friday evening my friends and I went to a concert, and we sang until midnight.",
              "At night I listen to slow music, but on Saturday I want something fast.",
              "My cousin plays in a band on Sunday afternoon, so I go with him to carry the drums.",
            ],
            recycle: ["Slow music makes me sleepy.", "We can reuse old things instead of throwing them away."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with When, X = say no, + = join it with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 80, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the signal. Keep the little word and the time word together: in the morning, at night, on Saturday." },
              { seconds: 80, say: "Real talk: ask your partner about their perfect weekend, or the busiest day of their week. When do they do each thing, and why? Answer with a full sentence and a reason." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with When do / When does, X = say it with don't / doesn't, + = join it with because, although, so or when, T = last Friday, P = a different person.",
              "Say the WHOLE new sentence. In, at and on go with the time word as one group.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'in Monday morning', 'at the morning' or 'My cousin play') and fix them together; then go on.",
              "In round 3 the drill becomes real: plan a perfect day with your partner, with the time of each thing. Remember one thing to tell the class.",
            ],
            prompts: ["We have music class on Monday morning. (?)", "I play football in the afternoon. (X)", "I listen to slow music at night. (+ because it helps me sleep)", "My friends sing on Saturday. (T: last Saturday)", "I wake up at seven. (P: my brother)"],
            feedback:
              "Prompt, do not tell: for 'in Monday morning' point to the frame and say 'On Mon...?'; for 'at the morning' hold up a finger and say 'In the m...?'; for 'My cousin play' tap your wrist for the -s; for 'When you practice?' hold up the ? sign and say 'When d...?'. Do not give the answer. Say the groups as one chunk yourself: on Monday morning, in the afternoon, at night.",
            teacherNote: "This is the last drill of the unit, so the full set runs with the unit's grammar at pace: the rule is that the little word and the time word are one group. Round 3 plans a perfect day, which uses the form for meaning. Extension for grades 6-7: on Monday morning (a day plus a part of the day takes on), at seven o'clock, in the summer. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the in / at / on frame on the board.", frames: ["When do you ___?", "I ___ in the morning / at night / on Saturday.", "I don't ___ in the morning."] },
              { level: "Core", task: "Change every sentence, with I, you, he, she, we and they, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'I don't study on Sunday, although my cousin does. When do you do your homework?'" },
            ],
          },
        },
        {
          after: "Grammar drill: in, at, on all together",
          slide: {
            kind: "fluency",
            title: "A music day: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same day three times: 60, 50, then 40 seconds each. Each time is shorter, smoother and faster.",
            chunks: [
              "In the morning she listens to pop on the bus, so she arrives at school in a good mood.",
              "In the afternoon she plays the guitar in the school band, although she is often tired.",
              "At night she listens to slow music because it helps her fall asleep.",
              "On Saturday she goes to a concert with her friends and sings all evening.",
            ],
            recycle: ["Slow music makes me sleepy.", "We can reuse old things instead of throwing them away."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the day of the student on the four picture cards, then Partner B. Then change partners." },
              { seconds: 50, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: new partner. Partner A tells it fast, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Put the four cards in order: morning, afternoon, night, Saturday.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In each round Partner A tells the day, then Partner B. When the bell rings, find a new partner.",
              "The listener says one thing they remember and asks one question about it.",
            ],
            prompts: ["(card: bus and headphones)", "(card: guitar and school band)", "(card: moon and bed)", "(card: concert with friends)"],
            feedback:
              "Typical slips: 'on the morning', 'in night', 'at Saturday' and 'she listen' (missing -s). Prompt by starting the phrase and pausing ('At... ?'), point to the card, or hold up a finger for the -s on listens, plays, goes, sings. Do not say the answer for the student. " + fixMinute,
            teacherNote: "Retelling the same four sentences three times, to a new listener, frees students to say 'in the morning, at night, on Saturday' as ready-made groups, with the third person -s on every verb. The correction minute after round 1 is what turns the repetition into accuracy too. Keep the cards on the board for Support students and take them down for Stretch.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["In the morning she ___.", "At night she ___.", "On Saturday she ___."] },
              { level: "Core", task: "Tell all four parts without the frames, with a reason in two of them." },
              { level: "Stretch", task: "Add how she feels and compare with your own day: 'She feels excited in the morning, but sleepy at night. I feel the same, although ___.'" },
            ],
          },
        },
        {
          after: "Say it, then write: my music day",
          slide: {
            kind: "writing",
            title: "My music day: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the time words and the closing sentence. Point to the linking words: In the morning, In the afternoon, At night, however, in conclusion.",
              "Plan: fill the five boxes with a few words each, not whole sentences. Say one sentence for each box to your partner.",
              "Write: turn your notes into one paragraph of six to eight sentences, in time order. Start with your topic sentence.",
              "Check: tick the checklist. Swap with a partner: they underline every in, at and on and tell you one thing they liked.",
              "Teacher: look only at in / at / on and the verb -s. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A music day",
              text: "On a normal school day, music is part of every moment. In the morning I listen to pop on the bus, because it wakes me up and puts me in a good mood. In the afternoon I play the guitar with my friends, and we practice a new song every week. At night, however, I choose slow music so that I can relax and fall asleep. On Saturday I usually go to a concert or sing with my cousins, which makes me feel excited. In conclusion, I could not imagine a day without music.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is music like in your day? Say it in one sentence." },
              { label: "In the morning", prompt: "What do you listen to or play in the morning? Why?" },
              { label: "In the afternoon", prompt: "What do you do with music after school? Who with?" },
              { label: "At night: However, ...", prompt: "Is music different at night? How do you feel? Why?" },
              { label: "On Saturday and closing: In conclusion, ...", prompt: "What do you do on Saturday? What do you think about music in your life?" },
            ],
            frames: ["Music is part of my day in many ways.", "In the morning I ___, because ___.", "In the afternoon I ___ with ___.", "At night, however, I ___ so that ___.", "On Saturday I ___. In conclusion, ___."],
            checklist: [
              "in the morning, in the afternoon, at night, on Saturday: the little word is right",
              "I / he / she + verb: the -s is there for he, she and it",
              "At least three linking words: because, however, so, and, in conclusion",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell your music day without looking.",
            teacherNote: "This replaces 'model, then write': the same unit grammar (in the morning, at night, on Saturday) now sits inside a full paragraph. The paragraph is the script for the recorded talk 'My music day': students read it aloud at home, then say it without looking. Check the little words first; the verb -s matters when a student writes about another person. Mark only two targets.",
            tiers: [
              { level: "Support", task: "Copy the model and change four details to make it about you.", frames: ["In the morning I ___.", "At night I ___.", "On Saturday I ___."] },
              { level: "Core", task: "Write six or seven sentences about your own music day, with a reason in three of them." },
              { level: "Stretch", task: "Write eight sentences and add how a friend's day is different with although or whereas." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My music day",
        prompt: "Tell us about your music day: what you listen to or play in the morning, in the afternoon, at night and on Saturday, and why.",
        length: "90-120 seconds",
        steps: [
          "Read your music day paragraph from class. Underline your reasons.",
          "Say your music day three times, to a friend, your phone or the mirror. Each time a little faster, with fewer stops.",
          "Record it once. Say in the morning, at night and on Saturday clearly, and give a reason for at least two parts of the day.",
          "Watch it once. Write down one thing you did well and one thing you want to do better next time.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell your music day with in, at and on, say how you feel and why, and keep talking without long stops.",
        words: ["morning", "afternoon", "evening", "night", "Saturday", "excited", "sleepy"],
        grammar: ["in the morning / afternoon / evening", "at night", "on Saturday", "It makes me feel ___."],
        rubric: [
          { label: "In, at, on", description: "Uses in the morning, at night and on Saturday correctly.", weight: 3 },
          { label: "Reasons and examples", description: "Gives a reason with because or so, and an example, for at least two parts of the day.", weight: 3 },
          { label: "Music and feelings", description: "Says what music they hear or play and how it makes them feel.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
          { label: "Clear endings", description: "The -s can be heard on verbs such as listens and plays when talking about another person.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["In the morning I ___ because ___.", "At night I ___.", "On Saturday I ___."], tips: ["Keep your paragraph beside you, then look up when you speak."] },
          { level: "Core", who: "Most students", frames: ["In the morning I ___ and I feel ___.", "At night I ___ because ___.", "On Saturday I ___, so ___."], tips: ["Say a feeling and a reason for each time."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["My friend ___s in the afternoon, although I ___.", "Fast music makes me ___, but slow music makes me ___ because ___."], tips: ["Compare your day with a friend's and compare two kinds of music."] },
        ],
      },
    },
  },
};
