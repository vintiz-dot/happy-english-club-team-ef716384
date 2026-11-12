import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Trash2, Eye, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatars";

interface StudentsListProps {
  searchQuery?: string;
  sortBy?: string;
  filterClass?: string;
}

export function StudentsList({ searchQuery = "", sortBy = "name-asc", filterClass = "all" }: StudentsListProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showInactive, setShowInactive] = useState(false);
  
  const { data: students, isLoading } = useQuery({
    queryKey: ["students-list", searchQuery, sortBy, filterClass, showInactive],
    queryFn: async () => {
      let query = supabase
        .from("students")
        .select(`
          *,
          families:family_id(name),
          enrollments(class_id, start_date, classes!inner(name, is_active))
        `)
        .eq("enrollments.classes.is_active", true)
        .is("enrollments.end_date", null);

      if (showInactive) {
        query = query.eq("is_active", false);
      } else {
        query = query.eq("is_active", true);
      }

      // Apply class filter
      if (filterClass && filterClass !== "all") {
        query = query.eq("enrollments.class_id", filterClass);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching students:", error);
        throw error;
      }

      // Client-side filtering
      let filtered = data || [];

      // Search filter
      if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.full_name?.toLowerCase().includes(lower) ||
            s.email?.toLowerCase().includes(lower) ||
            (s.families as any)?.name?.toLowerCase().includes(lower) ||
            s.id?.toLowerCase().includes(lower)
        );
      }

      // Sort
      if (sortBy === "name-asc") {
        filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));
      } else if (sortBy === "name-desc") {
        filtered.sort((a, b) => b.full_name.localeCompare(a.full_name));
      } else if (sortBy === "updated") {
        filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      } else if (sortBy === "enrollment") {
        filtered.sort((a, b) => {
          const aDate = (a.enrollments as any)?.[0]?.start_date || "9999-12-31";
          const bDate = (b.enrollments as any)?.[0]?.start_date || "9999-12-31";
          return bDate.localeCompare(aDate);
        });
      }

      return filtered;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from("students")
        .update({ is_active: false })
        .eq("id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-list"] });
      toast.success("Student deactivated successfully");
    },
    onError: (error) => {
      toast.error("Failed to deactivate student: " + error.message);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from("students")
        .update({ is_active: true })
        .eq("id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-list"] });
      toast.success("Student reactivated successfully");
    },
    onError: (error) => {
      toast.error("Failed to reactivate student: " + error.message);
    },
  });

  if (isLoading) {
    return <p className="text-hec-body text-hec-ink-soft">Loading students...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 shrink-0" aria-hidden />
              {showInactive ? "Inactive" : "All"} Students ({students?.length || 0})
            </CardTitle>
            <CardDescription>Manage your student records</CardDescription>
          </div>
          <div className="flex min-h-hec-target items-center gap-2">
            <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="show-inactive" className="flex min-h-hec-target cursor-pointer items-center text-hec-small font-medium text-hec-ink">Show Inactive</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {students?.length === 0 ? (
          <p className="py-8 text-center text-hec-body text-hec-ink-soft">No students found</p>
        ) : (
          <ul className="rounded-hec-lg border border-hec-line bg-hec-surface">
            {students?.map((student) => (
              <li key={student.id} className="flex flex-col gap-3 border-b border-hec-line px-4 py-3 last:border-b-0 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage
                      src={getAvatarUrl(student.avatar_url) || undefined}
                      alt={student.full_name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-hec-sunken font-semibold text-hec-ink-soft">
                      {student.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-start gap-2">
                      <p className="min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{student.full_name}</p>
                      <Badge variant={student.is_active ? "success" : "secondary"} className="shrink-0">
                        {student.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {(student.enrollments as any)?.length > 0 && (
                      <p className="break-words text-hec-small text-hec-ink-soft">
                        📚 {[...new Set((student.enrollments as any).map((e: any) => e.classes?.name).filter(Boolean))].join(", ")}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-hec-small text-hec-ink-soft">
                      {student.families && (
                        <span className="break-words">👨‍👩‍👧 {(student.families as any).name}</span>
                      )}
                      {student.email && (
                        <span className="hidden break-all sm:inline">✉️ {student.email}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 pl-16 sm:pl-0">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/students/${student.id}`)}>
                    <Eye className="h-4 w-4" aria-hidden />
                    View
                  </Button>
                  {showInactive ? (
                    <Button variant="outline" size="sm" onClick={() => reactivateMutation.mutate(student.id)} disabled={reactivateMutation.isPending}>
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      Reactivate
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Deactivate ${student.full_name}`}>
                          <Trash2 className="h-5 w-5" aria-hidden />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deactivate Student</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to deactivate {student.full_name}? They can be reactivated later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(student.id)}>
                            Deactivate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
