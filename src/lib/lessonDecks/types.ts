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
  // The book's own class audio, as the track number on the teacher's copy
  // ("4-12"). The app never hosts Oxford's audio; it only says which track to play.
  track?: string;
};

export type Mode = "whole" | "pairs" | "groups" | "solo";

export type Thinking = "Create" | "Design" | "Evaluate" | "Argue" | "Compare and justify";

export type CreativeTask = {
  title: string;
  task: string; // what to make, in one or two sentences a child can follow
  steps: string[];
  frames: string[]; // sentence starters that carry the lesson's language
  success: string[]; // what a good piece has
  challenge: string; // the stretch for high achievers
};

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
      frames?: string[]; // sentence frames on the board, as on a speaking slide
      fluencyTip?: string;
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
      book?: BookRef;
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
      model?: { title: string; text: string }; // an original model text to listen to
    }
  | {
      kind: "vlog";
      title: string;
      prompt: string;
      length: string; // "60-90 seconds"
      tiers: { level: "Support" | "Core" | "Stretch"; who: string; frames: string[]; tips: string[] }[];
    }
  | { kind: "reflect"; title?: string; prompts: string[] }
  | {
      // Creative homework: a higher-order task (create, evaluate, design, argue)
      // using the lesson's words and grammar. `variants` are the same task built
      // around an interest; which children get one is chosen per class from the
      // roster (class_deck_state.interests), never written here.
      kind: "creative";
      thinking: Thinking;
      uses: { words: string[]; grammar: string[] };
      base: CreativeTask;
      variants?: { interest: string; label: string; task: CreativeTask }[];
    }
  | {
      // An assessment checkpoint inside a lesson. The items live in the unit's
      // `assessments` (one source for the slide and the printed check).
      kind: "check";
      title: string;
      assessment: string; // Assessment.id
      mode: Mode;
      minutes: number;
      steps: string[];
    };

/** A question with its answer (for worksheets and assessments). */
export type Item = { q: string; options?: string[]; answer: string };

/** An original printable grammar worksheet, in three levels with an answer key. */
export type Worksheet = {
  id: string; // "od2e-l3-u12-ws-as-as"
  title: string;
  grammar: string; // "as ... as / not as ... as"
  deckId: string; // the lesson it belongs to
  slide: string; // the title of the slide it follows
  intro: string; // the rule in one or two child-sized lines, printed at the top
  tiers: { level: "Support" | "Core" | "Challenge"; instructions: string; example?: string; items: Item[] }[];
};

export type AssessmentSection = {
  title: string;
  skill: "Vocabulary" | "Grammar" | "Reading" | "Writing" | "Speaking";
  instructions: string;
  passage?: string; // an original text (never the book's)
  items: Item[];
  marksEach: number;
};

/** A checkpoint: a quick formative check mid-unit, or the end-of-unit test. */
export type Assessment = {
  id: string;
  title: string;
  kind: "formative" | "summative";
  // When it is given: a formative check runs inside the deck that carries its
  // "check" slide; a summative test takes the class date after `afterLesson`.
  afterLesson: number;
  minutes: number;
  covers: string[];
  sections: AssessmentSection[];
  speaking?: {
    task: string;
    prompts: string[];
    rubric: { criterion: string; bands: [string, string, string, string] }[]; // 4 (best) .. 1
  };
};

/**
 * Where a 2nd-edition page sits in the 1st-edition Student Book, for a class
 * whose flipbook is the 1st edition. Keys are "SB 116" or "SB 116 A" (page and
 * activity); `page` is the PRINTED 1e page, null when 1e has no equivalent.
 */
export type FirstEditionMap = {
  unit: number | null; // the 1e unit on the same topic, if any
  note?: string;
  pages: Record<string, { page: number | null; activity?: string; note?: string }>;
};

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
  // Supplementary worksheets, as LINKS to the publisher's own page: a teacher opens
  // them with the school's account. Files are never copied into the app (Twinkl's
  // licence is for the subscriber's own classroom use, not re-hosting).
  // `slide` is the title of the slide it supports, so the player can show it there
  // (optional so units written before it keep compiling; the panel lists those under the lesson).
  resources?: { title: string; url: string; source: "Twinkl"; use: string; slide?: string }[];
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
  worksheets?: Worksheet[];
  assessments?: Assessment[];
  firstEdition?: FirstEditionMap;
};
