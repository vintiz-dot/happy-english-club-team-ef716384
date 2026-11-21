// Lesson decks: what a deck is made of. Content lives in src/content/lessonDecks
// (written in the repo, reviewed like code), and the player renders it.
//
// Any text may carry name slots {s1} .. {s9}. In class the player fills them with
// children from the roster of the class being taught (names.ts), so a grammar
// example reads "Linh has already finished her drawing". Nothing about a child
// is ever saved in a deck: the slots are filled on screen and forgotten.

export type BookRef = {
  book: "SB" | "WB"; // Student Book / Workbook
  pages: string; // "102-103"
  activities?: string[]; // ["1", "2", "3"] as numbered in the book
  note?: string;
};

export type Mode = "whole" | "pairs" | "groups" | "solo";

export type Slide =
  | { kind: "title"; title: string; subtitle?: string; bigQuestion?: string }
  | { kind: "objectives"; title?: string; items: string[] }
  | {
      kind: "activity";
      title: string;
      tag?: "Warm-up" | "Vocabulary" | "Reading" | "Listening" | "Grammar" | "Speaking" | "Writing" | "Game" | "Phonics" | "Review" | "Cool-down";
      mode: Mode;
      minutes: number;
      steps: string[];
      prompts?: string[];
      book?: BookRef;
      teacherNote?: string;
    }
  | { kind: "vocab"; title?: string; words: { word: string; meaning: string; example: string }[]; book?: BookRef }
  | {
      kind: "grammar";
      title: string;
      hook?: string; // one sentence that makes the point memorable
      form: { label: string; pattern: string }[];
      explanation: string[]; // paragraphs: what it means, when we use it, why
      examples: { text: string; note?: string }[];
      pitfalls?: { wrong: string; right: string; why: string }[];
      book?: BookRef;
    }
  | {
      kind: "speaking";
      title: string;
      mode: Mode;
      minutes: number;
      frames: string[]; // sentence frames on the board
      prompts: string[]; // what partners ask each other
      fluencyTip?: string;
      steps?: string[];
    }
  | { kind: "book"; title?: string; ref: BookRef; steps?: string[] }
  | { kind: "homework"; title?: string; items: { label: string; detail: string; book?: BookRef }[] }
  | {
      kind: "project";
      project: "writing" | "speaking";
      title: string;
      goal: string;
      steps: string[];
      criteria: string[];
      frames?: string[];
    }
  | {
      kind: "vlog";
      title: string;
      prompt: string;
      length: string; // "60-90 seconds"
      tiers: { level: "Support" | "Core" | "Stretch"; who: string; frames: string[]; tips: string[] }[];
    }
  | { kind: "reflect"; title?: string; prompts: string[] };

export type Deck = {
  id: string; // "od2e-l3-u12-l1"
  curriculum: "oxford-discover-2e";
  level: number;
  unit: number;
  lesson: number; // 1-based order within the unit
  title: string;
  minutes: number; // planned length (a class is 90)
  inquiryPhases: ("Engage" | "Focus" | "Investigate" | "Organize" | "Generalize" | "Transfer" | "Reflect")[];
  book: BookRef[]; // every SB / WB page this lesson covers
  // The course book lesson this deck teaches (a row of public.curriculum_lessons).
  // Presenting the deck to a class marks it as covered in today's lesson, so the
  // lesson report starts from the book's objectives.
  covers?: { unitFrom: number; lesson: "Big Question" | "Get Ready" | "Read" | "Understand" | "Communicate" | "Wrap Up" };
  slides: Slide[];
};

export type Unit = {
  curriculum: "oxford-discover-2e";
  level: number;
  unit: number;
  title: string;
  bigQuestion: string;
  generalizations: string[]; // the teacher's planned understandings (not shown to students as answers)
  decks: Deck[];
};
