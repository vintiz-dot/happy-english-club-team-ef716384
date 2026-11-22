// Reach Higher 3B, Unit 5 (Mysteries of Matter): Jupiter's two checkpoints in the
// format of the Hanoi selective schools' grade-6 English test, and the full
// end-of-unit test. The mid-unit quiz runs in Lesson 4, the mock (Cầu Giấy format:
// about 30 minutes, a short paragraph at the end) in Lesson 8, and the unit test
// (with a speaking part) on the class date after Lesson 8. Every item and the
// reading passages are the school's own; nothing from the Student Book, the
// publisher's unit tests or a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U5Assessments: Assessment[] = [
  {
    id: "rh-l3-u5-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["-ed / -ing adjectives", "adjective order", "so / such ... that", "comparative adverbs", "past continuous with when / while", "-ed endings"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "The magic show was really ___.", options: ["amazed", "amazing", "amaze", "amazes"], answer: "amazing" },
          { q: "She has ___.", options: ["a black long beautiful dress", "a long beautiful black dress", "a beautiful long black dress", "a black beautiful long dress"], answer: "a beautiful long black dress" },
          { q: "It was ___ a hot day that the chocolate melted in my bag.", options: ["so", "such", "too", "very"], answer: "such" },
          { q: "Ice melts ___ in the sun than in the fridge.", options: ["more quick", "quicker than", "more quickly", "most quickly"], answer: "more quickly" },
          { q: "We ___ dinner when the lights went out.", options: ["had", "were having", "are having", "was having"], answer: "were having" },
        ],
      },
      {
        title: "Part B. Give the correct form",
        skill: "Grammar",
        instructions: "Write the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "I was very (interest) ___ in the experiment.", answer: "interested" },
          { q: "While my brother (play) ___ football, I was reading.", answer: "was playing" },
          { q: "The ice melted (quick) ___ than we expected.", answer: "more quickly (quicker is also accepted)" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "The snow was such deep that we couldn't open the door.", answer: "such → so" },
          { q: "The film was so bored that I fell asleep.", answer: "bored → boring" },
        ],
      },
      {
        title: "Part D. Sounds",
        skill: "Vocabulary",
        instructions: "Choose the word whose -ed ending sounds different.",
        marksEach: 1,
        items: [
          { q: "-ed ending", options: ["melted", "wanted", "trapped", "needed"], answer: "trapped" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u5-mock",
    title: "End-of-unit mock test (Cầu Giấy format)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["sounds and stress", "adjectives", "so / such ... that", "past continuous", "past passive", "prefixes", "conditionals", "possessives", "present perfect", "reading", "a 50-70 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds and stress",
        skill: "Vocabulary",
        instructions: "Choose the word that is different.",
        marksEach: 1,
        items: [
          { q: "-ed ending", options: ["formed", "cleaned", "melted", "filled"], answer: "melted" },
          { q: "stress", options: ["liquid", "solid", "substance", "occur"], answer: "occur" },
          { q: "stress", options: ["impossible", "incorrect", "invisible", "important"], answer: "incorrect" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "The old bridge ___ in 1902.", options: ["built", "was built", "is built", "was build"], answer: "was built" },
          { q: "If you heat butter, it ___.", options: ["melts", "will melting", "melted", "would melt"], answer: "melts" },
          { q: "I ___ my bike when I saw the accident.", options: ["rode", "was riding", "am riding", "ride"], answer: "was riding" },
          { q: "My grandparents ___ in Huế since 1990.", options: ["live", "lived", "are living", "have lived"], answer: "have lived" },
          { q: "These are my parents' books. They are ___.", options: ["their", "theirs", "they", "them"], answer: "theirs" },
          { q: "It took me two hours ___ the model.", options: ["make", "making", "to make", "made"], answer: "to make" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "As soon as the ice will melt, we will measure the water.", answer: "will melt → melts" },
          { q: "The bird hurt it's wing.", answer: "it's → its" },
          { q: "I have seen a snowman in Sa Pa last winter.", answer: "have seen → saw" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Write True or False for 1-3, then answer 4-5 in a few words.",
        passage:
          "On the coast of Bạc Liêu, many families are salt farmers. In the dry season, sea water is let into wide, flat fields. The water is only a few centimetres deep, so the hot sun and the strong wind can work on it quickly. After a few days, the water has disappeared into the air and a thin white layer of salt is left on the ground. The farmers rake the salt into small white hills and carry it away in baskets. It is hard work, but it is impossible to do in the rainy season: if rain falls on the fields, the salt dissolves and turns back into salty water.",
        marksEach: 1,
        items: [
          { q: "1. Salt farmers work mostly in the rainy season.", options: ["True", "False"], answer: "False" },
          { q: "2. The water in the salt fields is very deep.", options: ["True", "False"], answer: "False" },
          { q: "3. The sun and the wind help the water to disappear.", options: ["True", "False"], answer: "True" },
          { q: "4. How long does it take for the water to disappear?", answer: "A few days." },
          { q: "5. What happens to the salt if rain falls on the fields?", answer: "It dissolves / turns back into salty water." },
        ],
      },
      {
        title: "Part E. Rewrite",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same.",
        marksEach: 1,
        items: [
          { q: "The tea was very hot. I couldn't drink it. → The tea was so ...", answer: "The tea was so hot that I couldn't drink it." },
          { q: "A hunter found the baby mammoth in 2007. → The baby mammoth ...", answer: "The baby mammoth was found (by a hunter) in 2007." },
          { q: "I spent three hours cleaning the kitchen. → It took ...", answer: "It took me three hours to clean the kitchen." },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-70 words about a change of matter you have seen at home (cooking, ice, a candle, rain on the ground). Say what it was like before, what caused the change, and what it was like after.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-70 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar, vocabulary." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u5-test",
    title: "Unit 5 test: Mysteries of Matter",
    kind: "summative",
    afterLesson: 8,
    minutes: 70,
    covers: [
      "Part 1 and Part 2 key words",
      "adjectives and articles; adjectives that compare; -ed / -ing adjectives",
      "possessive nouns and possessive adjectives",
      "so / such ... that, past continuous, past passive, prefixes, It takes / spend, conditionals, present perfect",
      "reading an original text about a change of matter",
      "a 70-100 word explanation on the Big Question",
      "a 2-minute talk on the Big Question",
    ],
    sections: [
      {
        title: "Part A. Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap.",
        marksEach: 1,
        items: [
          { q: "1. The ice cream began to ___ in the hot sun.", options: ["freeze", "trap", "melt", "form"], answer: "melt" },
          { q: "2. Water is a ___: it takes the shape of the cup you pour it into.", options: ["solid", "liquid", "surface", "area"], answer: "liquid" },
          { q: "3. Look at the ___ to see how hot it is outside.", options: ["temperature", "mixture", "substance", "thermometer"], answer: "thermometer" },
          { q: "4. Frost can ___ in Sa Pa on very cold winter nights.", options: ["occur", "combine", "alter", "trap"], answer: "occur" },
          { q: "5. Mud is a ___ of soil and water.", options: ["surface", "mixture", "state", "thermometer"], answer: "mixture" },
          { q: "6. The ice on the pond was ___ enough to stand on.", options: ["liquid", "melted", "firm", "soft"], answer: "firm" },
          { q: "7. Tràm Chim is a ___ where many birds feed in the wet grass.", options: ["wetland", "desert", "thermometer", "substance"], answer: "wetland" },
          { q: "8. A lid can ___ the heat inside a pot.", options: ["melt", "occur", "combine", "trap"], answer: "trap" },
          { q: "9. When the ___ falls below 0 °C, water freezes.", options: ["thermometer", "temperature", "surface", "composition"], answer: "temperature" },
          { q: "10. Heat can ___ the colour of bread from white to brown.", options: ["occur", "freeze", "alter", "combine"], answer: "alter" },
        ],
      },
      {
        title: "Part B. Grammar A: the book's grammar",
        skill: "Grammar",
        instructions: "Choose the best answer A, B, C or D (adjectives, articles and possessives).",
        marksEach: 1,
        items: [
          { q: "1. This box is ___ than that one.", options: ["heavyer", "more heavy", "heaviest", "heavier"], answer: "heavier" },
          { q: "2. Quicksand is ___ than water, so it is easy to float in it.", options: ["thicker", "thickest", "more thick", "thick"], answer: "thicker" },
          { q: "3. The Pantanal is one of the ___ wetlands in the world.", options: ["larger", "most large", "largest", "large"], answer: "largest" },
          { q: "4. My cousin wants to be ___ engineer when she grows up.", options: ["a", "an", "the", "some"], answer: "an" },
          { q: "5. The ___ boat is red. (It belongs to one scientist.)", options: ["scientist's", "scientists'", "scientists", "scientist"], answer: "scientist's" },
          { q: "6. All the ___ bags are in the classroom. (more than one student)", options: ["student's", "students", "students's", "students'"], answer: "students'" },
          { q: "7. Mai and Lan visit ___ grandmother every Sunday.", options: ["they're", "there", "their", "them"], answer: "their" },
          { q: "8. The science show was so ___ that we watched it twice.", options: ["excited", "exciting", "excite", "excitedly"], answer: "exciting" },
        ],
      },
      {
        title: "Part C. Grammar B: rewrite, correct and form words",
        skill: "Grammar",
        instructions: "1-4: rewrite each sentence so that it means the same, starting with the words given. 5-6: find the mistake and correct it. 7-9: write the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "1. The water was very cold. We couldn't swim in it. → The water was so ...", answer: "The water was so cold that we couldn't swim in it." },
          { q: "2. It was a very windy day. Our kite flew away. → It was such ...", answer: "It was such a windy day that our kite flew away." },
          { q: "3. A hunter found the baby mammoth in 2007. → The baby mammoth ...", answer: "The baby mammoth was found (by a hunter) in 2007." },
          { q: "4. It took us two hours to make the clay pots. → We spent ...", answer: "We spent two hours making the clay pots." },
          { q: "5. If you will heat ice, it melts.", answer: "will heat → heat" },
          { q: "6. I was reading when the lights were going out.", answer: "were going out → went out" },
          { q: "7. Films are wrong about quicksand: it is nearly (possible) ___ for a person to go right under.", answer: "impossible" },
          { q: "8. Have you ever (see) ___ snow?", answer: "seen" },
          { q: "9. Your answer is (correct) ___. Please try again.", answer: "incorrect" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Write True or False for 1-3, choose the best answer for 4, then answer 5-6 in a few words.",
        passage:
          "Bát Tràng is a village on the edge of Hà Nội where families have made pottery for hundreds of years. Pottery starts as clay, a soft mixture of fine soil and water. The potter puts a lump of wet clay on a spinning wheel and shapes it with wet hands. At this stage the clay is easy to alter: if the potter does not like the shape, she can squash it and start again. Next, the new pot is left in the air for several days. The water slowly leaves the clay, so the pot becomes firm and pale. Finally, the pot is fired in a kiln, a very hot oven. The heat changes the clay into a hard new substance. After firing, the pot cannot change back into soft clay, even if you put it in water. That is why a fired pot can hold soup or tea for many years.",
        marksEach: 1,
        items: [
          { q: "1. Clay is a mixture of fine soil and water.", options: ["True", "False"], answer: "True" },
          { q: "2. The pot goes into the kiln before it dries in the air.", options: ["True", "False"], answer: "False" },
          { q: "3. A fired pot turns back into soft clay if you put it in water.", options: ["True", "False"], answer: "False" },
          { q: "4. Why does the pot become firm before it is fired?", options: ["The potter adds more water.", "The kiln is cold.", "The wheel spins faster.", "The water leaves the clay."], answer: "The water leaves the clay." },
          { q: "5. What is a kiln?", answer: "A very hot oven (for firing pots)." },
          { q: "6. Why can a fired pot hold soup for many years?", answer: "The heat changed the clay into a hard new substance that cannot change back." },
        ],
      },
      {
        title: "Part E. Writing",
        skill: "Writing",
        instructions:
          "Write 70-100 words: What causes matter to change? Describe two changes you have seen (at home, in Vietnam or in this unit's selections). For each one, say what it was like before, what caused the change, what it was like after, and whether it can change back. Use at least two key words and one so / such ... that or If ..., ... sentence.",
        marksEach: 10,
        items: [
          {
            q: "Your explanation (70-100 words).",
            answer:
              "Mark on four parts, 2.5 each: content (two changes, each with before, cause, after and whether it can change back); organisation (a clear order with first, then, because, so, however); grammar (the unit's grammar used accurately: adjectives, so / such ... that, conditionals, passives, possessives); vocabulary (at least two key words used correctly, varied adjectives).",
          },
        ],
      },
    ],
    speaking: {
      task: "Talk for 2 minutes on the Big Question, What causes matter to change? Give at least two examples, one from the unit's selections and one from your own life, and say whether each change can go back. Then answer the teacher's follow-up questions.",
      prompts: [
        "What happened to the snow in \"Melt the Snow!\", and what caused it?",
        "Why did the baby mammoth stay unchanged for so long?",
        "How does quicksand form? Is it as dangerous as films show?",
        "Tell me about a change of matter you have seen in your kitchen.",
        "Which changes can go back, and which cannot? Give an example of each.",
        "If you could ask Dr. Maycira Costa one question, what would it be, and why?",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Speaks for the full 2 minutes with few pauses; ideas are linked and easy to follow.",
            "Speaks for most of the time; some pauses, but the talk keeps going.",
            "Speaks in short bursts with long pauses; needs prompting to continue.",
            "Says only a few words or sentences, even with help.",
          ],
        },
        {
          criterion: "Grammar range and accuracy",
          bands: [
            "Uses several unit structures (so / such ... that, If ..., passives, possessives, past continuous) with few mistakes.",
            "Uses some unit structures; mistakes do not block meaning.",
            "Mostly simple sentences; frequent mistakes sometimes block meaning.",
            "Single words or memorised phrases; mistakes block meaning.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses many key words (melt, freeze, mixture, substance, temperature ...) correctly, with precise adjectives.",
            "Uses several key words correctly; some repetition.",
            "Uses a few key words, sometimes wrongly; relies on very common words.",
            "Very few topic words; meaning is often unclear.",
          ],
        },
        {
          criterion: "Pronunciation and interaction",
          bands: [
            "Clear sounds and word stress (-ed endings, occur, substance); answers follow-up questions fully and asks for clarification when needed.",
            "Mostly clear; answers follow-up questions with short reasons.",
            "Some words hard to understand; answers follow-up questions with one or two words.",
            "Often hard to understand; does not respond to follow-up questions.",
          ],
        },
      ],
    },
  },
];
