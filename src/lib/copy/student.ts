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
  "grownups.help": { en: "Tuition, the wallet, reports and the rest of the app are here.", vi: "Học phí, ví, báo cáo và các mục khác của ứng dụng ở đây.", draft: true },
  "grownups.wallet": { en: "Wallet", vi: "Ví", draft: true },
  "grownups.everything": { en: "Everything else", vi: "Các mục khác", draft: true },

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
