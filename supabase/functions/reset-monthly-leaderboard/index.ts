import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { targetMonth } = await req.json().catch(() => ({}));
    
    const monthToArchive = targetMonth || (() => {
      const now = new Date();
      now.setMonth(now.getMonth() - 1);
      return now.toISOString().slice(0, 7);
    })();

    console.log(`Starting monthly leaderboard reset for month: ${monthToArchive}`);

    // Get classes with economy_mode enabled — these skip the reset
    const { data: economyClasses } = await supabase
      .from("classes")
      .select("id")
      .eq("economy_mode", true);

    const economyClassIds = (economyClasses || []).map((c: any) => c.id);
    console.log(`Skipping ${economyClassIds.length} classes with economy_mode enabled`);

    // Call the database function to archive and reset
    const { data, error } = await supabase.rpc('archive_and_reset_monthly_leaderboard', {
      target_month: monthToArchive
    });

    if (error) {
      console.error('Error resetting leaderboard:', error);
      throw error;
    }

    // If there are economy classes, restore their points (re-set them back)
    let economyRestored = 0;
    if (economyClassIds.length > 0) {
      // Restore student_points for economy classes that were just zeroed
      const { data: archivedRows } = await supabase
        .from("archived_leaderboards")
        .select("student_id, class_id, homework_points, participation_points")
        .eq("month", monthToArchive)
        .in("class_id", economyClassIds);

      if (archivedRows && archivedRows.length > 0) {
        for (const row of archivedRows) {
          await supabase
            .from("student_points")
            .upsert({
              student_id: row.student_id,
              class_id: row.class_id,
              month: monthToArchive,
              homework_points: row.homework_points,
              participation_points: row.participation_points,
            }, { onConflict: 'student_id,class_id,month' });
          economyRestored++;
        }
      }
    }

    console.log(`Successfully archived ${data?.[0]?.archived_count || 0} records and reset ${data?.[0]?.reset_count || 0} student points. Restored ${economyRestored} economy-mode records.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Monthly leaderboard reset complete for ${monthToArchive}`,
        archived: data?.[0]?.archived_count || 0,
        reset: data?.[0]?.reset_count || 0,
        economySkipped: economyRestored,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in reset-monthly-leaderboard function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
