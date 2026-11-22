// Sun Class: how to do each homework task, step by step, in plain words.
// Shown under every Sun Class homework slide (on screen and in both printed
// copies), so a student never has to guess what to do, when, why, or how it
// will be checked and scored. Each lesson's homework slide says WHAT this week's
// topic, phrases and motion are; this guide says HOW.
//
// Links: public, free channels and sites, checked on 22 Nov 2026 (the BBC page in a
// browser; the YouTube handles and VOA / TED-Ed sites answered 200). Open links
// only through safeHttpUrl (AGENTS.md). Imports nothing.

export type GuideLink = { label: string; url: string; for: "Support" | "Core" | "Stretch" | "Everyone"; note: string };
export type GuideTask = {
  task: string; // matches the start of a homework item's label
  days: string; // in words
  time: string;
  why: string;
  steps: string[];
  links?: GuideLink[];
  checked: string; // how the teacher checks it on Sunday
  points: string; // how it is scored
  vi: string; // one line in Vietnamese for Support students
};

export const GUIDE_INTRO = [
  "Do a little every day. About 20 minutes. Do not do everything on Saturday night.",
  "Use a notebook only for Sun Class. This is your homework notebook. Bring it every Sunday.",
  "Your homework gets 10 points every week. The table below says how many points each task gives.",
  "Everything is checked in class on Sunday, by talking. If you did the work yourself, this is easy. If someone or something else did it, you cannot answer, and that task gets 0 points this week.",
  "You may NOT ask an AI to do your homework. There is one small exception in Debate prep, and it is explained there.",
];

const LISTEN_LINKS: GuideLink[] = [
  { label: "BBC 6 Minute English (website, with the words)", url: "https://www.bbc.co.uk/learningenglish/english/features/6-minute-english", for: "Everyone", note: "6-minute episodes. Each episode page has the transcript (all the words) under the audio." },
  { label: "BBC Learning English on YouTube", url: "https://www.youtube.com/@bbclearningenglish", for: "Support", note: "Short videos. Turn on subtitles with the CC button." },
  { label: "VOA Learning English (website)", url: "https://learningenglish.voanews.com/", for: "Support", note: "Choose Beginning or Intermediate. Slower, clear English." },
  { label: "VOA Learning English on YouTube", url: "https://www.youtube.com/@VOALearningEnglish", for: "Support", note: "Slow news and lessons." },
  { label: "TED-Ed lessons (website)", url: "https://ed.ted.com/lessons", for: "Core", note: "5-minute animated lessons. Filter by Middle School." },
  { label: "TED-Ed on YouTube", url: "https://www.youtube.com/@TEDEd", for: "Core", note: "The same lessons on YouTube. Use CC for subtitles on the second listen." },
  { label: "CBC Kids News on YouTube", url: "https://www.youtube.com/@CBCKidsNews", for: "Core", note: "Short news stories for young people." },
  { label: "SciShow Kids on YouTube", url: "https://www.youtube.com/@SciShowKids", for: "Core", note: "Short science videos, good for Term 4." },
  { label: "TED talks on YouTube", url: "https://www.youtube.com/@TED", for: "Stretch", note: "Real talks at full speed. Choose ones under 12 minutes." },
];

