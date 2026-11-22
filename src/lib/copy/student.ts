/**
 * Words for the student surfaces, written under docs/EXPERIENCE_DESIGN_BRIEF.md (J2). One small typed
 * dictionary: every entry is { en, vi }. Only strings written or rewritten under the brief live here.
 *
 * `draft: true` marks Vietnamese drafted by the developer and not yet read by a Vietnamese speaker (brief J2,
 * Part L question 9): the list is handed to the owner, and nothing marked draft is final.
 *
 * Voice (J1): plain, warm, short. No exclamation marks for adults, at most one per screen for children; say what
 * happened and what to do; never blame ("This is the next thing", not "This is late").
 * `{name}` style placeholders are filled by `fill()`.
 */
export type StudentCopyKey = keyof typeof studentCopy;

export interface CopyEntry {
  en: string;
  vi: string;
  /** Vietnamese drafted by the developer; a Vietnamese speaker has not read it yet. */
  draft?: true;
}

export const studentCopy = {
  // ---- Look (Profile)
  "look.title": { en: "Look", vi: "Giao diện", draft: true },
  "look.help": { en: "Choose how your page looks.", vi: "Chọn giao diện cho trang của con.", draft: true },
  "look.playful": { en: "Playful", vi: "Vui nhộn", draft: true },
  "look.classic": { en: "Classic", vi: "Cổ điển", draft: true },
  "look.pip": { en: "Show Pip", vi: "Hiện Pip", draft: true },
  "look.vi": { en: "Vietnamese under the English", vi: "Tiếng Việt dưới tiếng Anh", draft: true },

  // ---- Moving up (F3)
  "moving.line": { en: "A new school year. Your space has grown with you.", vi: "Năm học mới. Không gian của con đã lớn lên cùng con.", draft: true },

  // ---- Navigation (brief G1): one short word each; early and young see the Vietnamese beneath
  "nav.home": { en: "Home", vi: "Trang chủ", draft: true },
  "nav.homework": { en: "Homework", vi: "Bài tập", draft: true },
  "nav.lessons": { en: "Lessons", vi: "Bài học", draft: true },
  "nav.classReports": { en: "Class Reports", vi: "Báo cáo lớp", draft: true },
  "nav.record": { en: "Record", vi: "Quay video", draft: true },
  "nav.schedule": { en: "My Classes", vi: "Lớp của con", draft: true },
  "nav.reports": { en: "Reports", vi: "Báo cáo", draft: true },
  "nav.journal": { en: "Journal", vi: "Nhật ký", draft: true },
  "nav.tuition": { en: "Tuition", vi: "Học phí", draft: true },
  "nav.achievements": { en: "Achievements", vi: "Thành tích", draft: true },
  "nav.resources": { en: "Resources", vi: "Tài liệu", draft: true },
  "nav.vocabulary": { en: "Vocabulary", vi: "Từ vựng", draft: true },
  "nav.myWork": { en: "My Work", vi: "Bài của con", draft: true },
  "nav.classGallery": { en: "Class Gallery", vi: "Góc của lớp", draft: true },
  "nav.videos": { en: "My Videos", vi: "Video của con", draft: true },
  "nav.pictureReader": { en: "Picture Reader", vi: "Đọc qua hình", draft: true },
  "nav.defend": { en: "Defend My Level", vi: "Bảo vệ cấp độ", draft: true },
  "nav.me": { en: "Me", vi: "Của con", draft: true },
  "nav.grownups": { en: "Grown-ups", vi: "Người lớn", draft: true },
  "nav.more": { en: "More", vi: "Thêm", draft: true },

  // ---- Grown-ups (money and the rest, behind one door for the younger bands)
  "grownups.title": { en: "For grown-ups", vi: "Dành cho người lớn", draft: true },
  "grownups.help": { en: "Tuition, reports and the rest of the app are here.", vi: "Học phí, báo cáo và các mục khác của ứng dụng ở đây.", draft: true },
  "grownups.everything": { en: "Everything else", vi: "Các mục khác", draft: true },

  // ---- Home (brief G2-G5)
  "greet.morning": { en: "Good morning", vi: "Chào buổi sáng", draft: true },
  "greet.afternoon": { en: "Good afternoon", vi: "Chào buổi chiều", draft: true },
  "greet.evening": { en: "Good evening", vi: "Chào buổi tối", draft: true },
  "hello.name": { en: "Hello, {name}", vi: "Xin chào, {name}", draft: true },
  "next.label": { en: "The next thing", vi: "Việc tiếp theo", draft: true },
  "next.open": { en: "Open my homework", vi: "Mở bài tập", draft: true },
  "next.due": { en: "Due {date}", vi: "Hạn nộp {date}", draft: true },
  "next.noDue": { en: "No due date", vi: "Chưa có hạn nộp", draft: true },
  "next.todoOne": { en: "1 thing to do", vi: "1 việc cần làm", draft: true },
  "next.todoMany": { en: "{n} things to do", vi: "{n} việc cần làm", draft: true },
  "next.class": { en: "Your next class", vi: "Buổi học tiếp theo", draft: true },
  "next.loading": { en: "Finding your homework…", vi: "Đang tìm bài tập…", draft: true },
  "next.error": { en: "We couldn't load your homework.", vi: "Không tải được bài tập.", draft: true },
  "next.retry": { en: "Try again", vi: "Thử lại", draft: true },
  "next.retrying": { en: "Trying…", vi: "Đang thử…", draft: true },
  "listen": { en: "Listen", vi: "Nghe", draft: true },
  "door.homework": { en: "My homework", vi: "Bài tập của con", draft: true },
  "door.video": { en: "Make my video", vi: "Quay video của con", draft: true },
  "door.stars": { en: "My stars", vi: "Sao của con", draft: true },
  "stars.count": { en: "{n} stars", vi: "{n} ngôi sao", draft: true },
  "stars.shelf": { en: "Full jars", vi: "Những lọ đã đầy", draft: true },
  "week.title": { en: "This week", vi: "Tuần này", draft: true },
  "week.best": { en: "Best: {n} days", vi: "Tốt nhất: {n} ngày", draft: true },
  "class.stars": { en: "Our class has {n} stars", vi: "Lớp mình có {n} ngôi sao", draft: true },
  "class.title": { en: "Our class", vi: "Lớp của mình", draft: true },
  "class.you": { en: "You: {n} points", vi: "Con: {n} điểm", draft: true },
  "class.points": { en: "{n} points", vi: "{n} điểm", draft: true },
  "class.near": { en: "Near you", vi: "Những bạn gần con", draft: true },
  "class.gain": { en: "You gained {n} points this week.", vi: "Tuần này con được thêm {n} điểm.", draft: true },
  "class.table": { en: "Class table", vi: "Bảng của lớp", draft: true },
  "class.mine": { en: "My progress", vi: "Tiến trình của tôi", draft: true },
  "class.loading": { en: "Counting up the points…", vi: "Đang tính điểm…", draft: true },
  "path.title": { en: "Your week", vi: "Tuần của con", draft: true },
  "path.lesson": { en: "Class", vi: "Buổi học", draft: true },
  "path.homework": { en: "Homework", vi: "Bài tập", draft: true },
  "path.done": { en: "Done", vi: "Xong", draft: true },
  "level.toNext": { en: "{n} XP to Level {level}", vi: "Còn {n} XP để lên Cấp {level}", draft: true },
  "level.label": { en: "Level {n}", vi: "Cấp {n}", draft: true },
  "streak.days": { en: "{n} days in a row", vi: "{n} ngày liên tiếp", draft: true },
  "streak.best": { en: "Best: {n} days", vi: "Tốt nhất: {n} ngày", draft: true },
  "streak.welcome": { en: "Welcome back. Your best is {n} days.", vi: "Chào mừng con trở lại. Kỷ lục của con là {n} ngày.", draft: true },
  "quests.title": { en: "Quests", vi: "Nhiệm vụ", draft: true },
  "badges.title": { en: "Badges", vi: "Huy hiệu", draft: true },
  "me.title": { en: "Me", vi: "Của con", draft: true },
  "profile.edit": { en: "Edit my profile", vi: "Sửa hồ sơ của con", draft: true },
  "teen.upNext": { en: "Up next", vi: "Sắp tới", draft: true },
  "teen.lessons": { en: "Recent lessons", vi: "Các buổi học gần đây", draft: true },

  // ---- The finish line (brief I7): shown when there is nothing left to do today
  "finish.early": { en: "All done! See you in class.", vi: "Xong rồi! Hẹn gặp con ở lớp.", draft: true },
  "finish.young": { en: "You finished everything for today.", vi: "Con đã làm xong mọi việc hôm nay.", draft: true },
  "finish.junior": { en: "Nothing left today.", vi: "Hôm nay không còn việc nào.", draft: true },
  "finish.teen": { en: "You're up to date.", vi: "Bạn đã hoàn thành mọi việc.", draft: true },
  "finish.nextClass": { en: "Next class: {when}", vi: "Buổi học tiếp theo: {when}", draft: true },

  // ---- Pip's lines (brief I2): pleased to see the child, praises what was done, never sad, never "come back".
  "pip.hello.1": { en: "Nice to see you.", vi: "Rất vui được gặp con.", draft: true },
  "pip.hello.2": { en: "Let's say one new thing in English today.", vi: "Hôm nay mình cùng nói một điều mới bằng tiếng Anh nhé.", draft: true },
  "pip.hello.3": { en: "Welcome back.", vi: "Chào mừng con trở lại.", draft: true },
  "pip.homework.1": { en: "Your homework is ready when you are.", vi: "Bài tập đã sẵn sàng khi con muốn làm.", draft: true },
  "pip.homework.2": { en: "There is something new to try.", vi: "Có một điều mới để thử.", draft: true },
  "pip.homework.3": { en: "One step at a time. Start with the next thing.", vi: "Từng bước một. Con bắt đầu với việc tiếp theo nhé.", draft: true },
  "pip.done.1": { en: "You finished your homework.", vi: "Con đã làm xong bài tập.", draft: true },
  "pip.done.2": { en: "All your homework is done.", vi: "Bài tập của con đã xong hết.", draft: true },
  "pip.done.3": { en: "That is a lot of work finished.", vi: "Con đã hoàn thành rất nhiều việc.", draft: true },
  "pip.days.1": { en: "You have been here {n} days in a row.", vi: "Con đã học {n} ngày liên tiếp.", draft: true },
} as const satisfies Record<string, CopyEntry>;

/** Pip's pools by what is true today. A line is picked by the day and the child, so it changes tomorrow, not on every render. */
export const pipPools = {
  hello: ["pip.hello.1", "pip.hello.2", "pip.hello.3"],
  homework: ["pip.homework.1", "pip.homework.2", "pip.homework.3"],
  done: ["pip.done.1", "pip.done.2", "pip.done.3"],
  days: ["pip.days.1"],
} as const satisfies Record<string, readonly StudentCopyKey[]>;


/** Fills {name} style placeholders. */
export function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, k) => (k in vars ? String(vars[k]) : whole));
}
