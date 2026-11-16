import { useEffect, useState, useRef } from "react";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { loadMyStudents, clearShellCache } from "@/hooks/useShellQueries";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, ChevronDown } from "lucide-react";
import { useIvory } from "@/hooks/useIvory";

export default function ProfileSwitcher() {
  const { studentId, setStudentId } = useStudentProfile();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasAutoSelectedRef = useRef(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // In the shell of every area (Layout): the system only where the route is listed.
  const ivory = useIvory();

  useEffect(() => {
    async function loadStudents() {
      try {
        if (!user) {
          clearShellCache(queryClient);
          setLoading(false);
          return;
        }

        // Shared, cached lookup (src/hooks/useShellQueries.ts); same two queries as before.
        const studentData = await loadMyStudents(queryClient, user.id);

        setStudents(studentData || []);
        
        // Auto-select only if 1 student and not already done
        if (studentData && studentData.length === 1 && !studentId && !hasAutoSelectedRef.current) {
          hasAutoSelectedRef.current = true;
          setStudentId(studentData[0].id);
        }
      } catch (error) {
        console.error("Error loading students:", error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, [user]);

  if (loading || students.length === 0) {
    return null;
  }

  // If only one student, auto-select and don't show switcher
  if (students.length === 1) {
    return null;
  }

  const currentStudent = students.find(s => s.id === studentId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <User className={ivory ? "h-4 w-4 shrink-0" : "h-4 w-4"} />
          <span>{currentStudent?.full_name || "Select Student"}</span>
          <ChevronDown className={ivory ? "h-4 w-4 shrink-0 text-hec-ink-soft" : "h-4 w-4 opacity-50"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={ivory ? "w-72 max-w-[calc(100vw-2rem)]" : "w-56"}>
        {students.map((student) => (
          <DropdownMenuItem
            key={student.id}
            onClick={() => {
              setStudentId(student.id);
              // Invalidate assignment queries to force refetch
              queryClient.invalidateQueries({ queryKey: ["assignment-calendar"] });
              queryClient.invalidateQueries({ queryKey: ["student-assignments"] });
            }}
            className={ivory ? "flex items-start gap-2 py-2" : "flex items-center gap-2"}
          >
            <User className={ivory ? "mt-1 h-4 w-4 shrink-0 text-hec-ink-soft" : "h-4 w-4"} />
            <div className={ivory ? "flex min-w-0 flex-1 flex-col" : "flex flex-col"}>
              <span className={ivory ? "whitespace-normal break-words hyphens-none text-balance" : undefined}>{student.full_name}</span>
              {student.date_of_birth && (
                <span className={ivory ? "text-hec-caption text-hec-ink-soft tabular-nums" : "text-xs text-muted-foreground"}>
                  {new Date(student.date_of_birth).toLocaleDateString()}
                </span>
              )}
            </div>
            {student.id === studentId && (
              <span className={ivory ? "ml-auto shrink-0 text-hec-brass" : "ml-auto"}>✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
