import { useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Eye, Calendar, FileText, Edit, Users, Loader2 } from "lucide-react";
import "react-quill-new/dist/quill.snow.css";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { EditHomeworkDialog } from "./EditHomeworkDialog";
import { GradeOfflineDialog } from "./GradeOfflineDialog";
import { HomeworkPdfDownload } from "@/components/homework/HomeworkPdfDownload";
import { useAuth } from "@/hooks/useAuth";

const ReactQuill = lazy(() => import("react-quill-new"));

interface Class {
  id: string;
  name: string;
}

interface Homework {
  id: string;
  title: string;
  body: string | null;
  due_date: string | null;
  created_at: string;
  class_id: string;
  classes: { name: string } | null;
  homework_files: Array<{ file_name: string; storage_key: string }>;
}

interface AssignmentUploadProps {
  classFilter?: string;
}

// Single query to get teacher/TA data and classes — uses cached user from useAuth
async function fetchTeacherData(userId: string) {
  if (!userId) throw new Error("Not authenticated");

  // Try teacher first
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (teacher) {
    // Get classes where teacher is the default teacher OR has sessions
    const [defaultClassesRes, sessionClassesRes] = await Promise.all([
      supabase
        .from("classes")
        .select("id, name")
        .eq("default_teacher_id", teacher.id)
        .eq("is_active", true),
      supabase
        .from("sessions")
        .select("class_id, classes(id, name)")
        .eq("teacher_id", teacher.id)
    ]);

    const classMap = new Map<string, Class>();
    defaultClassesRes.data?.forEach(cls => {
      if (cls.id) classMap.set(cls.id, cls);
    });
    sessionClassesRes.data?.forEach(s => {
      if (s.classes?.id) classMap.set(s.classes.id, s.classes as Class);
    });

    return { teacherId: teacher.id, classes: Array.from(classMap.values()) };
  }

  // Try TA
  const { data: ta } = await supabase
    .from("teaching_assistants")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (ta) {
    const { data: spData } = await supabase
      .from("session_participants")
      .select("sessions!inner(class_id, classes!inner(id, name))")
      .eq("teaching_assistant_id", ta.id)
      .eq("participant_type", "teaching_assistant");

    const classMap = new Map<string, Class>();
    (spData || []).forEach((sp: any) => {
      const cls = sp.sessions?.classes;
      if (cls?.id) classMap.set(cls.id, cls);
    });

    return { teacherId: ta.id, classes: Array.from(classMap.values()) };
  }

  // Not a teacher or TA — return empty
  return { teacherId: "", classes: [] };
}

