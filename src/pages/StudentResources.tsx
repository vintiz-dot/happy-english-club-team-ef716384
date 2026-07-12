import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FolderOpen, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
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
      <div className="space-y-6">
        {/* ---- Header ---- */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400">
            My Resources
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalItems} thing{totalItems !== 1 ? "s" : ""} to explore! 🎉
          </p>
        </div>

        {/* ---- Search ---- */}
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="🔍 Search for resources..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="pl-12 h-12 text-base rounded-xl border-2 focus-visible:border-blue-400"
          />
        </div>

        {/* ---- Class filter chips ---- */}
        {enrolledClasses.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => { setClassFilter(null); setPage(1); }}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-bold transition-all",
                !classFilter
                  ? "bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-md scale-105"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground",
              )}
            >
              ✨ All
            </button>
            {enrolledClasses.map((c) => (
              <button
                key={c.id}
                onClick={() => { setClassFilter(c.id); setPage(1); }}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold transition-all",
                  classFilter === c.id
                    ? "bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-md scale-105"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* ---- Cards Grid ---- */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
          </div>
        ) : paged.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl">📚</div>
            <p className="text-lg font-semibold text-muted-foreground">
              {resources.length === 0 ? "No resources yet!" : "Nothing found — try a different search!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {paged.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                classNameMap={classNameMap}
              />
            ))}
          </div>
        )}

        {/* ---- Pagination ---- */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="lg"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="gap-2 rounded-xl h-12 px-6 font-bold"
            >
              <ChevronLeft className="h-5 w-5" />
              Back
            </Button>
            <span className="text-sm font-semibold text-muted-foreground tabular-nums px-3 py-2 bg-muted rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="lg"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="gap-2 rounded-xl h-12 px-6 font-bold"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
