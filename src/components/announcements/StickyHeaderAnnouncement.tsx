import { motion } from "framer-motion";
import { X } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import { useIvory } from "@/hooks/useIvory";
import type { Announcement } from "@/hooks/useAnnouncements";

interface Props {
  announcement: Announcement;
  onDismiss?: () => void;
}

// Rendered on every area: ivory classes only while the route is in the system
// (useIvory), the old strings unchanged elsewhere.
export const StickyHeaderAnnouncement = ({ announcement, onDismiss }: Props) => {
  const ivory = useIvory();
  const config = announcement.style_config || {};
  const bg = config.bg || "hsl(var(--primary))";
  const text = config.text || "hsl(var(--primary-foreground))";
  const animation = config.animation;

  return (
    <motion.div
      className={`fixed top-0 left-0 right-0 z-[150] ${animation === "pulse" ? "animate-pulse" : ""}`}
      style={{ background: bg, color: text }}
      initial={ivory ? { y: -8, opacity: 0 } : { y: -60 }}
      animate={ivory ? { y: 0, opacity: 1 } : { y: 0 }}
      exit={ivory ? { y: -8, opacity: 0 } : { y: -60 }}
      transition={ivory ? { duration: 0.24, ease: [0.22, 1, 0.36, 1] } : { type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className={ivory ? "container mx-auto flex items-center justify-center gap-2 px-4 pt-[env(safe-area-inset-top)] text-hec-small" : "container mx-auto px-4 py-2 flex items-center justify-center gap-3 text-xs sm:text-sm"}>
        <div
          className={ivory ? "min-w-0 break-words py-2 text-center font-medium" : "text-center font-medium truncate"}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.body || announcement.title) }}
        />
        {announcement.is_dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            aria-label={ivory ? "Dismiss announcement" : undefined}
            className={
              ivory
                ? "inline-flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center rounded-full transition-opacity duration-hec-1 ease-hec hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-current"
                : "shrink-0 p-0.5 rounded-full hover:bg-white/20 transition-colors"
            }
          >
            <X className={ivory ? "h-4 w-4" : "h-3.5 w-3.5"} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
