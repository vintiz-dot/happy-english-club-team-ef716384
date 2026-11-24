import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 14 "Music and
// Feelings" (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio
// Grade 6: children in grades 6-7 (ages 11-13) working with a book written for younger
// children, so the Lab raises the book's language: longer sentences with two clauses,
// reasons and examples, opinions with because / although / so / when, and topics they
// care about (school, friends, technology, sport, their city, plans).
// Every lesson gets a grammar drill (the unit's past-time grammar and feelings, changed
// fast with signs: ? ask it, X say no, + join it, T change the time, P change the person)
// and one more fluency routine. Three lessons write a full paragraph, the others do
// harder sentence work. Three lessons end with a recorded talk, which the children make
// on their own. Time comes from games, chants and repeats, never from the book pages,
// the vocabulary or the grammar. All text is original.

export const odL2U14Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u14-l1": {
      objectives: ["I can explain how music makes me feel, with a reason and an example, in long smooth sentences.", "I can write a paragraph about my favorite music."],
      trim: { "Mystery sounds: how does it feel?": 5, "What's missing? Pass the bag": 5 },
      drop: ["Music Says: freeze and do it", "Chant: Notes up, notes down"],
      add: [
        {
          after: "Which go together? Sort the words",
          slide: {
            kind: "fluency",
            title: "Grammar drill: feel it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the music-and-feelings sentences fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about your own life.",
            chunks: [
              "Music makes me feel calm when I study, but it makes my brother nervous.",
              "Does loud music make you feel energetic? Yes, it does. / No, it doesn't.",
              "I don't feel sleepy when I listen to fast music.",
              "Last night I felt worried because I had a test, although I tried to stay calm.",
              "My friends don't like slow songs, so they usually listen to pop.",
              "When I am nervous, I listen to music because it helps me relax.",
            ],
            recycle: ["My favorite instrument is ___ because ___.", "Fast music makes me ___."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use a new sign every time." },
              { seconds: 90, say: "Real talk: how does music make you feel on the way to school, before a test or with friends? Ask your partner, answer with the short answer, then give a reason and an example." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign and change the sentence: ? = ask it with do or does, X = say it with don't or doesn't, + = join it with because, although, so or when, T = change the time, P = change the person (I, you, he, she, we, they).",
              "Say the WHOLE new sentence. Listen for the -s on makes and for do or does in questions.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3, talk about your real life and listen to your partner's reason. Remember one idea to tell the class.",
            ],
            prompts: ["Music makes me feel calm. (?)", "I feel nervous before a test. (X)", "My friend likes rock music. (+ because)", "She listens to music on the bus. (T last week)", "I listen to pop music. (P he)"],
            feedback:
              "Prompt, do not tell. For 'Music make me feel calm' hold up one finger and say 'Music make...?' with a rising voice so the pupil adds the -s; for 'Do music makes you feel happy?' write 'Does music make...' on the board and point to the plain verb after does; for 'Although I was nervous, but I played' tap the board where 'although' and 'but' cannot sit together and let them choose one; for 'He don't like it' point to the frame 'he doesn't'. For a sound, a quick recast is fine: say 'worried' clearly and let them echo. Say your own -s and n't clearly.",
            teacherNote: "The unit's own feelings sentences are the drill, so the language is familiar and the pupils can put all their attention on the change. Grades 6-7 can take the whole set (question, short answer, negative, joining word, time, person) quickly; the sign cards keep it brisk. Round 3 makes it real: they give a reason and an example about their own life. Listen for the dropped -s in makes and for does + plain verb.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with I and you, with the frames on the board.", frames: ["Does music make you feel ___?", "Yes, it does. / No, it doesn't.", "I don't feel ___ when ___."] },
              { level: "Core", task: "Change every sentence with all five signs, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a second clause and a follow-up question: 'Slow music makes me feel calm, although it makes my brother sleepy. Does it make you sleepy?'" },
            ],
          },
        },
        {
          after: "Concerts and favorite instruments (SB 137, Think)",
          slide: {
            kind: "fluency",
            title: "Feeling sprint: music makes me ___",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole sentence about music and feelings, with a reason, fast and smooth, with no stops.",
            chunks: [
              "My favorite instrument is the guitar because it sounds warm and I can play with my friends.",
              "Fast music makes me feel energetic, so I listen to it before football practice.",
              "Slow music makes me feel calm, although it sometimes makes me sleepy.",
              "I feel worried when I wait for my results because I want to do well.",
              "In my opinion, a live concert is better than a recording because the atmosphere is exciting.",
            ],
            recycle: ["Fast music makes me ___.", "My favorite song is ___ because ___."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a situation card (before a test, on the bus, with friends, after sport) and the class says a whole sentence with a reason." },
              { seconds: 75, say: "Pairs: one shows a card, the other says a sentence with 'because' or 'although'. Swap when you hear the clap." },
              { seconds: 75, say: "Faster! New partner. Say a sentence that is new for you, with a reason that is true." },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence with a reason: 'Music makes me feel calm because it helps me forget my homework.'",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers. Try to beat your own number.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), let the class fix them, then go on.",
            ],
            prompts: ["(card: before a test)", "(card: on the school bus)", "(card: with my friends)", "(card: after football)", "(card: a live concert)"],
            feedback:
              "Listen and do not stop the talk. For grammar, prompt the child to fix it instead of saying it for them: for 'Music make me feel happy' hold up one finger and say 'Music make...?' with a rising voice so they add the -s; for 'I worried' point to the frame 'I feel ___' (the pupil needs feel or am before the feeling word); for 'because I wait' with a wrong order, point to the idea and the reason on the board. For a sound, a quick recast is fine: say 'worried' clearly and let them echo it. Say every final -s and -d clearly yourself.",
            teacherNote: "Whole sentences with a reason, never single words: that is the step up from the book. Between rounds 1 and 2 the one-minute fix is what turns speed into accuracy. Watch for a dropped -s in 'makes' and a missing 'feel' or 'am' before worried. Mix in Unit 13's 'Fast music makes me ___' cards every few turns.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say a sentence with a reason.", frames: ["Music makes me feel ___ because ___.", "I feel ___ when ___."] },
              { level: "Core", task: "Say the sentence alone, with a reason and without looking at the board." },
              { level: "Stretch", task: "Add a contrast and an example: 'Slow music makes me feel calm, although I prefer rock at a party. For example, last week I danced all night.'", frames: ["___ makes me feel ___, although ___."] },
            ],
          },
        },
        {
          after: "Draw it, say it: worried and calm",
          slide: {
            kind: "writing",
            title: "My favorite music: plan, write, check",
            routine: "paragraph",
            genre: "opinion with reasons",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the two details, the example and the closing sentence.",
              "Plan: write key words in each of the five boxes. Think of true reasons and one real example.",
              "Write: six to eight sentences. Use first, also, however, because, for example and in conclusion.",
              "Check: tick the checklist. Your partner points to every 'makes' and every 'because' or 'although' sentence.",
              "Teacher: look only at the -s in 'makes' and at the sentences with because and although. Put a dot next to a line with a mistake; the pupil finds it and fixes it.",
            ],
            text: {
              title: "Model: My favorite music",
              text: "My favorite kind of music is pop because it has a strong beat and clear words. First, it makes me feel energetic when I walk to school with my headphones on. Also, slow songs make me feel calm after a long day, although they sometimes make me sleepy. However, I don't like very loud music because it hurts my ears. For example, last month I went to a rock concert and I left early. In conclusion, I love music that matches my mood.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is your favorite music, and why do you like it? (because)" },
              { label: "Detail 1", prompt: "When does it make you feel good? Which feeling? Why?" },
              { label: "Detail 2", prompt: "Another kind of music and how it makes you feel (although)." },
              { label: "Music you don't like", prompt: "Which music do you not like, and why? Add a real example." },
              { label: "Closing", prompt: "One sentence that sums up your opinion." },
            ],
            frames: ["My favorite kind of music is ___ because ___.", "First, it makes me feel ___ when ___.", "Also, ___ makes me feel ___, although ___.", "However, I don't like ___ because ___.", "For example, ___.", "In conclusion, ___."],
            checklist: ["makes: the -s is there after 'it', 'music' and a singular subject", "because and although each join a reason or a contrast, with the right word order", "At least four linking words: first, also, however, for example, in conclusion", "A capital letter at the start and a full stop at the end of each sentence"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, with your own examples.",
            teacherNote: "A full paragraph for grades 6-7: a topic sentence, two details, a contrast and a closing, planned in five boxes. It grows the 'because' sentences of the speaking slides into connected writing. Say the -s in 'makes' clearly when you read the model. Mark only two targets and let the pupil find the mistake from your dot. Accept any music the pupil can talk about, from pop and rock to a game soundtrack.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one idea in each. Write six sentences.", frames: ["My favorite kind of music is ___ because ___.", "In conclusion, ___."] },
              { level: "Core", task: "Write six to seven sentences, one for each box and the example, with at least four linking words." },
              { level: "Stretch", task: "Write eight sentences: add a second example and compare two kinds of music.", frames: ["___ is better than ___ because ___, but ___ is useful when ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u14-l2": {
      objectives: ["I can retell Olga's story in three parts, with reasons, faster each time.", "I can write a paragraph that retells the story and gives my opinion."],
      drop: ["Music pictures: hummingbirds, rain, snow", "Feelings freeze dance", "Draw what the music looks like"],
      trim: { "Hot seat: talk to the characters": 5 },
      add: [
        {
          after: "Playing in a concert: agree or not? (SB 138-139)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: Olga's feelings, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change sentences about Olga fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about a time you felt like Olga.",
            chunks: [
              "Olga played her flute, but she was worried because she wanted to play well.",
              "Did Olga cry? Yes, she did. / No, she didn't.",
              "Olga didn't feel ready, so she stopped playing.",
              "When Mr. Perez played the recording, Olga listened carefully.",
              "Although Olga was nervous at the start, she felt calm at the end.",
              "Why did she feel calm? She felt calm because the music helped her.",
            ],
            recycle: ["Music makes me feel ___ because ___.", "I think ___ because ___."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence about Olga and shows a sign (? = ask it with did, X = say no with didn't, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: Olga, Mr. Perez, the audience, I." },
              { seconds: 90, say: "Real talk: tell your partner about a time you felt nervous before you did something in public (a talk, a match, a show). Say what happened, how you felt and why. Your partner asks one 'Did you ___?' question." },
            ],
            steps: [
              "Listen to the sentence about Olga. Look at the sign. ? = ask it with Did, X = say it with didn't, + = join with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. After did or didn't the verb stays plain: Did she cry? She didn't cry.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3, use past verbs about YOUR life: I felt, I played, I forgot, I smiled. Listen for your partner's reason.",
            ],
            prompts: ["Olga cried. (?)", "Olga played the flute. (X)", "Mr. Perez played the recording. (+ so)", "Olga is worried. (T)", "Olga felt calm. (P we)"],
            feedback:
              "Prompt, do not tell. For 'Did she cried?' hold up a finger and say 'Did she...?' and point to the plain verb on the board; for 'She didn't felt calm' write 'didn't + plain verb' and let the pupil fix it; for 'Olga worried' point to the frame 'Olga was ___'; for 'because Olga she was' tap the order on the board. For the sound of -ed, recast once ('played', with a clear /d/) and let them echo it.",
            teacherNote: "The story's own sentences are the drill, so the pupils hear the new forms in language they know and can focus on the change. Round 3 makes it real: they use the same past forms to talk about their own experience. Grades 6-7 can take all five signs quickly. Listen for did + plain verb (a common slip is 'did cried') and for 'was' before the feeling word.",
            tiers: [
              { level: "Support", task: "Use only ? and X, about Olga, with the frames on the board.", frames: ["Did Olga ___?", "Yes, she did. / No, she didn't.", "Olga didn't ___."] },
              { level: "Core", task: "Change every sentence with all five signs, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'Although Olga cried, she didn't stop playing. Did you ever feel like that?'" },
            ],
          },
        },
        {
          after: "Story strips: put it in order",
          slide: {
            kind: "fluency",
            title: "Olga's Flute: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 9,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster, and it gives reasons.",
            chunks: [
              "At the start, Olga played her flute, but she was worried because she wanted to play well.",
              "She cried a little, so Mr. Perez played the recording for her.",
              "Although she was nervous, the music made her feel calm.",
              "At the end, Olga was amazed because the music was so beautiful.",
            ],
            recycle: ["Music makes me feel ___ because ___.", "Fast music makes me ___."],
            rounds: [
              { seconds: 75, say: "Tell your partner the story in your own words. Use your story strips and give a reason for each feeling." },
              { seconds: 60, say: "New partner. Tell it again in less time, with the same reasons." },
              { seconds: 45, say: "New partner. Tell it fast and smooth, and end with your opinion of the story." },
            ],
            steps: [
              "Look at your story strips. Hold up one finger for the start, two for the middle, three for the end.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), let the class fix them, then go on.",
              "When the bell rings, find a new partner.",
              "The listener asks one question at the end ('Why was she worried?') and gives a thumbs up.",
            ],
            prompts: ["(strip: Olga plays)", "(strip: Mr. Perez tells her)", "(strip: Olga is worried)", "(strip: Olga cries)", "(strip: the recording)", "(strip: Olga is amazed)"],
            feedback:
              "Prompt the pupil to fix it. For a missing -ed ('Olga play her flute') start the phrase and pause: 'Olga pla...?' and tap your ear so they listen for the /d/ at the end. For 'She worried' or 'Olga amazed' point to the frame 'She was ___' and hold up a finger for the missing 'was'. For a mix-up of because and so, write 'idea + because + reason' and 'reason + so + result' on the board and let the pupil choose. For a pronunciation slip ('cried' said as 'cry') a quick recast is fine: say 'cried' with a clear /d/ and let them echo it.",
            teacherNote: "This is the same story three times on purpose: the second and third tellings free the pupils to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 makes the second telling more accurate, not just faster. Listen for the -ed endings, for 'was' and for the reasons. Keep the strips on the board for Support pupils and accept shorter tellings from them.",
            tiers: [
              { level: "Support", task: "Point to each strip and say one sentence for it, with one reason.", frames: ["At the start, ___ because ___.", "In the middle, ___.", "At the end, ___ because ___."] },
              { level: "Core", task: "Tell all three parts with reasons and without the frames." },
              { level: "Stretch", task: "Add a contrast and your opinion: 'Although Olga was nervous, she kept playing. I think she was brave because ___.'", frames: ["Although ___, ___.", "I think ___ because ___."] },
            ],
          },
        },
        {
          after: "Olga's feelings line",
          slide: {
            kind: "writing",
            title: "Olga's Flute: plan, write, check",
            routine: "paragraph",
            genre: "story retell with opinion",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the start, the problem, what happened then, the end and the opinion.",
              "Plan: use your story strips. Write key words in each of the five boxes.",
              "Write: six to eight sentences. Use at the start, then, although, because, I think and in conclusion.",
              "Check: tick the checklist. Your partner points to every -ed, every 'was' and every 'because' or 'although'.",
              "Teacher: look only at -ed (played, cried) and 'was'. Put a dot next to a line with a mistake; the pupil finds it and fixes it.",
            ],
            text: {
              title: "Model: Olga's Flute",
              text: "At the start of the story, Olga played her flute, but she was worried and she cried a little. Then Mr. Perez played a recording for her, and she listened carefully. Although she was still nervous, the music made her feel calmer. At the end, Olga was amazed because the music was so beautiful. I think Mr. Perez was kind because he helped her. In conclusion, the story shows that music can change how we feel.",
            },
            organiser: [
              { label: "Start", prompt: "Who is Olga and what did she do? How did she feel? Why?" },
              { label: "Problem", prompt: "What went wrong, and how did she react?" },
              { label: "Then", prompt: "What did Mr. Perez do, and how did it change her feelings? (although)" },
              { label: "End", prompt: "How did Olga feel at the end? Why? (because)" },
              { label: "My opinion", prompt: "What do you think of the story or of a character? Give a reason." },
            ],
            frames: ["At the start of the story, Olga ___, but ___.", "Then Mr. Perez ___.", "Although ___, the music made her feel ___.", "At the end, Olga was ___ because ___.", "I think ___ because ___.", "In conclusion, ___."],
            checklist: ["-ed at the end of finished actions: played, cried, listened", "'was' in every feeling sentence: she was worried", "although and because are used with the right word order", "A capital letter at the start and a full stop at the end of each sentence"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "This paragraph is the script for the recorded talk 'Olga's Flute: my retelling': the pupil practices it here, then records it at home. It puts the finished-story verbs, 'was' and the joining words into connected writing. Say the final -d of 'played' and 'cried' clearly when you read the model. Mark only two targets and let the pupil find the mistake from your dot. The opinion sentence is theirs: accept any reasoned view.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one idea in each. Write six sentences.", frames: ["At the start of the story, Olga ___.", "At the end, Olga was ___ because ___."] },
              { level: "Core", task: "Write six to seven sentences, one for each box, with although and because." },
              { level: "Stretch", task: "Write eight sentences: add a comparison with a time you felt like Olga.", frames: ["I felt like Olga when ___, because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Olga's Flute: my retelling",
        prompt: "Retell the story of Olga's Flute in three parts: the start, the middle and the end. Say how Olga felt in each part and why, and finish with your opinion of the story.",
        length: "90-120 seconds",
        steps: [
          "Read your paragraph from class again and number the three parts: start, middle and end. Add one reason or example to each part.",
          "Practice the talk three times, alone or with a friend. Each time, make it smoother and keep your reasons.",
          "Record one take. Look at the camera, speak clearly and use because and although at least once each.",
          "Watch it once. If you stopped for a long time or forgot a reason, record it again.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the start, the middle and the end, say how Olga felt and why, give a reason or example for your opinion, and keep talking without long stops.",
        words: ["flute", "worried", "tears", "musician", "recorded", "calm", "amazed"],
        grammar: ["Olga played / was / cried (finished story)", "She was ___ because ___.", "Although ___, ___."],
        rubric: [
          { label: "Three parts", description: "Tells the start, the middle and the end of the story in order.", weight: 3 },
          { label: "Reasons and examples", description: "Gives a reason or an example for how Olga felt and for the opinion, with because or although.", weight: 3 },
          { label: "Keeps going", description: "Talks for the whole time without long stops; long sentences, not single words.", weight: 3 },
          { label: "Finished-story verbs", description: "Uses played, was or cried, and the -ed or was can be heard.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Pupils who need the frames", frames: ["At the start, Olga ___ because ___.", "In the middle, she was ___.", "At the end, she was ___ because ___."], tips: ["Point to your strips as you speak."] },
          { level: "Core", who: "Most pupils", frames: ["At the start, Olga played her flute, but she was worried because ___.", "Although she was nervous, ___.", "At the end, ___."], tips: ["Say what Olga did, how she felt and why in every part."] },
          { level: "Stretch", who: "Pupils who are ready for more", frames: ["I think Olga was brave because ___.", "I felt like Olga when ___. For example, ___."], tips: ["Add your opinion with a reason and a real example from your life."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u14-l3": {
      objectives: ["I can ask and answer 'When did you ___?' and 'Did you ___?' fast, with a time and a reason.", "I can find and fix mistakes in past-time sentences."],
      trim: { "Sing along (SB 141 D)": 3 },
      drop: ["Feelings charades", "Time travel line"],
      add: [
        {
          after: "Who is it? Ask and answer (SB 141 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: yesterday, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change past-time sentences fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about what you really did.",
            chunks: [
              "Last Saturday I went to a concert with my cousin because I love live music.",
              "Did you go to a concert last year? Yes, I did. / No, I didn't.",
              "I didn't practice the piano yesterday because I had a lot of homework.",
              "When did your brother start playing the guitar? He started two years ago.",
              "Although I was tired last night, I listened to my favorite band, so I felt better.",
              "We sang and danced, but we didn't stay late.",
            ],
            recycle: ["Yesterday I played ___.", "Did you ___ last night? Yes, I did."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with did, X = say no with didn't, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. After did or didn't the verb stays plain." },
              { seconds: 90, say: "Real talk: what did you really do last weekend, yesterday evening or on your last holiday? Ask your partner two questions ('When did you ___?' and 'Did you ___?'), answer, and give a reason." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign and change it: ? = ask it with Did or When did, X = say it with didn't, + = join with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. Watch the verb: past form after the time word, plain verb after did or didn't.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3, talk about your real weekend. Remember one thing your partner did to tell the class.",
            ],
            prompts: ["I went to a concert last week. (?)", "She played the piano yesterday. (X)", "We listened to music. (+ because)", "I sing every day. (T last night)", "I made a playlist. (P they)"],
            feedback:
              "Prompt, do not tell. For 'When did he played?' say 'When did he...?' with a finger up and point to the plain verb after did; for 'Yesterday I play' point to the time word and say 'Yesterday I pla...?' so they add -ed; for 'goed' or 'singed' point to the board where 'went' and 'sang' sit and let them choose; for 'Yes, I have' or 'Yes, I did went' touch the frame 'Yes, I did.' For the sound of -ed, recast once ('played', with a clear /d/) and let them echo it.",
            teacherNote: "The unit's grammar is the drill: the finished time word with a past verb, and 'did' with a plain verb. Vietnamese has no past endings, so -ed is often dropped, and after did the verb is often wrongly put in the past again: show both on the board. Round 3 moves from practice to real talk about their weekend. Keep the pace brisk; the sign cards do the work.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with I and you, with the frames on the board.", frames: ["Did you ___ last night?", "Yes, I did. / No, I didn't.", "I didn't ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a second clause and a follow-up question: 'Although I was tired, I went to the concert, so I got home late. When did you get home?'" },
            ],
          },
        },
        {
          after: "Yesterday and today (SB 141 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: Did you ___ last night?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops, and give a reason or a detail every time.",
            chunks: [
              "I played the guitar yesterday afternoon because I have a school concert soon.",
              "Did you sing last night? Yes, I did, but I didn't sing very well.",
              "No, I didn't. I listened to music while I did my homework.",
              "When did you practice? I practiced this morning before school.",
              "We went to a concert last week, and we had a great time.",
            ],
            recycle: ["I read in the morning.", "He listens to music at night."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a time card and an action card, and gives a detail after the short answer." },
              { seconds: 75, say: "Swap cards. Go faster, and ask a follow-up question: 'Why?' or 'Who with?'" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your cards so only you can see them.",
              "Ask the friend on your left: 'Did you ___ last night?' or 'When did you ___?'",
              "They answer with the time word on their card and a detail: 'Yes, I did. I played it with my cousin.' Then they ask the next friend.",
              "Teacher: after the first round, stop for one minute. Put two mistakes you heard on the board (no names), let the class fix them, then go on.",
            ],
            prompts: ["(time: yesterday morning)", "(time: last night)", "(time: last week)", "(action: play the guitar)", "(action: sing a song)", "(action: go to a concert)"],
            feedback:
              "Prompt the pupil to fix the verb, do not say it for them. For 'When did he played?' say 'When did he...?' and pause with a finger up: after did the verb stays plain. For 'Yesterday I play' point to the time card and say 'Yesterday I pla...?' so they add -ed. For 'goed' or 'singed' point to the board where 'went' and 'sang' sit and let them choose. For 'Yes, I have' point to the frame 'Yes, I did.' For the sound of -ed, recast once and let them echo it.",
            teacherNote: "The chain makes every pupil ask AND answer many times in a few minutes, which is what makes 'Did you ...?' and 'When did you ...?' automatic. The detail after the short answer (a reason, a person or a place) pushes the answers past one word. Time the whole circle and tell them; they like to beat their own time.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, I did.' or 'No, I didn't.' and one detail, and pass the question on with the frame on the board.", frames: ["Did you ___ last night?", "Yes, I did. / No, I didn't. I ___."] },
              { level: "Core", task: "Ask and answer without looking at the board, and add a reason with 'because'." },
              { level: "Stretch", task: "Ask a follow-up question each time and answer with a contrast: 'No, I didn't, but I played football, although it was raining.'" },
            ],
          },
        },
        {
          after: "Our day chart",
          slide: {
            kind: "writing",
            title: "Fix the diary sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong, and some sentences have two mistakes!",
              "Find them: the verb form, the time word or a short answer.",
              "Write the sentence the right way. Read it aloud together and say why.",
            ],
            items: [
              { q: "Yesterday after school I play the guitar, and my sister singed.", answer: "Yesterday after school I played the guitar, and my sister sang." },
              { q: "When did your cousin started learning the piano?", answer: "When did your cousin start learning the piano?" },
              { q: "Last weekend we goed to a concert, although we didn't bought tickets early.", answer: "Last weekend we went to a concert, although we didn't buy tickets early." },
              { q: "I didn't went to the concert because I was ill yesterday night.", answer: "I didn't go to the concert because I was ill last night." },
              { q: "Did you listened to the new song last night? Yes, I listen.", answer: "Did you listen to the new song last night? Yes, I did." },
            ],
            checklist: ["A finished time word + a past verb (played, went)", "After did or didn't, the verb stays plain (did he start, didn't buy)", "Special verbs: go - went, sing - sang, buy - bought", "Short answers use did: Yes, I did."],
            sayIt: "Say all the fixed sentences to your partner, fast, and tell them the rule for each.",
            teacherNote: "Focus on these error types only (the verb ending, the verb after did or didn't, the special verbs, 'last night' and the short answer) and ask for a short reason for each. Fix the first sentence together. Vietnamese pupils often leave off the -ed (item 1) and over-use it after did (items 2 to 5); items 1, 3, 4 and 5 have two mistakes on purpose, so tell the pairs to look for more than one. Praise the pupil who explains the rule, not only the one who fixes the sentence.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 2 and 4 with the board on the wall." },
              { level: "Core", task: "Fix all five sentences and give a reason for each." },
              { level: "Stretch", task: "Write two more diary sentences with a mistake, one with because or although, for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u14-l4": {
      objectives: ["I can say what a musician did, with and, but, so and although, the same way three times.", "I can join sentences with the right joining word."],
      trim: { "Feelings line-up and concerts in our town (SB 142, Think)": 3 },
      drop: ["Chant: A musician's day", "Simon says: a musician's day", "Phrase pair race"],
      add: [
        {
          after: "I'm a musician! (SB 143 E)",
          slide: {
            kind: "fluency",
            title: "Musician's day: say it three times",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Say the same musician talk to three friends. Each time is smoother and faster, with reasons and contrasts.",
            chunks: [
              "I gave a concert and I signed autographs, but I didn't talk to every fan.",
              "I played the guitar, but I made a mistake because I was nervous.",
              "I did an interview, so I talked about my music and my plans.",
              "Although I was tired, I was proud because the fans sang along.",
            ],
            recycle: ["Yesterday morning I played the piano.", "Last night I listened to slow music because I was tired."],
            rounds: [
              { seconds: 70, say: "Talk 1: tell your musician talk to your first listener. The listener counts the things you did on their fingers." },
              { seconds: 60, say: "Talk 2: new listener. The same talk, smoother and with the same reasons." },
              { seconds: 50, say: "Talk 3: new listener. Fast and smooth! The listener says 'Good concert!' at the end and asks one question." },
            ],
            steps: [
              "Choose three things a musician did. Say each with 'and' or 'but', and give one reason with 'because' or 'so'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), let the class fix them, then go on.",
              "When the bell rings, move to a new partner and say the same talk again.",
              "The listener has a job: count the sentences, then ask one question: 'Why were you nervous?'",
            ],
            feedback:
              "Prompt the pupil to fix it. For 'I give a concert' (no -ed) start 'I gav...?' and pause so they use the special verb; for 'I play the guitar, but I make a mistake' say 'I played, but I...?' and point to the time word on the board. For 'I happy' hold up a finger for the missing 'was'. For a mix-up of and and but, point to the two signs on the board (= for and, a cross for but) and let the pupil choose. For 'Although I was tired, but I was proud' cross out the 'but' and let the pupil say why. For a sound, recast once and let them echo it.",
            teacherNote: "This is the same talk, less time, new listener: task repetition. Do not add new language between rounds; the gain comes from saying the same thing more smoothly, and the one-minute fix makes the later telling more accurate. Listen for the -ed endings, the special verbs gave, made and did, and was. Grades 6-7 should join most sentences, not say them separately.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["I ___ and I ___.", "I ___, but I ___.", "I was ___ because ___."] },
              { level: "Core", task: "Say four or five sentences with and, but and because, without the board." },
              { level: "Stretch", task: "Add although or so and a follow-up question for the listener: 'Although I made a mistake, I kept playing. Have you ever done that?'" },
            ],
          },
        },
        {
          after: "Join the sentences (SB 143 F)",
          slide: {
            kind: "writing",
            title: "Combine it: and or but",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the short sentences.",
              "Decide how they connect: alike (and), different (but), a result (so), a reason (because) or a contrast (although).",
              "Make ONE sentence. Say it first, then write it.",
            ],
            items: [
              { q: "The band played a new song. The fans sang along. (and)", answer: "The band played a new song, and the fans sang along." },
              { q: "I like pop music. I don't like very loud concerts. (but)", answer: "I like pop music, but I don't like very loud concerts." },
              { q: "The singer was nervous. She smiled at the fans. (although)", answer: "Although the singer was nervous, she smiled at the fans." },
              { q: "We didn't buy tickets. They were too expensive. (because)", answer: "We didn't buy tickets because they were too expensive." },
              { q: "I made a mistake. I kept playing. I felt proud at the end. (but ... and)", answer: "I made a mistake, but I kept playing, and I felt proud at the end." },
            ],
            checklist: ["'and' for ideas that are alike, 'but' for ideas that are different", "A comma before 'but', and after an 'although' clause at the start", "Never 'although ... but' in one sentence", "A capital letter at the start and a full stop at the end"],
            sayIt: "Say your joined sentences to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud, crossing out the repeated words. A common error is 'but' for ideas that are alike; ask 'Is it the same idea or a different idea?' Another is 'Although ..., but ...' in one sentence: this is a first-language habit, so show it on the board. Item 5 joins three ideas; accept any correct order.",
            tiers: [
              { level: "Support", task: "Do items 1, 2 and 4 with the teacher." },
              { level: "Core", task: "Do all five items." },
              { level: "Stretch", task: "Write two of your own sets of sentences about a concert and join them in two different ways for your partner." },
            ],
          },
        },
        {
          after: "Combine it: and or but",
          slide: {
            kind: "fluency",
            title: "Grammar drill: and, but, so, although",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the musician sentences fast and right: ask it, say no, join it, change the time or the person. Then join your own ideas about music and life.",
            chunks: [
              "I gave a concert and I signed autographs, but I didn't talk to every fan.",
              "Did he give an interview? Yes, he did, and he answered every question.",
              "The singer was nervous, but she smiled and waved to the fans.",
              "I played the drums, and my friend sang, so the song sounded great.",
              "Although I made a mistake, I kept playing because the fans were clapping.",
              "We didn't win the contest, but we had a lot of fun.",
            ],
            recycle: ["I like ___, but I don't like ___.", "Yesterday I ___ because ___."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with did, X = say no with didn't, + = join with and, but, so or although, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Choose the joining word that fits the meaning." },
              { seconds: 90, say: "Real talk: tell your partner about a time you did something well but made a mistake (in sport, at school or online). Use and, but, so or although, and ask your partner a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign and change it: ? = ask it with Did, X = say it with didn't, + = join with and, but, so or although, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. Choose the right joining word: alike = and, different = but, result = so, contrast = although.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3, make your sentences about your own life and listen for your partner's joining words.",
            ],
            prompts: ["The band played a new song. (?)", "I signed an autograph. (X)", "The fans clapped. (+ so)", "I give a concert every year. (T last year)", "I was nervous. (P she)"],
            feedback:
              "Prompt, do not tell. For 'Although I was tired, but I played' cross out the 'but' on the board and let the pupil say why; for 'I like pop and I don't like rock' point to the two signs (= and a cross) and let them choose 'but'; for 'Did he gave?' hold up a finger and point to the plain verb after did; for 'He sign autographs' tap the -ed on the board. For a sound, recast once and let them echo it.",
            teacherNote: "The sign cards make the pupil choose the joining word by meaning, not by habit, which is the point of this unit's grammar. Grades 6-7 can use and, but, so and although in the same drill. Round 3 moves to their own lives. A common slip is 'although ... but' in one sentence; show it on the board.",
            tiers: [
              { level: "Support", task: "Use only + with and and but, with the frames on the board.", frames: ["I ___ and I ___.", "I like ___, but I don't like ___.", "I ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs, and choose and, but, so or although to fit the meaning." },
              { level: "Stretch", task: "Join three ideas in one sentence with two different joining words, and add a follow-up question: 'I made a mistake, but I kept playing, so we finished the song. Have you ever done that?'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A musician's busy day",
        prompt: "Be a musician for a minute and a half! Tell us what you did at your concert, with 'and', 'but', 'so' and 'although'. Say how you felt and why.",
        length: "90-120 seconds",
        steps: [
          "Choose four things a musician did: give a concert, sign an autograph, talk to fans, do an interview, make a mistake ... Write a reason or an example for each.",
          "Practice the talk three times, alone or with a friend. Each time, make it smoother.",
          "Record one take. Use 'and' once, 'but' once and 'because' or 'although' at least once.",
          "Watch it once. If you stopped for a long time or forgot a reason, record it again.",
        ],
        maxSeconds: 180,
        kidSummary: "Say four things a musician did with and, but, so or although, give reasons and examples for how you felt, and keep talking without long stops.",
        words: ["concert", "autograph", "interview", "fans", "mistake", "nervous", "happy"],
        grammar: ["I gave / signed / played ... (finished past)", "and / but / so / although", "I was ___ because ___."],
        rubric: [
          { label: "Four things", description: "Says four things the musician did, in long sentences.", weight: 2 },
          { label: "Reasons and examples", description: "Gives a reason or an example for how the musician felt, with because, so or although.", weight: 3 },
          { label: "Joining words", description: "Joins ideas with 'and' for alike and 'but' for different, correctly.", weight: 2 },
          { label: "Keeps going", description: "Talks for the whole time without long stops; long sentences, not single words.", weight: 3 },
          { label: "Finished verbs", description: "Uses gave, signed, played or made with the right ending, and 'I was ___'.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Pupils who need the frames", frames: ["I gave a concert, and I ___.", "I played the ___, but I ___.", "I was ___ because ___."], tips: ["Hold up a finger for each thing."] },
          { level: "Core", who: "Most pupils", frames: ["I gave a concert and I ___, but I ___.", "I played the ___, so ___.", "I was ___ because ___."], tips: ["Use 'and', 'but' and 'because' at least once each."] },
          { level: "Stretch", who: "Pupils who are ready for more", frames: ["Although I was nervous, ___.", "After the concert I ___, so ___. For example, ___."], tips: ["Add a contrast, what you did after the concert, and a real example."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u14-l5": {
      objectives: ["I can talk about my music mobile and my opinions for a long time without stopping.", "I can write a short text about my music with reasons and a contrast."],
      trim: {
        "Same and different gallery walk (SB 145 D)": 5,
        "Act it out: story theatre": 9,
      },
      drop: ["Chant: Music, music, show me", "Pass the ball: yesterday and last night"],
      add: [
        {
          after: "Tell the story in three parts",
          slide: {
            kind: "fluency",
            title: "Grammar drill: opinions, reasons and the past",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change sentences about music and feelings fast and right: ask it, say no, join it with a reason, change the time or the person. Then give your real opinions.",
            chunks: [
              "My mobile has a drum and a guitar because I play them both.",
              "Does your favorite song make you feel calm? Yes, it does. / No, it doesn't.",
              "Last night I listened to slow music, and it made me feel relaxed.",
              "I don't like very loud music, but my older brother loves it.",
              "Although I like fast music, I prefer slow songs when I study.",
              "When I feel stressed, I listen to music because it helps me think.",
            ],
            recycle: ["I gave a concert and I signed autographs.", "Music makes me feel ___ because ___."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use a new sign every time." },
              { seconds: 90, say: "Real talk: what music do you use for studying, sport or sleeping, and why? Ask your partner, answer with the short answer, then give a reason and an example." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign and change it: ? = ask it with do, does or did, X = say it with don't, doesn't or didn't, + = join with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. Listen for the -s on makes and loves, and for the verb after does or did.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3, give a real opinion and a real example. Listen for your partner's reason.",
            ],
            prompts: ["My mobile has a drum. (?)", "Slow music makes me feel calm. (X)", "I listen to music. (+ when I study)", "I listen to slow music every night. (T last night)", "I like loud music. (P my brother)"],
            feedback:
              "Prompt, do not tell. For 'Music make me feel calm' hold up one finger and say 'Music make...?' so they add -s; for 'Does it makes you calm?' point to the plain verb after does; for 'Last night I listen' tap your ear for the -ed; for 'My brother love it' tap the -s on the board. For a sound, recast once and let them echo it. Say your own -s and -ed clearly.",
            teacherNote: "This lesson has no new grammar slide, so the drill revisits the unit's grammar in the language of the music mobile: present facts and opinions, last night, and the joining words. It keeps the unit's grammar alive before the Big Question. Round 3 asks for opinions and examples. Listen for the -s on third person verbs, the verb after does and did, and joining words.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with I and you, with the frames on the board.", frames: ["Does ___ make you feel ___?", "Yes, it does. / No, it doesn't.", "I don't like ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'Slow music makes me feel calm, although it didn't help me last night. Does music help you with homework?'" },
            ],
          },
        },
        {
          after: "Make the mobile (SB 145 B)",
          slide: {
            kind: "fluency",
            title: "Mobile talk: three listeners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 9,
            goal: "Give the same talk about your music mobile to three friends. Each talk is shorter and smoother, with reasons and an opinion.",
            chunks: [
              "My mobile has a drum and a guitar because they are my favorite instruments.",
              "Music makes me feel calm when I study, but fast music makes me feel energetic.",
              "I like the drum, but I don't like the trumpet because it is too loud for me.",
              "Last night I listened to this music and I felt relaxed, so I slept well.",
            ],
            recycle: ["I gave a concert and I signed autographs.", "Fast music makes me ___."],
            rounds: [
              { seconds: 90, say: "Talk 1: tell your mobile talk to your first listener. The listener counts how many reasons you give." },
              { seconds: 70, say: "Talk 2: new listener. The same talk in less time." },
              { seconds: 50, say: "Talk 3: new listener. Fast and smooth! The listener says 'Good talk!' at the end." },
            ],
            steps: [
              "Hold your mobile. Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), let the class fix them, then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds. The listener asks one follow-up question: 'Why do you like it?'",
            ],
            feedback:
              "Prompt the pupil to fix grammar: for 'Music make me feel calm' hold up a finger and say 'Music make...?' with a rising voice so they add the -s; for 'Last night I listen' start 'Last night I listen...?' and tap your ear for the -ed; for 'I like the drum but I no like the trumpet' point to the frame 'I don't ___'. For 'listened' or 'calm' a quick recast is fine: say it right and let the pupil echo. Say your own final -s and -ed clearly.",
            teacherNote: "This is the 4/3/2 activity for grades 6-7: the same talk to three listeners in less time, a new partner each time. It builds fluency but not accuracy on its own, so the one-minute correction between round 1 and round 2 matters: pupils who then say the same talk again use the fixed form. Do not add new language between rounds. The listener's job (count the reasons, ask 'Why?') keeps the speaker giving reasons.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["My mobile has ___ because ___.", "Music makes me feel ___."] },
              { level: "Core", task: "Say four or five sentences with because and but, without the board." },
              { level: "Stretch", task: "Add a contrast, a time and a recommendation: 'Last night I listened to slow music, but today I prefer fast music. I recommend it before a test.'" },
            ],
          },
        },
        {
          after: "Tell the class about a picture (SB 145 C)",
          slide: {
            kind: "writing",
            title: "Model it, then write about my music",
            routine: "model, then write",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Find the opinion, the reasons, the 'although' and the 'but'.",
              "Plan: what is your favorite music, how does it make you feel, why, and what did you do last night?",
              "Write five or six sentences with the frames. Include one reason with 'because' and one contrast with 'although' or 'but'. Read them to your partner.",
            ],
            text: {
              title: "My favorite music",
              text: "My favorite music is slow and soft because it helps me relax after school. It makes me feel calm, although sometimes it makes me a little sleepy. Last night I listened to it while I did my homework, and I finished early. I don't like very loud music, but my brother loves it, so we usually use headphones. That is why I always carry mine to school.",
            },
            frames: ["My favorite music is ___ because ___.", "It makes me feel ___, although ___.", "Last night I ___ and I felt ___.", "I don't like ___, but ___ so ___."],
            checklist: ["makes, loves, likes: the -s is there", "-ed or a special verb for finished things (listened, went)", "A comma before 'but' and after an 'although' clause at the start", "A capital letter and a full stop"],
            sayIt: "Read your text to your partner, then say it again without looking.",
            teacherNote: "Plan, write, check is the routine: the pupils plan with the frames, write, then check against the list. Check no more than two or three error types in one go. The model uses 'loves' on purpose so the -s can be heard when you read it aloud. Five or six sentences is the target for grades 6-7; the paragraph routine comes back in the next lesson.",
            tiers: [
              { level: "Support", task: "Copy the first two frames and fill in your own music; write four sentences." },
              { level: "Core", task: "Write five sentences about your music with the frames." },
              { level: "Stretch", task: "Write six sentences, including one with 'although', one with 'so' and one with a time word." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u14-l6": {
      objectives: ["I can say what I did yesterday, last night and last week, with reasons, fast and right.", "I can write a paragraph about my music days."],
      drop: ["Movement break: Thumb over the shoulder"],
      trim: { "Remember it!": 3, "Time machine: now or before?": 4, "Say it, then write: my music yesterday": 9 },
      add: [
        {
          after: "Time machine: now or before?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: finished time, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change past-time sentences fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about your real music life.",
            chunks: [
              "Yesterday morning I played football, and last night I listened to my favorite band.",
              "When did you start learning English? I started when I was seven.",
              "Did you make a playlist last week? Yes, I did. / No, I didn't.",
              "I went to a concert last month, but I didn't buy a T-shirt.",
              "She sang in the school show because her teacher asked her.",
              "Although it rained all day, we had fun, so we didn't go home early.",
            ],
            recycle: ["Yesterday I played ___.", "Music made me feel ___ because ___."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with did, X = say no with didn't, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Choose the past form: -ed, a special verb, or did + plain verb." },
              { seconds: 90, say: "Real talk: what music did you listen to this week, where and why? Ask your partner two questions ('When did you ___?' and 'Did you ___?'), answer, and add a reason and an example." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign and change it: ? = ask it with Did or When did, X = say it with didn't, + = join with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. Remember the rule: show the past ONE time, in the verb (played) or in did (did + play), never both.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3, use real times and real reasons. Remember one thing your partner did to tell the class.",
            ],
            prompts: ["I went to a concert last week. (?)", "She made a playlist yesterday. (X)", "We listened to music. (+ although it was late)", "I practice the guitar every day. (T last week)", "I sang in the school show. (P they)"],
            feedback:
              "Prompt, do not tell. For 'When did you played?' hold up a finger and point to the plain verb after did; for 'Last week I goed' point to the board where 'went' sits and let the pupil choose; for 'I listened to music yesterday night' point to the frame 'last night'; for 'Yes, I do' in answer to a did-question touch 'Yes, I did.' For the -ed sounds, recast once ('listened', clear /d/) and let them echo it.",
            teacherNote: "This is the unit's main grammar (the finished time words, the finished verbs, and did + plain verb) changed at speed with signs, then used in real talk. It comes after the grammar slide and the time machine game, so the pupils have the rule fresh. The final sprint that follows is the same grammar on single sentences; this drill is where they join, ask and say no. Listen for did + plain verb and for special verbs.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with I and you, with the frames on the board.", frames: ["Did you ___ last week?", "Yes, I did. / No, I didn't.", "I didn't ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs, and join two ideas with because, so or although." },
              { level: "Stretch", task: "Add a second clause and a follow-up question: 'I went to a concert last month, but I didn't buy a ticket for my cousin because it was too expensive. When did you last go?'" },
            ],
          },
        },
        {
          after: "Grammar drill: finished time, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Past verb sprint: went, sang, had, made",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right, with the finished verb and a reason.",
            chunks: [
              "I went to a concert last week because my favorite band was in town.",
              "She sang a song last night, but she forgot the second verse.",
              "We had lunch with our friends yesterday, and we talked about music.",
              "He made a drum last Saturday, so he played it all afternoon.",
              "I listened to music this morning because I felt nervous about my test.",
            ],
            recycle: ["I gave a concert and I signed autographs.", "I like the drum, but I don't like the trumpet."],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a verb card, the class says the whole sentence with a reason." },
              { seconds: 75, say: "Half the class says the sentence, the other half listens for mistakes and shows a thumb. Then swap." },
              { seconds: 60, say: "Champion round: one pupil at a time, as fast as you can, with a reason that is new." },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips, with a reason.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 2, stop for one minute. Put the two mistakes you heard most on the board (no names), let the class fix them, then go on.",
            ],
            feedback:
              "Prompt the pupil to fix it, do not say it for them. For 'I goed' or 'She singed' point to the verb card and say 'I w...?' so they find went; for 'I have lunch yesterday' point to the time word and start 'We h...?' to prompt had. For 'When did you played?' hold up a finger: after did the verb stays plain. For the -ed sounds a quick recast is fine: say 'listened' clearly and let them echo it.",
            teacherNote: "A quick recall of the unit's finished verbs mixed with earlier phrases: spaced retrieval keeps last lesson's grammar from fading. The special verbs go - went, sing - sang, have - had and make - made are said whole, never as a list of single words, and each sentence carries a reason so the pupils practice the full chunk. Listen for the -ed on listened and played.",
            tiers: [
              { level: "Support", task: "Say the sentence with the verb card in your hand.", frames: ["I ___ yesterday because ___.", "She ___ last night."] },
              { level: "Core", task: "Say the sentence without the card, with a reason." },
              { level: "Stretch", task: "Add a contrast and a feeling: 'I went to a concert last week, although I had a test the next day, and I felt very happy.'" },
            ],
          },
        },
        {
          after: "Say it, then write: my music yesterday",
          slide: {
            kind: "writing",
            title: "My music days: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to each time word, each finished verb and each linking word.",
              "Plan: write key words in each of the five boxes. Think of true things you did and the reasons.",
              "Write: six to eight sentences. Start with a time word: Last week, Yesterday morning, Last night, Then. Use because, so, although and however.",
              "Check: tick the checklist. Your partner points to every time word and every finished verb.",
              "Teacher: look only at the finished verb (played, listened, went) and at did + plain verb. Put a dot next to a line with a mistake; the pupil finds it and fixes it.",
            ],
            text: {
              title: "Model: My music days",
              text: "Last week was a busy week for music. On Monday I played the guitar for an hour because I wanted to learn a new song, and I made a lot of mistakes. Yesterday morning my cousin sang at school, so I went to listen with my friends. Last night I listened to slow songs, and they made me feel calm. However, I didn't practice on Tuesday because I had a test. For example, I only had time to listen to one song. In conclusion, music was part of every day last week.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "How was last week for music? One sentence." },
              { label: "Yesterday / Monday", prompt: "What did you do with music? Why? (because)" },
              { label: "Last night", prompt: "What did you listen to? How did it make you feel? (so, and)" },
              { label: "A time you didn't", prompt: "What didn't you do, and why? (however, didn't + plain verb)" },
              { label: "Closing", prompt: "One sentence that sums up your week." },
            ],
            frames: ["Last week was ___.", "On Monday I ___ because ___.", "Yesterday morning ___, so ___.", "Last night I ___, and it made me feel ___.", "However, I didn't ___ because ___.", "In conclusion, ___."],
            checklist: ["A time word + a finished verb: yesterday I played", "Special verbs: made, went, sang", "After didn't, the verb stays plain: I didn't practice", "A capital letter at the start and a full stop at the end of each sentence"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "This paragraph is the script for the recorded talk 'My music: yesterday and last week': the pupil practices it here, then records it at home. It puts the unit's time words, finished verbs and didn't + plain verb into connected writing with reasons. Say the final -d of 'played' and 'listened' clearly when you read the model. Mark only two targets and let the pupil find the mistake from your dot. Accept any true things the pupil did.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one idea in each. Write six sentences.", frames: ["Yesterday I ___ because ___.", "Last night I ___."] },
              { level: "Core", task: "Write six to seven sentences, one for each box, with because, so and however." },
              { level: "Stretch", task: "Write eight sentences: add a comparison between two days and a plan for next week.", frames: ["Last week I ___, but next week I will ___ because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My music: yesterday and last week",
        prompt: "Tell us about your music for a minute and a half. Say what you did yesterday, last night and last week, how the music made you feel, and why.",
        length: "90-120 seconds",
        steps: [
          "Think of four music things you did: played, listened, sang, went to a concert, made a playlist ... Write a reason and an example for each.",
          "Practice the talk three times, alone or with a friend. Each time, make it smoother.",
          "Record one take. Say a time word in every sentence: yesterday, last night, last week. Use because or although at least once.",
          "Watch it once. If you stopped for a long time or forgot a reason, record it again.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what you did yesterday, last night and last week, how it felt, and why, with a reason and an example, and keep talking without long stops.",
        words: ["yesterday", "last night", "last week", "listened", "played", "went", "calm"],
        grammar: ["Yesterday / Last night / Last week + I + finished verb", "It made me feel ___ because ___.", "I didn't ___ because ___."],
        rubric: [
          { label: "Time words", description: "Uses yesterday, last night or last week in each sentence.", weight: 2 },
          { label: "Reasons and examples", description: "Gives a reason or a real example for what they did and felt, with because, so or although.", weight: 3 },
          { label: "Finished verbs", description: "Uses played, listened, went or sang with the right ending, and does not say 'did played'.", weight: 3 },
          { label: "Keeps going", description: "Talks for the whole time without long stops; long sentences, not single words.", weight: 3 },
          { label: "Feelings", description: "Says how the music made them feel: It made me feel ___.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Pupils who need the frames", frames: ["Yesterday I ___ because ___.", "Last night I ___.", "It made me feel ___."], tips: ["Hold up a finger for each time word."] },
          { level: "Core", who: "Most pupils", frames: ["Yesterday morning I ___ and ___ because ___.", "Last night I listened to ___. It made me feel ___.", "Last week I ___, so ___."], tips: ["Use a different time word in every sentence."] },
          { level: "Stretch", who: "Pupils who are ready for more", frames: ["Last week I ___, but this morning I ___ because ___.", "Although I didn't ___, I ___. For example, ___."], tips: ["Join two times with 'but', add a contrast and give a real example."] },
        ],
      },
    },
  },
};
