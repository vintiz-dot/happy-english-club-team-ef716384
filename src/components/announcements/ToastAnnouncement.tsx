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
export const ToastAnnouncement = ({ announcement, onDismiss }: Props) => {
  const ivory = useIvory();
  const reduceMotion = useReducedMotion();
  const config = announcement.style_config || {};
  const bg = config.bg || undefined;
  const text = config.text || undefined;

  return (
    <motion.div
      className={
        ivory
          ? // Inset 16 px at 375 (the old w-full + right-6 pushed it off the left edge); a card from sm.
            // Sits above the phone's bottom nav and a footer-bar announcement instead of covering them.
            "fixed inset-x-4 bottom-24 z-[150] overflow-hidden rounded-hec-lg border border-hec-line bg-hec-raised text-hec-ink shadow-hec-2 sm:inset-x-auto sm:bottom-20 sm:right-6 sm:w-full sm:max-w-sm"
          : "fixed bottom-6 right-6 z-[150] max-w-sm w-full rounded-xl shadow-xl border bg-card text-card-foreground overflow-hidden"
      }
      style={{ background: bg, color: text }}
      initial={ivory ? { y: 8, opacity: 0 } : { x: 400, opacity: 0 }}
      animate={ivory ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
      exit={ivory ? { y: 8, opacity: 0 } : { x: 400, opacity: 0 }}
      transition={ivory ? { duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] } : { type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className={ivory ? "flex items-start gap-3 py-2 pl-4 pr-2" : "p-4 flex items-start gap-3"}>
        {announcement.image_url && (
          <img
            src={announcement.image_url}
            alt=""
            className={ivory ? "mt-2 h-10 w-10 shrink-0 rounded-hec-sm object-cover" : "h-10 w-10 rounded-lg object-cover shrink-0"}
            loading="eager"
          />
        )}
        <div className={ivory ? "min-w-0 flex-1 py-2" : "flex-1 min-w-0"}>
          {announcement.title && (
            <p className={ivory ? "break-words text-hec-small font-semibold" : "font-semibold text-sm"}>{announcement.title}</p>
          )}
          {announcement.body && (
            <div
              className={ivory ? "mt-1 line-clamp-3 text-hec-caption opacity-80" : "text-xs opacity-80 mt-1 line-clamp-3"}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.body) }}
            />
          )}
        </div>
        {announcement.is_dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss announcement"
            className={
              ivory
                ? // The colours may be the admin's: the ring and the hover follow the text colour.
                  "inline-flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center rounded-hec-md transition-opacity duration-hec-1 ease-hec hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
                : "shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
            }
          >
            <X className={ivory ? "h-5 w-5" : "h-3.5 w-3.5"} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
