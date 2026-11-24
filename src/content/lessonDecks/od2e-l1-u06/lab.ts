import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 6 "Animal
// Reserves" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are in grades
// 2-4 (ages 7-10). Every lesson gets a grammar drill (one structure changed fast: asked,
// answered, said in the negative, joined with and / but / because, then used in real talk),
// a harder fluency routine (the unit's phrases said again and again as longer, joined
// sentences, a little faster each round, with Unit 5's phrases mixed back in) and one
// writing routine (say it, write it, read it back). Three lessons end with a recorded talk
// for home, built on the routine the class just did. Time comes from games, chants and
// quiet cool-downs, never from the book pages or the grammar. All text is original.

const GROWN_UP = "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

// Reserve language (lessons 1, 2, 4, 5): "I take care of the ...", "She puts out food", -s on plurals.
const fixReserve =
  "Listen and do not stop the talk. Note two or three grammar mistakes you hear (no names), such as 'I take care the orangutan' (missing 'of'), 'Dian teach Anak' (missing -s), 'Does she takes' (-s after does) or a joined sentence with no joining word. Between rounds 1 and 2 put them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it: start the phrase and pause ('I take care ...?'), point to the frame, or hold up a finger for the missing -s. Do not say the whole sentence for them. For a sound, just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear.";

// This / that, What / Who (lessons 3 and 6).
const fixThis =
  "Listen and do not stop the talk. Note two or three mistakes you hear (no names), such as 'What this?' (missing 's), 'Is a pond' instead of 'It's a pond', 'It's a pond and big' (the second part needs 'it's') or 'What's this?' for something far away. Between rounds 1 and 2 put them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. Prompt the child to fix it: point to the frame, start 'What's ...?' and pause, repeat the error with a rising voice ('What this?'), or hold your hand near for this and far for that. Do not say the whole question for them. For a sound, say it right and let them echo it. Say 'What's' and 'It's' with the ending clear yourself.";

// Animal clues and booklet talk (lessons 4 and 5): lives / sleeps / eats, Does it ...?, joined sentences.
const fixClues =
  "Listen and do not stop the talk. Note two or three grammar mistakes you hear (no names), such as 'It live in a tree' (missing -s), 'Does it lives?' (-s after does), 'It don't sleep' (should be doesn't) or clues said one after another with no joining word. Between rounds 1 and 2 put them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. Prompt the child to fix it: hold up one finger for 'it' and tap your wrist for the -s, or start the clue and pause ('It sleeps in the ...?'). Do not say the whole sentence for them. For a sound, just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear.";

