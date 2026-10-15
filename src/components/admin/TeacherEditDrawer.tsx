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
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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

interface TeacherEditDrawerProps {
  teacher: any;
  onClose: () => void;
}

export function TeacherEditDrawer({ teacher, onClose }: TeacherEditDrawerProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [payType, setPayType] = useState<"hourly" | "per_session">("hourly");
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
      setHourlyRate(teacher.hourly_rate_vnd?.toString() || "");
      setPayType(teacher.pay_type === "per_session" ? "per_session" : "hourly");
      setBio(teacher.bio || "");
      setIsActive(teacher.is_active ?? true);
    }
  }, [teacher]);

  const handleSave = async () => {
    if (!teacher?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("teachers")
        .update({
          full_name: fullName,
          email,
          phone,
          hourly_rate_vnd: parseInt(hourlyRate),
          pay_type: payType,
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

  const handleDelete = async () => {
    if (!teacher?.id) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", teacher.id)
        .select("id");
      if (error) {
        if (error.code === "23503") {
          throw new Error(
            "This teacher has lessons or classes on record, so they can't be deleted. Set them to inactive instead."
          );
        }
        throw error;
      }
      if (!data || data.length === 0) throw new Error("You don't have permission to delete this teacher.");
      toast.success("Teacher deleted");
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      onClose();
      navigate("/teachers");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete teacher");
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

          <div>
            <Label>Pay Type</Label>
            <div className="flex gap-2 mt-1 mb-3">
              {([["hourly", "Per hour"], ["per_session", "Per session"]] as const).map(([v, l]) => (
                <Button key={v} type="button" size="sm" variant={payType === v ? "default" : "outline"} onClick={() => setPayType(v)}>
                  {l}
                </Button>
              ))}
            </div>
            <Label htmlFor="hourlyRate">{payType === "per_session" ? "Rate per Session (VND)" : "Hourly Rate (VND)"}</Label>
            <Input
              id="hourlyRate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </div>

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
            variant="destructive"
            className="w-full"
            disabled={isDeleting}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? "Deleting..." : "Delete Teacher"}
          </Button>
        </div>
      </SheetContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {teacher?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the teacher. Teachers who have lessons or classes on record
              can't be deleted — set them to inactive instead so payroll history stays intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
