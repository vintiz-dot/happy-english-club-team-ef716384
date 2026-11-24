// Reach Higher Level 3A, Unit 1: Happy to Help (Big Question: How do people help
// each other?). Jupiter finished Unit 1 before the decks existed, so the unit has
// ONE 90-minute review lesson on the Unit Wrap-Up block (Student Book pages 72-73)
// and then the end-of-unit test (rh-l3-u1/assessments.ts), built like the last
// lesson of Units 2-4 (see the header of rh-l3-u2.ts for the plan every lesson follows).
//
// Unit 1 as the 3A Teacher's Edition gives it (pages are the 3A Student Book's):
//   Part 1: Language Focus "retell a story" (dialogue "A Friend Helps Out", Tanya and Sonia, 4); key
//   words (5, 7); story map (6); preview and predict (8-9); phonics compound words
//   (10-11); "Those Shoes", realistic fiction by Maribeth Boelts (12-27); think and
//   respond (28-29); alphabetical order (30); "Guardian Angel", a poem by Francisco
//   X. Alarcón (31-33); compare genres (34); grammar: complete sentences (35).
//   Part 2: Language Focus "make comparisons" (song, 36); key words (37, 39);
//   comparison chart (38); monitor and clarify (40-41); phonics syllable division
//   (42-43); "The World's Greatest Underachiever", autobiography by Henry Winkler
//   (44-57); think and respond (58-59); dictionary and glossary (60); "Joseph
//   Lekuton: Making a Difference", biography by Phillip Kennedy (61-65); compare
//   points of view (66); grammar: subjects and predicates that agree (67).
//   Writing project: personal narrative, trait voice (68-71). Wrap-up (72-73).
//
// Copyright: everything here is the school's own. The deck names the selections and
// pages and never reproduces book text, the Teacher's Edition or the publisher's tests.
//
// {s1} .. {s9} are filled on screen with children from the class roster.
import type { Deck, Unit } from "@/lib/lessonDecks/types";
import { withLab } from "@/lib/lessonDecks/lab";
import { rhL3U1Lab } from "./rh-l3-u1/lab";
import { rhL3U1Assessments } from "./rh-l3-u1/assessments";
import { keyWordAudio, talkAudio, unitVideo } from "./rh-l3/media";

const base = { curriculum: "reach-higher" as const, level: 3, unit: 1, minutes: 90 };
const BQ = "How do people help each other?";
const video = unitVideo(1);

