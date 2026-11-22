// Reach Higher 3B, Unit 6 (Heritage and Tradition): printable grammar worksheets in
// three levels with answer keys. The school's own writing. Each follows the exact
// title of the grammar slide it belongs to.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const rhL3U6Worksheets: Worksheet[] = [
  {
    id: "rh-l3-u6-ws-pronouns",
    title: "Subject, object and reflexive pronouns",
    grammar: "subject, object and reflexive pronouns",
    deckId: "rh-l3-u6-l1",
    slide: "Subject, object and reflexive pronouns",
    intro:
      "Subject pronouns (I, you, he, she, it, we, they) do the action. Object pronouns (me, you, him, her, it, us, them) receive it. Use a reflexive pronoun (myself, yourself, himself, herself, itself, ourselves, themselves) when the subject and the object are the same person: She made the lantern herself.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "My grandmother cooks well. ___ teaches me.  (She / Her)  ->  She",
        items: [
          { q: "My brother is tall. ___ plays basketball.", options: ["He", "Him"], answer: "He" },
          { q: "I love my grandparents. I visit ___ every Tết.", options: ["them", "they"], answer: "them" },
          { q: "My mother made the cake. She made it ___.", options: ["herself", "himself"], answer: "herself" },
          { q: "My cousins and I are close. ___ play together.", options: ["We", "Us"], answer: "We" },
          { q: "Grandpa told ___ a story.", options: ["me", "I"], answer: "me" },
          { q: "The children made the lanterns ___.", options: ["themselves", "theirselves"], answer: "themselves" },
          { q: "The lantern is old. ___ belonged to my great-grandmother.", options: ["It", "Them"], answer: "It" },
          { q: "I cut ___ while I was carving.", options: ["myself", "me"], answer: "myself" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the correct pronoun.",
        example: "Mai is my friend. I often help ___.  ->  her",
        items: [
          { q: "My uncle lives in Huế. ___ makes lanterns.", answer: "He" },
          { q: "These photos are special. My father gave ___ to me.", answer: "them" },
          { q: "We made the dress ___. Nobody helped us.", answer: "ourselves" },
          { q: "My sister and I look alike. People think ___ are twins.", answer: "we" },
          { q: "Look at that old drum. Can you play ___?", answer: "it" },
          { q: "He taught ___ to play the dan bau.", answer: "himself" },
          { q: "My grandmother tells ___ stories every night. (my cousin and me)", answer: "us" },
          { q: "The festival is beautiful. ___ is held every year.", answer: "It" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Correct the mistake, make the pronoun clear, or write.",
        example: "Mai told Lan that she was late. (Who was late? Make it clear.)  ->  Mai told Lan, 'You are late.'",
        items: [
          { q: "Correct the mistake: Me and my grandfather made the lantern ourself.", answer: "My grandfather and I made the lantern ourselves." },
          { q: "Correct the mistake: My aunt gave the scarf to I.", answer: "My aunt gave the scarf to me." },
          { q: "Correct the mistake: The boys enjoyed theirselves at the festival.", answer: "The boys enjoyed themselves at the festival." },
          { q: "Rewrite so the pronoun is clear: My mother talked to my aunt and she was happy. (the aunt was happy)", answer: "My mother talked to my aunt and my aunt was happy." },
          { q: "Write one sentence with a reflexive pronoun about something you did without help.", answer: "e.g. I wrapped the present myself." },
          { q: "Write two linked sentences about a family tradition using he or she and then him or her.", answer: "e.g. My father cooks on Tết. We help him." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u6-ws-tags",
    title: "Question tags and indirect questions",
    grammar: "question tags; indirect questions",
    deckId: "rh-l3-u6-l2",
    slide: "Question tags and indirect questions",
    intro:
      "A question tag checks something. A positive sentence gets a negative tag; a negative sentence gets a positive tag: It is old, isn't it? It isn't loud, is it? In an indirect question the word order is a statement: Can you tell me where the festival is? (not where is the festival).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "It is a traditional song, ___?  (isn't it / is it)  ->  isn't it",
        items: [
          { q: "The music is lovely, ___?", options: ["isn't it", "is it"], answer: "isn't it" },
          { q: "You don't play the drum, ___?", options: ["do you", "don't you"], answer: "do you" },
          { q: "She can sing, ___?", options: ["can't she", "can she"], answer: "can't she" },
          { q: "They went to the festival, ___?", options: ["didn't they", "did they"], answer: "didn't they" },
          { q: "Can you tell me where the concert ___?", options: ["is", "does"], answer: "is" },
          { q: "Do you know ___ the show starts?", options: ["what time", "what time does"], answer: "what time" },
          { q: "Could you tell me ___?", options: ["how much the ticket costs", "how much does the ticket cost"], answer: "how much the ticket costs" },
          { q: "Do you know if she ___ the guitar?", options: ["plays", "does play"], answer: "plays" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the question tag, or change the direct question into an indirect question.",
        example: "Where is the hall?  ->  Can you tell me where the hall is?",
        items: [
          { q: "This style comes from the north, ___?", answer: "doesn't it" },
          { q: "You haven't heard this song, ___?", answer: "have you" },
          { q: "The singers were very good, ___?", answer: "weren't they" },
          { q: "Let's start now, ___?", answer: "shall we" },
          { q: "Where is the museum? Can you tell me ...", answer: "where the museum is" },
          { q: "What time does the show start? Do you know ...", answer: "what time the show starts" },
          { q: "Is the festival free? Could you tell me ...", answer: "if / whether the festival is free" },
          { q: "How old is this drum? I'd like to know ...", answer: "how old this drum is" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Correct the mistake or write. Check word order and the tags.",
        example: "Do you know where is the stage?  ->  Do you know where the stage is?",
        items: [
          { q: "Correct the mistake: Can you tell me what does this word mean?", answer: "Can you tell me what this word means?" },
          { q: "Correct the mistake: She doesn't sing here, doesn't she?", answer: "She doesn't sing here, does she?" },
          { q: "Correct the mistake: Do you know if did the show start?", answer: "Do you know if the show started?" },
          { q: "Write a polite indirect question to a guide about when the next performance begins.", answer: "e.g. Could you tell me when the next performance begins?" },
          { q: "Write a sentence with a question tag that checks you remember something about a festival.", answer: "e.g. The festival was in October, wasn't it?" },
          { q: "Explain in one sentence why we do not use do / does in 'Can you tell me where she lives?'.", answer: "In an indirect question the word order is the same as in a statement, so we do not need do / does." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u6-ws-used-to",
    title: "used to, past simple and present perfect",
    grammar: "used to; past simple vs present perfect",
    deckId: "rh-l3-u6-l3",
    slide: "used to, past simple and present perfect for traditions",
    intro:
      "used to + verb talks about a past habit or state that is not true now: Children used to play with paper kites. Use the past simple for a finished time (In 1990, we visited my grandparents) and the present perfect for a change that connects to now (Families have started to travel at Tết).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "My grandmother ___ make rice cakes every year. (used to / use to)  ->  used to",
        items: [
          { q: "Children ___ play outside all day.", options: ["used to", "use to"], answer: "used to" },
          { q: "We ___ a lot of presents when I was little. We don't now.", options: ["used to get", "have got"], answer: "used to get" },
          { q: "In 1995 my father ___ to Huế.", options: ["moved", "has moved"], answer: "moved" },
          { q: "Since then, the city ___ a lot.", options: ["has changed", "changed"], answer: "has changed" },
          { q: "My uncle ___ live in the countryside. Now he lives in Hanoi.", options: ["used to", "uses to"], answer: "used to" },
          { q: "I ___ my grandparents last Tết.", options: ["visited", "have visited"], answer: "visited" },
          { q: "Which sentence is correct?", options: ["She didn't use to like it.", "She didn't used to like it."], answer: "She didn't use to like it." },
          { q: "Families ___ different foods since then.", options: ["have tried", "tried"], answer: "have tried" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the correct form of the verb in brackets: used to, past simple or present perfect.",
        example: "In 1990, children (not / have) ___ phones.  ->  did not have / didn't use to have",
        items: [
          { q: "My grandmother (cook) ___ on a wood fire when she was young.", answer: "used to cook" },
          { q: "In 1990, families (visit) ___ their relatives on foot.", answer: "visited / used to visit" },
          { q: "Since 2000, many people (move) ___ to the city.", answer: "have moved" },
          { q: "We (not / have) ___ a TV when I was five.", answer: "didn't use to have / didn't have" },
          { q: "Tết (change) ___ a lot in the last thirty years.", answer: "has changed" },
          { q: "My father (go) ___ to the market with his father every morning.", answer: "used to go" },
          { q: "Last Tết, we (make) ___ rice cakes together.", answer: "made" },
          { q: "I (not / eat) ___ that dish before. It is new to me.", answer: "have not eaten" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Correct the mistake or write. Think about time words (in 1990, since, last year, when I was little).",
        example: "I have visited Huế in 2019.  ->  I visited Huế in 2019.",
        items: [
          { q: "Correct the mistake: My grandfather use to tell us stories.", answer: "My grandfather used to tell us stories." },
          { q: "Correct the mistake: Since 2010, the festival grew very big.", answer: "Since 2010, the festival has grown very big." },
          { q: "Correct the mistake: Did you used to visit your grandparents every week?", answer: "Did you use to visit your grandparents every week?" },
          { q: "Write one sentence with used to about how Tết was different when your parents were young.", answer: "e.g. My parents used to get only small gifts at Tết." },
          { q: "Write one sentence with the present perfect about something that has changed in your family traditions.", answer: "e.g. My family has started to video call my grandparents at Tết." },
          { q: "Write two sentences about one tradition: one with used to and one with the past simple and a time.", answer: "e.g. We used to make rice cakes at home. Last year, we bought them." },
        ],
      },
    ],
  },
];
