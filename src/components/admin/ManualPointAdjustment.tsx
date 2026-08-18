import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Minus } from "lucide-react";
import { awardPoints } from "@/lib/pointsHelper";
import { SKILL_CONFIG, BEHAVIOR_CONFIG, CORRECTION_CONFIG, READING_THEORY_CONFIG } from "@/lib/skillConfig";
import { soundManager } from "@/lib/soundManager";
import { ReadingTheoryScoreEntry } from "@/components/shared/ReadingTheoryScoreEntry";

type CategoryType = "skill" | "behavior" | "correction" | "adjustment" | "reading_theory";

export function ManualPointAdjustment() {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [category, setCategory] = useState<CategoryType>("skill");
  const [readingTheoryOpen, setReadingTheoryOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedSubTag, setSelectedSubTag] = useState("");
  const [selectedCorrection, setSelectedCorrection] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active students
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["active-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch active classes
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["active-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Get current skill/behavior config
  const skillConfig = selectedSkill 
    ? (SKILL_CONFIG[selectedSkill] || BEHAVIOR_CONFIG[selectedSkill]) 
    : null;

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedClass || !points) {
      toast({
        title: "Missing information",
        description: "Please fill in student, class, and points",
        variant: "destructive",
      });
      return;
    }

    if (category === "skill" || category === "behavior") {
      if (!selectedSkill) {
        toast({
          title: "Missing skill",
          description: "Please select a skill or behavior",
          variant: "destructive",
        });
        return;
      }
    }

    if (category === "correction" && !selectedCorrection) {
      toast({
        title: "Missing reason",
        description: "Please select a correction reason",
        variant: "destructive",
      });
      return;
    }

    const pointsValue = Number(points);
    if (!Number.isFinite(pointsValue) || pointsValue < -500 || pointsValue > 500) {
      toast({
        title: "Invalid points",
        description: "Points must be between -500 and 500",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine skill key
      let skill: string;
      let subTag: string | undefined;

      if (category === "skill" || category === "behavior") {
        skill = selectedSkill;
        subTag = selectedSubTag || undefined;
      } else if (category === "correction") {
        skill = "correction";
        subTag = selectedCorrection;
      } else {
        skill = "adjustment";
      }

      await awardPoints({
        studentIds: [selectedStudent],
        classId: selectedClass,
        skill,
        points: pointsValue,
        subTag,
        notes: reason || undefined,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["class-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["student-points"] });
      queryClient.invalidateQueries({ queryKey: ["point-history"] });

      soundManager.play(pointsValue > 0 ? "success" : "error");

      toast({
        title: "Success",
        description: `${pointsValue > 0 ? "Added" : "Deducted"} ${Math.abs(pointsValue)} points`,
      });

      // Reset form
      setSelectedStudent("");
      setSelectedClass("");
      setCategory("skill");
      setSelectedSkill("");
      setSelectedSubTag("");
      setSelectedCorrection("");
      setPoints("");
      setReason("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPointsQuick = (value: number) => {
    setPoints(value.toString());
  };

  const handleCategoryChange = (newCategory: CategoryType) => {
    if (newCategory === "reading_theory") {
      if (!selectedClass) {
        toast({ title: "Select a class first", variant: "destructive" });
        return;
      }
      setReadingTheoryOpen(true);
      return;
    }
    setCategory(newCategory);
    setSelectedSkill("");
    setSelectedSubTag("");
    setSelectedCorrection("");
    if (newCategory === "correction") {
      setPoints("-1");
    } else if (points === "-1") {
      setPoints("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Point Adjustment</CardTitle>
        <CardDescription>Add or subtract points with skill tracking and audit trail</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="student">Student *</Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger id="student">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              {studentsLoading ? (
                <div className="p-2 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </div>
              ) : (
                students?.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="class">Class *</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger id="class">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classesLoading ? (
                <div className="p-2 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </div>
              ) : (
                classes?.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <Label>Category *</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "skill", label: "Skill" },
              { key: "behavior", label: "Behavior" },
              { key: "reading_theory", label: "Reading Theory" },
              { key: "correction", label: "Correction" },
              { key: "adjustment", label: "Adjustment" },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleCategoryChange(cat.key as CategoryType)}
                className={`p-2 rounded-lg border text-sm transition-all ${
                  category === cat.key
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Skill/Behavior Selection */}
        {(category === "skill" || category === "behavior") && (
          <div className="space-y-2">
            <Label>{category === "skill" ? "Skill" : "Behavior"} *</Label>
            <div className="grid grid-cols-2 gap-2">
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
                    className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-all ${
                      selectedSkill === key
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-accent/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Reading Theory Selection */}
        {category === "reading_theory" && (
          <div className="space-y-2">
            <Label>Reading Theory Reason *</Label>
            <Select 
              value={selectedSubTag} 
              onValueChange={(val) => {
                setSelectedSkill("reading_theory");
                setSelectedSubTag(val);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {READING_THEORY_CONFIG.subTags.map((tag) => (
                  <SelectItem key={tag.value} value={tag.value}>
                    {tag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sub-tag Selection */}
        {skillConfig && skillConfig.subTags.length > 0 && (
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Select value={selectedSubTag} onValueChange={setSelectedSubTag}>
              <SelectTrigger>
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

        {/* Correction Reason */}
        {category === "correction" && (
          <div className="space-y-2">
            <Label>Correction Reason *</Label>
            <Select value={selectedCorrection} onValueChange={setSelectedCorrection}>
              <SelectTrigger>
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

        <div className="space-y-2">
          <Label htmlFor="points">Points (-500 to 500) *</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPointsQuick(-10)}
              className="flex-1"
            >
              <Minus className="h-4 w-4 mr-1" />
              -10
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPointsQuick(-1)}
              className="flex-1"
            >
              <Minus className="h-4 w-4 mr-1" />
              -1
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPointsQuick(1)}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              +1
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPointsQuick(10)}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              +10
            </Button>
          </div>
          <Input
            id="points"
            type="number"
            min="-500"
            max="500"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Enter custom value"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Additional Notes</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional: Add extra context (recorded in audit trail)"
            rows={3}
          />
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit Adjustment
        </Button>
      </CardContent>
    </Card>
  );
}
