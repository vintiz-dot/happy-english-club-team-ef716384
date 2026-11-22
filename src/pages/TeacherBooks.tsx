import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { ClassroomToolsLauncher } from "@/components/classroom-tools/ClassroomToolsLauncher";
import { SCHOOL_FLIPBOOKS } from "@/lib/lessonDecks/bookPages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  Layers,
} from "lucide-react";
import { LessonDecksPanel } from "@/components/lessonDecks/LessonDecksPanel";
import { useClassDeckState } from "@/components/lessonDecks/useClassDeckState";
import { flipbookUrl, pageInUrl } from "@/lib/lessonDecks/bookPages";

interface Flipbook {
  id: string;
  title: string;
  url: string;
  teacher_id: string;
  class_id: string | null;
  edition?: string | null; // "1e" | "2e" (20261122090000)
  page_offset?: number | null;
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
  // Once the books have loaded, a background reload must never swap the page for the spinner
  // (that unmounts the book iframe and the lesson loses its place).
  const hasLoadedRef = useRef(false);
  
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
  const [formEdition, setFormEdition] = useState<string>("none");
  const [formOffset, setFormOffset] = useState<number>(0);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  // The page the class's book is open at. Page turns inside the flipbook happen
  // in another site's frame the app cannot read, so the page box (and the decks'
  // "Show page" buttons) are what move it and what is remembered per class.
  const [pageInput, setPageInput] = useState<string>("");
  const [shownPage, setShownPage] = useState<number | null>(null);
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

