import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 1 "Festivals
// and Fun" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10.
// Every lesson gets one fluency routine (the unit's phrases said again and again as
// whole sentences, a little faster each round, with earlier phrases mixed back in)
// and one short writing routine (plan, write, check, then say it). Three lessons end
// with a recorded talk for home, built on the routine the class just did. Time comes
// from games and repeats, never from the book pages or the grammar. All text is original.

const fix =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute; children who then say it again use the fixed form. For grammar, prompt the child to fix it themselves rather than saying it for them: start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the mistake with a rising voice. For a sound, just say it right and let the child echo it. Say every final -s and -ed clearly yourself: children copy what they hear.";

export const odL3U1Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u01-l1": {
      objectives: ["I can say what my favorite sport is and why, smoothly and without long stops."],
      trim: { "The fun bag": 3, "Two word webs: events and sports": 6, "Fun through the year (SB 6 C)": 5 },
      drop: ["Festival charades"],
      add: [
        {
          after: "My favorite sport (SB 8 C)",
          slide: {
            kind: "fluency",
            title: "Favorite sport sprint",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no long stops.",
            chunks: [
              "My favorite sport is swimming.",
              "What's yours?",
              "Mine is soccer, too!",
              "I like it because it is fun.",
              "I play with my friends.",
            ],
            recycle: ["How many crayons are there?", "There are a lot of markers.", "I have glue, chalk and markers."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a sport card and the class says 'My favorite sport is ___.'" },
              { seconds: 60, say: "Pairs: one asks 'What's yours?' and the other answers 'Mine is ___.' Swap when you hear the clap." },
              { seconds: 45, say: "New partner. Add 'I like it because it is fun.' How many whole sentences can you say?" },
            ],
            steps: [
              "Look at the sport card. Say a WHOLE sentence, not just one word.",
              "Listen for the clap: it means swap or change partner.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them with the class. Then go on to round 2.",
            ],
            prompts: ["(card: swimming)", "(card: soccer)", "(card: table tennis)", "(card: running)", "(card: kite flying)"],
            feedback:
              "If a child says 'My favorite sport swimming', point to the frame and pause: 'My favorite sport ... ?' and wait for 'is'. If a child says 'I like it because fun', hold up a finger for the missing words and say 'because it ... ?'. For 'my friend' when they mean more than one, hold up a finger for the -s and say 'friend ... ?' with a rising voice. For a sound, say it right and let the child echo. " + fix,
            teacherNote:
              "Whole sentences only, never single words: 'My favorite sport is swimming' should come out as one smooth piece. The sprint works because the same few sentences come back many times with a new card and a new partner, under a little time pressure. Listen for the dropped 'is' ('It fun') and the dropped -s in 'sports' and 'friends'. Mix the earlier phrases in every few turns so they stay quick.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["My favorite sport is ___.", "Mine is ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a second reason: 'I like it because it is fun and exciting.'", frames: ["I like it because it is ___ and ___."] },
            ],
          },
        },
        {
          after: "Think and talk before you read (SB 9 Think)",
          slide: {
            kind: "writing",
            title: "Grow my fun sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Think and plan: read the short sentence with the teacher. Who? Where? When? Why?",
              "Write: make it bigger by adding one or two of those answers.",
              "Check: look at the checklist, then read your sentence to your partner.",
            ],
            items: [
              { q: "I play soccer. (add: with my friends)", answer: "I play soccer with my friends." },
              { q: "We have fun. (add: at school)", answer: "We have fun at school." },
              { q: "I like swimming. (add: because it is cool)", answer: "I like swimming because it is cool." },
              { q: "My family celebrates. (add: in the spring)", answer: "My family celebrates in the spring." },
            ],
            frames: ["I play ___ with my ___.", "We have fun at ___.", "I like ___ because it is ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "The -s is there: friends, sports", "Every sentence has is / am / are when it needs one: 'It is fun.'"],
            sayIt: "Read your big sentence to your partner. Then say it again without looking.",
            teacherNote: "Expanding a short sentence with who, where, when or why is a gentle step before paragraphs. Vietnamese children often leave out 'is' ('It fun') and the plural -s, so those go on the checklist. Do the first item together on the board.",
            tiers: [
              { level: "Support", task: "Copy one big sentence from the board and finish it with your own word.", frames: ["I play ___ with my friends."] },
              { level: "Core", task: "Make three big sentences of your own." },
              { level: "Stretch", task: "Join two with 'and' or 'because': 'I play soccer with my friends because it is fun.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How I have fun",
        prompt: "Tell us about your favorite sport or your favorite way to have fun. Say what it is, who you do it with and why you like it.",
        length: "60-90 seconds",
        steps: [
          "Look at your sentences from class: 'My favorite sport is ___.' and 'I like it because it is ___.'",
          "Say your talk three times to a family member, a toy or the mirror. Each time try to say it a little faster and with fewer stops.",
          "Record it once. Look at the camera and smile.",
          "Watch it once. Tell someone one thing you did well and one thing you want to do better next time.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what you do for fun, who with, and why. Keep talking without long stops.",
        words: ["favorite", "sport", "friends", "fun", "celebrate", "because"],
        grammar: ["My favorite ___ is ___.", "I like it because it is ___.", "I play ___ with my ___."],
        rubric: [
          { label: "Says why", description: "Gives at least one reason with 'because'.", weight: 3 },
          { label: "Keeps going", description: "Keeps talking without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: favorite, sport, friends, fun, celebrate.", weight: 2 },
          { label: "Little words", description: "Says 'is' ('it is fun') and the -s in sports and friends.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My favorite sport is ___.", "I like it because it is ___.", "I play with my ___."], tips: ["Look at your sentences from class, then say them again without looking."] },
          { level: "Core", who: "Most children", frames: ["My favorite way to have fun is ___.", "I do it with my ___ at ___.", "I like it because ..."], tips: ["Say who, where and why."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It is fun because ___, and it is ___, too.", "I think everyone should try it because ..."], tips: ["Give two reasons and say what you think."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u01-l2": {
      objectives: ["I can tell a partner about an event around the world three times, faster each time."],
      trim: { "Fact or opinion fingers": 4, "Our festivals and the ones we read about": 4 },
      add: [
        {
          after: "Chart: events around the world",
          slide: {
            kind: "fluency",
            title: "Event retell: again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell about the same event three times. Each time is shorter, smoother and faster.",
            chunks: [
              "One fact is that people ___ at this event.",
              "In this event, people ___ and ___.",
              "I learned that ___.",
              "I would love to go because it looks fun.",
            ],
            recycle: ["My favorite sport is ___. What's yours?", "I like it because it is fun.", "There are a lot of colors."],
            rounds: [
              { seconds: 90, say: "Tell your partner about one event from the chart. Use the picture and the frames." },
              { seconds: 60, say: "New partner. Tell about the same event again, in less time." },
              { seconds: 45, say: "New partner. Tell it a third time, fast and smooth. Thumbs up if you did not stop." },
            ],
            steps: [
              "Pick one event from the chart. Look at its picture.",
              "Tell your partner: what people do, one fact, and what you would like.",
              "The listener has a job: count the facts. Show the number on your fingers at the end.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them with the class. Then go on to round 2.",
            ],
            prompts: ["(picture: a lantern night)", "(picture: a boat race)", "(picture: a harvest party)"],
            feedback:
              "If a child says 'In this event, people dances' or leaves out 'to' in 'I would love go', do not give the answer: say 'In this event, people ... ?' and pause, or hold up a finger for the missing 'to' and say 'I would love ... go?'. If a child says 'I learned that people plays', hold up a finger and say 'I learned that people ... ?' and wait for 'play'. For a sound, say it right and let the child echo. " + fix,
            teacherNote:
              "The same event told three times is a retell: the second and third tellings free the child to speak faster because the words are already in mind. A retell builds fluency but not accuracy by itself, so the one-minute fix between round 1 and round 2 matters. Accept short tellings; the shrinking time does the work. Listen for 'people do', not 'people does', and for the dropped 'to' after 'would love'.",
            tiers: [
              { level: "Support", task: "Point to the picture and say one sentence about it.", frames: ["In this event, people ___.", "One fact is that ___."] },
              { level: "Core", task: "Tell three sentences: what people do, one fact, and what you learned." },
              { level: "Stretch", task: "Add your own opinion and a reason: 'I think it is great because ...'", frames: ["I think it is ___ because ___."] },
            ],
          },
        },
        {
          after: "Fact hunt",
          slide: {
            kind: "writing",
            title: "Dictogloss: Kite Day",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Rule reminder: say it with the teacher: 'People have fun. Children play.' (no -s after they, we and I).",
              "Listen the first time. Do not write. Just listen to the story.",
              "Listen the second time. Write key words only.",
              "In your group, rebuild the text. Then check it against the checklist and compare with the original.",
            ],
            text: {
              title: "Kite Day",
              text: "In my town, people have fun in many ways. In spring, families go to the park and fly kites. In summer, children swim and play sports. At night, they watch a show and eat noodles together. I think Kite Day is the best event because it is colorful and everybody laughs.",
            },
            frames: ["In spring, families ___.", "In summer, children ___.", "I think ___ is the best event because ..."],
            checklist: ["A capital letter at the start and a full stop at the end of every sentence", "The -s is there: families, kites, sports", "People have, children play: no -s after they"],
            sayIt: "Read your group's text aloud together. Then say the best sentence again without looking.",
            teacherNote: "Read the text twice at natural speed, with the final sounds clear. The group has to agree what to write, which makes children talk about grammar while they write. The text is original and about a made-up town. Compare with the original at the end and let the groups find their own differences.",
            tiers: [
              { level: "Support", task: "Fill the gaps in a copy of the text with some words left out." },
              { level: "Core", task: "Rebuild the text with your group from your key words." },
              { level: "Stretch", task: "Rebuild it, then change one sentence so it is about your own town." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u01-l3": {
      objectives: ["I can say how I felt and what a thing was like, fast: 'The race was exciting, so I felt excited.'"],
      trim: { "Freeze faces": 3, "Class survey: how do you feel about ...?": 6, "Our big idea": 5 },
      add: [
        {
          after: "Feelings charades: Are you ...?",
          slide: {
            kind: "fluency",
            title: "Feelings chain: How was it?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no long stops!",
            chunks: [
              "How was the show? It was amazing.",
              "How did you feel? I felt amazed.",
              "The race was tiring, so I felt tired.",
              "Are you bored? No, I'm not.",
              "I'm interested in dances.",
            ],
            recycle: ["How many ___ are there?", "I think it is fun because ...", "My favorite sport is ___."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds an event card with a face on it." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it: an event and a face.",
              "Ask the friend on your left: 'How was the ___?'",
              "They answer 'It was ___.' (the event word), then 'I felt ___.' (the feeling word), and ask the next friend.",
              "Listener's job: tick when you hear -ing for the thing and -ed for the person.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them with the class. Then go on.",
            ],
            prompts: ["(card: a long queue, a bored face)", "(card: a magic show, an amazed face)", "(card: a race, a tired face)", "How was the ___?", "How did you feel?"],
            feedback:
              "If a child says 'I felt exciting', point to yourself and say 'I felt ... ?' and wait for 'excited', then point to the thing: 'The race was ... ?' for 'exciting'. If 'I feel tire' or 'I am bore', hold up a finger for the missing -d and say 'tire ... ?' with a rising voice; say 'tired' and 'bored' with a clear final /d/ yourself. For a mixed-up sentence, point to the frame 'The ___ was ___, so I felt ___.' For a sound, say it right and let the child echo. " + fix,
            teacherNote:
              "The chain makes each child ask AND answer many times in a few minutes, which is what makes the -ed / -ing choice quick. The rule to keep saying: -ing tells about the thing, -ed tells about the person. Pointing to the person or the thing is a silent prompt: it makes the child fix it without being told. Time the whole circle and tell them; children like to beat their own time.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board.", frames: ["It was ___.", "I felt ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'It was boring, so I felt bored. I wanted to leave!'", frames: ["The ___ was ___, so I felt ___."] },
            ],
          },
        },
        {
          after: "Circle the word (SB 13 F)",
          slide: {
            kind: "writing",
            title: "Fix the feelings",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Plan: read each sentence with your partner. Something is wrong with -ed or -ing, or with was / were.",
              "Fix: ask 'Is it the person or the thing?' Person is -ed. Thing is -ing.",
              "Check: write the sentence the right way, tick the checklist, and read it aloud together.",
            ],
            items: [
              { q: "I am boring at the party.", answer: "I am bored at the party." },
              { q: "The magic show was excited.", answer: "The magic show was exciting." },
              { q: "She felt tire after the race.", answer: "She felt tired after the race." },
              { q: "We was amazed by the big cake.", answer: "We were amazed by the big cake." },
            ],
            checklist: ["People feel: -ed (bored, excited, tired)", "Things and events are: -ing (boring, exciting, tiring)", "I was, he was, we were"],
            sayIt: "Read your fixed sentences to your partner in a strong voice. Then say your favorite one without looking.",
            teacherNote: "These are the unit's real mistakes: -ed for the person, -ing for the thing, plus the dropped final -d (tire, bore) and was/were. Fix one together first and say the rule aloud. Limit the correction to these two or three error types; do not fix everything else on the page.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 3 with the rule on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write two more sentences with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "The event that made me feel ...",
        prompt: "Tell us about an event you remember: a fair, a race, a party or a trip. What was it like? How did you feel? Say why.",
        length: "60-90 seconds",
        steps: [
          "Pick one event. Think of two words: one for the event (-ing) and one for you (-ed).",
          "Say your talk three times to a family member, a toy or the mirror. Each time try to say it a little faster and with fewer stops.",
          "Record it once. Look at the camera and smile.",
          "Watch it once. Listen for the end of the feeling words (-ed and -ing). Tell someone what you did well.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what the event was like and how you felt. Use -ing for the event and -ed for you. Keep talking without long stops.",
        words: ["excited", "exciting", "boring", "bored", "tired", "tiring"],
        grammar: ["The ___ was ___ (-ing).", "I felt ___ (-ed).", "The ___ was ___, so I felt ___."],
        rubric: [
          { label: "-ed and -ing", description: "Uses -ing for the event and -ed for the person correctly.", weight: 3 },
          { label: "Keeps going", description: "Keeps talking without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Says why", description: "Gives a reason with 'because' or 'so'.", weight: 2 },
          { label: "Clear endings", description: "The final -d in tired and bored and the -ing in exciting can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ was ___.", "I felt ___."], tips: ["Look at your fixed sentences from class."] },
          { level: "Core", who: "Most children", frames: ["The ___ was ___, so I felt ___.", "I felt ___ because the ___ was ___."], tips: ["Say what the event was and how you felt."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["My ___ felt ___, too, because ...", "A different person might feel ___ because ..."], tips: ["Say how someone else felt and why."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u01-l4": {
      objectives: ["I can tell about a day I had fun, with time words, and say it smoother each time I tell it."],
      trim: {
        "Plan and try your stall": 8,
        "A party I remember (SB 14 Think)": 8,
        "Same and different (SB 15 C)": 8,
        "Timeline talk and shared sentences": 5,
        "Big Question Review (SB 14-15)": 6,
      },
      add: [
        {
          after: "Timeline talk and shared sentences",
          slide: {
            kind: "fluency",
            title: "Last weekend: tell it 4-3-2",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same story to three partners. You get less time each time, so say it smoother and faster.",
            chunks: [
              "Last weekend, I went to a ___ with my ___.",
              "In the morning, we ___. At 12:00, I ate ___.",
              "On Saturday, my cousins arrived.",
              "It was exciting, so I felt excited.",
            ],
            recycle: ["The race was tiring, so I felt tired.", "There are a lot of ___.", "I would love to go to the ___ because ..."],
            rounds: [
              { seconds: 120, say: "Tell your first partner about a day you had fun. Use your timeline. The listener only listens." },
              { seconds: 90, say: "New partner. Tell the same story again in less time." },
              { seconds: 60, say: "Last partner. Tell it a third time, fast and smooth!" },
            ],
            steps: [
              "Look at your timeline: three time words, three things you did.",
              "Round 1: tell your story. Your partner has a job: count the time words you say.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them with the class. Then go on to round 2.",
              "Rounds 2 and 3: the same story, a new partner, less time. Cut the extra words, not the time words.",
            ],
            prompts: ["(timeline: morning, noon, night)", "(picture cards: noodles, football, dance)"],
            feedback:
              "If a child says 'I go to the fair yesterday', hold up a finger, point back over your shoulder for the past and say 'Last weekend, I ... ?' and wait for 'went'. If 'We danced in Saturday', point to the frame 'on + day' and pause: 'We danced ... Saturday?'. If the child says 'play' for a past event, say 'Last weekend, I ... ?' with a rising voice. For a sound, say it right and let the child echo; say 'played' and 'danced' with a clear final /d/ and /t/ yourself. " + fix,
            teacherNote:
              "4-3-2 (Nation): the same talk to new listeners in less time each round raises speed and smoothness. It does not raise accuracy on its own, so the one-minute fix between round 1 and round 2 is the point. Listen for the past verb, on / at / in with the time word, and the -ed and -s endings. Vietnamese has no past endings, so 'go' for 'went' and a missing -ed are the usual slips.",
            tiers: [
              { level: "Support", task: "Say one sentence for each part of your timeline, with the frame.", frames: ["In the morning, I ___.", "At ___, we ___.", "In the end, I felt ___."] },
              { level: "Core", task: "Tell the whole story with at least three time words." },
              { level: "Stretch", task: "Add how you felt and why: 'The day was tiring, so I felt tired.'", frames: ["The ___ was ___, so I felt ___."] },
            ],
          },
        },
        {
          after: "Circle and underline (SB 15 E)",
          slide: {
            kind: "writing",
            title: "Combine my event sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Plan: read the two short sentences. Where does the time word go?",
              "Write: join them into one sentence with the time word or the joining word in brackets.",
              "Check: look at the checklist, then read your sentence aloud.",
            ],
            items: [
              { q: "We went to a festival. (last weekend)", answer: "Last weekend, we went to a festival." },
              { q: "My cousins arrived. (in the morning)", answer: "In the morning, my cousins arrived." },
              { q: "I ate noodles. I had a drink. (and)", answer: "I ate noodles and had a drink." },
              { q: "I was tired. The walk was long. (because)", answer: "I was tired because the walk was long." },
            ],
            frames: ["Last ___, I ___.", "In the morning, ___.", "I felt ___ because ___."],
            checklist: ["A comma after a time word at the start: 'In the morning, ...'", "The verb is in the past: went, ate, played", "on a day, at a clock time, in the morning"],
            sayIt: "Read your joined sentences to your partner, then say your favorite one again without looking.",
            teacherNote: "Sentence combining has research support as a writing routine: it makes children hold two ideas in one sentence. Today the focus is the unit's time words and the past verb. Do the first item on the board and say 'time word first, then a comma'.",
            tiers: [
              { level: "Support", task: "Combine items 1 and 2 with the frame." },
              { level: "Core", task: "Combine all four sentences." },
              { level: "Stretch", task: "Write one more pair and combine it, then swap with your partner." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u01-l5": {
      objectives: ["I can tell the same event story to three friends, with 'so' and 'because', and write a note about it."],
      trim: { "Remember it!": 4, "Does the rule work here too?": 3 },
      add: [
        {
          after: "Robin's fun diary: who knows what?",
          slide: {
            kind: "fluency",
            title: "Same event, new friend",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Do the same talk three times with a new partner. Say it with fewer stops each time.",
            chunks: [
              "Last weekend, I went to a ___.",
              "The magic show was amazing, so I felt amazed.",
              "I felt tired because the walk was tiring.",
              "How was the ___? It was ___.",
              "How did you feel? I felt ___.",
            ],
            recycle: ["On Saturday, my cousins arrived.", "In the morning, we ___.", "I think it is fun because ..."],
            rounds: [
              { seconds: 75, say: "Tell your partner about one event: what it was, how it was, how you felt." },
              { seconds: 60, say: "New partner. Same event, same talk. Aim for no stops." },
              { seconds: 45, say: "New partner. The same talk again, fast and smooth. Count your stops on your fingers." },
            ],
            steps: [
              "Pick one event card. Plan three sentences: where you went, how it was, how you felt.",
              "Tell your partner. The listener asks one follow-up question at the end: 'Why?' or 'Who went?'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them with the class. Then go on to round 2.",
              "Change partner when you hear the bell. Tell the same talk.",
            ],
            prompts: ["(card: a lantern night)", "(card: a sports day)", "(card: a birthday party)"],
            feedback:
              "If a child says 'The show was amazed', point to the thing and pause: 'The show was ... ?' for 'amazing'. If 'I felt tiring', point to yourself: 'I felt ... ?' for 'tired'. If the -ed is missing in 'I feel tire', hold up a finger and say it right with a clear /d/ for the child to echo. For 'Last weekend I go', point back over your shoulder: 'Last weekend, I ... ?'. " + fix,
            teacherNote:
              "Task repeat: the same task again with a new partner, so the child can put the effort into the words and sounds instead of into finding ideas. This is spaced from last lesson's 4-3-2 on purpose. The follow-up question is the listener's job and keeps the partner active. Listen for -ed on the person, -ing on the thing, the past verb and the dropped final sounds.",
            tiers: [
              { level: "Support", task: "Use the three sentence frames.", frames: ["Last weekend, I went to ___.", "The ___ was ___.", "I felt ___."] },
              { level: "Core", task: "Tell the same talk three times without the frames." },
              { level: "Stretch", task: "Add what someone else felt and why: 'My ___ felt bored because the ___ was boring.'" },
            ],
          },
        },
        {
          after: "Grammar Champion check",
          slide: {
            kind: "writing",
            title: "A note to a friend: model, then write",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model note with the teacher. Find the -ed word for the person and the -ing word for the thing.",
              "Plan: think of a day you remember. Write one word for the thing (-ing) and one word for you (-ed).",
              "Write three or four sentences like the model. Check, then read your note aloud.",
            ],
            text: {
              title: "A note about Lantern Night",
              text: "Hi! Last Saturday, I went to a lantern night with my family. The lanterns were beautiful, and the music was relaxing, so I felt relaxed. My little brother was surprised because a big lantern moved! It was a great night. Come with us next year!",
            },
            frames: ["Last ___, I went to ___.", "The ___ was ___, so I felt ___.", "It was a ___ day!"],
            checklist: ["-ed for how I feel (relaxed, surprised)", "-ing for the thing (relaxing)", "Past verbs: went, was, were"],
            sayIt: "Read your note to a partner, then say it to another friend without looking.",
            teacherNote: "A model first, then the child's own text, helps children see what a good note looks like before they write. Point out the three parts of the model: where, how it was, how I felt. The model is original and made up. Keep the correction to the two or three things on the checklist.",
            tiers: [
              { level: "Support", task: "Copy the model and change two words to make it yours." },
              { level: "Core", task: "Write your own note of three sentences with the frames." },
              { level: "Stretch", task: "Write four sentences and add a reason with 'because'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My champion event talk",
        prompt: "Tell us about a fun event again, like in class. Say where you went, how it was and how you felt, and why.",
        length: "60-90 seconds",
        steps: [
          "Look at your note and your timeline from class.",
          "Say your talk three times to a family member, a toy or the mirror. Each time try to say it a little faster and with fewer stops.",
          "Record it once. Look at the camera and smile.",
          "Watch it once. Tell someone one thing you did well and one thing to do better next time.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell what the event was like and how you felt, with -ing and -ed, and keep talking without long stops.",
        words: ["excited", "exciting", "amazed", "amazing", "relaxed", "relaxing"],
        grammar: ["The ___ was ___, so I felt ___.", "I felt ___ because the ___ was ___.", "Last ___, I went to ..."],
        rubric: [
          { label: "-ed and -ing", description: "Uses -ing for the thing and -ed for the person correctly.", weight: 3 },
          { label: "Keeps going", description: "Keeps talking without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Time and past", description: "Uses a time word and past verbs: last weekend, went, was.", weight: 2 },
          { label: "Clear endings", description: "The final -d of -ed words and the -ing of -ing words can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Last ___, I went to ___.", "The ___ was ___.", "I felt ___."], tips: ["Look at your note, then say it without looking."] },
          { level: "Core", who: "Most children", frames: ["The ___ was ___, so I felt ___.", "I felt ___ because the ___ was ___."], tips: ["Say where, how it was and how you felt."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["My ___ felt ___, too, because ...", "I think it was a fun day because ..."], tips: ["Say how someone else felt, and your opinion."] },
        ],
      },
    },
  },
};
