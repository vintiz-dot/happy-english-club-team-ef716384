import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const NO_FAMILY = "__none__";

export function StudentEditDrawer({ student, open, onOpenChange }: any) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: undefined as Date | undefined,
    family_id: NO_FAMILY,
    notes: "",
    is_active: true,
  });
  const [showNewFamily, setShowNewFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");

  const queryClient = useQueryClient();

  // Keep the form in sync with the student record (it may load after mount)
  useEffect(() => {
    if (!student) return;
    setFormData({
      full_name: student.full_name || "",
      email: student.email || "",
      phone: student.phone || "",
      date_of_birth: student.date_of_birth ? new Date(student.date_of_birth) : undefined,
      family_id: student.family_id || NO_FAMILY,
      notes: student.notes || "",
      is_active: student.is_active ?? true,
    });
    setShowNewFamily(false);
    setNewFamilyName("");
  }, [student?.id, student?.updated_at, open]);

  const { data: families } = useQuery({
    queryKey: ["families-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const createFamilyMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("families")
        .insert({ name })
        .select("id, name")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (family) => {
      toast.success(`Family "${family.name}" created`);
      queryClient.invalidateQueries({ queryKey: ["families-active"] });
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["families-list"] });
      setFormData((prev) => ({ ...prev, family_id: family.id }));
      setShowNewFamily(false);
      setNewFamilyName("");
    },
    onError: (error: any) => toast.error(error.message || "Failed to create family"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null,
        is_active: formData.is_active,
        family_id: formData.family_id === NO_FAMILY ? null : formData.family_id,
        date_of_birth: formData.date_of_birth ? format(formData.date_of_birth, "yyyy-MM-dd") : null,
      };

      const { data, error } = await supabase
        .from("students")
        .update(payload)
        .eq("id", student.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No changes were saved — your account may not have permission to edit this student.");
      }
    },
    onSuccess: () => {
      toast.success("Student updated successfully");
      queryClient.invalidateQueries({ queryKey: ["student-detail", student.id] });
      queryClient.invalidateQueries({ queryKey: ["student-family", student.id] });
      queryClient.invalidateQueries({ queryKey: ["students-list"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["families-list"] });
      queryClient.invalidateQueries({ queryKey: ["family-detail"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update student");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Student</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <Label>Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date_of_birth ? format(formData.date_of_birth, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date_of_birth}
                  onSelect={(date) => setFormData({ ...formData, date_of_birth: date })}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="family_id">Family (link siblings together)</Label>
            <Select
              value={formData.family_id}
              onValueChange={(value) => setFormData({ ...formData, family_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select family" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FAMILY}>No family</SelectItem>
                {families?.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showNewFamily ? (
              <div className="flex gap-2">
                <Input
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  placeholder="New family name (e.g. Nguyen Family)"
                />
                <Button
                  type="button"
                  onClick={() => newFamilyName.trim() && createFamilyMutation.mutate(newFamilyName.trim())}
                  disabled={createFamilyMutation.isPending}
                >
                  Create
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowNewFamily(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNewFamily(true)}>
                <Plus className="h-4 w-4 mr-1" /> New family
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Students placed in the same family are treated as siblings for discounts and family billing.
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="is_active">Status</Label>
            <Select
              value={formData.is_active ? "active" : "inactive"}
              onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Updating..." : "Update Student"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
