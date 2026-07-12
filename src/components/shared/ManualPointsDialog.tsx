import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Sparkles, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { awardPoints } from "@/lib/pointsHelper";
import { SKILL_CONFIG, BEHAVIOR_CONFIG, CORRECTION_CONFIG } from "@/lib/skillConfig";
import { soundManager } from "@/lib/soundManager";
import { ReadingTheoryScoreEntry } from "./ReadingTheoryScoreEntry";

interface ManualPointsDialogProps {
  classId: string;
  trigger?: React.ReactNode;
  isAdmin?: boolean;
}

type CategoryType = "skill" | "behavior" | "homework" | "correction" | "reading_theory";

export function ManualPointsDialog({ classId, trigger, isAdmin = false }: ManualPointsDialogProps) {
  const [open, setOpen] = useState(false);
  const [readingTheoryOpen, setReadingTheoryOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [category, setCategory] = useState<CategoryType>("skill");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedSubTag, setSelectedSubTag] = useState("");
  const [selectedHomework, setSelectedHomework] = useState("");
  const [selectedCorrection, setSelectedCorrection] = useState("");
  const [points, setPoints] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Fetch enrolled students for the class
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["enrolled-students", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          students!inner(
            id,
            full_name,
            avatar_url,
            is_active
          )
        `)
        .eq("class_id", classId)
        .is("end_date", null);

      if (error) throw error;
      return data
        ?.map((e: any) => e.students)
        .filter((s: any) => s.is_active)
        .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
    },
    enabled: open,
  });

  // Fetch active homework for the class
  const { data: homeworks, isLoading: homeworksLoading } = useQuery({
    queryKey: ["class-homeworks", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homeworks")
        .select("id, title, due_date")
        .eq("class_id", classId)
        .order("due_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: open && category === "homework",
  });

  // Get current skill/behavior config
  const skillConfig = selectedSkill 
    ? (SKILL_CONFIG[selectedSkill] || BEHAVIOR_CONFIG[selectedSkill]) 
    : null;

  const addPointsMutation = useMutation({
    mutationFn: async () => {
      const pointsValue = parseInt(points);
      if (!selectedStudent || !points) {
        throw new Error("Please select a student and enter points");
      }

      if (!Number.isFinite(pointsValue)) {
        throw new Error("Points must be a valid number");
      }

      if (category === "skill" || category === "behavior") {
        if (!selectedSkill) throw new Error("Please select a skill or behavior");
      }

      if (category === "homework" && !selectedHomework) {
        throw new Error("Please select a homework assignment");
      }

      if (category === "correction" && !selectedCorrection) {
        throw new Error("Please select a correction reason");
      }

      // Determine skill key
      let skill: string;
      let subTag: string | undefined;
      let homeworkId: string | undefined;
      let homeworkTitle: string | undefined;

      if (category === "skill" || category === "behavior") {
        skill = selectedSkill;
        subTag = selectedSubTag || undefined;
      } else if (category === "homework") {
        skill = "homework";
        homeworkId = selectedHomework;
        homeworkTitle = homeworks?.find(hw => hw.id === selectedHomework)?.title;
      } else {
        skill = "correction";
        subTag = selectedCorrection;
      }

      await awardPoints({
        studentIds: [selectedStudent],
        classId,
        skill,
        points: pointsValue,
        subTag,
        homeworkId,
        homeworkTitle,
        notes: notes || undefined,
      });

      return pointsValue;
    },
    onSuccess: (pointsValue) => {
      queryClient.invalidateQueries({ queryKey: ["class-leaderboard", classId] });
      queryClient.invalidateQueries({ queryKey: ["monthly-leader"] });
      queryClient.invalidateQueries({ queryKey: ["student-points"] });
      queryClient.invalidateQueries({ queryKey: ["point-history"] });
      queryClient.invalidateQueries({ queryKey: ["point-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["available-months"] });
      queryClient.invalidateQueries({ queryKey: ["live-assessment-students"] });
      
      // Play sound
      soundManager.play(pointsValue > 0 ? "success" : "error");
      
      toast.success(
        `${pointsValue > 0 ? "Added" : "Deducted"} ${Math.abs(pointsValue)} points`,
        {
          description: "Leaderboard updated in real-time",
          icon: <Sparkles className="h-4 w-4" />,
        }
      );
      
      // Reset form
      resetForm();
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to add points", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setSelectedStudent("");
    setCategory("skill");
    setSelectedSkill("");
    setSelectedSubTag("");
    setSelectedHomework("");
    setSelectedCorrection("");
    setPoints("");
    setNotes("");
  };

  const handleSubmit = () => {
    addPointsMutation.mutate();
  };

  const setPointsQuick = (value: number) => {
    setPoints(value.toString());
  };

  // When category changes, reset related selections
  const handleCategoryChange = (newCategory: CategoryType) => {
    // If reading theory, open the score entry dialog instead
    if (newCategory === "reading_theory") {
      setReadingTheoryOpen(true);
      return;
    }
    setCategory(newCategory);
    setSelectedSkill("");
    setSelectedSubTag("");
    setSelectedHomework("");
    setSelectedCorrection("");
    // Set default points for correction
    if (newCategory === "correction") {
      setPoints("-1");
    } else if (points === "-1") {
      setPoints("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Trophy className="h-4 w-4" />
            Add Points
          </Button>
        )}
      </SheetTrigger>
      {/* Side sheet keeps the leaderboard visible & clickable behind it on
          desktop; falls back to a bottom sheet on mobile so the keyboard
          doesn't fight for space at the top. */}
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "h-[92vh] rounded-t-2xl overflow-y-auto p-5"
            : "w-[480px] sm:max-w-[480px] overflow-y-auto p-6"
        }
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Manual Point Addition
          </SheetTitle>
          <SheetDescription>
            Award or deduct points for students. Points are tracked for analytics and leaderboards.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="student" className="text-base font-semibold">
              Student *
            </Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger id="student" className="h-12">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {studentsLoading ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : (
                  students?.map((student: any) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Category *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { key: "skill", label: "Skill", desc: "Speaking, Listening, etc." },
                { key: "behavior", label: "Behavior", desc: "Focus, Teamwork" },
                { key: "reading_theory", label: "Reading Theory", desc: "Vocabulary, Grammar" },
                { key: "homework", label: "Homework", desc: "Assignment points" },
                { key: "correction", label: "Correction", desc: "Deduct points" },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleCategoryChange(cat.key as CategoryType)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    category === cat.key
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:bg-accent/50"
                  }`}
                >
                  <div className="font-medium text-sm">{cat.label}</div>
                  <div className="text-xs text-muted-foreground">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Skill/Behavior Selection */}
          {(category === "skill" || category === "behavior") && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {category === "skill" ? "Skill" : "Behavior"} *
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(category === "skill" ? SKILL_CONFIG : BEHAVIOR_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedSkill(key);
                        setSelectedSubTag("");
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                        selectedSkill === key
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border hover:bg-accent/50"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-tag Selection */}
          {skillConfig && skillConfig.subTags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Reason (optional)
              </Label>
              <Select value={selectedSubTag} onValueChange={setSelectedSubTag}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select specific reason" />
                </SelectTrigger>
                <SelectContent>
                  {skillConfig.subTags.map((tag) => (
                    <SelectItem key={tag.value} value={tag.value}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Homework Selection */}
          {category === "homework" && (
            <div className="space-y-2">
              <Label htmlFor="homework" className="text-base font-semibold">
                Homework Assignment *
              </Label>
              <Select value={selectedHomework} onValueChange={setSelectedHomework}>
                <SelectTrigger id="homework" className="h-12">
                  <SelectValue placeholder="Select homework" />
                </SelectTrigger>
                <SelectContent>
                  {homeworksLoading ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : homeworks && homeworks.length > 0 ? (
                    homeworks.map((hw: any) => (
                      <SelectItem key={hw.id} value={hw.id}>
                        {hw.title} {hw.due_date && `(Due: ${new Date(hw.due_date).toLocaleDateString()})`}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No homework assignments found for this class
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Correction Reason */}
          {category === "correction" && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Correction Reason *
              </Label>
              <Select value={selectedCorrection} onValueChange={setSelectedCorrection}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {CORRECTION_CONFIG.subTags.map((tag) => (
                    <SelectItem key={tag.value} value={tag.value}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Points Amount */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Points Amount *</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setPointsQuick(-10)}
                className="h-14 flex flex-col"
              >
                <Minus className="h-4 w-4 text-destructive" />
                <span className="text-xs mt-1">-10</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setPointsQuick(-1)}
                className="h-14 flex flex-col"
              >
                <Minus className="h-4 w-4 text-destructive" />
                <span className="text-xs mt-1">-1</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setPointsQuick(1)}
                className="h-14 flex flex-col"
              >
                <Plus className="h-4 w-4 text-green-600" />
                <span className="text-xs mt-1">+1</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setPointsQuick(10)}
                className="h-14 flex flex-col"
              >
                <Plus className="h-4 w-4 text-green-600" />
                <span className="text-xs mt-1">+10</span>
              </Button>
            </div>
            <Input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Or enter custom amount"
              className="h-12 text-center text-lg font-semibold"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-semibold">
              Additional Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: Add extra context for the points"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={addPointsMutation.isPending}
            size="lg"
            className="w-full h-12 text-base"
          >
            {addPointsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Submit Points
              </>
            )}
          </Button>
        </div>
      </SheetContent>

      {/* Reading Theory Score Entry Dialog */}
      <ReadingTheoryScoreEntry
        classId={classId}
        open={readingTheoryOpen}
        onOpenChange={setReadingTheoryOpen}
      />
    </Sheet>
  );
}