  // Load teacher entity & flipbooks. Keyed on the user's id, not the user object: a token
  // refresh or tab refocus hands out a new object for the same person.
  const userId = user?.id;
  useEffect(() => {
    async function loadData() {
      if (!userId) return;
      try {
        if (!hasLoadedRef.current) setLoading(true);
        // Get teacher profile
        const { data: teacherData, error: teacherError } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (teacherError) throw teacherError;

        if (teacherData) {
          setTeacherId(teacherData.id);

          // Get teacher flipbooks
          const { data: booksData, error: booksError } = await supabase
            .from("teacher_flipbooks")
            .select("*")
            // Their own books, and any class's book they may read (RLS: staff of that class).
            .or(`teacher_id.eq.${teacherData.id},class_id.not.is.null`)
            .order("created_at", { ascending: false });

          if (booksError) throw booksError;

          setFlipbooks(booksData || []);
          if (booksData && booksData.length > 0) {
            // keep the book the teacher chose if it still exists
            setSelectedBookId((prev) =>
              booksData.some((b) => b.id === prev) ? prev : booksData[0].id
            );
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
        hasLoadedRef.current = true;
        setLoading(false);
      }
    }

    loadData();
  }, [userId, toast]);

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
      setFormEdition(book.edition || "none");
      setFormOffset(book.page_offset ?? 0);
    } else {
      setEditingBook(null);
      setFormTitle("");
      setFormUrl("");
      setFormClassId("none");
      setFormEdition("none");
      setFormOffset(0);
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
    // Sent only when set, so saving a plain link keeps working before migration 20261122090000.
    const bookFields: { edition?: string | null; page_offset?: number } =
      formEdition !== "none" || formOffset !== 0 || editingBook?.edition
        ? { edition: formEdition === "none" ? null : formEdition, page_offset: formOffset }
        : {};

    try {
      if (editingBook) {
        // Update
        const { error } = await supabase
          .from("teacher_flipbooks")
          .update({
            title: formTitle,
            url: finalUrl,
            class_id: finalClassId,
            ...bookFields,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", editingBook.id);

        if (error) throw error;

        setFlipbooks(prev =>
          prev.map(b =>
            b.id === editingBook.id
              ? { ...b, title: formTitle, url: finalUrl, class_id: finalClassId, ...bookFields }
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
            ...bookFields,
          } as any)
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

  // A class's book reopens where that class left off (class_deck_state).
  const place = useClassDeckState(activeBook?.class_id ?? null);
  useEffect(() => {
    const saved = place.state?.flipbook_page ?? null;
    const sameBook = !place.state?.flipbook_id || place.state.flipbook_id === activeBook?.id;
    const start = sameBook && saved ? saved : activeBook ? pageInUrl(activeBook.url) : null;
    setShownPage(start);
    setPageInput(start ? String(start) : "");
  }, [activeBook?.id, place.state?.flipbook_page, place.state?.flipbook_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = (raw: string) => {
    const n = Math.round(Number(raw));
    if (!activeBook || !Number.isFinite(n) || n < 1) return;
    setShownPage(n);
    if (activeBook.class_id) void place.save({ flipbook_page: n, flipbook_id: activeBook.id }, true);
  };
  const bookSrc = activeBook ? flipbookUrl(activeBook.url, shownPage) : "";

  // Return loading screen
  if (loading && !hasLoadedRef.current) {
    return (
      <Layout title="Flipbooks & Presentations" hideNavigation={true}>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-hec-ink-soft" />
            <p className="text-hec-body font-medium text-hec-ink-soft">Loading presentation center...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Flipbooks & Presentations" hideNavigation={true}>
      <div className="min-h-screen bg-hec-paper p-4 md:p-6 flex flex-col w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 gap-6 w-full">
          {/* Back and Title Bar */}
          <div className="flex flex-col gap-4 border-b border-hec-line pb-4 shrink-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  // The embedded flipbook iframe pushes its internal page turns
                  // into browser history, so history.back() traps the teacher on
                  // this page. Navigate explicitly instead.
                  onClick={() => navigate("/teacher/dashboard")}
                  title="Return to LMS"
                  aria-label="Return to LMS"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Return to LMS</TooltipContent>
            </Tooltip>
            <div className="min-w-0">
              <h1 className="font-display text-hec-h1 font-medium text-hec-ink flex items-center gap-2">
                <BookOpen className="h-6 w-6 shrink-0 text-hec-ink-soft" />
                Flipbook Presentation Center
              </h1>
              <p className="text-hec-small text-hec-ink-soft">
                Manage external materials and present them full-screen with overlay toolbars.
              </p>
            </div>
          </div>

          <div className="w-auto">
            <TabsList>
              <TabsTrigger value="present">
                <Presentation className="h-4 w-4" />
                Presenter
              </TabsTrigger>
              <TabsTrigger value="decks">
                <Layers className="h-4 w-4" />
                Lesson Decks
              </TabsTrigger>
              <TabsTrigger value="manage">
                <Settings className="h-4 w-4" />
                Settings (CRUD)
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab 1: Presenter Mode */}
        <TabsContent
          value="present"
          forceMount
          className="flex-1 flex flex-col gap-4 min-h-0 data-[state=inactive]:hidden"
        >
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 shrink-0">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Label htmlFor="active-book-select" className="text-hec-small font-medium text-hec-ink shrink-0">
                Select Book:
              </Label>
              <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                <SelectTrigger id="active-book-select" className="flex-1 md:max-w-md">
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
              <div className="flex flex-wrap items-center gap-2">
                <form
                  className="flex items-center gap-1"
                  onSubmit={(e) => { e.preventDefault(); goToPage(pageInput); }}
                  title={activeBook.class_id ? "Opens this page and remembers it for the class" : "Opens this page"}
                >
                  <Label htmlFor="book-page" className="text-hec-small text-hec-ink-soft">Page</Label>
                  <Input id="book-page" type="number" min={1} className="h-9 w-20" value={pageInput} onChange={(e) => setPageInput(e.target.value)} />
                  <Button type="submit" variant="outline" size="sm">Go</Button>
                </form>
                {activeBook.class_id && place.state?.flipbook_page && (
                  <span className="text-xs text-hec-ink-soft">
                    {classes.find((c) => c.id === activeBook.class_id)?.name ?? "Class"} left off at p. {place.state.flipbook_page}
                  </span>
                )}
                <Button
                  onClick={triggerPresentMode}
                  className="flex-1 gap-2 md:flex-none"
                >
                  <Maximize2 className="h-4 w-4" />
                  Present Fullscreen
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => window.open(activeBook.url, "_blank")}
                      title="Open directly in tab"
                      aria-label="Open directly in tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open directly in tab</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          {activeBook ? (
            <div className="flex-1 flex flex-col min-h-0 border border-hec-line rounded-hec-lg overflow-hidden shadow-hec-2 bg-black relative">
              {/* Fullscreen presentation container */}
              <div
                ref={presentationContainerRef}
                className={`w-full h-full flex flex-col relative bg-black ${
                  isFullscreen ? "p-0" : ""
                }`}
              >
                {/* Embedded Iframe */}
                <iframe
                  src={bookSrc}
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
            <div className="flex-1 border border-dashed border-hec-line-strong rounded-hec-lg flex flex-col items-center justify-center p-8 text-center bg-hec-surface">
              <BookOpen className="h-12 w-12 text-hec-ink-faint mb-3" />
              <h3 className="font-display text-hec-h2 font-medium text-hec-ink">No Book Selected</h3>
              <p className="text-hec-small text-hec-ink-soft max-w-sm mt-1">
                Select a book from the dropdown, or go to Settings to add new presentation materials.
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full sm:w-auto"
                onClick={() => setActiveTab("manage")}
              >
                Add Your First Book
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Settings (CRUD) */}
        <TabsContent value="decks" className="flex-1 min-h-0">
          <LessonDecksPanel
            classes={classes}
            flipbooks={flipbooks.map((b) => ({ id: b.id, title: b.title, url: b.url, class_id: b.class_id, edition: b.edition ?? null, page_offset: b.page_offset ?? 0 }))}
          />
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader className="flex flex-col gap-4 space-y-0 border-b border-hec-line pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle>Manage Materials</CardTitle>
                <CardDescription>
                  Create, modify, or delete presentation flipbooks and assign them to specific classes.
                </CardDescription>
              </div>
              <Button
                onClick={() => handleOpenDialog()}
                className="w-full gap-2 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add Book Link
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {flipbooks.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center">
                  <BookOpen className="h-12 w-12 text-hec-ink-faint mb-3" />
                  <p className="text-hec-body font-medium text-hec-ink">No flipbooks registered</p>
                  <p className="text-hec-small text-hec-ink-soft mt-1">
                    Click the button in the top-right to register your first flipbook URL.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-hec-lg border border-hec-line bg-hec-surface">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Target URL</TableHead>
                        <TableHead>Associated Class</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flipbooks.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="min-w-[10rem] font-medium text-hec-ink">{b.title}</TableCell>
                          <TableCell className="max-w-xs truncate text-hec-ink-soft" title={b.url}>
                            {b.url}
                          </TableCell>
                          <TableCell className="min-w-[8rem]">
                            {b.class_id
                              ? classes.find((c) => c.id === b.class_id)?.name || "Active Class"
                              : "All Classes (Global)"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-hec-ink-soft"
                                aria-label={`Edit ${b.title}`}
                                onClick={() => handleOpenDialog(b)}
                              >
                                <Edit2 className="h-5 w-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-hec-danger hover:bg-hec-danger-tint"
                                aria-label={`Delete ${b.title}`}
                                onClick={() => handleDeleteBook(b.id, b.title)}
                              >
                                <Trash2 className="h-5 w-5" />
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
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSaveBook}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 shrink-0 text-hec-ink-soft" />
                {editingBook ? "Edit Flipbook Details" : "Add New Flipbook"}
              </DialogTitle>
              <DialogDescription>
                Provide a friendly title and embeddable URL. We will check it for iframe compatibility.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {!editingBook && (
                <div className="space-y-2">
                  <p className="text-hec-small font-medium text-hec-ink">The school's course books</p>
                  <div className="flex flex-wrap gap-2">
                    {SCHOOL_FLIPBOOKS.map((b) => (
                      <Button
                        key={b.url}
                        type="button"
                        size="sm"
                        variant={formUrl === b.url ? "default" : "outline"}
                        onClick={() => {
                          setFormTitle(b.title);
                          setFormUrl(b.url);
                          setFormEdition(b.edition);
                          setFormOffset(b.page_offset);
                          setFormWarning(null);
                        }}
                      >
                        Oxford Discover {b.level}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-hec-ink-soft">
                    Fills in the link, edition and page offset so lesson decks open the right page. Choose the class below, then save.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="book-title" className="text-hec-small font-medium text-hec-ink">
                  Book Title
                </Label>
                <Input
                  id="book-title"
                  placeholder="e.g., Family & Friends 3 Unit 5"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="book-url" className="text-hec-small font-medium text-hec-ink">
                  Material URL (Embed link)
                </Label>
                <Input
                  id="book-url"
                  placeholder="https://..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  required
                />

                {formWarning && (
                  <div className="flex items-start gap-2 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-3 text-hec-small text-hec-ink mt-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-hec-warn mt-1" />
                    <span>{formWarning}</span>
                  </div>
                )}

                {!formWarning && formUrl.startsWith("https://") && (
                  <div className="flex items-center gap-2 text-hec-leaf text-hec-small px-1 mt-1">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-hec-leaf" />
                    <span>HTTPS URL provided. Pre-checks completed.</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="book-class" className="text-hec-small font-medium text-hec-ink">
                  Link to Class (Optional)
                </Label>
                <Select value={formClassId} onValueChange={setFormClassId}>
                  <SelectTrigger id="book-class">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="book-edition" className="text-hec-small font-medium text-hec-ink">Which edition is it?</Label>
                  <Select value={formEdition} onValueChange={setFormEdition}>
                    <SelectTrigger id="book-edition"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not a course book</SelectItem>
                      <SelectItem value="2e">Oxford Discover 2nd edition</SelectItem>
                      <SelectItem value="1e">Oxford Discover 1st edition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="book-offset" className="text-hec-small font-medium text-hec-ink">Page offset</Label>
                  <Input id="book-offset" type="number" value={formOffset} onChange={(e) => setFormOffset(Number(e.target.value) || 0)} />
                </div>
                <p className="col-span-2 text-xs text-hec-ink-soft">
                  Lesson decks open this book at the right page. The offset is the flipbook's page number (#p=) minus the printed page number: 0 when they match. A 1st-edition book is opened through the unit's 1st-edition page map.
                </p>
              </div>
            </div>

            <DialogFooter className="border-t border-hec-line pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[8rem]"
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