const lessons: Deck[] = [
  // ------------------------------------------------------------------ Lesson 1
  {
    ...base,
    id: "rh-l3-u1-l1",
    lesson: 1,
    covers: { unitFrom: 1, lesson: "Unit Wrap-Up" },
    title: "Unit Wrap-Up: helping hands (review before the test)",
    inquiryPhases: ["Organize", "Generalize", "Transfer", "Reflect"],
    book: [{ book: "SB", pages: "72-73", note: "Unit Wrap-Up: complete the unit concept map and write a plan (72); share your ideas (73)." }],
    slides: [
      { kind: "title", title: "Unit 1: Happy to Help", subtitle: "Lesson 1 · Unit Wrap-Up and review", bigQuestion: BQ },
      {
        kind: "objectives",
        items: [
          "I can use the Unit 1 key words to talk and write about helping.",
          "I can write complete sentences with a subject and a predicate, and make the subject and the verb agree.",
          "I can answer the Big Question with examples from the unit and from my own life.",
          "I can write a plan to solve a problem in my neighborhood.",
        ],
      },
      {
        kind: "exam",
        title: "Retrieval sprint: Unit 1 grammar",
        format: "multiple choice",
        mode: "solo",
        minutes: 8,
        instructions: "Whiteboards. Answer, show, give a one-sentence reason.",
        items: [
          {
            q: "Which one is a complete and correct sentence?",
            options: ["The new boots.", "Grandma buys boots for Jeremy.", "Buys boots for Jeremy.", "grandma buys boots for Jeremy."],
            answer: "B. Grandma buys boots for Jeremy.",
            why: "A has no predicate, C has no subject, D has no capital letter.",
          },
          { q: "My grandmother ___ the newspaper every morning.", options: ["read", "reads", "reading", "are reading"], answer: "B. reads", why: "one person (she) → verb + s" },
          { q: "Henry and his friends ___ to school together.", options: ["walks", "is walking", "walk", "walking"], answer: "C. walk", why: "two subjects joined by and = more than one" },
          { q: "The volunteers ___ very kind.", options: ["is", "am", "are", "be"], answer: "C. are", why: "be: they are" },
          { q: "What is the simple subject? 'The tall boy in my class helps his neighbor.'", options: ["tall", "boy", "class", "helps"], answer: "B. boy", why: "who helps? the boy (class is only part of the description)" },
          { q: "Joseph Lekuton ___ a teacher.", options: ["is", "are", "am", "be"], answer: "A. is", why: "be: he is" },
        ],
      },
      {
        kind: "activity",
        title: "Story relay: retell it in order",
        tag: "Speaking",
        mode: "groups",
        minutes: 10,
        book: { book: "SB", pages: "4", note: "Language Focus: Retell a Story (the dialogue 'A Friend Helps Out' and the language frames)." },
        steps: [
          "Play the Part 1 dialogue once. Clap on every sequence word you hear.",
          "In groups of three or four, retell 'Those Shoes' as a relay: each person tells one event, then passes on with the next sequence word (First, Next, Then, Finally).",
          "Second round: retell Henry Winkler's or Joseph Lekuton's story the same way, in the third person (he, his).",
          "One group retells with one event out of order. The others find it and fix it.",
        ],
        frames: ["First, ___.", "Next, ___.", "Then, ___.", "Finally, ___.", "In the beginning ___. In the middle ___. At the end ___."],
        teacherNote:
          "Organize. 'Those Shoes' (realistic fiction by Maribeth Boelts, SB 12-27) is told by Jeremy. The order to listen for: Jeremy wants the black high-tops the other children have, but Grandma says he needs boots; his shoe falls apart and Mr. Alfrey at school gives him a pair, and the children laugh; the high-tops cost too much in the shops; he finds a pair in a thrift shop that is too small and buys them with his own money; Grandma buys him boots; he sees that Antonio needs shoes, leaves the high-tops for Antonio and runs away; at the end he wears his new boots to race with Antonio. Joseph Lekuton (biography, SB 61-65): his Maasai family in Kenya could send one child to school; his brother did not like school, so Joseph volunteered to go; he became a teacher and helps more Maasai children go to school.",
        media: [talkAudio(1, 1, 4, "A Friend Helps Out (dialogue, SB 4)")],
      },
      {
        kind: "vocab",
        title: "Key words: Part 1",
        book: { book: "SB", pages: "5-7", note: "Social studies words on page 5, academic words on page 7." },
        media: [keyWordAudio(1, 1, "Part 1 key words")],
        words: [
          { word: "action", meaning: "something that you do", example: "Small actions, like holding a door open, show that you care." },
          { word: "difference", meaning: "the way two things are not the same; make a difference = change something for the better", example: "Our clean-up made a big difference to the school yard." },
          { word: "gift", meaning: "something you give to someone", example: "{s1} made a card as a gift for the teacher." },
          { word: "problem", meaning: "something that is wrong and has to be put right", example: "My bike has a flat tire. That is a problem!" },
          { word: "receive", meaning: "to get something that someone gives or sends you", example: "Did you receive my message?" },
          { word: "solution", meaning: "the answer to a problem", example: "The solution was to share one umbrella." },
          { word: "kindness", meaning: "caring, friendly behavior towards other people", example: "{s2} showed kindness to the new student." },
          { word: "need", meaning: "to have to have something, because you cannot do without it", example: "Plants need water and light." },
          { word: "understand", meaning: "to know what something means or why it happens", example: "I understand a story better when I read it twice." },
          { word: "value", meaning: "to think that something is important to you", example: "I value my friends more than my toys." },
          { word: "want", meaning: "to wish for something (you may not need it)", example: "I want a kite, but I don't need one." },
        ],
      },
      {
        kind: "vocab",
        title: "Key words: Part 2",
        book: { book: "SB", pages: "37-39", note: "Social studies words on page 37, academic words on page 39." },
        media: [keyWordAudio(1, 2, "Part 2 key words")],
        words: [
          { word: "improve", meaning: "to make something better", example: "Reading every day improves your English." },
          { word: "individual", meaning: "a single person, on his or her own", example: "Each individual in the team has a job." },
          { word: "neighborhood", meaning: "the area and the people around your home", example: "There is a small market in my neighborhood." },
          { word: "offer", meaning: "to say that you will give or do something", example: "{s3} offered to carry the chairs." },
          { word: "volunteer", meaning: "a person who helps without being paid", example: "Volunteers planted trees around the lake." },
          { word: "benefit", meaning: "something good that you get from something", example: "One benefit of walking to school is fresh air." },
          { word: "duty", meaning: "something you should do because it is right or it is your job", example: "It is my duty to feed our cat." },
          { word: "identify", meaning: "to find out or say what something is", example: "The doctor identified the problem quickly." },
          { word: "impact", meaning: "a strong effect on someone or something", example: "The new library had a big impact on our town." },
          { word: "learn", meaning: "to get to know something or how to do something", example: "My grandfather wants to learn to use a smartphone." },
        ],
      },
      {
        kind: "activity",
        title: "Key word challenge: define, sort, build",
        tag: "Vocabulary",
        mode: "groups",
        minutes: 10,
        steps: [
          "Team quiz (4 minutes): Team A says a key word, Team B defines it in a complete sentence and gives an example. Swap. A wrong or incomplete sentence gives the point back.",
          "Need or want? (3 minutes): sort the cards: clean water, a new phone game, a warm coat in winter, sweets, medicine when you are ill, a second football. Explain one card with 'We need ___ because ___.'",
          "Word builders (3 minutes): make the noun: kind → kindness, solve → solution, act → action, different → difference, improve → improvement. And one adjective: help → helpful. Then use two in one sentence.",
        ],
        prompts: ["A volunteer is a person who ___.", "We need ___ because ___.", "We want ___, but we don't need it.", "Her kindness made a difference because ___."],
        teacherNote: "Retrieval of all 21 words before the test (Part A tests ten of them in context; Part E tests word formation). 'Need or want' is the idea at the heart of 'Those Shoes': Jeremy wants the high-tops but needs boots.",
      },
      {
        kind: "activity",
        title: "Case files: who helped whom?",
        tag: "Review",
        mode: "groups",
        minutes: 12,
        book: { book: "SB", pages: "72", note: "Talk Together: complete the unit concept map (Practice Book 1.1)." },
        steps: [
          "Each group gets one case card: 'Those Shoes' (SB 12-27), 'Guardian Angel' (SB 31-33), 'The World's Greatest Underachiever' (SB 44-57) or 'Joseph Lekuton: Making a Difference' (SB 61-65).",
          "Fill in the chart for your case: Who needed help? What did they need? Who helped, and how? What was it like before, and what is it like now?",
          "Share in one minute. Then, as a class, finish the sentence: 'People help each other by ___.' Test it against all four cases.",
          "Improve the sentence: add 'when', 'because' or 'often' so it is true for every case. Write the class sentence on the concept map.",
        ],
        frames: ["___ needed ___.", "___ helped by ___.", "Before, ___. Now, ___.", "People help each other by ___ when ___."],
        teacherNote:
          "Generalize. The cases as the Teacher's Edition gives them: Jeremy gives Antonio the shoes Antonio needs, although Jeremy values them; in the poem, a girl who sits sad and alone in class feels better when another girl takes her hand and shows she will be her friend; Henry Winkler, who learned differently and found school very hard (he has dyslexia), became an actor and writer and now helps children understand that everyone is special; Joseph Lekuton volunteered to go to school, became a teacher and helps Maasai children go to school. Push the sentence past 'People are kind' towards a relationship, e.g. 'When people notice what someone needs, they can make a difference by giving time, things or kindness'. Do not give a sentence: keep the children's best one for the video.",
      },
      {
        kind: "activity",
        title: "Video case: Saving Stranded Whales",
        tag: "Listening",
        mode: "pairs",
        minutes: 10,
        steps: [
          "Before: have you ever seen an animal that needed help? What did people do? Tell your partner in 30 seconds.",
          "Watch the Unit 1 video. Note: why do the whales need help? Who helps them, and what does each person do?",
          "Tick the key words you can use about the video: difference, individual, volunteer, identify, need. Say one sentence with each word you ticked.",
          "After: test our class sentence from Case files on this new case. Does it fit whales as well as people? Change one word if needed.",
        ],
        prompts: ["The whales needed help because ___.", "The volunteers ___.", "One individual can ___, but together they ___.", "Our sentence fits / does not fit because ___."],
        teacherNote:
          "Transfer. Play the Reach Higher 3A video for Unit 1, Saving Stranded Whales, from the link on this slide (the school's Drive copy; nothing is hosted in the app). The publisher's video overview lists its words as difference, individual, volunteer, identify and need. Check the children's reasons against the video itself rather than a key.",
        ...(video ? { media: [video] } : {}),
      },
      {
        kind: "activity",
        title: "Pattern hunt: complete or not?",
        tag: "Grammar",
        mode: "pairs",
        minutes: 7,
        steps: [
          "On the board: 'Jeremy wants black high-tops.' · 'Wants new boots.' · 'The kind girl takes my hand.' · 'In the classroom by the window.' · 'Henry tells funny jokes.' · 'The children laughs.' · 'Volunteers help at the hospital.' · 'My friends is kind.'",
          "Sort them: makes full sense / does not. What is missing from the ones that don't?",
          "In the ones that make sense, draw a line between WHO (the subject) and WHAT THEY DO (the predicate).",
          "Circle every verb. When does it end in -s? Which two sentences have a wrong verb? Say the rule before the teacher shows it.",
        ],
        prompts: ["This is not a sentence because it has no ___.", "The verb ends in -s when the subject is ___.", "We say 'The children laugh' because ___."],
        teacherNote: "Examples first: let the children state both rules (subject + predicate; verb + s with one person or thing) before the next two slides confirm them.",
      },
      {
        kind: "grammar",
        title: "Complete sentences: subject + predicate",
        hook: "A sentence needs a WHO (or what) and a WHAT THEY DO, a capital letter at the start and a mark at the end.",
        book: { book: "SB", pages: "35", note: "Grammar: Complete Sentences (Part 1)." },
        form: [
          { label: "Subject + predicate", pattern: "Jeremy + gives Antonio the shoes. → Jeremy gives Antonio the shoes." },
          { label: "Subject", pattern: "who or what the sentence is about: Jeremy · The new student · My friends and I" },
          { label: "Predicate", pattern: "what the subject does or is: gives Antonio the shoes · sits alone · are kind" },
          { label: "Capital and end mark", pattern: "Capital letter first · . ? or ! at the end" },
        ],
        explanation: [
          "A sentence is complete when it makes full sense on its own: it says who or what, and what they do or what they are like.",
          "A group of words with no subject ('Carried the heavy bags.') or no predicate ('The boy with the red bag.') is not a sentence yet. Ask 'Who?' or 'What happened?' to find what is missing.",
          "In the test, check every sentence for four things: a subject, a predicate, a capital letter and an end mark.",
        ],
        examples: [
          { text: "{s1} helps the teacher after class.", note: "subject: {s1} · predicate: helps the teacher after class" },
          { text: "My grandmother cooks phở on Sundays.", note: "subject: My grandmother · predicate: cooks phở on Sundays" },
          { text: "Carried the heavy bags. → {s2} carried the heavy bags.", note: "we added a subject" },
        ],
        pitfalls: [
          { wrong: "Visits Grandma every Sunday.", right: "{s3} visits Grandma every Sunday.", why: "no subject: who visits?" },
          { wrong: "The boy with the red bag.", right: "The boy with the red bag helped me.", why: "no predicate: what did he do?" },
          { wrong: "the new student sat alone.", right: "The new student sat alone.", why: "a sentence starts with a capital letter" },
        ],
      },
      {
        kind: "grammar",
        title: "Subjects and verbs that agree",
        hook: "He, she, it, or one person or thing: the verb takes -s. I, you, we, they, or more than one: no -s. And be has its own forms.",
        book: { book: "SB", pages: "67", note: "Grammar and Spelling: subjects and predicates (Part 2)." },
        form: [
          { label: "he / she / it / one", pattern: "Henry writes books. · A volunteer helps. · The girl takes my hand." },
          { label: "I / you / we / they / more than one", pattern: "We help. · My cousins play chess. · Volunteers clean the beach." },
          { label: "be", pattern: "I am · he / she / it is · we / you / they are" },
          { label: "Spelling of -s", pattern: "help → helps · watch → watches · carry → carries · have → has · do → does · go → goes" },
          { label: "Stretch", pattern: "My friends and I walk. · Everyone helps. · Each child helps. · There is one bag. / There are two bags." },
        ],
        explanation: [
          "When a sentence tells what happens now or every day, the simple subject and the verb must match.",
          "Find the simple subject first: the most important word in the subject. In 'The children in my street help', it is children, not street, so the verb has no -s.",
          "be does not just add -s: it changes. I am, she is, they are.",
        ],
        examples: [
          { text: "Joseph Lekuton helps Maasai children go to school.", note: "one person → helps" },
          { text: "{s1} and {s2} carry the boxes for the teacher.", note: "two people → carry" },
          { text: "My grandparents are volunteers at the community house.", note: "more than one → are" },
          { text: "Everyone in our class has a reading buddy.", note: "stretch: everyone = every one person → has" },
        ],
        pitfalls: [
          { wrong: "Henry write funny books.", right: "Henry writes funny books.", why: "one person → verb + s" },
          { wrong: "The volunteers is tired.", right: "The volunteers are tired.", why: "more than one → are" },
          { wrong: "The girls in my class likes art.", right: "The girls in my class like art.", why: "the subject is girls, not class" },
        ],
      },
      {
        kind: "exam",
        title: "Exam practice: find and correct the mistake",
        format: "error",
        mode: "solo",
        minutes: 8,
        instructions: "Each one has ONE mistake. Underline it and write the correction. In the last one, something is missing: add it.",
        items: [
          { q: "My brother and I walks to school every day.", answer: "walks → walk", why: "two people (my brother and I)" },
          { q: "Grandma look at the price of the shoes and sits down.", answer: "look → looks", why: "one person, and the second verb (sits) already agrees" },
          { q: "The children in the park is picking up litter.", answer: "is → are", why: "the subject is children, not park" },
          { q: "every Saturday, my aunt volunteers at the library.", answer: "every → Every", why: "capital letter at the start" },
          { q: "She don't need a new bag.", answer: "don't → doesn't", why: "she → does / doesn't" },
          { q: "Kindness make people happy.", answer: "make → makes", why: "kindness is one thing → verb + s" },
          { q: "Gave the new student a pencil.", answer: "no subject → add one: {s1} gave the new student a pencil.", why: "a sentence needs a subject" },
        ],
      },
      {
        kind: "speaking",
        title: "Form a panel: how do people help each other?",
        mode: "groups",
        minutes: 12,
        book: { book: "SB", pages: "73", note: "Share Your Ideas: the panel option." },
        steps: [
          "Four children sit at the front as the panel. Each speaks for one minute: one example from Unit 1 and one from their own life or neighborhood.",
          "The audience asks each speaker one follow-up question. Then a new panel comes up.",
          "Last round, a new case for everyone: after a flood in central Vietnam, neighbors, soldiers and volunteers bring food and help families clean their houses. Does our class sentence explain it? What would you add?",
        ],
        frames: [
          "People help each other by ___.",
          "For example, in '___', ___.",
          "Before, ___. Now, ___.",
          "This shows that ___.",
          "I agree with ___, and I would add that ___.",
        ],
        prompts: [
          "Is it harder to help a stranger or a friend? Why?",
          "What did Jeremy give up to help Antonio?",
          "How does helping someone help you, too?",
          "Who helps people in your neighborhood?",
        ],
        fluencyTip: "Use Before ... Now ... to show the difference help makes: it gives you a second sentence straight away.",
        tiers: [
          { level: "Support", task: "Give one example and one Before / Now sentence.", frames: ["___ helped ___.", "Before, ___. Now, ___."] },
          { level: "Core", task: "Give two examples, one from the unit and one from your life, and end with 'This shows that ___'." },
          { level: "Stretch", task: "Compare two examples: how are they the same and how are they different? Answer a question from the audience with a reason.", frames: ["Both ___ and ___ ___, but ___.", "On the other hand, ___."] },
        ],
        teacherNote: "This is the speaking part of the test in miniature: two minutes on the Big Question with follow-up questions, marked on fluency, grammar, vocabulary and pronunciation with interaction.",
      },
      {
        kind: "activity",
        title: "Write a plan: help in our neighborhood",
        tag: "Writing",
        mode: "solo",
        minutes: 10,
        book: { book: "SB", pages: "72", note: "Write a Plan." },
        steps: [
          "Choose a problem you know: litter at the school gate, a new classmate with no friends yet, a neighbor who cannot carry the shopping, books that nobody reads.",
          "Say your plan to a partner in 30 seconds: First ... Next ... Then ... Finally ....",
          "Write the plan (see the task on the next slide). Say who will help and what difference it will make.",
          "Check: every sentence has a subject and a predicate, a capital and an end mark; every verb agrees.",
        ],
        tiers: [
          { level: "Support", task: "Four steps, one sentence each, with First, Next, Then, Finally.", frames: ["First, we ___.", "Next, we ___.", "Then, ___.", "Finally, ___."] },
          { level: "Core", task: "The plan in 70-90 words, with who helps and a Before / Now sentence." },
          { level: "Stretch", task: "Add the challenge on the next slide." },
        ],
      },
      {
        kind: "project",
        project: "writing",
        title: "My helping plan",
        goal: "Write a 70-90 word plan to solve a problem in your school or neighborhood: the problem, the steps in order, who helps, and the difference it will make.",
        thinking: "Design",
        steps: [
          "One sentence that names the problem.",
          "Three or four steps in order, with First, Next, Then, Finally.",
          "Who will help, and what each person does.",
          "A Before / Now sentence that shows the difference.",
        ],
        criteria: [
          "The problem, the steps in order, the helpers and the difference are all there.",
          "At least four Unit 1 key words, used correctly.",
          "Complete sentences with capitals and end marks; every verb agrees with its subject.",
        ],
        frames: ["The problem is that ___.", "First, ___. Next, ___. Then, ___. Finally, ___.", "___ and ___ will ___.", "Before, ___. Now, ___."],
        model: {
          title: "Model: a cleaner school gate",
          text: "The problem is that there is a lot of litter at our school gate every afternoon. First, my friends and I make three posters about the problem. Next, we ask our teacher for two big bins. Then, every Friday, six volunteers pick up the litter for ten minutes. Finally, we count the bags and tell the class. Before, the gate was dirty. Now, everyone can see the difference. One small action can have a big impact!",
        },
        challenge: "Add a sentence that persuades a classmate to volunteer ('If you join us, ___.'), a reason with because, and one sentence with a tricky subject that still agrees ('Everyone in our class ___.').",
      },
      {
        kind: "reflect",
        prompts: [
          "Answer the Big Question in one sentence of your own.",
          "Which is harder for you: complete sentences or making the verb agree? What will you practise before the test?",
          "Which person from Unit 1 would you most like to meet, and what would you ask them?",
        ],
      },
      {
        kind: "homework",
        items: [
          { label: "Test revision: key words", detail: "Learn the 21 Unit 1 key words: say each in a sentence of your own, and listen to the key-word recordings again.", minutes: 20 },
          {
            label: "Practice Book",
            detail: "Sheets 1.12 and 1.22-1.23 again: complete sentences, and subjects and verbs that agree. Correct any mistakes before the test.",
            book: { book: "WB", pages: "1.12, 1.22-1.23", note: "Practice Book sheets" },
            minutes: 20,
          },
          { label: "Final copy", detail: "Finish your helping plan (70-90 words) and read it to your family. Ask them for one more idea.", book: { book: "SB", pages: "72" }, minutes: 20 },
          { label: "Rewrite track (A)", detail: "8 items: turn fragments into complete sentences and correct verbs that do not agree.", minutes: 15 },
          { label: "Words of the week (F)", detail: "Feelings: lonely, proud, grateful, embarrassed, nervous, surprised, cheerful, upset. Write one sentence for each about a time you helped or were helped: 'I felt grateful when my cousin ___.'", minutes: 15 },
          { label: "Function of the week (B)", detail: "Offering and accepting help: 'Can I help you?' - 'Yes, please. That's very kind of you.' / 'No, thanks. I can manage.' / 'Thank you for helping me.' - 'You're welcome.' Write 6 short dialogues.", minutes: 15 },
        ],
      },
    ],
  },
];

