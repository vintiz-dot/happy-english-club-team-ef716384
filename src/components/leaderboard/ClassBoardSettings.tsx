/**
 * The leaderboard-style card, for a class settings page.
 *
 * A thin card around BoardStylePicker so both the admin class page and
 * the teacher one can drop in one component and get the same thing. It
 * fetches `age_range` itself purely to offer a suggestion — the picker
 * works fine without it, and the fetch failing is not worth surfacing.
 *
 * Placement is what enforces "only teachers assigned to this class": on
 * the teacher side this renders inside TeacherClassDetail, which already
 * refuses to render at all unless the access check for this class passed.
 * The database refuses the write independently, so the gate is not relying
 * on the screen being hard to reach.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ClassScreen } from "@/components/classroom-tools/studio/ClassScreen";
import { BoardStylePicker } from "./BoardStylePicker";
import { ProjectedBoard } from "./ProjectedBoard";

export function ClassBoardSettings({
  classId,
  canEdit = true,
}: {
  classId: string;
  canEdit?: boolean;
}) {
  const [previewing, setPreviewing] = useState(false);

  const { data: ageRange } = useQuery<string | null>({
    queryKey: ["class-age-range", classId],
    enabled: !!classId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("age_range")
        .eq("id", classId)
        .maybeSingle();
      return data?.age_range ?? null;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" aria-hidden />
          Leaderboard
        </CardTitle>
        <CardDescription>
          How this class's points board looks. Pick the one that suits the age of the
          children in the room — you know that better than the timetable does.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BoardStylePicker classId={classId} ageRange={ageRange} canEdit={canEdit} />

        {/* A swatch only goes so far. This is the real board, at real size,
            with this class's real points — which is the only way to judge
            whether it suits the children in the room. */}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPreviewing(true)}>
          <Monitor className="h-3.5 w-3.5" aria-hidden />
          See it full size
        </Button>
      </CardContent>

      <ClassScreen open={previewing} onClose={() => setPreviewing(false)} title="Leaderboard">
        <ProjectedBoard classId={classId} />
      </ClassScreen>
    </Card>
  );
}
