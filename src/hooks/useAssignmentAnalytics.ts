import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";

export interface AssignmentRecord {
  id: string;
  title: string;
  due_date: string | null;
  class_id: string;
  /** The children it was set for (homeworks.student_ids); null = the whole class. */
  forIds?: string[] | null;
  className: string;
  teacherId: string | null;
  submissions: {
    id: string;
    status: string;
    student_id: string;
    submitted_at: string | null;
    graded_at: string | null;
    grade: string | null;
  }[];
}

export interface GlobalStats {
  totalAssignments: number;
  totalExpectedSubmissions: number;
  totalSubmissions: number;
  submissionRate: number;
  gradedCount: number;
  gradedRate: number;
  pendingGrading: number;
  avgGradingDays: number | null;
}

export interface ClassStats {
  classId: string;
  className: string;
  teacherId: string | null;
  teacherName: string;
  assignmentCount: number;
  expectedSubmissions: number;
  actualSubmissions: number;
  submissionRate: number;
  gradedCount: number;
  gradingRate: number;
  assignments: AssignmentRecord[];
}

export interface TeacherStats {
  teacherId: string;
  teacherName: string;
  classCount: number;
  classIds: string[];
  classNames: string[];
  assignmentCount: number;
  totalSubmissions: number;
  gradedCount: number;
  gradingRate: number;
  avgTurnaroundDays: number | null;
  assignments: AssignmentRecord[];
}

export interface StudentStats {
  studentId: string;
  studentName: string;
  assignedCount: number;
  submittedCount: number;
  gradedCount: number;
  submissionRate: number;
  grades: string[];
  classIds: string[];
}

export interface PointBucket {
  range: string;
  count: number;
  sortKey: number;
}

