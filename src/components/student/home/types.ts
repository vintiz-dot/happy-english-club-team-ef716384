import type { HomeworkGroups, HomeworkItem } from "@/lib/studentHomework";

/**
 * Everything a band's home reads. StudentDashboard builds it from the hooks it already runs; the homes only
 * render it (docs/EXPERIENCE_DESIGN_BRIEF.md Part G: same data, new form). Nothing here is computed, priced or
 * ranked in the browser: every figure arrives as the existing hooks and the server gave it.
 */
export interface HomeData {
  studentId: string;
  fullName: string;
  firstName: string;
  avatarUrl?: string | null;
  statusMessage?: string | null;

  level: number;
  /** the level figure has been read (false while the points are loading: level is then a placeholder) */
  levelReady?: boolean;
  levelTitle: string;
  currentXp: number;
  nextLevelXp: number;
  progress: number;
  totalXp: number;

  streak: number;
  longestStreak: number;
  /** Monday to Sunday: a day the child's homework check was rewarded */
  weekActivity: boolean[];

  homework: {
    loading: boolean;
    error: boolean;
    fetching: boolean;
    ready: boolean;
    todo: number;
    next: HomeworkItem | null;
    pending: HomeworkItem[];
    groups: HomeworkGroups;
    all: HomeworkItem[];
  };
  /** the next 7 days of lessons, soonest first */
  sessions: any[];
  enrolledClasses: any[];
  isMonitor: boolean;

  challenges: any[];
  achievement: {
    homeworkCompleted: number;
    perfectWeeks: number;
    classesAttended: number;
  };
  featuredBadgeId: string | null;
  onFeatureBadge: (id: string | null) => void;

  onOpenHomework: (hw: HomeworkItem) => void;
  onRetryHomework: () => void;
  onEditProfile: () => void;
  classPoints: (classId: string) => number;
}
