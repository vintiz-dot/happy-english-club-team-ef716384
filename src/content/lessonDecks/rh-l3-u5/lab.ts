import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Reach Higher Level 3, Unit 5 "Mysteries of Matter"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 9-10 (Jupiter,
// preparing for the grade-6 entrance exam). Every lesson gets one fluency routine (the
// lesson's exam grammar said again and again as whole sentences under gentle time
// pressure, with Unit 4's phrases mixed back in) and one writing routine in the papers'
// formats (sentence combining, fix it) or a model / dictogloss, always ending in a
// spoken step. Four lessons end with a recorded talk for home. Time comes from games,
// repeats and the longer writing slots, never from the book pages, grammar or exam
// practice. All text is original.

const fix =
  "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and let the class fix them, then go on with the next round.";

const how =
  "During a round, listen and do not stop the talk. Between rounds, fix two mistakes on the board in one minute: children who then say the same thing again use the fixed form. For grammar errors, prompt the child to correct it (start the phrase and pause, point to the frame on the board, hold up a finger for the missing word, or repeat the error with a rising voice) rather than saying it for them. For a sound, a quick recast is fine: say it right and let the child echo it. Say every final -s and -ed clearly yourself: Vietnamese speakers drop them often, and children copy what they hear. ";

export const rhL3U5Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "rh-l3-u5-l1": {
      objectives: ["I can say sentences with -ed and -ing adjectives, like 'It was amazing, so I was amazed', fast and smoothly."],
      add: [
        {
          after: "Describe it, guess it",
          slide: {
            kind: "fluency",
            title: "Amazed or amazing: sentence sprint",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say every sentence in one smooth piece, with the right ending: amazed or amazing.",
            chunks: [
              "The experiment was amazing, so I was amazed.",
              "Melting ice is interesting, so we are interested.",
              "I felt bored because the film was boring.",
              "We saw a strange tiny white crystal.",
              "She keeps rice in a big old wooden box.",
            ],
            recycle: ["Why don't we set up a stall?", "Everyone in our class wants to help.", "We enjoy working together."],
            rounds: [
              { seconds: 60, say: "Together: the teacher says the start, the class finishes the whole sentence." },
              { seconds: 60, say: "Pairs: your partner shows a picture card; say the sentence for it. Swap when you hear the clap." },
              { seconds: 45, say: "New partner. Faster: how many sentences can you say without a stop?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence about it, with a feeling and a thing: 'I was bored because the film was boring.'",
              "Listen for the clap: it means swap.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 3, stop for one minute. Put two mistakes you heard on the board (no names) and let the class fix them.",
            ],
            prompts: ["(card: a science show)", "(card: a long queue)", "(card: a strange crystal)", "(card: a quiet museum)", "(card: an old wooden box)"],
            feedback:
              how +
              "For this unit's grammar: if a child says 'I was amazing', hold up a finger and say 'I was ama...?' with a questioning face; if they say 'a plastic small cup', point along the order line on the board (size, then colour, then material). Example: child says 'The film was bored.' Teacher says 'The film was...?' and the child answers 'boring'.",
            teacherNote:
              "The -ed / -ing pairs are easy to mix up, and exam sentences often test them, so the children say both halves of each pair together in one sentence until the choice is automatic. Listen for the final -ed in 'amazed', 'bored' and 'interested': it is the sound dropped most. Mix in a Unit 4 phrase every few turns so last unit's grammar stays fast.",
            tiers: [
              { level: "Support", task: "Say each sentence with the frames and the word list on the board.", frames: ["It was ___, so I was ___.", "I was ___ because it was ___."] },
              { level: "Core", task: "Say the sentences without looking at the board." },
              { level: "Stretch", task: "Add a describing group in the right order: 'We saw a strange tiny white crystal, and we were amazed.'" },
            ],
          },
        },
        {
          after: "Exam practice: adjectives",
          slide: {
            kind: "writing",
            title: "Grow the sentence: adjective order",
            routine: "expand it",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the short sentence and the words to add.",
              "Put the describing words in the right order: opinion, size, age, shape, colour, material, then the noun.",
              "Write the long sentence. Check -ed and -ing.",
              "Plan, write, check: write a three-sentence paragraph about one thing from the mystery tray: what it looks like, what it does, and how you felt. Use one -ed word and one -ing word.",
              "Read it to your partner.",
            ],
            items: [
              { q: "We saw a crystal. (add: tiny, strange, white)", answer: "We saw a strange tiny white crystal." },
              { q: "Grandma has a pot. (add: clay, big, old)", answer: "Grandma has a big old clay pot." },
              { q: "She keeps a box on the shelf. (add: wooden, small, lovely)", answer: "She keeps a lovely small wooden box on the shelf." },
              { q: "I was ___ because the show was ___. (excited / exciting)", answer: "I was excited because the show was exciting." },
            ],
            frames: ["I was ___ because the ___ was ___.", "We saw a ___ ___ ___ ___."],
            checklist: ["-ed for how I feel, -ing for the thing", "Opinion first, then size, colour and material", "A capital letter and a full stop"],
            sayIt: "Read your long sentence to your partner, then say it again without looking.",
            teacherNote: "Adjective order is learned by use, not by rule, so say the first item aloud with the class before they write. Two common slips: 'a plastic small blue cup' and 'I am boring' (for 'I am bored').",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the order line on the board, then write one sentence about the tray." },
              { level: "Core", task: "Do all four items, then write the three-sentence paragraph." },
              { level: "Stretch", task: "Write a four-sentence paragraph with a long sentence of three describing words in order." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "rh-l3-u5-l2": {
      objectives: ["I can give a weather report with 'so ... that' and 'such a ... that', three times, faster each time."],
      trim: { "Write: which melts fastest?": 9 },
      add: [
        {
          after: "Weather reporters: so cold that ...",
          slide: {
            kind: "fluency",
            title: "Weather report: say it three times",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same weather report to three partners. Each report is smoother and faster.",
            chunks: [
              "It was so cold that the water froze.",
              "It was such a hot day that the road felt soft.",
              "The snow was so deep that we couldn't open the door.",
              "Ice cream melts more quickly in Hà Nội than in Sa Pa.",
              "The ice melted faster in the sun.",
            ],
            recycle: ["You mustn't touch the hot pot.", "We should use less water.", "Farmers have to harvest the rice."],
            rounds: [
              { seconds: 60, say: "Partner 1: give your weather report (four sentences). The listener counts the 'that' sentences." },
              { seconds: 45, say: "New partner: the same report in less time." },
              { seconds: 40, say: "New partner: fast and smooth! The listener says one thing they liked." },
            ],
            steps: [
              "Choose a weather card. Make a report with four sentences: a so sentence, a such a sentence, a faster / more slowly sentence, and one more.",
              fix,
              "When the bell rings, move to a new partner. Same report, less time.",
              "The listener's job: count the 'that' sentences and give a thumbs up for each.",
            ],
            prompts: ["(card: a freezing morning in Sa Pa)", "(card: a very hot afternoon)", "(card: a heavy storm)"],
            feedback:
              how +
              "For this unit's grammar: if a child says 'so a hot day', point to the board where 'such a' sits before the noun and pause: 'It was such a...?'. If they say 'more fast', hold up a finger and say 'It melted...?' and let them say 'faster'. Example: child says 'It was such cold that the water froze.' Teacher says 'It was so...?' and points to the adjective, and the child says 'so cold that'.",
            teacherNote:
              "The same report to three listeners is task repetition: the second and third tellings are faster because the children are no longer searching for the words. The one-minute fix between round 1 and round 2 is what adds accuracy; without it the children only get quicker at their mistakes. Listen for 'so' with an adjective and 'such' with a noun, and for the final -d of 'froze' and 'melted'.",
            tiers: [
              { level: "Support", task: "Make a report of three sentences with the frames.", frames: ["It was so ___ that ___.", "It was such a ___ day that ___."] },
              { level: "Core", task: "Make a four-sentence report without the frames." },
              { level: "Stretch", task: "Add a comparison with 'than': 'Water freezes more slowly in Hà Nội than in Sa Pa.'" },
            ],
          },
        },
        {
          after: "Exam practice: join and rewrite",
          slide: {
            kind: "writing",
            title: "Join them: so ... that, such ... that",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 7,
            steps: [
              "Read the two short sentences.",
              "Join them into ONE sentence with so ... that, such ... that or the comparison word. Say it first, then write it.",
              "Check your partner's sentence. Read it aloud together.",
              "Plan, write, check: on your own, write a four-sentence weather report paragraph: where, how hot or cold, what happened because of it, and one comparison. Check it with the checklist.",
            ],
            items: [
              { q: "The soup was hot. I couldn't drink it. (so ... that)", answer: "The soup was so hot that I couldn't drink it." },
              { q: "It was a cold morning. The puddles froze. (such ... that)", answer: "It was such a cold morning that the puddles froze." },
              { q: "The ice melted quickly. We could not catch it. (so ... that)", answer: "The ice melted so quickly that we could not catch it." },
              { q: "The chocolate melted fast. The candle melted slowly. (faster than)", answer: "The chocolate melted faster than the candle." },
            ],
            frames: ["It was so ___ that ___.", "It was such a ___ day that ___."],
            checklist: ["so + adjective or adverb; such a + noun", "'that' joins the two parts", "A capital letter and a full stop"],
            sayIt: "Read your four sentences to your partner, then say two of them again without looking.",
            teacherNote: "These are the papers' sentence-transformation format in the school's own sentences. Do item 1 together first, saying the whole joined sentence before anyone writes. Watch for 'so a hot day' and 'such deep'.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames." },
              { level: "Core", task: "Do all four items, then write the four-sentence report." },
              { level: "Stretch", task: "Write a five-sentence report with one 'so ... that' and one 'such a ... that'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My extreme weather report",
        prompt: "Be a weather reporter. Tell us about the hottest or the coldest day you remember, and what happened because of it.",
        length: "60-90 seconds",
        steps: [
          "Plan your report: where, when, how hot or cold, and what happened.",
          "Say your report three times to a family member or a toy, a little faster each time, like in class.",
          "Record it once in a reporter's voice.",
          "Watch it back and tick one thing you did well.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell about an extreme day with 'so ... that' and 'such a ... that', and keep talking without long stops.",
        words: ["freeze", "melt", "boiling", "freezing", "deep", "quickly", "slowly"],
        grammar: ["so ... that", "such a ... that", "faster / more slowly than"],
        rubric: [
          { label: "so / such ... that", description: "Uses at least two 'so ... that' or 'such a ... that' sentences correctly.", weight: 3 },
          { label: "Comparing", description: "Says one comparison with faster, more slowly or more quickly than.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The final sounds -ed and -s can be heard (froze, melted, days).", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It was so ___ that ___.", "It was such a ___ day that ___."], tips: ["Say two sentences, then add a third."] },
          { level: "Core", who: "Most children", frames: ["It was so ___ that ___. It was such a ___ day that ___.", "The ___ melted faster than the ___."], tips: ["Say what happened to the water, the ice or the road."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It was so ___ that ___, so we ___.", "In ___, it ___ more slowly than in ___."], tips: ["Compare two places, and say what people did."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "rh-l3-u5-l3": {
      objectives: ["I can say what I was doing when something happened, with 'while' and 'when', in a 4-3-2 talk."],
      add: [
        {
          after: "Alibi game: what were you doing?",
          slide: {
            kind: "fluency",
            title: "Alibi 4-3-2: what were you doing?",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story about your afternoon to three partners, in less time each time.",
            chunks: [
              "I was reading when the phone rang.",
              "While I was stirring the soup, my brother was setting the table.",
              "We were playing outside when it started to rain.",
              "What were you doing when the lights went out?",
              "They weren't watching TV; they were doing homework.",
            ],
            recycle: ["How about asking Mum to help?", "Each of the sisters has a different job.", "Don't give up!"],
            rounds: [
              { seconds: 120, say: "Partner 1: tell your alibi: what you and your friends were doing at four o'clock. The listener asks one follow-up question." },
              { seconds: 90, say: "New partner: the same alibi in less time." },
              { seconds: 60, say: "New partner: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Plan your alibi: where you were, what you were doing, what happened.",
              fix,
              "When the bell rings, move to a new partner and tell it again.",
              "The listener's job: ask ONE question: 'What were you doing when ___?'",
            ],
            feedback:
              how +
              "For this unit's grammar: if a child says 'I was watch TV', point to the frame 'was + ___ing' and pause: 'I was watch...?'. If they say 'They was playing', hold up two fingers and say 'They...?' so the child says 'were'. Example: child says 'While I cooked, he was washing.' Teacher says 'While I was...?' and the child finishes 'cooking'.",
            teacherNote:
              "4-3-2 gives the children the same content three times with less time, so they stop searching for words and start saying chunks. Fluency grows but accuracy does not on its own, so do the one-minute fix after round 1 every time. Listen for 'was' and 'were' with the right person, and the -ing ending.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["I was ___ing when ___.", "While I was ___ing, my friend was ___ing."] },
              { level: "Core", task: "Say five sentences without the board." },
              { level: "Stretch", task: "Add what happened next with 'so' or 'because'." },
            ],
          },
        },
        {
          after: "Exam practice: give the correct form",
          slide: {
            kind: "writing",
            title: "Listen and rebuild: the power cut",
            routine: "dictogloss",
            mode: "groups",
            minutes: 7,
            steps: [
              "Listen to the text once. Do not write.",
              "Listen again. Write down key words: ___ing words, was / were, when, while.",
              "In your group, rebuild the text as close as you can. Use was or were and -ing correctly.",
              "Compare it with the original.",
              "Plan, write, check: on your own, write two sentences about a real or imagined power cut, one with 'when' and one with 'while'. Check was / were and -ing.",
            ],
            text: {
              title: "The power cut",
              text: "Last Saturday, I was making ice cream with my brother when the lights went out. While we were waiting for the power to come back, our grandmother was telling us a story by candlelight. The ice cream was melting, so we ate it quickly. It was the best power cut ever!",
            },
            frames: ["I was ___ing when ___.", "While we were ___ing, ___ was ___ing."],
            checklist: ["was / were matches the person", "-ing after was or were", "when with the short action, while with the long one"],
            sayIt: "Read your group's text aloud together, then retell it in your own words without looking.",
            teacherNote: "Remind the class of the rule in one minute before reading: long action in -ing, short action in the past simple. Read the text twice at normal speed. In the check, look for was / were and the -ing endings, not for spelling.",
            tiers: [
              { level: "Support", task: "Write key words and the first two sentences with the frames." },
              { level: "Core", task: "Rebuild the whole text, then write your two sentences." },
              { level: "Stretch", task: "Rebuild it, then write a four-sentence paragraph about your own power cut." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "rh-l3-u5-l4": {
      objectives: ["I can retell how an object was found and kept, using the past passive, three times, faster each time."],
      trim: { "Write: a museum label": 12, "Generalize: what causes matter to change?": 13 },
      add: [
        {
          after: "Generalize: what causes matter to change?",
          slide: {
            kind: "fluency",
            title: "Museum story: retell it three times",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Retell how a museum object was found, kept and studied. Each telling is shorter and smoother.",
            chunks: [
              "The bone was found by a young girl.",
              "It was kept in ice for many years.",
              "The bones were studied by scientists.",
              "Was it found in the mud? Yes, it was.",
              "It was taken to a museum in the city.",
            ],
            recycle: ["If I were a farmer, I would keep ducks.", "Both of them are on the team.", "We should use less water."],
            rounds: [
              { seconds: 90, say: "Tell your partner the story of the object from the three picture cards: found, kept, studied." },
              { seconds: 60, say: "New partner: tell it again in less time." },
              { seconds: 45, say: "New partner: fast and smooth! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for found, two for kept, three for studied or shown.",
              fix,
              "When the bell rings, find a new partner and tell the story again.",
              "The listener's job: count the passive sentences ('was found', 'were studied') and ask one question: 'Where was it ...?'",
            ],
            prompts: ["(card: a young girl digging)", "(card: a block of ice)", "(card: scientists with a microscope)"],
            feedback:
              how +
              "For this unit's grammar: if a child says 'It was find', hold up a finger and pause: 'It was fou...?'. If they say 'The bones was studied', hold up two fingers: 'The bones...?' and let them say 'were'. If they say 'discovered from a scientist', point to 'by' on the board. Example: child says 'The mammoth was keep in ice.' Teacher says 'It was ke...?' and the child says 'kept'.",
            teacherNote:
              "Retelling the same story to new partners is the retell routine: the second and third tellings are faster because the plot is fixed and the children can put all their attention on the passive form. The one-minute fix matters most here: irregular participles (found, kept, taken, made) are learned by saying them in the whole sentence. Say the final -ed of 'studied' and 'discovered' clearly yourself.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence with the frame.", frames: ["It was ___ by ___.", "It was kept in ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add a question and answer: 'Was it found in the sea? No, it wasn't.'" },
            ],
          },
        },
        {
          after: "Exam practice: find the mistake",
          slide: {
            kind: "writing",
            title: "Fix it: the museum labels",
            routine: "fix it",
            mode: "pairs",
            minutes: 7,
            steps: [
              "Each museum label has one mistake in the passive.",
              "Find the mistake and say what is wrong: was or were? the verb form? by?",
              "Write the label the right way. Read it aloud together.",
              "Plan, write, check: write a four-sentence label for an object of your own: what it is, where it was found, how it was kept, who studied it. Check the three things on the checklist.",
            ],
            items: [
              { q: "The bones was studied by scientists.", answer: "The bones were studied by scientists." },
              { q: "The box was find in the attic.", answer: "The box was found in the attic." },
              { q: "The picture was painted from my grandfather.", answer: "The picture was painted by my grandfather." },
              { q: "The cups was made of clay.", answer: "The cups were made of clay." },
            ],
            frames: ["It was ___ by ___.", "They were ___ in ___."],
            checklist: ["was with one thing, were with more than one", "A past participle after was or were (found, made, kept)", "by before the person who did it"],
            sayIt: "Read your four fixed labels to your partner, then say two of them without looking.",
            teacherNote: "The mistakes are the typical ones listed on the unit's grammar page. Do item 1 together and say why. Do not teach new rules today: only the three on the checklist.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 3 with the frames, then write two label sentences." },
              { level: "Core", task: "Fix all four labels, then write your four-sentence label." },
              { level: "Stretch", task: "Write your label, then add one wrong sentence for your partner to find and fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A museum guide talk",
        prompt: "Be a museum guide. Tell us about an old thing from home or from a story: where it was found, how it was kept and who studied it.",
        length: "60-90 seconds",
        steps: [
          "Choose your object and draw it or find a picture.",
          "Plan: found, kept, studied. Say your talk three times, a little faster each time.",
          "Record it once in a guide's voice.",
          "Watch it back and tick one thing you did well.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell about an object with the past passive (was found, was kept, were studied) and keep talking without long stops.",
        words: ["museum", "ice", "bone", "scientist", "discover", "preserve"],
        grammar: ["was / were + past participle", "by + the person who did it"],
        rubric: [
          { label: "Passive sentences", description: "Uses at least three correct passives with was or were and a past participle.", weight: 3 },
          { label: "Story order", description: "Tells where it was found, how it was kept and who studied it.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The final -ed in studied and discovered and the -s in bones can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It was found ___.", "It was kept ___."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["It was found by ___ in ___.", "It was kept in ___.", "It was studied by ___."], tips: ["Say who and where in each sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Was it found in ___? Yes, it was.", "It was ___ years before it was ___."], tips: ["Ask your viewer a question and answer it."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "rh-l3-u5-l5": {
      objectives: ["I can ask and answer how long things take and how people spend time, fast, in a question chain."],
      trim: { "Write: a page for a travel guide": 11 },
      add: [
        {
          after: "Wetland guide: describe, time, evaluate",
          slide: {
            kind: "fluency",
            title: "How long does it take? Question chain",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops.",
            chunks: [
              "How long does it take you to walk to school?",
              "It takes me ten minutes to walk to school.",
              "We spent an hour watching the birds.",
              "It is impossible to cross the mud.",
              "The path is unsafe, so please stay on it.",
            ],
            recycle: ["The bridge was built by farmers.", "While I was walking, it started to rain.", "It was so wet that we couldn't go."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a place card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'How long does it take to get to the ___?'",
              "They answer: 'It takes about ___ to ___.' Then they add one thing people spend time doing there and turn to ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["How long does it take to ___?", "What do visitors spend time doing?"],
            feedback:
              how +
              "For this unit's grammar: if a child says 'I spent two hours to do it', hold up a finger and pause: 'I spent two hours do...?' and let them say 'doing'. If they say 'It takes me ten minutes walk', point to 'to' on the board: 'It takes me ten minutes ... walk?' Example: child says 'It is unpossible.' Teacher says 'It is im...?' and the child says 'impossible'.",
            teacherNote: "The chain makes every child ask and answer many times in a few minutes, which is what makes 'It takes ... to' and 'spend ... -ing' automatic. Time the whole circle and tell them; children love beating their own time. Listen for 'takes' with its -s and 'spent' with its final -t.",
            tiers: [
              { level: "Support", task: "Answer with the frame and pass the question on.", frames: ["It takes about ___ to ___.", "We spent ___ ___ing ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a sentence with 'unsafe' or 'impossible', and a 'so' result." },
            ],
          },
        },
        {
          after: "Exam practice: it takes and spend",
          slide: {
            kind: "writing",
            title: "Plan, write, check: a wetland page",
            routine: "model, then write",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Find where the time is, and what visitors spend time doing.",
              "Plan in three boxes: place, time, warning.",
              "Write your own short guide page with the frames.",
              "Check with the checklist.",
            ],
            text: {
              title: "Welcome to Green Lake Wetland",
              text: "Welcome to Green Lake Wetland! It is an unusual place, where the ground is soft and the water is shallow. It takes about twenty minutes to walk along the wooden path. Visitors usually spend an hour watching the birds. It is unsafe to step off the path, so please stay on it.",
            },
            frames: ["Welcome to ___, an unusual place where ___.", "It takes about ___ to ___.", "Visitors spend ___ -ing ___.", "It is unsafe to ___, so please ___."],
            checklist: ["It takes ... to + verb; spend ... + verb-ing", "A word with un-, in- or im- (unsafe, impossible)", "A capital letter and a full stop"],
            sayIt: "Read your page to your partner like a guide, then say it again without looking.",
            teacherNote: "Model, then write is the plan-write-check strategy in small steps: the three-box plan stops children from starting to write with no idea. The model uses both unit structures once; the checklist makes the children look for them in their own writing.",
            tiers: [
              { level: "Support", task: "Write three sentences using the first three frames." },
              { level: "Core", task: "Write a short page of four or five sentences." },
              { level: "Stretch", task: "Add a second warning and a sentence with 'so ... that'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "rh-l3-u5-l6": {
      objectives: ["I can say what always happens and what will happen with 'if', 'as soon as' and 'unless', fast and smoothly."],
      add: [
        {
          after: "Science show hosts",
          slide: {
            kind: "fluency",
            title: "If you ..., it ...: sentence sprint",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole 'if' sentence in one breath: the first part, then the result.",
            chunks: [
              "If you heat ice, it melts.",
              "If you add salt, the ice melts faster.",
              "If it rains, the path will flood.",
              "As soon as the water boils, I will add the noodles.",
              "Unless you stir it, it won't be smooth.",
            ],
            recycle: ["If I were a farmer, I would keep ducks.", "You should wear boots.", "Why don't we set up an experiment?"],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "New partner. Faster! How many sentences can you say without a stop?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence, with 'if' or 'as soon as' at the start.",
              "Listen for the clap: it means swap.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 3, play 'Fix the science show': two mistakes you heard go on the board and the class fixes them in one minute.",
            ],
            prompts: ["(card: ice in the sun)", "(card: butter in a pan)", "(card: a storm)", "(card: boiling water)", "(card: stirring sand)"],
            feedback:
              how +
              "For this unit's grammar: if a child says 'If it will rain', point to the board and pause: 'If it ra...?'. If they say 'When the water will boil', hold up a finger for the present tense: 'When the water boi...?'. If they say 'Unless you don't stir', raise your voice on 'don't' and let them hear 'Unless you ...?'. Example: child says 'If you heat ice, it melt.' Teacher says 'it mel...?' and the child says 'melts'.",
            teacherNote: "Short, high-energy and the same pattern again and again: this is how 'if + present, will + verb' stops being a rule and becomes a habit. Keep the picture cards moving. Listen for the -s on 'melts' and 'boils', which Vietnamese speakers often drop, and say it clearly yourself.",
            tiers: [
              { level: "Support", task: "Say each sentence with the frames on the board.", frames: ["If you ___, it ___.", "If it ___, it will ___."] },
              { level: "Core", task: "Say the sentences without looking at the board." },
              { level: "Stretch", task: "Add 'unless' or 'as soon as': 'Unless you stir it, it won't mix.'" },
            ],
          },
        },
        {
          after: "Exam practice: make sentences from cues",
          slide: {
            kind: "writing",
            title: "Join them: if, as soon as, unless",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 7,
            steps: [
              "Read the two short sentences.",
              "Join them into ONE sentence with the joining word in brackets. Say it first, then write it.",
              "Check the verb form: no 'will' after if, when, as soon as or unless.",
              "Plan, write, check: write a three-sentence science-show script: one 'if' sentence for what always happens, one 'as soon as' sentence and one 'unless' sentence.",
            ],
            items: [
              { q: "You heat butter. It melts. (if)", answer: "If you heat butter, it melts." },
              { q: "The water boils. I will add the rice. (as soon as)", answer: "As soon as the water boils, I will add the rice." },
              { q: "It rains tomorrow. We will stay home. (if)", answer: "If it rains tomorrow, we will stay home." },
              { q: "You don't stir the mixture. It will be lumpy. (unless)", answer: "Unless you stir the mixture, it will be lumpy." },
            ],
            frames: ["If ___, ___.", "As soon as ___, ___ will ___.", "Unless ___, ___ won't ___."],
            checklist: ["Present tense after if, as soon as and unless", "will / won't only in the result", "A comma after the first part"],
            sayIt: "Read your four sentences to your partner, then say two without looking.",
            teacherNote: "Sentence combining in the papers' format, in the school's own sentences. 'Unless' already means 'if not', so item 4 starts with 'You don't stir' but the answer has no 'don't': say the correct and the wrong one aloud before writing.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames." },
              { level: "Core", task: "Do all four items, then write the three-sentence script." },
              { level: "Stretch", task: "Write a five-sentence script about the wetland or the kitchen, with one 'unless' sentence." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My kitchen science show",
        prompt: "Be a science show host. Show or draw a simple change at home (ice, butter, rice, water) and tell us what always happens and what will happen next.",
        length: "60-90 seconds",
        steps: [
          "Choose a change to talk about. Ask a grown-up if you need help to find it.",
          "Plan: what always happens, what will happen next, what to do.",
          "Say your show three times, a little faster each time. Record it once.",
          "Watch it back and tick one thing you did well.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what always happens (If you heat ..., it ...) and what will happen (If ..., it will ...), and keep talking without long stops.",
        words: ["melt", "boil", "freeze", "heat", "stir", "mixture"],
        grammar: ["If + present, present", "If / as soon as + present, will + verb", "unless"],
        rubric: [
          { label: "If sentences", description: "Uses at least three correct 'if', 'as soon as' or 'unless' sentences, with no 'will' after if.", weight: 3 },
          { label: "What happens", description: "Says what always happens and what will happen next.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of melts, boils and freezes can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["If you ___, it ___.", "If it ___, it will ___."], tips: ["Show the thing as you talk."] },
          { level: "Core", who: "Most children", frames: ["If you ___, it ___. As soon as ___, it will ___.", "Unless you ___, it won't ___."], tips: ["Say one thing that always happens and one that will happen."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["What happens if ___? ___", "If we ___, we will see ___."], tips: ["Ask your viewer a question and answer it."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 7
    "rh-l3-u5-l7": {
      objectives: ["I can talk about a book I like with 'mine', 'hers' and 'the children's', three times, faster each time."],
      trim: { "Draft and edit the literary response": 20, "Book talk: convince me to read it": 6 },
      add: [
        {
          after: "Book talk: convince me to read it",
          slide: {
            kind: "fluency",
            title: "Book talk 4-3-2: convince three friends",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same book talk to three partners, in less time each time.",
            chunks: [
              "This book is mine, and that one is hers.",
              "The story's hero is a girl who loves science.",
              "The children's idea was better than ours.",
              "My friend asked me why I liked the book.",
              "The best part is the end, because it is surprising.",
            ],
            recycle: ["If you heat ice, it melts.", "It takes about ten minutes to read a chapter.", "The bones were studied by scientists."],
            rounds: [
              { seconds: 90, say: "Partner 1: convince your partner to read your book. The listener asks one question: 'Why do you like it?'" },
              { seconds: 60, say: "New partner: the same book talk in less time." },
              { seconds: 45, say: "New partner: fast and smooth! The listener says whether they want to read it." },
            ],
            steps: [
              "Plan: the book, the best part, and one reason.",
              fix,
              "When the bell rings, move to a new partner and give the talk again.",
              "The listener's job: ask ONE question with 'why' and report it later: 'My partner asked me why ___.'",
            ],
            feedback:
              how +
              "For this unit's grammar: if a child says 'The book is her', point to the board and pause: 'The book is her...?' and let them say 'hers'. If they say 'it's tail', say 'its' without an apostrophe and write both on the board. If they say 'my two brother's bikes', hold up two fingers for two brothers and point to where the apostrophe goes. If they say 'She asked me where did I live', repeat it with a rising voice and then ask 'She asked me where I...?'. Example: child says 'This pen is mine, and that is her.' Teacher says 'that one is...?' and the child says 'hers'.",
            teacherNote: "The same talk three times, shorter each time, is 4-3-2 scaled for ten-year-olds. The new partner keeps the repetition real. The book talk uses the possessives the papers test and the reported question of the stretch lesson, so the grammar is spoken before it is written. The possessive 's and the plural -s sound the same, so ask 'whose?' to check what the child meant.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["This book is ___.", "The best part is ___ because ___."] },
              { level: "Core", task: "Say four or five sentences without the board." },
              { level: "Stretch", task: "Add a reported question: 'My partner asked me if I wanted to read it.'" },
            ],
          },
        },
        {
          after: "Exam practice: possessives",
          slide: {
            kind: "writing",
            title: "Fix it: whose is it?",
            routine: "fix it",
            mode: "pairs",
            minutes: 7,
            steps: [
              "Each sentence has one mistake: an apostrophe, its / it's, mine / hers or a reported question.",
              "Find it, say what is wrong, and write the sentence the right way.",
              "Read it aloud together.",
              "Plan, write, check: write a three-sentence book review with one possessive ('s or s') and one reported question ('My partner asked me why ...'). Check it with the checklist.",
            ],
            items: [
              { q: "The dog wagged it's tail.", answer: "The dog wagged its tail." },
              { q: "This pen is her.", answer: "This pen is hers." },
              { q: "My two brother's bikes are new.", answer: "My two brothers' bikes are new." },
              { q: "The childrens experiment was fun.", answer: "The children's experiment was fun." },
              { q: "She asked me where did I live.", answer: "She asked me where I lived." },
            ],
            frames: ["The ___'s ___.", "The ___s' ___.", "She asked me where I ___."],
            checklist: ["One owner: 's. Many owners: s'", "its has no apostrophe for 'belonging'", "A reported question has statement order, no 'did'"],
            sayIt: "Read your five fixed sentences to your partner, then say two without looking.",
            teacherNote: "Keep the correction focused: the three points on the checklist cover all five items, so do not add more. Do item 1 together and say why.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 3 with the frames, then write one book sentence." },
              { level: "Core", task: "Fix all five, then write the three-sentence review." },
              { level: "Stretch", task: "Write the review, then add two wrong sentences for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 8
    "rh-l3-u5-l8": {
      objectives: ["I can ask and answer 'Have you ever ...?' and say what I have already, just or never done, fast."],
      trim: { "Transfer: test our big idea": 14, "Video case: matter is everywhere": 8, "Mock review: explain the answers": 9 },
      add: [
        {
          after: "Mock review: explain the answers",
          slide: {
            kind: "fluency",
            title: "Have you ever ...? Question chain",
            routine: "question chain",
            mode: "whole",
            minutes: 5,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops.",
            chunks: [
              "Have you ever seen snow?",
              "No, I haven't. I have never seen snow.",
              "I have already finished my homework.",
              "The ice hasn't melted yet.",
              "I have just washed my hands.",
            ],
            recycle: ["If you heat ice, it melts.", "The bones were studied by scientists.", "While I was cooking, he was washing up."],
            rounds: [
              { seconds: 60, say: "Slow chain round the circle. Everyone holds an experience card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Have you ever ___?'",
              "They answer: 'Yes, I have. I have ___.' or 'No, I haven't. I have never ___.' Then they ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Have you ever ___?", "Has it ___ yet?"],
            feedback:
              how +
              "For this unit's grammar: if a child says 'I have ever seen it', point to 'never' on the board and pause: 'I have n...?'. If they say 'I have seen snow last year', hold up a finger for the finished time and say 'Last year, I...?' so they say 'saw'. If they say 'Have you finished already?', point to where 'already' goes. Example: child says 'The rice hasn't cook yet.' Teacher says 'hasn't cook...?' and the child says 'cooked'.",
            teacherNote: "The chain makes every child ask and answer many times in a short time, which is what makes 'Have you ever ...?' automatic before the wrap-up test. Keep the rule simple: ever and never with experiences, already and yet with things you expected, just for a very short time ago. Listen for 'has' with he, she and it, and the -ed on 'finished' and 'washed'.",
            tiers: [
              { level: "Support", task: "Answer with the frames and pass the question on.", frames: ["Yes, I have. / No, I haven't.", "I have never ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a past simple detail: 'Yes, I have. I saw snow in Sa Pa last winter.'" },
            ],
          },
        },
        {
          after: "Exam practice: ever, already, yet",
          slide: {
            kind: "writing",
            title: "Listen and rebuild: snow stories",
            routine: "dictogloss",
            mode: "groups",
            minutes: 7,
            steps: [
              "Listen to the text once. Do not write.",
              "Listen again. Write key words: have, has, never, already, just, yet.",
              "In your group, rebuild the text as close as you can.",
              "Compare it with the original.",
              "Plan, write, check: on your own, write three sentences about something you have never done, have already done and haven't done yet. Check have / has and the past participles.",
            ],
            text: {
              title: "Snow stories",
              text: "I have never seen snow, but my cousin has seen it many times. Last weekend she went to Sa Pa and saw it fall. She has just come back, and she has already made a small snowman! She hasn't stopped talking about the cold, and she hasn't unpacked her bag yet. Have you ever touched snow?",
            },
            frames: ["I have never ___.", "She has already ___.", "Have you ever ___?"],
            checklist: ["have / has matches the person", "A past participle after have or has", "never, already and just sit before the main verb"],
            sayIt: "Read your group's text aloud together, then retell it in your own words without looking.",
            teacherNote: "Remind the class of the rule in one minute before reading: have or has + past participle. Read the text twice at normal speed. In the check, look for has with she and the past participles, not for spelling. Contrast 'went and saw' (a finished time) with 'has seen' (no finished time).",
            tiers: [
              { level: "Support", task: "Write key words and the first two sentences with the frames." },
              { level: "Core", task: "Rebuild the whole text, then write your three sentences." },
              { level: "Stretch", task: "Rebuild it, then write a four-sentence paragraph and add one sentence with 'yet'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Have you ever ...? My interview",
        prompt: "Interview a grown-up or a toy about things they have or haven't done, then tell us one thing you have never done and one thing you have already done today.",
        length: "60-90 seconds",
        steps: [
          "Plan three 'Have you ever ...?' questions and one thing you have never done.",
          "Say your interview three times, a little faster each time.",
          "Record it once. Say 'I have never ...' and 'I have already ...' clearly.",
          "Watch it back and tick one thing you did well.",
        ],
        maxSeconds: 180,
        kidSummary: "Ask 'Have you ever ...?', answer with 'I have never ...' and 'I have already ...', and keep talking without long stops.",
        words: ["ever", "never", "already", "yet", "just", "experience"],
        grammar: ["Have you ever + past participle?", "I have never / already / just + past participle", "hasn't ... yet"],
        rubric: [
          { label: "Present perfect", description: "Uses ever, never, already, yet or just with have / has and a past participle in at least three sentences.", weight: 3 },
          { label: "Questions and answers", description: "Asks 'Have you ever ...?' and gives a short answer: 'Yes, I have.' / 'No, I haven't.'", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The final -ed and the has / have sounds can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Have you ever ___?", "I have never ___."], tips: ["Ask two questions and answer both."] },
          { level: "Core", who: "Most children", frames: ["Have you ever ___? Yes, I have. / No, I haven't.", "I have already ___. I haven't ___ yet."], tips: ["Say one thing you have already done today."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I have never ___, but I saw ___ last ___.", "Has ___ ___ yet?"], tips: ["Add one past simple detail with a finished time."] },
        ],
      },
    },
  },
};
