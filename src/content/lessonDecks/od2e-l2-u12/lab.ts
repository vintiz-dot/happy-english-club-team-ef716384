import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 12 "Reuse and
// Recycle" (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio Grade 6:
// students in grades 6-7 (ages 11-13) working on a book written for younger children, so the
// Lab raises everything it adds: longer chunks with reasons and contrasts, opinions, and full
// paragraphs. Every lesson gets a grammar drill (the unit's words, place words and time verbs,
// changed fast and then used for real talk), one more fluency routine and one writing routine.
// Lessons 2, 4 and 6 end with a recorded talk (90-120 seconds, made alone). Time comes from
// dropping or trimming the games made for younger children, never from the book pages or the
// grammar. All text is original.

const fix = (example: string) =>
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between round 1 and round 2, write them on the board and let the class fix them in one minute: students who then say it again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: " +
  example +
  " For a sound, just say it right and let the student echo it. Say every final sound clearly yourself (-s, -ed, the t of isn't): students copy what they hear.";

const drillFix = (example: string) =>
  "Prompt, do not tell. " +
  example +
  " In round 3, do not correct during an answer: note the mistake and give it back in the next fix minute.";

const drillSigns =
  "Whole class: the teacher says a sentence and shows a sign (? = make it a question, X = make it negative, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together.";

