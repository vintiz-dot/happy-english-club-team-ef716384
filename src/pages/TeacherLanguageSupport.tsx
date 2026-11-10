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
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center shadow-md">
            <Languages className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Language Support</h1>
            <p className="text-sm text-muted-foreground">
              Turn sentences into pictures for Grade 1–3 readers, then choose which of your classes can read them.
            </p>
          </div>
          <Button onClick={() => setSelected("new")}>
            <Plus className="h-4 w-4 mr-1.5" /> New set
          </Button>
        </div>

        <div className="grid gap-5 md:grid-cols-[18rem_1fr]">
          <aside className={cn("space-y-2", showEditor && "hidden md:block")}>
            {isLoading && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>}
            {error && (
              <p className="text-sm text-destructive rounded-lg border border-destructive/40 p-3">
                Language Support is not switched on yet. Ask the school's admin to apply the latest database update.
              </p>
            )}
            {!isLoading && !error && sets.length === 0 && (
              <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
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
                  className={cn("w-full text-left rounded-xl border p-3 hover:bg-accent transition", selected === s.id && "border-primary ring-1 ring-primary")}
                >
                  <div className="font-medium truncate">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.sentences.length} sentence{s.sentences.length === 1 ? "" : "s"}</div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {on.length ? on.map((n) => <Badge key={n} variant="secondary" className="text-[11px]">{n}</Badge>) : <Badge variant="outline" className="text-[11px]">Not on for any class</Badge>}
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
              <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                Choose a set, or make a new one.
              </div>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}
