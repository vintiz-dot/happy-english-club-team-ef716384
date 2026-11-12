import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import type { Announcement } from "@/hooks/useAnnouncements";
import { useIvory } from "@/hooks/useIvory";

interface Props {
  announcement: Announcement;
  onDismiss?: () => void;
}

// Renders on every area: Ivory classes on a listed route, the old ones byte for byte elsewhere.
export const StickyHeaderAnnouncement = ({ announcement, onDismiss }: Props) => {
  const ivory = useIvory();
  const reduceMotion = useReducedMotion();
  const config = announcement.style_config || {};
  const bg = config.bg || "hsl(var(--primary))";
  const text = config.text || "hsl(var(--primary-foreground))";
  const animation = config.animation;

  return (
    <motion.div
      className={`fixed top-0 left-0 right-0 z-[150] ${animation === "pulse" ? "animate-pulse" : ""}`}
      style={{ background: bg, color: text }}
      initial={ivory ? { opacity: 0 } : { y: -60 }}
      animate={ivory ? { opacity: 1 } : { y: 0 }}
      exit={ivory ? { opacity: 0 } : { y: -60 }}
      transition={ivory ? { duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] } : { type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className={ivory ? "container mx-auto flex items-center justify-center gap-2 px-4 text-hec-caption sm:text-hec-small" : "container mx-auto px-4 py-2 flex items-center justify-center gap-3 text-xs sm:text-sm"}>
        <div
          className={ivory ? "min-w-0 truncate py-2 text-center font-medium" : "text-center font-medium truncate"}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.body || announcement.title) }}
        />
        {announcement.is_dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss announcement"
            className={
              ivory
                ? // The bar's colours are the admin's: the ring and the hover follow its text colour.
                  "inline-flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center rounded-hec-md transition-opacity duration-hec-1 ease-hec hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
                : "shrink-0 p-0.5 rounded-full hover:bg-white/20 transition-colors"
            }
          >
            <X className={ivory ? "h-5 w-5" : "h-3.5 w-3.5"} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
