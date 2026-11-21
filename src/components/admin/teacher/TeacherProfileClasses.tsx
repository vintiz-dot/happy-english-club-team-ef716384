import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatVND } from "@/lib/money";

interface TeacherProfileClassesProps {
  teacherId: string;
}

export function TeacherProfileClasses({ teacherId }: TeacherProfileClassesProps) {
  const { data: classRoles } = useQuery({
    queryKey: ["teacher-class-roles", teacherId],
    queryFn: async () => {
      // Get classes where teacher is default
      const { data: defaultClasses, error: defaultError } = await supabase
        .from("classes")
        .select("*")
        .eq("default_teacher_id", teacherId)
        .eq("is_active", true);

      if (defaultError) throw defaultError;

      // Get classes where teacher has sessions (adhoc)
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("class_id, classes!inner(id, name, is_active)")
        .eq("teacher_id", teacherId);

      if (sessionsError) throw sessionsError;

      // Find adhoc classes (where teacher has sessions but is not default)
      const adhocClassIds = new Set(
        sessions
          .filter((s: any) => !defaultClasses?.some((c) => c.id === s.class_id))
          .map((s: any) => s.class_id)
      );

      const { data: adhocClasses, error: adhocError } = await supabase
        .from("classes")
        .select("*")
        .in("id", Array.from(adhocClassIds))
        .eq("is_active", true);

      if (adhocError) throw adhocError;

      return {
        default: defaultClasses || [],
        adhoc: adhocClasses || [],
      };
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Default Teacher</CardTitle>
          <CardDescription>Classes where this teacher is the primary instructor</CardDescription>
        </CardHeader>
        <CardContent>
          {classRoles?.default && classRoles.default.length > 0 ? (
            <div className="space-y-3">
              {classRoles.default.map((cls: any) => (
                <div key={cls.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{cls.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatVND(cls.session_rate_vnd)}/session
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>Default</Badge>
                    <Link to={`/admin/classes/${cls.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Not a default teacher for any class</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adhoc Coverage</CardTitle>
          <CardDescription>Classes where this teacher covers sessions occasionally</CardDescription>
        </CardHeader>
        <CardContent>
          {classRoles?.adhoc && classRoles.adhoc.length > 0 ? (
            <div className="space-y-3">
              {classRoles.adhoc.map((cls: any) => (
                <div key={cls.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{cls.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatVND(cls.session_rate_vnd)}/session
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">Adhoc</Badge>
                    <Link to={`/admin/classes/${cls.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No adhoc coverage</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
