import { useEffect, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Languages, Volume2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { useSetsForStudent, type ChildSet } from "@/hooks/useLanguageSupport";
import { PictureStrip } from "@/components/language-support/PictureStrip";
import { ATTRIBUTION } from "@/lib/languageSupport/strip";
import { speak } from "@/lib/video/kidVideo";
import { Arrive, ArriveItem } from "@/components/fx/Arrive";
import { pressable } from "@/components/fx/PaperPress";
import { useAuth } from "@/hooks/useAuth";
import { readingLine, useReadingCopy } from "@/lib/copy/studentReading";

/**
 * "Picture Reader": the sets a teacher has switched on for the child's
 * classes, read one sentence at a time. Read only. Big pictures, big words,
 * a Listen button, and a tap on any picture says its word.
 */
export default function StudentPictureReader() {
  const { studentId } = useStudentProfile();
  const { user } = useAuth();
  const t = useReadingCopy();
  const { data: sets = [], isLoading } = useSetsForStudent(studentId);
  const [open, setOpen] = useState<ChildSet | null>(null);

  return (
    <Layout title="Picture Reader">
      <Arrive scope="student-picture-reader" userId={user?.id} className="max-w-3xl mx-auto space-y-5">
        <ArriveItem index={0} className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
            <Languages className="h-7 w-7 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">
              {readingLine(t.en("pr.title"), t.vi("pr.title"), t.beneath)}
            </h1>
            <p className="text-hec-small text-hec-ink-soft">
              {t.beneath
                ? readingLine(t.en("pr.sub"), t.vi("pr.sub"), true)
                : `${t.en("pr.sub")} · ${t.vi("pr.sub")}`}
            </p>
          </div>
        </ArriveItem>

        {open ? (
          <Reader set={open} onBack={() => setOpen(null)} />
        ) : isLoading ? (
          <p className="text-hec-body text-hec-ink-soft">{readingLine(`${t.en("pr.loading")}…`, t.vi("pr.loading"), t.beneath)}</p>
        ) : sets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-hec-lg border border-dashed border-hec-line-strong bg-hec-surface px-6 py-10 text-center text-hec-body text-hec-ink-soft">
            <BookOpen className="h-10 w-10" aria-hidden />
            {readingLine(t.en("pr.empty"), t.vi("pr.empty"), t.beneath)}
          </div>
        ) : (
          <ArriveItem index={1}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {sets.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setOpen(s)}
                  className={`${pressable} min-h-[5.5rem] w-full rounded-hec-lg border border-hec-line bg-hec-surface p-4 text-left shadow-hec-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring`}
                >
                  <div className="break-words text-hec-h3 font-medium text-hec-ink">{s.title}</div>
                  <div className="text-hec-small text-hec-ink-soft">
                    {readingLine(
                      `${t.en(s.sentences.length === 1 ? "pr.sentenceOne" : "pr.sentenceMany", { n: s.sentences.length })} · ${s.class_names.join(", ")}`,
                      t.vi(s.sentences.length === 1 ? "pr.sentenceOne" : "pr.sentenceMany", { n: s.sentences.length }),
                      t.beneath,
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          </ArriveItem>
        )}
        <p className="text-center text-hec-caption text-hec-ink-soft">{ATTRIBUTION}</p>
      </Arrive>
    </Layout>
  );
}

function Reader({ set, onBack }: { set: ChildSet; onBack: () => void }) {
  const t = useReadingCopy();
  const [i, setI] = useState(0);
  const total = set.sentences.length;
  const sentence = set.sentences[i];
  useEffect(() => () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);

  if (!sentence) {
    return <Button variant="secondary" onClick={onBack}>← {t.en("pr.back")}</Button>;
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="quiet" className="h-auto whitespace-normal py-2 text-left" onClick={onBack}>← {readingLine(t.en("pr.allStories"), t.vi("pr.allStories"), t.beneath)}</Button>
        <span className="text-hec-small tabular-nums text-hec-ink-soft">{i + 1} / {total}</span>
      </div>
      {set.description && <p className="text-hec-body text-hec-ink-soft">{set.description}</p>}
      <div className="flex min-h-[14rem] items-center rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6 md:p-8">
        <PictureStrip cells={sentence.cells} mode="reader" onCellClick={(cell) => speak(cell.text)} />
      </div>
      <div className="flex gap-2">
        <Button size="lg" variant="secondary" className="h-auto min-h-[3.5rem] flex-1 whitespace-normal py-2 text-base" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ChevronLeft className="mr-1 h-5 w-5" /> {readingLine(t.en("pr.back"), t.vi("pr.back"), t.beneath)}
        </Button>
        <Button size="lg" variant="secondary" className="h-auto min-h-[3.5rem] flex-1 whitespace-normal py-2 text-base" onClick={() => speak(sentence.text)}>
          <Volume2 className="mr-1.5 h-5 w-5" /> {readingLine(t.en("pr.listen"), t.vi("pr.listen"), t.beneath)}
        </Button>
        <Button size="lg" className="h-auto min-h-[3.5rem] flex-1 whitespace-normal py-2 text-base" disabled={i >= total - 1} onClick={() => setI(i + 1)}>
          {readingLine(t.en("pr.next"), t.vi("pr.next"), t.beneath)} <ChevronRight className="ml-1 h-5 w-5" />
        </Button>
      </div>
      {i >= total - 1 && <p className="text-center text-hec-h3 text-hec-ink">{readingLine(t.en("pr.end"), t.vi("pr.end"), t.beneath)}</p>}
    </div>
  );
}
