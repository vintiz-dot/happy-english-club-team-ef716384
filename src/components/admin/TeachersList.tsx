import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Archive } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { describeRate } from "@/lib/payRate";

export function TeachersList() {
  // Archiving used to be a one-way trip. This list filtered is_active and is
  // the only screen in the app that links to /teachers/:id, so the moment a
  // teacher was switched off they could not be opened again - not to correct
  // anything, and not to put them back. That dead end is why a Delete button
  // looked like the only way to tidy up the list.
  const [showArchived, setShowArchived] = useState(false);

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["teachers", showArchived],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("is_active", !showArchived)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetched separately from the list so the count on the tab is right even
  // while the other tab is showing.
  const { data: archivedCount = 0 } = useQuery({
    queryKey: ["teachers-archived-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .eq("is_active", false);
      return count ?? 0;
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
        <Tabs
          value={showArchived ? "archived" : "active"}
          onValueChange={(v) => setShowArchived(v === "archived")}
          className="pt-2"
        >
          <TabsList>
            <TabsTrigger value="active">On the staff</TabsTrigger>
            <TabsTrigger value="archived" className="gap-1.5">
              <Archive className="h-3.5 w-3.5" />
              Archived
              {archivedCount > 0 && (
                <span className="text-xs text-muted-foreground">({archivedCount})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {teachers?.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {showArchived ? "Nobody has been archived." : "No teachers found"}
          </p>
        ) : (
          <div className="space-y-3">
            {teachers?.map((teacher) => (
              <Link key={teacher.id} to={`/teachers/${teacher.id}`}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{teacher.full_name}</p>
                      <Badge variant={teacher.is_active ? "default" : "secondary"}>
                        {teacher.is_active ? "Active" : "Archived"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{teacher.email}</p>
                    {teacher.phone && (
                      <p className="text-sm text-muted-foreground">📱 {teacher.phone}</p>
                    )}
                    <p className="text-sm font-medium text-primary">
                      {describeRate(teacher)}
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
