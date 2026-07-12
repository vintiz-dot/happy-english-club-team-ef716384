import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Eye,
  EyeOff,
  ExternalLink,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTeacherResources,
  useResourceSearch,
  usePagination,
  useDeleteResource,
  useClasses,
  getResourceSignedUrl,
  type Resource,
} from "@/hooks/useResources";
import { ResourceUploadDialog } from "@/components/resources/ResourceUploadDialog";
import { BLOOMS_LEVELS, PYP_THEMES, getFileTypeInfo } from "@/lib/resourceConstants";
import { toast } from "sonner";

export default function TeacherResources() {
  const { data: resources = [], isLoading } = useTeacherResources();
  const { data: classes = [] } = useClasses();
  const deleteMutation = useDeleteResource();

  // Filters
  const [query, setQuery] = useState("");
  const [bloomFilter, setBloomFilter] = useState<string>("all");
  const [pypFilter, setPypFilter] = useState<string>("all");
  const [visFilter, setVisFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Class name lookup map
  const classNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classes) map.set(c.id, c.name);
    return map;
  }, [classes]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = resources;
    if (bloomFilter !== "all") {
      result = result.filter((r) => r.blooms_levels.includes(bloomFilter));
    }
    if (pypFilter !== "all") {
      result = result.filter((r) => r.pyp_themes.includes(pypFilter));
    }
    if (visFilter !== "all") {
      result = result.filter((r) => r.visibility === visFilter);
    }
    return result;
  }, [resources, bloomFilter, pypFilter, visFilter]);

  // Fuzzy search
  const searched = useResourceSearch(filtered, query);

  // Paginate
  const { paged, totalPages, currentPage, totalItems } = usePagination(searched, page);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success("Resource deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete resource");
    }
  };

  const handleDownload = async (resource: Resource) => {
    if (resource.external_url) {
      window.open(resource.external_url, "_blank", "noopener");
      return;
    }
    if (!resource.storage_key) return;
    setDownloading(resource.id);
    try {
      const url = await getResourceSignedUrl(resource.storage_key);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not download file");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Layout title="Resources">
      <div className="space-y-6">
        {/* ---- Header ---- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-blue-500" />
              Resource Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalItems} resource{totalItems !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditResource(null);
              setUploadOpen(true);
            }}
            className="gap-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 shadow-md"
          >
            <Plus className="h-4 w-4" />
            Upload Resource
          </Button>
        </div>

        {/* ---- Filters ---- */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select value={bloomFilter} onValueChange={(v) => { setBloomFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Bloom's Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bloom's</SelectItem>
              {BLOOMS_LEVELS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.icon} {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pypFilter} onValueChange={(v) => { setPypFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="PYP Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PYP Themes</SelectItem>
              {PYP_THEMES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.icon} {t.shortLabel || t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={visFilter} onValueChange={(v) => { setVisFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="shared">Shared</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ---- Resource List ---- */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : paged.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {resources.length === 0 ? "No resources yet. Upload your first resource!" : "No resources match your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {paged.map((resource) => {
              const fileInfo = getFileTypeInfo(resource.file_type);
              const bloomLabels = resource.blooms_levels
                .map((v) => BLOOMS_LEVELS.find((b) => b.value === v))
                .filter(Boolean);
              const pypLabels = resource.pyp_themes
                .map((v) => PYP_THEMES.find((t) => t.value === v))
                .filter(Boolean);

              return (
                <div
                  key={resource.id}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors group"
                >
                  {/* File type icon */}
                  <div
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 text-white shadow-sm",
                      fileInfo.color,
                    )}
                  >
                    {fileInfo.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{resource.title}</p>
                      {resource.visibility === "private" ? (
                        <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0">
                          <EyeOff className="h-2.5 w-2.5" /> Private
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] gap-0.5 shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <Eye className="h-2.5 w-2.5" /> Shared
                        </Badge>
                      )}
                    </div>

                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1 items-center">
                      {/* Class badges */}
                      {(resource.class_ids || []).slice(0, 3).map((cid) => (
                        <Badge key={cid} variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          {classNameMap.get(cid) || "Class"}
                        </Badge>
                      ))}
                      {(resource.class_ids || []).length > 3 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          +{resource.class_ids!.length - 3}
                        </Badge>
                      )}
                      {bloomLabels.map((b) => (
                        <span
                          key={b!.value}
                          className={cn("inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[9px] font-medium", b!.color)}
                        >
                          {b!.icon} {b!.label}
                        </span>
                      ))}
                      {pypLabels.map((t) => (
                        <span
                          key={t!.value}
                          className={cn("inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[9px] font-medium", t!.color)}
                        >
                          {t!.icon} {t!.shortLabel || t!.label}
                        </span>
                      ))}
                      {resource.vocab_tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {fileInfo.label}
                      {resource.file_size ? ` · ${(resource.file_size / 1024 / 1024).toFixed(1)} MB` : ""}
                      {" · "}
                      {new Date(resource.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(resource)}
                      disabled={downloading === resource.id}
                    >
                      {downloading === resource.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : resource.external_url ? (
                        <ExternalLink className="h-3.5 w-3.5" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditResource(resource);
                        setUploadOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(resource)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---- Pagination ---- */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ---- Upload / Edit Dialog ---- */}
      <ResourceUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        editResource={editResource}
      />

      {/* ---- Delete Confirmation ---- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
