import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 2 "Animal Adventures"
// (src/lib/lessonDecks/lab.ts puts it into the decks). The class is in grades 6-7 (ages 11-13),
// working on a book written for younger learners, so the Lab raises the language and the topics:
// every lesson has a grammar drill (the unit's grammar changed, asked, negated, joined, moved in
// time and changed in person, then used for real talk) and one longer fluency routine with
// two-clause chunks, reasons and opinions. Three lessons write a full paragraph; the others
// write harder sentences. Recorded talks are for students to make on their own. Time comes from
// games for younger learners and repeats, never from the book pages or the grammar. All text is
// original.

const fixS =
  "Listen and do not stop the talk. Note two or three mistakes (no names), usually a missing -s on he / she / it verbs (a bird peck), a missing 'does' or a misplaced adverb. After the first round stop for one minute and fix them on the board. For grammar, prompt the student to fix it: start the phrase and pause ('A bird peck...?'), point to the frame, or hold up a finger for the missing -s; do not say it for them. For a sound, say it right and let the student echo it. Say every final -s clearly yourself: students copy what they hear.";

const fixOften =
  "Listen and do not stop the talk. Note two or three mistakes (no names): the adverb in the wrong place (A cat sleeps always), 'is' left out (She always late), a missing -s (He never play), or 'don't never'. After round 1 stop for one minute and fix them on the board. For grammar, prompt the student to fix it: repeat the mistake with a rising voice ('A cat sleeps always...?'), start the phrase and pause ('A cat always ...'), or hold up a finger for the missing -s. For a sound, say it right and let the student echo it. Say every final -s clearly yourself.";

const drillRound1 =
  "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join it with because, although, so or when, T = change the tense or the time, P = change the person). The class says the new sentence together.";
const drillRound2 =
  "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use two signs together when you are ready (X +, ? T).";
const drillFixStep =
  "Teacher: after round 1, stop for one minute and put the two mistakes you heard most on the board (no names). Fix them together, then go on.";
const drillSayWhole =
  "Say the WHOLE new sentence, with the -s, the -ed or the n't clearly. The partner listens and shows a thumbs down if a small word is missing.";

