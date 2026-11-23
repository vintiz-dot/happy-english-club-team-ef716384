// Made-up people and records for the preview. Nobody here is real.
// Dates are relative to today so the screens always look "current".
import { adminDb } from "./adminFixtures";

export type Screen =
  | "student-home" | "student-homework" | "family" | "teacher" | "teacher-grid" | "teacher-attendance"
  | "admin-overview" | "admin-tuition" | "admin-payroll" | "admin-dialogs";
export type State = "ok" | "error" | "empty";

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
  family: "family",
  teacher: "teacher",
  "teacher-grid": "teacher",
  "teacher-attendance": "teacher",
  "admin-overview": "admin",
  "admin-tuition": "admin",
  "admin-payroll": "admin",
  "admin-dialogs": "admin",
};
export const PATH_OF: Record<Screen, string> = {
  "student-home": "/student/dashboard",
  "student-homework": "/student/assignments",
  family: "/family/dashboard",
  teacher: "/teacher/dashboard",
  "teacher-grid": "/teacher/grid",
  "teacher-attendance": "/teacher/attendance-hub",
  "admin-overview": "/admin",
  "admin-tuition": "/tuition",
  "admin-payroll": "/admin",
  "admin-dialogs": "/tuition",
};

export const STUDENT_ID = "stu-quynh-tram-anh";
export const ME = {
  userId: "user-preview-1",
  name: ({ "student-home": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", "student-homework": "Nguyễn Hoàng Phương Quỳnh Trâm Anh", family: "Phụ huynh Lê", teacher: "Cô Trần Thu Hà", "teacher-grid": "Cô Trần Thu Hà", "teacher-attendance": "Cô Trần Thu Hà" } as Record<string, string>)[SCREEN] ?? "Cô Nguyễn Thị Lan (admin)",
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

  if (SCREEN === "student-home" || SCREEN === "student-homework") {
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
    tables.students = [{
      id: STUDENT_ID, full_name: ME.name, email: null, phone: null, date_of_birth: BORN,
      avatar_url: null, is_active: true, status_message: null, family: { name: "Nguyễn family" }, updated_at: new Date().toISOString(),
      linked_user_id: SECOND ? ME.userId : undefined,
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

  if (SCREEN === "teacher" || SCREEN === "teacher-grid" || SCREEN === "teacher-attendance") {
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

  return { tables, errorOn, emptyOn, homeworkRpc, points, functions, rpcs };
}
