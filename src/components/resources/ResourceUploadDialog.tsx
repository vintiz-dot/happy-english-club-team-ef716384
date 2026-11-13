import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Upload, X, Link2, FileText, Plus, Check, FolderUp, Files } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOOMS_LEVELS, PYP_THEMES, getFileTypeInfo } from "@/lib/resourceConstants";
import {
  useCreateResource,
  useUpdateResource,
  useVocabAutocomplete,
  useClasses,
  type Resource,
  type ResourceFormData,
} from "@/hooks/useResources";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Picking several files / whole folders                               */
/* ------------------------------------------------------------------ */

/** A file picked for upload, with where it sat inside a picked folder. */
interface PickedFile {
  file: File;
  /** "Unit 3/Lesson 1/worksheet.pdf" for a folder pick, just the name otherwise. */
  path: string;
}

// System clutter a folder pick drags along; never worth a resource.
const JUNK_FILES = new Set([".ds_store", "thumbs.db", "desktop.ini"]);
const isJunk = (name: string) =>
  JUNK_FILES.has(name.toLowerCase()) || name.startsWith("._") || name.startsWith("~$");

const pickedFromList = (list: FileList | File[]): PickedFile[] =>
  Array.from(list).map((file) => ({
    file,
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));

/** Walks a dropped folder (browsers hand folders over only as FileSystem entries). */
async function readEntry(entry: any, prefix = ""): Promise<PickedFile[]> {
  if (entry.isFile) {
    const file: File = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [{ file, path: prefix + file.name }];
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const children: any[] = [];
    // readEntries returns at most ~100 at a time; keep asking until it returns none.
    for (;;) {
      const batch: any[] = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (batch.length === 0) break;
      children.push(...batch);
    }
    const nested = await Promise.all(children.map((c) => readEntry(c, `${prefix}${entry.name}/`)));
    return nested.flat();
  }
  return [];
}

/** "Unit 3/Lesson 1/worksheet.pdf" -> "Unit 3 / Lesson 1 / worksheet" */
const titleFromPath = (path: string) =>
  path
    .replace(/\.[^./]+$/, "")
    .split("/")
    .filter(Boolean)
    .join(" / ");

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editResource?: Resource | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ResourceUploadDialog({ open, onOpenChange, editResource }: Props) {
  const isEdit = !!editResource;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "shared">("shared");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedBlooms, setSelectedBlooms] = useState<string[]>([]);
  const [selectedPyp, setSelectedPyp] = useState<string[]>([]);
  const [vocabTags, setVocabTags] = useState<string[]>([]);
  const [vocabInput, setVocabInput] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState(false);
  const [vocabPopoverOpen, setVocabPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Data hooks
  const { data: classes = [] } = useClasses();
  const { data: existingTags = [] } = useVocabAutocomplete();
  const createMutation = useCreateResource();
  const updateMutation = useUpdateResource();

  // Populate form when editing
  useEffect(() => {
    if (open && editResource) {
      setTitle(editResource.title);
      setDescription(editResource.description || "");
      setVisibility(editResource.visibility);
      setExternalUrl(editResource.external_url || "");
      setSelectedBlooms(editResource.blooms_levels);
      setSelectedPyp(editResource.pyp_themes);
      setVocabTags(editResource.vocab_tags);
      setSelectedClasses(editResource.class_ids || []);
      setAllClasses(false);
      setFiles([]);
    } else if (open && !editResource) {
      resetForm();
    }
  }, [open, editResource]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setVisibility("shared");
    setFiles([]);
    setProgress(null);
    setExternalUrl("");
    setSelectedBlooms([]);
    setSelectedPyp([]);
    setVocabTags([]);
    setVocabInput("");
    setSelectedClasses([]);
    setAllClasses(false);
  };

  // All classes toggle
  useEffect(() => {
    if (allClasses) {
      setSelectedClasses(classes.map((c: any) => c.id));
    }
  }, [allClasses, classes]);

  const toggleClass = (classId: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((c) => c !== classId) : [...prev, classId],
    );
    setAllClasses(false);
  };

  const toggleBlooms = (level: string) => {
    setSelectedBlooms((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  };

  const togglePyp = (theme: string) => {
    setSelectedPyp((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme],
    );
  };

  const addVocabTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !vocabTags.includes(trimmed)) {
      setVocabTags((prev) => [...prev, trimmed]);
    }
    setVocabInput("");
    setVocabPopoverOpen(false);
  };

  const removeVocabTag = (tag: string) => {
    setVocabTags((prev) => prev.filter((t) => t !== tag));
  };

  // Adding files: editing keeps one file (it replaces the resource's file);
  // a new upload takes any number, each becoming its own resource.
  const addFiles = useCallback(
    (picked: PickedFile[]) => {
      const usable = picked.filter((p) => !isJunk(p.file.name) && p.file.size > 0);
      if (usable.length === 0) return;
      if (isEdit) {
        setFiles([usable[0]]);
        return;
      }
      setFiles((prev) => {
        const seen = new Set(prev.map((p) => `${p.path}:${p.file.size}`));
        return [...prev, ...usable.filter((p) => !seen.has(`${p.path}:${p.file.size}`))];
      });
    },
    [isEdit],
  );

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  // Drop handler: accepts files and whole folders
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      // Read entries synchronously: the DataTransfer is emptied once the handler yields.
      const plain = pickedFromList(e.dataTransfer.files);
      const entries = Array.from(e.dataTransfer.items || [])
        .map((item) => (item.kind === "file" ? (item as any).webkitGetAsEntry?.() : null))
        .filter(Boolean);
      if (entries.length > 0) {
        try {
          const nested = await Promise.all(entries.map((entry: any) => readEntry(entry)));
          addFiles(nested.flat());
          return;
        } catch (err) {
          console.error("Could not read dropped folder", err);
        }
      }
      addFiles(plain);
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Submit
  const handleSubmit = async () => {
    const isBatch = !isEdit && files.length > 1;
    if (!title.trim() && files.length === 0) {
      toast.error("Title is required");
      return;
    }
    if (files.length === 0 && !externalUrl.trim() && !isEdit) {
      toast.error("Please upload a file or enter a URL");
      return;
    }
    if (selectedClasses.length === 0) {
      toast.error("Please select at least one class");
      return;
    }

    const shared = {
      description: description.trim() || undefined,
      visibility,
      blooms_levels: selectedBlooms,
      pyp_themes: selectedPyp,
      vocab_tags: vocabTags,
      class_ids: selectedClasses,
    };

    if (isBatch) {
      // One resource per file, all with the same classes and tags. Uploaded one
      // at a time so a big folder doesn't flood storage; failures stay in the
      // list so the teacher can retry just those.
      const prefix = title.trim();
      const failed: PickedFile[] = [];
      setProgress({ done: 0, total: files.length });
      for (let i = 0; i < files.length; i++) {
        const picked = files[i];
        const fileTitle = titleFromPath(picked.path) || picked.file.name;
        try {
          await createMutation.mutateAsync({
            ...shared,
            title: prefix ? `${prefix} - ${fileTitle}` : fileTitle,
            file: picked.file,
          });
        } catch (err) {
          console.error("Resource upload failed", picked.path, err);
          failed.push(picked);
        }
        setProgress({ done: i + 1, total: files.length });
      }
      setProgress(null);
      const ok = files.length - failed.length;
      if (failed.length === 0) {
        toast.success(`${ok} resources uploaded`);
        onOpenChange(false);
        resetForm();
      } else {
        setFiles(failed);
        toast.error(
          `${ok} uploaded, ${failed.length} failed. The failed files are still listed - press Upload to try them again.`,
        );
      }
      return;
    }

    const single = files[0];
    const formData: ResourceFormData = {
      ...shared,
      title: title.trim() || (single ? titleFromPath(single.path) || single.file.name : ""),
      file: single?.file,
      external_url: externalUrl.trim() || undefined,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ resourceId: editResource!.id, data: formData });
        toast.success("Resource updated");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Resource uploaded");
      }
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to save resource");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending || progress !== null;
  const totalSize = files.reduce((sum, p) => sum + p.file.size, 0);
  const filteredTags = existingTags.filter(
    (t) => !vocabTags.includes(t) && t.includes(vocabInput.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <>
                <FileText className="h-5 w-5 text-blue-500" />
                Edit Resource
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-blue-500" />
                Upload Resource
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this resource's details and class assignments."
              : "Add resources for your students. Upload files or a whole folder, or paste a link."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* ---- Title ---- */}
          <div className="space-y-1.5">
            <Label htmlFor="res-title">
              {files.length > 1 && !isEdit ? "Title prefix (optional)" : files.length > 0 ? "Title" : "Title *"}
            </Label>
            <Input
              id="res-title"
              placeholder={
                files.length > 1 && !isEdit
                  ? "Each file is titled by its name; text here goes in front"
                  : files.length === 1
                    ? "Leave blank to use the file name"
                    : "e.g. Unit 3 Vocabulary Cards"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* ---- Description ---- */}
          <div className="space-y-1.5">
            <Label htmlFor="res-desc">Description</Label>
            <Textarea
              id="res-desc"
              placeholder="Brief description of this resource..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* ---- File Upload ---- */}
          <div className="space-y-2">
            <Label>{isEdit ? "File" : "Files"}</Label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                "hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10",
                files.length > 0
                  ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10"
                  : "border-muted-foreground/25",
              )}
            >
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isEdit ? "Drag & drop a file" : "Drag & drop files or folders"}, or{" "}
                  <span className="text-blue-600 font-medium">click to browse</span>
                </p>
                {isEdit && editResource?.file_name && files.length === 0 && (
                  <p className="text-xs text-muted-foreground">Current: {editResource.file_name}</p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple={!isEdit}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(pickedFromList(e.target.files));
                  e.target.value = "";
                }}
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                className="hidden"
                {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
                onChange={(e) => {
                  if (e.target.files) addFiles(pickedFromList(e.target.files));
                  e.target.value = "";
                }}
              />
            </div>

            {!isEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                >
                  <Files className="h-4 w-4" /> Choose files
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => folderInputRef.current?.click()}
                  disabled={isSaving}
                >
                  <FolderUp className="h-4 w-4" /> Choose a folder
                </Button>
              </div>
            )}

            {files.length > 0 && (
              <div className="rounded-lg border">
                <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
                  <span>
                    {files.length} file{files.length === 1 ? "" : "s"} &middot; {formatSize(totalSize)}
                    {files.length > 1 && !isEdit && " - each becomes its own resource"}
                  </span>
                  {files.length > 1 && (
                    <button
                      type="button"
                      className="text-blue-600 hover:underline disabled:opacity-50 shrink-0"
                      onClick={() => setFiles([])}
                      disabled={isSaving}
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <ul className="max-h-48 overflow-y-auto divide-y">
                  {files.map((p, i) => (
                    <li key={`${p.path}:${p.file.size}`} className="flex items-center gap-3 px-3 py-1.5">
                      <span className="text-lg shrink-0">{getFileTypeInfo(p.file.type).icon}</span>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm truncate" title={p.path}>
                          {p.path}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatSize(p.file.size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeFile(i)}
                        disabled={isSaving}
                        aria-label={`Remove ${p.path}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ---- External URL ---- */}
          <div className="space-y-1.5">
            <Label htmlFor="res-url" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> External URL (optional)
            </Label>
            <Input
              id="res-url"
              placeholder="https://..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
            />
          </div>

          {/* ---- Visibility ---- */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Shared with Students</Label>
              <p className="text-xs text-muted-foreground">
                {visibility === "shared"
                  ? "Students in selected classes can see this resource"
                  : "Only teachers/admins can see this resource"}
              </p>
            </div>
            <Switch
              checked={visibility === "shared"}
              onCheckedChange={(checked) => setVisibility(checked ? "shared" : "private")}
            />
          </div>

          {/* ---- Class Selection ---- */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Assign to Classes *</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="all-classes" className="text-xs text-muted-foreground cursor-pointer">
                  All Classes
                </Label>
                <Switch
                  id="all-classes"
                  checked={allClasses}
                  onCheckedChange={setAllClasses}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto rounded-lg border p-2">
              {classes.map((c: any) => (
                <label
                  key={c.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
                    selectedClasses.includes(c.id)
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "hover:bg-muted/60",
                  )}
                >
                  <Checkbox
                    checked={selectedClasses.includes(c.id)}
                    onCheckedChange={() => toggleClass(c.id)}
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              ))}
              {classes.length === 0 && (
                <p className="col-span-full text-xs text-muted-foreground text-center py-2">
                  No active classes found
                </p>
              )}
            </div>
          </div>

          {/* ---- Bloom's Taxonomy ---- */}
          <div className="space-y-2">
            <Label>Bloom's Taxonomy</Label>
            <div className="flex flex-wrap gap-2">
              {BLOOMS_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => toggleBlooms(level.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    "border hover:scale-105",
                    selectedBlooms.includes(level.value)
                      ? `${level.color} border-transparent shadow-sm`
                      : "bg-transparent border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40",
                  )}
                >
                  <span>{level.icon}</span>
                  {level.label}
                  {selectedBlooms.includes(level.value) && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* ---- PYP Themes ---- */}
          <div className="space-y-2">
            <Label>IB PYP Transdisciplinary Themes</Label>
            <div className="flex flex-wrap gap-2">
              {PYP_THEMES.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => togglePyp(theme.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    "border hover:scale-105",
                    selectedPyp.includes(theme.value)
                      ? `${theme.color} border-transparent shadow-sm`
                      : "bg-transparent border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40",
                  )}
                >
                  <span>{theme.icon}</span>
                  {theme.shortLabel || theme.label}
                  {selectedPyp.includes(theme.value) && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* ---- Vocabulary Tags ---- */}
          <div className="space-y-2">
            <Label>Vocabulary Tags</Label>
            {vocabTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {vocabTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1 cursor-pointer hover:bg-destructive/10"
                    onClick={() => removeVocabTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
            <Popover open={vocabPopoverOpen} onOpenChange={setVocabPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a tag and press Enter..."
                    value={vocabInput}
                    onChange={(e) => {
                      setVocabInput(e.target.value);
                      if (e.target.value.length > 0) setVocabPopoverOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (vocabInput.trim()) addVocabTag(vocabInput);
                      }
                    }}
                    onFocus={() => {
                      if (vocabInput.length > 0 || existingTags.length > 0)
                        setVocabPopoverOpen(true);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => vocabInput.trim() && addVocabTag(vocabInput)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </PopoverTrigger>
              {filteredTags.length > 0 && (
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                  <Command>
                    <CommandList>
                      <CommandEmpty>No suggestions</CommandEmpty>
                      <CommandGroup heading="Previous tags">
                        {filteredTags.slice(0, 10).map((tag) => (
                          <CommandItem key={tag} onSelect={() => addVocabTag(tag)}>
                            {tag}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              )}
            </Popover>
          </div>

          {/* ---- Actions ---- */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving}
              className="gap-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700"
            >
              {isSaving ? (
                <span className="animate-spin">⏳</span>
              ) : isEdit ? (
                <Check className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isEdit
                ? "Save Changes"
                : progress
                  ? `Uploading ${progress.done}/${progress.total}...`
                  : files.length > 1
                    ? `Upload ${files.length} files`
                    : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
