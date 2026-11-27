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
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const { studentId } = useStudentProfile();
  const { user, role } = useAuth();
  // The bell is in every area's header: the system's classes only on a listed
  // route, the old ones (verbatim) everywhere else.
  const ivory = useIvory();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", studentId, role],
    queryFn: async () => {
      if (!user) return [];

      // Admins: their own notifications. The "Admins can manage all
      // notifications" policy lets an admin read everyone's, so the filter on
      // user_id is what keeps families' and teachers' notes out of this bell.
      if (role === "admin") {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data || [];
      }

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
          .or(`type.eq.homework_submitted,type.eq.journal_collaboration,type.eq.economy_request,type.eq.lesson_report_ready`)
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
    enabled: !!studentId || role === "teacher" || role === "admin",
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
    if (notification.type === 'lesson_report_ready' && metadata.session_id) {
      // The class report a lesson's transcript and class work built (20261127100000): review and approve it.
      navigate(`/teacher/lesson-report/${metadata.session_id}`);
    } else if (notification.type === 'class_access_request' && metadata.class_id) {
      // A teacher's "Contact Admin" (request_class_access): open the class.
      navigate(`/admin/classes/${metadata.class_id}`);
    } else if (notification.type === 'economy_request' && metadata.class_id) {
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
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={ivory ? "w-80 p-0 md:w-96" : "w-80 md:w-96"} align="end" aria-label={ivory ? "Notifications" : undefined}>
        <div className={ivory ? "space-y-2" : "space-y-3"}>
          <div className={ivory ? "sticky top-0 flex items-center justify-between gap-2 border-b border-hec-line bg-hec-raised px-4 py-2" : "flex items-center justify-between sticky top-0 bg-popover pb-2 border-b"}>
            <h4 className={ivory ? "text-hec-h3 font-semibold text-hec-ink" : "font-semibold text-base"}>Notifications</h4>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className={ivory ? "px-3 text-hec-small" : "h-8 text-xs"}
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
            ) : (
              <div className={ivory ? "space-y-2 px-2 pb-2" : "space-y-2 pr-2"}>
                {notifications.map((notification: any) => {
                  const metadata = notification.metadata || {};
                  const isHomework = notification.type === 'homework_assigned' || notification.type === 'homework_graded' || notification.type === 'homework_submitted';
                  const isJournal = notification.type === 'new_journal' || notification.type === 'journal_collaboration';
                  
                  return (
                    <div
                      key={notification.id}
                      className={
                        ivory
                          ? cn(
                              // Unread = brass edge + the brass dot + "Unread" for a screen reader; no gradient, no pulse.
                              "group relative cursor-pointer rounded-hec-md border p-3 text-hec-ink transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken",
                              notification.is_read ? "border-hec-line bg-hec-surface" : "border-hec-brass/40 bg-hec-raised shadow-hec-1",
                            )
                            : `group relative p-3 rounded-hec-md border cursor-pointer transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken ${
                        notification.is_read ? "border-hec-line bg-hec-surface" : "border-hec-brass/40 bg-hec-raised shadow-hec-1"
                      }`
                      }
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={ivory ? "shrink-0 rounded-full bg-hec-sunken p-2 text-hec-ink-soft" : "shrink-0 rounded-full bg-hec-sunken p-2 text-hec-ink-soft"}>
                          {isHomework && <Bell className={"h-4 w-4"} />}
                          {isJournal && <Bell className={"h-4 w-4"} />}
                          {!isHomework && !isJournal && <Bell className="h-4 w-4" />}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          {/* The title can carry a child's name: it wraps in the system, never clamped. */}
                          <p className={ivory ? "whitespace-normal break-words text-hec-small font-semibold text-hec-ink" : "text-sm font-semibold leading-tight line-clamp-2"}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className={ivory ? "break-words text-hec-caption font-normal text-hec-ink-soft" :"text-xs text-muted-foreground line-clamp-2"}>
                              {notification.message}
                            </p>
                          )}
                          {metadata.student_name && (
                            <p className={ivory ? "whitespace-normal break-words text-hec-caption text-hec-ink" : "text-xs font-medium text-primary"}>
                              👤 {metadata.student_name}
                            </p>
                          )}
                          {metadata.class_name && (
                            <p className={ivory ? "whitespace-normal break-words text-hec-caption text-hec-ink" : "text-xs font-medium text-primary"}>
                              📚 {metadata.class_name}
                            </p>
                          )}
                          {metadata.homework_title && (
                            <p className={ivory ? "break-words text-hec-caption text-hec-ink-soft" : "text-xs font-medium text-muted-foreground"}>
                              📝 {metadata.homework_title}
                            </p>
                          )}
                          <p className={ivory ? "text-hec-caption font-normal text-hec-ink-soft" : "text-xs text-muted-foreground"}>
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>

                        {!notification.is_read && (ivory ? (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-hec-brass">
                            <span className="sr-only">Unread</span>
                          </span>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        ))}
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
