import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { useAuth } from "@/hooks/useAuth";
import { useIvory } from "@/hooks/useIvory";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

export default function NotificationBell() {
  const { studentId } = useStudentProfile();
  const { user, role } = useAuth();
  // Shell, every area: ivory on a listed route (src/lib/ivoryScope.ts), today's classes elsewhere.
  const ivory = useIvory();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", studentId, role],
    queryFn: async () => {
      if (!user) return [];

      // For teachers, get notifications related to their classes
      if (role === "teacher") {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (!teacher) return [];

        // Get teacher's classes
        const { data: sessions } = await supabase
          .from("sessions")
          .select("class_id")
          .eq("teacher_id", teacher.id);

        const classIds = Array.from(new Set(sessions?.map(s => s.class_id) || []));

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .or(`type.eq.homework_submitted,type.eq.journal_collaboration,type.eq.economy_request`)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        
        // Filter to only show notifications for teacher's classes
        const filtered = data?.filter((n: any) => {
          const metadata = n.metadata || {};
          return classIds.includes(metadata.class_id);
        }) || [];

        return filtered;
      }
      
      // For students
      if (!studentId) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`metadata->>student_id.eq.${studentId},metadata->>student_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId || role === "teacher",
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", studentId, role] });
    },
  });

  const handleNotificationClick = (notification: any) => {
    markAsReadMutation.mutate(notification.id);
    
    const metadata = notification.metadata || {};
    
    // Handle different notification types
    if (notification.type === 'economy_request' && metadata.class_id) {
      navigate(`/classes/${metadata.class_id}`);
    } else if (notification.type === 'homework_assigned' || notification.type === 'homework_graded') {
      navigate("/student/assignments");
    } else if (notification.type === 'homework_submitted') {
      navigate("/teacher/assignments");
    } else if (notification.type === 'journal_collaboration') {
      navigate("/teacher/journal");
    } else if (notification.journal_id) {
      // Navigate to appropriate journal page based on type
      if (metadata.journal_type === "student") {
        navigate("/student/journal");
      } else if (metadata.journal_type === "class") {
        navigate("/teacher/journal");
      } else {
        navigate("/journal");
      }
    }
    
    setOpen(false);
  };

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const notificationIds = notifications.map((n: any) => n.id);
      if (notificationIds.length === 0) return;
      
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", notificationIds)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", studentId, role] });
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 &&
            (ivory ? (
              // The count is ink, not red: red is only for danger (DESIGN_SYSTEM s.14).
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-hec-action px-1 text-hec-caption font-semibold leading-none tabular-nums text-hec-on-action">
                {unreadCount}
              </span>
            ) : (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount}
              </Badge>
            ))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96" align="end">
        <div className="space-y-3">
          <div className={ivory ? "sticky top-0 flex items-center justify-between gap-2 border-b border-hec-line bg-hec-raised pb-2" : "flex items-center justify-between sticky top-0 bg-popover pb-2 border-b"}>
            <h4 className={ivory ? "font-display text-hec-h3 font-medium text-hec-ink" : "font-semibold text-base"}>Notifications</h4>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className={ivory ? undefined : "h-8 text-xs"}
                onClick={() => markAllAsReadMutation.mutate()}
              >
                Mark all read
              </Button>
            )}
          </div>

          <ScrollArea className="h-[min(70vh,500px)]">
            {notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Bell className={ivory ? "mx-auto mb-3 h-12 w-12 text-hec-ink-faint" : "h-12 w-12 mx-auto mb-3 text-muted-foreground/50"} />
                <p className={ivory ? "text-hec-small text-hec-ink-soft" : "text-sm text-muted-foreground"}>No notifications yet</p>
              </div>
            ) : ivory ? (
              <div className="space-y-2 pr-2">
                {notifications.map((notification: any) => {
                  const metadata = notification.metadata || {};
                  // Same row, same handler as below; a <button> so it is reachable by keyboard.
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={`flex w-full min-h-hec-target items-start gap-3 rounded-hec-md border p-3 text-left transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken ${FOCUS} ${
                        notification.is_read ? "border-transparent" : "border-hec-line bg-hec-surface"
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <span className="shrink-0 rounded-full bg-hec-sunken p-2 text-hec-ink-soft">
                        <Bell className="h-4 w-4" />
                      </span>

                      <span className="block min-w-0 flex-1 space-y-1">
                        <span className="block text-hec-small font-semibold text-hec-ink line-clamp-2">
                          {notification.title}
                        </span>
                        {notification.message && (
                          <span className="block text-hec-caption text-hec-ink-soft line-clamp-2">
                            {notification.message}
                          </span>
                        )}
                        {metadata.student_name && (
                          <span className="block break-words text-hec-caption font-medium text-hec-ink">
                            👤 {metadata.student_name}
                          </span>
                        )}
                        {metadata.class_name && (
                          <span className="block break-words text-hec-caption font-medium text-hec-ink">
                            📚 {metadata.class_name}
                          </span>
                        )}
                        {metadata.homework_title && (
                          <span className="block text-hec-caption font-medium text-hec-ink-soft">
                            📝 {metadata.homework_title}
                          </span>
                        )}
                        <span className="block text-hec-caption text-hec-ink-soft">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </span>

                      {!notification.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-hec-brass" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {notifications.map((notification: any) => {
                  const metadata = notification.metadata || {};
                  const isHomework = notification.type === 'homework_assigned' || notification.type === 'homework_graded' || notification.type === 'homework_submitted';
                  const isJournal = notification.type === 'new_journal' || notification.type === 'journal_collaboration';
                  
                  return (
                    <div
                      key={notification.id}
                      className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        notification.is_read
                          ? "bg-muted/30 hover:bg-muted/50"
                          : "bg-gradient-to-br from-primary/15 to-primary/5 hover:from-primary/20 hover:to-primary/10 shadow-sm"
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-full p-2 ${
                          isHomework ? 'bg-blue-100 dark:bg-blue-900/30' : 
                          isJournal ? 'bg-blue-100 dark:bg-blue-900/30' :
                          'bg-muted'
                        }`}>
                          {isHomework && <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                          {isJournal && <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                          {!isHomework && !isJournal && <Bell className="h-4 w-4" />}
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-semibold leading-tight line-clamp-2">
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          {metadata.student_name && (
                            <p className="text-xs font-medium text-primary">
                              👤 {metadata.student_name}
                            </p>
                          )}
                          {metadata.class_name && (
                            <p className="text-xs font-medium text-primary">
                              📚 {metadata.class_name}
                            </p>
                          )}
                          {metadata.homework_title && (
                            <p className="text-xs font-medium text-muted-foreground">
                              📝 {metadata.homework_title}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
