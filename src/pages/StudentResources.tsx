import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FolderOpen, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Arrive, ArriveItem } from "@/components/fx/Arrive";
import { pressable } from "@/components/fx/PaperPress";
import { readingLine, useReadingCopy } from "@/lib/copy/studentReading";
import { cn } from "@/lib/utils";
import { useStudentResources, useResourceSearch, usePagination, useClasses } from "@/hooks/useResources";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function StudentResources() {
  const { user } = useAuth();
  const { studentId } = useStudentProfile();
  const t = useReadingCopy();
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Resolve studentId from the linked user if not set
  const { data: resolvedStudentId } = useQuery({
    queryKey: ["resolve-student-id", user?.id, studentId],
    enabled: !!user && !studentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id")
        .eq("linked_user_id", user!.id)
        .maybeSingle();
      return data?.id || null;
    },
  });

  const activeStudentId = studentId || resolvedStudentId;

  const { data: resources = [], isLoading } = useStudentResources(activeStudentId || undefined);

  // Get enrolled classes for filter chips
  const { data: enrolledClasses = [] } = useQuery({
    queryKey: ["student-enrolled-classes", activeStudentId],
    enabled: !!activeStudentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("class_id, classes!inner(id, name)")
        .eq("student_id", activeStudentId!)
        .is("end_date", null);
      return (data || []).map((e: any) => ({
        id: e.classes?.id,
        name: e.classes?.name || "Class",
      })).filter((c: any) => c.id);
    },
  });

  // Class name map
  const classNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of enrolledClasses) map.set(c.id, c.name);
    return map;
  }, [enrolledClasses]);

  // Apply class filter
  const classFiltered = useMemo(() => {
    if (!classFilter) return resources;
    return resources.filter((r) => r.class_ids?.includes(classFilter));
  }, [resources, classFilter]);

  // Search
  const searched = useResourceSearch(classFiltered, query);

  // Paginate
  const { paged, totalPages, currentPage, totalItems } = usePagination(searched, page);

  return (
    <Layout title="Resources">
      <Arrive scope="student-resources" userId={user?.id} className="space-y-6">
        {/* ---- Header ---- */}
        {/* The same page header as Lessons, Videos and My Work: icon tile, title, one line under it. */}
        <ArriveItem index={0} className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
            <Sparkles className="h-5 w-5 text-hec-brass" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">
              {readingLine(t.en("res.title"), t.vi("res.title"), t.beneath)}
            </h1>
            <p className="text-hec-small text-hec-ink-soft">
              {readingLine(
                t.en(totalItems === 1 ? "res.countOne" : "res.countMany", { n: totalItems }),
                t.vi(totalItems === 1 ? "res.countOne" : "res.countMany", { n: totalItems }),
                t.beneath,
              )}
            </p>
          </div>
        </ArriveItem>

        {/* ---- Search ---- */}
        <ArriveItem index={1} className="relative max-w-lg">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-hec-ink-soft" aria-hidden />
          <Input
            placeholder={t.en("res.search")}
            aria-label={t.en("res.search")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="min-h-hec-target pl-12"
          />
        </ArriveItem>

        {/* ---- Class filter chips ---- */}
        {enrolledClasses.length > 1 && (
          <ArriveItem index={2} className="flex flex-wrap gap-2">
            <button
              onClick={() => { setClassFilter(null); setPage(1); }}
              className={cn(
                pressable,
                "min-h-hec-target max-w-full rounded-full border px-4 py-2 text-hec-small font-medium shadow-hec-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                !classFilter
                  ? "border-hec-action bg-hec-action text-hec-on-action"
                  : "border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken",
              )}
            >
              {readingLine(t.en("res.all"), t.vi("res.all"), t.beneath)}
            </button>
            {enrolledClasses.map((c) => (
              <button
                key={c.id}
                onClick={() => { setClassFilter(c.id); setPage(1); }}
                className={cn(
                  pressable,
                  "min-h-hec-target max-w-full whitespace-normal break-words rounded-full border px-4 py-2 text-hec-small font-medium shadow-hec-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                  classFilter === c.id
                    ? "border-hec-action bg-hec-action text-hec-on-action"
                    : "border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken",
                )}
              >
                {c.name}
              </button>
            ))}
          </ArriveItem>
        )}

        {/* ---- Cards Grid ---- */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-hec-ink-soft" />
          </div>
        ) : paged.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-hec-lg border border-dashed border-hec-line-strong bg-hec-surface px-6 py-12 text-center">
            <FolderOpen className="h-10 w-10 text-hec-ink-soft" aria-hidden />
            <p className="text-hec-body text-hec-ink-soft">
              {resources.length === 0
                ? readingLine(t.en("res.emptyNone"), t.vi("res.emptyNone"), t.beneath)
                : readingLine(t.en("res.emptyNoMatch"), t.vi("res.emptyNoMatch"), t.beneath)}
            </p>
          </div>
        ) : (
          <ArriveItem index={3} className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {paged.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                classNameMap={classNameMap}
              />
            ))}
          </ArriveItem>
        )}

        {/* ---- Pagination ---- */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="lg"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="min-h-hec-target gap-2 px-6"
            >
              <ChevronLeft className="h-5 w-5 shrink-0" />
              {readingLine(t.en("res.back"), t.vi("res.back"), t.beneath)}
            </Button>
            <span className="rounded-hec-sm bg-hec-sunken px-3 py-2 text-hec-small font-medium tabular-nums text-hec-ink-soft">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="lg"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="min-h-hec-target gap-2 px-6"
            >
              {readingLine(t.en("res.next"), t.vi("res.next"), t.beneath)}
              <ChevronRight className="h-5 w-5 shrink-0" />
            </Button>
          </div>
        )}
      </Arrive>
    </Layout>
  );
}
