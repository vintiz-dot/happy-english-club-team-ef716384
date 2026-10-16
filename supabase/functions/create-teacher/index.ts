import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

/** What a teacher is paid when the form leaves the rate blank. */
const DEFAULT_TEACHER_RATE = 200000;

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

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Invalid token:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (roleError || !roles || roles.length === 0) {
      console.error('User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fullName, email, phone, hourlyRate, payRateType, bio } = await req.json();

    if (!fullName || !email) {
      return new Response(
        JSON.stringify({ error: 'Full name and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating teacher user:', email);

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + "!Aa1";

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: "teacher" }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw authError;
    }

    console.log('Auth user created:', authData.user.id);

    // Add teacher role to user_roles table
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'teacher'
      });

    if (roleInsertError) {
      console.error('Error adding teacher role:', roleInsertError);
      // Continue anyway as the user was created
    }

    // `payRateType` is optional so an older client that only sends
    // hourlyRate keeps working exactly as before. Anything other than
    // "per_session" means hourly, matching payRateTypeOf.
    const basis = payRateType === "per_session" ? "per_session" : "hourly";
    const amount = parseInt(hourlyRate) || DEFAULT_TEACHER_RATE;

    // Create teacher record
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .insert({
        user_id: authData.user.id,
        full_name: fullName,
        email,
        phone: phone || null,
        pay_rate_type: basis,
        hourly_rate_vnd: basis === "hourly" ? amount : 0,
        per_session_rate_vnd: basis === "per_session" ? amount : 0,
        bio: bio || null,
      });

    if (teacherError) {
      console.error('Error creating teacher record:', teacherError);
      throw teacherError;
    }

    console.log('Teacher created successfully');

    // Log the action in audit_log
    await supabaseAdmin.from('audit_log').insert({
      actor_user_id: user.id,
      entity: 'teachers',
      entity_id: authData.user.id,
      action: 'create',
      diff: { email, full_name: fullName }
    });

    return new Response(
      JSON.stringify({
        success: true,
        tempPassword,
        userId: authData.user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-teacher function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});