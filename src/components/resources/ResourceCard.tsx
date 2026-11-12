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
      <div className="group flex items-center gap-3 rounded-hec-md border border-hec-line bg-hec-surface p-3 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-hec-md bg-hec-sunken text-xl">
          {fileInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-hec-small font-medium text-hec-ink">{resource.title}</p>
          <p className="truncate text-hec-caption text-hec-ink-soft">
            {resource.file_name || resource.external_url || "No file"}
            {resource.file_size ? ` · ${(resource.file_size / 1024 / 1024).toFixed(1)} MB` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {resource.visibility === "private" && (
            <Badge variant="outline" className="text-hec-caption">Private</Badge>
          )}
          {hasBoth && (
            <Badge variant="secondary" className="text-hec-caption">Link + File</Badge>
          )}
          <Badge variant="secondary" className="text-hec-caption">{fileInfo.label}</Badge>
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
        "group relative flex flex-col overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1",
        "cursor-pointer transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
      )}
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleOpen()}
    >
      {/* ---- Icon header ---- */}
      <div
        className={cn(
          "flex items-center justify-center bg-hec-sunken py-6",
        )}
      >
        <span className="text-5xl">
          {fileInfo.icon}
        </span>
      </div>

      {/* ---- Content ---- */}
      <div className="flex-1 p-4 space-y-2">
        <h3 className="line-clamp-2 text-hec-body font-semibold text-hec-ink">{resource.title}</h3>

        {resource.description && (
          <p className="line-clamp-2 text-hec-small text-hec-ink-soft">{resource.description}</p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {bloomLabels.map((b) => (
            <span
              key={b!.value}
              className={"inline-flex items-center gap-1 rounded-full border border-hec-line bg-hec-sunken px-2 py-0.5 text-hec-caption font-medium text-hec-ink-soft"}
            >
              {b!.icon} {b!.label}
            </span>
          ))}
          {pypLabels.map((t) => (
            <span
              key={t!.value}
              className={"inline-flex items-center gap-1 rounded-full border border-hec-line bg-hec-sunken px-2 py-0.5 text-hec-caption font-medium text-hec-ink-soft"}
            >
              {t!.icon} {t!.shortLabel || t!.label}
            </span>
          ))}
          {resource.vocab_tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="px-1.5 py-0 text-hec-caption">
              {tag}
            </Badge>
          ))}
          {resource.vocab_tags.length > 3 && (
            <Badge variant="outline" className="px-1.5 py-0 text-hec-caption">
              +{resource.vocab_tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Class badges */}
        {classNameMap && resource.class_ids && resource.class_ids.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resource.class_ids.slice(0, 2).map((cid) => (
              <Badge key={cid} variant="secondary" className="text-hec-caption">
                {classNameMap.get(cid) || "Class"}
              </Badge>
            ))}
            {resource.class_ids.length > 2 && (
              <Badge variant="secondary" className="text-hec-caption">
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
              className="min-h-hec-target gap-1.5 text-hec-small"
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
              className="min-h-hec-target gap-1.5 text-hec-small"
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
            className="min-h-hec-target w-full gap-2"
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
