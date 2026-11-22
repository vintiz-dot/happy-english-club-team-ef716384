/**
 * The class section of the early, young and junior homes: one block for EVERY class the child is enrolled in,
 * each headed by the class name, read from the same board the class wall shows (this month, like
 * StudentClassLeaderboard's default). A class whose month has no points yet shows nothing: no all-time fallback.
 */
import { Classmates } from "@/components/student/home/Classmates";
import { useClassmates } from "@/components/student/home/useClassmates";
import type { AgeBand } from "@/lib/ageBand";

function ClassBlock({ band, classId, name, studentId, showName }: { band: AgeBand; classId: string; name: string; studentId: string; showName: boolean }) {
  const data = useClassmates(classId, studentId);
  return <Classmates band={band} data={data} heading={showName ? name : undefined} />;
}

export function ClassBlocks({ band, enrolledClasses, studentId }: { band: AgeBand; enrolledClasses: any[]; studentId: string }) {
  const classes = enrolledClasses.filter((e) => e?.classes?.id);
  return (
    <>
      {classes.map((e) => (
        <ClassBlock key={e.id} band={band} classId={e.classes.id} name={e.classes.name} studentId={studentId} showName />
      ))}
    </>
  );
}
