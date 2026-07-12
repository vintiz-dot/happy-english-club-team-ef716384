import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Pencil, Trash2, Eye, LogOut } from "lucide-react";
import { toast } from "sonner";

type JournalType = "personal" | "student" | "class" | "collab_student_teacher";

interface JournalEntry {
  id: string;
  title: string;
  content_rich: string;
  type: JournalType;
  created_at: string;
  updated_at: string;
  owner_user_id: string;
  student_id?: string;
  class_id?: string;
  is_deleted: boolean;
}

interface JournalListProps {
  type?: JournalType;
  studentId?: string;
  classId?: string;
  onEdit?: (id: string) => void;
  onView?: (entry: JournalEntry) => void;
}

export function JournalList({ type, studentId, classId, onEdit, onView }: JournalListProps) {
  const { user, role } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOwner, setIsOwner] = useState<Record<string, boolean>>({});
  const [isMember, setIsMember] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadEntries();
  }, [type, studentId, classId]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from("journals" as any)
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (type) {
        query = query.eq("type", type);
      }
      if (studentId) {
        query = query.eq("student_id", studentId);
      }
      if (classId) {
        query = query.eq("class_id", classId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEntries((data || []) as any as JournalEntry[]);

      // Check ownership and membership in batch
      const ownershipMap: Record<string, boolean> = {};
      const membershipMap: Record<string, boolean> = {};
      
      const entries = (data || []) as any as JournalEntry[];
      const journalIds = entries.map(e => e.id);
      
      // Batch query for all memberships
      if (journalIds.length > 0) {
        const { data: memberships } = await supabase
          .from("journal_members" as any)
          .select("journal_id")
          .in("journal_id", journalIds)
          .eq("user_id", user.id)
          .eq("status", "active");
        
        const memberJournalIds = new Set((memberships as any)?.map((m: any) => m.journal_id) || []);
        
        for (const entry of entries) {
          ownershipMap[entry.id] = entry.owner_user_id === user.id;
          membershipMap[entry.id] = memberJournalIds.has(entry.id);
        }
      }
      
      setIsOwner(ownershipMap);
      setIsMember(membershipMap);
    } catch (error: any) {
      toast.error("Error loading entries", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("journals" as any)
        .update({ is_deleted: true })
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Entry deleted");
      loadEntries();
    } catch (error: any) {
      toast.error("Error deleting entry", { description: error.message });
    } finally {
      setDeleteId(null);
    }
  };

  const handleLeave = async (journalId: string) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from("journal_members" as any)
        .delete()
        .eq("journal_id", journalId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Left journal");
      loadEntries();
    } catch (error: any) {
      toast.error("Error leaving journal", { description: error.message });
    }
  };

  const getTypeBadge = (type: JournalType) => {
    const variants: Record<JournalType, string> = {
      personal: "default",
      student: "secondary",
      class: "outline",
      collab_student_teacher: "destructive",
    };
    return <Badge variant={variants[type] as any}>{type.replace(/_/g, " ")}</Badge>;
  };

  const filteredEntries = entries.filter((entry) =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  return (
    <>
      <div className="mb-4">
        <Input
          placeholder="Search journals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No journal entries found.
          </CardContent>
        </Card>
      ) : (
        filteredEntries.map((entry) => {
          const truncatedContent = entry.content_rich.replace(/<[^>]*>/g, "").substring(0, 150);
          
          return (
            <Card key={entry.id} className="mb-3 md:mb-4 overflow-hidden hover:shadow-lg transition-all border-2">
              <CardHeader className="bg-gradient-to-br from-muted/30 to-muted/10 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <CardTitle className="text-base md:text-lg line-clamp-2">{entry.title}</CardTitle>
                  {getTypeBadge(entry.type)}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
                  📅 {format(new Date(entry.created_at), "MMM d, yyyy")}
                </p>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {truncatedContent}
                  {entry.content_rich.length > 150 && "..."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {onView && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(entry)}
                      className="flex-1 sm:flex-none min-h-[40px]"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  )}
                  {onEdit && isOwner[entry.id] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(entry.id)}
                      className="flex-1 sm:flex-none min-h-[40px]"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {isOwner[entry.id] ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(entry.id)}
                      className="flex-1 sm:flex-none min-h-[40px]"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  ) : (
                    // Only show Leave button for teachers who are members of collaborative journals
                    role === "teacher" &&
                    isMember[entry.id] && 
                    entry.type === "collab_student_teacher" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLeave(entry.id)}
                        className="flex-1 sm:flex-none min-h-[40px]"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Leave
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this journal entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
