import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Trash2, Edit, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaceholderCard } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALLOCATION_MODES, describeAllocation, staffKey, splitStaffKey } from "@/lib/finance/allocationTarget";

export function ExpendituresManager({ selectedMonth }: { selectedMonth: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  // Who carries this cost in the class report. A one-off could not reach
  // a class at all before - only recurring templates could - so a repair
  // to one room, or a course fee for one assistant, was always billed to
  // the school and that class kept looking cheaper than it was.
  const [allocationMode, setAllocationMode] = useState("none");
  const [allocationClassId, setAllocationClassId] = useState("");
  const [allocationStaff, setAllocationStaff] = useState("");

  const queryClient = useQueryClient();

  const { data: targets } = useQuery({
    queryKey: ["allocation-targets"],
    enabled: dialogOpen,
    queryFn: async () => {
      const [classes, teachers, assistants] = await Promise.all([
        supabase.from("classes").select("id, name, is_active").order("name"),
        supabase.from("teachers").select("id, full_name, is_active").order("full_name"),
        supabase.from("teaching_assistants").select("id, full_name, is_active").order("full_name"),
      ]);
      if (classes.error) throw classes.error;
      if (teachers.error) throw teachers.error;
      if (assistants.error) throw assistants.error;
      return {
        classes: classes.data ?? [],
        staff: [
          ...(teachers.data ?? []).map((x) => ({ key: staffKey(x.id, null), name: x.full_name, kind: "Teacher", active: x.is_active !== false })),
          ...(assistants.data ?? []).map((x) => ({ key: staffKey(null, x.id), name: x.full_name, kind: "Assistant", active: x.is_active !== false })),
        ],
      };
    },
  });

  const { data: expenditures, isLoading } = useQuery({
    queryKey: ["expenditures", selectedMonth],
    queryFn: async () => {
      const startDate = `${selectedMonth}-01`;
      const nextMonth = new Date(startDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endDate = format(nextMonth, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("expenditures")
        .select("*")
        .gte("date", startDate)
        .lt("date", endDate)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        const { error } = await supabase
          .from("expenditures")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("expenditures")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Expenditure updated" : "Expenditure created");
      queryClient.invalidateQueries({ queryKey: ["expenditures"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["class-finance"] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save expenditure");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenditures")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expenditure deleted");
      queryClient.invalidateQueries({ queryKey: ["expenditures"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete expenditure");
    },
  });

  const handleSave = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!category.trim()) {
      toast.error("Please enter a category");
      return;
    }
    if (allocationMode === "class" && !allocationClassId) {
      toast.error("Choose which class carries this cost");
      return;
    }
    if (allocationMode === "staff" && !allocationStaff) {
      toast.error("Choose whose classes carry this cost");
      return;
    }

    const staff = splitStaffKey(allocationStaff);
    saveMutation.mutate({
      amount: Math.round(parseFloat(amount)),
      category: category.trim(),
      memo: memo.trim() || null,
      date: format(date, "yyyy-MM-dd"),
      allocation_mode: allocationMode,
      allocation_class_id: allocationMode === "class" ? allocationClassId || null : null,
      allocation_teacher_id: allocationMode === "staff" ? staff.teacherId : null,
      allocation_assistant_id: allocationMode === "staff" ? staff.assistantId : null,
    });
  };

  const handleEdit = (exp: any) => {
    setEditingId(exp.id);
    setAmount(exp.amount.toString());
    setCategory(exp.category);
    setMemo(exp.memo || "");
    setDate(new Date(exp.date));
    setAllocationMode(exp.allocation_mode ?? "none");
    setAllocationClassId(exp.allocation_class_id ?? "");
    setAllocationStaff(staffKey(exp.allocation_teacher_id, exp.allocation_assistant_id));
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setAmount("");
    setCategory("");
    setMemo("");
    setDate(new Date());
    setAllocationMode("none");
    setAllocationClassId("");
    setAllocationStaff("");
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Expenditures</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Expenditure
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Add"} Expenditure</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount (VND)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Supplies, Utilities, etc."
                />
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                <Label>Who pays for this?</Label>
                <Select value={allocationMode} onValueChange={setAllocationMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALLOCATION_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ALLOCATION_MODES.find((m) => m.value === allocationMode)?.hint}
                </p>
                {allocationMode === "class" && (
                  <Select value={allocationClassId} onValueChange={setAllocationClassId}>
                    <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                    <SelectContent>
                      {(targets?.classes ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.is_active === false ? " (archived)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {allocationMode === "staff" && (
                  <Select value={allocationStaff} onValueChange={setAllocationStaff}>
                    <SelectTrigger><SelectValue placeholder="Choose a teacher or assistant" /></SelectTrigger>
                    <SelectContent>
                      {(targets?.staff ?? []).map((x) => (
                        <SelectItem key={x.key} value={x.key}>
                          {x.name} · {x.kind}{x.active ? "" : " (archived)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>Memo (optional)</Label>
                <Input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Additional notes"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1">
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PlaceholderCard rows={4} />
        ) : expenditures && expenditures.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenditures.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell>{format(new Date(exp.date), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    {exp.category}
                    {exp.allocation_mode && exp.allocation_mode !== "none" && (
                      <span className="block text-xs text-muted-foreground">
                        {describeAllocation(exp.allocation_mode)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{exp.memo || "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatVND(exp.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(exp)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(exp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No expenditures recorded for this month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