// Fetch homeworks for teacher's classes
async function fetchHomeworks(classIds: string[]) {
  if (classIds.length === 0) return [];

  const { data, error } = await supabase
    .from("homeworks")
    .select("id, title, body, due_date, created_at, class_id, classes(name), homework_files(file_name, storage_key)")
    .in("class_id", classIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as Homework[];
}

export function AssignmentUpload({ classFilter }: AssignmentUploadProps) {
  const [formData, setFormData] = useState({
    class_id: "",
    title: "",
    description: "",
    due_date: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [editingHomeworkId, setEditingHomeworkId] = useState<string | null>(null);
  const [gradingHomeworkId, setGradingHomeworkId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Single query for teacher data — scoped to user.id so role switches refresh
  const { data: teacherData, isLoading: teacherLoading, isError: teacherError } = useQuery({
    queryKey: ["teacher-data", user?.id],
    queryFn: () => fetchTeacherData(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const classIds = teacherData?.classes.map(c => c.id) || [];
  // Create stable key for query
  const classIdsKey = classIds.sort().join(",");

  // Fetch homeworks only when we have class IDs
  const { data: homeworks = [], isLoading: homeworksLoading } = useQuery({
    queryKey: ["teacher-homeworks", classIdsKey],
    queryFn: () => fetchHomeworks(classIds),
    enabled: !!teacherData && classIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  // Only show loading if teacher data is loading, or if we have classes and homeworks are loading
  const isLoading = teacherLoading || (classIds.length > 0 && homeworksLoading);

  // Create homework mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: homework, error: insertError } = await supabase
        .from("homeworks")
        .insert({
          class_id: formData.class_id,
          title: formData.title,
          body: formData.description || null,
          due_date: formData.due_date || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (file && homework) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${homework.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("homework")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: fileError } = await supabase
          .from("homework_files")
          .insert({
            homework_id: homework.id,
            file_name: file.name,
            storage_key: fileName,
            size_bytes: file.size,
          });

        if (fileError) throw fileError;
      }

      return homework;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Assignment uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["teacher-homeworks"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["class-homeworks"] });
      // Reset form completely
      setFormData({ class_id: "", title: "", description: "", due_date: "" });
      setFile(null);
      setFormKey(prev => prev + 1);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.class_id || !formData.title) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    createMutation.mutate();
  };

  const viewFile = async (storageKey: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("homework")
        .createSignedUrl(storageKey, 3600); // 1 hour expiry
      
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredHomeworks = classFilter && classFilter !== "all"
    ? homeworks.filter(hw => hw.class_id === classFilter)
    : homeworks;

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Assignment
          </CardTitle>
          <CardDescription>Create a new assignment for your students</CardDescription>
        </CardHeader>
        <CardContent>
          <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              <Select
                value={formData.class_id}
                onValueChange={(value) => setFormData({ ...formData, class_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {(teacherData?.classes || []).map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Assignment title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Suspense fallback={<div className="h-40 border rounded-md flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading editor...</div>}>
                <ReactQuill
                  theme="snow"
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Assignment instructions and details..."
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ["bold", "italic", "underline", "strike"],
                      [{ color: [] }, { background: [] }],
                      [{ list: "ordered" }, { list: "bullet" }],
                      [{ script: "sub" }, { script: "super" }],
                      [{ align: [] }],
                      ["link", "image"],
                      ["clean"],
                    ],
                  }}
                />
              </Suspense>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Attachment (max 5MB)</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept="*/*"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <Button type="submit" disabled={createMutation.isPending} className="w-full min-h-[44px]">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Assignment"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Assignments */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Assignments
          </CardTitle>
          <CardDescription>View all assignments you've created</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading assignments...
            </div>
          ) : teacherError ? (
            <p className="text-center text-destructive py-8">Failed to load teacher data. Please refresh.</p>
          ) : classIds.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No classes assigned yet.</p>
          ) : filteredHomeworks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No assignments yet. Create one above!</p>
          ) : (
            <div className="space-y-4">
              {filteredHomeworks.map((hw) => (
                <Card key={hw.id} className="p-3 sm:p-4 hover:shadow-md transition-shadow long-list-item">
                  <div className="space-y-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base md:text-lg break-words">{hw.title}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge variant="secondary" className="text-xs max-w-full truncate">
                          {hw.classes?.name || "Unknown Class"}
                        </Badge>
                        {hw.due_date && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due {format(new Date(hw.due_date), "MMM dd, yyyy")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {hw.body && (
                      <div
                        className="text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none break-words"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(hw.body) }}
                      />
                    )}

                    {hw.homework_files && hw.homework_files.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {hw.homework_files.map((file, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => viewFile(file.storage_key)}
                            className="text-xs min-h-[36px] max-w-full"
                          >
                            <Eye className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate">{file.file_name}</span>
                          </Button>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Created {format(new Date(hw.created_at), "MMM dd, yyyy 'at' h:mm a")}
                    </p>

                    <div className="grid grid-cols-2 sm:flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingHomeworkId(hw.id)}
                        className="min-h-[44px] sm:flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setGradingHomeworkId(hw.id)}
                        className="min-h-[44px] sm:flex-1"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Grade
                      </Button>
                      <div className="col-span-2 sm:col-auto">
                        <HomeworkPdfDownload
                          homework={hw}
                          className={hw.classes?.name || "Unknown Class"}
                          variant="pill-compact"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditHomeworkDialog
        homeworkId={editingHomeworkId}
        isOpen={!!editingHomeworkId}
        onClose={() => setEditingHomeworkId(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["teacher-homeworks"] });
          queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] });
        }}
      />

      <GradeOfflineDialog
        homeworkId={gradingHomeworkId}
        isOpen={!!gradingHomeworkId}
        onClose={() => setGradingHomeworkId(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["homework-submissions"] });
          queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] });
        }}
      />
    </div>
  );
}
