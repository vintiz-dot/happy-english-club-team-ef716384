import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ImportDataSchema = z.object({
  tables: z.record(z.array(z.record(z.any()))).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles?.some(r => r.role === 'admin')) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dryRun') === '1';
    
    // Input validation
    const requestBody = await req.json();
    const validationResult = ImportDataSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: "Invalid import data structure", 
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const importData = validationResult.data;

    const whitelist = [
      'families', 'students', 'teachers', 'classes', 'enrollments',
      'sessions', 'attendance', 'discount_definitions', 'discount_assignments',
      'bank_info'
    ];

    if (dryRun) {
      // Validate structure and count
      const counts: any = {};
      for (const table of whitelist) {
        if (importData.tables?.[table]) {
          counts[table] = importData.tables[table].length;
        }
      }
      return new Response(JSON.stringify({ ok: true, dryRun: true, counts }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apply import
    const results: any = {};
    for (const table of whitelist) {
      if (importData.tables?.[table]) {
        const records = importData.tables[table];
        const { error } = await supabase.from(table).upsert(records);
        results[table] = error ? { error: error.message } : { imported: records.length };
      }
    }

    // Log import action
    await supabase.from('audit_log').insert({
      action: 'admin_data_import',
      entity: 'system',
      actor_user_id: user.id,
      diff: { results, table_count: Object.keys(results).length }
    });

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Import error:', error);
    
    // Don't expose internal errors to client
    return new Response(JSON.stringify({ error: 'Failed to import data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
