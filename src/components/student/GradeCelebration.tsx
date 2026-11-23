import { useEffect, useState } from "react";
import { GradeMoment } from "./GradeMoment";
import { soundManager } from "@/lib/soundManager";

interface GradeCelebrationProps {
  studentId: string;
  assignments: any[];
  /** told whenever the moment goes up or comes down, so a page can step its own Pip out (one Pip per screen) */
  onActiveChange?: (active: boolean) => void;
}

interface GradedItem {
  id: string;
  title: string;
  grade: string;
  className: string;
  /** the teacher's words, if the submission the page already holds carries them */
  feedback: string | null;
}

export function GradeCelebration({ studentId, assignments, onActiveChange }: GradeCelebrationProps) {
  const [celebrationItem, setCelebrationItem] = useState<GradedItem | null>(null);
  const [queue, setQueue] = useState<GradedItem[]>([]);

  const active = !!celebrationItem;
  useEffect(() => {
    onActiveChange?.(active);
    return () => onActiveChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    // Only celebrate things graded in the last 48 hours to avoid
    // an avalanche of confetti for old grades if localStorage is cleared
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 48);

    // Get locally seen IDs
    const seenStr = localStorage.getItem(`celebration_seen_${studentId}`) || "[]";
    let seenIds: string[] = [];
    try {
      seenIds = JSON.parse(seenStr);
    } catch (e) {
      seenIds = [];
    }
    const seenSet = new Set(seenIds);

    const pending = assignments
      .map(a => a.submission)
      .filter(sub => {
        if (!sub) return false;
        if (sub.status !== "graded") return false;
        if (seenSet.has(sub.id)) return false;
        
        const gradedDate = sub.graded_at ? new Date(sub.graded_at) : null;
        if (!gradedDate || gradedDate < cutoffDate) return false;
        
        return true;
      })
      .sort((a, b) => {
        const timeA = a.graded_at ? new Date(a.graded_at).getTime() : 0;
        const timeB = b.graded_at ? new Date(b.graded_at).getTime() : 0;
        return timeB - timeA; // newest first
      })
      .slice(0, 5) // max 5 celebrations per session
      .map(sub => {
        const hw = assignments.find(a => a.id === sub.homework_id);
        return {
          id: sub.id,
          title: hw?.title || "Homework",
          grade: sub.grade || "✓",
          className: hw?.classes?.name || "Class",
          feedback: typeof sub.teacher_feedback === "string" && sub.teacher_feedback.trim() ? sub.teacher_feedback : null,
        };
      });

    if (pending.length > 0 && !celebrationItem && queue.length === 0) {
      setQueue(pending);
      setCelebrationItem(pending[0]);
      soundManager.play("success");
    }
  }, [assignments, studentId]);

  const markSeen = (submissionId: string) => {
    const seenStr = localStorage.getItem(`celebration_seen_${studentId}`) || "[]";
    let seenIds: string[] = [];
    try {
      seenIds = JSON.parse(seenStr);
    } catch (e) {
      seenIds = [];
    }
    seenIds.push(submissionId);
    
    // Keep localStorage from growing infinitely
    if (seenIds.length > 50) seenIds = seenIds.slice(seenIds.length - 50);
    
    localStorage.setItem(`celebration_seen_${studentId}`, JSON.stringify(seenIds));
  };

  // One moment per visit: the newest grade. Closing it marks every grade in the selection as seen,
  // so the others do not come back one by one (the extra line told the child how many there were).
  const handleComplete = () => {
    for (const item of queue) markSeen(item.id);
    setQueue([]);
    setCelebrationItem(null);
  };

  if (!celebrationItem) return null;

  return (
    <GradeMoment
      grade={celebrationItem.grade}
      title={celebrationItem.title}
      className={celebrationItem.className}
      feedback={celebrationItem.feedback}
      more={Math.max(0, queue.length - 1)}
      onClose={handleComplete}
    />
  );
}
