// A cast play as the data of the HEC Docs `lesson-material` document: the cast list
// with the children's names, every scene as a table, and for the teacher the
// rehearsal rounds and the fixes between them. The student copy is built from
// studentPlay() (no fixes, no teacher note). Imports nothing at run time.
import type { LessonMaterial, DocBlock } from "./docBlocks";
import type { Audience } from "./audience";
import type { Cast, Play } from "./plays";

/** The child (or stand-in) on each actor number. */
export const actorName = (names: string[], actor: number) => names[actor] ?? `Actor ${actor + 1}`;

export function playMaterial(play: Play, cast: Cast, names: string[], audience: Audience, course?: string): LessonMaterial {
  const teacher = audience === "teacher";
  const who = (actors: number[], labels: string[]) =>
    actors.length > 3 ? labels.join(", ") : `${actors.map((a) => actorName(names, a)).join(" + ")} (${labels.join(", ")})`;
  const blocks: DocBlock[] = [
    {
      heading: "Cast",
      eyebrow: `${cast.actors} actors · after Lesson ${play.afterLesson} · +${play.minutes} min`,
      paragraphs: [play.summary, ...(cast.merged.length ? [`Parts read by others today: ${cast.merged.map((m) => `${m.from} → ${m.into}`).join(", ")}.`] : [])],
      table: { head: ["Actor", "Part", "Lines"], rows: cast.byActor.map((a) => [actorName(names, a.actor), a.parts.join(" + "), String(a.lines)]) },
      lists: [
        { title: "Words", style: "bullets", items: play.targets.words },
        { title: "Grammar", style: "frames", items: play.targets.grammar },
        ...(play.props?.length ? [{ title: "Props", style: "bullets" as const, items: play.props }] : []),
      ],
    },
    ...cast.scenes.map((s) => ({
      heading: s.title,
      eyebrow: play.title,
      table: {
        head: ["Who", "Line", "Action"],
        rows: s.lines.map((l) => (l.kind === "stage" ? ["", `(${l.text})`, ""] : [who(l.actors, l.labels), l.text, l.do ?? ""])),
      },
    })),
  ];
  if (teacher) {
    blocks.push({
      heading: "Rehearsal",
      eyebrow: "Teacher copy",
      lists: [{ style: "steps", items: play.rehearsal.map((r) => `${r.round} (${r.minutes} min): ${r.how}`) }],
      teacher: [
        { title: "Fix between rounds (one minute)", lines: play.focusOnForm },
        ...(play.teacherNote ? [{ title: "Teacher note", lines: [play.teacherNote] }] : []),
        ...(play.encore ? [{ title: "Encore in a later lesson", lines: [play.encore] }] : []),
      ],
    });
  }
  return { kind: "lesson", title: `${play.title} · Class play`, course: course ?? "Class plays", subtitle: `${teacher ? "Teacher" : "Student"} copy`, blocks };
}
