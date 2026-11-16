import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ImportDataSchema = z.object({
  tables: z.record(z.array(z.record(z.any()))).optional(),
});

// D4 step 3B (docs/evidence/D4-design.md b.4 G-20, P21). This function
// upserts with the service key, so nothing it writes is judged as a person's
// change. The tables whose rows decide what a family is billed or a teacher
// is paid are therefore NOT importable at all: lessons, the register,
// enrolments and discounts go through their own screens (dated, with a
// reason where they reach a billed month). A dry run still counts them, and
// says they are not imported. A class's fee is not imported either: it has
// its own dated history.
const IMPORTABLE = ['families', 'students', 'teachers', 'classes', 'bank_info'];
const NOT_IMPORTABLE = ['enrollments', 'sessions', 'attendance', 'discount_definitions', 'discount_assignments'];
const NOT_IMPORTABLE_REASON =
  'Not imported: these rows decide bills and pay. Enter them from their own screens.';
/** Columns dropped from imported rows, per table. */
const STRIPPED: Record<string, string[]> = { classes: ['session_rate_vnd'] };

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
    const dryRunParam = url.searchParams.get('dryRun') === '1';
    
    // Input validation
    const requestBody = await req.json();
    // The screen's "Dry run" box travels in the body (supabase-js cannot add
    // a query string to an invoke), the query parameter is kept for scripts.
    // Either one makes it a dry run: nothing is written.
    const dryRun = dryRunParam || requestBody?.dryRun === true;
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

    const whitelist = IMPORTABLE;
    // What the file holds for the tables that are no longer imported.
    const notImported: Record<string, number> = {};
    for (const table of NOT_IMPORTABLE) {
      if (importData.tables?.[table]) notImported[table] = importData.tables[table].length;
    }

    if (dryRun) {
      // Validate structure and count (the tables that are not imported are still counted)
      const counts: any = {};
      for (const table of [...whitelist, ...NOT_IMPORTABLE]) {
        if (importData.tables?.[table]) {
          counts[table] = importData.tables[table].length;
        }
      }
      return new Response(JSON.stringify({
        ok: true, dryRun: true, counts,
        not_imported: notImported, not_imported_reason: NOT_IMPORTABLE_REASON,
        stripped_columns: STRIPPED,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apply import
    const results: any = {};
    for (const table of whitelist) {
      if (importData.tables?.[table]) {
        const drop = STRIPPED[table] ?? [];
        const records = drop.length === 0 ? importData.tables[table] : importData.tables[table].map((row) => {
          const copy: Record<string, unknown> = { ...row };
          for (const col of drop) delete copy[col];
          return copy;
        });
        const { error } = await supabase.from(table).upsert(records);
        results[table] = error ? { error: error.message } : { imported: records.length };
      }
    }
    for (const [table, rows] of Object.entries(notImported)) {
      results[table] = { skipped: 'not_importable', rows, reason: NOT_IMPORTABLE_REASON };
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
