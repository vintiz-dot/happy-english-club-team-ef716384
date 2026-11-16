import { useState } from "react";
import { Languages, Loader2, Plus } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SetEditor } from "@/components/language-support/SetEditor";
import { useActivations, useMySets, useTeacherClasses } from "@/hooks/useLanguageSupport";
import { cn } from "@/lib/utils";

/**
 * Language Support: picture sets for beginner readers. A teacher builds a set,
 * checks the pictures, and switches it on for the classes they choose.
 */
export default function TeacherLanguageSupport() {
  const { data: sets = [], isLoading, error } = useMySets();
  const { data: classes = [] } = useTeacherClasses();
  const { data: activations = {} } = useActivations(sets.map((s) => s.id));
  // "new" is the blank editor; otherwise the id of the set being edited.
  const [selected, setSelected] = useState<string | "new" | null>(null);

  const current = selected && selected !== "new" ? sets.find((s) => s.id === selected) ?? null : null;
  const showEditor = selected === "new" || !!current;
  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "";

  return (
    <Layout title="Language Support">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-hec-lg bg-hec-sunken flex items-center justify-center">
            <Languages className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0 flex-1 basis-56">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Language Support</h1>
            <p className="text-hec-small text-hec-ink-soft">
              Turn sentences into pictures for Grade 1–3 readers, then choose which of your classes can read them.
            </p>
          </div>
          <Button className="w-full sm:w-auto" onClick={() => setSelected("new")}>
            <Plus className="h-4 w-4" /> New set
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
          <aside className={cn("space-y-2", showEditor && "hidden md:block")}>
            {isLoading && <p className="text-hec-small text-hec-ink-soft flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>}
            {error && (
              <p className="rounded-hec-md border border-hec-danger/30 bg-hec-danger-tint p-3 text-hec-small text-hec-danger">
                Language Support is not switched on yet. Ask the school's admin to apply the latest database update.
              </p>
            )}
            {!isLoading && !error && sets.length === 0 && (
              <p className="rounded-hec-md border border-dashed border-hec-line-strong p-4 text-hec-small text-hec-ink-soft">
                You have no sets yet. Press <strong>New set</strong> to make your first.
              </p>
            )}
            {sets.map((s) => {
              const on = Object.entries(activations[s.id] ?? {}).filter(([, a]) => a).map(([id]) => className(id)).filter(Boolean);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s.id)}
                  aria-current={selected === s.id ? "true" : undefined}
                  className={cn(
                    "w-full min-h-hec-target text-left rounded-hec-lg border border-hec-line bg-hec-surface p-3 shadow-hec-1 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                    selected === s.id && "border-hec-brass bg-hec-sunken",
                  )}
                >
                  <div className="font-medium text-hec-body text-hec-ink truncate">{s.title}</div>
                  <div className="text-hec-caption text-hec-ink-soft tabular-nums">{s.sentences.length} sentence{s.sentences.length === 1 ? "" : "s"}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {on.length ? on.map((n) => <Badge key={n} variant="secondary">{n}</Badge>) : <Badge variant="outline">Not on for any class</Badge>}
                  </div>
                </button>
              );
            })}
          </aside>

          <main className={cn(!showEditor && "hidden md:block")}>
            {showEditor ? (
              <div className="space-y-3">
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelected(null)}>← All sets</Button>
                <SetEditor
                  key={selected}
                  set={current}
                  onSaved={(id) => setSelected(id)}
                  onDeleted={() => setSelected(null)}
                />
              </div>
            ) : (
              <div className="rounded-hec-lg border border-dashed border-hec-line-strong p-12 text-center text-hec-body text-hec-ink-soft">
                Choose a set, or make a new one.
              </div>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}
