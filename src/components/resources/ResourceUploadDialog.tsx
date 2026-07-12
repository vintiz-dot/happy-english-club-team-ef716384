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
import { Upload, X, Link2, FileText, Plus, Check } from "lucide-react";
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
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedBlooms, setSelectedBlooms] = useState<string[]>([]);
  const [selectedPyp, setSelectedPyp] = useState<string[]>([]);
  const [vocabTags, setVocabTags] = useState<string[]>([]);
  const [vocabInput, setVocabInput] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState(false);
  const [vocabPopoverOpen, setVocabPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setFile(null);
    } else if (open && !editResource) {
      resetForm();
    }
  }, [open, editResource]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setVisibility("shared");
    setFile(null);
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

  // File drop handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Submit
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!file && !externalUrl.trim() && !isEdit) {
      toast.error("Please upload a file or enter a URL");
      return;
    }
    if (selectedClasses.length === 0) {
      toast.error("Please select at least one class");
      return;
    }

    const formData: ResourceFormData = {
      title: title.trim(),
      description: description.trim() || undefined,
      visibility,
      blooms_levels: selectedBlooms,
      pyp_themes: selectedPyp,
      vocab_tags: vocabTags,
      class_ids: selectedClasses,
      file: file || undefined,
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

  const isSaving = createMutation.isPending || updateMutation.isPending;
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
              : "Add a new resource for your students. Upload a file or paste a link."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* ---- Title ---- */}
          <div className="space-y-1.5">
            <Label htmlFor="res-title">Title *</Label>
            <Input
              id="res-title"
              placeholder="e.g. Unit 3 Vocabulary Cards"
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
          <div className="space-y-1.5">
            <Label>File</Label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                "hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10",
                file ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-muted-foreground/25",
              )}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">{getFileTypeInfo(file.type).icon}</span>
                  <div className="text-left">
                    <p className="font-medium text-sm truncate max-w-[300px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a file, or <span className="text-blue-600 font-medium">click to browse</span>
                  </p>
                  {isEdit && editResource?.file_name && (
                    <p className="text-xs text-muted-foreground">
                      Current: {editResource.file_name}
                    </p>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
            </div>
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
              {isEdit ? "Save Changes" : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
