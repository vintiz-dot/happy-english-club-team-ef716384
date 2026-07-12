import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFileTypeInfo, BLOOMS_LEVELS, PYP_THEMES } from "@/lib/resourceConstants";
import { getResourceSignedUrl, type Resource } from "@/hooks/useResources";
import { toast } from "sonner";

interface Props {
  resource: Resource;
  /** If true, renders the compact teacher-list style instead of the child-friendly card */
  compact?: boolean;
  /** Class name map for displaying class badges */
  classNameMap?: Map<string, string>;
}

/**
 * Visual resource card — designed for ESL Grades 1-3 students.
 * Uses large icons, high-contrast colours, and minimal text.
 * When a resource has BOTH a link and a file, shows two distinct action buttons.
 */
export function ResourceCard({ resource, compact = false, classNameMap }: Props) {
  const [loading, setLoading] = useState(false);
  const fileInfo = getFileTypeInfo(resource.file_type);

  const hasBoth = !!resource.external_url && !!resource.storage_key;

  const openLink = () => {
    if (resource.external_url) {
      window.open(resource.external_url, "_blank", "noopener");
    }
  };

  const downloadFile = async () => {
    if (!resource.storage_key) return;
    setLoading(true);
    try {
      const url = await getResourceSignedUrl(resource.storage_key);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not open file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /** Card-level click: opens link if present, otherwise downloads file */
  const handleOpen = async () => {
    if (resource.external_url) {
      openLink();
    } else {
      await downloadFile();
    }
  };

  // ---- Compact (teacher list row) ----
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors group">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 text-white", fileInfo.color)}>
          {fileInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{resource.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {resource.file_name || resource.external_url || "No file"}
            {resource.file_size ? ` · ${(resource.file_size / 1024 / 1024).toFixed(1)} MB` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {resource.visibility === "private" && (
            <Badge variant="outline" className="text-[10px]">Private</Badge>
          )}
          {hasBoth && (
            <Badge variant="secondary" className="text-[10px]">Link + File</Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">{fileInfo.label}</Badge>
        </div>
      </div>
    );
  }

  // ---- Full card (student view) ----
  const bloomLabels = resource.blooms_levels
    .map((v) => BLOOMS_LEVELS.find((b) => b.value === v))
    .filter(Boolean);
  const pypLabels = resource.pyp_themes
    .map((v) => PYP_THEMES.find((t) => t.value === v))
    .filter(Boolean);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border-2 bg-card overflow-hidden",
        "transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-blue-400",
        "cursor-pointer active:scale-[0.98]",
      )}
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleOpen()}
    >
      {/* ---- Icon header ---- */}
      <div
        className={cn(
          "flex items-center justify-center py-6",
          "bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20",
        )}
      >
        <span className="text-5xl drop-shadow-md transition-transform group-hover:scale-110">
          {fileInfo.icon}
        </span>
      </div>

      {/* ---- Content ---- */}
      <div className="flex-1 p-4 space-y-2">
        <h3 className="font-bold text-base leading-snug line-clamp-2">{resource.title}</h3>

        {resource.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {bloomLabels.map((b) => (
            <span
              key={b!.value}
              className={cn("inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium", b!.color)}
            >
              {b!.icon} {b!.label}
            </span>
          ))}
          {pypLabels.map((t) => (
            <span
              key={t!.value}
              className={cn("inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium", t!.color)}
            >
              {t!.icon} {t!.shortLabel || t!.label}
            </span>
          ))}
          {resource.vocab_tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {resource.vocab_tags.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              +{resource.vocab_tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Class badges */}
        {classNameMap && resource.class_ids && resource.class_ids.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resource.class_ids.slice(0, 2).map((cid) => (
              <Badge key={cid} variant="secondary" className="text-[10px]">
                {classNameMap.get(cid) || "Class"}
              </Badge>
            ))}
            {resource.class_ids.length > 2 && (
              <Badge variant="secondary" className="text-[10px]">
                +{resource.class_ids.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* ---- Action buttons ---- */}
      <div className="p-3 pt-0 space-y-2">
        {/* When resource has BOTH a link and a file, show two distinct buttons */}
        {hasBoth ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className={cn(
                "gap-1.5 rounded-xl font-bold text-xs h-10",
                "bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white",
              )}
              onClick={(e) => {
                e.stopPropagation();
                openLink();
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Link
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-xl font-bold text-xs h-10 border-2"
              onClick={(e) => {
                e.stopPropagation();
                downloadFile();
              }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              File
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className={cn(
              "w-full gap-2 rounded-xl font-bold text-sm h-11",
              "bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white",
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : resource.external_url ? (
              <ExternalLink className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {resource.external_url ? "Open Link" : "Download"}
          </Button>
        )}
      </div>
    </div>
  );
}