export const odL2U2Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u02-l1": {
      objectives: ["I can say what animals do and why, ask 'Does it ___?', and give an opinion, fast and without stopping."],
      drop: ["Animal moves: do what I say"],
      trim: {
        "Mystery bag: what do you notice?": 5,
        "Flashcard slap and what's missing?": 6,
        "Is it an animal? Is it something animals do? Sort": 8,
      },
      add: [
        {
          after: "Who does what?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: does it, doesn't it, because",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, move it in time, change the person. Then talk about your own life and opinions.",
            chunks: [
              "A fox hunts at night because it sees well in the dark.",
              "Does a fox hunt during the day? No, it doesn't, although it sometimes does when it is hungry.",
              "Foxes don't hunt in groups, so they look for food alone.",
              "Last winter, a fox crept into our yard when everyone was asleep.",
              "My cousin and I don't watch wildlife videos, but we love visiting the zoo.",
            ],
            recycle: ["Most birds have feathers, so they can stay warm and fly.", "I like frogs because they jump so far."],
            rounds: [
              { seconds: 60, say: drillRound1 },
              { seconds: 90, say: drillRound2 },
              { seconds: 90, say: "Real talk: which animals do you find interesting, and which do you not like? Ask your partner questions with Does / Do, answer in a full sentence and give a reason with because or although. Then tell your partner about an animal you saw last year (T)." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Does / Do, X = make it negative, + = add because, although, so or when, T = say it about the past, P = change the person (it, they, we, I).",
              drillSayWhole,
              drillFixStep,
              "In round 3 the drill becomes real talk: find out what your partner thinks about animals, and remember one opinion to tell the class.",
            ],
            prompts: ["A cat creeps up on a bird. (?)", "Owls hunt in the morning. (X)", "A mouse escapes. (+ because it hears the cat)", "A fox hunts at night. (T: last night)", "I watch birds in the park. (P: my brother)"],
            feedback: "Prompt, do not tell: for 'Do a fox hunt?' hold up one finger and say 'D...?'; for 'No, it don't' repeat it with a rising voice and let the student fix it; for 'It hunt at night' tap your wrist for the missing -s; for 'A fox hunt yesterday' point to the past tense on the board and ask 'When?'. Say the -s and the n't clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has the students say what they think about animals, so the form is used for meaning. Students of this age can take the full set (question, negative, a joined sentence with a reason or a contrast, a change of time and of person) at speed, so keep it brisk. The unit's grammar (-s on he / she / it, Does ...?) is the point; the past-tense sentence is a quick stretch for those who are ready.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with it and they, and the frames on the board.", frames: ["Does it ___? Yes, it does. / No, it doesn't.", "It doesn't ___, but it ___s.", "It ___s because ___."] },
              { level: "Core", task: "Change every sentence, with it, they, we and I, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a second clause and a follow-up question: 'Foxes don't hunt in groups, although they sometimes share food. Why do you think that is?'", frames: ["___ doesn't ___, although ___.", "Why do you think ___?"] },
            ],
          },
        },
        {
          after: "Grammar drill: does it, doesn't it, because",
          slide: {
            kind: "fluency",
            title: "Animal sprint: what does it do and why?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole long sentence, fast and smooth, with the reason and the -s at the end.",
            chunks: [
              "A cat creeps up slowly because it wants to surprise a bird.",
              "A bird pecks seeds on the ground, although it is always watching for danger.",
              "A fox hunts at night, so it sees better than most of its prey.",
              "Does a mouse escape every time? No, it doesn't, but it is very fast.",
              "I think wild animals are more interesting than pets because they must survive alone.",
            ],
            recycle: ["They have feathers, so they can fly.", "My favorite animal is the parrot because it can copy sounds."],
            rounds: [
              { seconds: 80, say: "Everyone together: the teacher shows an animal card and a reason card; the class says the whole sentence with because, although or so." },
              { seconds: 80, say: "Pairs: one shows a card, the other says a long sentence with a reason. Swap when you hear the clap." },
              { seconds: 80, say: "Faster! New partner. Give your own opinion about an animal and say why. How many long sentences can you say?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence with a reason: 'A bird pecks seeds, although it is always watching for danger.'",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers and try to beat your total.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(card: cat + surprise)", "(card: bird + danger)", "(card: fox + night)", "(card: mouse + fast)", "(card: parrot + sounds)"],
            feedback: fixS,
            teacherNote: "Whole sentences with a reason, never single words: 'A bird pecks seeds, although it is always watching for danger' is one smooth piece. The final -s on pecks, creeps and hunts is a sound many Vietnamese learners drop, so say it clearly and listen for it. Mix in two Unit 1 phrases every few turns so last unit's language stays fast, and keep the topics real: wild animals or pets, which one students prefer, and why.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["A ___ ___s because ___.", "Does it ___? Yes, it does."] },
              { level: "Core", task: "Say the sentence alone, with a reason, without looking at the board." },
              { level: "Stretch", task: "Add a contrast and an opinion: 'A fox hunts at night, although it sometimes hunts at dusk. I think it is clever because ...'", frames: ["A ___ ___s ___, although ___."] },
            ],
          },
        },
        {
          after: "Think: how can animals help people? (SB 17)",
          slide: {
            kind: "writing",
            title: "Make the animal sentence bigger",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the short sentence with the teacher.",
              "Make it longer: add where, when, why or a contrast (because, although, so, but).",
              "Write your long sentence. Read it to your partner, then say it again without looking.",
            ],
            items: [
              { q: "A bird pecks. (add: seeds, on the ground, although it watches for danger)", answer: "A bird pecks seeds on the ground, although it is always watching for danger." },
              { q: "A cat creeps. (add: slowly, because it wants to catch a mouse)", answer: "A cat creeps slowly because it wants to catch a mouse." },
              { q: "A mouse escapes. (add: from the cat, through a hole, so it is safe)", answer: "A mouse escapes from the cat through a hole, so it is safe." },
              { q: "A fox hunts. (add: at night, but it sometimes hunts at dusk)", answer: "A fox hunts at night, but it sometimes hunts at dusk." },
              { q: "Dogs help people. (add: many ways, for example, guide blind people and find lost hikers)", answer: "Dogs help people in many ways: for example, they guide blind people and find lost hikers." },
            ],
            frames: ["A ___ ___s ___, although ___.", "A ___ ___s ___ because ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "One animal: the verb has -s (pecks, hunts)", "A joining word: because, although, so or but"],
            sayIt: "Read your long sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a bare sentence into a two-clause sentence shows that the grammar stays the same while the information grows. Check the -s on the verb: it is the error we want to catch, and the comma before although or so.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames, then check with a partner." },
              { level: "Core", task: "Do items 1 to 4 and write one long sentence of your own." },
              { level: "Stretch", task: "Do all five and write two long sentences of your own with because and although." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u02-l2": {
      objectives: ["I can tell an adventure in order, with reasons, faster each time, and write it as a paragraph."],
      drop: ["Chant: creep, peck, hunt", "Act it out in threes"],
      trim: {
        "Word detectives: the highlighted words": 8,
        "Same and different: the character Venn (SB 18 Think)": 10,
      },
      add: [
        {
          after: "Tell it in order",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no, move it",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the story sentences fast and right: ask it, say no, join it with a reason, move it in time, change the person. Then use the same forms to talk about your own experience.",
            chunks: [
              "The two friends hide behind a rock when the fox creeps closer.",
              "Does the fox see them? No, it doesn't, because it is looking at a bird.",
              "They don't run, so the fox never hears them.",
              "Last summer, we got lost in the forest, although we had a map.",
              "My brother and I usually stay calm when we see an unusual animal.",
            ],
            recycle: ["Birds have wings, so they can fly.", "A cat sometimes climbs a tree because it feels safe there."],
            rounds: [
              { seconds: 60, say: drillRound1 },
              { seconds: 90, say: drillRound2 },
              { seconds: 90, say: "Real talk: have you ever seen a wild animal close to you? Ask your partner with Did / Do / Does, answer in a full sentence and say how you felt and why. Then change one detail of your story (P) and tell it again." },
            ],
            steps: [
              "Listen to the sentence from the story. Look at the sign. Change it: ? = ask it, X = make it negative, + = add because, although, so or when, T = change the time (now / last summer), P = change the person.",
              drillSayWhole,
              drillFixStep,
              "In round 3 use the same forms for real talk about an animal you have seen, and remember one detail to tell the class.",
            ],
            prompts: ["The fox sees the birds. (?)", "The friends run away. (X)", "They stay still. (+ because the fox is close)", "The fox creeps closer. (T: last night)", "The friends feel nervous. (P: I)"],
            feedback: "Prompt, do not tell: for 'Do the fox see them?' hold up one finger and say 'D...?'; for 'It don't see' repeat it with a rising voice and let the student fix it; for 'They hide yesterday' point to the past form on the board and ask 'When?'; for a missing -s on creeps, tap your wrist. Say the -s and the n't clearly yourself.",
            teacherNote: "The story's own sentences are the drill, so students hear the new forms in language they already know. Round 3 makes it real: they talk about an animal they have really seen, so the form carries meaning. Keep it brisk. The present simple -s and the Does question are the targets; the change of time is a quick stretch for those who are ready.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with he / she / it / they, and the frames on the board.", frames: ["Does the ___ ___? Yes, it does. / No, it doesn't.", "They don't ___, so ___."] },
              { level: "Core", task: "Change every sentence, with it, they, we and I, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a second clause and a follow-up question: 'The fox doesn't see them, although they are close. Why do you think that is?'", frames: ["___ doesn't ___, although ___.", "Why do you think ___?"] },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no, move it",
          slide: {
            kind: "fluency",
            title: "Adventure retell: 4-3-2 style",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same adventure three times. Each time is shorter, smoother and faster, with reasons and linking words.",
            chunks: [
              "First, the two friends go out to play, although their parents say the forest can be dangerous.",
              "Then they see a fox, and they feel nervous because it is looking straight at them.",
              "Next, they run behind a rock, so the fox loses them.",
              "In the end, one friend helps the other, which shows that staying calm is the best plan.",
            ],
            recycle: ["They have feathers, so they can fly.", "I like frogs because they jump."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the adventure, then Partner B. Use your four cards and give a reason for each part. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Tell it fast! Partner A, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Put four cards in a row: First, Then, Next, In the end.",
              "In each round, Partner A tells the adventure, then Partner B tells it. The listener counts the linking words (because, so, although, which) on their fingers.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on.",
              "When the bell rings, find a new partner and tell it again, shorter.",
            ],
            prompts: ["(card: First)", "(card: Then)", "(card: Next)", "(card: In the end)"],
            feedback: fixS,
            teacherNote: "The same story three times on purpose: the second and third tellings free students to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 is what makes it accurate as well as fast. Listen for the order words, the linking words and the -s on 'sees', 'runs' and 'helps'. Accept shorter tellings in rounds 2 and 3: the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence with a reason for it.", frames: ["First, ___.", "Then ___ because ___.", "Next, ___, so ___.", "In the end, ___."] },
              { level: "Core", task: "Tell all four parts with a linking word in each, without the frames." },
              { level: "Stretch", task: "Add a contrast and a lesson: 'They were afraid, although the fox was far away. This shows that ...'", frames: ["___, although ___.", "This shows that ___."] },
            ],
          },
        },
        {
          after: "Why do they act this way?",
          slide: {
            kind: "writing",
            title: "A close call: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three events with their linking words and the closing sentence.",
              "Plan: fill the five boxes with a few words each, not sentences. Say one sentence for each box to your partner.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use First, Also, However, because, for example and In conclusion.",
              "Check: tick the checklist. Your partner underlines every linking word and tells you which sentence they liked best.",
              "Teacher: look only at the linking words, it / they and the -s or -ed on the verbs. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: A close call in the forest",
              text: "Last summer, my cousin and I had a small adventure in the forest near her village. First, we followed a narrow path because we wanted to find the river. However, we stopped suddenly when we heard a noise behind a bush. It was a fox, and it was watching us carefully. Also, we stayed completely still, so it lost interest and walked away. For example, my cousin did not even breathe! In conclusion, I usually feel brave around animals, but that day taught me that staying calm is the best way to stay safe.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "When and where did it happen? Who was with you? Say the whole situation in one sentence." },
              { label: "Detail 1: First, ...", prompt: "What did you do first, and why? Use because." },
              { label: "Detail 2: However, ...", prompt: "What went wrong, or what did you see? Use however." },
              { label: "Detail 3: Also, ...", prompt: "How did you or the animal react? Add an example with for example." },
              { label: "Closing: In conclusion, ...", prompt: "What did you learn? Say how you usually feel and how this time was different." },
            ],
            frames: ["Last ___, ___ and I ___ in / at ___.", "First, we ___ because ___.", "However, ___ when ___.", "Also, ___, so ___. For example, ___.", "In conclusion, I usually ___, but ___."],
            checklist: [
              "A topic sentence, three details with linking words and a closing sentence",
              "'It' for one animal and 'they' for more than one",
              "A how-often word (usually, never) before the doing word or after am / is / are",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "A first full paragraph at the level these students need: the retell they have just told aloud, now in six to eight sentences with linking words. The five boxes hold words, not sentences, so the time goes into the writing. Mark only two things (the linking words and it / they or the verb endings) and let the student find the mistake from your dot. This paragraph is also the script for the recorded talk at home, so say so when they finish.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["Last ___, ___ and I ___ in ___.", "First, we ___ because ___.", "In conclusion, ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences with at least four linking words." },
              { level: "Stretch", task: "Write eight sentences and add a contrast with although and a short example of how you felt." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My close call, in order",
        prompt: "Tell us about a real or imagined adventure with an animal. Say what happened in order, give reasons and give at least one example.",
        length: "90-120 seconds",
        steps: [
          "Look at your paragraph from class. Write five short notes (words, not sentences): the situation, what you did, what went wrong, what happened next, what you learned.",
          "Practice the talk three times without reading, each time a little faster and with fewer stops. Use First, However, Also, because, for example and In conclusion.",
          "Record it once. Look at the camera and speak clearly.",
          "Watch it once. Write down one reason and one example you gave, and one thing you want to improve next time.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the adventure in order with linking words, give reasons and examples, and keep talking without long stops.",
        words: ["creep", "escape", "hunt", "peck", "squawk", "nervous"],
        grammar: ["First, However, Also, In conclusion", "because / so / although for reasons and contrasts", "One animal + verb with -s (it creeps, it escapes)"],
        rubric: [
          { label: "In order", description: "Uses linking words (First, However, Also, In conclusion) to tell the parts in order.", weight: 2 },
          { label: "Reasons and examples", description: "Gives reasons with because or so and at least one example with for example.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: creep, escape, hunt, peck, squawk, nervous.", weight: 1 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
          { label: "Verb forms", description: "Says the -s on the verb for one animal (it creeps) and the past forms in the story.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["First, ___ because ___.", "However, ___.", "In conclusion, ___."], tips: ["Keep your five notes in front of you and say each one as a full sentence."] },
          { level: "Core", who: "Most students", frames: ["Last ___, I ___. First, ___ because ___.", "However, ___, so ___. For example, ___.", "In conclusion, ___."], tips: ["Give one reason and one example."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although ___, ___.", "This shows that ___ because ___."], tips: ["Add a contrast and say what the story shows."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u02-l3": {
      objectives: ["I can say how often I do things with always, usually, sometimes, hardly ever and never, with reasons, fast and in the right place, and write about my week."],
      drop: ["Pass the story ball", "Finger frequency: a game and a chant"],
      trim: {
        "Listen and sing: the song (SB 21 D)": 6,
        "Put the story in order (SB 20 C)": 6,
      },
      add: [
        {
          after: "Practice with your partner (SB 21 E table)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: how often, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time, change the person. Then talk about how often you really do things.",
            chunks: [
              "I usually walk to school with my friends because it is faster than the bus.",
              "Do you always do your homework before dinner? No, I don't, although I try to.",
              "My sister is hardly ever late, but she sometimes forgets her keys.",
              "Last year, I never ate breakfast, so I was often tired by ten o'clock.",
              "My friends and I sometimes play football after school when it isn't raining.",
            ],
            recycle: ["Wings help them fly.", "A cat sometimes sleeps in the garden, but it never sleeps in the rain."],
            rounds: [
              { seconds: 60, say: drillRound1 },
              { seconds: 90, say: drillRound2 },
              { seconds: 90, say: "Real talk: ask your partner How often do you ...? about school, sport, technology and free time. Answer in a full sentence with a how-often word and a reason, then ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question (How often ...? / Do you always ...?), X = make it negative, + = add because, although, so or when, T = say it about last year, P = change the person (he, she, they, we).",
              drillSayWhole,
              drillFixStep,
              "In round 3 the drill becomes real talk: find out how often your partner does things, and remember one surprising answer to tell the class.",
            ],
            prompts: ["I walk to school. (? + usually)", "She is late. (X + hardly ever)", "We play football. (+ because it is fun)", "I eat breakfast. (T: last year, never)", "My brother plays games online. (P: I, sometimes)"],
            feedback: "Prompt, do not tell: for 'I eat always breakfast' repeat it with a rising voice and let the student fix it; for 'She always is late' point to 'is' on the board and ask 'Where does the word go?'; for 'He never play' tap your wrist for the -s; for 'I don't never eat' hold up one finger for the one negative. Say the -s and the n't clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has students ask about their own habits, so the word order is used for meaning. Students of this age can take the whole set at speed: question, negative, a joined sentence, a change of time and of person. Keep the topics safe (school, food, sport, technology) so no student is teased in a 'never' sentence. Listen for the place of the how-often word, 'is' after the adverb and the -s on he / she / it.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the table on the board.", frames: ["How often do you ___?", "I usually / sometimes / never ___.", "I never ___ because ___."] },
              { level: "Core", task: "Change every sentence, with I, you, he / she and they, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a second clause and a follow-up question: 'I hardly ever watch TV, although I sometimes watch a match. How about you?'", frames: ["I hardly ever ___, although ___.", "How about you? / What about you?"] },
            ],
          },
        },
        {
          after: "Grammar drill: how often, ask it, say no",
          slide: {
            kind: "fluency",
            title: "How often? Say it again, say it better",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Tell your partner how often you do things, with reasons, then do it again with a new partner, smoother.",
            chunks: [
              "I always bring a book to school because I read on the bus.",
              "My best friend usually plays basketball at break, although she is not very tall.",
              "I sometimes use my phone to study, but I hardly ever use it in class.",
              "A cat sleeps for most of the day, so it hardly ever gets tired.",
              "I never miss a football match on TV because it is my favorite sport.",
            ],
            recycle: ["Wings help them fly.", "Fish have gills, so they can breathe in water."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells five sentences about how often you or an animal does things, with a reason in each, then Partner B. Then change partners." },
              { seconds: 60, say: "Round 2: The same five sentences, smoother. Partner A, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Faster! Partner A, then Partner B. Say them without looking at your notes." },
            ],
            steps: [
              "Think quietly for 30 seconds before round 1. Choose five sentences with the five words: always, usually, sometimes, hardly ever, never. Add a reason to each.",
              "In each round, Partner A says the sentences, then Partner B. The listener shows fingers: four for always, down to a fist for never.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on.",
              "Change partner when you hear the bell and say the same sentences again.",
            ],
            prompts: ["I always ... because ...", "My friend usually ..., although ...", "A ___ never ..., so ..."],
            feedback: fixOften,
            teacherNote: "A short planning time and a new partner each round is task repetition: the second and third telling are fluent because the content is already there. The one-minute fix lets students say the corrected form straight away. Keep the sentences about animals and about yourself, so no student is teased in a 'never' sentence. Listen for the word position, 'is' after the adverb (She is always late) and the -s on he / she / it.",
            tiers: [
              { level: "Support", task: "Say three sentences with the table on the board.", frames: ["I always ___ because ___.", "A ___ sometimes ___s.", "A ___ never ___s."] },
              { level: "Core", task: "Say five sentences with a reason in each, one for each word, without looking." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'I usually walk to school, although I sometimes take the bus when it rains. What about you?'", frames: ["I usually ___, although ___.", "What about you?"] },
            ],
          },
        },
        {
          after: "Tell the class about your partner (SB 21 F)",
          slide: {
            kind: "writing",
            title: "My week: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the how-often words, the examples and the closing sentence.",
              "Plan: fill the five boxes with a few words each, not sentences. Say one sentence for each box to your partner.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use at least four how-often words and First, Also, However, because, for example and In conclusion.",
              "Check: tick the checklist. Your partner points to every how-often word and says: before the doing word, or after am / is / are.",
              "Teacher: look only at the place of the how-often word, 'is' and the -s on he / she / it. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: My busy week",
              text: "My week is busy, but I enjoy almost every day. First, I always get up at six because my school starts early. I usually walk to class with my friends, and we often talk about sports or music. However, I hardly ever do my homework before dinner, because I am too hungry after school. Also, I never use my phone during lessons, so my teachers trust me. For example, I sometimes leave it at home on Tuesdays, when I play basketball with my cousins until it gets dark. In conclusion, my schedule is full, but it is always interesting.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "How is your week? Busy, quiet, tiring? Say it in one sentence." },
              { label: "Detail 1: First, ... always / usually", prompt: "What do you always or usually do, and why? Use because." },
              { label: "Detail 2: However, ... hardly ever", prompt: "What do you hardly ever do? Say why." },
              { label: "Detail 3: Also, ... sometimes / never", prompt: "Add an example with for example. What do you sometimes do? What do you never do?" },
              { label: "Closing: In conclusion, ...", prompt: "Finish with what you think about your week." },
            ],
            frames: ["My week is ___, but ___.", "First, I always ___ because ___.", "However, I hardly ever ___.", "Also, I sometimes ___. For example, ___.", "In conclusion, my week is ___."],
            checklist: [
              "A topic sentence, three details with linking words and a closing sentence",
              "At least four how-often words, each in the right place (before the doing word, after am / is / are)",
              "The -s on he / she / it doing words (she usually walks)",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "Students write about their own routine, so the content is easy and the grammar from this lesson does the work. The five boxes match the five frames. Keep the topic safe (school day, sport, food, technology) so no student is teased in a 'never' sentence. Mark only two things (the place of the how-often word and the linking words) and let the student find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["My week is ___.", "I always ___ because ___.", "I never ___."] },
              { level: "Core", task: "Write six or seven sentences with at least four how-often words and four linking words." },
              { level: "Stretch", task: "Write eight sentences and add a contrast with although: 'I usually walk to school, although I sometimes ride a bike when I am late.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u02-l4": {
      objectives: ["I can describe animals with it, they and we, in long sentences with reasons, three times, faster each time."],
      drop: ["Chant: strong, gentle, patient", "Act like an animal", "Pronoun swap"],
      trim: {
        "Listen, point, say (SB 22 A)": 5,
        "Listen for the details (SB 22 D)": 6,
      },
      add: [
        {
          after: "Write the pronouns (SB 23 F)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: it, they, we in long sentences",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right, keeping it, they and we correct: ask it, say no, join it with a reason, change the time, change the person. Then talk about animals you really care about.",
            chunks: [
              "Elephants live in family groups, and they protect the smaller ones.",
              "A lion is strong, but it isn't as fast as a cheetah.",
              "My friends and I are learning about wild animals, so we are making a poster.",
              "Do they live in cold places? No, they don't, although some of them can survive in snow.",
              "Last year, we saw a tiger at the zoo, and it was much bigger than I expected.",
            ],
            recycle: ["A tortoise hardly ever hurries because it has a heavy shell.", "A cat sometimes climbs a tree when it feels afraid."],
            rounds: [
              { seconds: 60, say: drillRound1 },
              { seconds: 90, say: drillRound2 },
              { seconds: 90, say: "Real talk: which animals should we protect, and why? Ask your partner questions with Do they ...? and Is it ...?, answer in a full sentence with it, they or we, and give a reason with because or although." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask it, X = make it negative, + = add because, although, so or when, T = say it about the past, P = change it / they / we (one animal, many animals, you and others).",
              "Say the WHOLE new sentence. Check the small words: it or they, is or are, the -s on one animal's verb.",
              drillFixStep,
              "In round 3 give your real opinion about animals people should protect, and remember one reason your partner gave.",
            ],
            prompts: ["Elephants are very intelligent. (?)", "A lion hunts alone. (X)", "Dolphins are friendly. (+ so many people love them)", "We visit the zoo. (T: last year)", "A turtle lives for a long time. (P: turtles)"],
            feedback: "Prompt, do not tell: for 'Birds are small. It has wings' point to the word and ask 'One bird or many?'; for 'The dog is calm. They is happy' hold up one finger and ask 'How many dogs?'; for 'My friends and I plays' tap your wrist for the extra -s; for 'Do it live in the water?' say 'Does ...?' and let the student echo it. Say it, they and we clearly yourself.",
            teacherNote: "The unit's grammar (it, they, we, with is / are and the -s) is checked in every sentence the student changes. Round 3 makes it real: students say what they think about protecting animals, so the pronouns carry meaning. Keep it brisk; a drill that drags loses its point. The change of time is a quick stretch for those who are ready.",
            tiers: [
              { level: "Support", task: "Use only ? and X with it and they, and the frames on the board.", frames: ["Is it ___? Are they ___?", "It ___s. / They ___.", "They don't ___, but ___."] },
              { level: "Core", task: "Change every sentence, with it, they and we, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a second clause and a follow-up question: 'Elephants live in groups, so they can protect their young. Do you think zoos help or hurt them?'", frames: ["___ live in ___, so they ___.", "Do you think ___?"] },
            ],
          },
        },
        {
          after: "Grammar drill: it, they, we in long sentences",
          slide: {
            kind: "writing",
            title: "Join them: because, although, so, which",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word. Use it, they or which for the second part. Say it first, then write it.",
              "Read your sentence to your partner. Does it sound smooth?",
            ],
            items: [
              { q: "Lions are fierce. Lions sleep for most of the day. (although, they)", answer: "Although lions are fierce, they sleep for most of the day." },
              { q: "A turtle is slow. A turtle is calm. A turtle lives a long time. (and, which)", answer: "A turtle is slow and calm, which helps it live a long time." },
              { q: "Birds have wings. Birds can fly south in winter. (so, they)", answer: "Birds have wings, so they can fly south in winter." },
              { q: "Fish live in water. Fish can't walk on land. (because, they)", answer: "Fish can't walk on land because they live in water." },
              { q: "My friends and I love animals. We volunteer at a shelter. (so, we)", answer: "My friends and I love animals, so we volunteer at a shelter." },
            ],
            frames: ["Although ___ are ___, they ___.", "___ ___, so they ___.", "___, which ___."],
            checklist: ["I used it for one animal and they for many", "The joining word is there: because, although, so or which", "A comma where it is needed, a capital letter and a full stop"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules, and it removes the repeated noun that makes writing sound stiff. Model the first one aloud, crossing out the second 'Lions'. Show that 'although' can start the sentence (with a comma) or come in the middle. Watch it / they: 'Birds have wings, so it can fly' is the typical slip.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, then item 3." },
              { level: "Core", task: "Do all five." },
              { level: "Stretch", task: "Do all five, then join three ideas about an animal you know: 'A fox is quiet and clever, so it hunts at night, although it sometimes hunts at dusk.'" },
            ],
          },
        },
        {
          after: "Describe an animal (SB 23 E)",
          slide: {
            kind: "fluency",
            title: "Animal talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same animal talk to three partners. Each talk is shorter and smoother, with reasons and an opinion.",
            chunks: [
              "This is a lion. It is strong and fierce, so many people are afraid of it.",
              "It has sharp teeth, and it can hunt, although it usually hunts with the group.",
              "Lions live in groups, and they sleep for most of the day because they save energy.",
              "It is in the mammal group. I think it is one of the most impressive animals in the world.",
            ],
            recycle: ["My favorite animal is the parrot because it can copy sounds.", "Birds have wings, so they can fly."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the animal talk, then Partner B. The listener counts the reasons on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: The same talk in less time. Partner A, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Fast and smooth! Partner A, then Partner B. The listener says one thing they learned." },
            ],
            steps: [
              "Choose an animal. Plan four sentences with it and they, and at least two reasons or a contrast.",
              "Stand in two lines facing each other. In each round, Line A talks first, then Line B.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard (no names) on the board, often it / they, and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner. Both lines talk again, A then B, with the same three rounds.",
            ],
            feedback:
              "Listen for it / they: 'Birds are small. It has wings.' After round 1, stop for one minute and put two sentences on the board. For grammar, prompt the student to fix it: point to the word and ask 'One bird or many?', start the phrase and pause ('Birds are small. They ...'), or hold up a finger for the missing -s ('A lion hunt...?'). For a sound, say it right and let the student echo it. Say every final -s clearly yourself.",
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity at grade 6-7 level. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently. The correction minute between round 1 and round 2 is what makes it more accurate too.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["This is a ___. It is ___, so ___.", "It has ___ because ___."] },
              { level: "Core", task: "Say four sentences with two reasons, without the board." },
              { level: "Stretch", task: "Add a group of animals, a contrast and an opinion: 'Lions live in groups, although tigers live alone. I think ... because ...'", frames: ["___ live in ___, although ___.", "I think ___ because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Animal riddle talk",
        prompt: "Choose an animal. Describe it without saying its name: what it is like, what it has, what it can do and why it is special. Give reasons and at least one example. Can we guess it?",
        length: "90-120 seconds",
        steps: [
          "Choose an animal and write five notes (words, not sentences): what it is like, what it has, what it can do, where it lives, why it is special. Do not write its name.",
          "Practice the riddle three times without reading, each time a little faster. Use it for one animal and they for many animals.",
          "Record it once. At the end, say: What is it? Then give the answer after a short pause.",
          "Watch it once. Write down one reason and one example you gave, and one thing you want to improve.",
        ],
        maxSeconds: 180,
        kidSummary: "Describe an animal with it and they, give reasons and an example, and keep talking without long stops.",
        words: ["strong", "gentle", "fierce", "calm", "patient", "group"],
        grammar: ["It is ___. It has ___. It can ___.", "They live in ___. They ___.", "because / so / although for reasons and contrasts"],
        rubric: [
          { label: "Describes the animal", description: "Says what it is like, what it has and what it can do.", weight: 2 },
          { label: "Reasons and examples", description: "Gives reasons with because or so and at least one example (for example, ...).", weight: 3 },
          { label: "It and they", description: "Uses it for one animal and they for many animals correctly.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
          { label: "Clear endings", description: "The -s on has, lives and hunts can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["It is ___, so ___.", "It has ___ because ___.", "What is it?"], tips: ["Keep your notes in front of you and say each one as a full sentence."] },
          { level: "Core", who: "Most students", frames: ["It is ___ and ___, so ___. It has ___.", "It can ___. For example, ___. It lives in ___."], tips: ["Give two reasons and one example."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["These animals live in groups, so they ___.", "It is ___, although it is sometimes ___. I think it is special because ___."], tips: ["Add a contrast and give your own opinion."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u02-l5": {
      objectives: ["I can ask and answer questions about an animal quickly and explain my opinion with reasons."],
      drop: ["Animal group chant and sort"],
      trim: {
        "Make animal picture cards (SB 25 B)": 18,
        "Put your cards on the wall: gallery talk (SB 25 C)": 8,
        "Big Question video (Big Question 1 A)": 4,
      },
      add: [
        {
          after: "Guess my animal: card game (SB 25 D)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: question, answer, reason",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time, change the person. Then use the same forms to talk about animals as pets.",
            chunks: [
              "Is it a mammal, or is it a bird?",
              "Does it live in the water, or does it only visit it?",
              "Can it fly? No, it can't, although it has wings.",
              "I think it is a penguin because it swims well and has black and white feathers.",
              "We visited the zoo last month, and the keeper told us that penguins don't live in warm places.",
            ],
            recycle: ["The parrot is usually loud, but it sometimes sleeps all day.", "A fish never climbs a tree because it has no legs."],
            rounds: [
              { seconds: 60, say: drillRound1 },
              { seconds: 90, say: drillRound2 },
              { seconds: 90, say: "Real talk: which animals make good pets, and which do not? Ask your partner Does it ...? Can it ...? Is it ...?, answer with a short answer and a reason with because, so or although. Then tell your partner about an animal you saw last year (T)." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question (Is it ...? Does it ...? Can it ...?), X = make it negative, + = add because, although, so or when, T = say it about the past, P = change the person (it, they, we, I).",
              drillSayWhole,
              drillFixStep,
              "In round 3 the drill is real talk about pets: give your opinion with a reason, and ask a follow-up question.",
            ],
            prompts: ["A penguin can fly. (X)", "A parrot talks. (? Does ...)", "Cats sleep a lot. (+ because they save energy)", "We saw a rabbit at the shelter. (P: she)", "Whales live in the sea. (+ although they breathe air)"],
            feedback: "Prompt, do not tell: for 'Does it has fur?' hold up one finger and say 'Does it h...?'; for 'Yes, it have' repeat it with a rising voice and let the student fix it; for a missing 'does' start the phrase and pause ('Does it ...?'); for 'It can flies' point to the frame 'can + verb'. Say every final -s and 'does' clearly yourself.",
            teacherNote: "Questions with Is, Does and Can are the unit's question forms, and the drill checks them in every sentence the student changes. Round 3 is real: students argue about which animals make good pets, with a reason. Keep it brisk. Mix in a 'How often does it ...?' question now and then so the unit's how-often words stay fast too.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Is it a ___? Does it ___? Can it ___?", "Yes, it is. / No, it isn't.", "It can't ___, but it ___s."] },
              { level: "Core", task: "Change every sentence, with it, they and we, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a fact, a contrast and a follow-up question: 'No, it can't fly, although it has wings. Why do you think that is?'", frames: ["No, it ___, although ___.", "Why do you think ___?"] },
            ],
          },
        },
        {
          after: "Grammar drill: question, answer, reason",
          slide: {
            kind: "fluency",
            title: "Question chain: guess the animal",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next student. Keep the chain going with no stops, and explain why you think so!",
            chunks: [
              "Is it a mammal? Yes, it is, because it has fur and feeds its babies milk.",
              "Does it have fur? No, it doesn't, although it keeps warm in cold water.",
              "Can it fly? Yes, it can, so I think it is a bird or a bat.",
              "It is a bird! I'm sure because it has feathers and a beak.",
            ],
            recycle: ["The parrot is usually loud, but it sometimes sleeps all day.", "A fish never climbs a tree."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds an animal card that only they can see. Give a reason with every answer." },
              { seconds: 75, say: "Swap cards. Go faster, and add a follow-up question to every answer." },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the student on your left a question about their animal: Is it ___? Does it ___? Can it ___?",
              "They answer with a short answer and a reason. When you guess it, say: I think it is a ___ because ___.",
              "Then they turn and ask the next student about their card.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Is it a ___?", "Does it ___?", "Can it ___?"],
            feedback:
              "Listen for 'Does it has...?' (the -s is not needed after does), 'Yes, it have' and a missing 'does'. After round 1, stop for one minute and fix two sentences on the board. For grammar, prompt the student to fix it: start the phrase and pause ('Does it ...?'), point to the frame, or hold up a finger for the short answer ('Yes, it d...?'). For a sound, say it right and let the student echo it. Say every final -s clearly yourself.",
            teacherNote: "The chain makes every student ask AND answer many times in a few minutes, which is what makes 'Does it ...?' automatic. The reason after each answer pushes them from single words to full explanations. Time the whole circle and tell them; students enjoy beating their own time. Mix in a 'How often does it ...?' question now and then so the unit's how-often words stay fast too.",
            tiers: [
              { level: "Support", task: "Answer 'Yes, it is.' or 'No, it isn't.' and pass the question on with the frame on the board.", frames: ["Is it a ___?", "Does it ___?"] },
              { level: "Core", task: "Ask and answer with a reason, without looking at the board." },
              { level: "Stretch", task: "Add a fact and a contrast: 'No, it doesn't. It has feathers, although it can't fly.'", frames: ["No, it doesn't. It has ___, although ___."] },
            ],
          },
        },
        {
          after: "Put your cards on the wall: gallery talk (SB 25 C)",
          slide: {
            kind: "writing",
            title: "Write my pet card",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Find the group, the body part, the how-often word and the two joining words.",
              "Do the sentence work: change each short sentence into one longer sentence with the joining word.",
              "Write four sentences about your own animal with the frames. Swap with your partner: can they tell which animal it is?",
            ],
            text: {
              title: "Pet card",
              text: "This is a rabbit. It is in the mammal group, and it has soft fur and long ears. It usually eats carrots, but it sometimes eats grass because it needs fiber. It is a good pet for a quiet family, although it needs a lot of space to run.",
            },
            items: [
              { q: "A rabbit is quiet. It is a good pet. (so)", answer: "A rabbit is quiet, so it is a good pet." },
              { q: "Cats sleep a lot. They are very active at night. (although)", answer: "Although cats sleep a lot, they are very active at night." },
              { q: "A parrot is loud. A parrot copies sounds. (and, which)", answer: "A parrot is loud and copies sounds, which some people find funny." },
              { q: "Fish are easy to look after. Fish need clean water. (but)", answer: "Fish are easy to look after, but they need clean water." },
            ],
            frames: ["This is a ___. It is in the ___ group, and it has ___.", "It usually ___s, but it sometimes ___s because ___.", "It is a good / bad pet because ___, although ___."],
            checklist: ["It for one animal and they for many", "The how-often word goes before the doing word", "-s on has, eats, sleeps", "A joining word: because, so, although or but"],
            sayIt: "Say your pet card to your partner without looking at it.",
            teacherNote: "A model first, then students write their own with frames. Let them notice the model before they copy it: Where does 'usually' go? What do 'but' and 'although' do? The four sentence-work items rehearse the joining words before they write. Use the student's own animal card from the main task so the writing has something real to say.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2, then copy the model and change the animal and one body part." },
              { level: "Core", task: "Do all four items and write four sentences with the frames." },
              { level: "Stretch", task: "Write five sentences and use 'because' and 'although' once each: 'It is calm because it sleeps a lot, although it is sometimes noisy at night.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u02-l6": {
      objectives: ["I can say how often animals do things, with reasons, fast and in the right place, and write a paragraph about an animal: Grammar Champions."],
      drop: ["Zookeeper's line: run and say", "Body ladder: freeze and show"],
      trim: {
        "Remember it!": 3,
        "Grammar mystery: a week at Sunny Zoo": 7,
      },
      add: [
        {
          after: "Grammar: How often? always, usually, sometimes, hardly ever, never",
          slide: {
            kind: "fluency",
            title: "Grammar drill: how often does it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time, change the person. Then talk about animals and about yourself.",
            chunks: [
              "A tortoise hardly ever hurries because its shell is very heavy.",
              "How often does a cat sleep? A cat usually sleeps for most of the day, although it is more active at night.",
              "Penguins never fly, so they use their wings to swim.",
              "Last year, my family sometimes visited the zoo, but now we hardly ever go.",
              "My friends and I are always interested in animals, so we often watch nature programs.",
            ],
            recycle: ["Birds have wings, so they can fly.", "Does it hunt? Yes, it does, but only at night."],
            rounds: [
              { seconds: 60, say: drillRound1 },
              { seconds: 90, say: drillRound2 },
              { seconds: 90, say: "Real talk: ask your partner How often do you ...? about animals, school and free time. Answer with a how-often word and a reason, then compare: 'I usually ..., but you ...'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question (How often does ...?), X = make it negative, + = add because, although, so or when, T = say it about last year, P = change the person (it, they, we, I).",
              drillSayWhole,
              drillFixStep,
              "In round 3 compare yourself with your partner and remember one difference to tell the class.",
            ],
            prompts: ["A cat sleeps in the sun. (? How often)", "An owl hunts in the day. (X + hardly ever)", "A penguin swims. (+ because it can't fly)", "A tortoise walks slowly. (T: last year)", "I watch nature programs. (P: my cousin)"],
            feedback: fixOften,
            teacherNote: "This is the unit's grammar at full speed: the place of the how-often word, 'is' after it, the -s on he / she / it and 'How often does ...?'. Round 3 is real: students compare how often they do things, so the word order carries meaning. Keep it brisk. The change of time is a quick stretch for those who are ready.",
            tiers: [
              { level: "Support", task: "Use only ? and X with it and I, with the ladder on the board.", frames: ["How often does it ___?", "It always / usually / sometimes / hardly ever / never ___s.", "It never ___s because ___."] },
              { level: "Core", task: "Change every sentence, with it, they, we and I, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a second clause and a follow-up question: 'A tortoise hardly ever hurries, although it can move quickly when it is afraid. How about other reptiles?'", frames: ["___ hardly ever ___, although ___.", "How about ___?"] },
            ],
          },
        },
        {
          after: "Grammar drill: how often does it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Champion sprint: how often?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's, with a reason or an opinion.",
            chunks: [
              "A cat always sleeps in the sun because it loves warm places.",
              "A penguin never flies, but it is an excellent swimmer.",
              "A tortoise hardly ever runs, although it can move quickly when it is afraid.",
              "The giraffe is usually calm, so it is easy to watch at the zoo.",
              "How often does it sleep? I think it sleeps a lot because it saves energy.",
            ],
            recycle: ["Birds have wings, so they can fly.", "Does it hunt? Yes, it does, but only at night."],
            rounds: [
              { seconds: 70, say: "Together: the teacher flashes an animal card with a how-often word; the class says the sentence with a reason." },
              { seconds: 70, say: "Half the class asks 'How often does it sleep?', the other half answers with a reason. Then swap." },
              { seconds: 60, say: "Champion round: one student at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence with a reason when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute and fix the two mistakes you heard most on the board; then go on.",
            ],
            feedback: fixOften,
            teacherNote: "A quick, high-energy recall of the unit with the five words in their places and a reason in each sentence, plus Unit 1's they / it phrases (spaced retrieval keeps them fast). Listen for the adverb before the verb and after is, and the -s. The question 'How often does it ...?' is new for some students: prompt with a finger for 'does'.",
            tiers: [
              { level: "Support", task: "Say the sentence with the ladder on the board.", frames: ["A ___ always / never ___s because ___.", "The ___ is usually ___."] },
              { level: "Core", task: "Say the sentence with a reason, without looking." },
              { level: "Stretch", task: "Add a contrast and an opinion: 'A tortoise hardly ever runs, although it can move quickly. I think it is clever because ...'" },
            ],
          },
        },
        {
          after: "Write it: how often?",
          slide: {
            kind: "writing",
            title: "My animal paragraph: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the how-often words, the examples and the closing sentence.",
              "Plan: choose an animal. Fill the five boxes with a few words each, not sentences. Say one sentence for each box to your partner.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use it for one animal and they for more than one. Use First, Also, However, because, for example and In conclusion.",
              "Check: tick the checklist. Your partner points to every how-often word and every -s on a doing word.",
              "Teacher: look only at the place of the how-often word and the -s on the doing word. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: The giant panda",
              text: "The giant panda is one of the most interesting animals in the world. First, it usually eats bamboo, and it spends many hours a day eating. However, pandas hardly ever hurry, so they save energy. Also, pandas never live in large groups because each panda needs a lot of space. For example, a panda sometimes sleeps in a tree after a big meal, but it never shares the tree. In conclusion, pandas are calm animals, and we should protect the forests where they live.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which animal? Say its name and why it is interesting, in one sentence." },
              { label: "Detail 1: First, ... always / usually", prompt: "What does it always or usually do? Say why, with because or so." },
              { label: "Detail 2: However, ... hardly ever", prompt: "What does it hardly ever do, and why?" },
              { label: "Detail 3: Also, ... sometimes / never", prompt: "Add an example with for example. What does it sometimes do? What does it never do?" },
              { label: "Closing: In conclusion, ...", prompt: "Finish with your opinion about the animal." },
            ],
            frames: ["The ___ is one of the most ___ animals in the world.", "First, it usually ___s, and it ___s.", "However, ___ hardly ever ___, so they ___.", "Also, ___ never ___ because ___. For example, ___.", "In conclusion, ___ are ___, and we should ___."],
            checklist: [
              "A topic sentence, three details with linking words and a closing sentence",
              "How-often words in the right place: before the doing word, after is / are",
              "One animal: the doing word has -s (it usually eats); many animals: they and no -s",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your animal paragraph to your partner. Then tell it again without looking.",
            teacherNote: "The paragraph is the script for the recorded talk at home ('My animal: how often?'), so tell students to keep it. It uses the whole grammar set in a short text with it, they and the verb -s, plus the linking words. Mark only two things (the place of the how-often word and the -s) and let the student find the mistake from your dot. The unit's common mistakes are now found and fixed in the students' own writing.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["The ___ is a ___ animal.", "It usually ___s because ___.", "It never ___s."] },
              { level: "Core", task: "Write six or seven sentences about your animal with at least four how-often words and four linking words." },
              { level: "Stretch", task: "Write eight sentences and compare with another animal: 'A ___ is different from a ___ because ..., although ...'", frames: ["A ___ is different from a ___ because ___, although ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My animal: how often?",
        prompt: "Choose an animal, your pet or a favorite one. Tell us how often it does things and why: what it always, usually, sometimes, hardly ever and never does. Give reasons and at least one example.",
        length: "90-120 seconds",
        steps: [
          "Choose an animal and write five notes (words, not sentences) from your paragraph: what it is, what it always or usually does, what it hardly ever does, what it never does, your opinion.",
          "Practice the talk three times without reading, each time a little faster and with fewer stops.",
          "Record it once. Look at the camera and speak clearly.",
          "Watch it once. Write down one reason and one example you gave, and one thing you want to improve next time.",
        ],
        maxSeconds: 180,
        kidSummary: "Say how often an animal does things with always, usually, sometimes, hardly ever and never, give reasons and an example, and keep talking without long stops.",
        words: ["always", "usually", "sometimes", "hardly ever", "never", "creep", "hunt"],
        grammar: ["always / usually / sometimes / hardly ever / never before a doing word", "is / are + always, usually ...", "he / she / it + verb with -s", "because / so / although for reasons and contrasts"],
        rubric: [
          { label: "How-often words", description: "Uses at least four of the five words and puts them in the right place.", weight: 3 },
          { label: "Reasons and examples", description: "Gives reasons with because or so and at least one example (for example, ...).", weight: 3 },
          { label: "Verb -s", description: "Says the -s for one animal: it sleeps, it never flies.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
          { label: "Animal words", description: "Uses words from the unit: creep, hunt, peck, strong, calm.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["My ___ always ___s because ___.", "It never ___s."], tips: ["Keep your notes in front of you and say each one as a full sentence."] },
          { level: "Core", who: "Most students", frames: ["My ___ always ___s and usually ___s because ___.", "It sometimes ___s, but it never ___s. For example, ___."], tips: ["Use at least four of the five words and give one example."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["It is usually ___, although it is sometimes ___.", "A ___ is different from a ___ because ..."], tips: ["Add a contrast and compare your animal with another one."] },
        ],
      },
    },
  },
};
