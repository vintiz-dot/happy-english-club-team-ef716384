// Made-up people and records for the preview. Nobody here is real.
// Dates are relative to today so the screens always look "current".
import { adminDb } from "./adminFixtures";
import { stubPicture } from "./fakeFiles";

export type Screen =
  | "student-home" | "student-homework" | "family" | "teacher" | "teacher-grid" | "teacher-attendance" | "teacher-drawer"
  | "teacher-grading" | "teacher-video" | "teacher-smart" | "teacher-payroll"
  | "student-srs" | "student-defend"
  | "student-lessons" | "student-lesson" | "student-reports" | "student-mywork" | "student-gallery" | "student-videos" | "student-record" | "student-resources" | "student-reader"
  | "admin-overview" | "admin-tuition" | "admin-payroll" | "admin-dialogs";
export type State = "ok" | "error" | "empty";
/** the class video wall's hearts, kept in memory so a tap can be watched */
export const heartState = new Set<string>();

// Read once: the app may rewrite the URL, the preview must not forget what it was asked for.
const params = new URLSearchParams(window.location.search);
const SCREEN = (params.get("screen") as Screen) || "student-home";
const STATE = (params.get("state") as State) || "ok";
const THEME = params.get("theme") === "dark" ? "dark" : "light";
// The child's year of birth (made up): &born=2020 gives the youngest band, &born=2009 the oldest, &born=none no date at all.
// &second=YYYY (or "none") adds a second child on the same login, so the profile switch can be seen.
const dobOf = (value: string | null, fallback: string | null) =>
  value === null ? fallback : value === "none" ? null : /^\d{4}$/.test(value) ? `${value}-05-04` : fallback;
const BORN = dobOf(params.get("born"), "2017-05-04");
const SECOND = params.get("second");
// &kids=1 keeps one child on the family home (the default is two)
const ONE_KID = params.get("kids") === "1";
// &notif=2 gives the family two unread messages from the school, &notif=0 none (the bell then has read an empty list);
// without it the parent's bell has read nothing, as for a parent with no child selected
export const NOTIF = params.get("notif");
// &economy=1 turns the class economy on for the made-up class, so the wallet shows
const ECONOMY = params.get("economy") === "1";
export const SECOND_ID = "stu-second-child";

export const getScreen = (): Screen => SCREEN;
export const getState = (): State => STATE;
export const getTheme = () => THEME;

export const ROLE_OF: Record<Screen, "student" | "family" | "teacher" | "admin"> = {
  "student-home": "student",
  "student-homework": "student",
  "student-srs": "student",
  "student-lessons": "student",
  "student-lesson": "student",
  "student-reports": "student",
  "student-mywork": "student",
  "student-gallery": "student",
  "student-videos": "student",
  "student-record": "student",
  "student-resources": "student",
  "student-reader": "student",
  "student-defend": "student",
  family: "family",
  teacher: "teacher",
  "teacher-grid": "teacher",
  "teacher-attendance": "teacher",
  "teacher-drawer": "teacher",
  "teacher-grading": "teacher",
  "teacher-video": "teacher",
  "teacher-smart": "teacher",
  "teacher-payroll": "teacher",
  "admin-overview": "admin",
  "admin-tuition": "admin",
  "admin-payroll": "admin",
  "admin-dialogs": "admin",
};
export const PATH_OF: Record<Screen, string> = {
  "student-home": "/student/dashboard",
  "student-homework": "/student/assignments",
  "student-srs": "/student/srs",
  "student-lessons": "/student/lessons",
  "student-lesson": "/student/lessons/les-1",
  "student-reports": "/student/lesson-reports",
  "student-mywork": "/student/my-work",
  "student-gallery": "/student/class-gallery",
  "student-videos": "/student/videos",
  "student-record": "/student/record",
  "student-resources": "/student/resources",
  "student-reader": "/student/language-support",
  "student-defend": "/student/defend-level",
  family: "/family/dashboard",
  teacher: "/teacher/dashboard",
  "teacher-grid": "/teacher/grid",
  "teacher-attendance": "/teacher/attendance-hub",
  "teacher-drawer": "/teacher/drawer",
  "teacher-grading": "/teacher/assignments",
  "teacher-video": "/teacher/video",
  "teacher-smart": "/teacher/smart-upload",
  "teacher-payroll": "/teacher/payroll",
  "admin-overview": "/admin",
  "admin-tuition": "/tuition",
  "admin-payroll": "/admin",
  "admin-dialogs": "/tuition",
};

