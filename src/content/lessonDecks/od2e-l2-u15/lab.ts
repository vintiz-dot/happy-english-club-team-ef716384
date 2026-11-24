import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 15 "Forces and
// Movement" (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio
// Grade 6: students in grades 6-7 (ages 11-13) working on a book written for younger
// children, so the Lab raises the talk and the writing to their age. Every lesson gets a
// grammar drill (the lesson's structure changed fast: asked, said in the negative, joined
// with because / although / so / when, moved into another tense or person, then used for
// real talk about the students' own lives and opinions), one more fluency routine with
// longer phrases, and a writing routine that joins ideas: a full paragraph in lessons 1, 2
// and 5, harder sentence work in lessons 3 and 4. Lessons 2 and 5 end with a recorded talk
// for home. Time comes from games and repeats pitched at younger children, never from the
// book pages or the grammar. All text is original.

const fixVerbs =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: students who then say the same thing again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: point to the frame, start the phrase and pause ('She push...?'), hold up a finger for the missing -s or -ed, or repeat the error with a rising voice ('The box heavy?'). For a sound, just say it right and let them echo it. Say every final sound clearly yourself (pushes, pulled, heavier): students copy what they hear.";

const fixCompare =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). The usual ones in this unit: 'more fast' for 'faster', a missing 'than' ('faster a snail'), 'heavyer' or 'biger' for 'heavier' and 'bigger', and a missing final -s or -ed. Between rounds 1 and 2, write two of them on the board and let the class fix them in one minute; then the students say the same thing again with the fixed form. Prompt, do not tell: start the phrase and pause ('A truck is heav... than...?'), point to the frame 'A ___ is ___er than a ___', or hold up a finger for the missing 'than'. For a sound, say it right and let them echo it. Say the ends of words clearly yourself: faster, heavier, bigger.";

