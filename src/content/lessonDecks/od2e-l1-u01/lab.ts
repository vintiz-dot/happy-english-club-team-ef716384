import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 1 "Families and
// Friends" (src/lib/lessonDecks/lab.ts puts it into the decks). Venus is grades 2-4 (ages 7-10),
// beginners in English. Every lesson gets a grammar drill (the lesson's grammar or key structure,
// changed again and again with sign cards, ending in real talk), one more fluency routine (the
// unit's phrases said as whole, joined sentences, a little faster each round, with earlier
// lessons' phrases mixed back in) and one writing routine (say it, write it, read it back).
// Lessons 1, 2 and 5 write a planned paragraph; lessons 3 and 4 write joined sentences. Lessons 1
// and 3 end with a recorded talk for home, built on the routine the class just did (Lesson 4
// already has its own video). Time comes from games and chants pitched at younger children
// (freeze, quiet circles, run-and-touch, Simon says), never from the book pages or the grammar.
// All text is original.

const grammarPrompt =
  "Between rounds 1 and 2, write the two mistakes you heard most on the board (no names) and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it themselves (start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the mistake with a rising voice) rather than saying it for them. For a sound, just say it right and let them echo it. Say every final sound and -s clearly yourself: children copy what they hear.";

const grownUp = "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U1Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u01-l1": {
      objectives: ["I can say 'This is my ___, and ___.' and 'My family is big because ___.' fast, without stopping.", "I can write four or five sentences about my family."],
      trim: { "Hello chant": 3, "Big or small? Stand and show (SB 7 C)": 4 },
      drop: ["Family chant and freeze", "What's missing?", "Calm close: whisper chant"],
      add: [
        {
          after: "Who can you see? (SB 8 B)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: this is, is this, this isn't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it with isn't, and join it with and, but or because. Then ask about real people.",
            chunks: [
              "This is my brother.",
              "Is this your brother?",
              "Yes, it is. / No, it isn't.",
              "This isn't my brother. He is my cousin.",
              "My family is big, but my friend's family is small.",
              "I like my family because we play together.",
            ],
            recycle: ["Hello, hello!", "Stand up, sit down."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with isn't, + = join it with and, but or because). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: my mother, my friend, my cousins." },
              { seconds: 90, say: "Real talk: ask your partner about their real family and friends. Is your family big or small? Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Is this ...?, X = say it with isn't, + = add 'and', 'but' or 'because'.",
              "Say the WHOLE new sentence: 'Is this your brother?' 'No, it isn't.'",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'This my brother' or 'Yes, it's'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about your partner's real family and remember one answer to tell the class.",
            ],
            prompts: ["This is my mother. (?)", "This is my sister. (X)", "My family is big. (+ but)", "This is my friend. (+ and)", "I like my family. (+ because)"],
            feedback: "Prompt, do not tell: for 'This my brother' say 'This ... ' and pause; for 'Is this you brother?' point to your own chest, then to the child, and say 'Your ...'; for 'Yes, it is not' hold up a finger and say 'No, it ...' and wait for 'isn't'. For a joined sentence with no joining word, tap the board where 'and' goes.",
            teacherNote: "A drill only helps when the last step is real: in round 3 the children ask about their own families, so the form is used for meaning. Grades 2-4 can take the full set: statement, question, short answers, 'isn't' and a joined sentence. Keep it brisk; a drill that drags loses its point. Use the family picture cards from the lesson as the sign-card pictures.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'this is my ___', with the frames on the board.", frames: ["Is this your ___?", "Yes, it is. / No, it isn't."] },
              { level: "Core", task: "Change every sentence, and join two ideas with and, but or because." },
              { level: "Stretch", task: "Use he and she too: 'This is my cousin, and she is nine. Is she your friend? No, she isn't.'" },
            ],
          },
        },
        {
          after: "Draw my family and friends",
          slide: {
            kind: "writing",
            title: "My family: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to each sentence and find the joining words (and, but, because).",
              "Plan: draw in the four boxes and write one key word under each drawing. Say one sentence for each box to your partner.",
              "Write: four or five sentences, one for each box. Use the frames. Join two ideas with and or because.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters, full stops and the little word 'is'. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My family",
              text: "This is my family. My family is big and kind. I live with my mother, my father and my little brother. My grandmother lives with us too, and she is very funny. We play together because we love each other.",
            },
            organiser: [
              { label: "Who", prompt: "Draw your family. Who is in your picture? Write a key word for each person." },
              { label: "Big or small", prompt: "Is your family big or small? Is it kind? Write two key words." },
              { label: "Home", prompt: "Draw your home. Who do you live with? Write their names in key words." },
              { label: "Together", prompt: "Draw what you do together. Why do you like your family? Write one key word." },
            ],
            frames: ["This is my family.", "My family is ___ and ___.", "I live with my ___, my ___ and my ___.", "We ___ together because ___."],
            checklist: ["Four or five sentences: who, big or small, home, together", "A capital letter at the start and a full stop at the end of each sentence", "The little word 'is' is in my second sentence", "I joined two ideas with and or because"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph for grades 2-4: four or five short sentences planned by drawing and key words, with frames; copying and finishing them is a good result, and a joined sentence with 'and' or 'because' is the stretch. Mark only capital letters, full stops and 'is'. Keep 'is' clear when you read the model. The paragraph can be the script for the recorded family picture talk at home.",
            tiers: [
              { level: "Support", task: "Copy the first three frames and fill in one word in each, then add 'We play together.'", frames: ["This is my family.", "My family is ___.", "I live with my ___."] },
              { level: "Core", task: "Write four sentences: who, big or small, who you live with, and what you do together, with one 'and'." },
              { level: "Stretch", task: "Write five sentences and use 'because': 'I love my family because they are kind.'" },
            ],
          },
        },
        {
          after: "Show your picture to a friend",
          slide: {
            kind: "fluency",
            title: "Family sprint: This is my ___",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the whole joined sentence, fast and smooth, with no stops. Then add a question.",
            chunks: [
              "This is my mother, and this is my father.",
              "This is my brother, and he is kind.",
              "My family is big, and I love it.",
              "My family is small, but we are happy.",
              "This is my friend, and we play together.",
              "Is your family big or small?",
            ],
            recycle: ["Hello, hello!", "Stand up, sit down."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher holds up two family cards, the class says one joined sentence." },
              { seconds: 60, say: "Pairs: one shows two cards, the other says the joined sentence. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. Say your joined sentence, then ask 'Is your family big or small?'" },
            ],
            steps: [
              "Look at the family cards. Say a WHOLE joined sentence: 'This is my mother, and this is my father.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers and ask your partner the question.",
              "Teacher: after round 1, stop for one minute. Put the two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(cards: mother + father)", "(cards: brother + kind face)", "(cards: big family + heart)", "(cards: small family + happy face)", "(cards: friend + toys)"],
            feedback: "For 'This is my mother this is my father' (no joining word), tap the board where 'and' goes and pause. For 'This my mother' (no 'is'), point to the frame, say 'This ... ' and pause. For 'My family big', say 'My family ...' and pause. For a sound, give a quick recast: the child says 'moder', you say 'mother', and the child echoes it. " + grammarPrompt,
            teacherNote: "Whole sentences only, never single words: the aim is 'This is my mother, and this is my father' as one smooth piece. Doing the same sentences over and over, a little faster each time, is how phrases become automatic. Listen for the missing 'is' and for 'fam-ily' said clearly. The grammar drill earlier in the lesson already changed the sentences; here they are said as long, smooth pieces.",
            tiers: [
              { level: "Support", task: "Say the joined sentences with the frames on the board, then say them with a friend.", frames: ["This is my ___, and this is my ___.", "My family is ___, but ___."] },
              { level: "Core", task: "Say a sentence joined with and or but, alone, without looking at the board." },
              { level: "Stretch", task: "Join with 'because' and ask a question: 'I love my family because we play together. Is your family big or small?'", frames: ["I love my ___ because ___.", "Is your family ___ or ___?"] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My family picture talk",
        prompt: "Show your family picture to the camera. Tell us who is in it. Say if your family is big or small, and why you like your family.",
        length: "60-90 seconds",
        steps: [
          "Look at your family picture and your paragraph from class.",
          "Say 'This is my ___.' for each person. Use 'and' or 'but' to join two ideas. Do it three times, a little faster each time.",
          "Record it once. Smile and look at the camera. At the end, ask the person watching: 'Is your family big or small?'",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say who is in your picture, join two ideas with and, but or because, and keep talking without long stops.",
        words: ["mother", "father", "brother", "sister", "grandmother", "grandfather", "family", "friend"],
        grammar: ["This is my ___, and ___.", "My family is big. / My family is small.", "I like my family because ___."],
        rubric: [
          { label: "Who is in it", description: "Says 'This is my ___.' for three or more people.", weight: 3 },
          { label: "Keeps going", description: "Talks for 60 seconds or more without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Joins ideas", description: "Joins two ideas with and, but or because, or asks the watcher a question.", weight: 3 },
          { label: "Is", description: "Says the little word 'is': This is my mother. My family is small.", weight: 1 },
          { label: "Clear sounds", description: "Family words are clear, with the end sounds of brother, mother and sister.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is my ___, and this is my ___.", "My family is ___."], tips: ["Point to each person in your picture."] },
          { level: "Core", who: "Most children", frames: ["This is my ___, and he / she is ___.", "My family is ___, but ___."], tips: ["Say who they are, then big or small, and join two ideas."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I like my family because ___.", "Is your family ___ or ___?"], tips: ["Say why you like your family, and finish with a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u01-l2": {
      objectives: ["I can tell about families and friends three times, faster each time, with 'and', 'but' and 'because'.", "I can write four or five sentences about my family."],
      trim: {
        "Big and small chant": 4,
        "Reading groups: find and retell (SB 10-11)": 12,
      },
      drop: ["Family Simon says", "Family statues", "Run and touch: big or small family", "Calm close: stretch and whisper"],
      add: [
        {
          after: "Which family is like yours? (SB 11)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: I live with, we play, we help",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it with Do, answer it, say it with don't, and join it with and, but or because. Then ask about real homes.",
            chunks: [
              "I live with my mother and my sister.",
              "Do you live with your grandmother?",
              "Yes, I do. / No, I don't.",
              "I don't live with my uncle, but he plays with us.",
              "We play together, and we help each other.",
              "We help each other because we are a family.",
            ],
            recycle: ["My family is big.", "This is my friend."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with Do, X = say it with don't, + = join it with and, but or because). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 90, say: "Real talk: ask your partner who they live with, and what they do together. Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = add 'and', 'but' or 'because'.",
              "Say the WHOLE new sentence, with no -s after I, you, we and they: 'We play together.'",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Do you lives' or 'Yes, I live'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really does at home, and remember one answer to tell the class.",
            ],
            prompts: ["I live with my mother. (?)", "We play together. (X)", "I live with my sister. (+ and)", "We help each other. (+ because)", "My friend lives with her father. (he / she)"],
            feedback: "Prompt, do not tell: for 'You live with your mother?' with no Do, hold up one finger and say 'D...?'; for 'Yes, I live.' repeat it with a rising voice and let the child fix it; for 'We plays together' say 'We play' with a rising voice. Say the -s of 'lives' and 'plays' (he, she) clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about who they really live with. Grades 2-4 can take the full set: question, short answers, negative, a joined sentence and a change of person. Keep it brisk. Vietnamese has no -s on verbs, so after he or she (Stretch) say the -s clearly and let the children hear it.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you live with your ___?", "No, I don't. I live with my ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join two ideas." },
              { level: "Stretch", task: "Use he and she too, with -s: 'My friend lives with her mother. Does she live with her father? No, she doesn't.'" },
            ],
          },
        },
        {
          after: "Good friends (SB 11)",
          slide: {
            kind: "fluency",
            title: "Family and friends: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same family story three times, with joined sentences. Each time is shorter, smoother and faster.",
            chunks: [
              "I live with my mother and father, and we eat together.",
              "We play together, but we help each other too.",
              "My family is big because my grandmother lives with us.",
              "Do you help your family? I help my mother at home.",
              "I love my family because they are kind.",
            ],
            recycle: ["This is my friend.", "My family is small."],
            rounds: [
              { seconds: 70, say: "Tell your partner about your family. Use the three picture cards (live, play, help), join them with and, but or because, then add 'I love my family because ...' if you can." },
              { seconds: 60, say: "New partner. Tell it again in less time." },
              { seconds: 50, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for 'live', two for 'play', three for 'help'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, find a new partner. Both partners tell their story in every round.",
              "The listener asks one question ('Do you help your family?') and says 'Nice!' at the end.",
            ],
            prompts: ["(picture: people at home)", "(picture: children playing)", "(picture: children helping)"],
            feedback: "For 'I live my mother' (no 'with'), hold up a finger and say 'I live ... ' and pause; the child says 'with'. For 'We plays together', say 'We play' with a rising voice and let the child repeat it. For two sentences with no joining word, tap the board where 'and' or 'but' goes. For sounds, a quick recast and echo. " + grammarPrompt,
            teacherNote: "The same story three times on purpose: the second and third tellings let children speak faster because they are not searching for words. The one-minute fix between rounds 1 and 2 is what makes the repeat more accurate, not just faster. Accept short tellings; the shrinking time does the work, and the joining words make the story sound like a story. Keep the picture cards on the board for Support children.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it, with the frames.", frames: ["I live with my ___, and ___.", "We play together, and we help each other."] },
              { level: "Core", task: "Tell all three parts with and or but, without the frames." },
              { level: "Stretch", task: "Add 'because' and a question: 'My family is big because my grandmother lives with us. Do you help your family?'" },
            ],
          },
        },
        {
          after: "Draw and label: together",
          slide: {
            kind: "writing",
            title: "My family together: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to each sentence and find the joining words (but, and, because).",
              "Plan: draw in the four boxes and write one key word under each drawing. Say one sentence for each box to your partner.",
              "Write: four or five sentences, one for each box. Use the frames. Join two ideas with and, but or because.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and the verbs after 'we' (we play, we help). Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My family together",
              text: "My family is small, but we are happy. I live with my mother and my sister. We play together, and we help each other. My mother makes dinner and I wash the dishes. I love my family because they are kind.",
            },
            organiser: [
              { label: "My family", prompt: "Draw your family. Is it big or small? Write two key words." },
              { label: "I live with", prompt: "Draw the people you live with. Write their names in key words." },
              { label: "We", prompt: "Draw what you do together: play or help. Write two key words." },
              { label: "I love", prompt: "Draw a heart. Why do you love your family? Write one key word." },
            ],
            frames: ["My family is ___, but / and ___.", "I live with my ___ and my ___.", "We play together, and we help each other.", "I love my family because ___."],
            checklist: ["Four or five sentences: my family, who I live with, what we do, why I love them", "A capital letter at the start and a full stop at the end of each sentence", "We play, we help: no -s after 'we'", "I joined two ideas with and, but or because"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A paragraph after the reading for grades 2-4: four or five short sentences planned by drawing and key words. The sentences come from the child's own family. Copying and finishing the frames is a good result for most children; the joining word is the Core step. Mark only capital letters and the verb after 'we'. Say 'play' and 'help' clearly, with no -s.",
            tiers: [
              { level: "Support", task: "Copy the first three frames and fill in one word in each.", frames: ["My family is ___.", "I live with my ___.", "We play together."] },
              { level: "Core", task: "Write four sentences with the frames and join two of them with 'and' or 'but'." },
              { level: "Stretch", task: "Write five sentences and end with 'because': 'I love my family because they help me.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u01-l3": {
      objectives: ["I can say 'I'm eight.' 'He's nine.' 'She's ten.' and join them with 'and' and 'but' without stopping.", "I can fix and write sentences with is and are."],
      drop: ["One or many? Stand and sit", "Calm close: whisper and wave"],
      add: [
        {
          after: "Puppet ages: I'm, he's, she's",
          slide: {
            kind: "fluency",
            title: "Puppet ages: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the same puppet task three times with three partners. Each time, say it smoother, with joined sentences.",
            chunks: [
              "I'm eight years old, and my brother is ten.",
              "She's nine years old, but he's seven.",
              "My family is big, and my friends are kind.",
              "How old is your friend? She's nine.",
              "My friends are kind because they help me.",
            ],
            recycle: ["This is my mother.", "We play together.", "We help each other."],
            rounds: [
              { seconds: 70, say: "Choose a puppet card. Tell your partner: who it is, how old, and one more thing. Join two ideas with and or but." },
              { seconds: 60, say: "New partner, new puppet. The same task, a bit faster. Ask 'How old is your puppet?'" },
              { seconds: 50, say: "New partner. Tell it with no stops!" },
            ],
            steps: [
              "Take a puppet card. Say 'I'm ___ years old' for yourself, then 'He's / She's ___' for the puppet, joined with 'and' or 'but'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, find a new partner and a new puppet. Both partners speak in every round.",
              "The listener points to the puppet and says 'Yes!' if the sentence is right.",
            ],
            prompts: ["(card: boy, nine)", "(card: girl, seven)", "(card: big family)", "(card: two kind friends)"],
            feedback: "For 'I eight years old', point to the frame and say 'I' ... then pause: the child adds 'm'. For 'He's my sister', point to the picture and ask 'He or she?' with a raised finger. For 'My friends is kind', say 'My friends ... ' with a rising voice and hold up two fingers for 'more than one'. For 'eight year', hold up the finger for the -s and ask for the end. " + grammarPrompt,
            teacherNote: "Task repetition (same task, new partner) frees attention for accuracy on the second and third time. Listen for I'm, he's and she's, for is/are with 'family' and 'friends', and for the -s in years. Say 'years' with a clear final sound yourself. The joined sentences are the harder part for grades 2-4: tap the board where 'and' or 'but' goes.",
            tiers: [
              { level: "Support", task: "Say the joined sentences with the frames on the board and your partner.", frames: ["I'm ___ years old, and he's / she's ___.", "My family is ___."] },
              { level: "Core", task: "Say three or four joined sentences without the board." },
              { level: "Stretch", task: "Add the puppet's family and a question: 'She's nine years old, but she's tall. Her family is big. How old is your puppet?'" },
            ],
          },
        },
        {
          after: "Be: I'm, he's, she's, is, are (SB 13 D)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: I'm, he's, she's, is, are",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it with not, and join it with and, but or because. Then ask about real people.",
            chunks: [
              "I'm eight years old, and he's nine.",
              "Are you eight? Yes, I am. / No, I'm not.",
              "Is she your cousin? Yes, she is. / No, she isn't.",
              "She isn't nine because she's ten.",
              "My family is big, and my friends are kind.",
              "Are your friends kind? Yes, they are.",
            ],
            recycle: ["This is my friend.", "We play together."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with not, + = join it with and, but or because). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, he, she, my family, my friends." },
              { seconds: 90, say: "Real talk: ask your partner about their real age, their family and their friends. Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = put am, is or are first, X = add not, + = add 'and', 'but' or 'because'.",
              "Say the WHOLE new sentence: 'Is she your cousin?' 'No, she isn't.'",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Are you eight? Yes, I'm' or 'My friends is'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really is and has, and remember one answer to tell the class.",
            ],
            prompts: ["I'm eight. (?)", "He's nine. (?)", "She's my cousin. (X)", "My friends are kind. (+ and)", "My family is small. (+ but)"],
            feedback: "Prompt, do not tell: for 'You eight?' hold up one finger and say 'Are ...?'; for 'Yes, I'm.' repeat it with a rising voice and let the child fix it (Yes, I am); for 'My friends is kind' hold up two fingers. Say the 's of he's and she's and the -s of years clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about their own age, family and friends. Vietnamese has no 'to be' before an adjective or a number, so a missing am / is / are is the likely slip, then 'Yes, I am' (not 'Yes, I'm'). Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Are you ___? Yes, I am. / No, I'm not.", "I'm ___ years old."] },
              { level: "Core", task: "Change every sentence, with I, you, he, she, my family and my friends, and join two ideas." },
              { level: "Stretch", task: "Use because and they: 'My friends aren't eight because they're nine. Are they kind? Yes, they are.'" },
            ],
          },
        },
        {
          after: "Write about me (SB 13 D)",
          slide: {
            kind: "writing",
            title: "Fix the be sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing little word, a missing -s, or he/she.",
              "Write it the right way. Read it aloud together.",
            ],
            items: [
              { q: "I eight years old, and my sister is ten.", answer: "I'm eight years old, and my sister is ten." },
              { q: "My family big, but we are happy.", answer: "My family is big, but we are happy." },
              { q: "My friends is kind because they help me.", answer: "My friends are kind because they help me." },
              { q: "My brother is nine. She is funny.", answer: "My brother is nine. He is funny." },
              { q: "I'm eight years old, but my cousin is ten year old.", answer: "I'm eight years old, but my cousin is ten years old." },
            ],
            checklist: ["I'm, is or are is in my sentence", "One: is. More than one (friends): are", "he for a boy, she for a girl", "The joining word (and, but, because) stays"],
            sayIt: "Say all five fixed sentences to your partner, fast.",
            teacherNote: "Vietnamese has no verb 'to be' before an adjective or a number (a family big, I eight), so a missing 'am / is / are' is a likely slip, and 'is' for 'friends' may come next. Fix one together first; praise a child who spots the mistake before you point. Each sentence has two ideas, so children also read how and, but and because join them.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 2 and 3 with the frames on the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two more sentences with a mistake and a joining word for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Me and my friend: I'm, he's, she's",
        prompt: "Tell us your name and how old you are. Then tell us about a friend or someone in your family: who is it, how old are they, and are they kind? Say why you like them.",
        length: "60-90 seconds",
        steps: [
          "Choose one friend or family member and a photo or drawing of them.",
          "Practise three times: 'I'm ___ years old, and he's / she's ___ years old.' Each time a little faster.",
          "Record it once. Show the photo or drawing. Join your ideas with 'and', 'but' or 'because'.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say how old you are, tell about one person with 'He's' or 'She's', join your ideas with and, but or because, and keep talking without long stops.",
        words: ["years old", "family", "friends", "kind", "big", "small", "happy"],
        grammar: ["I'm ___ years old, and he's / she's ___.", "My family is ___. My friends are ___.", "I like him / her because ___."],
        rubric: [
          { label: "I'm, he's, she's", description: "Says I'm for self and he's or she's for the other person correctly.", weight: 3 },
          { label: "Keeps going", description: "Talks for 60 seconds or more without long stops, in whole sentences.", weight: 3 },
          { label: "Joins ideas", description: "Joins two ideas with and, but or because, or asks the watcher a question.", weight: 3 },
          { label: "Is and are", description: "Says 'My family is ...' and 'My friends are ...' correctly.", weight: 2 },
          { label: "Years", description: "The -s at the end of 'years' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I'm ___ years old, and he's / she's ___.", "My family is ___."], tips: ["Hold up your fingers for the numbers."] },
          { level: "Core", who: "Most children", frames: ["I'm ___ years old, but he's / she's ___ years old.", "My family is ___, and my friends are ___."], tips: ["Say who the person is first: 'This is my ___.'"] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I like my friend because he's / she's ___.", "How old is your friend?"], tips: ["Say why you like the person, and finish with a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u01-l4": {
      objectives: ["I can talk about my family to three friends, faster each time, with 'and', 'but' and 'because'.", "I can join two sentences about my family with a joining word."],
      trim: {
        "Family word ball chant": 4,
        "Listen, point, say (SB 14 A)": 6,
        "Which column? Sort the words (SB 14 B)": 5,
        "Opposites ball game (SB 15 F)": 6,
      },
      drop: ["Guess who? (family riddles)", "Calm close: thank you circle"],
      add: [
        {
          after: "This is my ... Hello! (SB 15 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: meet my family",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the introduction fast and right: ask it, answer it, say it with isn't, and join it with and, but or because. Then ask about real families.",
            chunks: [
              "Hello! This is my uncle, and he is kind.",
              "Is this your cousin? Yes, it is. / No, it isn't.",
              "These are my parents, and they are kind.",
              "He isn't my brother. He's my cousin.",
              "I'm eight, but my cousin is ten.",
              "Nice to meet you! Is this your family?",
            ],
            recycle: ["I'm eight years old.", "My family is big."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with isn't, + = join it with and, but or because). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A introduces a family card and shows a sign card, B changes it. Swap at the clap. Change the person too: my uncle, my aunt, my parents, my cousins." },
              { seconds: 90, say: "Real talk: introduce a real person from your family to your partner, and ask one question about their family. Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Is this ...?, X = say it with isn't, + = add 'and', 'but' or 'because'.",
              "Say the WHOLE new sentence: 'Is this your cousin?' 'No, it isn't. He's my brother.'",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'This are my parents' or 'My parents is kind'), fix them together, then go on.",
              "In round 3 the drill becomes real: introduce a real person and ask a real question, then remember one answer to tell the class.",
            ],
            prompts: ["This is my uncle. (?)", "He is my brother. (X)", "These are my parents. (+ and)", "She is my cousin. (+ but)", "Nice to meet you. (+ a question)"],
            feedback: "Prompt, do not tell: for 'This are my parents' hold up two fingers and say 'These ...'; for 'My parents is kind' say 'My parents ...' with a rising voice; for 'Is this your cousin? Yes, it's' hold up a finger and say 'Yes, it ...'. For two ideas with no joining word, tap the board where 'and' goes.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children introduce someone they really know. This lesson has no grammar slide, so the drill uses the unit's key structure: this is / these are, he's / she's and the joined sentence. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'This is my ___', with the frames on the board.", frames: ["Is this your ___?", "No, it isn't. He's / She's my ___."] },
              { level: "Core", task: "Change every sentence, with this and these, and join two ideas." },
              { level: "Stretch", task: "Add a question and 'because': 'He isn't my brother because he's my cousin. Is this your family?'" },
            ],
          },
        },
        {
          after: "Grammar drill: meet my family",
          slide: {
            kind: "fluency",
            title: "Family talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same family talk to three friends, with joined sentences and a question. Each talk is shorter and smoother.",
            chunks: [
              "Hello! This is my uncle, and he is very funny.",
              "This is my cousin, and she is ten years old, but I'm eight.",
              "My parents are kind because they help me.",
              "We play together, and we help each other at home.",
              "Nice to meet you! Is this your family?",
            ],
            recycle: ["I'm eight years old.", "My family is big.", "We play together.", "I live with my mother and father."],
            rounds: [
              { seconds: 70, say: "Partner 1: give your family talk. The listener counts the people on their fingers." },
              { seconds: 60, say: "Partner 2: the same talk in less time." },
              { seconds: 50, say: "Partner 3: fast and smooth! The listener says 'Nice to meet you!' at the end and asks one question." },
            ],
            steps: [
              "Stand in two lines facing each other. In every round, both partners give their talk.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner for round 2, and again for round 3.",
              "Use 'and', 'but' or 'because' at least once in your talk.",
            ],
            feedback: "For 'My parents is kind', say 'My parents ... ' with a rising voice and hold up two fingers. For 'This is my cousin. She's ten.' about a boy, point to the card and ask 'He or she?'. For 'This my uncle', point to the frame and pause after 'This'. For the end sound of 'cousin' or 'uncle', give a quick recast and let the child echo it. " + grammarPrompt,
            teacherNote: "Same talk, less time, new listener: the 4-3-2 activity made shorter for grades 2-4. The new partner keeps the repetition real. Do not add new words between rounds; the gain comes from saying the same thing more smoothly and joining ideas. Listen for is/are with 'parents' and for the 's' in 'parents' and 'years'.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames, joining two with 'and'.", frames: ["Hello! This is my ___, and he / she is ___.", "My ___ is kind."] },
              { level: "Core", task: "Say four or five sentences without the board, with 'and', 'but' or 'because'." },
              { level: "Stretch", task: "Say a long talk with two joining words and finish with a question: 'My cousin is ten, but I'm eight. We play together because we are friends. Is this your family?'" },
            ],
          },
        },
        {
          after: "Say it before you write (SB 15 Write)",
          slide: {
            kind: "writing",
            title: "Join my family sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences and the joining word in brackets.",
              "Make ONE sentence with the joining word. Say it first, then write it.",
              "Read your sentence to your partner.",
            ],
            items: [
              { q: "My uncle is kind. My uncle is funny. (and)", answer: "My uncle is kind and funny." },
              { q: "I'm eight. My cousin is ten. (but)", answer: "I'm eight, but my cousin is ten." },
              { q: "I love my parents. They are kind. (because)", answer: "I love my parents because they are kind." },
              { q: "I live with my mother. I live with my father. (and)", answer: "I live with my mother and my father." },
              { q: "We do our homework. We play. (then)", answer: "We do our homework, and then we play." },
            ],
            checklist: ["Only one 'is', 'are' or 'live with' in each sentence where the words allow it", "The joining word joins the two ideas", "A comma before 'but' and 'and then'", "A capital letter and a full stop"],
            sayIt: "Say your joined sentences to your partner without looking.",
            teacherNote: "Sentence combining is a well-known way to grow sentence writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'My uncle is'. Grades 2-4 can take all five, with 'but', 'because' and 'then' as well as 'and'. Check 'are' with 'parents': the same finger-for-two prompt as in speaking.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, then item 4." },
              { level: "Core", task: "Do all five." },
              { level: "Stretch", task: "Join three ideas: 'My family is kind, happy and funny, and we play together.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u01-l5": {
      objectives: ["I can ask 'How old is he?' and answer it fast, round the circle, with a joined sentence.", "I can write four or five sentences about a friend."],
      trim: { "Photo gap: How old is he?": 10 },
      drop: ["Run to the mat"],
      add: [
        {
          after: "Grammar: I'm, he's, she's, is and are",
          slide: {
            kind: "fluency",
            title: "Grammar drill: how old, is he, he isn't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it with isn't, and join it with and, but or because. Then ask about real friends.",
            chunks: [
              "I'm eight, and he's my brother.",
              "How old is she? She's nine, and she's my cousin.",
              "Is he your brother? Yes, he is. / No, he isn't.",
              "She isn't my sister because she's my friend.",
              "My friends are funny, but my brother isn't.",
              "Are your friends kind? Yes, they are.",
            ],
            recycle: ["I'm eight years old.", "This is my aunt."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with isn't, + = join it with and, but or because). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, he, she, my friend, my friends." },
              { seconds: 90, say: "Real talk: ask your partner about a real friend: How old is he or she? Is your friend kind? Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = put is or are first, X = add not (isn't), + = add 'and', 'but' or 'because'.",
              "Say the WHOLE new sentence: 'Is he your brother?' 'No, he isn't. He's my cousin.'",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'He's my sister' or 'Yes, he's'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about a real friend, and remember one answer to tell the class.",
            ],
            prompts: ["He's nine. (?)", "She's my cousin. (X)", "I'm eight. (+ and he's nine)", "My friends are kind. (+ because)", "My brother is funny. (+ but)"],
            feedback: "Prompt, do not tell: for 'He's my sister' point to the picture and ask 'He or she?'; for 'Yes, he's.' repeat it with a rising voice and let the child fix it (Yes, he is); for 'How old he?' hold up a finger and say 'How old ...' and pause. Say the 's of he's and she's and the -s of years clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about a friend they really have. This is the Grammar Champions lesson: the children already have the rule from the grammar slide, so the drill is about speed and accuracy, with the joining words as the harder step. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with he and she, with the frames on the board.", frames: ["Is he / she your ___?", "Yes, he / she is. / No, he / she isn't."] },
              { level: "Core", task: "Change every sentence, with I, he, she, my friend and my friends, and join two ideas." },
              { level: "Stretch", task: "Use because and a follow-up question: 'She isn't my sister because she's my friend. How old is she?'" },
            ],
          },
        },
        {
          after: "Photo gap: How old is he?",
          slide: {
            kind: "fluency",
            title: "Question chain: How old is he?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer with a joined sentence, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "How old is he? He's nine, and he's my cousin.",
              "How old is she? She's ten, and she's my friend.",
              "Is he your brother? No, he isn't. He's my cousin.",
              "My friends are kind because they help me.",
              "I'm eight, but she's ten.",
            ],
            recycle: ["I'm eight years old.", "This is my aunt."],
            rounds: [
              { seconds: 80, say: "Slow chain round the circle. Everyone holds a person card." },
              { seconds: 70, say: "Swap cards. Go faster! Add 'and' or 'but' to your answer." },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your person card so only you can see it.",
              "Ask the friend on your left: 'How old is he?' or 'How old is she?' about your card.",
              "They answer with a joined sentence: 'He's nine, and he's my cousin.' Then they turn and ask the next friend about their own card.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["How old is he?", "How old is she?", "Is he your brother?", "(card: boy, nine)", "(card: girl, ten)"],
            feedback: "For 'How old he?' (no 'is'), hold up a finger and say 'How old ... ' and pause. For 'She's nine' said about a boy card, point to the picture and ask 'He or she?'. For 'He nine years old', point to the frame: 'He ... ' and the child adds 's. For 'ten year', hold up a finger for the -s. For an answer with no joining word, tap the board where 'and' goes. " + grammarPrompt,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'How old is he?' automatic, and the joined answer is the step up for grades 2-4. Time the whole circle and tell them; children love beating their own time. Listen for the missing 'is' and the 's in he's and she's.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["How old is he / she?", "He's / She's ___, and he's / she's my ___."] },
              { level: "Core", task: "Ask and answer with a joined sentence, without looking at the board." },
              { level: "Stretch", task: "Add a second question and 'because': 'Is he your brother? No, he isn't, because he's my cousin.'" },
            ],
          },
        },
        {
          after: "Grammar Champion check",
          slide: {
            kind: "writing",
            title: "My friend: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to each sentence and find the joining words (and, but, because).",
              "Plan: draw in the four boxes and write one key word under each drawing. Say one sentence for each box to your partner.",
              "Write: four or five sentences, one for each box. Use the frames. Join two ideas with and, but or because.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at he's and she's and is and are. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My friend Mimi",
              text: "This is my friend Mimi. She's eight years old, and she's very kind. Her family is big, but her house is small. Mimi and I are friends because we play together. We are happy at school.",
            },
            organiser: [
              { label: "Who", prompt: "Draw your friend. What is your friend's name? Is it a boy or a girl?" },
              { label: "How old and kind", prompt: "Draw your friend's age and a kind face. Write two key words." },
              { label: "Family", prompt: "Draw your friend's family. Is it big or small? Write one key word." },
              { label: "We", prompt: "Draw you and your friend. What do you do together? Why are you friends?" },
            ],
            frames: ["This is my friend ___.", "He's / She's ___ years old, and he's / she's ___.", "His / Her family is ___, but ___.", "___ and I are friends because ___."],
            checklist: ["He's for a boy, She's for a girl", "is for one, are for two", "A capital letter at the start and a full stop at the end of each sentence", "I joined two ideas with and, but or because"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "The model is ours, not the book's; Mimi is the puppet name used in class. It uses the same grammar as the lesson (he's, she's, is, are) in a paragraph of four or five short sentences for grades 2-4, planned by drawing and key words. Copying the frames and filling in a name and a number is a good result; the joining word is the Core step. Mark only he's / she's and is / are. The paragraph can be the script for the recorded talk about a friend.",
            tiers: [
              { level: "Support", task: "Copy the first two frames and fill in your friend's name and age, then add 'We play together.'", frames: ["This is my friend ___.", "He's / She's ___ years old."] },
              { level: "Core", task: "Write four sentences about your friend with the frames, and join two ideas with 'and' or 'but'." },
              { level: "Stretch", task: "Write five sentences and use 'because': 'We are friends because we help each other.'" },
            ],
          },
        },
      ],
    },
  },
};