export const STUDENT_ID = "stu-quynh-tram-anh";
export const ME = {
  userId: "user-preview-1",
  name: ({ "student-home": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-homework": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-srs": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-lessons": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-lesson": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-reports": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-mywork": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-gallery": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-videos": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-record": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-resources": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-reader": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-defend": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", family: "Phụ huynh Lê", teacher: "Cô Trần Thu Hà", "teacher-grid": "Cô Trần Thu Hà", "teacher-attendance": "Cô Trần Thu Hà", "teacher-drawer": "Cô Trần Thu Hà", "teacher-grading": "Cô Trần Thu Hà", "teacher-video": "Cô Trần Thu Hà", "teacher-smart": "Cô Trần Thu Hà", "teacher-payroll": "Cô Trần Thu Hà" } as Record<string, string>)[SCREEN] ?? "Cô Nguyễn Thị Lan (admin)",
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const day = (n: number) => ymd(addDays(n));
const hm = (minutesFromNow: number) => {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  const m = Math.min(23 * 60 + 59, Math.max(0, d.getHours() * 60 + d.getMinutes()));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`;
};

const LEVEL = (all: number) => ({
  all_time: all,
  level: { level: 4, from: 300, next: 600, progress: 40, to_next: 180 },
  classes: [],
  month: all,
});

export function buildDb() {
  const roles = [{ user_id: ME.userId, role: ROLE_OF[SCREEN] }];
  const tables: Record<string, any[]> = { user_roles: roles };
  let errorOn: string[] = [];
  let emptyOn: string[] = [];
  let homeworkRpc: any = { homeworks: [], submissions: [] };
  const points: Record<string, any> = {};

  if (SCREEN === "student-home" || SCREEN === "student-homework" || SCREEN === "student-srs" || SCREEN === "student-defend" || (["student-lessons","student-lesson","student-reports","student-mywork","student-gallery","student-videos","student-record","student-resources","student-reader"] as string[]).includes(SCREEN)) {
    const cls = { id: "cls-1", name: "Starters Stars (Mon/Wed)" };
    const hw = (id: string, title: string, due: string | null, body = "Do the pages in your book and be ready to read aloud.") => ({
      id, title, due_date: due, body, class_id: cls.id, classes: { name: cls.name }, homework_files: [],
    });
    homeworkRpc = {
      homeworks: [
        hw("hw-late", "Unit 5 reading log", day(-2)),
        hw("hw-old", "Summer holiday diary", day(-31)),
        hw("hw-tie-b", "Speaking card B: my family", day(3)),
        hw("hw-tie-a", "Speaking card A: my pet", day(3)),
        hw("hw-undated", "Bring a photo of your favourite toy", null),
        hw("hw-soon", "Spelling list 12", day(1)),
        hw("hw-later", "Poster: healthy food", day(7)),
        hw("hw-done", "Colours worksheet", day(-1)),
        { ...hw("hw-video", "Say hello to your class (video)", day(5)), submission_type: "video" },
      ],
      submissions: [
        { id: "sub-1", homework_id: "hw-done", status: "submitted", submitted_at: new Date().toISOString(), grade: null },
      ],
    };
    // &hw=late (default) | one (a single open homework) | empty (nothing open) | grade1 | grade3 (marked in the last day)
    const HW = params.get("hw") ?? "late";
    const nowIso = new Date().toISOString();
    const marked = (n: number) => Array.from({ length: n }, (_, i) => ({
      hw: hw("hw-gr" + i, ["Colours poster", "Unit 4 listening log", "Spelling list 11"][i], day(-2 - i)),
      sub: { id: "sub-gr" + i, homework_id: "hw-gr" + i, status: "graded", submitted_at: nowIso, graded_at: new Date(Date.now() - i * 3_600_000).toISOString(), grade: ["A-", "B+", "A"][i], teacher_feedback: i === 0 ? "You read each word clearly and your poster was tidy. Next time add one more sentence about each colour." : null },
    }));
    const done = homeworkRpc.homeworks.find((h: any) => h.id === "hw-done");
    if (HW === "one") homeworkRpc.homeworks = homeworkRpc.homeworks.filter((h: any) => h.id === "hw-soon" || h.id === "hw-done");
    if (HW === "empty") homeworkRpc.homeworks = [done];
    if (HW === "grade1" || HW === "grade3") {
      const m = marked(HW === "grade1" ? 1 : 3);
      homeworkRpc.homeworks = [...homeworkRpc.homeworks, ...m.map((x) => x.hw)];
      homeworkRpc.submissions = [...homeworkRpc.submissions, ...m.map((x) => x.sub)];
    }
    tables.students = [{
      id: STUDENT_ID, full_name: ME.name, email: null, phone: null, date_of_birth: BORN,
      avatar_url: null, is_active: true, status_message: null, family: { name: "Nguyễn family" }, updated_at: new Date().toISOString(),
      // the child's own login (the shell reads the date of birth from this row); the home finds it another way
      linked_user_id: SECOND || SCREEN !== "student-home" ? ME.userId : undefined,
    }];
    tables.enrollments = [{ id: "enr-1", student_id: STUDENT_ID, class_id: cls.id, end_date: null, classes: { ...cls, economy_mode: ECONOMY, points_to_cash_rate: ECONOMY ? 50 : 0 } }];
    if (SECOND) {
      tables.students.push({
        id: SECOND_ID, full_name: "Trần Gia Bảo", email: null, phone: null, date_of_birth: dobOf(SECOND, "2012-03-02"),
        avatar_url: null, is_active: true, status_message: null, family: { name: "Nguyễn family" }, updated_at: new Date().toISOString(),
        linked_user_id: ME.userId,
      });
      tables.enrollments.push({ id: "enr-2", student_id: SECOND_ID, class_id: cls.id, end_date: null, classes: { ...cls, economy_mode: false, points_to_cash_rate: 0 } });
      points[SECOND_ID] = LEVEL(1330);
    }
    // This week's streak and stickers (Monday and Tuesday rewarded), for whichever child is open.
    // the week the streak hook reads: its Monday is dayjs().startOf("week") + 1 day
    const monday = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d; })();
    const dayOfWeek = (i: number) => { const d = new Date(monday); d.setDate(d.getDate() + i); return ymd(d); };
    tables.student_login_streaks = [STUDENT_ID, SECOND_ID].map((id) => ({ student_id: id, current_streak: 5, longest_streak: 12, last_homework_check: day(0) }));
    tables.daily_login_rewards = [STUDENT_ID, SECOND_ID].flatMap((id) => [0, 1].map((i) => ({ id: `${id}-${i}`, student_id: id, reward_date: dayOfWeek(i) })));
    tables.sessions = [{ id: "ses-s1", class_id: cls.id, date: day(1), start_time: "17:00:00", end_time: "18:30:00", status: "Scheduled", classes: { name: cls.name } }];
    tables.attendance = [{ id: "att-1", student_id: STUDENT_ID, status: "Present", date: day(-3) }];
    // Another child is the monitor: useClassMonitor reads `data?.student_id`, which is undefined (a react-query error) for a class with none.
    tables.class_monitors = [{ class_id: cls.id, student_id: "stu-someone-else" }];
    points[STUDENT_ID] = LEVEL(420);
    if (SCREEN === "student-srs") {
      // the deck finds the child by the signed-in account
      tables.students[0].linked_user_id = ME.userId;
      const due = new Date(Date.now() - 3_600_000).toISOString();
      const card = (id: string, front: string, back: string, hint: string | null) => ({ id, front, back, hint, ease_factor: 2.5, interval_days: 1, repetitions: 0, lapses: 0, student_id: STUDENT_ID, source: "vocab", due_date: due, suspended: false });
      tables.srs_cards = [card("c1", "a small animal that says meow", "cat", "It likes milk."), card("c2", "the colour of the sky on a sunny day", "blue", null), card("c3", "She ___ to school every day. (go)", "goes", "Third person.")];
    }
  }

  if (SCREEN === "family") {
    const kid1 = { id: "kid-khoi", full_name: "Lê Minh Khôi", avatar_url: null, is_active: true };
    const kid2 = { id: "kid-chau", full_name: "Lê Bảo Châu", avatar_url: null, is_active: true };
    tables.students = ONE_KID ? [kid1] : [kid1, kid2];
    tables.enrollments = [{ student_id: kid1.id, class_id: "cls-f1", end_date: null }];
    tables.lesson_overviews = [
      { class_id: "cls-f1", lesson_date: day(0), title: "Animals on the farm", summary: "We learned farm animal names and the sentence pattern 'It has got ...'. Khôi spoke clearly and helped a partner with spelling. Next lesson we will start a short farm story.", homework: "Draw your favourite farm animal and write two sentences: 'It is a ... It has got ...'." },
      { class_id: "cls-f1", lesson_date: day(-8), title: "Fruit and colours", summary: "Reviewed fruit words and colours.", homework: null },
    ];
    tables.attendance = [
      { student_id: kid1.id, status: "Present", date: day(-1) }, { student_id: kid1.id, status: "Present", date: day(-8) },
      { student_id: kid1.id, status: "Late", date: day(-15) }, { student_id: kid2.id, status: "Present", date: day(-2) },
    ];
    tables.student_points = [];
    tables.student_learning_profiles = [];
    if (NOTIF !== null) {
      tables.notifications = Array.from({ length: Number(NOTIF) || 0 }, (_, i) => ({
        id: `notif-${i}`, user_id: ME.userId, type: "announcement", title: "A note from the school", message: "Made-up message", is_read: false,
        created_at: new Date(Date.now() - i * 3_600_000).toISOString(), metadata: { student_id: "kid-khoi" },
      }));
    }
    tables.cefr_assessments = [{ student_id: kid1.id, level: "A1", assessed_at: day(-20), created_at: day(-20) }];
    points[kid1.id] = LEVEL(380);
    points[kid2.id] = LEVEL(95);
    errorOn = ["students"];
    emptyOn = ["students"];
  }

  if (SCREEN === "teacher" || SCREEN === "teacher-grid" || SCREEN === "teacher-attendance" || SCREEN === "teacher-drawer" || SCREEN === "teacher-grading" || SCREEN === "teacher-video" || SCREEN === "teacher-smart" || SCREEN === "teacher-payroll") {
    const teacherId = "teacher-ha";
    tables.teachers = [{ id: teacherId, user_id: ME.userId, full_name: ME.name, email: null, phone: null, avatar_url: null, is_active: true }];
    tables.teaching_assistants = [];
    const c1 = { id: "cls-t1", name: "Movers Sparks (Tue/Thu)" };
    const c2 = { id: "cls-t2", name: "Flyers Comets" };
    const c3 = { id: "cls-t3", name: "Kindy Sunbeams" };
    const mk = (id: string, c: { id: string; name: string }, a: number, b: number, status: string) => ({
      id, class_id: c.id, teacher_id: teacherId, date: day(0), start_time: hm(a), end_time: hm(b), status, classes: { id: c.id, name: c.name },
    });
    tables.sessions = [
      mk("ses-t-cancel", c3, -180, -120, "Canceled"),
      mk("ses-t-done", c1, -150, -90, "Scheduled"),
      mk("ses-t-now", c1, -30, 45, "Scheduled"),
      mk("ses-t-next", c2, 120, 195, "Scheduled"),
    ];
    tables.homeworks = [];
    tables.homework_submissions = [];
    tables.session_participants = [];
    tables.classes = [c1, c2, c3].map((c) => ({ ...c, default_teacher_id: teacherId, schedule_template: null }));
    const kids = [
      ["kid-an", "Nguyễn Minh Anh"], ["kid-binh", "Trần Gia Bình"], ["kid-chi", "Lê Bảo Chi"], ["kid-dung", "Phạm Hoàng Dũng"],
      ["kid-giang", "Vũ Hương Giang"], ["kid-hai", "Đỗ Quang Hải"], ["kid-khanh", "Bùi Ngọc Khánh"], ["kid-linh", "Hoàng Thuỳ Linh"],
    ] as const;
    tables.enrollments = kids.map(([id, name], i) => ({
      id: `enr-t-${i}`, student_id: id, class_id: c1.id, end_date: null, start_date: "2026-01-01", students: { id, full_name: name, avatar_url: null, is_active: true },
    }));
    // part-marked: the register for the lesson in progress
    tables.attendance = kids.slice(0, 4).map(([id], i) => ({ id: `att-t-${i}`, session_id: "ses-t-now", student_id: id, status: i === 3 ? "Absent" : "Present" }));
    tables.point_transactions = kids.slice(0, 3).map(([id], i) => ({ id: `pt-t-${i}`, student_id: id, class_id: c1.id, points: 5 * (i + 1), date: day(0), created_at: new Date().toISOString() }));
    errorOn = ["sessions"];
    emptyOn = ["sessions"];
  }

  let functions: Record<string, (body: any) => { data: any; error: any }> = {};
  if (SCREEN === "student-home") {
    const classmates = [
      ["stu-lan", "Phạm Ngọc Lan", 980, 40], ["stu-minh", "Đỗ Quang Minh", 870, 25], ["stu-hana", "Vũ Hana", 760, 30],
      [STUDENT_ID, ME.name, 420, 15], ["stu-son", "Lê Thanh Sơn", 390, 10], ["stu-mai", "Bùi Mai Chi", 310, 5],
    ] as const;
    const rows = classmates.map(([id, name, pts, gain], i) => ({ student_id: id, name, avatar_url: null, rank: i + 1, points: pts, total: pts, all_time: pts, gain_week: gain, is_self: id === STUDENT_ID }));
    functions["class-leaderboard"] = (body: any) => ({
      data: {
        board: { period: { kind: "all", from: "2025-09-01", to: "2026-08-31", label: "All time", term_id: null, basis: "total" }, class_id: body?.classId ?? "cls-1", rows, champions: [], climber: null, streak: null },
        currentStudentId: STUDENT_ID,
      },
      error: null,
    });
  }
  let rpcs: Record<string, (args: any) => any> = {};
  if (ROLE_OF[SCREEN] === "admin") {
    const admin = adminDb();
    Object.assign(tables, admin.tables);
    errorOn = admin.errorOn;
    emptyOn = admin.emptyOn;
    functions = admin.functions;
    rpcs = admin.rpcs;
  }


  // ---- Phase 7 round 2 screens (made-up names). &born=YYYY|none for the band, &state=empty for the empty variants ----
  if ((["student-lessons","student-lesson","student-reports","student-mywork","student-gallery","student-videos","student-record","student-resources","student-reader"] as string[]).includes(SCREEN)) {
    const cls1 = { id: "cls-1", name: "Starters Stars (Mon/Wed)" };
    const empty = STATE === "empty";
    const at = (n: number, hh = "10:00:00") => `${day(n)}T${hh}`;
    const mate = (id: string, name: string) => ({ id, name });

    // lessons
    const lessonRows = [
      ["les-1", "Animals on the farm", -1, "We learned farm animal names and the pattern 'It has got ...'. Phương Anh spoke clearly and helped a partner.", "Draw your favourite farm animal and write two sentences."],
      ["les-2", "Fruit and colours", -4, "Reviewed fruit words and colours with a guessing game.", null],
      ["les-3", "Bài học đặc biệt: Chúng ta cùng khám phá thế giới động vật hoang dã ở châu Phi và châu Á", -8, "A longer lesson with a Vietnamese title to check that long titles wrap.", null],
      ["les-4", "My family", -11, "We talked about family members and used 'This is my ...'.", null],
      ["les-5", "Numbers 1 to 20", -15, "Counting games and a number song.", "Count ten things at home and tell a grown-up in English."],
      ["les-6", "Hello and goodbye", -18, "Greetings, names and a circle game.", null],
    ] as const;
    tables.lesson_overviews = empty ? [] : lessonRows.map(([id, title, d, summary, homework], i) => ({
      id, class_id: cls1.id, title, lesson_date: day(d), summary, homework,
      materials: i % 2 === 0 ? [{ name: "Oxford Discover 2, Student Book", pages: "pp. 42-43" }, { name: "Worksheet: farm animals", pages: "" }] : [{ name: "Flashcards", pages: "set 4" }],
      transcript_id: id === "les-1" ? "tr-1" : null, classes: { name: cls1.name },
    }));
    tables.transcript_speaker_metrics = [{ id: "tsm-1", transcript_id: "tr-1", student_id: STUDENT_ID, utterance_count: 14, questions_asked: 3, participation_share: 0.22 }];
    tables.student_error_log = [
      { id: "err-1", source: "transcript", source_id: "tr-1", student_id: STUDENT_ID, error_text: "He go to school.", corrected_text: "He goes to school.", error_type: "grammar", cefr_topic: "present simple" },
      { id: "err-2", source: "transcript", source_id: "tr-1", student_id: STUDENT_ID, error_text: "I have two cat.", corrected_text: "I have two cats.", error_type: "grammar", cefr_topic: "plurals" },
    ];
    tables.point_transactions = [
      { id: "pt-1", student_id: STUDENT_ID, class_id: cls1.id, date: day(-1), points: 5, type: "participation", notes: "Great talking in pairs" },
      { id: "pt-2", student_id: STUDENT_ID, class_id: cls1.id, date: day(-1), points: 3, type: "homework", notes: "Homework handed in" },
      { id: "pt-3", student_id: STUDENT_ID, class_id: cls1.id, date: day(-1), points: -2, type: "behaviour", notes: "Talking while a classmate was reading" },
    ];
    tables.lesson_resources = [];

    // work: mine, approved
    const work = (id: string, extra: Record<string, unknown>) => ({
      id, class_id: cls1.id, student_id: STUDENT_ID, status: "approved", storage_path: null, external_url: null, is_teamwork: false, member_student_ids: [],
      teacher_notes: null, workflow: "general", ocr_text: null, approved_at: at(-1), created_at: at(-1), ...extra,
    });
    tables.student_work = empty ? [] : [
      work("sw-1", { storage_path: "farm-poster.png", teacher_notes: "A lovely poster, Phương Anh. I like the way you labelled every animal." }),
      work("sw-2", { external_url: "https://example.com/my-slides", workflow: "link", approved_at: at(-5), created_at: at(-5) }),
      work("sw-3", { storage_path: "team-model.jpg", is_teamwork: true, member_student_ids: [STUDENT_ID, "kid-bao"], teacher_notes: "A team model of the farm. Everyone spoke English while building it.", approved_at: at(-9), created_at: at(-9) }),
    ];
    tables.work_shares = empty ? [] : [{ id: "ws-1", source: "student_work", source_id: "sw-1", status: "approved" }];
    tables.homework_submissions = empty ? [] : [
      { id: "hs-1", student_id: STUDENT_ID, homework_id: "hw-g1", storage_key: "submissions/hw-g1/colours.jpg", file_name: "colours.jpg", submitted_at: at(-3), created_at: at(-3), homeworks: { title: "Colours worksheet", class_id: cls1.id } },
    ];

    // resources: shared with the class
    const res = (id: string, title: string, description: string, file_name: string | null, file_type: string | null, tags: string[]) => ({
      id, title, description, file_name, file_size: file_name ? 240_000 : null, file_type, storage_key: file_name ? "resources/" + file_name : null, external_url: file_name ? null : "https://example.com/games",
      thumbnail_url: null, visibility: "shared", blooms_levels: [], pyp_themes: [], vocab_tags: tags, uploaded_by: "teacher-ha", created_at: at(-2), updated_at: at(-2),
    });
    tables.resource_class_access = empty ? [] : [{ resource_id: "r-1", class_id: cls1.id }, { resource_id: "r-2", class_id: cls1.id }, { resource_id: "r-3", class_id: cls1.id }];
    tables.resources = empty ? [] : [
      res("r-1", "Farm animals word cards", "Printable cards with the farm animal words from Unit 3.", "farm-cards.pdf", "application/pdf", ["cow", "pig", "sheep"]),
      res("r-2", "Colours song", "A short song to practise colours at home.", null, null, ["red", "blue", "green"]),
      res("r-3", "Number games", "Three games for numbers 1 to 20.", "numbers.pdf", "application/pdf", ["one", "two", "three"]),
    ];

    // picture reader: one set, switched on for this class, three sentences
    const cell = (text: string, start: number, n: number) => ({ tokens: [start], start, text, kind: "entity" as const, concept: text, pictogram: 1000 + n, url: stubPicture(text) });
    const sentence = (text: string) => {
      const words = text.replace(/[.?]/g, "").split(" ");
      return { text, tokens: words, cells: words.map((w, i) => cell(w, i, i)), approved: day(-2) };
    };
    tables.language_support_set_classes = empty ? [] : [{ set_id: "set-1", class_id: cls1.id, active: true }];
    tables.language_support_sets = empty ? [] : [{ id: "set-1", owner_user_id: "teacher-ha", title: "At the farm", description: "Sentences about farm animals.", sentences: [sentence("The cow eats grass."), sentence("I see two sheep."), sentence("The pig is big.")], updated_at: at(-2) }];

    // videos: two video homeworks, the progress journey and the class wall
    const vids = [
      { id: "hw-vid-todo", title: "Say hello to your class (video)", due_date: day(-2), submission_type: "video", submission: null },
      { id: "hw-vid-sent", title: "My favourite animal (video)", due_date: day(-6), submission_type: "video", submission: { status: "submitted" } },
    ];
    if (SCREEN === "student-record") {
      homeworkRpc = {
        homeworks: empty ? [] : vids.map((v) => ({ id: v.id, title: v.title, due_date: v.due_date, body: "Record a short video.", class_id: cls1.id, classes: { name: cls1.name }, homework_files: [], submission_type: "video" })),
        submissions: empty ? [] : [{ id: "vsub-1", homework_id: "hw-vid-sent", status: "submitted", submitted_at: at(-6), grade: null }],
      };
      rpcs.get_video_homework_for_student = (a: any) => {
        const v = vids.find((x) => x.id === a.p_homework);
        return v ? { submission_type: "video", title: v.title, submission: v.submission } : null;
      };
    }
    if (SCREEN === "student-videos") {
      rpcs.get_video_progress = () => ({ videos: empty ? [] : [
        { video_submission_id: "vp-1", homework_title: "My favourite animal", date: day(-20), score: 62, criteria: [{ key: "clarity", label: "Speaking clearly", score: 3, max: 5 }], gaps: [{ error_type: "grammar", error_text: "He have a dog", corrected_text: "He has a dog", cefr_topic: "present simple" }] },
        { video_submission_id: "vp-2", homework_title: "My family", date: day(-9), score: 71, criteria: [{ key: "clarity", label: "Speaking clearly", score: 4, max: 5 }], gaps: [{ error_type: "grammar", error_text: "She have two brothers", corrected_text: "She has two brothers", cefr_topic: "present simple" }] },
        { video_submission_id: "vp-3", homework_title: "Say hello", date: day(-2), score: 78, criteria: [{ key: "clarity", label: "Speaking clearly", score: 4, max: 5 }], gaps: [] },
      ] });
      const wall = [
        { id: "v-1", student_name: "Hoàng", homework_title: "Say hello to your class", video_path: "videos/v1.mp4", poster_path: "videos/v1-poster.png", submitted_at: at(-2), base: 3, mine: false },
        { id: "v-2", student_name: "Trâm Anh", homework_title: "Say hello to your class", video_path: "videos/v2.mp4", poster_path: "videos/v2-poster.png", submitted_at: at(-2), base: 5, mine: true },
        { id: "v-3", student_name: "Lan", homework_title: "My favourite animal", video_path: "videos/v3.mp4", poster_path: "videos/v3-poster.png", submitted_at: at(-6), base: 1, mine: false },
      ];
      rpcs.get_class_video_wall = () => empty ? [] : wall.map((w) => ({ id: w.id, student_name: w.student_name, homework_title: w.homework_title, video_path: w.video_path, poster_path: w.poster_path, submitted_at: w.submitted_at, hearts: w.base + (heartState.has(w.id) ? 1 : 0), hearted: heartState.has(w.id), mine: w.mine }));
      rpcs.toggle_video_heart = (a: any) => { if (heartState.has(a.p_video)) heartState.delete(a.p_video); else heartState.add(a.p_video); return null; };
    }

    // the class gallery: three classmates' pieces, first names only
    rpcs.class_work_gallery = () => empty ? [] : [
      { share_id: "sh-1", class_id: cls1.id, class_name: cls1.name, title: "Farm poster", kind: "file", file_name: "poster-a.png", external_url: null, students: [mate("kid-an", "Minh")], work_at: at(-2), is_teamwork: false },
      { share_id: "sh-2", class_id: cls1.id, class_name: cls1.name, title: "Our slides", kind: "link", file_name: null, external_url: "https://example.com/class-slides", students: [mate("kid-chi", "Chi")], work_at: at(-4), is_teamwork: false },
      { share_id: "sh-3", class_id: cls1.id, class_name: cls1.name, title: "Team model", kind: "file", file_name: "model-b.jpg", external_url: null, students: [mate("kid-hai", "Hải"), mate("kid-giang", "Giang")], work_at: at(-7), is_teamwork: true },
    ];

    // lesson reports: two approved, one where the child came a little late
    const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    rpcs.get_lesson_reports_for_student = () => empty ? [] : [
      {
        report_id: uuid(1), session_id: uuid(11), session_date: day(-1), start_time: "17:30:00", class_name: cls1.name, review_homework_id: null, photos: [],
        class_part: {
          lesson: { title: "Animals on the farm", title_vi: "Các con vật ở nông trại", summary: "We learned the names of farm animals and the pattern 'It has got ...'.", summary_vi: "Chúng ta học tên các con vật ở nông trại và mẫu câu 'It has got ...'." },
          objectives: [{ text: "Name six farm animals", text_vi: "Gọi tên sáu con vật ở nông trại", met: "yes" }, { text: "Say 'It has got ...'", text_vi: "Nói 'It has got ...'", met: "partly" }],
          taught: [{ topic: "Farm animals", detail: "cow, pig, sheep, horse, hen, duck", detail_vi: "bò, lợn, cừu, ngựa, gà mái, vịt" }],
          words: [{ en: "sheep", vi: "con cừu", example: "The sheep is white." }, { en: "duck", vi: "con vịt", example: "The duck can swim." }],
          structures: [{ pattern: "It has got ...", example: "It has got four legs." }],
          activities: [{ name: "Guess the animal", description: "Pairs describe an animal and the partner guesses.", description_vi: "Từng cặp mô tả con vật để bạn đoán." }],
          class_focus: [{ en: "Speaking in full sentences", vi: "Nói thành câu đầy đủ" }],
          parents: { tips: [{ en: "Ask your child to show you three farm animals in a picture book.", vi: "Hãy nhờ con chỉ ba con vật ở nông trại trong một cuốn sách tranh." }], ask_your_child: [{ en: "Which animal has got four legs?", vi: "Con vật nào có bốn chân?" }], next_lesson: { en: "Next lesson: my family.", vi: "Buổi sau: gia đình của em." } },
          homework: [{ homework_id: uuid(21), title: "Draw your favourite farm animal", due_date: day(2) }],
        },
        part: { highlight: "Spoke clearly and helped a partner with spelling.", highlight_vi: "Nói rõ ràng và giúp bạn đánh vần.", focus_next: "Add one more detail to each sentence.", focus_next_vi: "Thêm một chi tiết nữa vào mỗi câu.", attendance: "Present", points: 8, work_ids: [], teacher_comment: "Phương Anh is growing in confidence.", teacher_comment_vi: "Phương Anh ngày càng tự tin hơn." },
      },
      {
        report_id: uuid(2), session_id: uuid(12), session_date: day(-4), start_time: "17:30:00", class_name: cls1.name, review_homework_id: null, photos: [],
        class_part: {
          lesson: { title: "Fruit and colours", title_vi: "Trái cây và màu sắc", summary: "Reviewed fruit words and colours with a guessing game.", summary_vi: "Ôn từ về trái cây và màu sắc bằng trò chơi đoán." },
          objectives: [{ text: "Say the colour of each fruit", text_vi: "Nói màu của từng loại trái cây", met: "yes" }],
          taught: [], words: [{ en: "banana", vi: "quả chuối", example: "A banana is yellow." }], structures: [], activities: [], class_focus: [],
          parents: { tips: [], ask_your_child: [{ en: "What colour is a banana?", vi: "Quả chuối màu gì?" }], next_lesson: null },
          homework: [],
        },
        part: { highlight: "Joined the guessing game with a big smile.", highlight_vi: "Tham gia trò chơi đoán với nụ cười rạng rỡ.", focus_next: null, focus_next_vi: null, attendance: "Late", points: 5, work_ids: [], teacher_comment: null, teacher_comment_vi: null },
      },
    ];
  }

  // ---- Phase 3 screens (made-up names) ----
  const nowIso = new Date().toISOString();
  if (SCREEN === "teacher-grading") {
    const hw = { id: "hw-g1", title: "Unit 6 reading log", class_id: "cls-t1", classes: { name: "Movers Sparks (Tue/Thu)" } };
    const sub = (id: string, student: string, name: string, extra: Record<string, unknown>) => ({
      id, homework_id: hw.id, student_id: student, submitted_at: nowIso, grade: null, teacher_feedback: null, graded_at: null, submission_text: "I read the story and drew the ending.",
      storage_key: null, file_name: null, status: "submitted", students: { full_name: name }, homeworks: hw, ...extra,
    });
    // &waiting=1 leaves one handed in and ungraded, so the last-one Seal is one grade away
    const WAITING = Number(params.get("waiting") ?? 3);
    const waiting = [["kid-an", "Nguyễn Minh Anh"], ["kid-binh", "Trần Gia Bình"], ["kid-chi", "Lê Bảo Chi"]].slice(0, WAITING);
    tables.homework_submissions = [
      ...waiting.map(([id, name], i) => sub("sub-w" + i, id, name, {})),
      sub("sub-g1", "kid-dung", "Phạm Hoàng Dũng", { grade: "A", graded_at: nowIso, status: "graded", teacher_feedback: "Well read." }),
      sub("sub-g2", "kid-giang", "Vũ Hương Giang", { grade: "B+", graded_at: nowIso, status: "graded" }),
      sub("sub-n1", "kid-hai", "Đỗ Quang Hải", { submitted_at: null, submission_text: null, status: "not_submitted" }),
    ];
  }
  if (SCREEN === "teacher-video") {
    tables.video_submissions = [{
      id: "vs-1", homework_id: "hw-v1", student_id: "kid-an", status: "ready", attempt: 1, video_path: "incoming/preview.mp4", frame_paths: [], duration_seconds: 48,
      video_mime: "video/mp4", submitted_at: nowIso, updated_at: nowIso, pronunciation: null,
      students: { full_name: "Nguyễn Minh Anh" }, homeworks: { id: "hw-v1", title: "My family video", body: null, due_date: null },
    }];
    tables.video_analyses = [{
      id: "va-1", video_submission_id: "vs-1", criteria_scores: [], suggested_grade: "B", feedback_student: "You spoke clearly and told us about your family. Try to add one more detail next time.",
      feedback_parent: "Minh Anh spoke clearly about her family.", gaps: [], updated_at: nowIso, approved_at: null, transcript_segments: [], visual_notes: null, teacher_attention: [],
    }];
    tables.video_homework_rubrics = [];
  }
  if (SCREEN === "teacher-smart") {
    tables.classes = [{ id: "cls-t1", name: "Movers Sparks (Tue/Thu)", default_teacher_id: "teacher-ha", schedule_template: null, is_active: true }, { id: "cls-t2", name: "Flyers Comets", default_teacher_id: "teacher-ha", schedule_template: null, is_active: true }];
    // &queue=N review items waiting (default 2)
    const N = Number(params.get("queue") ?? 2);
    tables.student_work = Array.from({ length: N }, (_, i) => ({
      id: "sw-" + i, uploaded_by: ME.userId, class_id: "cls-t1", student_id: i === 0 ? "kid-an" : "kid-binh", workflow: "general", status: "needs_review",
      storage_path: "incoming/p" + i + ".jpg", original_filename: "page-" + (i + 1) + ".jpg", mime_type: "image/jpeg", created_at: nowIso, teacher_notes: null, is_teamwork: false, member_student_ids: [],
    }));
  }
  if (SCREEN === "teacher-payroll") {
    // The open month is the current one; any earlier month answers as closed.
    const mk = (month: string, closed: boolean) => {
      const start = new Date(month + "-01T12:00:00");
      const days = [2, 4, 9, 11, 16, 18, 23, 25];
      const mkDay = (d: number) => month + "-" + String(d).padStart(2, "0");
      const sessions = days.map((d, i) => ({
        id: "ps-" + month + "-" + i, date: mkDay(d), start_time: "17:30:00", end_time: "19:00:00", status: "Held", class_id: "cls-t1", classes: { name: i % 2 ? "Flyers Comets" : "Movers Sparks (Tue/Thu)" },
        minutes: 90, amount: 270_000, payRateType: "hourly", rateVnd: 180_000,
      }));
      const total = sessions.length * 270_000;
      const row: any = {
        teacherId: "teacher-ha", staffType: "teacher", payRateType: "hourly", hourlyRate: 180_000, sessionsCountActual: sessions.length, sessionsCountProjected: sessions.length + 2,
        totalHoursActual: sessions.length * 1.5, totalMinutesActual: sessions.length * 90, totalAmountActual: total, totalAmountProjected: total + 540_000,
        sessionDetailsActual: sessions, sessionDetailsProjected: [], lostIncome: { sessionsCount: 1, totalMinutes: 90, totalAmount: 270_000, quantityLabel: "1.5 h" },
        ...(closed ? { live: { totalAmountActual: total, sessionsCountActual: sessions.length }, liveTotalAmountActual: total } : {}),
      };
      void start;
      return { locked: closed, payrollData: [row] };
    };
    const current = new Date().toISOString().slice(0, 7);
    functions["calculate-payroll"] = (body: any) => ({ data: mk(body?.month ?? current, (body?.month ?? current) < current), error: null });
  }

  return { tables, errorOn, emptyOn, homeworkRpc, points, functions, rpcs };
}
