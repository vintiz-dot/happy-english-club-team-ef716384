import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";

export function TeachersList() {
  const { data: teachers, isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Loading teachers...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          All Teachers
        </CardTitle>
        <CardDescription>Manage your teaching staff</CardDescription>
      </CardHeader>
      <CardContent>
        {teachers?.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No teachers found</p>
        ) : (
          <div className="space-y-3">
            {teachers?.map((teacher) => (
              <Link key={teacher.id} to={`/teachers/${teacher.id}`}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{teacher.full_name}</p>
                      <Badge variant={teacher.is_active ? "default" : "secondary"}>
                        {teacher.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{teacher.email}</p>
                    {teacher.phone && (
                      <p className="text-sm text-muted-foreground">📱 {teacher.phone}</p>
                    )}
                    <p className="text-sm font-medium text-primary">
                      {(teacher.hourly_rate_vnd || 0).toLocaleString()} VND/hour
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
