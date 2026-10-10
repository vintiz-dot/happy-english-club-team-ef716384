import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import {
  ClassAdminActions,
  ArchivedClassesSection,
} from "@/components/admin/class/ClassAdminActions";
import { PlaceholderCard } from "@/components/ui/loading";

export function ClassesList() {
  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          *,
          teachers:default_teacher_id(full_name)
        `)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <PlaceholderCard rows={4} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes?.map((cls: any) => {
          const slots = cls.schedule_template?.weeklySlots || [];
          const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

          return (
            <Card key={cls.id}>
              <CardHeader>
                <CardTitle className="text-lg">{cls.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{cls.teachers?.full_name}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">
                    {(cls.session_rate_vnd / 1000).toLocaleString()}k VND/buổi
                  </Badge>
                </div>

                <div className="space-y-1">
                  {slots.map((slot: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">{days[slot.dayOfWeek]}</span>
                      <Clock className="h-4 w-4 ml-2" />
                      <span>{slot.startTime} - {slot.endTime}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t">
                  <ClassAdminActions classId={cls.id} classLabel={cls.name} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ArchivedClassesSection />
    </div>
  );
}
