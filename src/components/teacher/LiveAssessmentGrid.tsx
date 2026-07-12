import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadialSkillMenu } from "./RadialSkillMenu";
import { PointFeedbackAnimation } from "./PointFeedbackAnimation";
import { ReadingTheoryScoreEntry } from "@/components/shared/ReadingTheoryScoreEntry";
import { CheckSquare, Square, Users, X } from "lucide-react";
import { toast } from "sonner";
import { soundManager } from "@/lib/soundManager";
import { awardPoints, getTodaySession } from "@/lib/pointsHelper";
import { SKILL_ICONS } from "@/lib/skillConfig";
import { LucideIcon, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssessmentStudentCard } from "./AssessmentStudentCard";
import { motion, AnimatePresence } from "framer-motion";

interface LiveAssessmentGridProps {
  classId: string;
  sessionId: string;
}

type AttendanceStatus = "Present" | "Absent" | "Excused" | null;

interface StudentCard {
  id: string;
  full_name: string;
  avatar_url: string | null;
  todayPoints: number;
  attendanceStatus: AttendanceStatus;
}

interface FeedbackItem {
  id: string;
  points: number;
  icon: LucideIcon;
  color: string;
  count?: number;
  studentId: string;
}

export function LiveAssessmentGrid({ classId, sessionId }: LiveAssessmentGridProps) {
  const queryClient = useQueryClient();
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [activeStudent, setActiveStudent] = useState<StudentCard | null>(null);
  const [readingTheoryOpen, setReadingTheoryOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackItem[]>>({});

  const today = dayjs().format("YYYY-MM-DD");

  // Fetch enrolled students with attendance status
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["live-assessment-students", classId, sessionId, today],
    queryFn: async () => {
      // Get enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          students!inner(id, full_name, avatar_url)
        `)
        .eq("class_id", classId)
        .or(`end_date.is.null,end_date.gt.${today}`);

      if (enrollError) throw enrollError;

      // Get today's points for each student
      const studentIds = enrollments?.map(e => {
        const student = Array.isArray(e.students) ? e.students[0] : e.students;
        return student?.id;
      }).filter(Boolean) || [];

      // Fetch attendance for this session
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("session_id", sessionId)
        .in("student_id", studentIds);

      const attendanceMap = new Map<string, AttendanceStatus>();
      attendanceData?.forEach(a => {
        attendanceMap.set(a.student_id, a.status as AttendanceStatus);
      });

      const { data: todayPoints } = await supabase
        .from("point_transactions")
        .select("student_id, points")
        .eq("class_id", classId)
        .eq("date", today)
        .in("student_id", studentIds);

      // Calculate today's points per student
      const pointsMap = new Map<string, number>();
      todayPoints?.forEach(pt => {
        pointsMap.set(pt.student_id, (pointsMap.get(pt.student_id) || 0) + pt.points);
      });

      // Deduplicate by student_id
      const seen = new Set<string>();
      return (enrollments || []).reduce((acc: StudentCard[], e) => {
        const student = Array.isArray(e.students) ? e.students[0] : e.students;
        if (student && !seen.has(student.id)) {
          seen.add(student.id);
          acc.push({
            id: student.id,
            full_name: student.full_name,
            avatar_url: student.avatar_url,
            todayPoints: pointsMap.get(student.id) || 0,
            attendanceStatus: attendanceMap.get(student.id) || null,
          });
        }
        return acc;
      }, []);
    },
  });

  // Helper to check if student is absent/excused
  const isStudentUnavailable = (status: AttendanceStatus) => 
    status === "Absent" || status === "Excused";
  
  // Get only available students for bulk operations
  const availableStudents = students.filter(s => !isStudentUnavailable(s.attendanceStatus));

  // Mutation for awarding skills using shared helper
  const awardSkillMutation = useMutation({
    mutationFn: async ({ 
      studentIds, 
      skill, 
      points, 
      subTag 
    }: { 
      studentIds: string[]; 
      skill: string; 
      points: number; 
      subTag?: string;
    }) => {
      // Get active session if exists
      const sessionId = await getTodaySession(classId);
      
      await awardPoints({
        studentIds,
        classId,
        skill,
        points,
        subTag,
        sessionId: sessionId || undefined,
      });

      return { studentIds, skill, points };
    },
    onSuccess: ({ studentIds, skill, points }) => {
      queryClient.invalidateQueries({ queryKey: ["live-assessment-students", classId] });
      queryClient.invalidateQueries({ queryKey: ["class-leaderboard", classId] });
      queryClient.invalidateQueries({ queryKey: ["student-points"] });
      
      // Play sound
      if (points > 0) {
        soundManager.play("success");
      } else {
        soundManager.play("error");
      }

      // Show feedback animation for each student
      const icon = SKILL_ICONS[skill] || MessageSquare;
      studentIds.forEach(studentId => {
        const feedbackId = `${studentId}-${Date.now()}`;
        setFeedbacks(prev => ({
          ...prev,
          [studentId]: [
            ...(prev[studentId] || []),
            {
              id: feedbackId,
              points,
              icon,
              color: points > 0 ? "green" : "red",
              count: studentIds.length > 1 ? studentIds.length : undefined,
              studentId,
            },
          ],
        }));
      });

      // Clear selection after bulk action
      if (studentIds.length > 1) {
        setSelectedStudents(new Set());
      }
    },
    onError: (error) => {
      console.error("Failed to award skill:", error);
      toast.error("Failed to award skill");
      soundManager.play("error");
    },
  });

  const handleSkillTap = useCallback((studentId: string, skill: string, points: number, subTag?: string) => {
    const targetIds = bulkMode && selectedStudents.size > 0 
      ? Array.from(selectedStudents)
      : [studentId];

    awardSkillMutation.mutate({ studentIds: targetIds, skill, points, subTag });
    setActiveStudent(null);
  }, [bulkMode, selectedStudents, awardSkillMutation]);

  const toggleStudent = (studentId: string) => {
    // Find the student and check if they're unavailable
    const student = students.find(s => s.id === studentId);
    if (student && isStudentUnavailable(student.attendanceStatus)) return;
    
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedStudents(new Set(availableStudents.map(s => s.id)));
  const selectNone = () => setSelectedStudents(new Set());

  const removeFeedback = useCallback((studentId: string, feedbackId: string) => {
    setFeedbacks(prev => ({
      ...prev,
      [studentId]: (prev[studentId] || []).filter(f => f.id !== feedbackId),
    }));
  }, []);

  const handleSelect = useCallback((id: string) => {
    const s = students.find((x) => x.id === id);
    if (s) setActiveStudent(s);
  }, [students]);

  const handleToggle = useCallback((id: string) => {
    toggleStudent(id);
  }, [students]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading students...</div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No students enrolled in this class</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Selection Controls */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-muted/40 to-muted/20 border border-border/30 backdrop-blur-sm">
        <Button
          variant={bulkMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setBulkMode(!bulkMode);
            if (!bulkMode) selectNone();
          }}
          className={cn(
            "gap-2 rounded-xl transition-all",
            bulkMode && "shadow-md"
          )}
        >
          {bulkMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          Bulk Mode
        </Button>
        
        {bulkMode && (
          <>
            <Button variant="ghost" size="sm" onClick={selectAll} className="rounded-xl text-xs">
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={selectNone} className="rounded-xl text-xs">
              Clear
            </Button>
            {selectedStudents.size > 0 && (
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {selectedStudents.size} selected
              </span>
            )}
          </>
        )}
      </div>

      {/* Student Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {students.map((student) => (
          <AssessmentStudentCard
            key={student.id}
            studentId={student.id}
            fullName={student.full_name}
            avatarUrl={student.avatar_url}
            todayPoints={student.todayPoints}
            attendanceStatus={student.attendanceStatus}
            bulkMode={bulkMode}
            isSelected={selectedStudents.has(student.id)}
            feedbacks={feedbacks[student.id] || []}
            onSelect={handleSelect}
            onToggle={handleToggle}
            onFeedbackComplete={removeFeedback}
          />
        ))}
      </div>

      {/* Smart-positioning skill panel — non-modal, never blocks student cards.
          Auto-anchors to a safe edge of the viewport based on which half the
          active student is in, so the panel never covers a clickable student. */}
      <SmartSkillPanel
        classId={classId}
        activeStudent={activeStudent}
        onClose={() => setActiveStudent(null)}
        onSkillTap={(skill, points, subTag) =>
          activeStudent && handleSkillTap(activeStudent.id, skill, points, subTag)
        }
        onReadingTheoryClick={() => setReadingTheoryOpen(true)}
        bulkActive={bulkMode && selectedStudents.size > 0}
      />

      {/* Reading Theory Score Entry Dialog */}
      <ReadingTheoryScoreEntry
        classId={classId}
        open={readingTheoryOpen}
        onOpenChange={setReadingTheoryOpen}
      />

      {/* Bulk Action Bar */}
      {bulkMode && selectedStudents.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <RadialSkillMenu
            onSkillTap={(skill, points, subTag) => {
              const targetIds = Array.from(selectedStudents);
              awardSkillMutation.mutate({ studentIds: targetIds, skill, points, subTag });
            }}
            onClose={() => {}}
            onReadingTheoryClick={() => setReadingTheoryOpen(true)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Non-modal floating panel for awarding skills to a single student.
 * Positions itself in the half of the viewport opposite the active student card,
 * so the panel never sits on top of any clickable student. Allows the teacher
 * to tap another student card without dismissing first — activeStudent just
 * switches and the panel re-positions itself.
 */
interface SmartSkillPanelProps {
  classId: string;
  activeStudent: StudentCard | null;
  onClose: () => void;
  onSkillTap: (skill: string, points: number, subTag?: string) => void;
  onReadingTheoryClick: () => void;
  bulkActive: boolean;
}

const PANEL_W = 560;
const PANEL_W_MOBILE_FRACTION = 0.94; // % of viewport width on small screens
const PANEL_H_ESTIMATE = 280;
const PANEL_MARGIN = 12;

/**
 * Picks the largest empty quadrant of the viewport relative to the active
 * student card so the panel never sits on top of clickable content.
 * On mobile we just bottom-dock; the grid is full-width anyway.
 */
function pickAutoPosition(
  activeStudentId: string,
  isMobile: boolean
): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = isMobile ? Math.min(vw - PANEL_MARGIN * 2, PANEL_W) : PANEL_W;
  const h = PANEL_H_ESTIMATE;

  // Mobile: pin to bottom centre
  if (isMobile) {
    return {
      x: Math.max(PANEL_MARGIN, (vw - w) / 2),
      y: Math.max(PANEL_MARGIN, vh - h - PANEL_MARGIN - 12),
    };
  }

  const cardEl = document.querySelector<HTMLElement>(
    `[data-student-card="${activeStudentId}"]`
  );
  if (!cardEl) {
    // Fallback: top-right corner
    return { x: vw - w - PANEL_MARGIN, y: PANEL_MARGIN + 80 };
  }

  const r = cardEl.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  // Score 4 candidate corners by how far they are from the active card
  // and how much of the panel fits inside the viewport.
  const candidates = [
    { name: "tl", x: PANEL_MARGIN, y: PANEL_MARGIN + 80 },
    { name: "tr", x: vw - w - PANEL_MARGIN, y: PANEL_MARGIN + 80 },
    { name: "bl", x: PANEL_MARGIN, y: vh - h - PANEL_MARGIN },
    { name: "br", x: vw - w - PANEL_MARGIN, y: vh - h - PANEL_MARGIN },
  ];

  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    const px = c.x + w / 2;
    const py = c.y + h / 2;
    const dist = Math.hypot(px - cx, py - cy);
    if (dist > bestScore) {
      bestScore = dist;
      best = c;
    }
  }
  return { x: best.x, y: best.y };
}

function SmartSkillPanel({
  classId,
  activeStudent,
  onClose,
  onSkillTap,
  onReadingTheoryClick,
  bulkActive,
}: SmartSkillPanelProps) {
  const storageKey = `live-skill-panel-pos:${classId}`;
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [hasUserMoved, setHasUserMoved] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const panelWidth = isMobile
    ? Math.min(window.innerWidth - PANEL_MARGIN * 2, PANEL_W)
    : PANEL_W;

  // On open, restore saved pos OR auto-pick a non-overlapping corner.
  useEffect(() => {
    if (!activeStudent) {
      setHasUserMoved(false);
      return;
    }

    let restored: { x: number; y: number } | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) restored = JSON.parse(raw);
    } catch {}

    if (restored && Number.isFinite(restored.x) && Number.isFinite(restored.y)) {
      // Clamp to current viewport in case window resized
      const clamped = clampToViewport(restored, panelWidth, PANEL_H_ESTIMATE);
      setPos(clamped);
      setHasUserMoved(true);
    } else {
      const auto = pickAutoPosition(activeStudent.id, isMobile);
      setPos(auto);
      setHasUserMoved(false);
    }
  }, [activeStudent?.id]);

  // If user hasn't moved the panel and they tap a different student,
  // re-pick the best corner so we keep dodging student cards.
  useEffect(() => {
    if (!activeStudent || hasUserMoved) return;
    const auto = pickAutoPosition(activeStudent.id, isMobile);
    if (auto) setPos(auto);
  }, [activeStudent?.id, hasUserMoved, isMobile]);

  // Reposition on viewport resize
  useEffect(() => {
    if (!activeStudent) return;
    const onResize = () => {
      setPos((p) => (p ? clampToViewport(p, panelWidth, PANEL_H_ESTIMATE) : p));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeStudent, panelWidth]);

  // Close on Escape
  useEffect(() => {
    if (!activeStudent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeStudent, onClose]);

  const startDrag = (clientX: number, clientY: number) => {
    if (!pos) return;
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      origX: pos.x,
      origY: pos.y,
    };

    const handleMove = (mx: number, my: number) => {
      const d = dragRef.current;
      if (!d) return;
      const next = clampToViewport(
        { x: d.origX + (mx - d.startX), y: d.origY + (my - d.startY) },
        panelWidth,
        PANEL_H_ESTIMATE
      );
      setPos(next);
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) handleMove(t.clientX, t.clientY);
    };
    const onEnd = () => {
      if (dragRef.current) {
        // Persist final position so it sticks across opens.
        try {
          // Read current pos via state callback to avoid stale closure
          setPos((p) => {
            if (p) {
              try {
                localStorage.setItem(storageKey, JSON.stringify(p));
              } catch {}
            }
            return p;
          });
        } catch {}
        setHasUserMoved(true);
      }
      dragRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
  };

  const resetPosition = () => {
    try { localStorage.removeItem(storageKey); } catch {}
    setHasUserMoved(false);
    if (activeStudent) {
      const auto = pickAutoPosition(activeStudent.id, isMobile);
      if (auto) setPos(auto);
    }
  };

  return (
    <AnimatePresence>
      {activeStudent && pos && (
        <motion.div
          ref={panelRef}
          key="smart-skill-panel"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            width: panelWidth,
            zIndex: 40,
            // Lift above bulk action bar without re-layouting
            ...(bulkActive && isMobile ? { top: pos.y - 60 } : null),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden">
            {/* Drag handle bar — drag from anywhere in the header */}
            <div
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-border/40 cursor-grab active:cursor-grabbing select-none touch-none"
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                startDrag(e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                const t = e.touches[0];
                if (t) startDrag(t.clientX, t.clientY);
              }}
              role="toolbar"
              aria-label="Drag to move"
            >
              {/* Visible grip indicator */}
              <div className="flex flex-col gap-0.5 shrink-0 opacity-50">
                <div className="flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-foreground" />
                  <span className="h-1 w-1 rounded-full bg-foreground" />
                  <span className="h-1 w-1 rounded-full bg-foreground" />
                </div>
                <div className="flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-foreground" />
                  <span className="h-1 w-1 rounded-full bg-foreground" />
                  <span className="h-1 w-1 rounded-full bg-foreground" />
                </div>
              </div>

              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={activeStudent.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {activeStudent.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{activeStudent.full_name}</p>
                <p
                  className={cn(
                    "text-xs",
                    activeStudent.todayPoints > 0
                      ? "text-green-600"
                      : activeStudent.todayPoints < 0
                      ? "text-red-600"
                      : "text-muted-foreground"
                  )}
                >
                  {activeStudent.todayPoints > 0 ? "+" : ""}
                  {activeStudent.todayPoints} today
                </p>
              </div>

              {hasUserMoved && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[11px] text-muted-foreground"
                  onClick={resetPosition}
                  title="Reset to auto-position"
                >
                  Auto
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body — non-draggable so taps land on the skill buttons */}
            <div className="p-3 sm:p-4">
              <RadialSkillMenu
                onSkillTap={onSkillTap}
                onClose={onClose}
                onReadingTheoryClick={onReadingTheoryClick}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function clampToViewport(
  pos: { x: number; y: number },
  width: number,
  height: number
) {
  if (typeof window === "undefined") return pos;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.max(PANEL_MARGIN, Math.min(pos.x, vw - width - PANEL_MARGIN)),
    y: Math.max(PANEL_MARGIN, Math.min(pos.y, vh - height - PANEL_MARGIN)),
  };
}