export const rhL3U1: Unit = withLab(rhL3U1Lab, {
  curriculum: "reach-higher",
  level: 3,
  book: "3A",
  unit: 1,
  title: "Happy to Help",
  bigQuestion: BQ,
  generalizations: [
    "People help each other when they notice what someone needs and act on it, often in small ways.",
    "A need is different from a want; real help often gives people what they need.",
    "Helping can mean giving up something we value, and it can make the helper happy too.",
    "Kindness can change how a person feels and turn strangers into friends.",
    "People who were helped, or who found life hard, often go on to help others.",
    "One individual can make a difference, and volunteers working together can have a bigger impact on a community.",
    "Comparing before and now shows the impact that help has made.",
  ],
  grammarStrand: [
    { point: "Complete sentences: subject + predicate, capital letter and end mark", lesson: 1, source: "book" },
    { point: "Complete and simple subjects and predicates; subject-verb agreement (verb + s; am / is / are)", lesson: 1, source: "book" },
    { point: "Sequence words to retell (First, Next, Then, Finally) and Before / Now comparisons", lesson: 1, source: "added" },
    { point: "Word formation: -ness, -tion, -ment, -ful (kindness, solution, improvement, helpful)", lesson: 1, source: "added" },
    { point: "Agreement with tricky subjects: compound subjects, everyone / each, There is / There are", lesson: 1, source: "stretch" },
  ],
  decks: lessons,
  assessments: rhL3U1Assessments,
});
