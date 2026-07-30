import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_lib/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, email, password, userId, teacherId, familyId, newEmail, role } = await req.json();

    console.log('Action requested:', action);

    // Special actions that don't require authentication
    if (action === 'checkAdmins') {
      console.log('Checking if admin users exist');
      const { count, error: countError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (countError) {
        console.error('Error checking for admins:', countError);
        return new Response(JSON.stringify({ error: countError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Admin count:', count);
      return new Response(JSON.stringify({ hasAdmins: (count ?? 0) > 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'bootstrap') {
      console.log('Bootstrap action requested - checking if admins exist');
      
      // Check if any admins exist
      const { count, error: countError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (countError) {
        console.error('Error checking for admins:', countError);
        return new Response(JSON.stringify({ error: countError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if ((count ?? 0) > 0) {
        console.log('Bootstrap denied: Admin users already exist');
        return new Response(JSON.stringify({ 
          error: 'Bootstrap denied: Admin users already exist' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate secure admin credentials
      // Use environment variable for email, or default to a secure generated one
      const adminEmail = Deno.env.get('BOOTSTRAP_ADMIN_EMAIL') || `admin-${crypto.randomUUID().slice(0, 8)}@system.local`;
      // Generate a cryptographically secure random password
      const tempPassword = crypto.randomUUID() + crypto.randomUUID(); // 72 character random string

      console.log('Creating bootstrap admin user:', adminEmail);
      console.log('IMPORTANT: Bootstrap admin password:', tempPassword);
      console.log('Please save this password - it will not be shown again!');

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: tempPassword,
        email_confirm: true,
      });

      if (createError) {
        console.error('Error creating bootstrap admin user:', createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Bootstrap admin user created, assigning admin role');

      // Assign admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: 'admin',
        });

      if (roleError) {
        console.error('Error assigning admin role:', roleError);
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log the bootstrap action
      const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
          action: 'bootstrap_admin',
          entity: 'user',
          entity_id: newUser.user.id,
          diff: { email: adminEmail, role: 'admin' },
        });

      if (auditError) {
        console.error('Error logging bootstrap action:', auditError);
      }

      console.log('Bootstrap admin created successfully');
      return new Response(JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        email: adminEmail,
        temporaryPassword: tempPassword
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // All other actions require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if requester is admin.
    // Fetch all their roles rather than .single()-ing a filtered lookup: a
    // real failure and "not an admin" then stop looking identical, and a
    // genuine lookup error can be reported instead of silently reading as 403.
    const { data: roleRows, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError) {
      console.error('Role lookup failed:', roleError);
      return new Response(JSON.stringify({ error: `Could not verify your permissions: ${roleError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!(roleRows || []).some((r: { role: string }) => r.role === 'admin')) {
      console.warn(`manage-admin-users denied for ${user.id}; roles=${JSON.stringify((roleRows || []).map((r: { role: string }) => r.role))}`);
      return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting: 50 admin actions per minute per user
    const clientIP = getClientIP(req);
    const userRateCheck = checkRateLimit(user.id, 50, 60 * 1000, 'user');
    if (userRateCheck.limited) {
      console.warn(`Rate limit exceeded for admin user ${user.id}`);
      await supabase.from('audit_log').insert({
        action: 'rate_limit_exceeded',
        entity: 'admin',
        actor_user_id: user.id,
        diff: { reason: 'admin_action_rate_limit', ip: clientIP }
      });
      return rateLimitResponse(userRateCheck.resetAt, corsHeaders);
    }

    if (action === 'listUsers') {
      // List ALL users with their roles and links.
      //
      // auth.admin.listUsers() is PAGINATED and defaults to 50 per page. The
      // previous single unpaged call could never show a full roster — page
      // through until a short page comes back.
      console.log('Listing all users');

      const PER_PAGE = 1000;
      const MAX_PAGES = 50; // 50k users — a hard stop, not an expected limit
      const allAuthUsers: any[] = [];
      let listError: { message: string } | null = null;

      for (let page = 1; page <= MAX_PAGES; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE });
        if (error) { listError = error; break; }
        const batch = data?.users || [];
        allAuthUsers.push(...batch);
        if (batch.length < PER_PAGE) break;
      }

      if (listError) {
        console.error('Error listing users:', listError);
        return new Response(JSON.stringify({ error: listError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get all roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return new Response(JSON.stringify({ error: rolesError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get teacher links
      const { data: teachers } = await supabase
        .from('teachers')
        .select('user_id, id, full_name');

      // Get family links
      const { data: families } = await supabase
        .from('families')
        .select('primary_user_id, id, name');

      // Get student links. Several siblings can share one login, so this maps
      // a user to a LIST of students rather than a single one.
      const { data: linkedStudents } = await supabase
        .from('students')
        .select('id, full_name, linked_user_id')
        .not('linked_user_id', 'is', null);

      const roleMap = new Map();
      userRoles?.forEach(r => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
        roleMap.get(r.user_id).push(r.role);
      });

      const teacherMap = new Map(teachers?.map(t => [t.user_id, { id: t.id, name: t.full_name }]) || []);
      const familyMap = new Map(families?.map(f => [f.primary_user_id, { id: f.id, name: f.name }]) || []);

      const studentMap = new Map<string, { id: string; name: string }[]>();
      (linkedStudents || []).forEach(s => {
        const list = studentMap.get(s.linked_user_id) || [];
        list.push({ id: s.id, name: s.full_name });
        studentMap.set(s.linked_user_id, list);
      });

      const usersWithRoles = allAuthUsers.map(u => ({
        id: u.id,
        email: u.email || '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        roles: roleMap.get(u.id) || [],
        teacher: teacherMap.get(u.id),
        family: familyMap.get(u.id),
        students: studentMap.get(u.id) || []
      }));

      console.log(`Listed ${usersWithRoles.length} users`);

      return new Response(JSON.stringify({ users: usersWithRoles, total: usersWithRoles.length }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'create') {
      // Create new admin user
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create user with service role (bypasses email confirmation)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'admin' }
      });

      if (createError) {
        console.error('Create user error:', createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Insert admin role
      const { error: roleInsertError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUser.user.id, role: 'admin' });

      if (roleInsertError) {
        console.error('Role insert error:', roleInsertError);
        return new Response(JSON.stringify({ error: roleInsertError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Audit log
      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'create_admin',
        entity: 'user',
        entity_id: newUser.user.id,
        diff: { email, role: 'admin' }
      });

      console.log('Admin user created:', email);

      return new Response(JSON.stringify({ 
        success: true, 
        user: { id: newUser.user.id, email: newUser.user.email }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'promote') {
      // Promote existing user to admin
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if user already has admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      if (existingRole) {
        return new Response(JSON.stringify({ error: 'User is already an admin' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Insert admin role
      const { error: roleInsertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (roleInsertError) {
        console.error('Role insert error:', roleInsertError);
        return new Response(JSON.stringify({ error: roleInsertError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (updateError) {
        console.error('User update error:', updateError);
      }

      // Audit log
      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'promote_to_admin',
        entity: 'user',
        entity_id: userId,
        diff: { role: 'admin' }
      });

      console.log('User promoted to admin:', userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'revoke') {
      // Revoke admin role
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Prevent self-revocation
      if (userId === user.id) {
        return new Response(JSON.stringify({ error: 'Cannot revoke your own admin role' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Delete admin role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (deleteError) {
        console.error('Role delete error:', deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Audit log
      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'revoke_admin',
        entity: 'user',
        entity_id: userId,
        diff: { role_removed: 'admin' }
      });

      console.log('Admin role revoked:', userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'delete') {
      // Delete user
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Prevent self-deletion
      if (userId === user.id) {
        return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('User delete error:', deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Audit log
      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'delete_user',
        entity: 'user',
        entity_id: userId
      });

      console.log('User deleted:', userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'updateEmail') {
      // Update user email
      if (!userId || !newEmail) {
        return new Response(JSON.stringify({ error: 'User ID and new email required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { email: newEmail }
      );

      if (updateError) {
        console.error('Email update error:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Audit log
      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'update_user_email',
        entity: 'user',
        entity_id: userId,
        diff: { newEmail }
      });

      console.log('User email updated:', userId, newEmail);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'linkToTeacher') {
      // Link user to teacher
      if (!userId || !teacherId) {
        return new Response(JSON.stringify({ error: 'User ID and Teacher ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: linkError } = await supabase
        .from('teachers')
        .update({ user_id: userId })
        .eq('id', teacherId);

      if (linkError) {
        console.error('Teacher link error:', linkError);
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Add teacher role if not exists
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'teacher' }, { onConflict: 'user_id,role' });

      if (roleError) {
        console.error('Role upsert error:', roleError);
      }

      // Audit log
      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'link_user_to_teacher',
        entity: 'user',
        entity_id: userId,
        diff: { teacherId }
      });

      console.log('User linked to teacher:', userId, teacherId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'linkToFamily') {
      // Link user to family
      if (!userId || !familyId) {
        return new Response(JSON.stringify({ error: 'User ID and Family ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: linkError } = await supabase
        .from('families')
        .update({ primary_user_id: userId })
        .eq('id', familyId);

      if (linkError) {
        console.error('Family link error:', linkError);
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Audit log
      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'link_user_to_family',
        entity: 'user',
        entity_id: userId,
        diff: { familyId }
      });

      console.log('User linked to family:', userId, familyId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'updateRole') {
      // Update user role
      if (!userId || !role) {
        return new Response(JSON.stringify({ error: 'User ID and role required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Delete existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (roleError) {
        console.error('Role update error:', roleError);
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Audit log
      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'update_user_role',
        entity: 'user',
        entity_id: userId,
        diff: { role }
      });

      console.log('User role updated:', userId, role);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
