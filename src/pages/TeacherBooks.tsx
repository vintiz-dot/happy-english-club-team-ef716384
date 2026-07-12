import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { ClassroomToolsLauncher } from "@/components/classroom-tools/ClassroomToolsLauncher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Maximize2,
  Settings,
  Presentation,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface Flipbook {
  id: string;
  title: string;
  url: string;
  teacher_id: string;
  class_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ClassItem {
  id: string;
  name: string;
}

export default function TeacherBooks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Data State
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [flipbooks, setFlipbooks] = useState<Flipbook[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  // Fullscreen & Presentation State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const presentationContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<string>("present");

  // Form State for Add / Edit
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Flipbook | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formClassId, setFormClassId] = useState<string>("none");
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // URL Helper to convert edit/view links to embed format
  const cleanAndSuggestUrl = (url: string): { url: string; warning?: string } => {
    let cleaned = url.trim();
    if (!cleaned) return { url: "" };

    // Google Slides conversion
    if (cleaned.includes("docs.google.com/presentation")) {
      if (cleaned.includes("/edit")) {
        const base = cleaned.split("/edit")[0];
        return {
          url: `${base}/embed`,
          warning: "Converted Google Slides edit link to embed format for presentations."
        };
      }
    }

    // YouTube conversion
    if (cleaned.includes("youtube.com/watch")) {
      try {
        const urlObj = new URL(cleaned);
        const v = urlObj.searchParams.get("v");
        if (v) {
          return {
            url: `https://www.youtube.com/embed/${v}`,
            warning: "Converted standard YouTube link to embed format."
          };
        }
      } catch (e) {}
    }
    if (cleaned.includes("youtu.be/")) {
      const parts = cleaned.split("youtu.be/");
      if (parts.length > 1) {
        const id = parts[1].split(/[?#]/)[0];
        return {
          url: `https://www.youtube.com/embed/${id}`,
          warning: "Converted youtu.be link to embed format."
        };
      }
    }

    // Canva link warning
    if (cleaned.includes("canva.com/design/") && !cleaned.includes("/view?embed")) {
      return {
        url: cleaned,
        warning: "Canva requires a shared 'Embed' URL (e.g., https://www.canva.com/design/.../view?embed). Standard view links might be blocked by browsers."
      };
    }

    // HTTP Warning
    if (!cleaned.startsWith("https://") && cleaned.startsWith("http://")) {
      return {
        url: cleaned,
        warning: "HTTP links may be blocked on secure HTTPS sites. Consider using secure HTTPS."
      };
    }

    return { url: cleaned };
  };

  // Run URL validation checks in real-time as user types
  useEffect(() => {
    if (formUrl) {
      const suggestion = cleanAndSuggestUrl(formUrl);
      if (suggestion.warning) {
        setFormWarning(suggestion.warning);
      } else {
        setFormWarning(null);
      }
    } else {
      setFormWarning(null);
    }
  }, [formUrl]);

  // Load teacher entity & flipbooks
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        // Get teacher profile
        const { data: teacherData, error: teacherError } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (teacherError) throw teacherError;

        if (teacherData) {
          setTeacherId(teacherData.id);

          // Get teacher flipbooks
          const { data: booksData, error: booksError } = await supabase
            .from("teacher_flipbooks")
            .select("*")
            .eq("teacher_id", teacherData.id)
            .order("created_at", { ascending: false });

          if (booksError) throw booksError;

          setFlipbooks(booksData || []);
          if (booksData && booksData.length > 0) {
            setSelectedBookId(booksData[0].id);
          }
        }

        // Get classes for association
        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("id, name")
          .eq("is_active", true)
          .order("name");

        if (classesError) throw classesError;
        setClasses(classesData || []);

      } catch (err: any) {
        console.error("Error loading flipbooks data:", err);
        toast({
          title: "Error Loading Data",
          description: err.message || "Failed to fetch classes or books.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, toast]);

  // Sync fullscreen change with state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Presenter Trigger
  const triggerPresentMode = async () => {
    const element = presentationContainerRef.current;
    if (!element) return;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (err: any) {
      toast({
        title: "Presentation Mode Failed",
        description: "Your browser could not activate fullscreen mode.",
        variant: "destructive",
      });
    }
  };

  // Open Dialog for Add/Edit
  const handleOpenDialog = (book?: Flipbook) => {
    if (book) {
      setEditingBook(book);
      setFormTitle(book.title);
      setFormUrl(book.url);
      setFormClassId(book.class_id || "none");
    } else {
      setEditingBook(null);
      setFormTitle("");
      setFormUrl("");
      setFormClassId("none");
    }
    setFormWarning(null);
    setIsDialogOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId) {
      toast({
        title: "Unauthorized",
        description: "You must be logged in as a registered teacher to save books.",
        variant: "destructive",
      });
      return;
    }

    if (!formTitle.trim() || !formUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and URL are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Apply suggestions if needed
    const finalUrlResult = cleanAndSuggestUrl(formUrl);
    const finalUrl = finalUrlResult.url;
    const finalClassId = formClassId === "none" ? null : formClassId;

    try {
      if (editingBook) {
        // Update
        const { error } = await supabase
          .from("teacher_flipbooks")
          .update({
            title: formTitle,
            url: finalUrl,
            class_id: finalClassId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingBook.id);

        if (error) throw error;

        setFlipbooks(prev =>
          prev.map(b =>
            b.id === editingBook.id
              ? { ...b, title: formTitle, url: finalUrl, class_id: finalClassId }
              : b
          )
        );

        toast({
          title: "Book Updated",
          description: `Successfully updated '${formTitle}'`,
        });
      } else {
        // Insert
        const { data, error } = await supabase
          .from("teacher_flipbooks")
          .insert({
            title: formTitle,
            url: finalUrl,
            teacher_id: teacherId,
            class_id: finalClassId,
          })
          .select()
          .single();

        if (error) throw error;

        setFlipbooks(prev => [data, ...prev]);
        setSelectedBookId(data.id);

        toast({
          title: "Book Added",
          description: `Successfully added '${formTitle}'`,
        });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Failed to Save",
        description: err.message || "An error occurred while saving the URL.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Flipbook
  const handleDeleteBook = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete '${title}'?`)) return;

    try {
      const { error } = await supabase
        .from("teacher_flipbooks")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setFlipbooks(prev => prev.filter(b => b.id !== id));
      if (selectedBookId === id) {
        setSelectedBookId(flipbooks.find(b => b.id !== id)?.id || "");
      }

      toast({
        title: "Book Deleted",
        description: `'${title}' has been removed successfully.`,
      });
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to remove this book.",
        variant: "destructive",
      });
    }
  };

  // Retrieve current active book
  const activeBook = flipbooks.find(b => b.id === selectedBookId);

  // Return loading screen
  if (loading) {
    return (
      <Layout title="Flipbooks & Presentations" hideNavigation={true}>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-muted-foreground font-semibold">Loading presentation center...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Flipbooks & Presentations" hideNavigation={true}>
      <div className="min-h-screen bg-gradient-to-br from-warmGray/10 to-royalGreen/5 p-4 md:p-6 flex flex-col w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 gap-6 w-full">
          {/* Back and Title Bar */}
          <div className="flex items-center justify-between border-b pb-4 shrink-0">
            <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-sm hover:bg-muted"
              // The embedded flipbook iframe pushes its internal page turns
              // into browser history, so history.back() traps the teacher on
              // this page. Navigate explicitly instead.
              onClick={() => navigate("/teacher/dashboard")}
              title="Return to LMS"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-blue-600" />
                Flipbook Presentation Center
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage external materials and present them full-screen with overlay toolbars.
              </p>
            </div>
          </div>

          <div className="w-auto">
            <TabsList className="bg-card shadow-sm border rounded-xl p-1 gap-1">
              <TabsTrigger
                value="present"
                className="rounded-lg gap-1.5 data-[state=active]:bg-blue-500 data-[state=active]:text-white font-medium text-xs py-1.5 px-3"
              >
                <Presentation className="h-3.5 w-3.5" />
                Presenter
              </TabsTrigger>
              <TabsTrigger
                value="manage"
                className="rounded-lg gap-1.5 data-[state=active]:bg-blue-500 data-[state=active]:text-white font-medium text-xs py-1.5 px-3"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings (CRUD)
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab 1: Presenter Mode */}
        <TabsContent value="present" className="flex-1 flex flex-col gap-4 min-h-0 focus-visible:outline-none">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card/65 backdrop-blur-md border rounded-2xl p-4 shadow-sm shrink-0">
            <div className="flex flex-1 items-center gap-3">
              <Label htmlFor="active-book-select" className="text-sm font-semibold shrink-0">
                Select Book:
              </Label>
              <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                <SelectTrigger id="active-book-select" className="flex-1 md:max-w-md bg-background rounded-xl border">
                  <SelectValue placeholder="-- Select a flipbook --" />
                </SelectTrigger>
                <SelectContent>
                  {flipbooks.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No books added yet.
                    </SelectItem>
                  ) : (
                    flipbooks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title} {b.class_id ? `(${classes.find(c => c.id === b.class_id)?.name || "Class"})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {activeBook && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={triggerPresentMode}
                  className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white rounded-xl shadow-md gap-2"
                >
                  <Maximize2 className="h-4 w-4" />
                  Present Fullscreen
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl border hover:bg-muted"
                  onClick={() => window.open(activeBook.url, "_blank")}
                  title="Open directly in tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {activeBook ? (
            <div className="flex-1 flex flex-col min-h-0 border rounded-2xl overflow-hidden shadow-q3 bg-black relative">
              {/* Fullscreen presentation container */}
              <div
                ref={presentationContainerRef}
                className={`w-full h-full flex flex-col relative bg-black ${
                  isFullscreen ? "p-0" : ""
                }`}
              >
                {/* Embedded Iframe */}
                <iframe
                  src={activeBook.url}
                  title={activeBook.title}
                  className="w-full flex-1 border-0 bg-white"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />

                {/* Overlaid classroom tools launcher */}
                <ClassroomToolsLauncher />
              </div>
            </div>
          ) : (
            <div className="flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 text-center bg-card/40">
              <BookOpen className="h-12 w-12 text-muted-foreground/60 mb-3 animate-pulse" />
              <h3 className="text-lg font-bold text-foreground">No Book Selected</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Select a book from the dropdown, or go to Settings to add new presentation materials.
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-xl border border-blue-500/35 hover:bg-blue-50 text-blue-600"
                onClick={() => setActiveTab("manage")}
              >
                Add Your First Book
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Settings (CRUD) */}
        <TabsContent value="manage" className="focus-visible:outline-none">
          <Card className="rounded-2xl border bg-card/65 backdrop-blur-md shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
              <div>
                <CardTitle className="text-lg font-bold">Manage Materials</CardTitle>
                <CardDescription className="text-xs">
                  Create, modify, or delete presentation flipbooks and assign them to specific classes.
                </CardDescription>
              </div>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 text-xs py-1.5 px-3"
              >
                <Plus className="h-4 w-4" />
                Add Book Link
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {flipbooks.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-semibold text-foreground">No flipbooks registered</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click the button in the top-right to register your first flipbook URL.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-xl bg-background">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-bold text-xs">Title</TableHead>
                        <TableHead className="font-bold text-xs">Target URL</TableHead>
                        <TableHead className="font-bold text-xs">Associated Class</TableHead>
                        <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flipbooks.map((b) => (
                        <TableRow key={b.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium text-xs">{b.title}</TableCell>
                          <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={b.url}>
                            {b.url}
                          </TableCell>
                          <TableCell className="text-xs">
                            {b.class_id
                              ? classes.find((c) => c.id === b.class_id)?.name || "Active Class"
                              : "All Classes (Global)"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-blue-100 hover:text-blue-700 text-muted-foreground"
                                onClick={() => handleOpenDialog(b)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-red-100 hover:text-red-700 text-muted-foreground"
                                onClick={() => handleDeleteBook(b.id, b.title)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>

      {/* CRUD dialog modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <form onSubmit={handleSaveBook}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                {editingBook ? "Edit Flipbook Details" : "Add New Flipbook"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Provide a friendly title and embeddable URL. We will check it for iframe compatibility.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="book-title" className="text-xs font-bold">
                  Book Title
                </Label>
                <Input
                  id="book-title"
                  placeholder="e.g., Family & Friends 3 Unit 5"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="rounded-xl border"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="book-url" className="text-xs font-bold">
                  Material URL (Embed link)
                </Label>
                <Input
                  id="book-url"
                  placeholder="https://..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="rounded-xl border"
                  required
                />
                
                {formWarning && (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 p-2.5 rounded-xl text-xs mt-1.5 leading-relaxed">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <span>{formWarning}</span>
                  </div>
                )}
                
                {!formWarning && formUrl.startsWith("https://") && (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-xs px-1 mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>HTTPS URL provided. Pre-checks completed.</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="book-class" className="text-xs font-bold">
                  Link to Class (Optional)
                </Label>
                <Select value={formClassId} onValueChange={setFormClassId}>
                  <SelectTrigger id="book-class" className="rounded-xl border">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Global (All Classes)</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl min-w-[80px]"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
