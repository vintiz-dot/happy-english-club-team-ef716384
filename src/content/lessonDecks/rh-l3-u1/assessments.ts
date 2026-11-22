// Reach Higher 3A, Unit 1 (Happy to Help): Jupiter's end-of-unit test, given the
// class date after the one review lesson (rh-l3-u1-l1). Jupiter finished Unit 1
// before the decks existed, so there is no mid-unit check or mock: only this test.
//
// What it assesses follows the 3A Teacher's Edition for Unit 1: the Part 1 and
// Part 2 key words, complete sentences (subject + predicate, SB 35), subjects and
// verbs that agree (SB 67), the comparisons and retelling the unit practises, and
// a short personal piece on the Big Question. The exam strand (Hanoi grade-6
// selective schools) adds error correction, word formation and rewrites.
// Every item and the reading passage are the school's own; nothing is copied
// from the Student Book, the Practice Book, the publisher's unit tests or a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U1Assessments: Assessment[] = [
  {
    id: "rh-l3-u1-test",
    title: "Unit 1 test: Happy to Help",
    kind: "summative",
    afterLesson: 1,
    minutes: 70,
    covers: [
      "Unit 1 key words (Parts 1 and 2)",
      "complete sentences: subject and predicate",
      "simple subject and simple predicate",
      "subject-verb agreement (present simple and be)",
      "error correction, word formation and rewrites",
      "reading an original text",
      "a 70-100 word paragraph on the Big Question",
      "speaking on the Big Question",
    ],
    sections: [
      {
        title: "Part A. Key words: choose the best word",
        skill: "Vocabulary",
        instructions: "Circle the word that best completes each sentence.",
        marksEach: 1,
        items: [
          { q: "My bike has a flat tire. That is a big ___ because I ride it to school.", options: ["benefit", "problem", "gift", "duty"], answer: "problem" },
          { q: "It is lovely to ___ a letter from a friend who lives far away.", options: ["identify", "improve", "receive", "learn"], answer: "receive" },
          { q: "All living things ___ water. A new video game is only something we want.", options: ["need", "identify", "offer", "improve"], answer: "need" },
          { q: "Picking up one piece of litter is a small ___, but it helps.", options: ["neighborhood", "individual", "volunteer", "action"], answer: "action" },
          { q: "When Henry Winkler visits schools, he has a positive ___ on the students.", options: ["impact", "problem", "solution", "gift"], answer: "impact" },
          { q: "A ___ helps other people and does not get paid.", options: ["solution", "volunteer", "benefit", "difference"], answer: "volunteer" },
          { q: "The families in our street keep the ___ clean and safe.", options: ["kindness", "action", "neighborhood", "duty"], answer: "neighborhood" },
          { q: "One ___ of helping others is that you feel happy, too.", options: ["individual", "problem", "action", "benefit"], answer: "benefit" },
          { q: "Can you ___ this flower? Is it a lotus or a water lily?", options: ["identify", "improve", "receive", "offer"], answer: "identify" },
          { q: "Thank you for your ___! You carried all my books up the stairs.", options: ["solution", "duty", "kindness", "individual"], answer: "kindness" },
        ],
      },
      {
        title: "Part B. Grammar: choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          {
            q: "Which one is a complete and correct sentence?",
            options: ["The boy in the blue shirt.", "Shares his lunch with me.", "My best friend shares his lunch with me.", "my best friend shares his lunch with me."],
            answer: "My best friend shares his lunch with me.",
          },
          {
            q: "Which one is NOT a complete sentence?",
            options: ["Grandma reads the newspaper.", "The children laugh.", "Under the old bridge near the river.", "We help."],
            answer: "Under the old bridge near the river.",
          },
          { q: "What is the simple subject? 'The new girl in our class sits next to me.'", options: ["new", "girl", "class", "sits"], answer: "girl" },
          { q: "What is the simple predicate? 'My uncle fixes old bikes for the children.'", options: ["uncle", "fixes", "old bikes", "children"], answer: "fixes" },
          { q: "My cousin ___ at a hospital in Hanoi.", options: ["work", "works", "working", "are work"], answer: "works" },
          { q: "The volunteers ___ the beach every Sunday.", options: ["cleans", "is cleaning", "clean", "cleaning"], answer: "clean" },
          { q: "Our teacher ___ very kind to new students.", options: ["are", "am", "be", "is"], answer: "is" },
          { q: "My sister and her friend ___ their grandmother on Saturdays.", options: ["visits", "visit", "is visiting", "visiting"], answer: "visit" },
        ],
      },
      {
        title: "Part C. Grammar: write the correct form",
        skill: "Grammar",
        instructions: "Write the correct present form of the verb in brackets.",
        marksEach: 1,
        items: [
          { q: "Every morning, my father (drive) ___ me to school.", answer: "drives" },
          { q: "Bees (help) ___ flowers to grow.", answer: "help" },
          { q: "My little brother (watch) ___ cartoons after dinner.", answer: "watches" },
          { q: "The firefighters in our town (be) ___ very brave.", answer: "are" },
          { q: "She always (carry) ___ her grandmother's bag up the stairs.", answer: "carries" },
          { q: "I (be) ___ happy when I help my friends.", answer: "am" },
        ],
      },
      {
        title: "Part D. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has ONE mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "The students in my class helps the teacher tidy up.", answer: "helps → help" },
          { q: "He don't want to go to the party alone.", answer: "don't → doesn't" },
          { q: "my neighbor gives us fresh vegetables every week.", answer: "my → My (a sentence starts with a capital letter)" },
          { q: "There is many volunteers at the festival.", answer: "is → are" },
          { q: "Everyone in my class need help sometimes.", answer: "need → needs" },
        ],
      },
      {
        title: "Part E. Word formation",
        skill: "Grammar",
        instructions: "Write the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "Thank you for your (kind) ___.", answer: "kindness" },
          { q: "We found a good (solve) ___ to the problem.", answer: "solution" },
          { q: "We must take (act) ___ now to keep our river clean.", answer: "action" },
          { q: "Our classroom looks much better. What an (improve) ___!", answer: "improvement" },
          { q: "The two pictures are not the same. Can you see the (different) ___?", answer: "difference" },
          { q: "Thanks, that was a very (help) ___ idea.", answer: "helpful" },
        ],
      },
      {
        title: "Part F. Rewrite",
        skill: "Grammar",
        instructions: "Write ONE complete sentence that begins with the words given. Use the word in brackets if there is one.",
        marksEach: 1,
        items: [
          { q: "Jeremy needs new shoes. Antonio needs new shoes. → Jeremy and Antonio ...", answer: "Jeremy and Antonio need new shoes." },
          { q: "My sister. Teaches children to swim. → My sister ...", answer: "My sister teaches children to swim." },
          { q: "All the children help their parents. → Each child ...", answer: "Each child helps his or her parents. (their parents is also correct)" },
          { q: "Before, the park was dirty. (clean) → Now, the park ...", answer: "Now, the park is clean." },
        ],
      },
      {
        title: "Part G. Reading",
        skill: "Reading",
        instructions: "Read the text. Choose the best answer, write True or False, or write a short answer.",
        passage:
          "Every Saturday morning, the community house in our neighborhood is full of children. They come to the Saturday Book Club. The club began two years ago, when Mrs. Hoa, a retired teacher, noticed a problem: many children in the street had no books at home. She offered her own books and asked her neighbors for more. Now the club has more than three hundred books.\n\nVolunteers from the secondary school help, too. They read stories aloud to the younger children and help them choose books to take home. Bảo, who is eleven, says, \"Before, I didn't like reading. Now I read a book every week.\"\n\nThe club does not cost anything. There is only one rule, and it is simple: when you finish a book, you bring it back so that another child can enjoy it.",
        marksEach: 1,
        items: [
          {
            q: "1. Why did the Saturday Book Club begin?",
            options: ["The community house was empty.", "Many children had no books at home.", "The secondary school needed volunteers.", "Mrs. Hoa wanted to sell her books."],
            answer: "Many children had no books at home.",
          },
          { q: "2. True or False: The club has fewer than three hundred books now.", options: ["True", "False"], answer: "False" },
          { q: "3. True or False: Children have to pay to join the club.", options: ["True", "False"], answer: "False" },
          { q: "4. True or False: Students from a secondary school read to the younger children.", options: ["True", "False"], answer: "True" },
          { q: "5. How has Bảo changed? Answer with Before ... Now ....", answer: "Before, Bảo didn't like reading. Now Bảo reads a book every week." },
          { q: "6. What must you do when you finish a book?", answer: "Bring it back (so that another child can enjoy it)." },
        ],
      },
      {
        title: "Part H. Writing",
        skill: "Writing",
        instructions:
          "Write 70-100 words to answer the Big Question: How do people help each other? Give one example from Unit 1 (Those Shoes, Guardian Angel, Henry Winkler or Joseph Lekuton) and one example from your own life or neighborhood. For each, say what the person needed, how someone helped, and what changed (Before, ... Now, ...).",
        marksEach: 10,
        items: [
          {
            q: "Your paragraph (70-100 words).",
            answer:
              "Mark on four parts, 2.5 each. Content: answers the Big Question with both examples, each with the need, the help and the change. Organisation: an opening sentence, the two examples in order, a closing sentence; sequence or comparison words (First, Then, Before, Now, For example). Grammar: complete sentences with a capital letter and an end mark; subjects and verbs agree. Vocabulary: at least four Unit 1 key words used correctly (need, kindness, volunteer, impact, difference ...).",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Talk for about two minutes on the Big Question: How do people help each other? Give one example from Unit 1 and one from your own life, and say what difference the help made (Before ... Now ...). Then answer two or three of the teacher's questions.",
      prompts: [
        "Who has helped you this year? What did they do, and how did you feel?",
        "What is the difference between a need and a want? Give an example of each.",
        "Why do you think Jeremy gave the shoes to Antonio? Would you do the same?",
        "How can children make a difference in their neighborhood?",
        "Is it better to help one person a lot, or many people a little? Why?",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Speaks for about two minutes with only short pauses to think; ideas are linked and easy to follow.",
            "Keeps going for most of the time; some pauses or restarts but needs no help.",
            "Speaks in short pieces with long pauses; needs a prompt to continue.",
            "Says only a few words or phrases; needs help throughout.",
          ],
        },
        {
          criterion: "Grammar range and accuracy",
          bands: [
            "Complete sentences throughout; subjects and verbs agree (helps / help, is / are); tries longer sentences with because, when or before ... now.",
            "Mostly complete sentences; a few agreement slips that do not stop understanding.",
            "Many fragments or agreement mistakes (he help, they is); mostly very short sentences.",
            "Single words or memorised phrases; little control of sentences.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses several Unit 1 key words correctly and naturally (kindness, need, volunteer, impact, difference, neighborhood ...).",
            "Uses some key words correctly; one or two are misused or missing.",
            "Uses few key words; repeats 'help' and 'good'.",
            "Very few English words for the topic; may switch to Vietnamese.",
          ],
        },
        {
          criterion: "Pronunciation and interaction",
          bands: [
            "Clear and easy to understand, including final -s on verbs; answers the questions fully and adds a reason.",
            "Mostly clear; final sounds sometimes missing; answers the questions with short reasons.",
            "Often hard to understand; answers questions with one word or needs them repeated.",
            "Very hard to understand; does not answer the questions.",
          ],
        },
      ],
    },
  },
];
