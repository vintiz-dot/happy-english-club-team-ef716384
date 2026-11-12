import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import type { Announcement } from "@/hooks/useAnnouncements";
import { useIvory } from "@/hooks/useIvory";

interface Props {
  announcement: Announcement;
  onDismiss?: () => void;
}

// Announcements render on every area (App.tsx, above the routes). On a route in the
// "Ivory" system they take its classes; everywhere else they keep exactly the old ones.
// The colours an admin chose (style_config) stay inline in both.
export const BannerAnnouncement = ({ announcement, onDismiss }: Props) => {
  const ivory = useIvory();
  const reduceMotion = useReducedMotion();
  const config = announcement.style_config || {};
  const bg = config.bg || "hsl(var(--primary))";
  const text = config.text || "hsl(var(--primary-foreground))";
  const animation = config.animation;

  return (
    <motion.div
      initial={ivory ? { opacity: 0 } : { height: 0, opacity: 0 }}
      animate={ivory ? { opacity: 1 } : { height: "auto", opacity: 1 }}
      exit={ivory ? { opacity: 0 } : { height: 0, opacity: 0 }}
      transition={ivory ? { duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] } : { type: "spring", stiffness: 300, damping: 30 }}
      className={`w-full overflow-hidden ${animation === "pulse" ? "animate-pulse" : ""}`}
      style={{ background: bg, color: text }}
    >
      <div className={ivory ? "container mx-auto flex items-center gap-4 px-4 py-2" : "container mx-auto px-4 py-3 flex items-center gap-4"}>
        {announcement.image_url && (
          <img
            src={announcement.image_url}
            alt=""
            className={ivory ? "h-10 w-10 shrink-0 rounded-hec-sm object-cover" : "h-10 w-10 rounded-lg object-cover shrink-0"}
            loading="eager"
          />
        )}
        <div className={ivory ? "min-w-0 flex-1 py-1" : "flex-1 min-w-0"}>
          {announcement.title && (
            <p className={ivory ? "break-words text-hec-small font-semibold" : "font-semibold text-sm"}>{announcement.title}</p>
          )}
          {announcement.body && (
            <div
              className={ivory ? "line-clamp-2 text-hec-small opacity-90" : "text-sm opacity-90 line-clamp-2"}
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
                ? // The bar's colours are the admin's: the ring and the hover follow its text colour.
                  "inline-flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center rounded-hec-md transition-opacity duration-hec-1 ease-hec hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
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
