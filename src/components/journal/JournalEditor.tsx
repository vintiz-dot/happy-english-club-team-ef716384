import { useState, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIvory } from "@/hooks/useIvory";

// Ivory: Quill paints its toolbar icons a fixed dark grey and its picker menu white, unreadable in dark. These selectors are one class
// more specific than quill.snow.css's own, so they win without !important and Quill's hover / active / open states
// (more specific still) keep showing. Same treatment as ExamReportEditor (PC2-harvest).
const IVORY_QUILL = "rounded-hec-md bg-hec-raised [&_.ql-toolbar.ql-snow]:border-hec-line-strong [&_.ql-container.ql-snow]:border-hec-line-strong [&_.ql-toolbar_.ql-stroke]:stroke-hec-ink-soft [&_.ql-toolbar_.ql-stroke-miter]:stroke-hec-ink-soft [&_.ql-toolbar_.ql-formats_.ql-fill]:fill-hec-ink-soft [&_.ql-toolbar_.ql-picker]:text-hec-ink-soft [&_.ql-toolbar_.ql-picker-options]:bg-hec-raised [&_.ql-editor.ql-blank::before]:text-hec-ink-faint";

type JournalType = "personal" | "student" | "class" | "collab_student_teacher";

interface JournalEditorProps {
  type?: JournalType;
  studentId?: string;
  classId?: string;
  entryId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

export function JournalEditor({ type: initialType, studentId: initialStudentId, classId: initialClassId, entryId, onSave, onCancel }: JournalEditorProps) {
  const ivory = useIvory();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [journalType, setJournalType] = useState<JournalType>(initialType || "personal");
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || "");
  const [selectedClassId, setSelectedClassId] = useState(initialClassId || "");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [students, setStudents] = useState<Array<{ id: string; full_name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; full_name: string; user_id: string }>>([]);

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ["link"],
      ["clean"],
    ],
  };

  useEffect(() => {
    loadOptions();
    if (entryId) {
      loadEntry();
    }
  }, [entryId]);

  const loadOptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load students (for teachers/admins)
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("is_active", true);
    if (studentsData) setStudents(studentsData);

    // Load classes (for teachers/admins)
    const { data: classesData } = await supabase
      .from("classes")
      .select("id, name")
      .eq("is_active", true);
    if (classesData) setClasses(classesData);

    // Load teachers (for students creating collab journals)
    const { data: teachersData } = await supabase
      .from("teachers")
      .select("id, full_name, user_id")
      .eq("is_active", true);
    if (teachersData) setTeachers(teachersData);
  };

  const loadEntry = async () => {
    const { data, error } = await supabase
      .from("journals" as any)
      .select("*")
      .eq("id", entryId)
      .single();

    if (error) {
      toast.error("Error loading entry", { description: error.message });
      return;
    }

    if (!data) return;

    const journalData = data as any;
    if (journalData && typeof journalData === 'object' && 'title' in journalData) {
      setTitle(journalData.title as string);
      setContent(journalData.content_rich as string);
      setJournalType(journalData.type as JournalType);
      if (journalData.student_id) setSelectedStudentId(journalData.student_id);
      if (journalData.class_id) setSelectedClassId(journalData.class_id);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Missing title", { description: "Please enter a title" });
      return;
    }

    // Validate required fields based on type
    if (journalType === "student" && !selectedStudentId) {
      toast.error("Missing student", { description: "Please select a student" });
      return;
    }
    if (journalType === "class" && !selectedClassId) {
      toast.error("Missing class", { description: "Please select a class" });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (entryId) {
        // Update existing entry
        const { error } = await supabase
          .from("journals" as any)
          .update({ 
            title, 
            content_rich: content,
            updated_at: new Date().toISOString() 
          })
          .eq("id", entryId);

        if (error) throw error;
        toast.success("Entry updated successfully");
      } else {
        // Create new entry
        const insertData: any = {
          title,
          content_rich: content,
          type: journalType,
          owner_user_id: user.id,
        };
        
        if (journalType === "student") {
          insertData.student_id = selectedStudentId;
        } else if (journalType === "class") {
          insertData.class_id = selectedClassId;
        }

        const { data: newJournal, error } = await supabase
          .from("journals" as any)
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        // If collab journal, create invite for teacher
        if (journalType === "collab_student_teacher" && selectedTeacherId) {
          if (!newJournal) throw new Error("Failed to create journal");
          
          const journalData = newJournal as any;
          const teacher = teachers.find(t => t.id === selectedTeacherId);
          if (teacher?.user_id && journalData && typeof journalData === 'object' && 'id' in journalData) {
            await supabase.from("journal_members" as any).insert({
              journal_id: journalData.id,
              user_id: teacher.user_id,
              role: "contributor",
              status: "active",
              accepted_at: new Date().toISOString(),
            });
          }
        }

        toast.success("Entry created successfully");
      }

      setTitle("");
      setContent("");
      onSave?.();
    } catch (error: any) {
      toast.error("Error saving entry", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{entryId ? "Edit" : "New"} Journal Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!entryId && !initialType && (
          <div className="space-y-2">
            <Label htmlFor="journal-editor-type">Journal Type</Label>
            <Select value={journalType} onValueChange={(v) => setJournalType(v as JournalType)}>
              <SelectTrigger id="journal-editor-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="class">Class</SelectItem>
                <SelectItem value="collab_student_teacher">Collaborate with Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {journalType === "student" && !entryId && (
          <div className="space-y-2">
            <Label htmlFor="journal-editor-student">Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger id="journal-editor-student">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {journalType === "class" && !entryId && (
          <div className="space-y-2">
            <Label htmlFor="journal-editor-class">Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger id="journal-editor-class">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {journalType === "collab_student_teacher" && !entryId && (
          <div className="space-y-2">
            <Label htmlFor="journal-editor-teacher">Invite Teacher</Label>
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger id="journal-editor-teacher">
                <SelectValue placeholder="Select a teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="journal-editor-title">Title</Label>
          <Input
            id="journal-editor-title"
            placeholder="Entry title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Content</Label>
          <div className={ivory ? `min-h-[300px] ${IVORY_QUILL}` : "min-h-[300px]"}>
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              className="h-[250px]"
            />
          </div>
        </div>

        <div className={ivory ? "flex flex-wrap gap-2 pt-12" : "flex gap-2 pt-12"}>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Entry"}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
