import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ClassForm } from "@/components/admin/ClassForm";
import {
  ClassAdminActions,
  ArchivedClassesSection,
} from "@/components/admin/class/ClassAdminActions";
import { Users, Clock, School } from "lucide-react";
import { PageHero } from "@/components/quest/PageHero";
import { SectionHeader } from "@/components/quest/SectionHeader";
import { EmptyState } from "@/components/quest/EmptyState";
import { describePattern, parseWeeklySlots } from "@/lib/classSchedule";

const ClassesTab = () => {
  const queryClient = useQueryClient();

  // Real-time subscription for enrollment changes
  useEffect(() => {
    const channel = supabase
      .channel('classes-enrollments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["classes"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (classesError) throw classesError;

      // Fetch only active enrollments (end_date IS NULL)
      const { data: enrollmentCounts, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("class_id")
        .is("end_date", null);

      if (enrollmentError) throw enrollmentError;

      // Count active enrollments per class
      const countByClass = (enrollmentCounts || []).reduce((acc, e) => {
        acc[e.class_id] = (acc[e.class_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Merge counts into classes
      return (classesData || []).map(cls => ({
        ...cls,
        activeEnrollmentCount: countByClass[cls.id] || 0
      }));
    },
  });

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Curriculum"
        title="Classes"
        subtitle="Active class roster, enrolment counts, and session rates."
        variant="glacier"
      />

      <ClassForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["classes"] })} />

      <div>
        <SectionHeader
          title="Active Classes"
          subtitle={classes && !isLoading ? `${classes.length} class${classes.length === 1 ? "" : "es"}` : undefined}
        />
        {isLoading ? (
          <p className="text-hec-small text-hec-ink-soft">Loading classes…</p>
        ) : !classes || classes.length === 0 ? (
          <EmptyState
            icon={School}
            title="No active classes"
            description="Create your first class to start scheduling sessions."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              // The card links to the class, so the Rename/Delete buttons sit
              // OUTSIDE the <Link> — nesting buttons inside an anchor both
              // breaks the markup and makes every click navigate away.
              <Card
                key={cls.id}
                className="flex h-full flex-col transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2"
              >
                <Link
                  to={`/admin/classes/${cls.id}`}
                  className="flex-1 cursor-pointer rounded-t-hec-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                >
                  <CardHeader>
                    <CardTitle className="whitespace-normal break-words">{cls.name}</CardTitle>
                    <CardDescription className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-hec-small tabular-nums">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" aria-hidden />
                        {cls.activeEnrollmentCount} students
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" aria-hidden />
                        {/* The lengths this class actually runs. Printing the
                            single per-class number here stated "90min" for a
                            class whose Wednesday is two hours. */}
                        {describePattern(parseWeeklySlots(cls.schedule_template)) ??
                          `${cls.default_session_length_minutes}min`}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-nowrap font-sans text-hec-body tabular-nums text-hec-ink">
                      {cls.session_rate_vnd?.toLocaleString("vi-VN")} ₫ / session
                    </p>
                  </CardContent>
                </Link>
                <CardContent className="pt-0">
                  <ClassAdminActions classId={cls.id} classLabel={cls.name} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ArchivedClassesSection />
    </div>
  );
};

export default ClassesTab;
