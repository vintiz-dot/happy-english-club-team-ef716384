import { useEffect, useState } from "react";
import { CelebrationOverlay } from "./CelebrationOverlay";
import { soundManager } from "@/lib/soundManager";

interface GradeCelebrationProps {
  studentId: string;
  assignments: any[];
}

interface GradedItem {
  id: string;
  title: string;
  grade: string;
  className: string;
}

export function GradeCelebration({ studentId, assignments }: GradeCelebrationProps) {
  const [celebrationItem, setCelebrationItem] = useState<GradedItem | null>(null);
  const [queue, setQueue] = useState<GradedItem[]>([]);

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

  const handleComplete = () => {
    const current = celebrationItem;
    const remaining = queue.slice(1);

    if (current) {
      markSeen(current.id);
    }

    setQueue(remaining);
    if (remaining.length > 0) {
      setTimeout(() => {
        setCelebrationItem(remaining[0]);
        soundManager.play("success");
      }, 300);
    } else {
      setCelebrationItem(null);
    }
  };

  if (!celebrationItem) return null;

  return (
    <CelebrationOverlay
      show={!!celebrationItem}
      type="achievement"
      title={`Grade: ${celebrationItem.grade}`}
      subtitle={`"${celebrationItem.title}" – ${celebrationItem.className}`}
      onComplete={handleComplete}
    />
  );
}