export const odL2U12Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u12-l1": {
      objectives: [
        "I can talk about the things I keep, buy and reuse, and give a reason for each.",
        "I can write a paragraph of six to eight sentences with linking words about the things I keep and reuse.",
      ],
      drop: ["Reuse and recycle chant", "Freeze and act (TPR)", "Pass the bag and What's missing?"],
      trim: { "Mystery bag: what do you notice?": 5 },
      add: [
        {
          after: "Add the words to the chart (SB 116 B)",
          slide: {
            kind: "fluency",
            title: "Word sprint: say it in one breath",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say a whole sentence with a reason, fast and smooth, with no stops.",
            chunks: [
              "I keep my notebooks on the shelf next to my desk because it is the first place I look.",
              "Although paper is cheap, I try to use both sides of every page.",
              "The machine at the recycling plant sorts the bottles, so workers don't have to do it by hand.",
              "I buy my pens at the stationery store because it is near my school.",
              "I would like to rescue some old furniture and paint it, but I need more time.",
            ],
            recycle: ["The shop is across from the park.", "Where's the bin? It's next to the tree."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence with its reason." },
              { seconds: 90, say: "Pairs: one shows a picture card, the other says a TRUE sentence about their own life, with a reason. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many true sentences with because, although or so can you say?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence with a reason, not just the word.",
              "Listen for the clap: it means swap.",
              "In round 3, count your sentences on your fingers and try to beat your score.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them with the class; then go on.",
            ],
            prompts: ["(card: diary and shelf)", "(card: paper)", "(card: machine)", "(card: stationery store)", "(card: rescue)"],
            feedback: fix("point to the frame on the board, or start the phrase and pause ('I keep my notebooks on ...?'). If a student says 'on shelf', hold up a finger for the missing 'the'. Sounds: for 'machine' say ma-SHEEN and let the student echo."),
            teacherNote: "Whole sentences with a reason: the aim is one smooth sentence of 12 to 15 words, not nine single words. Listen for the missing the, the dropped -s on plurals and on he / she / it verbs, and 'machine' said with a ch sound instead of sh. Mix in earlier place phrases every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frames on the board and a partner.", frames: ["I keep my ___ on the shelf.", "I buy ___ at the ___ because ___."] },
              { level: "Core", task: "Say a sentence with a reason alone, without looking at the board." },
              { level: "Stretch", task: "Add a contrast: 'Although I like my diary, I also write on my phone because it is faster.'", frames: ["Although ___, ___ because ___."] },
            ],
          },
        },
        {
          after: "Tell me about these things",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence about recycling fast and right: ask it, say no, join it with a reason, change the person or the time. Then talk about your own things.",
            chunks: [
              "I keep my diary on the shelf in my room because I don't want my brother to read it.",
              "Do you keep a diary? Yes, I do. / No, I don't, but I write notes on my phone.",
              "My sister doesn't use paper very much, so she reads everything on a tablet.",
              "Although the machine at the recycling plant is loud, it sorts the bottles very fast.",
              "Yesterday I bought a notebook at the stationery store, and I rescued an old box from the trash.",
              "Where do you keep your things, and why do you keep them there?",
            ],
            recycle: ["The stationery store is across from the park.", "We use paper to make notebooks."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence from the board and shows a sign card, B changes it. Swap at the clap. Change the person too: I, my sister, we, my brother." },
              { seconds: 90, say: "Real talk: ask your partner about the things they keep, buy, reuse or throw away. Answer in full sentences, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Do or Did, X = don't, doesn't or didn't, + = join with because, although or so, T = now or yesterday, P = a new person.",
              "Say the WHOLE new sentence, with the -s after he and she and the plain verb after do, does or did.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what your partner keeps and reuses, and remember one answer to tell another pair.",
            ],
            prompts: ["I keep my diary on the shelf. (?)", "My sister uses paper every day. (X)", "I bought a notebook at the stationery store. (+ because)", "The machine is loud. (+ although)", "I rescued a box from the trash. (T: every week)", "I keep my diary on the shelf. (P: my brother)"],
            feedback: drillFix("For 'Do you keeps a diary?' hold up one finger and say 'Do you ...?' with a rising voice. For a missing -s in 'she uses', tap the table once. For 'I don't keeps', point to don't and say 'plain verb?'. Say the final -s of 'uses' and 'keeps' clearly yourself."),
            teacherNote: "Lesson 1 has no grammar slide, so the drill takes the unit's new words into the simple present and past forms students already know, and puts the thinking into the joining words (because, although, so). Students in grades 6-7 hold two clauses easily when the first one is a chunk they know. Round 3 is the point: real answers about real things. If a student needs a word the unit does not teach, give it and move on.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Do you ___?", "I don't ___."] },
              { level: "Core", task: "Change every sentence with all five signs and a new person each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'I keep my diary on the shelf, but my brother keeps his under his bed. Where do you keep yours?'" },
            ],
          },
        },
        {
          after: "What is a setting? (SB 117 C)",
          slide: {
            kind: "writing",
            title: "My things and where I keep them: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, 'First', 'Also', 'However', 'For example' and the closing sentence.",
              "Plan: write a few words in each box. Say one sentence for each box to your partner.",
              "Write: six to eight sentences. Use linking words (first, also, however, because, for example, in conclusion) and give a reason or an example for each detail.",
              "Check: tick the checklist. Your partner underlines every verb after he, she or it and every small word before a noun.",
              "Teacher: look first at the -s on verbs and the linking words. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: my shelf",
              text: "I keep most of my favorite things on the shelf in my room. First, there is a blue diary, and I write in it every night because it helps me relax. Also, I keep a few old cartons there. I want to turn them into pencil boxes, so I never throw them away. However, my brother thinks they are just trash. For example, he laughed when I showed him one. In conclusion, my shelf is small, but it shows who I am.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Where do you keep your favorite things, and what are they?" },
              { label: "Detail 1", prompt: "One thing you keep: what is it, and why do you keep it? (First ... because ...)" },
              { label: "Detail 2", prompt: "One thing you reuse or want to reuse: what will you do with it? (Also ...)" },
              { label: "A different opinion", prompt: "Who thinks differently, and why? (However ... For example ...)" },
              { label: "Closing", prompt: "What does your shelf show about you? (In conclusion ...)" },
            ],
            frames: ["I keep ___ on the ___ because ___.", "First, ___. Also, ___.", "For example, ___.", "However, ___.", "In conclusion, ___."],
            checklist: [
              "Six to eight sentences, each with a capital letter and a full stop",
              "Present simple: the -s after he / she / it (keeps, writes), and a plain verb after don't / doesn't",
              "At least three linking words, for example first, also, however, because, for example, in conclusion",
              "A topic sentence, two details with a reason or an example, and a closing sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again from your boxes, without looking at the text.",
            teacherNote: "A first full paragraph for grades 6-7, about things the student knows well. Use the nine unit words where they fit (shelf, diary, paper, stationery store, carton). Vietnamese has no a / an / the and no -s on verbs, so mark missing small words and missing -s with a dot and let the student find them. Mark only the topic sentence, the verbs and the linking words.",
            tiers: [
              { level: "Support", task: "Copy the model and change the things, the places and the reasons.", frames: ["I keep ___ on the ___.", "I keep it because ___.", "In conclusion, ___."] },
              { level: "Core", task: "Write six sentences: topic, two details, a different opinion, closing." },
              { level: "Stretch", task: "Write eight sentences with a second example and an 'although' sentence." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u12-l2": {
      objectives: [
        "I can retell the carton's journey in the past tense, with reasons, and write it as a paragraph.",
        "I can tell the journey of an everyday object and say what I think about recycling, with a reason and an example.",
      ],
      drop: ["Where is the carton? Journey chant", "A bottle's journey: story strip"],
      trim: { "Setting tracker: where, when, how does it feel? (Organize)": 9 },
      add: [
        {
          after: "Highlighted words: use them (SB 118-119)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence about the carton's story fast and right: ask it, say no, join it with a reason, change the person or the time. Then talk about things you reused.",
            chunks: [
              "The carton was on a shelf in a quiet kitchen, and it felt lonely.",
              "Was the carton happy in the bin? No, it wasn't, because it was dark and cold.",
              "The carton went to the recycling plant, and the machines made it into new paper.",
              "Although the trip was long, the carton wasn't afraid because it wanted a new life.",
              "Where did the carton go next? Why did it feel excited at the end?",
              "Last year I turned a juice carton into a pencil box, and I still use it.",
            ],
            recycle: ["I keep my diary on the shelf because it is private.", "The shop is across from the park."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence about the carton and shows a sign card, B changes it. Swap at the clap. Change the person too: the carton, I, we, the bottle." },
              { seconds: 90, say: "Real talk: ask your partner about something they reused instead of throwing it away. What was it, how did they reuse it and why? Answer in full, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Was or Did, X = wasn't or didn't, + = join with because, although, so or when, T = now or yesterday, P = a new person.",
              "Say the WHOLE new sentence, with was / were or the past verb (went, made, wanted) and the plain verb after did or didn't.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: ask your partner about something they reused, and remember one answer to tell the class.",
            ],
            prompts: ["The carton was on the shelf. (?)", "The carton was happy in the bin. (X)", "The carton went to the plant. (+ because)", "The trip was long. (+ although)", "The carton felt lonely. (P: I)", "The machines make paper. (T: yesterday)"],
            feedback: drillFix("For 'The carton go to the plant' tap your wrist (it is over) and wait. For 'Was the carton were happy?' hold up one finger and say 'Was the carton ...?'. For 'Did it wanted?' point to did and say 'plain verb?'. Say the final -ed of 'wanted' and the t of 'wasn't' clearly yourself."),
            teacherNote: "The story gives the sentences, but the thinking is in the joining words (because, although, so, when). The lesson has no grammar slide, so the drill takes the past forms the story uses: was / were, went, made, wanted. Vietnamese verbs do not change for time, so 'The carton go' and a dropped -ed are expected: prompt the student to fix them. Round 3 is the point: a real object a real student reused.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Was the ___ ___?", "The ___ wasn't ___."] },
              { level: "Core", task: "Change every sentence with all five signs and a new person each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'My old jar wasn't useful, but I painted it and now it holds my pens. What did you reuse?'" },
            ],
          },
        },
        {
          after: "Setting tracker: where, when, how does it feel? (Organize)",
          slide: {
            kind: "fluency",
            title: "Carton journey: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same journey twice: first in full, then shorter, smoother and faster, with a reason for what happened.",
            chunks: [
              "First, the carton was on a shelf in a kitchen, and it was full of orange juice.",
              "Then someone drank the juice and put the empty carton in the recycling bin because it was clean.",
              "Next, a truck took it to the recycling plant, where the machines sorted it with hundreds of other cartons.",
              "At the end, the carton became new paper, so the story shows that old things can have a second life.",
            ],
            recycle: ["I keep my diary on the shelf because it is private.", "Last week I went to the park."],
            rounds: [
              { seconds: 90, say: "Round 1: Partner A tells the journey from the four picture cards, then Partner B. Include at least one reason with because or so. Then change partners." },
              { seconds: 75, say: "Round 2: new partner. Each of you tells it again in less time, keeping the reasons and cutting the extra words." },
            ],
            steps: [
              "Look at the four key-word cards: shelf, bin, plant, paper. Put them in order and say one sentence for each card.",
              "Round 1: Partner A tells the journey, then Partner B. When the bell rings, change partners.",
              "The listener has a job: count the reasons (because, so) on your fingers and tell the speaker how many you heard.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on with round 2.",
            ],
            prompts: ["(picture: carton on a shelf)", "(picture: carton in a bin)", "(picture: recycling plant)", "(picture: new paper)"],
            feedback: fix("start the phrase and pause ('Then someone put...?'), or hold up a finger for the missing -ed in 'sorted'. Repeat the error with a rising voice ('It go to the plant?') and let the student say it again."),
            teacherNote: "Same story twice on purpose: the second telling frees students to speak faster because they are not searching for words. The one-minute fix between rounds is what turns speed into accurate speed, so do not skip it. Listen for the missing -ed on 'sorted', the irregular 'took' and 'became', and 'the' before 'bin'. The sentences are longer than the book's; if someone loses the thread, they can say two shorter sentences instead.",
            tiers: [
              { level: "Support", task: "Point to each card and say its sentence with the frames.", frames: ["First, the ___ was ___.", "Then ___.", "Next, it went to ___."] },
              { level: "Core", task: "Tell all four steps, with a reason in at least two of them." },
              { level: "Stretch", task: "Add your own opinion and a contrast: 'Although the journey was long, I think the carton was lucky because ...'" },
            ],
          },
        },
        {
          after: "Why? Think boxes and talk (SB 118-119)",
          slide: {
            kind: "writing",
            title: "A carton's journey: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, first, then, next, finally and the closing sentence.",
              "Plan: write a few words in each box. Say one sentence for each box to your partner.",
              "Write: six to eight sentences in the past tense. Use linking words (first, then, next, finally, because, for example, in conclusion) and give a reason for at least one step.",
              "Check: tick the checklist. Your partner underlines every past verb and every linking word.",
              "Teacher: look first at the past verbs and the linking words. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: a juice carton's journey",
              text: "A juice carton had a surprising journey. First, it sat on a kitchen shelf, full of orange juice, until someone finished it. Then the family put it in the recycling bin because it was empty and clean. Next, a truck took it to the recycling plant, where machines sorted it and turned it into pulp. Finally, the pulp became new paper, and a student wrote a story on it. For example, the paper was thin but strong. In conclusion, recycling gave the carton a second life.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which object do you write about, and what makes its journey interesting?" },
              { label: "First and then", prompt: "Where was it at the start, and what happened to it? Give a reason." },
              { label: "Next", prompt: "Where did it go, and what happened to it there?" },
              { label: "Finally", prompt: "What did it become? Add an example or a detail." },
              { label: "Closing", prompt: "What does the journey show about recycling? (In conclusion ...)" },
            ],
            frames: ["A ___ had a surprising journey.", "First, it ___ on / in ___. Then ___ because ___.", "Next, ___ took it to ___.", "Finally, it became ___. For example, ___.", "In conclusion, ___."],
            checklist: [
              "Six to eight sentences, each with a capital letter and a full stop",
              "Past tense all the way through: sat, put, took, became (irregular) and sorted, finished (-ed)",
              "At least three linking words, for example first, then, next, finally, because, for example, in conclusion",
              "A topic sentence, three steps with a detail or a reason, and a closing sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell the journey again from your boxes, without looking at the text.",
            teacherNote: "A story-retell paragraph for grades 6-7. It is also the script for the recorded talk, 'My carton's journey': tell the students to practice it twice and then record it alone. Mark only the topic sentence, the past verbs and the linking words. Vietnamese verbs do not change for time, so the missing -ed and the regular 'put / took / became' are the typical dots.",
            tiers: [
              { level: "Support", task: "Copy the model and change the object and the details.", frames: ["First, it ___ on ___.", "Then ___ put it in ___.", "Finally, it became ___."] },
              { level: "Core", task: "Write six sentences: topic, first and then, next, finally, closing." },
              { level: "Stretch", task: "Write eight sentences with a second reason and an 'although' sentence." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My carton's journey",
        prompt: "Tell the journey of an everyday object (a carton, a bottle or a notebook) from its first step to its new life. Say what happened at each step and why, give an example, and say what you think about recycling.",
        length: "90-120 seconds",
        steps: [
          "Look at your paragraph from class. Write three key words for each step, not full sentences.",
          "Practice twice with a timer. Aim for 90 to 120 seconds, and do not read your paragraph word for word.",
          "Record it once. Look at the camera and speak clearly.",
          "Before you send it, check: did you give a reason and an example for what you said?",
        ],
        maxSeconds: 180,
        kidSummary: "Tell an object's journey in order, say why each step happened, and support your opinion about recycling with a reason and an example.",
        words: ["carton", "recycling plant", "machine", "rescue", "shelf", "paper"],
        grammar: ["First, ... Then ... Next ... Finally ...", "The carton sat / went / became (past)", "I think recycling is ___ because ___. For example, ___."],
        rubric: [
          { label: "Steps in order", description: "Tells the journey in order with first, then, next and finally.", weight: 3 },
          { label: "Reasons and examples", description: "Gives at least two reasons or examples with because, so or for example.", weight: 3 },
          { label: "Past verbs", description: "Uses the past tense (went, became, sorted); the -ed can be heard.", weight: 2 },
          { label: "Unit words", description: "Uses words from the unit: carton, recycling plant, machine, shelf.", weight: 1 },
          { label: "Keeps going", description: "Talks for 90-120 seconds without long stops, in whole sentences.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["First, the ___ was ___.", "Then ___ because ___.", "In the end, it became ___."], tips: ["Keep your key words in front of you and look at them, not at a script."] },
          { level: "Core", who: "Most students", frames: ["First, the ___ sat on ___. Then ___ because ___.", "Next, ___ took it to ___.", "For example, ___."], tips: ["Give one reason and one example in the middle of the journey."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although the trip was ___, ___.", "I think recycling is important because ___. For example, ___."], tips: ["Give a contrast, an opinion, and a reason with an example."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u12-l3": {
      objectives: ["I can ask and answer questions about where things are and what there is near me, and give a reason or a detail."],
      drop: ["Where's my hat? Place chant", "Hide the toy: guess where it is"],
      add: [
        {
          after: "Where is it? Look at the recycling picture (SB 121)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence about where things are fast and right: ask it, say no, join it with a reason, change the person or the time. Then talk about your own neighborhood.",
            chunks: [
              "Where's the library? It's across from the park, next to the bakery.",
              "Is there a café near your school? Yes, there is. It's between the bank and the bookstore.",
              "No, there isn't. There's a skate park behind the stadium, so I go there on weekends.",
              "Is there a recycling bin in front of your building? No, there isn't, so we keep our paper in a box under the stairs.",
              "Although my classroom is small, there is a shelf behind the door, and it is full of books.",
              "Is there anything in your neighborhood that you would like to change? Why?",
            ],
            recycle: ["I keep my diary on the shelf because it is private.", "The carton went to the recycling plant."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence about a place and shows a sign card, B changes it. Swap at the clap. Change the person too: my, your, her, our." },
              { seconds: 90, say: "Real talk: ask your partner about their neighborhood: where things are, what there is near their home and what they would like to have there. Answer in full, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a Where or Is there question, X = a No answer or isn't, + = join with because, although or so, T = now or yesterday, P = a new person.",
              "Say the WHOLE new sentence, with the right place word (in, on, under, behind, in front of, next to, between, across from) and the small word after it.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what there is and isn't near your partner's home, and remember one answer to tell another pair.",
            ],
            prompts: ["The library is next to the park. (?)", "There is a café near my school. (X)", "The shop is across from the park. (+ because)", "My bag is under the desk. (P: her)", "The bench is behind the tree. (T: yesterday)", "There is a bank between the café and the bookstore. (+ although)"],
            feedback: drillFix("For 'Where the library is?' point to 'Where's' on the board and say 'Where's the ...?' with a rising voice. For 'behind of' or 'next the', hold up a finger for the extra or missing word. For 'Yes, it is' after an Is there question, say 'Yes, there ...?' and wait. Say the final t of 'isn't' clearly yourself."),
            teacherNote: "The drill takes the grammar slide's two question types (Where's ...? and Is there ...?) and the place words, and puts the thinking into the joining words and the follow-up. Typical slips are 'behind of', 'next the', 'There have' (from the Vietnamese 'có') and 'Yes, it is'. Give the right form quickly and move on. Round 3 is the point: real places in a real neighborhood.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Is there a ___ ___ the ___?", "Yes, there is. / No, there isn't."] },
              { level: "Core", task: "Change every sentence with all five signs and a new person each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'There isn't a skate park near my house, but there's one behind the stadium. Is there one near yours?'" },
            ],
          },
        },
        {
          after: "Three things: where are they? (SB 121 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: Is there a ___?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer with a detail, turn and ask the next student. Keep the chain going with no stops!",
            chunks: [
              "Is there a bottle under the bench near the school gate?",
              "Yes, there is. It's next to the bin, but the bin is full.",
              "No, there isn't. There's a carton in front of the bin, so I think someone was lazy.",
              "Where's the recycling box? It's behind the tree, across from the library.",
              "Is there anywhere near your home where you can recycle paper? Where exactly is it?",
            ],
            recycle: ["I keep my diary on the shelf because it is private.", "The carton went to the recycling plant."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a card showing a place scene (a bottle under a bench, a bin in front of a gate). Ask the student on your left about their card, with a place word." },
              { seconds: 75, say: "Swap cards. Go faster, and add a reason or a detail to every answer." },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the student on your left: 'Is there a ___ under / behind / next to the ___?'",
              "They answer: 'Yes, there is.' or 'No, there isn't. There's a ___ ...' with a detail. Then they turn and ask the next student.",
              "Teacher: after the first round, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then do the faster rounds.",
            ],
            prompts: ["Is there a ___ + place word + the ___?", "Where's the ___?"],
            feedback: fix("point to the frame, or start the answer and pause ('Yes, there ...?'). If a student says 'Yes, it is' or 'There have', hold up a finger and say 'Yes, there ...?' with a rising voice. Pronunciation: say 'isn't' clearly, with the final t, and let the student echo."),
            teacherNote: "The chain gives every student many turns at asking AND answering in a few minutes, which is what makes 'Is there ...?' automatic. Vietnamese speakers often say 'There have' and 'Yes, it is'; give the right form quickly and move on. Time the whole circle and tell them: students like to beat their own time.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, there is.' or 'No, there isn't.' and pass the question on with the frame on the board.", frames: ["Is there a ___ ___ the ___?", "Yes, there is. / No, there isn't."] },
              { level: "Core", task: "Ask and answer without looking at the board, and add one detail to every answer." },
              { level: "Stretch", task: "After 'No, there isn't.' say where it is and what you think: 'There's a bottle in front of the bin, so I think someone was lazy.'" },
            ],
          },
        },
        {
          after: "Question chain: Is there a ___?",
          slide: {
            kind: "writing",
            title: "My neighborhood: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find every place word (across from, next to, between) and the words 'there is' and 'there isn't'.",
              "Plan: write a few words in each box. Say one sentence for each box to your partner.",
              "Write: six to eight sentences about your neighborhood. Use place words to say where things are and linking words (first, also, however, for example, in conclusion).",
              "Check: tick the checklist. Your partner points to every place word and checks it with the picture or the map.",
              "Teacher: look first at the place words and the linking words. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: my neighborhood",
              text: "My neighborhood is quiet, but there is a lot to do. First, there is a small park across from my building, and I play badminton there with my friends. Also, a library is next to the park, so I often borrow books after school. However, there isn't a skate park near my house. For example, my cousin has to take a bus to go skating. In conclusion, I like my neighborhood because everything is close, but I would like a café between the library and the bank.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is your neighborhood like? (My neighborhood is ___, but ...)" },
              { label: "Place 1", prompt: "One place: where is it, and what do you do there? (First, there is ...)" },
              { label: "Place 2", prompt: "Another place: where is it, and why is it useful? (Also ...)" },
              { label: "Something missing", prompt: "What isn't there, and what is the problem? (However, there isn't ...)" },
              { label: "Closing", prompt: "What do you like, and what would you change? (In conclusion ...)" },
            ],
            frames: ["My neighborhood is ___, but ___.", "There is a ___ across from / next to / behind the ___.", "Also, ___, so ___.", "However, there isn't a ___ near ___.", "In conclusion, ___."],
            checklist: [
              "Six to eight sentences, each with a capital letter and a full stop",
              "Place words are right: next to, across from, between, behind, in front of (no 'behind of', no 'next the')",
              "there is / there isn't: there is for one thing, there are for more than one",
              "At least three linking words, for example first, also, however, because, for example, in conclusion",
            ],
            sayIt: "Read your paragraph to your partner. Your partner points to the picture or the map for every place word. Then tell it again without looking at the text.",
            teacherNote: "The unit's place words and Is there ...? language in one full paragraph. Typical slips to dot: 'behind of', 'next the', 'There have' and 'Yes, it is'. Students can draw a quick map for the plan. Mark only the topic sentence, the place words and the linking words.",
            tiers: [
              { level: "Support", task: "Copy the model and change the places and the reasons.", frames: ["My neighborhood is ___.", "There is a ___ next to the ___.", "However, there isn't a ___."] },
              { level: "Core", task: "Write six sentences: topic, two places, something missing, closing." },
              { level: "Stretch", task: "Write eight sentences with a second example and an 'although' sentence." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u12-l4": {
      objectives: ["I can say what I usually do, what I did and what I am doing now, with a reason and a detail."],
      drop: ["Tick-tock clock chant", "Set the clock game", "Ball game: go, went, going"],
      add: [
        {
          after: "Write the correct verb form (SB 123 F)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence about time fast and right: ask it, say no, join it with a reason, change the person or the time. Then talk about your own week.",
            chunks: [
              "We usually recycle paper on Fridays, but last week we forgot, so the bin was full on Monday.",
              "I'm putting these bottles in the bin now because the teacher asked us to clean the room.",
              "Did you recycle anything last week? Yes, I did. / No, I didn't, although I wanted to.",
              "Last Saturday I went to the market with my mother, and we reused our old bags instead of buying new ones.",
              "My brother doesn't usually help at home, but yesterday he cleaned the kitchen without a reminder.",
              "What did you do after school yesterday, and why did you do that?",
            ],
            recycle: ["Is there a bench under the tree? Yes, there is.", "The carton went to the recycling plant."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence about time and shows a sign card, B changes it. Swap at the clap. Change the person too: I, he, we, my brother." },
              { seconds: 90, say: "Real talk: ask your partner what they usually do to help at home or at school, what they did last weekend and what they are doing now. Answer in full, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Do, Did or am / is / are, X = don't, didn't or not, + = join with because, although or so, T = usually, now or last week, P = a new person.",
              "Say the WHOLE new sentence, with the -ed or the irregular form for the past, the -ing for now, and the plain verb after did or didn't.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what your partner does, did and is doing, and remember one answer to tell another pair.",
            ],
            prompts: ["We usually recycle paper on Fridays. (T: last week)", "I'm putting the bottle in the bin. (?)", "I went to the market. (X)", "We reused our old bags. (+ because)", "He cleaned the kitchen. (P: they)", "I usually walk to school. (+ although)"],
            feedback: drillFix("For 'Yesterday I go' tap your wrist (it is over) and wait. For 'I goed' repeat the error with a rising voice ('I goed?'). For 'Did you recycled?' hold up one finger and say 'Did you ...?'. For 'I going' point to the board: 'I'm ...ing'. Say the final -ed of 'cleaned' and 'recycled' clearly yourself."),
            teacherNote: "The drill takes the grammar slide's three times (usually, now, before) and puts the thinking into the reason and the contrast. Vietnamese verbs do not change for time, so 'Yesterday I go' and the dropped -ed are expected: prompt the student to fix them and do not add new language between rounds. Round 3 is the point: a real week, told in full sentences.",
            tiers: [
              { level: "Support", task: "Use only ? and X and the time change, with the frames on the board.", frames: ["We usually ___.", "Last week I ___.", "Now I'm ___ing."] },
              { level: "Core", task: "Change every sentence with all five signs and a new person each time." },
              { level: "Stretch", task: "Add a second clause or a contrast: 'We usually recycle paper, but last week I forgot because I had an exam. Did you forget too?'" },
            ],
          },
        },
        {
          after: "Say it first: I was a ... Now I am a ...",
          slide: {
            kind: "fluency",
            title: "Time talk: the same talk, shorter",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same time talk to two partners. The second talk is shorter and smoother, and keeps its reasons.",
            chunks: [
              "We usually recycle paper and plastic at school, and every Friday we take the bags to the big bins.",
              "Last week I went to the park with my cousins, and we cleaned the benches because they were dirty.",
              "Now I'm sitting in class, and I'm telling you about my week, so I hope it is clear.",
              "Although I didn't do much at home, I reused an old jar as a pen holder, and I think it looks great.",
            ],
            recycle: ["Is there a bench under the tree? Yes, there is.", "The shop is across from the park."],
            rounds: [
              { seconds: 90, say: "Partner 1 gives the talk (usually, last week, now). The listener counts the past verbs on their fingers. Then Partner 2 gives theirs." },
              { seconds: 75, say: "New partner. Each of you gives the same talk again in less time, keeping the reasons and cutting the extra words." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first, then line B.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'I go' for 'I went', or 'recycle' for 'recycled') and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "The listener asks one question at the end: 'Why did you ...?'",
            ],
            feedback: fix("start the phrase and pause ('Last week I w...?'), or say the error back with a rising voice ('I goed?') and let the student try again. For -ed, hold up a finger at the end of the word. Sounds: model 'cleaned' and 'recycled' with a clear final d, and let the student echo."),
            teacherNote: "Same talk, less time, new listener: this is the 4-3-2 activity scaled for two rounds. The fix between rounds matters most because the past tense is where students slip. Longer sentences with because and although are the point for grades 6-7; if someone loses the thread, they can say two short sentences instead. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["We usually ___.", "Last week I ___.", "Now I'm ___ing."] },
              { level: "Core", task: "Say four sentences with a reason in two of them." },
              { level: "Stretch", task: "Add a contrast and a follow-up thought: 'Last week I went to the park because I wanted to help, although I was tired.'" },
            ],
          },
        },
        {
          after: "Time talk: the same talk, shorter",
          slide: {
            kind: "writing",
            title: "Join it: time sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the short sentences with your partner.",
              "Join them into ONE sentence with the linking word in the brackets. Keep the right time: usually, now or last week.",
              "Write it and read it to your partner. Compare it with the model answer.",
            ],
            items: [
              { q: "I went to the park. I cleaned the benches. They were dirty. (join with and + because)", answer: "I went to the park, and I cleaned the benches because they were dirty." },
              { q: "We usually recycle paper. Last week we forgot. (join with but)", answer: "We usually recycle paper, but last week we forgot." },
              { q: "He is putting a bottle in the bin. He wants to keep the park clean. (join with because)", answer: "He is putting a bottle in the bin because he wants to keep the park clean." },
              { q: "I wanted to go to the park. It rained all day. (join with although)", answer: "Although I wanted to go to the park, it rained all day." },
              { q: "My sister went to a market. She found some old books there. Now she is reading them. (join into one sentence)", answer: "My sister went to a market, where she found some old books, and now she is reading them." },
            ],
            frames: ["___, and ___ because ___.", "Although ___, ___.", "___, but ___.", "___, so ___."],
            checklist: [
              "The verb shows the right time: usually / now / last week",
              "Past verbs are right: went, cleaned, found (the -ed or the irregular form)",
              "A comma after an 'although' part and before and / but / so",
              "A capital letter at the start and a full stop at the end",
            ],
            sayIt: "Read your joined sentences to your partner, then say two of them again without looking.",
            teacherNote: "A warm-up for the book's writing task that follows, and a bridge between the drill's short changes and a paragraph. Joining two or three sentences into one is where grades 6-7 gain the most: listen for 'although ... but' together and for a past verb that slips back to the present.",
            tiers: [
              { level: "Support", task: "Join items 1-3 with the frames on the board." },
              { level: "Core", task: "Join all five sentences." },
              { level: "Stretch", task: "Write two joined sentences of your own about your week, one with although and one with because." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What I did last week",
        prompt: "Talk about your week and how you help your school, your home or the Earth. Say what you usually do, what you did last week and what you are doing now. Give a reason for at least two actions and an example.",
        length: "90-120 seconds",
        steps: [
          "Choose three things: one you usually do, one you did last week and one you are doing now. Write three key words for each, not full sentences.",
          "Practice twice with a timer. Aim for 90 to 120 seconds, and do not read from a script.",
          "Record it once. Look at the camera and speak clearly.",
          "Before you send it, check: did you give a reason and an example for what you said?",
        ],
        maxSeconds: 180,
        kidSummary: "Say what you usually do, what you did last week and what you are doing now, and give a reason and an example for what you say.",
        words: ["recycle", "reuse", "paper", "bottle", "went", "cleaned", "although"],
        grammar: ["We usually ___ on ___.", "Last week I went / cleaned / reused ... (past)", "Now I'm ___ing.", "I did it because ___. For example, ___."],
        rubric: [
          { label: "Three times", description: "Talks about usually, last week and now, in three clear parts.", weight: 3 },
          { label: "Reasons and examples", description: "Gives at least two reasons or examples with because, so, although or for example.", weight: 3 },
          { label: "Past verbs", description: "Uses went, cleaned or reused for last week; the -ed can be heard.", weight: 2 },
          { label: "Keeps going", description: "Talks for 90-120 seconds without long stops, in whole sentences.", weight: 2 },
          { label: "Topic words", description: "Uses words from the unit: paper, bottle, bin, reuse, recycle.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["We usually ___.", "Last week I ___.", "Now I'm ___ing."], tips: ["Keep your key words in front of you and look at them, not at a script."] },
          { level: "Core", who: "Most students", frames: ["We usually recycle ___ on ___ because ___.", "Last week I went to ___. I cleaned / reused ___.", "Now I'm ___ing, so ___."], tips: ["Say a time word in each part and give one reason in each part."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although I ___, I ___.", "Next time I want to ___ because ___. For example, ___."], tips: ["Give a contrast, then say what you want to do next and why."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u12-l5": {
      objectives: ["I can explain why a natural resource is important and what we should do to take care of it, with reasons and examples."],
      drop: ["Tidy-up chant", "Stand up, sit down: true or false?"],
      trim: { "Act it out in groups of three": 10, "Walk around the room: say one thing (SB 125 D)": 5 },
      add: [
        {
          after: "Act it out in groups of three",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence about natural resources fast and right: ask it, say no, join it with a reason, change the person or the time. Then talk about what your family should do.",
            chunks: [
              "Water is an important natural resource because every living thing needs it.",
              "We should turn off the tap while we brush our teeth, so we don't waste water.",
              "Should we cut down trees to make paper? No, we shouldn't, because forests give us clean air.",
              "We use trees to make paper, and we use oil to make plastic, but oil will run out one day.",
              "Last year my school planted fifty trees, so the yard is cooler now.",
              "What should people in your city do to take care of the Earth, and why?",
            ],
            recycle: ["We usually recycle paper on Fridays.", "Is there a bin in front of the gate? No, there isn't."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence about a natural resource and shows a sign card, B changes it. Swap at the clap. Change the person too: we, you, my school, people." },
              { seconds: 90, say: "Real talk: ask your partner what their family does, or should do, to save water, paper or energy. Answer in full, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Is, Should or Do, X = isn't, shouldn't or don't, + = join with because, although or so, T = now or next year, P = a new person.",
              "Say the WHOLE new sentence, with is for one thing, are for more than one, and a plain verb after should.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out how your partner's family saves water, paper or energy, and remember one answer to tell the class.",
            ],
            prompts: ["Water is important. (?)", "We should take care of trees. (X)", "We use paper every day. (+ because)", "Trees give us shade. (+ although)", "My school planted trees. (T: next year)", "I should turn off the lights. (P: they)"],
            feedback: drillFix("For 'We should to take care' point to 'should' and say 'plain verb?'. For 'Water are important' hold up one finger and say 'Water ...?'. For 'We shouldn't wasted' tap the table and repeat it with a rising voice. Say the final -s of 'resources' and the t of 'shouldn't' clearly yourself."),
            teacherNote: "This lesson has no grammar slide, so the drill takes the lesson's key structures ('___ is an important natural resource', 'We use ___ to ___', 'We should ___ because ___') and mixes in earlier time and place language. The thinking is in the reason and the opinion. Typical slips: 'Water are', 'We should to' and a missing -s on 'resources'. Round 3 is the point: real habits of a real family.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Should we ___?", "We shouldn't ___."] },
              { level: "Core", task: "Change every sentence with all five signs and a new person each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'We should save water, but many people forget because it is cheap. What do you think we should do?'" },
            ],
          },
        },
        {
          after: "Plan your collage: choose a natural resource (SB 125 B)",
          slide: {
            kind: "writing",
            title: "A natural resource: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, first, also, however, 'We should' and the closing sentence.",
              "Plan: write a few words in each box about the natural resource of your collage. Say one sentence for each box to your partner.",
              "Write: six to eight sentences. Use linking words (first, also, however, because, for example, in conclusion) and give a reason for what we should do.",
              "Check: tick the checklist. Your partner underlines every is / are and every 'should' sentence.",
              "Teacher: look first at is / are, 'should' and the linking words. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: trees",
              text: "Trees are one of our most important natural resources. First, they give us oxygen, which we need to breathe. Also, we use wood to make paper, furniture and even musical instruments. For example, the notebook on your desk probably began as a tree. However, forests get smaller when people cut down too many trees. We should recycle paper and plant new trees because every tree helps the air. In conclusion, if we take care of trees, they will take care of us.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which natural resource do you write about, and why is it important?" },
              { label: "How we use it", prompt: "How do people use it? Give an example. (First ... Also ...)" },
              { label: "A problem", prompt: "What can go wrong? (However ...)" },
              { label: "What we should do", prompt: "What should we do to take care of it, and why? (We should ... because ...)" },
              { label: "Closing", prompt: "What is your final idea? (In conclusion ...)" },
            ],
            frames: ["___ is an important natural resource because ___.", "We use ___ to ___. For example, ___.", "However, ___.", "We should ___ because ___.", "In conclusion, ___."],
            checklist: [
              "Six to eight sentences, each with a capital letter and a full stop",
              "is for one thing and are for more than one (Water is, Trees are)",
              "We should + the plain verb (We should recycle, not 'recycles' or 'to recycle')",
              "At least three linking words, for example first, also, however, because, for example, in conclusion",
            ],
            sayIt: "Show your collage to your partner and tell your paragraph from your boxes, without reading it word for word.",
            teacherNote: "An explanation paragraph for grades 6-7 that doubles as the script for the collage talk and the video. Water is one thing (is), trees are many (are): a quick chance to practice be with a plural subject, where Vietnamese speakers often say 'Trees is'. Mark only the topic sentence, is / are, 'should' and the linking words.",
            tiers: [
              { level: "Support", task: "Copy the model and change the resource and the details.", frames: ["___ is an important natural resource.", "We use ___ to ___.", "We should ___ because ___."] },
              { level: "Core", task: "Write six sentences: topic, use, problem, what we should do, closing." },
              { level: "Stretch", task: "Write eight sentences with a second example and an 'although' sentence." },
            ],
          },
        },
        {
          after: "Tell the class about your collage (SB 125 C)",
          slide: {
            kind: "fluency",
            title: "Collage talk: same task, new partner",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Tell about your collage twice, to two partners. Keep going, give a reason, and make it smoother the second time.",
            chunks: [
              "This is my water collage, and it shows how we use water at home, at school and on farms.",
              "Water is an important natural resource because people, animals and plants all need it.",
              "We use water to drink, to wash and to grow food, although most people don't think about it every day.",
              "We should take care of it because clean water is limited, so we shouldn't waste it.",
            ],
            recycle: ["Last week I went to the park and cleaned the benches.", "Is there a recycling bin in front of your school? Yes, there is."],
            rounds: [
              { seconds: 75, say: "Partner 1: tell about your collage (use your own resource), then Partner 2. The listener points to the part you talk about and asks one question: 'Why is it important?'" },
              { seconds: 75, say: "New partner. The same task. Keep the reason and add one example you did not give before." },
            ],
            steps: [
              "Hold your collage up. Say the four ideas in order, with your own resource.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them with the class; then go on.",
              "When the bell rings, find a new partner.",
              "Answer the listener's question with 'We should ... because ...'.",
            ],
            prompts: ["(your collage)", "Why is it important?", "What should we do?"],
            feedback: fix("point to the frame on the board, or start the phrase and pause ('We should take care ...?'). For a missing 'to' in 'We use water to drink', hold up a finger. Sounds: say 'resource' clearly (REE-sors) and let the student echo."),
            teacherNote: "Task repetition: the same task with a new listener builds fluency, because students already know what to say and put their attention on saying it smoothly. The one-minute fix between rounds adds accuracy. Listen for 'important' said clearly and for 'We should' with a plain verb (We should take care, not takes). The sample sentences use water: students use their own resource.",
            tiers: [
              { level: "Support", task: "Say the first two sentences with the frames on the board.", frames: ["This is my ___ collage.", "___ is an important natural resource because ___."] },
              { level: "Core", task: "Say all four sentences, with a reason, without looking." },
              { level: "Stretch", task: "Add a contrast and an opinion: 'Although many people think ___ is endless, I think we should ___ because ___.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u12-l6": {
      objectives: ["I can describe where things are in my neighborhood, ask Is there ...? questions and give reasons for what I think should change."],
      drop: ["Zed's clean-up relay: ask to win", "Zed says: place words"],
      trim: { "Grammar mystery: Zed and the lost bin": 5 },
      add: [
        {
          after: "Grammar: Place words, Where's ...? and Is there ...?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence about places fast and right: ask it, say no, join it with a reason, change the person or the time. Then plan a clean-up of a real place.",
            chunks: [
              "Where's the recycling center in your city? It's across from the market, next to the river.",
              "Is there a park near your school? No, there isn't, so we play football in the yard behind the gym.",
              "There wasn't a bin in front of the gate last year, so students left their trash on the ground.",
              "Although the library is between the bank and the bakery, a lot of people don't notice it.",
              "Last weekend my friends and I cleaned the area under the bridge because there was a lot of litter.",
              "Is there anything in your neighborhood that you would like to change? Why?",
            ],
            recycle: ["We usually recycle paper on Fridays.", "Water is an important natural resource."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence about a place and shows a sign card, B changes it. Swap at the clap. Change the person too: my, his, our, their." },
              { seconds: 90, say: "Real talk: plan a clean-up of a real place in your city. Say where the litter is, what there is nearby and who could help. Answer in full, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a Where or Is there question, X = isn't, aren't or didn't, + = join with because, although or so, T = now or last weekend, P = a new person.",
              "Say the WHOLE new sentence, with the right place word and the small word after it, and the right time (is / was, there is / there was).",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: plan a clean-up with your partner, and remember one idea to tell the class.",
            ],
            prompts: ["The bin is next to the gate. (?)", "There is a park near my house. (X)", "The shop is across from the school. (+ because)", "The bottle is under the bench. (T: yesterday)", "My bag is behind the door. (P: his)", "There is a café between the bank and the bookstore. (+ although)"],
            feedback: drillFix("For 'Where the bin is?' point to 'Where's' on the board. For 'behind of' or 'next the', hold up a finger for the extra or missing word. For 'There have a bin', say 'There ...?' with a rising voice. For 'Last weekend we clean' tap your wrist and wait. Say the final t of 'isn't' and the -ed of 'cleaned' clearly yourself."),
            teacherNote: "The grammar slide has just been taught, so the drill mixes the unit's place words and Is there ... questions with the past (there was, we cleaned) and with joining words. Students in grades 6-7 can change a sentence in two ways at once if the first change is a chunk they know. Round 3 is the point: a real place, a real problem and a real plan.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Is there a ___ ___ the ___?", "No, there isn't."] },
              { level: "Core", task: "Change every sentence with all five signs and a new person each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'There isn't a bin in front of our gate, but there is one across from it. Why don't students use it?'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Units 11 and 12",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: [
              "Where's the recycling box? It's behind the tree, between the gate and the bench.",
              "Is there a bottle under the bench? No, there isn't, but there's a carton in front of the bin.",
              "The shop is across from the park, so I stop there after school.",
              "Last week we collected litter, and although it was hard work, we felt proud.",
              "I think a clean park is important because everyone uses it.",
            ],
            recycle: ["I keep my diary on the shelf because it is private.", "We usually recycle paper on Fridays."],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a picture, the class says the sentence." },
              { seconds: 60, say: "Left side asks, right side answers with a reason. Then swap." },
              { seconds: 60, say: "Champion round: one student at a time, as fast and as accurately as you can!" },
            ],
            steps: [
              "Watch the picture. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumb down and say the sentence the right way.",
              "Teacher: after round 1, stop for one minute. Put the two mistakes you heard most on the board and fix them; then go on.",
            ],
            feedback: fix("start the phrase and pause ('No, there is...?'), or point to the frame. For 'behind of' or 'next the' hold up a finger for the missing or extra word. Sounds: say 'isn't' and 'there's' clearly and let the student echo."),
            teacherNote: "A quick recall of Units 11 and 12 together: mixing old and new phrases (spaced retrieval) keeps last unit's place words from fading. The sentences have a reason or a contrast, as the rest of the lesson does. Listen for 'Where the bin is' and 'There have'.",
            tiers: [
              { level: "Support", task: "Say the sentences with the frames on the board.", frames: ["Where's the ___? It's ___ the ___.", "Is there a ___ ___ the ___?"] },
              { level: "Core", task: "Say every sentence with a reason, without the board." },
              { level: "Stretch", task: "Change each sentence to your own city and add a contrast: 'Although there is a park near my house, ...'" },
            ],
          },
        },
        {
          after: "Write it: where things are",
          slide: {
            kind: "writing",
            title: "Fix it: places, times and reasons",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "These sentences about a clean-up have mistakes in them: place words, Is there answers, past verbs and a linking word.",
              "Read each sentence with your partner and find every mistake. Some sentences have two.",
              "Write each one the right way and read it aloud. Check with the model answer.",
            ],
            items: [
              { q: "The bin is behind of the tree because it is next the gate.", answer: "The bin is behind the tree because it is next to the gate." },
              { q: "Is there a bottle under the bench? Yes, it is, although it is empty.", answer: "Is there a bottle under the bench? Yes, there is, although it is empty." },
              { q: "Where the bag is? Last week I putted it between the desk and the shelf.", answer: "Where's the bag? Last week I put it between the desk and the shelf." },
              { q: "Yesterday we go to the park, and we clean the benches because they was dirty.", answer: "Yesterday we went to the park, and we cleaned the benches because they were dirty." },
              { q: "There isn't a bin in front the school, so students throwing trash on the ground.", answer: "There isn't a bin in front of the school, so students throw trash on the ground." },
            ],
            checklist: [
              "behind, next to, in front of, between: no extra and no missing small words",
              "Yes, there is. / No, there isn't. (not Yes, it is)",
              "Where's the ___? starts with Where's",
              "Past verbs are right (went, cleaned, put, were) and the linking word fits",
            ],
            sayIt: "Say all five fixed sentences to your partner, fast.",
            teacherNote: "The same slips as the rules on the board, now in longer sentences; the students are the editors. Fix sentence 1 together first. Several sentences have two mistakes, so give the pairs a minute to find both before you take answers.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 2 and 3 with the frames on the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two new sentences with a mistake each, for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A place I would change",
        prompt: "Describe a place in your neighborhood or school that could be cleaner or better. Say where it is, what there is and what there isn't, what happened there last week, and what you think should change and why.",
        length: "90-120 seconds",
        steps: [
          "Choose a real place. Write three key words for each part (where it is, what there is and isn't, what should change), not full sentences.",
          "Practice twice with a timer. Aim for 90 to 120 seconds, and do not read from a script.",
          "Record it once. Look at the camera and speak clearly.",
          "Before you send it, check: did you give a reason and an example for what you think should change?",
        ],
        maxSeconds: 180,
        kidSummary: "Describe a real place with place words, say what there is and isn't, and explain what you would change, with reasons and examples.",
        words: ["bin", "bench", "shelf", "litter", "behind", "between", "across from", "next to"],
        grammar: ["The ___ is behind / between / across from the ___.", "There is a ___. / There isn't a ___.", "Last week we ___ (past).", "I think ___ should ___ because ___."],
        rubric: [
          { label: "Place words", description: "Says where things are with behind, between, across from, next to or in front of.", weight: 3 },
          { label: "There is / isn't", description: "Says what there is and what there isn't, with there is, there are and there isn't.", weight: 2 },
          { label: "Reasons and examples", description: "Gives at least two reasons or examples for what should change, with because, so or for example.", weight: 3 },
          { label: "Past and present", description: "Says what happened last week in the past tense and what is true now in the present.", weight: 1 },
          { label: "Keeps going", description: "Talks for 90-120 seconds without long stops, in whole sentences.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["The ___ is ___ the ___.", "There is a ___. There isn't a ___.", "I would like ___ because ___."], tips: ["Point to each place on a drawing as you say it."] },
          { level: "Core", who: "Most students", frames: ["The ___ is ___ the ___, but there isn't a ___.", "Last week ___ because ___.", "I think we should ___ because ___."], tips: ["Say one thing that is NOT there, and why it is a problem."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although there is a ___, ___.", "For example, ___. If we ___, then ___."], tips: ["Give a contrast, an example, and a clear plan for change."] },
        ],
      },
    },
  },
};