export const HOMEWORK_GUIDE: GuideTask[] = [
  {
    task: "Daily listening + log",
    days: "Monday, Tuesday, Thursday, Friday and Saturday (5 days)",
    time: "Support 8 minutes, Core 12 minutes, Stretch 18 minutes a day",
    why: "Listening every day is the biggest thing you can do for your Listening band. Your ears get used to real English speed. The timestamp and the voice note prove you really listened.",
    steps: [
      "Open one of the links below. Your homework slide says which kind to choose this week.",
      "Choose ONE episode or video. Write in your notebook: the date, the title, and the link.",
      "Listen ONE time without the words (no subtitles, no transcript).",
      "Listen a SECOND time with the words (turn on CC on YouTube, or open the transcript on the BBC page).",
      "Find the time. On YouTube the time is at the bottom left of the video, for example 3:40. On the BBC page, use the time on the audio player.",
      "Pause the video at a moment you like. Write the time (for example 3:40) and copy the exact words you hear just after it (5 to 8 words). Core and Stretch: do this two times, at two different times.",
      "Write the new words or phrases you learned: Support 1, Core 3, Stretch 3.",
      "Close the video. Now record a voice note on your phone, straight away, with no notes and no script: Support 20 seconds, Core 30 seconds, Stretch 45 seconds. Say what the speaker said and what you think about it. Keep the voice note on your phone until Sunday.",
    ],
    links: LISTEN_LINKS,
    checked: "On Sunday the teacher chooses two students. The teacher opens your episode at your time (for example 3:40) and asks: what did the speaker say just before or after this? The teacher may also play one of your voice notes to the class.",
    points: "3 points: 2 points for 5 days written in your notebook with times and exact words, 1 point for your voice notes. If you cannot answer the teacher's question about your episode, this task gets 0 this week.",
    vi: "Nghe 5 ngày mỗi tuần. Ghi ngày, tên bài, thời điểm (ví dụ 3:40) và chép đúng 5-8 từ nghe được. Sau đó ghi âm giọng nói ngắn, không đọc giấy.",
  },
  {
    task: "Shadowing",
    days: "Monday, Tuesday, Thursday, Friday and Saturday (5 days)",
    time: "5 minutes a day",
    why: "Shadowing means speaking at the same time as the speaker. It trains your mouth to say English sounds, stress and the ends of words. This helps your Pronunciation band.",
    steps: [
      "Use the same episode or video as your listening that day.",
      "Choose 30 seconds that you like.",
      "Listen to the 30 seconds once.",
      "Play it again and speak WITH the speaker, at the same time, quietly. Copy the speed, the strong words and the end of every word.",
      "Do it 3 times.",
      "On Saturday only: record your best try (30 seconds) as audio on your phone. Write down the episode and the time of your 30 seconds.",
    ],
    checked: "On Sunday the teacher may play your Saturday recording next to the same 30 seconds of the real video, and listen for the ends of your words.",
    points: "1 point for your Saturday shadowing recording.",
    vi: "Nói theo cùng lúc với người nói trong 30 giây, 3 lần. Thứ Bảy: ghi âm lần tốt nhất.",
  },
  {
    task: "Recorded speaking (video homework)",
    days: "Wednesday",
    time: "15 minutes",
    why: "This is real IELTS speaking practice. The teacher listens and gives you feedback on the four IELTS criteria. The code word and the surprise question show it is really you, speaking that day.",
    steps: [
      "Remember the CODE WORD. The teacher writes it on the board at the end of Sunday's class. Write it in your notebook.",
      "On Wednesday morning, look in the class Zalo group for the SURPRISE QUESTION from the teacher.",
      "Read the questions on the 'Video homework' slide of this week's lesson. You may think for 1 minute. Do not write sentences.",
      "Open the video homework in the HEC app and press record.",
      "Say: today's date and the code word. Then answer the questions. Then answer the surprise question.",
      "Record in ONE take. Do not stop and start again. Do not cut the video. Mistakes are OK.",
      "Send it before Wednesday night.",
    ],
    checked: "The teacher watches every video and scores it with the IELTS rubric: Fluency, Vocabulary, Grammar, Pronunciation. A video without the code word or without the surprise question does not count, even if it is very good.",
    points: "3 points: 1 point for sending it on time with the code word and the surprise question, 2 points for good effort on the task. You also get IELTS feedback, which is not part of the 10 points.",
    vi: "Thứ Tư: quay video trong app, một lần, không cắt. Nói ngày, mật khẩu (code word) và trả lời câu hỏi bất ngờ (cô/thầy gửi trong nhóm Zalo của lớp sáng thứ Tư).",
  },
  {
    task: "Vocabulary retrieval",
    days: "Monday, Tuesday, Wednesday, Thursday and Saturday (5 days)",
    time: "5 minutes a day",
    why: "Testing yourself from memory is the best way to remember words. Reading a list again does not work well. Remembering does.",
    steps: [
      "On Monday, make cards: one card for each phrase on this week's vocabulary slide (usually 6).",
      "FRONT of the card: the phrase.",
      "BACK of the card: your own sentence about YOUR week, using the phrase, with the phrase left out as a gap: ____.",
      "Every day: look at the BACK, read your sentence, and say the missing phrase out loud. Then turn the card over and check.",
      "Right? Put the card on the 'know' pile. Wrong or slow? Put it on the 'nearly' pile.",
      "Tomorrow, start with the 'nearly' pile.",
      "Keep last week's cards too, and mix in 3 of them each day.",
    ],
    checked: "On Sunday the Homework check starts with a 2-minute spoken quiz: the teacher reads the back of your card and you say the phrase.",
    points: "2 points from the Sunday spoken quiz.",
    vi: "Làm thẻ từ: mặt trước là cụm từ, mặt sau là câu của em về tuần của em (bỏ trống cụm từ). Mỗi ngày tự kiểm tra 5 phút.",
  },
  {
    task: "Debate prep",
    days: "Wednesday and Friday",
    time: "10 minutes each day",
    why: "Next Sunday's debate needs ideas ready in your head. Keyword cards make you speak from ideas, not read sentences. That is the skill IELTS Part 3 tests.",
    steps: [
      "Read next week's motion on the homework slide.",
      "Wednesday: make 5 small cards. On each card write only KEYWORDS, at most 6 words. No full sentences.",
      "Make cards for BOTH sides: ideas for and ideas against. You will be told your side in class.",
      "Friday: use a timer. Speak for 45 seconds for one side, then 45 seconds for the other side, using only the cards.",
      "AI rule (the only time you may use an AI): you may ask an AI for ONE argument for the side you disagree with. Write the exact question you asked on the back of a card, and write one reason why the AI's answer is weak. Nothing else from an AI.",
    ],
    checked: "In class you speak from your cards only, and the teacher asks you one follow-up question. If you used the AI argument, you explain to the class why it is weak.",
    points: "1 point for 5 keyword cards (both sides) brought to class.",
    vi: "Viết 5 thẻ chỉ có từ khoá (tối đa 6 từ), cho cả hai phía. Thứ Sáu tập nói 45 giây mỗi phía.",
  },
];

/** The guide entry for a homework item, by the start of its label. */
export function guideFor(label: string): GuideTask | undefined {
  return HOMEWORK_GUIDE.find((g) => label.toLowerCase().startsWith(g.task.toLowerCase().split(" (")[0]));
}
