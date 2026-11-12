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
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 font-display text-hec-display font-medium text-hec-ink">
              <FolderOpen className="h-6 w-6 shrink-0 text-hec-ink-soft" aria-hidden />
              Resource Hub
            </h1>
            <p className="text-hec-body tabular-nums text-hec-ink-soft">
              {totalItems} resource{totalItems !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditResource(null);
              setUploadOpen(true);
            }}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Upload Resource
          </Button>
        </div>

        {/* ---- Filters ---- */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hec-ink-faint" aria-hidden />
            <Input
              placeholder="Search resources..."
              aria-label="Search resources"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select value={bloomFilter} onValueChange={(v) => { setBloomFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Bloom's Level">
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
            <SelectTrigger className="w-full sm:w-44" aria-label="PYP Theme">
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
            <SelectTrigger className="w-full sm:w-36" aria-label="Visibility">
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
            <Loader2 className="h-8 w-8 animate-spin text-hec-ink-faint" />
          </div>
        ) : paged.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <FolderOpen className="mx-auto h-12 w-12 text-hec-ink-faint" aria-hidden />
            <p className="text-hec-body text-hec-ink-soft">
              {resources.length === 0 ? "No resources yet. Upload your first resource!" : "No resources match your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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
                  className="flex flex-col gap-3 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:flex-row sm:items-start"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                  {/* File type icon (category colour, resourceConstants) */}
                  <div
                    className={cn(
                      "w-11 h-11 rounded-hec-md flex items-center justify-center text-xl shrink-0 text-white",
                      fileInfo.color,
                    )}
                    aria-hidden
                  >
                    {fileInfo.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="min-w-0 truncate text-hec-body font-semibold text-hec-ink">{resource.title}</p>
                      {resource.visibility === "private" ? (
                        <Badge variant="outline" className="shrink-0 gap-1">
                          <EyeOff className="h-3 w-3" aria-hidden /> Private
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0 gap-1">
                          <Eye className="h-3 w-3" aria-hidden /> Shared
                        </Badge>
                      )}
                    </div>

                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-1">
                      {/* Class badges */}
                      {(resource.class_ids || []).slice(0, 3).map((cid) => (
                        <Badge key={cid} variant="outline" className="max-w-full whitespace-normal break-words text-left">
                          {classNameMap.get(cid) || "Class"}
                        </Badge>
                      ))}
                      {(resource.class_ids || []).length > 3 && (
                        <Badge variant="outline" className="tabular-nums">
                          +{resource.class_ids!.length - 3}
                        </Badge>
                      )}
                      {bloomLabels.map((b) => (
                        <span
                          key={b!.value}
                          className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-hec-caption font-medium", b!.color)}
                        >
                          {b!.icon} {b!.label}
                        </span>
                      ))}
                      {pypLabels.map((t) => (
                        <span
                          key={t!.value}
                          className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-hec-caption font-medium", t!.color)}
                        >
                          {t!.icon} {t!.shortLabel || t!.label}
                        </span>
                      ))}
                      {resource.vocab_tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-hec-caption tabular-nums text-hec-ink-soft">
                      {fileInfo.label}
                      {resource.file_size ? ` · ${(resource.file_size / 1024 / 1024).toFixed(1)} MB` : ""}
                      {" · "}
                      {new Date(resource.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(resource)}
                      disabled={downloading === resource.id}
                      aria-label="Open"
                    >
                      {downloading === resource.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : resource.external_url ? (
                        <ExternalLink className="h-4 w-4" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditResource(resource);
                        setUploadOpen(true);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive-quiet"
                      size="icon"
                      onClick={() => setDeleteTarget(resource)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---- Pagination ---- */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
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
            <span className="text-hec-small text-hec-ink-soft tabular-nums">
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
            <AlertDialogCancel>Keep the resource</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90"
            >
              Delete the resource
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
