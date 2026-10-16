import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

/** What a TA is paid when the form leaves the rate blank. */
const DEFAULT_TA_RATE = 150000;

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fullName, email, phone, hourlyRate, payRateType, bio, createAccount } = await req.json();

    if (!fullName) {
      return new Response(
        JSON.stringify({ error: 'Full name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let userId = null;
    let tempPassword = null;

    // Optionally create an auth account for the TA (shares teacher role)
    if (createAccount && email) {
      tempPassword = Math.random().toString(36).slice(-8) + "!Aa1";

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role: "teacher" }
      });

      if (authError) throw authError;
      userId = authData.user.id;

      // TAs get teacher role since they share same capabilities
      await supabaseAdmin.from('user_roles').insert({
        user_id: userId,
        role: 'teacher'
      });
    }

    // `payRateType` is optional so an older client that only sends
    // hourlyRate keeps working exactly as before. Anything other than
    // "per_session" means hourly, matching payRateTypeOf.
    const basis = payRateType === "per_session" ? "per_session" : "hourly";
    const amount = parseInt(hourlyRate) || DEFAULT_TA_RATE;

    const { error: taError } = await supabaseAdmin
      .from('teaching_assistants')
      .insert({
        user_id: userId,
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        pay_rate_type: basis,
        hourly_rate_vnd: basis === "hourly" ? amount : 0,
        per_session_rate_vnd: basis === "per_session" ? amount : 0,
        bio: bio || null,
        created_by: user.id,
      });

    if (taError) throw taError;

    await supabaseAdmin.from('audit_log').insert({
      actor_user_id: user.id,
      entity: 'teaching_assistants',
      action: 'create',
      diff: { email, full_name: fullName, has_account: !!createAccount }
    });

    return new Response(
      JSON.stringify({
        success: true,
        tempPassword,
        hasAccount: !!createAccount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating teaching assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
