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
export const FooterBarAnnouncement = ({ announcement, onDismiss }: Props) => {
  const ivory = useIvory();
  const reduceMotion = useReducedMotion();
  const config = announcement.style_config || {};
  const bg = config.bg || "hsl(var(--card))";
  const text = config.text || "hsl(var(--card-foreground))";

  return (
    <motion.div
      className={
        ivory
          ? "fixed bottom-0 left-0 right-0 z-[150] border-t border-hec-line pb-[env(safe-area-inset-bottom)] shadow-hec-2"
          : "fixed bottom-0 left-0 right-0 z-[150] border-t shadow-lg"
      }
      style={{ background: bg, color: text }}
      initial={ivory ? { opacity: 0 } : { y: 80 }}
      animate={ivory ? { opacity: 1 } : { y: 0 }}
      exit={ivory ? { opacity: 0 } : { y: 80 }}
      transition={ivory ? { duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] } : { type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className={ivory ? "container mx-auto flex items-center gap-4 px-4 py-1" : "container mx-auto px-4 py-3 flex items-center gap-4"}>
        {announcement.image_url && (
          <img
            src={announcement.image_url}
            alt=""
            className={ivory ? "h-8 w-8 shrink-0 rounded-hec-sm object-cover" : "h-8 w-8 rounded object-cover shrink-0"}
            loading="eager"
          />
        )}
        <div className="flex-1 min-w-0">
          <div
            className={ivory ? "truncate text-hec-small font-medium" : "text-sm font-medium truncate"}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.body || announcement.title) }}
          />
        </div>
        {announcement.is_dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss announcement"
            className={
              ivory
                ? // The bar's colours may be the admin's: the ring and the hover follow its text colour.
                  "inline-flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center rounded-hec-md transition-opacity duration-hec-1 ease-hec hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
                : "shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
            }
          >
            <X className={ivory ? "h-5 w-5" : "h-4 w-4"} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
