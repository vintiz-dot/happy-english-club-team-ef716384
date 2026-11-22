/**
 * useCopy() - the words of a student surface (docs/EXPERIENCE_DESIGN_BRIEF.md J2).
 *
 *   const { en, vi, beneath } = useCopy();
 *   en("look.title")            // "Look"
 *   vi("look.title")            // the Vietnamese
 *   beneath                     // show Vietnamese under the English? always for early and young; a per-device
 *                               // switch for junior and teen
 *
 * <Bi k="..." /> (components/student/band/Bi.tsx) draws the English with the Vietnamese beneath when it should be.
 */
import { useAgeBand } from "@/hooks/useAgeBand";
import { fill, studentCopy, type StudentCopyKey } from "@/lib/copy/student";

type Vars = Record<string, string | number>;

export function useCopy() {
  const { viBeneath } = useAgeBand();
  return {
    en: (key: StudentCopyKey, vars?: Vars) => fill(studentCopy[key].en, vars),
    vi: (key: StudentCopyKey, vars?: Vars) => fill(studentCopy[key].vi, vars),
    beneath: viBeneath,
  };
}