export function useAssignmentAnalytics() {
  return useQuery({
    queryKey: ["assignment-analytics"],
    queryFn: async () => {
      const [homeworksRes, enrollmentsRes, teachersRes, studentsRes, pointTxRes] = await Promise.all([
        supabase
          .from("homeworks")
          .select(`*, classes!inner(name, default_teacher_id), homework_submissions(id, status, student_id, submitted_at, graded_at, grade)`)
          .order("due_date", { ascending: false }),
        supabase
          .from("enrollments")
          .select("student_id, class_id")
          .or("end_date.is.null,end_date.gte." + dayjs().subtract(6, "month").format("YYYY-MM-DD")),
        supabase.from("teachers").select("id, full_name, user_id").eq("is_active", true),
        supabase.from("students").select("id, full_name").eq("is_active", true),
        supabase.from("point_transactions").select("points, student_id, homework_id").eq("type", "homework"),
      ]);

      const homeworks = homeworksRes.data || [];
      const enrollments = enrollmentsRes.data || [];
      const teachers = teachersRes.data || [];
      const students = studentsRes.data || [];
      const pointTxs = pointTxRes.data || [];

      const teacherMap = new Map(teachers.map((t) => [t.id, t.full_name]));
      const studentMap = new Map(students.map((s) => [s.id, s.full_name]));

      // Point buckets (groups of 10)
      const bucketCounts = new Map<number, number>();
      for (let i = 0; i <= 9; i++) bucketCounts.set(i, 0);
      for (const tx of pointTxs) {
        if (tx.points == null || tx.points < 0) continue;
        const bucket = Math.min(Math.floor(tx.points / 10), 9);
        bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
      }
      const pointBuckets: PointBucket[] = [];
      for (let i = 9; i >= 0; i--) {
        const lo = i * 10;
        const hi = i === 9 ? 100 : lo + 9;
        pointBuckets.push({ range: `${hi}-${lo}`, count: bucketCounts.get(i) || 0, sortKey: i });
      }

      // Build homework→points map for student detail
      const homeworkPointsMap = new Map<string, Map<string, number>>();
      for (const tx of pointTxs) {
        if (!tx.homework_id || !tx.student_id) continue;
        const key = `${tx.student_id}__${tx.homework_id}`;
        if (!homeworkPointsMap.has(tx.student_id)) homeworkPointsMap.set(tx.student_id, new Map());
        homeworkPointsMap.get(tx.student_id)!.set(tx.homework_id, (homeworkPointsMap.get(tx.student_id)!.get(tx.homework_id) || 0) + tx.points);
      }

      // enrolled students per class
      const enrolledPerClass = new Map<string, Set<string>>();
      for (const e of enrollments) {
        if (!enrolledPerClass.has(e.class_id)) enrolledPerClass.set(e.class_id, new Set());
        enrolledPerClass.get(e.class_id)!.add(e.student_id);
      }

      // Build assignment records
      const assignments: AssignmentRecord[] = homeworks.map((hw: any) => ({
        id: hw.id,
        title: hw.title,
        due_date: hw.due_date,
        class_id: hw.class_id,
        forIds: Array.isArray(hw.student_ids) ? hw.student_ids : null,
        className: hw.classes?.name || "Unknown",
        teacherId: hw.classes?.default_teacher_id || null,
        submissions: (hw.homework_submissions || []).map((s: any) => ({
          id: s.id,
          status: s.status,
          student_id: s.student_id,
          submitted_at: s.submitted_at,
          graded_at: s.graded_at,
          grade: s.grade,
        })),
      }));

      // Global stats
      let totalExpected = 0;
      let totalSubmitted = 0;
      let totalGraded = 0;
      let turnaroundDays: number[] = [];

      for (const a of assignments) {
        const enrolled = a.forIds ? a.forIds.length : enrolledPerClass.get(a.class_id)?.size || 0;
        totalExpected += enrolled;
        const submitted = a.submissions.filter((s) => s.status === "submitted" || s.status === "graded");
        totalSubmitted += submitted.length;
        const graded = a.submissions.filter((s) => s.status === "graded");
        totalGraded += graded.length;
        for (const s of graded) {
          if (s.submitted_at && s.graded_at) {
            const days = dayjs(s.graded_at).diff(dayjs(s.submitted_at), "day");
            turnaroundDays.push(days);
          }
        }
      }

      const global: GlobalStats = {
        totalAssignments: assignments.length,
        totalExpectedSubmissions: totalExpected,
        totalSubmissions: totalSubmitted,
        submissionRate: totalExpected > 0 ? (totalSubmitted / totalExpected) * 100 : 0,
        gradedCount: totalGraded,
        gradedRate: totalSubmitted > 0 ? (totalGraded / totalSubmitted) * 100 : 0,
        pendingGrading: totalSubmitted - totalGraded,
        avgGradingDays: turnaroundDays.length > 0 ? turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length : null,
      };

      // By class
      const classMap = new Map<string, ClassStats>();
      for (const a of assignments) {
        if (!classMap.has(a.class_id)) {
          classMap.set(a.class_id, {
            classId: a.class_id,
            className: a.className,
            teacherId: a.teacherId,
            teacherName: a.teacherId ? teacherMap.get(a.teacherId) || "Unknown" : "Unassigned",
            assignmentCount: 0,
            expectedSubmissions: 0,
            actualSubmissions: 0,
            submissionRate: 0,
            gradedCount: 0,
            gradingRate: 0,
            assignments: [],
          });
        }
        const cs = classMap.get(a.class_id)!;
        cs.assignmentCount++;
        const enrolled = a.forIds ? a.forIds.length : enrolledPerClass.get(a.class_id)?.size || 0;
        cs.expectedSubmissions += enrolled;
        const subs = a.submissions.filter((s) => s.status === "submitted" || s.status === "graded");
        cs.actualSubmissions += subs.length;
        cs.gradedCount += a.submissions.filter((s) => s.status === "graded").length;
        cs.assignments.push(a);
      }
      for (const cs of classMap.values()) {
        cs.submissionRate = cs.expectedSubmissions > 0 ? (cs.actualSubmissions / cs.expectedSubmissions) * 100 : 0;
        cs.gradingRate = cs.actualSubmissions > 0 ? (cs.gradedCount / cs.actualSubmissions) * 100 : 0;
      }

      // By teacher
      const teacherStatsMap = new Map<string, TeacherStats>();
      for (const cs of classMap.values()) {
        const tid = cs.teacherId || "unassigned";
        if (!teacherStatsMap.has(tid)) {
          teacherStatsMap.set(tid, {
            teacherId: tid,
            teacherName: cs.teacherName,
            classCount: 0,
            classIds: [],
            classNames: [],
            assignmentCount: 0,
            totalSubmissions: 0,
            gradedCount: 0,
            gradingRate: 0,
            avgTurnaroundDays: null,
            assignments: [],
          });
        }
        const ts = teacherStatsMap.get(tid)!;
        ts.classCount++;
        ts.classIds.push(cs.classId);
        ts.classNames.push(cs.className);
        ts.assignmentCount += cs.assignmentCount;
        ts.totalSubmissions += cs.actualSubmissions;
        ts.gradedCount += cs.gradedCount;
        ts.assignments.push(...cs.assignments);
      }
      for (const ts of teacherStatsMap.values()) {
        ts.gradingRate = ts.totalSubmissions > 0 ? (ts.gradedCount / ts.totalSubmissions) * 100 : 0;
        const days: number[] = [];
        for (const a of ts.assignments) {
          for (const s of a.submissions.filter((s) => s.status === "graded" && s.submitted_at && s.graded_at)) {
            days.push(dayjs(s.graded_at!).diff(dayjs(s.submitted_at!), "day"));
          }
        }
        ts.avgTurnaroundDays = days.length > 0 ? days.reduce((a, b) => a + b, 0) / days.length : null;
      }

      // By student
      const studentStatsMap = new Map<string, StudentStats>();
      const studentClasses = new Map<string, Set<string>>();
      for (const e of enrollments) {
        if (!studentClasses.has(e.student_id)) studentClasses.set(e.student_id, new Set());
        studentClasses.get(e.student_id)!.add(e.class_id);
      }
      for (const [sid, classes] of studentClasses) {
        const name = studentMap.get(sid) || "Unknown";
        const relevantAssignments = assignments.filter((a) => classes.has(a.class_id));
        const submitted = relevantAssignments.flatMap((a) =>
          a.submissions.filter((s) => s.student_id === sid && (s.status === "submitted" || s.status === "graded"))
        );
        const graded = relevantAssignments.flatMap((a) =>
          a.submissions.filter((s) => s.student_id === sid && s.status === "graded")
        );
        studentStatsMap.set(sid, {
          studentId: sid,
          studentName: name,
          assignedCount: relevantAssignments.length,
          submittedCount: submitted.length,
          gradedCount: graded.length,
          submissionRate: relevantAssignments.length > 0 ? (submitted.length / relevantAssignments.length) * 100 : 0,
          grades: graded.map((s) => s.grade).filter(Boolean) as string[],
          classIds: [...classes],
        });
      }

      // Grade distribution (kept for backward compat)
      const allGrades: string[] = [];
      for (const a of assignments) {
        for (const s of a.submissions) {
          if (s.grade) allGrades.push(s.grade);
        }
      }
      const gradeDistribution = new Map<string, number>();
      for (const g of allGrades) {
        gradeDistribution.set(g, (gradeDistribution.get(g) || 0) + 1);
      }

      return {
        global,
        byClass: classMap,
        byTeacher: teacherStatsMap,
        byStudent: studentStatsMap,
        assignments,
        enrolledPerClass,
        gradeDistribution,
        pointBuckets,
        homeworkPointsMap,
        studentMap,
        teacherMap,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
