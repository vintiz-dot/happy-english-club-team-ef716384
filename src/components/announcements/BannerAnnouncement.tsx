import { motion } from "framer-motion";
import { X } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import { useIvory } from "@/hooks/useIvory";
import type { Announcement } from "@/hooks/useAnnouncements";

interface Props {
  announcement: Announcement;
  onDismiss?: () => void;
}

// Rendered on every area. Ivory classes only while the route is in the system
// (useIvory); elsewhere the old strings, unchanged. The admin's own colours
// (style_config) win on both, as before.
export const BannerAnnouncement = ({ announcement, onDismiss }: Props) => {
  const ivory = useIvory();
  const config = announcement.style_config || {};
  const bg = config.bg || "hsl(var(--primary))";
  const text = config.text || "hsl(var(--primary-foreground))";
  const animation = config.animation;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`w-full overflow-hidden ${animation === "pulse" ? "animate-pulse" : ""}`}
      style={{ background: bg, color: text }}
    >
      <div className={ivory ? "container mx-auto flex items-start gap-4 px-4 py-3 sm:items-center" : "container mx-auto px-4 py-3 flex items-center gap-4"}>
        {announcement.image_url && (
          <img
            src={announcement.image_url}
            alt=""
            className={ivory ? "h-10 w-10 shrink-0 rounded-hec-md object-cover" : "h-10 w-10 rounded-lg object-cover shrink-0"}
            loading="eager"
          />
        )}
        <div className="flex-1 min-w-0">
          {announcement.title && (
            <p className={ivory ? "break-words text-hec-small font-semibold" : "font-semibold text-sm"}>{announcement.title}</p>
          )}
          {announcement.body && (
            <div
              className={ivory ? "break-words text-hec-small" : "text-sm opacity-90 line-clamp-2"}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.body) }}
            />
          )}
        </div>
        {announcement.is_dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            aria-label={ivory ? "Dismiss announcement" : undefined}
            className={
              ivory
                ? "-my-2 inline-flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center rounded-full transition-opacity duration-hec-1 ease-hec hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                : "shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
            }
          >
            <X className={ivory ? "h-5 w-5" : "h-4 w-4"} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
