/**
 * The class board on its own, for a second window dragged onto the
 * projector / extended screen. Opened by openClassBoardWindow().
 */
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { ProjectedBoard } from "@/components/leaderboard/ProjectedBoard";
import { BoardErrorBoundary } from "@/components/leaderboard/BoardErrorBoundary";
import { VoiceAwardOverlay } from "@/components/voiceAward/VoiceAwardOverlay";

export default function ClassBoardWindow() {
  const { classId } = useParams<{ classId: string }>();

  useEffect(() => {
    document.title = "Class board · Happy English Club";
  }, []);

  if (!classId) return null;
  return (
    <div className="fixed inset-0 bg-background">
      <BoardErrorBoundary>
        <ProjectedBoard classId={classId} />
      </BoardErrorBoundary>
      {/* Voice awards spoken on the teacher's laptop play here too (realtime). */}
      <VoiceAwardOverlay classId={classId} remote />
    </div>
  );
}

export function openClassBoardWindow(classId: string) {
  const w = window.open(
    `/board-window/${classId}`,
    `hec-board-${classId}`,
    "popup=yes,width=1280,height=720",
  );
  w?.focus();
  return w;
}