export const odL1U6Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u06-l1": {
      objectives: ["I can say 'I take care of the orangutan.' and other reserve sentences fast, and join them with and, but or because."],
      drop: ["What's missing? Freeze dance!", "Orangutan says", "Sleepy reserve"],
      add: [
        {
          after: "Read and write the words (SB 56 B)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: take care of, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the keeper sentence fast and right: ask it with Do, answer it, say no with don't, and join it with but or because. Then talk about real animals.",
            chunks: [
              "I take care of the orangutan.",
              "Do you take care of the orangutan?",
              "Yes, I do. / No, I don't.",
              "I don't take care of the snake, but I put out food for the birds.",
              "She takes care of the baby because she loves it.",
              "Does he teach the baby to climb? No, he doesn't.",
            ],
            recycle: ["A bird lives in a nest.", "The frog lives in a pond."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add but, and or because). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 90, say: "Real talk: ask your partner about animals at home or at school. Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = add 'but ___', 'and ___' or 'because ___'.",
              "Say the WHOLE new sentence, with -s on takes and puts when you talk about he or she.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Do you take care the ...?' or 'Yes, I take'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask 'Do you take care of an animal?' and 'What do you put out for it?', and remember one answer to tell the class.",
            ],
            prompts: [
              "I take care of the orangutan. (?)",
              "You put out food for the baby. (X)",
              "We take care of the birds. (+ because)",
              "She teaches the baby to climb. (?)",
              "They miss the keeper. (X +)",
            ],
            feedback: "Prompt, do not tell: for 'Do you take care the ...?' point to the word 'of' on the board and pause; for 'Yes, I take.' repeat it with a rising voice and let the child fix it; for a missing -s in 'She takes' tap your wrist; for 'I like it because' with nothing after it, ask 'Because ...?'. Say the -s and the n't clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children talk about animals they really know, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, joined sentences and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you take care of the ___?", "No, I don't, but I ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join two parts with but, and or because." },
              { level: "Stretch", task: "Use he and she too, with the -s: 'She puts out food for the baby. Does she teach the baby to climb? No, she doesn't, but she takes care of it because it is small.'" },
            ],
          },
        },
        {
          after: "Grammar drill: take care of, ask it, say no",
          slide: {
            kind: "writing",
            title: "My keeper day: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Point to the words that join ideas: and, because, but, then.",
              "Plan: write two or three key words for each box (or draw). Say one sentence for each box to your partner.",
              "Write: five sentences. Use the frames and at least two joining words.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at 'of' in 'take care of', the joining words and the full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: I am a keeper",
              text: "I am a keeper at the reserve, and I love my work. In the morning, I take care of the orangutan. Then I put out food for the baby because she is hungry. I don't teach the baby to swim, but I teach her to climb. At night, I miss my friends!",
            },
            organiser: [
              { label: "Me", prompt: "Key words: keeper, reserve. Where are you, and how do you feel about your work?" },
              { label: "My morning", prompt: "Key words: take care of, put out food. Which animal? Why?" },
              { label: "What I teach", prompt: "Key words: teach, climb. What do you teach, and what don't you teach?" },
              { label: "My night", prompt: "Key words: miss, friends. Who do you miss?" },
            ],
            frames: ["I am a keeper at the reserve, and ___.", "In the morning, I take care of the ___.", "Then I put out food for the ___ because ___.", "I don't ___, but I teach the ___ to ___.", "At night, I miss ___!"],
            checklist: ["Five sentences with a capital letter at the start and a full stop or ! at the end", "At least two joining words: and, because, but, then", "'take care OF': the word 'of' is there", "'the' before the animal: the orangutan, the baby"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, like a real keeper.",
            teacherNote: "A paragraph of five sentences for grades 2-4, planned with key words (a drawing is optional). Sentence 1 says who I am, sentences 2 to 4 give the details with a joining word each, sentence 5 ends it. The keeper sentences are the ones the class drills and sprints in this lesson. Mark only 'of', the joining words and the full stops, and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the five frames and fill in the missing words, with one joining word in each of two sentences.", frames: ["I take care of the ___.", "I put out food for the ___ because ___."] },
              { level: "Core", task: "Write five sentences: who I am, what I do, a because sentence, a but sentence and how I feel." },
              { level: "Stretch", task: "Add a sixth sentence that asks a question: 'Do you take care of an animal?'" },
            ],
          },
        },
        {
          after: "Keepers at the reserve",
          slide: {
            kind: "fluency",
            title: "Keeper sprint: what do I do?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 8,
            goal: "Say the whole keeper sentence, longer and joined, fast and smooth, with no stops.",
            chunks: [
              "I take care of the orangutan, and I put out food for her.",
              "I teach the baby to climb, but I don't teach her to swim.",
              "Do you miss your friend? Yes, I do, because she is far away.",
              "I put out food for the birds because they are hungry.",
            ],
            recycle: ["A bird lives in a nest.", "The frog lives in a pond."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows a picture card and mimes it; the class says the whole sentence and adds 'and', 'but' or 'because' with a reason." },
              { seconds: 75, say: "Pairs: one child mimes, the other says the sentence and the joined part. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many joined sentences can you say?" },
            ],
            steps: [
              "Look at the card. Do the action with your body and say a WHOLE sentence: 'I take care of the orangutan.' Then join a second part.",
              "Listen for the clap: it means change.",
              "In round 3, count your joined sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["(card: feed the baby)", "(card: climb)", "(card: take care)", "(card: miss)", "(card: nest and pond)"],
            feedback: fixReserve,
            teacherNote: "Whole sentences with the action, never a single word: 'take care of' should come out as one chunk, and the second part follows with and, but or because. Mix in Unit 5's 'A ___ lives in a ___' cards every few turns so last unit's phrases stay fast. Listen for 'take care the' without 'of', the plural -s and a joined part with no joining word.",
            tiers: [
              { level: "Support", task: "Say the sentence alone, with the frames on the board.", frames: ["I take care of the ___, and ___.", "I teach the ___ to ___, but ___."] },
              { level: "Core", task: "Say two sentences joined with and, but or because, without looking at the board.", frames: ["I ___, and I ___.", "I ___, because ___."] },
              { level: "Stretch", task: "Say the joined sentence and then ask your partner a question: 'I miss my friend because she is far away. Do you miss your friends?'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u06-l2": {
      objectives: ["I can tell the story of Anak in order, faster each time, and join the parts with and, because or but."],
      drop: ["Anak grows up", "Goodnight, Anak"],
      add: [
        {
          after: "Story strips",
          slide: {
            kind: "fluency",
            title: "Anak: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster, and the parts are joined.",
            chunks: [
              "First, Anak is a baby, and Dian takes care of her.",
              "Dian puts out food for her because she is small.",
              "Then Anak grows up, and Dian teaches her to climb.",
              "At the end, Anak has a baby, and Dian is very happy!",
              "Do you like the story? Which part is your favorite?",
            ],
            recycle: ["Where's the eagle? It's in the sky.", "A bird lives in a nest."],
            rounds: [
              { seconds: 75, say: "Tell your partner the story. Use your picture strips and join the parts with and, because or then." },
              { seconds: 60, say: "New partner. Tell it again in less time." },
              { seconds: 45, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for the start, two for the middle, three for the end.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, find a new partner.",
              "The listener asks one question at the end ('Which part is your favorite?') and gives a thumbs up.",
            ],
            prompts: ["(strip: baby Anak)", "(strip: Dian puts out food)", "(strip: Anak climbs)", "(strip: Anak's baby)"],
            feedback: fixReserve,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The fix between rounds is what makes the second telling more correct as well as faster. Listen for the -s on 'takes', 'puts' and 'teaches' (Dian is 'she'), which Vietnamese learners often drop, and for parts that are said one after another with no joining word. Say those endings clearly yourself.",
            tiers: [
              { level: "Support", task: "Tell all four parts without the frames, with at least one joining word.", frames: ["First, ___, and ___.", "At the end, ___."] },
              { level: "Core", task: "Add what Dian says and a reason: 'Dian says, I take care of you, because you are small.'", frames: ["Dian says, 'I ___ you, because ___.'"] },
              { level: "Stretch", task: "Tell the story, then give your opinion with because and ask your partner a question: 'My favorite part is the end because Anak has a baby. What is your favorite part?'", frames: ["My favorite part is ___ because ___. What is your favorite part?"] },
            ],
          },
        },
        {
          after: "Anak: tell it again, faster",
          slide: {
            kind: "fluency",
            title: "Grammar drill: Dian takes care of Anak",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the story sentence fast and right: ask it with Does, answer it, say no with doesn't, and join it with because or but. Then talk about your own family.",
            chunks: [
              "Dian takes care of Anak.",
              "Does Dian take care of Anak? Yes, she does. / No, she doesn't.",
              "Dian doesn't teach Anak to swim, but she teaches her to climb.",
              "Dian puts out food for Anak because she is small.",
              "Do you take care of a baby? Yes, I do. / No, I don't.",
              "Anak misses Dian, and Dian misses Anak.",
            ],
            recycle: ["I take care of the orangutan.", "The frog lives in a pond."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence about Dian and Anak and shows a sign (? = ask it, X = say no, + = add because, but or and). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: Dian, Anak, I, you, we." },
              { seconds: 90, say: "Real talk: ask your partner about their family: who takes care of you, who teaches you? Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do or Does, X = say it with don't or doesn't, + = add 'because ___', 'but ___' or 'and ___'.",
              "Say the WHOLE new sentence. After Does or doesn't the verb has no -s: 'Does Dian teach ...?', 'She doesn't teach ...'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Does Dian takes care of Anak?' or 'Dian teach'), fix them together, then go on.",
              "In round 3 the drill becomes real: 'Who takes care of you?' 'My mom does, and my grandma does too.' Remember one answer to tell the class.",
            ],
            prompts: [
              "Dian takes care of Anak. (?)",
              "Dian teaches Anak to climb. (X)",
              "Anak misses Dian. (+ because)",
              "My mom takes care of my brother. (?)",
              "Dian puts out food for Anak. (X +)",
            ],
            feedback: "Prompt, do not tell: for 'Does Dian takes care?' tap your wrist for the -s and say 'Does ... take?' with a pause; for 'Dian teach Anak' hold up one finger for 'she' and the -s; for 'Yes, she teaches' repeat it with a rising voice so the child finds 'Yes, she does'. Say every -s and 'doesn't' clearly yourself.",
            teacherNote: "The grammar of the story is the -s on he and she and the change after does and doesn't. A drill helps when the last step is real: in round 3 children use takes and does for their own family. Grades 2-4 can take the full set. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with Dian and Anak, with the frames on the board.", frames: ["Does Dian ___?", "No, she doesn't."] },
              { level: "Core", task: "Change every sentence, with Dian, Anak, I and you, and join two parts with because or but." },
              { level: "Stretch", task: "Use they and we too, and join with because: 'Do Dian and Anak live in a reserve? Yes, they do, because it is their home.'" },
            ],
          },
        },
        {
          after: "Find the yellow words (SB 58-59)",
          slide: {
            kind: "writing",
            title: "My Anak story: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to First, Then, At the end and the joining words and, because.",
              "Plan: write two or three key words for each box (or draw). Say one sentence for each box to your partner.",
              "Write: five sentences. Start with First, Then and At the end, and use and or because at least twice.",
              "Check: tick the checklist. Your partner points to every -s in takes, puts and teaches.",
              "Teacher: look only at the -s on takes, puts and teaches, the joining words and the capital letters. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Anak and Dian",
              text: "First, Anak is a baby, and Dian takes care of her. Dian puts out food for her because she is small. Then Anak grows up, and Dian teaches her to climb. At the end, Anak is big, and she has a baby of her own. Dian is very happy!",
            },
            organiser: [
              { label: "First", prompt: "Key words: baby, take care of. Who is with Anak?" },
              { label: "Why", prompt: "Key words: food, small. Why does Dian put out food?" },
              { label: "Then", prompt: "Key words: grow up, teach, climb. What does Dian teach?" },
              { label: "At the end", prompt: "Key words: big, baby. How are they?" },
            ],
            frames: ["First, Anak is a baby, and ___.", "Dian puts out food for her because ___.", "Then Anak grows up, and Dian teaches her to ___.", "At the end, Anak is ___, but ___.", "Dian is ___!"],
            checklist: ["First, Then, At the end are in the right order", "At least two joining words: and, because, but", "Dian takes, Dian puts, Dian teaches: the -s is there", "A capital letter at the start and a full stop at the end of every sentence"],
            sayIt: "Read your story to your partner. Then tell it again without looking, like a storyteller.",
            teacherNote: "A paragraph of five sentences that retells the story in order and joins the ideas. The children have heard the story several times and drilled the sentences in this lesson. Mark only the -s on takes, puts and teaches, the joining words and capital letters. This paragraph is the script for the recorded talk 'My Anak story' at home: tell the children to take their key words home.",
            tiers: [
              { level: "Support", task: "Copy the five frames and fill in one word in each.", frames: ["First, Anak is a baby, and ___.", "At the end, Anak is ___."] },
              { level: "Core", task: "Write five sentences: First, a because sentence, Then and At the end, with joining words." },
              { level: "Stretch", task: "Add a sixth sentence that gives your opinion: 'I like the story because ___.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My Anak story",
        prompt: "Tell the story of Anak at home in three parts: the start, the middle and the end. Join your ideas with and, because or but. Show a toy or a picture of an animal if you have one!",
        length: "60-90 seconds",
        steps: [
          "Look at your key words or draw three pictures.",
          "Say the story three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera. Use and, because or but at least twice.",
          GROWN_UP,
        ],
        maxSeconds: 150,
        kidSummary: "Tell the start, the middle and the end of the story, join your ideas with and, because or but, and keep talking without long stops.",
        words: ["orangutan", "reserve", "take care of", "teach", "miss", "take a nap"],
        grammar: ["First, ___. Then, ___. At the end, ___.", "Dian takes care of / teaches ___", "___ because ___. ___, but ___."],
        rubric: [
          { label: "Three parts", description: "Tells the start, the middle and the end of the story in order.", weight: 3 },
          { label: "Story words", description: "Uses words from the unit: orangutan, reserve, take care of, teach, miss.", weight: 2 },
          { label: "Joins ideas", description: "Uses and, because or but to join two ideas in at least two sentences, or asks the viewer a question.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear -s", description: "Says 'takes', 'puts' and 'teaches' with the -s when the story is about Dian or Anak.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, Anak is a baby, and Dian takes care of her.", "Then Anak grows up.", "At the end, ___."], tips: ["Point to your key words as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, ___, and Dian ___ Anak.", "Dian puts out food for her because ___.", "Then Anak ___, and Dian teaches her to ___.", "At the end, ___."], tips: ["Say who and what in every part, and use because once."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Dian says, 'I take care of you, because you are small.'", "My favorite part is ___ because ___. What is your favorite part?"], tips: ["Add what Dian says and your favorite part, and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u06-l3": {
      objectives: ["I can ask 'What's this?' and 'Who's that?' and answer fast, with a joined sentence, round the circle."],
      trim: { "Baby, four, eight, twelve": 4 },
      drop: ["Feel it! Guess it!", "Pass the beanbag"],
      add: [
        {
          after: "Ask and answer with a partner (SB 61 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it with What or Who, answer it, say no with isn't, and join it with and, but or because. Then ask about real things.",
            chunks: [
              "What's this? It's a ball.",
              "What's that? It's a tree.",
              "Who's that? It's a baby rabbit.",
              "Is this a ball? Yes, it is. / No, it isn't.",
              "It isn't a ball. It's a stone.",
              "It's a pond, and it's big, but it isn't deep.",
            ],
            recycle: ["I take care of the orangutan.", "It lives in the rainforest."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with and, but or because, <-> = this becomes that). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Hold your hand near for this and far for that." },
              { seconds: 90, say: "Real talk: point to real things and pictures in the room and ask your partner: 'What's that? Is that a ___?' Ask 'Who's that?' about a photo. Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question, X = say it with isn't, + = join with 'and ___', 'but ___' or 'because ___', <-> = change this to that, or that to this.",
              "Say the WHOLE new sentence. Keep the 's: What's, Who's, It's.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'What this?' or 'Is a pond'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what is really in the room, and remember one answer to tell the class.",
            ],
            prompts: [
              "It's a ball. (X)",
              "It's a tree. (?)",
              "It's a pond. (+ big)",
              "Who's this? It's a baby rabbit. (<-> that)",
              "It's a frog. (X +)",
            ],
            feedback: "Prompt, do not tell: for 'What this?' point to the 's on the board and say 'What ...?' with a pause; for 'Is a pond.' repeat it with a rising voice and let the child add 'It's'; for 'It's a pond and big' hold up two fingers for the two parts and let the child add 'it's'; for this and that, use your hand near and far. Say the 's and the n't clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about things they can really see, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, joined sentences and plurals. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with this and that, with the frames on the board.", frames: ["What's this? It's a ___.", "It isn't a ___. It's a ___."] },
              { level: "Core", task: "Change every sentence with every sign, with this, that, what and who, and join two parts with and, but or because." },
              { level: "Stretch", task: "Use plurals too: 'What are these? They're frogs. Are those frogs? No, they aren't. They're toads.'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Question chain: What's this? Who's that?",
            routine: "question chain",
            mode: "whole",
            minutes: 8,
            goal: "Ask, answer with a joined sentence, then ask the next friend a follow-up question. Keep the chain going with no stops!",
            chunks: [
              "What's this? It's a ball, and it's red. Is yours red too?",
              "What's that? It's a tree, and it's very tall.",
              "Who's this? It's a baby rabbit, and it's small.",
              "Who's that? Is it {s1}? Yes, it is, because the hat is red.",
            ],
            recycle: ["Where's the eagle? It's in the sky.", "A frog lives in a pond."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds a picture card. Close cards: this. Cards on the wall: that. Answer, then ask a follow-up." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card out so everyone can see it.",
              "Ask the friend on your left: 'What's this?' (close) or 'What's that?' (far) or 'Who's this?'",
              "They answer: 'It's a ___, and it's ___.' Then they turn and ask the next friend with a follow-up question.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["What's this?", "What's that?", "Who's this?", "Who's that?"],
            feedback: fixThis,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'What's this?' automatic; the joined answer and the follow-up make it longer than a one-word reply. Use your hand for this (close) and that (far) so the meaning is clear. Listen for 'What this?', for 'Is a ball' (a missing 'It') and for 'It's a ball and red' (missing 'it's'). Time the whole circle and tell them; children love beating their own time.",
            tiers: [
              { level: "Support", task: "Ask and answer without looking at the board, with a joined answer.", frames: ["What's this? It's a ___, and it's ___.", "Who's that? It's ___."] },
              { level: "Core", task: "Ask three questions in a row: 'What's this? What's that? Who's that?', and answer with a joined sentence." },
              { level: "Stretch", task: "Answer with and or but, then ask a follow-up question: 'It's a frog, but it isn't green. What's yours?'" },
            ],
          },
        },
        {
          after: "Look around the classroom (SB 61 F)",
          slide: {
            kind: "writing",
            title: "Fix the reserve signs",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "The reserve signs have mistakes! Read each one with your partner.",
              "Find the mistakes: a missing 's, a missing 'It', a capital letter, a question mark, or a joining word with no 'it's' after it.",
              "Write the sign the right way. Read it aloud together.",
            ],
            items: [
              { q: "What this? It's a pond.", answer: "What's this? It's a pond." },
              { q: "What's that? Is a pond, and it big.", answer: "What's that? It's a pond, and it's big." },
              { q: "who's that? It's a baby orangutan.", answer: "Who's that? It's a baby orangutan." },
              { q: "Who's this. It's Dian but she not a baby.", answer: "Who's this? It's Dian, but she isn't a baby." },
              { q: "What's that It's a frog and it green.", answer: "What's that? It's a frog, and it's green." },
            ],
            checklist: ["What's and Who's have 's", "The answer starts with It's, and the second part of a joined sentence has its own it's or isn't", "A capital letter at the start; a question ends with a question mark (?)"],
            sayIt: "Read your fixed signs to your partner, one asks and one answers.",
            teacherNote: "Two types of error today: the missing 's (What this?) and the missing 'It' or 'it's' in the answer; items 2, 4 and 5 also have a joined sentence (and, but) with a mistake in the second part. Fix item 1 together before the pairs start. The question mark is worth a quick check, but keep the main focus on those two.",
            tiers: [
              { level: "Support", task: "Fix signs 1, 2 and 3 with the frames on the board." },
              { level: "Core", task: "Fix all five signs." },
              { level: "Stretch", task: "Write two more signs with mistakes, one with 'and' and one with 'but', for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u06-l4": {
      objectives: ["I can give three or four clues about an animal, saying them again faster each time, and join them with and, but or because."],
      trim: { "Sun, sun, in the sky": 3 },
      drop: ["Run to the time of day", "Sleepy sun"],
      add: [
        {
          after: "Clue game: What is it? (SB 63 E)",
          slide: {
            kind: "fluency",
            title: "Clue talk: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same joined clues to three friends. Each time is faster and smoother.",
            chunks: [
              "It's a bird, and it lives in the rainforest.",
              "It sleeps in the day because it hunts at night.",
              "It eats fruit, but it doesn't eat meat.",
              "What is it? Can you guess?",
            ],
            recycle: ["The frog lives in a pond.", "A bird lives in a nest."],
            rounds: [
              { seconds: 75, say: "Choose an animal card. Give your partner three or four clues and join two of them. They guess." },
              { seconds: 60, say: "New partner. The same clues, in less time." },
              { seconds: 45, say: "New partner. Fast and smooth! The listener says the animal." },
            ],
            steps: [
              "Pick an animal card. Do not show it. Say: 'It's a ___, and it lives in ___. It sleeps in the ___ because ___.'",
              "Your partner guesses: 'Is it a ___?' and you answer 'Yes, it is.' or 'No, it isn't.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, find a new partner. Say the same clues again.",
            ],
            prompts: ["(card: owl)", "(card: frog)", "(card: orangutan)", "(card: bat)"],
            feedback: fixClues,
            teacherNote: "Task repetition: the same clues, a new listener, less time. Do not give a new animal between rounds. Listen for the missing -s in 'lives' and 'sleeps' (it is one animal, so the action word gets -s) and for clues said one after another with no joining word. Prompt with a finger for the -s; do not say the sentence for the child.",
            tiers: [
              { level: "Support", task: "Say three clues without the board.", frames: ["It's a ___.", "It lives in ___.", "It sleeps in the ___."] },
              { level: "Core", task: "Add a fourth clue and join two clues: 'It eats ___, and it's ___.'", frames: ["It eats ___.", "It's ___, and it ___."] },
              { level: "Stretch", task: "Join the clues with and, but or because, and answer your partner's guess: 'It isn't a bird, but it flies. It sleeps in the day because it hunts at night.'" },
            ],
          },
        },
        {
          after: "Clue talk: say it again",
          slide: {
            kind: "fluency",
            title: "Grammar drill: lives, sleeps, doesn't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the clue fast and right: ask it with Does, answer it, say no with doesn't, and join it with and, but or because. Then ask about your own day.",
            chunks: [
              "It lives in the rainforest.",
              "Does it live in the rainforest? Yes, it does. / No, it doesn't.",
              "It doesn't sleep at night, but it sleeps in the day.",
              "It's small and brown, and it eats fruit.",
              "Bats sleep in the day because they fly at night.",
              "Do bats sleep in the day? Yes, they do.",
            ],
            recycle: ["What's this? It's a ___.", "I take care of the orangutan."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a clue and shows a sign (? = ask it, X = say no, + = join with and, but or because, ~ = it becomes they). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a clue and shows a sign card, B changes it. Swap at the clap. Change the animal too: an owl, a frog, a bat." },
              { seconds: 90, say: "Real talk: ask your partner about their own day: 'Do you sleep in the day?' 'What do you eat in the morning?' Answer with the full short answer and one more sentence with because." },
            ],
            steps: [
              "Listen to the clue. Look at the sign. Change it: ? = make a question with Do or Does, X = say it with don't or doesn't, + = join with 'and ___', 'but ___' or 'because ___', ~ = change it to they (an owl to owls).",
              "Say the WHOLE new sentence. After Does or doesn't the verb has no -s: 'Does it live ...?', 'It doesn't sleep ...'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Does it lives ...?' or 'It don't sleep'), fix them together, then go on.",
              "In round 3 the drill becomes real: talk about when YOU sleep, eat and play, and remember one answer to tell the class.",
            ],
            prompts: [
              "It sleeps in the day. (?)",
              "It lives in a pond. (X)",
              "It eats fruit. (+ but)",
              "An owl sleeps in the day. (~ owls)",
              "It lives in a tree. (X +)",
            ],
            feedback: "Prompt, do not tell: for 'Does it lives?' tap your wrist and pause on 'Does it ...?'; for 'It don't sleep' hold up one finger for 'it' and say 'It does...?' so the child finds 'doesn't'; for a missing -s in 'It sleeps' tap your wrist; for 'Yes, it sleeps.' repeat with a rising voice and let the child find 'Yes, it does.' Say every -s and 'doesn't' clearly yourself.",
            teacherNote: "The clue game needs the -s on lives and sleeps and the change after does and doesn't. A drill helps when the last step is real: in round 3 children use do and sleep for their own day. Grades 2-4 can take the full set. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with it, with the frames on the board.", frames: ["Does it live in ___?", "No, it doesn't."] },
              { level: "Core", task: "Change every clue, with it and they, and join two parts with and, but or because." },
              { level: "Stretch", task: "Use the time words and a reason: 'Does it sleep at night? No, it doesn't. It sleeps in the day because it hunts at night.'" },
            ],
          },
        },
        {
          after: "Question mark or period? (SB 63 F)",
          slide: {
            kind: "writing",
            title: "My animal clues: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to what the animal is, how it looks, where it lives and why it sleeps in the day.",
              "Plan: write two or three key words for each box (or draw). Say one sentence for each box to your partner.",
              "Write: five sentences. Use the frames and at least two joining words.",
              "Check: tick the checklist. Your partner points to every full stop and every question mark.",
              "Teacher: look only at the -s on lives and sleeps, the joining words and the full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: The bat",
              text: "This is a bat. It's small and brown, but it isn't a bird. It lives in a dark cave, and it sleeps in the day because it flies at night. It eats fruit and insects. Do you like bats?",
            },
            organiser: [
              { label: "What is it?", prompt: "Key words: big or small, color. What is your animal? Is it a bird, a frog or a mouse?" },
              { label: "Where?", prompt: "Key words: tree, pond, cave. Where does it live?" },
              { label: "When and why?", prompt: "Key words: day, night, because. When does it sleep, and why?" },
              { label: "Food", prompt: "Key words: eat, fruit, insects. What does it eat?" },
            ],
            frames: ["This is a ___.", "It's ___ and ___, but it isn't a ___.", "It lives in ___, and it sleeps in the ___ because ___.", "It eats ___.", "Do you like ___?"],
            checklist: ["It lives, it sleeps, it eats: the -s is there", "At least two joining words: and, but, because", "'It's' for 'It is' has the little mark; a question ends with ?", "A capital letter at the start and a full stop at the end of every sentence"],
            sayIt: "Read your paragraph to your partner. Then say it again without looking and let your partner guess: what is it?",
            teacherNote: "A paragraph of five sentences for the clue game: the same clues the class gives aloud, now written with joining words, planned with key words (a drawing is optional). It also works as the script for the recorded talk 'Guess my animal' (leave out the first sentence and the animal's name so a grown-up can guess). Mark only the -s on lives, sleeps and eats, the joining words and the full stops.",
            tiers: [
              { level: "Support", task: "Copy the five frames and fill in one word in each.", frames: ["This is a ___.", "It lives in ___."] },
              { level: "Core", task: "Write five sentences about one animal, with at least two joining words." },
              { level: "Stretch", task: "Write a sixth sentence that joins two clues with because, and end with a question: 'Do you like ___?'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Guess my animal",
        prompt: "Choose an animal. Give four clues, join two of them with and, but or because, and ask 'What is it?' Show a picture or a toy at the end.",
        length: "60-90 seconds",
        steps: [
          "Choose an animal and draw it, or find a toy.",
          "Say your four clues three times: each time a little faster, like in class.",
          "Record it once. Join two clues with and, but or because. Show your animal at the end!",
          GROWN_UP,
        ],
        maxSeconds: 150,
        kidSummary: "Give four clues about an animal, join ideas with and, but or because, ask 'What is it?', and keep talking without long stops.",
        words: ["bird", "frog", "rainforest", "day", "night", "morning"],
        grammar: ["It's a ___.", "It lives in ___.", "It sleeps in the ___ because ___.", "It isn't ___, but ___."],
        rubric: [
          { label: "Clues", description: "Gives three or four clues about the animal: what it is, where it lives, when it sleeps, what it eats.", weight: 3 },
          { label: "Whole sentences", description: "Says 'It lives in ___' and 'It sleeps in the ___', not single words.", weight: 2 },
          { label: "Joins ideas", description: "Joins two clues with and, but or because, and asks 'What is it?' at the end.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops from the first clue to the question.", weight: 3 },
          { label: "Clear -s", description: "Says the -s in 'lives' and 'sleeps' so it can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It's a ___.", "It lives in ___.", "It sleeps in the ___.", "What is it?"], tips: ["Hold up one finger for each clue."] },
          { level: "Core", who: "Most children", frames: ["It's ___, and it lives in ___.", "It sleeps in the ___ because ___.", "It eats ___.", "What is it?"], tips: ["Say the time of day for your animal and one reason."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It isn't a ___, but it ___.", "I think it's a ___, because ___. Do you agree?"], tips: ["Add a clue with but, and ask the viewer what they think."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u06-l5": {
      objectives: ["I can show my animal booklet and say about it three times, faster each time, with joined sentences."],
      trim: { "Where do animals live?": 4, "Our Big Question Chart (SB 65 C)": 4 },
      drop: ["What am I? Animal mime", "Goodnight, animals"],
      add: [
        {
          after: "Our Big Question Chart (SB 65 C)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: my animal sentences",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the booklet sentence fast and right: ask it, answer it, say no, and join it with and, but or because. Then ask about your partner's animal.",
            chunks: [
              "This is a frog.",
              "Is this a frog? Yes, it is. / No, it isn't.",
              "A frog doesn't live in the rainforest, but it lives in a pond.",
              "It's small and green, and it eats flies.",
              "What does it eat? It eats flies.",
              "Frogs live in ponds because they like water.",
            ],
            recycle: ["What's this? It's a ___.", "I take care of the orangutan."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence about an animal and shows a sign (? = ask it, X = say no, + = join with and, but or because, ~ = one animal becomes many). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the animal too: a frog, a bird, a bat." },
              { seconds: 90, say: "Real talk: ask your partner about their booklet animal: 'Does it live in ___?' 'What does it eat?' Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Is, Does or What, X = say it with isn't or doesn't, + = join with 'and ___', 'but ___' or 'because ___', ~ = change a frog to frogs.",
              "Say the WHOLE new sentence. After Does or doesn't the verb has no -s: 'Does it live ...?'. For many animals, add -s and say 'live', not 'lives'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Does it lives ...?' or 'Frogs lives'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about your partner's own booklet animal, and remember one answer to tell the class.",
            ],
            prompts: [
              "This is a frog. (?)",
              "It lives in the rainforest. (X)",
              "It's small. (+ but it can jump far)",
              "A frog lives in a pond. (~ frogs)",
              "It eats flies. (?)",
            ],
            feedback: "Prompt, do not tell: for 'Does it lives?' tap your wrist and pause on 'Does it ...?'; for 'Frogs lives' hold up two fingers for 'many' and let the child drop the -s; for 'It don't eat' say 'It does...?' with a pause; for 'Yes, it lives.' repeat with a rising voice and let the child find 'Yes, it does.' Say the final -s and the n't clearly yourself.",
            teacherNote: "This drill gets the booklet language ready before the children make their pages. A drill helps when the last step is real: in round 3 they ask about the animal their partner is really going to write about. Grades 2-4 can take the full set. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with this and it, with the frames on the board.", frames: ["Is this a ___?", "It doesn't live in ___."] },
              { level: "Core", task: "Change every sentence with every sign, and join two parts with and, but or because." },
              { level: "Stretch", task: "Change one animal to many, and give a reason: 'Frogs live in ponds because they like water. Do bats live in ponds? No, they don't.'" },
            ],
          },
        },
        {
          after: "Show your booklet (SB 65 C)",
          slide: {
            kind: "fluency",
            title: "Booklet talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same booklet talk to three friends. Each talk is shorter and smoother, and the sentences are joined.",
            chunks: [
              "This is a frog, and it lives in a pond.",
              "It's small and green, but it can jump very far.",
              "It eats flies, and it sleeps in the day.",
              "I like the frog because it's funny. Do you like frogs?",
            ],
            recycle: ["What's this? It's a ___.", "Who's that? It's ___."],
            rounds: [
              { seconds: 75, say: "Partner 1: show your booklet and say your talk. The listener counts the facts on their fingers." },
              { seconds: 60, say: "Partner 2: the same talk in less time." },
              { seconds: 45, say: "Partner 3: fast and smooth! The listener asks one question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: fixClues,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity for grades 2-4. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and the one-minute fix makes the second telling more correct. Listen for 'lives' and 'eats' (it is one animal), the -s on plural foods and joined sentences with no joining word.",
            tiers: [
              { level: "Support", task: "Say three or four sentences without the board.", frames: ["This is a ___, and it lives in ___.", "It eats ___."] },
              { level: "Core", task: "Add a fifth sentence with because: 'I like the ___ because it's ___.'", frames: ["I like the ___ because ___."] },
              { level: "Stretch", task: "Compare with your partner's booklet and ask a question: 'My animal is small, but yours is big. Which one do you like?'", frames: ["My ___ is ___, but yours is ___. Which one do you like?"] },
            ],
          },
        },
        {
          after: "Make an animal booklet (SB 65 B)",
          slide: {
            kind: "writing",
            title: "Write a booklet page",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find the full stops and the joining words and, but and because.",
              "Look at your booklet page. Write four sentences with the frames, with at least two joining words.",
              "Read them to your partner.",
            ],
            text: { title: "A model page", text: "This is a frog. It lives in a pond, and it eats flies. It's small and green, but it can jump very far. I like the frog because it's funny." },
            frames: ["This is a ___.", "It lives in ___, and it ___.", "It's ___, but it ___.", "I like the ___ because ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "'lives', 'eats': the -s is there", "At least two joining words: and, but, because"],
            sayIt: "Read your page to your partner, then say it again without looking.",
            teacherNote: "This is for the booklet children are already making: a short model with joined sentences, then the same pattern about their own animal. Underline the -s on 'lives' and 'eats'.",
            tiers: [
              { level: "Support", task: "Copy the first three sentences of the model and change the animal." },
              { level: "Core", task: "Write four sentences about your own animal, with 'and' and 'but'." },
              { level: "Stretch", task: "Write five sentences and add a reason with 'because': 'I like the frog because it's funny.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u06-l6": {
      objectives: ["I can say 'What's this?' and 'Who's that?' fast and right, near and far, and join my answers with and, but or because."],
      trim: { "Remember it!": 5 },
      drop: ["Ranger paw-print race", "This and that freeze"],
      add: [
        {
          after: "Over the wall: reserve maps",
          slide: {
            kind: "fluency",
            title: "Grammar drill: this, that, who, what",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the champion sentence fast and right: ask it, answer it, say no, make it near or far, and join it with and, but or because. Then ask about real things.",
            chunks: [
              "What's this? It's a leaf.",
              "What's that? It's a pond, and it's big.",
              "Who's this? It's Dian, and she's a keeper.",
              "Is that a nest? No, it isn't. It's a hive.",
              "That isn't a nest, but this is a nest.",
              "Who's that? Is it Anak? Yes, it is. She's a baby orangutan.",
            ],
            recycle: ["I take care of the orangutan.", "It lives in the rainforest."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with and, but or because, <-> = this becomes that). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use your hand for near and far." },
              { seconds: 90, say: "Real talk: you are the guide. Point to real things and pictures and ask your partner 'What's that?' and 'Who's this?'. Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question, X = say it with isn't, + = join with 'and ___', 'but ___' or 'because ___', <-> = change this to that, or that to this.",
              "Say the WHOLE new sentence. Keep the 's: What's, Who's, It's, That isn't.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'What this?' or 'Who's that? It's a pond'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what is really in the room, and remember one answer to tell the class.",
            ],
            prompts: [
              "What's this? It's a leaf. (<-> that)",
              "It's a pond. (?)",
              "Who's this? It's Dian. (+ keeper)",
              "That's a nest. (X)",
              "It's a baby orangutan. (X +)",
            ],
            feedback: "Prompt, do not tell: for 'What this?' point to the 's on the board and say 'What ...?' with a pause; for 'Who's that? It's a pond' ask 'A person or a thing?' and let the child change who to what; for this and that, use your hand near and far; for a joined sentence with no 'it's', hold up two fingers for the two parts. Say the 's and the n't clearly yourself.",
            teacherNote: "The unit's grammar in one drill: what for things, who for people and animal friends, this for near, that for far. A drill helps when the last step is real: in round 3 the child is a guide and asks about things they can see. Grades 2-4 can take the full set. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and <-> with what and who, with the frames on the board.", frames: ["What's this? It's a ___.", "Who's that? It's ___."] },
              { level: "Core", task: "Change every sentence with every sign, and join two parts with and, but or because." },
              { level: "Stretch", task: "Use plurals too, and give a reason: 'What are those? They're nests. Are they hives? No, they aren't. They're too small.'" },
            ],
          },
        },
        {
          after: "Grammar drill: this, that, who, what",
          slide: {
            kind: "fluency",
            title: "Champion sprint: this and that",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 8,
            goal: "Say every champion question and joined answer fast and right: near and far.",
            chunks: [
              "What's this? It's a leaf, and it's green.",
              "What's that? It's a pond, but it isn't deep.",
              "Who's this? It's {s1}, and we are friends.",
              "Who's that? It's a baby orangutan, and it's with Dian.",
            ],
            recycle: ["I take care of the orangutan.", "It lives in the rainforest."],
            rounds: [
              { seconds: 75, say: "Together: the teacher holds a card close (this) or sticks it on the wall (that); the class asks and answers with a joined answer." },
              { seconds: 60, say: "Boys ask, girls answer. Then swap." },
              { seconds: 60, say: "Champion round: one child at a time, as fast as you can! Ask a follow-up question at the end." },
            ],
            steps: [
              "Watch the card. Is it close (this) or far (that)? Ask the whole question.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
            ],
            feedback: fixThis,
            teacherNote: "A quick, high-energy recall of this unit's grammar mixed with last lessons' phrases, with longer joined answers than before: mixing old and new (spaced retrieval) keeps them from fading. Use your hand for this and that. Listen for 'What this?', a missing 'It's' and a joined part with no second 'it's'.",
            tiers: [
              { level: "Support", task: "Ask and answer without looking, with a joined answer.", frames: ["What's this? It's a ___, and it's ___.", "Who's that? It's ___."] },
              { level: "Core", task: "Ask a friend a question and then answer with two joined sentences: 'It's a baby orangutan, and it lives in the rainforest.'" },
              { level: "Stretch", task: "Answer with but or because, then ask a follow-up: 'It isn't a nest, because it's too big. What do you think it is?'" },
            ],
          },
        },
        {
          after: "Write like a champion: questions and answers",
          slide: {
            kind: "writing",
            title: "Grow my champion answer",
            routine: "expand it",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the small answer with the teacher.",
              "Make it bigger: add the words in the brackets. Some need a joining word (and, but, because).",
              "Write your big answer. Read it to your partner.",
            ],
            items: [
              { q: "It's a leaf. (add: green)", answer: "It's a green leaf." },
              { q: "It's a pond. (add: big; and: it's blue)", answer: "It's a big pond, and it's blue." },
              { q: "It's a nest. (add: little; but: it isn't empty)", answer: "It's a little nest, but it isn't empty." },
              { q: "It's a bird. (add: blue; and: it lives in a tree)", answer: "It's a blue bird, and it lives in a tree." },
              { q: "It's an orangutan. (add: baby; and: it takes a nap)", answer: "It's a baby orangutan, and it takes a nap." },
            ],
            frames: ["It's a ___ ___, and it's ___.", "It's a ___ ___, but it isn't ___.", "What's that? It's a ___ ___."],
            checklist: ["It's has an 's, and the second part has it's or isn't", "A comma before and or but", "A capital letter at the start", "A full stop at the end"],
            sayIt: "Ask 'What's that?' and say your big answer without looking.",
            teacherNote: "A describing word before the thing, then a second part joined with and or but. Fix item 1 together and clap the rhythm of 'It's a green leaf.'; do item 2 together to show the joined part. Items 3 to 5 are for the pairs.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames on the board." },
              { level: "Core", task: "Do all five items." },
              { level: "Stretch", task: "Write a question and a big joined answer of your own: 'What's that? It's a big green leaf, and it's wet, but it isn't old.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My reserve tour",
        prompt: "Be a guide at a reserve! Point to four things at home and say 'What's this? It's a ___, and it's ___.' Say 'Who's that?' about a person or a toy animal.",
        length: "60-90 seconds",
        steps: [
          "Choose four things and one person or toy animal at home.",
          "Practise your questions and joined answers three times.",
          "Record it once. Point to each thing as you talk. Join two ideas with and, but or because.",
          GROWN_UP,
        ],
        maxSeconds: 150,
        kidSummary: "Ask 'What's this?' and 'Who's that?', answer with 'It's ___, and ___.', and keep talking without long stops.",
        words: ["reserve", "orangutan", "rainforest", "pond", "leaf"],
        grammar: ["What's this? / What's that? It's a ___.", "Who's this? / Who's that? It's ___.", "It's ___, and / but ___."],
        rubric: [
          { label: "What and who", description: "Asks 'What's ___?' about a thing and 'Who's ___?' about a person or animal.", weight: 3 },
          { label: "Full answers", description: "Answers 'It's a ___.', not just one word.", weight: 3 },
          { label: "Joins ideas", description: "Joins two ideas with and, but or because in at least two answers, or asks the viewer a question.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops about four things.", weight: 2 },
          { label: "This and that", description: "Uses this for close things and that for far things.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["What's this? It's a ___.", "Who's that? It's ___."], tips: ["Point to each thing."] },
          { level: "Core", who: "Most children", frames: ["What's this? It's a ___, and it's ___.", "What's that? It's a ___, but it isn't ___.", "Who's that? It's ___."], tips: ["Walk close to one thing and far from another."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It's a ___. It lives in ___, because ___.", "Do you like it? Thank you for the tour!"], tips: ["Add where the animal lives and why, and end by asking the viewer a question."] },
        ],
      },
    },
  },
};
