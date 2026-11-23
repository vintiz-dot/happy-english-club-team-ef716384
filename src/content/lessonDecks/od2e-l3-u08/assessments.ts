// Oxford Discover 2nd edition, Level 3, Unit 8 (Travel and Time Zones): the unit's
// printable grammar worksheets (three levels each, with answer keys), the quick
// check given in Lesson 4, and the end-of-unit test with its speaking task.
// Everything here is the school's own writing: no text, song or audio from the
// Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts used: Tokyo is two hours ahead of Hanoi all
// year (neither place changes its clocks), and a flight from Hanoi to Tokyo takes
// about five hours.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U8Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ going to
  {
    id: "od2e-l3-u08-ws-going-to",
    title: "Future plans with going to",
    grammar: "am / is / are + going to + verb",
    deckId: "od2e-l3-u08-l3",
    slide: "Future plans with going to",
    intro:
      "We use going to for a plan we have already made: 'I'm going to visit my cousin on Saturday.' Use am, is or are before going to, and a base verb after to (no -s, no -ed). For a quick decision made right now, we use will: 'The phone is ringing. I'll answer it.'",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "I ___ going to visit my cousin on Saturday.  (am / is / are)  ->  am",
        items: [
          { q: "I ___ going to visit my cousin on Saturday.", options: ["am", "is", "are"], answer: "am" },
          { q: "My sister ___ going to buy a ticket tomorrow.", options: ["are", "is", "am"], answer: "is" },
          { q: "We ___ going to fly to Tokyo next month.", options: ["are", "is"], answer: "are" },
          { q: "They are going to ___ the airport at six o'clock.", options: ["leave", "leaves", "left"], answer: "leave" },
          { q: "She is going to ___ a letter to her friend.", options: ["writes", "write", "wrote"], answer: "write" },
          { q: "Which sentence is correct?", options: ["He is going to cooks dinner.", "He is going to cook dinner."], answer: "He is going to cook dinner." },
          { q: "The phone is ringing. A quick decision: 'I ___ answer it.'", options: ["will", "am going to"], answer: "will" },
          { q: "Are you going to travel by train? Yes, I ___.", options: ["do", "am", "will"], answer: "am" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words, or write the whole sentence where it asks.",
        example: "My parents ___ ___ ___ visit Tokyo next year.  ->  are going to",
        items: [
          { q: "My parents ___ ___ ___ visit Tokyo next year.", answer: "are going to" },
          { q: "My brother ___ ___ ___ pack his passport tonight.", answer: "is going to" },
          { q: "I ___ ___ ___ ___ stay at home tomorrow. (a negative plan)", answer: "am not going to" },
          { q: "Make a question: you / travel to the airport by bus", answer: "Are you going to travel to the airport by bus?" },
          { q: "Rewrite with going to: We will visit our grandparents on Sunday.", answer: "We are going to visit our grandparents on Sunday." },
          { q: "Correct the mistake: She going to fly to Japan.", answer: "She is going to fly to Japan." },
          { q: "Correct the mistake: He is going to goes to the doctor.", answer: "He is going to go to the doctor." },
          { q: "Write a true answer: What are you going to do this weekend?", answer: "e.g. I'm going to play football with my friends." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own, so check am / is / are and the verb after to.",
        example: "I'm going to fly to Tokyo. I'll take a book.  (plan + quick decision)",
        items: [
          {
            q: "Find and fix three mistakes: 'We is going to visit the airport. My dad are going to take photos. I going to wear my red coat.'",
            answer: "We are going to; My dad is going to; I am going to.",
          },
          { q: "Write two sentences about a trip: one plan with going to and one quick decision with will.", answer: "e.g. I'm going to fly to Tokyo next week. Oh, I forgot my book! I'll buy one at the airport." },
          { q: "Explain in one sentence when we use going to and when we use will.", answer: "e.g. We use going to for a plan we already made and will for a quick decision made at the moment of speaking." },
          { q: "Write a short dialogue of two lines: one person asks about plans for tomorrow, the other answers with a reason.", answer: "e.g. What are you going to do tomorrow? I'm going to visit my grandmother because she's sick." },
          { q: "Write three sentences about the future plans of three people in your family. Use is going to or are going to.", answer: "e.g. My mother is going to cook dinner. My brothers are going to play football. My grandfather is going to read the newspaper." },
          { q: "Look at the clouds. Write a sentence with going to about what you can see will happen.", answer: "e.g. Look at those black clouds. It's going to rain." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ contractions
  {
    id: "od2e-l3-u08-ws-contractions",
    title: "Contractions: I'm, she's, we'll",
    grammar: "pronoun + am / is / are / will",
    deckId: "od2e-l3-u08-l4",
    slide: "Contractions: I'm, she's, we'll",
    intro:
      "A contraction is two words joined into one. The apostrophe (') takes the place of the missing letters: I am = I'm, she is = she's, they are = they're, we will = we'll. We use them when we talk and when we write to a friend.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "I am  ->  I'm",
        items: [
          { q: "I am", options: ["I'm", "Im", "I'am"], answer: "I'm" },
          { q: "she is", options: ["shes", "she's", "she'is"], answer: "she's" },
          { q: "they are", options: ["theyre", "they'are", "they're"], answer: "they're" },
          { q: "we will", options: ["we'll", "well", "we'l"], answer: "we'll" },
          { q: "he will", options: ["hell", "he'll", "he'l"], answer: "he'll" },
          { q: "Which sentence is correct?", options: ["We'r going to land soon.", "We're going to land soon."], answer: "We're going to land soon." },
          { q: "Which two words make I'll?", options: ["I will", "I are", "I is"], answer: "I will" },
          { q: "Which sentence is correct?", options: ["Your going to love Tokyo.", "You're going to love Tokyo."], answer: "You're going to love Tokyo." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the two words for the contraction, or write the contraction. For the rewrite and correct questions, write the whole sentence.",
        example: "you're  ->  you are",
        items: [
          { q: "you're", answer: "you are" },
          { q: "he'll", answer: "he will" },
          { q: "we're", answer: "we are" },
          { q: "she's", answer: "she is" },
          { q: "they will", answer: "they'll" },
          { q: "Rewrite with contractions: I am going to call my mother, and she will be happy.", answer: "I'm going to call my mother, and she'll be happy." },
          { q: "Correct the mistake: Im going to the airport.", answer: "I'm going to the airport." },
          { q: "Correct the mistake: They're is a long line of passengers.", answer: "There is a long line of passengers." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own, so check every apostrophe.",
        example: "We will arrive soon, and you are going to see the sea.  ->  We'll arrive soon, and you're going to see the sea.",
        items: [
          {
            q: "Find and fix three mistakes: 'Were going to the airport. Shell meet us there. Ill carry the bags.'",
            answer: "We're going to the airport. She'll meet us there. I'll carry the bags.",
          },
          { q: "Explain the difference between they're and there. Write one sentence for each.", answer: "e.g. They're means they are: They're at the airport. There is a place: The bags are over there." },
          { q: "Write a short dialogue of four lines about a trip. Use at least four different contractions.", answer: "e.g. 'I'm so excited!' 'We're going to fly to Tokyo.' 'You'll love it.' 'I think she'll meet us at the airport.'" },
          { q: "He's can mean he is or he has. Write one sentence for each meaning.", answer: "e.g. He's tired after the flight. (he is) He's got a new passport. (he has)" },
          { q: "Why do we not use contractions in a very formal report? Answer in one sentence.", answer: "e.g. A formal report uses full words because contractions sound like talking and are too casual." },
          { q: "Write a sentence with it's and a sentence with its, and explain how they are different.", answer: "e.g. It's raining. (it is) The plane lost its wheel cover. (belongs to it). It's = it is; its with no apostrophe shows that something belongs to it." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ capital letters
  {
    id: "od2e-l3-u08-ws-capitals",
    title: "Capital letters for places",
    grammar: "capital letters for cities, countries and names",
    deckId: "od2e-l3-u08-l4",
    slide: "Capital letters for places",
    intro:
      "We begin the names of cities, countries and people with a capital letter. So do the first word of every sentence, the word I, and the days and months in English. Write 'a city' with a small letter, but 'Hanoi' with a capital letter.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the correct sentence. Then read it aloud.",
        example: "We live in Hanoi, Vietnam.  (not: we live in hanoi, vietnam.)",
        items: [
          { q: "Which sentence is correct?", options: ["I was born in Hue, Vietnam.", "I was born in hue, vietnam."], answer: "I was born in Hue, Vietnam." },
          { q: "Which sentence is correct?", options: ["My uncle lives in Paris, france.", "My uncle lives in Paris, France."], answer: "My uncle lives in Paris, France." },
          { q: "Which word needs a capital letter? 'We flew to tokyo last year.'", options: ["flew", "year", "tokyo"], answer: "tokyo" },
          { q: "Which word needs a capital letter? 'The plane is going to land in sydney.'", options: ["sydney", "plane", "land"], answer: "sydney" },
          { q: "Which sentence is correct?", options: ["I am going to visit London.", "i am going to visit london."], answer: "I am going to visit London." },
          { q: "Which word does NOT need a capital letter?", options: ["Japan", "Bangkok", "airport"], answer: "airport" },
          { q: "Which sentence is correct?", options: ["We saw the sea on Monday.", "We saw the Sea on monday."], answer: "We saw the sea on Monday." },
          { q: "Which sentence is correct?", options: ["The flight from hanoi to seoul takes four hours.", "The flight from Hanoi to Seoul takes four hours."], answer: "The flight from Hanoi to Seoul takes four hours." },
        ],
      },
      {
        level: "Core",
        instructions: "Write each sentence again with the correct capital letters.",
        example: "she lives in busan, korea.  ->  She lives in Busan, Korea.",
        items: [
          { q: "she lives in busan, korea.", answer: "She lives in Busan, Korea." },
          { q: "our flight leaves from hanoi and lands in singapore.", answer: "Our flight leaves from Hanoi and lands in Singapore." },
          { q: "my cousin is going to visit rome, italy, in august.", answer: "My cousin is going to visit Rome, Italy, in August." },
          { q: "i was born in da nang, vietnam.", answer: "I was born in Da Nang, Vietnam." },
          { q: "the bus from lima to cusco takes a long time.", answer: "The bus from Lima to Cusco takes a long time." },
          { q: "Correct the mistake: We are going to Fly to Japan on friday.", answer: "We are going to fly to Japan on Friday." },
          { q: "Correct the mistake: The Airport in london is very big.", answer: "The airport in London is very big." },
          { q: "Write a true sentence about where you live. Use capital letters for the city and the country.", answer: "e.g. I live in Hanoi, Vietnam." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Read carefully. Check every word that might need a capital letter.",
        example: "we will fly from london, england, to cairo, egypt.  ->  We will fly from London, England, to Cairo, Egypt.",
        items: [
          {
            q: "Find and fix six mistakes: 'last monday, my aunt flew from manila, the philippines, to osaka, japan.'",
            answer: "Last Monday, my aunt flew from Manila, the Philippines, to Osaka, Japan.",
          },
          { q: "Write two sentences about a trip you want to take. Include one city, one country and one day of the week.", answer: "e.g. I want to visit Cairo, Egypt. I am going to leave on Friday." },
          { q: "Explain why 'Noi Bai Airport' has a capital A but 'the airport' does not.", answer: "e.g. Noi Bai Airport is the special name of one airport, so it has capital letters. 'the airport' is any airport, so it has no capital letter." },
          { q: "Vietnamese uses small letters for days and months, but English uses capitals. Write a sentence that shows this.", answer: "e.g. My birthday is on Sunday in March. (Sunday and March have capital letters in English.)" },
          { q: "Write three sentences about three countries and their capital cities, with correct capital letters.", answer: "e.g. Japan's capital is Tokyo. Thailand's capital is Bangkok. Australia's capital is Canberra." },
          { q: "Write a short paragraph (three sentences) about a place you have been. Check every capital letter.", answer: "e.g. Last July we visited Da Lat, Vietnam. It was cool and green. I am going to go again in December." },
        ],
      },
    ],
  },
];

export const odL3U8Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u08-check",
    title: "Quick check: travel words and going to",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 8 travel and sickness words", "going to for plans"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "A person who travels on a plane, a bus or a train. Which word?", answer: "passenger" },
          { q: "The place where planes take off and land. Which word?", answer: "airport" },
          { q: "The place a trip is going to. Which word?", answer: "destination" },
          { q: "A small book that you show at the airport to travel to other countries. Which word?", answer: "passport" },
        ],
      },
      {
        title: "Grammar: going to",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, short answer where it does not.",
        marksEach: 1,
        items: [
          { q: "Complete: My uncle ___ going to fly to Japan next week. (am / is / are)", answer: "is" },
          { q: "Complete: We ___ going to ___ a taxi to the airport. (take / takes)", answer: "are, take" },
          { q: "Correct the mistake: She is going to buys a ticket.", answer: "She is going to buy a ticket." },
          { q: "'I'm going to visit my cousin' is a plan we have already made.", options: ["True", "False"], answer: "True" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u08-test",
    title: "Unit 8 test",
    kind: "summative",
    afterLesson: 6,
    minutes: 45,
    covers: [
      "The 10 travel and health words (airport and passenger to doctor and medicine)",
      "Words in context: washcloth, forehead, sneezing, tissues",
      "Future plans with going to",
      "Contractions: I'm, she's, we'll",
      "Capital letters for cities and countries",
      "Reading: a problem and a solution",
      "Writing: a trip I am going to take",
      "Speaking: my plans for a trip",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Write the word for each meaning. Choose from the options where they are given.",
        marksEach: 1,
        items: [
          { q: "A person who travels on a plane, a bus or a train.", answer: "passenger" },
          { q: "The place where planes take off and land.", answer: "airport" },
          { q: "The place a trip is going to.", options: ["destination", "passport", "medicine"], answer: "destination" },
          { q: "A small book you show at the airport to travel to other countries.", options: ["fever", "passport", "headache"], answer: "passport" },
          { q: "A pain in your ear.", answer: "earache" },
          { q: "A pain in your head.", answer: "headache" },
          { q: "When your body is too hot because you are not well.", options: ["forehead", "tissue", "fever"], answer: "fever" },
          { q: "A person who looks after people who are sick.", options: ["doctor", "passenger", "destination"], answer: "doctor" },
          { q: "Something you take to get better when you are sick.", answer: "medicine" },
          { q: "Which word means 'blowing air out of your nose and mouth suddenly, because of a cold'?", options: ["washcloth", "sneezing", "forehead"], answer: "sneezing" },
        ],
      },
      {
        title: "Grammar: going to",
        skill: "Grammar",
        instructions: "Choose the right words, or correct the mistake.",
        marksEach: 1,
        items: [
          { q: "My parents ___ going to visit Singapore in July.", options: ["are", "is", "am"], answer: "are" },
          { q: "I'm going to ___ a postcard to my friend.", options: ["sends", "send", "sent"], answer: "send" },
          { q: "___ you going to take a taxi to the airport?", options: ["Is", "Do", "Are"], answer: "Are" },
          { q: "Correct the mistake: He going to take medicine.", answer: "He is going to take medicine." },
          { q: "Correct the mistake: We are going to flew to Tokyo.", answer: "We are going to fly to Tokyo." },
          { q: "Write a sentence about your plan for next weekend. Use going to.", answer: "e.g. I'm going to visit my grandmother on Saturday." },
        ],
      },
      {
        title: "Grammar: contractions",
        skill: "Grammar",
        instructions: "Choose the right contraction, or write the contraction or the two words.",
        marksEach: 1,
        items: [
          { q: "___ going to fly to Japan. (We are)", options: ["We're", "Were", "We'l"], answer: "We're" },
          { q: "___ be at the airport at six. (She will)", options: ["Shell", "She'll", "She's"], answer: "She'll" },
          { q: "Write the contraction: I am", answer: "I'm" },
          { q: "Write the contraction: they are", answer: "they're" },
          { q: "Write the two words: he'll", answer: "he will" },
          { q: "Correct the mistake: Youre going to love the beach.", answer: "You're going to love the beach." },
        ],
      },
      {
        title: "Grammar: capital letters",
        skill: "Grammar",
        instructions: "Choose the correct sentence, or write the sentence again with the correct capital letters.",
        marksEach: 1,
        items: [
          { q: "Which sentence is correct?", options: ["We flew to Tokyo, Japan.", "We flew to tokyo, japan."], answer: "We flew to Tokyo, Japan." },
          { q: "Which sentence is correct?", options: ["My uncle lives in paris, France.", "My uncle lives in Paris, France."], answer: "My uncle lives in Paris, France." },
          { q: "Write again with capital letters: my cousin lives in sydney, australia.", answer: "My cousin lives in Sydney, Australia." },
          { q: "Write again with capital letters: our plane leaves hanoi at nine o'clock.", answer: "Our plane leaves Hanoi at nine o'clock." },
          { q: "Which word does NOT need a capital letter? 'The Passenger flew from Cairo.'", options: ["Cairo", "The", "Passenger"], answer: "Passenger" },
          { q: "Write two true sentences with the name of a city and a country. Use capital letters.", answer: "e.g. I live in Hanoi, Vietnam. I want to visit Paris, France." },
        ],
      },
      {
        title: "Reading: Nora and Kenji",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "Nora lives in Hanoi, Vietnam. Her cousin Kenji lives in Tokyo, Japan. Tokyo is two hours ahead of Hanoi, so when it is noon in Hanoi, it is 2:00 p.m. in Tokyo. Nora and Kenji like to talk on the computer, but they have a problem. Kenji goes to bed at 9:00 p.m. Tokyo time, and then it is only 7:00 p.m. in Hanoi. Nora is still eating dinner! Last month they found a solution. They agreed to talk on Sunday afternoons, when it is 3:00 p.m. in Hanoi and 5:00 p.m. in Tokyo. Next summer Nora is going to visit Kenji. She is going to fly from Hanoi to Tokyo, and the flight is going to take about five hours. Her mother says, 'Don't forget your passport!' Nora has already packed it in her small blue bag. After the trip, she's going to tell her class what Japan is like.",
        marksEach: 1,
        items: [
          { q: "Tokyo is two hours ahead of Hanoi.", options: ["True", "False"], answer: "True" },
          { q: "Kenji goes to bed at 7:00 p.m. Tokyo time.", options: ["True", "False"], answer: "False" },
          { q: "What is the problem?", options: ["Their bedtimes are at different times, so it is hard to talk.", "Nora does not have a computer.", "Kenji does not like Nora."], answer: "Their bedtimes are at different times, so it is hard to talk." },
          { q: "What is the solution?", options: ["They stop talking.", "They talk on Sunday afternoons.", "Nora goes to bed earlier."], answer: "They talk on Sunday afternoons." },
          { q: "How long is the flight going to take?", options: ["About two hours", "About one day", "About five hours"], answer: "About five hours" },
          { q: "Why does Nora's mother say 'Don't forget your passport!'? Answer in your own words.", answer: "e.g. Nora needs her passport to travel to another country, and she can't fly without it." },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about a trip you are going to take. Say where you are going, how you are going to travel, how long the trip will take, and one thing you are going to do there. Use going to, one contraction, and capital letters for the places. Marks (5): a clear first sentence, going to used correctly, a contraction with the apostrophe in the right place, capital letters for places, and spelling and punctuation.",
        marksEach: 5,
        items: [
          {
            q: "Write about a trip you are going to take.",
            answer:
              "e.g. Next summer I'm going to visit my aunt in Da Nang, Vietnam. We're going to travel by train. The trip is going to take about twelve hours. I'm going to swim in the sea every day, and I'll take lots of photos.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose a place you would like to visit. Talk for about one minute: say where you are going to go, how you are going to travel and how long it will take, what you are going to do there, and what the time is like there (day or night?). Then answer two questions from the teacher.",
      prompts: [
        "What is the problem on a long trip, and what is the solution?",
        "What are you going to take with you? Why?",
        "When it is noon here, is it day or night in your destination?",
        "Where is the airport, and what is next to it? Say it with next to or across from.",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Talks smoothly for about a minute; short pauses only to think; easy to follow.",
            "Mostly smooth; a few pauses or restarts but keeps going without help.",
            "Many pauses; speaks in short pieces; needs a prompt once or twice.",
            "Very hesitant; single words or very short phrases; needs help throughout.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses unit words correctly and naturally (airport, passenger, destination, passport and sickness words).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the place only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: going to and contractions",
          bands: [
            "Uses going to for plans correctly, more than once, and natural contractions such as I'm and we'll.",
            "Uses going to correctly at least twice; one small slip, such as a missing am / is / are.",
            "Tries going to but with errors (I going to, she is going to goes); few contractions.",
            "None; uses only simple present sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Describes a clear plan, with where, how, how long and why, and answers questions with reasons.",
            "Describes a plan with two or three of these and gives a simple reason.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
