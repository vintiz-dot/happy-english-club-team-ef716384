import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PayRateHistory } from "@/components/admin/staff/PayRateHistory";

interface TeacherEditDrawerProps {
  teacher: any;
  onClose: () => void;
}

export function TeacherEditDrawer({ teacher, onClose }: TeacherEditDrawerProps) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (teacher) {
      setFullName(teacher.full_name || "");
      setEmail(teacher.email || "");
      setPhone(teacher.phone || "");
      setBio(teacher.bio || "");
      setIsActive(teacher.is_active ?? true);
    }
  }, [teacher]);

  const handleSave = async () => {
    if (!teacher?.id) return;

    setIsSaving(true);
    try {
      // Both rate columns are written every time, with the one that is not
      // in force set to 0. Leaving the old number behind would mean a
      // teacher switched to per-session still carries an hourly rate that
      // every payroll screen would be free to display.
      const { error } = await supabase
        .from("teachers")
        .update({
          full_name: fullName,
          email,
          phone,
          bio,
          is_active: isActive,
        })
        .eq("id", teacher.id);

      if (error) throw error;

      toast.success("Teacher updated successfully");
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update teacher");
    } finally {
      setIsSaving(false);
    }
  };

  const isArchived = teacher?.is_active === false;

  /**
   * Archive, not delete.
   *
   * The button here used to issue a hard DELETE, caught SQLSTATE 23503 and
   * told the admin "this teacher has lessons on record". That guard covered
   * two of the six foreign keys pointing at `teachers`; the other four are
   * ON DELETE CASCADE and raise nothing, so a teacher who had only ever
   * co-taught was erased along with their payroll history, their bank
   * details and every record that they were in the room.
   *
   * Archiving keeps all of it. `is_active = false` is enough on its own -
   * sync_staff_archived_at (20261020091000) stamps archived_at from the
   * trigger, so there is no second field for a call site to forget.
   *
   * The database refuses a hard delete for anyone with history now
   * (block_delete_of_staff_with_history), so this is no longer the only
   * thing standing between an admin and a destroyed payroll record - but
   * the right action is still the one on the screen.
   */
  const handleArchive = async () => {
    if (!teacher?.id) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase
        .from("teachers")
        .update({ is_active: !isArchived })
        .eq("id", teacher.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("You don't have permission to change this teacher.");
      }
      toast.success(
        isArchived
          ? `${teacher.full_name} is back on the staff list`
          : `${teacher.full_name} archived — their records and past payroll are kept`,
      );
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setConfirmOpen(false);
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to archive teacher");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={!!teacher} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Teacher</SheetTitle>
          <SheetDescription>Update teacher information</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <PayRateHistory
            staffId={teacher.id}
            staffType="teacher"
            staff={teacher}
          />

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Active Status</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>

          <Button
            variant={isArchived ? "outline" : "destructive"}
            className="w-full"
            disabled={isDeleting}
            onClick={() => setConfirmOpen(true)}
          >
            {isArchived ? (
              <ArchiveRestore className="h-4 w-4 mr-2" />
            ) : (
              <Archive className="h-4 w-4 mr-2" />
            )}
            {isDeleting
              ? "Working..."
              : isArchived
                ? "Restore Teacher"
                : "Archive Teacher"}
          </Button>
        </div>
      </SheetContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArchived ? `Restore ${teacher?.full_name}?` : `Archive ${teacher?.full_name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived ? (
                <>
                  They go back on the staff list and can be assigned to classes again. Their
                  access to class data is restored too.
                </>
              ) : (
                <>
                  Nothing is deleted. Their lessons, payroll history and bank details stay exactly
                  as they are, and they still appear by name on lessons they already taught — so
                  the month they leave is still paid correctly.
                  <br />
                  <br />
                  They come off the staff list, lose access to class data, and stop being offered
                  for new sessions. You can restore them at any time from the Archived tab.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className={isArchived ? undefined : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {isArchived ? "Restore" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
