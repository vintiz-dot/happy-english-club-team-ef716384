import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isLocked, lockReason, parseProofRows, type ProofMap } from "@/lib/attendanceProof";

const EMPTY: ProofMap = new Map();

/**
 * Who has proof of being in this lesson (attendance_proof_for_session). Silent on any
 * error, including a database that does not have the function yet: then nobody is locked
 * and the screen behaves as it did before.
 */
export function useAttendanceProof(sessionId: string | null | undefined) {
  const q = useQuery({
    queryKey: ["attendance-proof", sessionId],
    enabled: !!sessionId,
    staleTime: 30_000,
    retry: false,
    queryFn: async (): Promise<ProofMap> => {
      try {
        const { data, error } = await (supabase.rpc as any)("attendance_proof_for_session", { p_session_id: sessionId });
        if (error) return EMPTY;
        return parseProofRows(data);
      } catch {
        return EMPTY;
      }
    },
  });
  const map = q.data ?? EMPTY;
  return {
    map,
    locked: (studentId: string) => isLocked(map, studentId),
    reason: (studentId: string) => lockReason(map, studentId),
  };
}