export const odL2U15Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u15-l1": {
      objectives: ["I can talk about pushing, pulling, heavy and light things in long sentences with because and although, without stopping."],
      trim: {
        "Make it move! (mess about)": 3,
        "Heavy or light? Push or pull? (is / is not sort)": 5,
        "Draw it, say it (push and pull)": 3,
        "Listen, point, say, move (SB 148 A)": 7,
      },
      drop: ["Push, pull, move chant", "Force Says"],
      add: [
        {
          after: "Heavy or light? Push or pull? (is / is not sort)",
          slide: {
            kind: "fluency",
            title: "Force sprint: push, pull, heavy, light",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say a whole long sentence, fast and smooth, with a reason, and ask a question back.",
            chunks: [
              "I push the door open when I arrive, but I pull my chair out when I sit down.",
              "My backpack is heavy because it holds six books and a laptop.",
              "A feather is light, so it is easy to move, although the wind can blow it away.",
              "It is hard to push a car because it is much heavier than a person.",
              "Do you push or pull your bag when you travel? Why?",
            ],
            recycle: ["Last weekend I played football with my friends, but I didn't play music.", "Did you listen to music last night? Yes, I did."],
            rounds: [
              { seconds: 90, say: "Everyone together: the teacher shows two picture cards, and the class joins them in one long sentence with but, because or although." },
              { seconds: 80, say: "Pairs: one shows two cards, the other says a long sentence with a reason and asks a question back. Swap when you hear the clap." },
              { seconds: 70, say: "Faster! New partner. How many long sentences can you say? Keep a tally on paper." },
            ],
            steps: [
              "Look at the two picture cards. Join them in ONE long sentence: 'I push the door open, but I pull my chair out.'",
              "Give a reason or an example with because, although or for example: 'My bag is heavy because it holds six books.'",
              "Ask a question back to your partner: 'Do you push or pull your bag when you travel?'",
              "Listen for the clap: it means change partners.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together with prompts; then go on to round 2.",
            ],
            prompts: ["(cards: door + chair)", "(cards: backpack + pencil case)", "(cards: car + bicycle)", "(cards: feather + book)", "(cards: shopping cart + suitcase)"],
            feedback: fixVerbs,
            teacherNote: "Whole sentences only, never single words, and sentences with two parts: the point is to say 'My backpack is heavy because it holds six books' as one smooth piece. Vietnamese students often leave out 'is' ('The box heavy') and the -s on he / she / it, so watch for both and prompt with a finger and 'The box i...?'. Mix in Unit 14's past sentences every few turns so last unit's phrases stay fast too.",
            tiers: [
              { level: "Support", task: "Point to the frames on the board and say one sentence with a friend.", frames: ["I push the ___, but I pull the ___.", "The ___ is heavy because ___."] },
              { level: "Core", task: "Say a long sentence alone, with a reason, without looking at the board." },
              { level: "Stretch", task: "Add a contrast and a question: 'Although a car is heavy, it moves easily on wheels. What about your bike?'", frames: ["Although the ___ is ___, ___.", "What about ___?"] },
            ],
          },
        },
        {
          after: "Circle the correct word (SB 148 B)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: push it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it, move it to the past or to another person. Then talk about the forces in your own day.",
            chunks: [
              "I push the door, and I pull the chair.",
              "Do you push or pull your bag along the street? Yes, I do, because it has wheels.",
              "I don't push heavy things alone because they can hurt my back.",
              "She pushes the door open, although it is very heavy.",
              "Yesterday I pulled my bag home because it was too heavy to carry.",
              "When we use a big force, the thing moves faster.",
            ],
            recycle: ["Last weekend I played football with my friends, but I didn't play music.", "Do you remember the festival? Yes, I do."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the tense or time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, he, she, we, they." },
              { seconds: 90, say: "Real talk: find out what your partner pushes, pulls or carries on a normal day and why. Give your opinion: is it hard work? Answer with the short answer and one more sentence with 'because' or 'although'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Do / Does, X = say it with don't / doesn't, + = join with because, although, so or when, T = say it in the past or the future, P = change the person.",
              "Say the WHOLE new sentence. Watch the -s after he, she and it (pushes, pulls) and the -ed in the past (pulled).",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'She push' or 'Do you pulled'), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what your partner really pushes and pulls, and be ready to tell the class one thing.",
            ],
            prompts: ["I push the door. (?)", "You pull the wagon. (X)", "We push the cart. (+ because it is heavy)", "I pull my bag. (T yesterday)", "I push the box. (P she, + although)"],
            feedback: "Prompt, do not tell: for 'She push the door' hold up one finger and say 'She push...?'; for 'Do you pulled' repeat it with a rising voice and let the student fix it; for 'I no push' point to the frame 'I don't push'; for a missing -ed, tap your wrist. Say the -s and the -ed clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has students talk about the forces they use in their own day, so the form is used for meaning. Grades 6-7 can take the full set: questions, negatives, a joined sentence, a change of tense and a change of person. Keep it brisk; a drill that drags loses its point. Present simple with he / she / it is the likeliest slip here.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you push or pull ___?", "Yes, I do. / No, I don't.", "I don't push ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs and all the persons, and give a reason with 'because' or 'although'." },
              { level: "Stretch", task: "Use he and she, then add a second clause or a follow-up question: 'She pulls her bag because it has wheels, although it is heavy. Does she ever ask for help?'" },
            ],
          },
        },
        {
          after: "Cause and effect game (SB 149 C)",
          slide: {
            kind: "writing",
            routine: "paragraph",
            mode: "solo",
            title: "My push and pull day: plan, write, check",
            genre: "description",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three details and the closing sentence. Circle First, Also, However, because, for example and In conclusion.",
              "Plan: fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use at least four linking words.",
              "Check: tick the checklist. Swap with a partner: they underline one because and one although and tell you which detail they liked best.",
              "Teacher: while students write, look only at the -s after he, she and it and at because / although with a full clause. Put a dot in the margin of a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: My push and pull day",
              text: "Every day at school, I push and pull more things than I notice. First, I push the heavy front door, and it opens slowly because it is very big. Also, I pull my chair out from the desk, so I can sit down. My backpack is heavier than my lunch box because it holds six books and a laptop. However, my pencil case is light, so it is easy to carry. For example, I can lift it with two fingers. In conclusion, forces help me all day, although I rarely think about them.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What do you push and pull in a normal day at school or at home?" },
              { label: "Detail 1: a push", prompt: "What do you push? What happens? Give a reason with 'because'." },
              { label: "Detail 2: a pull", prompt: "What do you pull? What happens? Add 'so' or 'when'." },
              { label: "Detail 3: heavy and light", prompt: "Which thing is heavy, which is light? Give an example." },
              { label: "Closing", prompt: "What does this show about forces? Use 'In conclusion' and 'although'." },
            ],
            frames: ["Every day at ___, I push and pull ___.", "First, I push the ___, and it ___ because ___.", "Also, I pull the ___, so ___.", "My ___ is heavy, but my ___ is light. For example, ___.", "In conclusion, ___, although ___."],
            checklist: [
              "A topic sentence, three details and a closing sentence, in order",
              "Present simple: I push, she pushes (the -s after he / she / it)",
              "because, so and although each followed by a full clause",
              "Linking words: First, Also, However, For example, In conclusion",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "A full paragraph of six to eight sentences, planned in five boxes with notes only, using the unit's words (push, pull, heavy, light) and the linking words first, also, however, because, for example and in conclusion. Mark only two things (the -s after he / she / it and clauses after because and although) and let the student find the mistake from your dot. The Force sprint in this lesson already drills long sentences with a reason, so students have the sentences in their mouths before they write.",
            tiers: [
              { level: "Support", task: "Copy the five frames and fill in one or two words in each.", frames: ["First, I push the ___, and it ___ because ___.", "In conclusion, ___, although ___."] },
              { level: "Core", task: "Write six sentences, one or two for each box, with at least four linking words." },
              { level: "Stretch", task: "Write eight sentences and add a contrast with a comparison: 'My laptop is heavier than my book, but it is easier to carry because it has a strap.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u15-l2": {
      objectives: ["I can describe an experiment in the past and explain the result with because, so and although, faster each time."],
      trim: {
        "Force lab: small push, big push": 10,
        "Mini poster: Force, Movement or Speed": 6,
      },
      drop: ["Push and pull mime relay", "Word slap"],
      add: [
        {
          after: "Cause and effect detectives (Think boxes)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: did it, ask it, say why",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the force-lab sentences fast and right: ask it with Did, say it with didn't, join it with because, so, although or when. Then talk about tests and experiments you have done.",
            chunks: [
              "We pushed the car with a small force, and it moved a short way.",
              "Did the car go far? Yes, it did. / No, it didn't.",
              "The car didn't go far because we used a small force.",
              "Although the book on top was heavy, the car still moved, so our force was big enough.",
              "When we pushed harder, the car went faster.",
              "She pulled the string, and the car came toward her.",
            ],
            recycle: ["Last weekend I visited my cousins, but I didn't stay long.", "Did you enjoy the festival? Yes, I did."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a lab sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the tense or time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, he, she, we, they." },
              { seconds: 90, say: "Real talk: tell your partner about a test, experiment or project you did at school or at home. Ask a follow-up question, and give your opinion with 'because' or 'although'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Did, X = say it with didn't, + = join with because, although, so or when, T = move it to the present or the future, P = change the person.",
              "Say the WHOLE new sentence. After did and didn't the verb stays plain: 'Did it go far?' not 'Did it went far?'",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Did it went' or 'We push' for 'We pushed'), fix them together, then go on.",
              "In round 3 the drill becomes real: describe a test you really did, say what happened and why.",
            ],
            prompts: ["We pushed the car. (?)", "The car went far. (X)", "It moved slowly. (+ because the book was heavy)", "We push the car. (T last week)", "I pulled the string. (P they, + so)"],
            feedback: "Prompt, do not tell: for 'Did it went far?' hold up one finger and say 'Did it...?' and let the student find 'go'; for 'We push it yesterday' repeat it with a rising voice; for a missing -ed, tap your wrist; for 'It didn't went', point to the frame 'didn't + plain verb'. Say the final -ed (pushed, pulled) clearly yourself.",
            teacherNote: "The second sign, X, is where the common mistake lives: 'didn't went'. Drill it before moving on. Round 3 makes the drill real: students use the past, the question and a reason to talk about a test of their own. Grades 6-7 can handle the full set at pace; stop only for the one-minute fix.",
            tiers: [
              { level: "Support", task: "Use only ? and X with we and I, with the frames on the board.", frames: ["Did the ___ go ___? Yes, it did. / No, it didn't.", "It didn't ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs and all the persons, and join two ideas with 'because', 'so' or 'although'." },
              { level: "Stretch", task: "Use he and she, and add a second clause or a follow-up question: 'She pulled the string, although it was hard, so the car came toward her. Did it work the first time?'" },
            ],
          },
        },
        {
          after: "Force lab: small push, big push",
          slide: {
            kind: "fluency",
            title: "Force lab retell: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 9,
            goal: "Tell what happened in the force lab three times. Each time is shorter, smoother and faster, and each time you add a reason.",
            chunks: [
              "We pushed a toy car with a small force, and it only moved a short way.",
              "Then we pushed it with a big force, so it went much farther.",
              "The car moved faster because the force was bigger.",
              "Although the book on top made it heavier, the car still moved.",
              "In conclusion, a bigger force makes a thing speed up.",
            ],
            recycle: ["Last weekend I went to a concert, and I recorded a song.", "I enjoyed it, but I didn't stay for the end."],
            rounds: [
              { seconds: 70, say: "Tell your partner what happened in the lab, from the first push to the result. Use your lab notes and give at least one reason." },
              { seconds: 65, say: "New partner. Tell it again in less time. Keep the reasons, cut the extra words." },
              { seconds: 60, say: "New partner. Tell it fast and smooth, with no stops. The listener asks one question at the end: 'Why did it go faster?'" },
            ],
            steps: [
              "Look at your lab notes. Say what you did, what happened and why.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (often 'We push' for 'We pushed', or 'It go far') and fix them together; then go on.",
              "When the bell rings, find a new partner.",
              "The listener gives one piece of feedback: one thing that was clear and one thing that needs a reason.",
            ],
            prompts: ["(notes: small push, car moves a short way)", "(notes: big push, car goes far)", "(notes: book on top, car slower)"],
            feedback: fixVerbs,
            teacherNote: "This is the same telling three times on purpose: the second and third tellings free students to speak faster and add reasons because they are not searching for words. The retelling is in the past ('pushed', 'went'), so it keeps Unit 14's -ed alive. Final -ed sounds (pushed /t/) are easy to lose: say them clearly. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each note and say one sentence for it.", frames: ["We pushed it ___.", "It went ___."] },
              { level: "Core", task: "Tell the whole lab without the frames, with one reason." },
              { level: "Stretch", task: "Explain the result and compare: 'It went farther because we used a bigger force, although the car was heavier.'", frames: ["It went ___ because ___, although ___."] },
            ],
          },
        },
        {
          after: "Fast and slow speed line (SB 151)",
          slide: {
            kind: "writing",
            routine: "paragraph",
            mode: "solo",
            title: "Our force lab: plan, write, check",
            genre: "lab report",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the aim, the two tests, the example and the conclusion. Circle First, Then, so, because, for example, although and In conclusion.",
              "Plan: fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences in the past. Use at least four linking words.",
              "Check: tick the checklist. Swap with a partner: they underline every -ed or irregular past verb and say it aloud.",
              "Teacher: look only at the past verbs and at because / so / although. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: Our force lab",
              text: "In our force lab, we tested how a push changes the way a toy car moves. First, we pushed the car with a small force, and it rolled only a short way. Then we pushed it with a big force, so it went much farther. We also put a heavy book on top, and the car moved more slowly because the load was heavier. For example, the big push sent the empty car across the table in two seconds. In conclusion, a bigger force makes a thing move faster, although a heavy load slows it down.",
            },
            organiser: [
              { label: "Aim", prompt: "What did we test? Say it in one sentence in the past." },
              { label: "Test 1: First, ...", prompt: "What did we do with a small force? What happened?" },
              { label: "Test 2: Then, ...", prompt: "What did we do with a big force? What happened? Say why with 'so'." },
              { label: "Example or surprise", prompt: "What happened with the heavy book? Give an example with numbers or a comparison." },
              { label: "Conclusion", prompt: "What did we learn? Use 'In conclusion' and 'although'." },
            ],
            frames: ["In our force lab, we tested ___.", "First, we pushed ___ with a small force, and it ___.", "Then we pushed it with a big force, so it ___.", "For example, ___ because ___.", "In conclusion, ___, although ___."],
            checklist: [
              "A first sentence with the aim, three or four details and a conclusion",
              "Past simple: pushed, rolled, went, moved (say each one, then write it)",
              "because, so and although each followed by a full clause",
              "Linking words: First, Then, Also, For example, In conclusion",
            ],
            sayIt: "Read your paragraph to your partner. Then tell the lab again without looking.",
            teacherNote: "Students write what they did in the force lab and in the retell just before, so they already have the sentences in their mouths. The key idea (a bigger force moves a thing more) is now their own writing. It is also a good script for the recorded talk 'My push and pull test' at home: say so, and tell students to read it three times, faster each time. Final -ed (pushed) is easy to lose in writing: say it clearly and have the student point to the -ed. Mark only the past verbs and the clauses after because, so and although.",
            tiers: [
              { level: "Support", task: "Copy the five frames and fill in one or two words in each.", frames: ["First, we pushed it with a small force, and it ___.", "Then we pushed it with a big force, so it ___."] },
              { level: "Core", task: "Write six sentences, one or two for each box, with at least four linking words." },
              { level: "Stretch", task: "Write eight sentences and add a prediction: 'If we used an even bigger force, I think the car would go off the table.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My push and pull test",
        prompt: "Do a small test at home with something you can push or pull, like a chair on a smooth floor, a toy car or a rolling bag. Tell the story of your test: what you did, what happened and why. Use the past (I pushed it, it went far), and give at least one reason and one example.",
        length: "90-120 seconds",
        steps: [
          "Choose one thing to push and pull. Do a small push, then a big push, and notice what happens.",
          "Write five or six notes: what you tested, what happened with each push, why, and one example.",
          "Practice your talk two times, from your notes, and try to say it a little faster and with fewer stops each time.",
          "Record it once. Look at the camera and show the thing you tested.",
          "Watch it once. Listen for the end of past verbs (pushed, pulled) and for your reasons with because and so. Tell yourself one thing that went well and one thing to improve.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell what you tested, what happened and why. Give at least one reason and one example, and keep talking without long stops.",
        words: ["push", "pull", "force", "heavy", "light", "movement", "speed"],
        grammar: ["I pushed / pulled the ___. It went ___ because ___.", "A big force makes it ___, although ___."],
        rubric: [
          { label: "What happened", description: "Says what they pushed or pulled and what happened, with a small push and a big push.", weight: 3 },
          { label: "Reasons and examples", description: "Gives at least two reasons with because, so or although, and one example.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: push, pull, force, heavy, light, speed.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
          { label: "Past endings", description: "Says the -ed at the end: pushed, pulled. The 'ed' sound can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["I pushed the ___.", "It went ___ because ___."], tips: ["Do the push again as you speak, and read from your notes."] },
          { level: "Core", who: "Most students", frames: ["I pushed the ___ with a small force. It went ___.", "Then I pushed it with a big force, so it went ___."], tips: ["Say both pushes, then give one example."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["It went far because I used a big force, although the ___ was heavy.", "If I used an even bigger force, I think ___."], tips: ["Give two reasons and make a prediction."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u15-l3": {
      objectives: ["I can compare two things with -er than and add a reason or an example, fast and right."],
      trim: {
        "Is it true for ___ too? (transfer)": 4,
        "Listen and sing along (SB 153 D)": 5,
        "Stand up, crouch down (SB 152 C)": 4,
      },
      drop: ["Bigger, smaller, faster song", "Which one is more? (compare with real things)"],
      add: [
        {
          after: "Compare the groups (SB 153 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: compare it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the comparing sentence fast and right: ask it, say no, join it with because, although, so or when, move it to the past or to another person. Then compare things in your own life.",
            chunks: [
              "A laptop is lighter than a desktop computer.",
              "Is a scooter faster than a bike? Yes, it is. / No, it isn't.",
              "A bike isn't faster than a motorbike, but it is cheaper.",
              "A truck is heavier than a car because it carries more.",
              "Last year the school bus was slower than the new one, so we were often late.",
              "Their bags are heavier than ours, although ours are bigger.",
            ],
            recycle: ["We pushed it hard, and it went far.", "Did the car go far? Yes, it did."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a comparing sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the tense or time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: my / your / his / her / our / their." },
              { seconds: 90, say: "Real talk: compare things in your own life, such as two sports, two school subjects, two phones or your city and another one. Ask your partner if they agree, and say why." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Is / Are, X = say it with isn't / aren't, + = join with because, although, so or when, T = say it in the past or the future, P = change the person.",
              "Say the WHOLE new sentence. Keep -er and 'than' together: 'faster than', never 'more fast' or 'faster a'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'more fast' or a missing 'than'), fix them together, then go on.",
              "In round 3 the drill becomes real: compare two things you know well and say why you think so.",
            ],
            prompts: ["A jet is faster than a train. (?)", "A snail is slower than a bike. (X)", "A bike is lighter than a car. (+ so it is easier to carry)", "Our bag is heavier than yours. (T last week)", "My phone is newer than his. (P their phones, + although)"],
            feedback: fixCompare,
            teacherNote: "A drill only helps when the last step is real: round 3 has students compare things they really know, so the form is used for meaning and opinion. Grades 6-7 can take the full set: questions, negatives, a joined sentence, a change of tense and a change of person. Watch the spelling of the comparatives as well as the sound (heavier, bigger, thinner), and the missing 'than'.",
            tiers: [
              { level: "Support", task: "Use only ? and X with the frame on the board.", frames: ["Is a ___ ___er than a ___? Yes, it is. / No, it isn't.", "A ___ isn't ___er than a ___."] },
              { level: "Core", task: "Change every sentence with all five signs, and join two ideas with 'because' or 'although'." },
              { level: "Stretch", task: "Add a second clause and a follow-up question: 'My phone is newer than his, although his is bigger. Which one do you think is better?'" },
            ],
          },
        },
        {
          after: "Grammar drill: compare it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Compare talk 4-3-2: three listeners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 9,
            goal: "Give the same comparing talk to three listeners. Each talk is shorter and smoother, and each one keeps its reasons.",
            chunks: [
              "A truck is heavier than a bike, so it needs a bigger force to move.",
              "A jet is faster than a train, although a train is cheaper.",
              "A snail is slower than a bicycle, but it is quieter.",
              "Hanoi is bigger than my grandmother's town, but her town is quieter.",
              "Is a horse faster than a tortoise? Yes, it is. A horse is much faster because it has longer legs.",
            ],
            recycle: ["Last weekend I played football with my friends.", "I like the drum, but I don't like the trumpet."],
            rounds: [
              { seconds: 80, say: "Line A tells the comparing talk to the first listener, with picture cards. The listener counts the reasons (because, so, although) on paper." },
              { seconds: 70, say: "Line B moves one step: a new listener. Line A tells the same talk in less time." },
              { seconds: 60, say: "Line B moves again: a third listener. Fast and smooth! The listener says whether they agree, and why." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks, line B listens. Line A holds three picture cards (for example: a truck, a bike, a snail).",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'more fast' or a missing 'than') and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new listener each round.",
              "After three rounds, swap jobs: line B talks and line A listens, with three new cards.",
            ],
            prompts: ["(cards: truck, bike, snail, jet, train, elephant, mouse)", "(cards: your city, a smaller town, a village)"],
            feedback: fixCompare,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity. It builds speed and smoothness; it does not by itself fix grammar, which is why the one-minute fix in the middle matters. Do not add new language between rounds. Listen for 'than' in every sentence, for the final -er sound and for a full clause after because, so and although.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frame, with one reason.", frames: ["A ___ is ___er than a ___, so ___."] },
              { level: "Core", task: "Say four or five sentences without the board, with two reasons." },
              { level: "Stretch", task: "Add a question and a contrast: 'Is a horse faster than a tortoise? Yes, it is, although a tortoise lives longer.'", frames: ["A ___ is ___er than a ___ because ___, although ___."] },
            ],
          },
        },
        {
          after: "Look around the room (SB 153 F)",
          slide: {
            kind: "writing",
            title: "Join them with 'than'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 7,
            steps: [
              "Read the short sentences in each item.",
              "Make ONE sentence with -er and 'than', and join the ideas with the word in the brackets. Say it first, then write it.",
              "Read your sentence to your partner. Is it true? Do you agree?",
            ],
            items: [
              { q: "A laptop is light. A desktop computer is heavy. Make one sentence with -er and 'than', then add 'so' (start: A laptop ...)", answer: "A laptop is lighter than a desktop computer, so it is easier to carry." },
              { q: "A bike is slow. A bus is fast. A bike is cheap. Join them with 'although' (start: Although a bike ...)", answer: "Although a bike is slower than a bus, it is cheaper." },
              { q: "My bag is light this year. It was heavy last year. I carry fewer books. Use 'than' and 'because' (start: My bag ...)", answer: "My bag is lighter than it was last year because I carry fewer books." },
              { q: "A big push makes a ball go far. A small push makes it go a short way. Use 'than' (start: A big push ...)", answer: "A big push makes a ball go farther than a small push." },
              { q: "A truck is heavy. A bike is light. A truck needs a big force. Use 'than' and 'so' (start: A truck ...)", answer: "A truck is heavier than a bike, so it needs a bigger force." },
            ],
            frames: ["A ___ is ___er than a ___, so ___.", "Although a ___ is ___er than a ___, ___."],
            checklist: ["-er on the word, and 'than' after it", "so, although and because are each followed by a full clause", "heavy -> heavier, big -> bigger (look at the spelling)", "A capital letter and a full stop"],
            sayIt: "Say your sentences to your partner, then say them again without looking.",
            teacherNote: "Sentence combining teaches joining and the comparative through use, not rules. Do the first one together, crossing out the second sentence on the board. The common slips here are 'more fast', 'heavyer', 'biger' and a missing 'than', and a comma before although: make them a spelling and 'than' check, not a telling off. Item 4 needs 'farther', which students may not know: prompt with 'far, farther'.",
            tiers: [
              { level: "Support", task: "Do items 1, 2 and 5 with the frames on the board." },
              { level: "Core", task: "Do items 1 to 4." },
              { level: "Stretch", task: "Do all five, then write two combined sentences of your own about things in your school or your city." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u15-l4": {
      objectives: ["I can ask for help and offer help politely, explain why, and keep the conversation going without stopping."],
      trim: {
        "Which is more useful: a push or a pull?": 3,
        "Opposites mirror (SB 155 F)": 7,
        "Listen, point, say, move (SB 154 A)": 6,
      },
      drop: ["Help! chant", "Push, pull or both? (real classroom things)"],
      add: [
        {
          after: "Let me help you (SB 155 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: can it, ask it, say why",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the help sentences fast and right: ask it politely, say no, join it with because, although, so or when, move it to the past or to another person. Then talk about times you needed help.",
            chunks: [
              "I can't push this table because it is too heavy for me.",
              "Could you help me move it? Yes, of course. / Sorry, I can't.",
              "Let me help you, although I am not very strong.",
              "She can't open the door, so he pulls it for her.",
              "Yesterday I couldn't lift my bag because it was too heavy.",
              "When something is too heavy, it is better to ask for help.",
            ],
            recycle: ["A truck is heavier than a bike.", "We pushed it hard, and it went far."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a help sentence and shows a sign (? = ask it politely, X = say no, + = join with because, although, so or when, T = change the tense or time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, he, she, we, they." },
              { seconds: 90, say: "Real talk: tell your partner about a time you needed help with something heavy or difficult, and a time you helped someone. Ask a follow-up question, and give your opinion with 'because' or 'although'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a polite question with Can / Could, X = say it with can't / couldn't / don't, + = join with because, although, so or when, T = say it in the past, P = change the person.",
              "Say the WHOLE new sentence. After can, could and 'let me' the verb stays plain: 'Let me help you', never 'Let me helps you'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'It heavy' or 'Could you to help'), fix them together, then go on.",
              "In round 3 the drill becomes real: describe a real moment when you needed help or helped someone.",
            ],
            prompts: ["I can lift this box. (X)", "You can help me. (? Could)", "I can't open it. (+ because it is stuck)", "I can't lift my bag. (T yesterday, + because it was heavy)", "He can push the door. (P we, X, + although)"],
            feedback: "Prompt, do not tell: for 'It heavy' hold up one finger and say 'It i...?'; for 'Could you to help me?' repeat it with a rising voice and let the student fix it; for 'Let me helps you' point to the frame 'Let me + plain verb'; for a missing -ed or -s, tap your wrist. Say the -t of can't clearly yourself, and the -ed of past verbs.",
            teacherNote: "A drill only helps when the last step is real: round 3 has students talk about real moments when they asked for or offered help, so the polite forms are used for meaning. Grades 6-7 can take the full set: polite questions, negatives, a joined sentence and a change of tense and person. Watch 'can't' against 'can' (the difference is small in speech), the missing 'is' ('It heavy') and the extra 'to' after could.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Could you help me ___? Yes, of course. / Sorry, I can't.", "I can't ___ because it is too ___."] },
              { level: "Core", task: "Change every sentence with all five signs and all the persons, and give a reason with 'because' or 'although'." },
              { level: "Stretch", task: "Add a second clause and a follow-up question: 'I couldn't lift it because it was heavier than my bag, so I asked my brother. Do you usually ask for help?'" },
            ],
          },
        },
        {
          after: "Grammar drill: can it, ask it, say why",
          slide: {
            kind: "fluency",
            title: "Help chain: I can't, let me help",
            routine: "question chain",
            mode: "whole",
            minutes: 9,
            goal: "Ask, answer and pass it on with a reason. Keep the help chain going with no stops, and make each link sound polite and natural.",
            chunks: [
              "Phew! I can't push this because it is much too heavy for me.",
              "Could you help me move it, please?",
              "Of course. Let me help you, although I am also tired.",
              "Thanks, that would be great. It is easier with two people.",
              "No problem. It is heavier than it looks!",
            ],
            recycle: ["A truck is heavier than a bike.", "We pushed it hard. It went far."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a picture card of a heavy thing and says why it is hard to move." },
              { seconds: 80, say: "Swap cards. Go faster, and add a new reason each time." },
              { seconds: 70, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Say: 'Phew! I can't push this because it is much too heavy for me.' Then ask the student on your left: 'Could you help me move it, please?'",
              "They answer: 'Of course. Let me help you.' You say: 'Thanks, that would be great.' They say: 'No problem.'",
              "Then it is their turn: they show their card and the chain goes on.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together with prompts; then go on to round 2.",
            ],
            prompts: ["(card: piano)", "(card: big box)", "(card: wagon)", "(card: table)", "(card: sofa)"],
            feedback: fixVerbs,
            teacherNote: "The chain makes every student ask AND answer many times in a few minutes, which is what makes 'I can't ... because it is too heavy' and 'Let me help you' automatic. Time the whole circle and tell them; students like beating their own time. Watch for 'Let me helps you' and 'It heavy': prompt with a finger and 'It's too h...?'. Hold the circle to one new idea only: help. Push for a natural, polite tone, not just correct words.",
            tiers: [
              { level: "Support", task: "Say the four sentences with the frames on the board.", frames: ["Phew! I can't ___ this because it is too ___.", "Could you help me? / Let me help you."] },
              { level: "Core", task: "Say the whole chain without looking at the board, with a reason each time." },
              { level: "Stretch", task: "Compare and give an example: 'It's heavier than my backpack. For example, I couldn't lift it yesterday.'", frames: ["It's ___er than ___.", "For example, ___."] },
            ],
          },
        },
        {
          after: "Tell your partner (SB 155 Write box)",
          slide: {
            kind: "writing",
            title: "Fix the helper's notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "A helper wrote notes about pushing, pulling and helping, but there are mistakes!",
              "Read each note with your partner and find the mistake. Some notes have one, some have two.",
              "Write it the right way. Read it aloud together.",
            ],
            items: [
              { q: "I can't push the box because it heavy.", answer: "I can't push the box because it is heavy." },
              { q: "Could you to help me lift this table?", answer: "Could you help me lift this table?" },
              { q: "My brother pulls the wagon, but it come toward him slowly.", answer: "My brother pulls the wagon, but it comes toward him slowly." },
              { q: "A wagon is more heavy than a ball, so it need a bigger force.", answer: "A wagon is heavier than a ball, so it needs a bigger force." },
              { q: "Although the box was heavy, we pushed it easily because we was strong.", answer: "Although the box was heavy, we pushed it easily because we were strong." },
            ],
            frames: ["I can't push the ___ because it is ___.", "Could you help me ___? Let me help you."],
            checklist: [
              "'is' is in the sentence: It is heavy.",
              "He, she, it + a verb: add -s (it comes, it needs)",
              "After could, can and 'let me', no 'to' and no -s: Could you help me?",
              "heavier, not 'more heavy'; we were, not 'we was'",
            ],
            sayIt: "Say all five fixed notes to your partner, fast.",
            teacherNote: "Five slips: the missing 'is', an extra 'to' after could, the missing -s on 'it comes' and 'it needs', 'more heavy', and 'we was'. The missing 'is' and -s are common for Vietnamese students, whose first language has no 'is' before an adjective and no verb endings. Fix the first one together and explain it in one sentence, then let pairs do the rest. Praise a student who finds a mistake you did not plan.",
            tiers: [
              { level: "Support", task: "Fix notes 1, 2 and 3 with the frames on the board." },
              { level: "Core", task: "Fix all five notes." },
              { level: "Stretch", task: "Fix all five, then write two new notes with mistakes for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u15-l5": {
      objectives: ["I can compare things, give reasons and examples, and explain why a heavier thing needs a bigger force, fast and right."],
      trim: {
        "Remember it!": 5,
        "Big push, small push: the sentence game": 5,
        "Does the rule work here too?": 3,
      },
      drop: ["Grammar mystery: Big Push Day", "Movement break: Be bigger!"],
      add: [
        {
          after: "Big push, small push: the sentence game",
          slide: {
            kind: "fluency",
            title: "Grammar drill: heavier, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the comparing sentence fast and right: ask it, say no, join it with because, although, so or when, move it to the past or to another person. Then argue your opinion about things in your own life.",
            chunks: [
              "A wagon is heavier than a ball, so it needs a bigger force.",
              "Is a bike faster than a snail? Yes, it is. / No, it isn't.",
              "A scooter isn't faster than a motorbike, but it is cheaper.",
              "It is easier to push an empty box than a full box because the full box is heavier.",
              "Last week our bags were much heavier than usual because we had exams.",
              "My bag is bigger than yours, although yours is slightly heavier.",
            ],
            recycle: ["Could you help me move it, please?", "We pushed it with a big force, so it went farther."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a comparing sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the tense or time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use a little, much and slightly with -er: 'much heavier', 'slightly faster'." },
              { seconds: 90, say: "Real talk: give your opinion about two sports, two school subjects, two cities or two phones. Your partner agrees or disagrees and gives a reason. Then swap." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Is / Are, X = say it with isn't / aren't, + = join with because, although, so or when, T = say it in the past or the future, P = change the person.",
              "Say the WHOLE new sentence. Keep -er and 'than' together, and add 'much', 'a little' or 'slightly' before the -er word when you can.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'more heavy' or 'then' for 'than'), fix them together, then go on.",
              "In round 3 the drill becomes real: state your opinion, defend it with a reason, and listen to a different opinion.",
            ],
            prompts: ["A truck is heavier than a car. (X)", "A bike is faster than a scooter. (?)", "A box is heavier than a ball. (+ so it needs a bigger force)", "My bag is lighter than yours. (T last year)", "A wagon is heavier than a ball. (P their wagons, + although)"],
            feedback: fixCompare,
            teacherNote: "This is the same drill as the lesson 3 drill, but now with the force idea (a heavier thing needs a bigger force) and with 'much', 'a little' and 'slightly' to make comparisons sound natural. Round 3 is an opinion round, so the form is used to argue, not just to repeat. Watch 'then' and 'than' in speech and writing.",
            tiers: [
              { level: "Support", task: "Use only ? and X with the frame on the board.", frames: ["Is a ___ ___er than a ___? Yes, it is. / No, it isn't.", "A ___ needs a bigger force than a ___."] },
              { level: "Core", task: "Change every sentence with all five signs, and join two ideas with 'because', 'so' or 'although'." },
              { level: "Stretch", task: "Add a second clause and a follow-up question: 'A full box is much heavier than an empty one, so it needs a bigger force. Do you think a pull is easier than a push?'" },
            ],
          },
        },
        {
          after: "Mystery order: the information gap",
          slide: {
            kind: "fluency",
            title: "Order game again: new partner, same game",
            routine: "task repeat",
            mode: "pairs",
            minutes: 9,
            goal: "Play the same order game three times with new partners. Ask and answer faster each time, and explain the order with reasons.",
            chunks: [
              "Is a truck heavier than a car? Yes, it is, so it needs a bigger force.",
              "Is a bike faster than a scooter? No, it isn't. A scooter is slightly faster on a smooth road.",
              "No, it isn't. A bike is lighter than a truck, so it needs a smaller force.",
              "The order is: feather, bike, car, truck. A feather is much lighter than a bike.",
            ],
            recycle: ["Could you help me move it, please?", "We pushed it hard, so it went far."],
            rounds: [
              { seconds: 80, say: "Round 1: Partner A plays the order game, then Partner B. Find the order of four things, from lightest to heaviest, and give one reason. Then change partners." },
              { seconds: 70, say: "Round 2: new partner, new four things. Partner A plays, then Partner B. Same game, faster. Then change partners." },
              { seconds: 60, say: "Round 3: new partner. Partner A plays, then Partner B. Can you find the order and explain it in under a minute?" },
            ],
            steps: [
              "In each round, Partner A plays the game, then Partner B plays it. Each partner has half of the information. Ask 'Is a ___ heavier than a ___?' and answer 'Yes, it is.' or 'No, it isn't.', then add a reason.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them with prompts; then go on.",
              "When the bell rings, find a new partner and a new set of four cards.",
              "At the end, say the whole order in one sentence: 'A bike is lighter than a car, and a car is lighter than a truck, so a truck needs the biggest force.'",
            ],
            prompts: ["(cards: feather, bike, car, truck)", "(cards: mouse, dog, horse, elephant)", "(cards: snail, bike, car, jet; this set is slowest to fastest)"],
            feedback: fixCompare,
            teacherNote: "Task repetition: the same kind of task with new content gives students the same language again, which is what makes the question 'Is a ___ ___er than a ___?' fast. The goal is a smaller pause before 'Yes, it is.' each round and a reason that comes quickly. Listen for 'Yes, it is' (not 'Yes, it has') and 'No, it isn't', and for 'than'.",
            tiers: [
              { level: "Support", task: "Use the frames on the board.", frames: ["Is a ___ ___er than a ___?", "Yes, it is. / No, it isn't."] },
              { level: "Core", task: "Ask and answer without looking at the board, with a reason." },
              { level: "Stretch", task: "Add why and a contrast: 'A truck is heavier than a bike, so it needs a bigger force, although a bike is harder to balance.'", frames: ["A ___ is ___er than a ___, so it needs a bigger force, although ___."] },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            routine: "paragraph",
            mode: "solo",
            title: "My two things and a force: plan, write, check",
            genre: "comparison",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the two comparisons, the example and the conclusion. Circle every -er than and the words because, so, although, for example and In conclusion.",
              "Plan: fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use -er than at least twice and at least four linking words.",
              "Check: tick the checklist. Swap with a partner: they point to every -er and every than, and tell you which comparison is the strongest.",
              "Teacher: look only at -er than and at because / so / although with a full clause. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: Two bags and a force",
              text: "I have two bags at home, and they are very different. My school backpack is heavier than my sports bag because it holds six books and a laptop. For example, I need a big force to lift it onto the bus, but I can swing my sports bag with one hand. Also, my sports bag is bigger, so I can keep my shoes and a towel inside. However, it is lighter, so it is easier to carry. In conclusion, a heavier thing needs a bigger force, although a bigger thing is not always heavier.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What are your two things? How are they different?" },
              { label: "Comparison 1", prompt: "Which is heavier or bigger? Give a reason with 'because'." },
              { label: "Example", prompt: "Give a real example of the force you need. Start with 'For example'." },
              { label: "Comparison 2", prompt: "Compare them again: faster, lighter, cheaper. Use 'so' or 'however'." },
              { label: "Closing", prompt: "What does this show about heavy things and force? Use 'In conclusion' and 'although'." },
            ],
            frames: ["I have two ___: a ___ and a ___.", "The ___ is ___er than the ___ because ___.", "For example, I need a ___ force to ___.", "Also, the ___ is ___er, so ___. However, ___.", "In conclusion, a heavier thing ___, although ___."],
            checklist: [
              "-er and 'than' in the sentence: heavier than, never 'more heavy'",
              "heavy -> heavier, big -> bigger (look at the spelling)",
              "because, so and although each followed by a full clause",
              "A topic sentence, details and a closing sentence, with linking words: Also, However, For example, In conclusion",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan-write-check as a full paragraph: students say the idea in the boxes first (which is heavier, and why?), then write six to eight sentences with -er than and the joining words because, so, although, however, also, for example and in conclusion. Do not require 'although'; Support students write the frames. It is a good script for the recorded talk 'Which is heavier?' at home: say so. Mark only -er than and the clauses after because, so and although.",
            tiers: [
              { level: "Support", task: "Copy the five frames and fill in one or two words in each.", frames: ["The ___ is heavier than the ___ because ___.", "In conclusion, a heavier thing ___."] },
              { level: "Core", task: "Write six sentences, one or two for each box, with -er than twice and at least four linking words." },
              { level: "Stretch", task: "Write eight sentences and add a prediction or an opinion: 'I think a backpack with wheels would be easier to move, so it would need a smaller force.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Which is heavier? My comparing talk",
        prompt: "Choose three things at home, like a school bag, a book and a shoe, or three sports or three places you know. Compare them with -er than, give reasons and examples, and say which needs the biggest force to move.",
        length: "90-120 seconds",
        steps: [
          "Choose three things. If they are objects, pick them up and feel which one is heavier.",
          "Write five or six notes: your comparisons, a reason for each, one example, and your opinion about which needs the biggest force.",
          "Practice your talk two times, from your notes, and try to say it a little faster and with fewer stops each time.",
          "Record it once. Hold up each thing as you compare it, or look at the camera.",
          "Watch it once. Listen for -er than in every comparison and for your reasons with because, so and although. Tell yourself one thing that went well and one thing to improve.",
        ],
        maxSeconds: 180,
        kidSummary: "Compare three things with -er than, give reasons and examples, say which needs a bigger force, and keep talking without long stops.",
        words: ["heavier", "lighter", "bigger", "smaller", "faster", "slower", "force"],
        grammar: ["A ___ is ___er than a ___ because ___.", "A heavier thing needs a bigger force, although ___."],
        rubric: [
          { label: "Comparing", description: "Compares at least two pairs with -er and 'than': 'A bag is heavier than a shoe.'", weight: 3 },
          { label: "Reasons and examples", description: "Gives a reason with because, so or although for each comparison, and at least one real example.", weight: 3 },
          { label: "Force idea", description: "Says which thing needs the bigger force, and why.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
          { label: "Word shapes", description: "Says heavier, bigger and lighter with the right ending, not 'more heavy'.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["A ___ is heavier than a ___.", "A ___ is lighter than a ___ because ___."], tips: ["Hold up each thing as you say it, and read from your notes."] },
          { level: "Core", who: "Most students", frames: ["A ___ is ___er than a ___ because ___.", "A ___ is heavier than a ___, so it needs a bigger force."], tips: ["Compare two pairs, give a reason for each, then say the force sentence."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Is a ___ heavier than a ___? Yes, it is, although ___.", "It is easier to ___ a ___ than a ___ because ___."], tips: ["Ask the viewer a question, give an example and say what you think."] },
        ],
      },
    },
  },
};
