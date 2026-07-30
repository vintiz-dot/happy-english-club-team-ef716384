import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LinkSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  userId: z.string().uuid('Invalid user ID'),
  action: z.literal('link'),
  updateFamilyEmail: z.boolean().optional().default(true),
  allowReassign: z.boolean().optional().default(false),
});

const UnlinkSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  action: z.literal('unlink'),
});

const RequestSchema = z.union([LinkSchema, UnlinkSchema]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin.
    //
    // This used to be `.select('role').eq('user_id', user.id).single()` with no
    // role filter — which THREW for any admin who also holds a second role
    // (admin + teacher is normal here), locking real staff out of linking
    // students entirely. Fetch all roles and look for admin among them.
    const { data: roleRows, error: rolesErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesErr) {
      console.error('Role lookup failed:', rolesErr);
      return new Response(JSON.stringify({ error: 'Could not verify your permissions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = (roleRows || []).some((r: { role: string }) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate and parse request
    const body = await req.json();
    const validated = RequestSchema.parse(body);

    if (validated.action === 'unlink') {
      // Get student info for audit log
      const { data: student } = await supabase
        .from('students')
        .select('full_name, linked_user_id, family_id')
        .eq('id', validated.studentId)
        .single();

      if (!student?.linked_user_id) {
        return new Response(JSON.stringify({ 
          error: 'Student is not currently linked to any user' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const linkedUserId = student.linked_user_id;

      // Unlink user from student
      const { error: unlinkError } = await supabase
        .from('students')
        .update({ linked_user_id: null })
        .eq('id', validated.studentId);

      if (unlinkError) throw unlinkError;

      // Auto-unlink all siblings in the same family
      if (student.family_id) {
        const { data: siblings } = await supabase
          .from('students')
          .select('id, full_name')
          .eq('family_id', student.family_id)
          .eq('linked_user_id', linkedUserId)
          .neq('id', validated.studentId);

        if (siblings && siblings.length > 0) {
          // Unlink all siblings
          await supabase
            .from('students')
            .update({ linked_user_id: null })
            .eq('family_id', student.family_id)
            .eq('linked_user_id', linkedUserId)
            .neq('id', validated.studentId);

          // Log sibling unlinking in audit
          for (const sibling of siblings) {
            await supabase.from('audit_log').insert({
              entity: 'student',
              entity_id: sibling.id,
              action: 'unlink_user',
              actor_user_id: user.id,
              diff: { 
                old_user_id: linkedUserId,
                student_name: sibling.full_name,
                reason: 'auto_unlinked_sibling',
                primary_student: student.full_name
              }
            });
          }
        }
      }

      // Audit log
      await supabase.from('audit_log').insert({
        entity: 'student',
        entity_id: validated.studentId,
        action: 'unlink_user',
        actor_user_id: user.id,
        diff: { 
          old_user_id: student.linked_user_id,
          student_name: student.full_name
        }
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Link action - get user email for family update
    const { data: authUser, error: userFetchError } = await supabase.auth.admin.getUserById(validated.userId);
    if (userFetchError || !authUser.user) {
      return new Response(JSON.stringify({ 
        error: 'User not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userEmail = authUser.user.email;

    // Check if user is already linked to another student
    const { data: existingLink } = await supabase
      .from('students')
      .select('id, full_name')
      .eq('linked_user_id', validated.userId)
      .maybeSingle();

    if (existingLink && existingLink.id !== validated.studentId) {
      if (!validated.allowReassign) {
        return new Response(JSON.stringify({ 
          error: `User is already linked to ${existingLink.full_name}. Enable "Reassign" to proceed.`,
          requiresReassign: true,
          currentStudent: existingLink.full_name
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Unlink from previous student first
      await supabase
        .from('students')
        .update({ linked_user_id: null })
        .eq('id', existingLink.id);

      await supabase.from('audit_log').insert({
        entity: 'student',
        entity_id: existingLink.id,
        action: 'unlink_user',
        actor_user_id: user.id,
        diff: { 
          reason: 'reassigned',
          old_student_name: existingLink.full_name,
          new_student_id: validated.studentId
        }
      });
    }

    // Get student with family info
    const { data: student } = await supabase
      .from('students')
      .select('id, full_name, family_id, family:families(id, name, primary_user_id, email)')
      .eq('id', validated.studentId)
      .single();

    if (!student) {
      return new Response(JSON.stringify({ 
        error: 'Student not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Link user to student AND all siblings in the same family
    const { error: linkError } = await supabase
      .from('students')
      .update({ linked_user_id: validated.userId })
      .eq('id', validated.studentId);

    if (linkError) throw linkError;

    // Auto-link all siblings in the same family
    if (student.family_id) {
      const { data: siblings, error: siblingsError } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('family_id', student.family_id)
        .neq('id', validated.studentId)
        .eq('is_active', true);

      if (!siblingsError && siblings && siblings.length > 0) {
        // Link all siblings to the same user
        const { error: siblingLinkError } = await supabase
          .from('students')
          .update({ linked_user_id: validated.userId })
          .eq('family_id', student.family_id)
          .neq('id', validated.studentId);

        if (siblingLinkError) {
          console.error('Failed to link siblings:', siblingLinkError);
        } else {
          // Log sibling linking in audit
          for (const sibling of siblings) {
            await supabase.from('audit_log').insert({
              entity: 'student',
              entity_id: sibling.id,
              action: 'link_user',
              actor_user_id: user.id,
              diff: { 
                user_id: validated.userId,
                user_email: userEmail,
                student_name: sibling.full_name,
                reason: 'auto_linked_sibling',
                primary_student: student.full_name
              }
            });
          }
        }
      }
    }

    // Claim any vocabulary a teacher scanned for this child BEFORE they had
    // a login. Those rows are owned by student_id with a NULL user_id; now
    // that an account exists, stamp it on so the word bank is not empty on
    // first sign-in. Best-effort — a failure here must not undo the link.
    let vocabClaimed = 0;
    try {
      const claimFor: string[] = [validated.studentId];
      if (student.family_id) {
        const { data: linkedSiblings } = await supabase
          .from('students')
          .select('id')
          .eq('family_id', student.family_id)
          .eq('linked_user_id', validated.userId)
          .neq('id', validated.studentId);
        for (const s of linkedSiblings || []) claimFor.push(s.id);
      }
      for (const sid of claimFor) {
        const { data: n } = await supabase.rpc('claim_vocab_for_student', {
          p_student_id: sid,
          p_user_id: validated.userId,
        });
        vocabClaimed += Number(n) || 0;
      }
    } catch (e) {
      console.error('Vocab claim failed (link still succeeded):', e);
    }

    // Ensure user has 'student' role.
    // Fetch ALL roles: .maybeSingle() here errored for anyone holding more
    // than one role, which made this branch think they had none and add a
    // redundant 'student' row.
    const { data: targetRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', validated.userId);

    if (!(targetRoles || []).length) {
      await supabase
        .from('user_roles')
        .insert({ user_id: validated.userId, role: 'student' });
    }

    let emailWarning = null;

    // Handle family information update
    if (validated.updateFamilyEmail && student.family_id) {
      const family = Array.isArray(student.family) ? student.family[0] : student.family;
      
      if (family) {
        const currentEmail = family.email;
        
        if (!currentEmail || currentEmail.trim() === '') {
          // Update family with user's email
          await supabase
            .from('families')
            .update({ email: userEmail })
            .eq('id', family.id);

          await supabase.from('audit_log').insert({
            entity: 'family',
            entity_id: family.id,
            action: 'update_email',
            actor_user_id: user.id,
            diff: { 
              old_email: null,
              new_email: userEmail,
              reason: 'student_linked'
            }
          });
        } else if (currentEmail !== userEmail) {
          // Email exists but differs - return warning
          emailWarning = `Family email is "${currentEmail}" but linked user email is "${userEmail}". Consider updating manually if needed.`;
        }
      }
    } else if (validated.updateFamilyEmail && !student.family_id) {
      // Student has no family - create one
      const { data: newFamily, error: familyError } = await supabase
        .from('families')
        .insert({
          name: `${student.full_name}'s Family`,
          email: userEmail,
          primary_user_id: validated.userId,
          created_by: user.id
        })
        .select()
        .single();

      if (!familyError && newFamily) {
        // Link student to new family
        await supabase
          .from('students')
          .update({ family_id: newFamily.id })
          .eq('id', validated.studentId);

        await supabase.from('audit_log').insert({
          entity: 'family',
          entity_id: newFamily.id,
          action: 'create',
          actor_user_id: user.id,
          diff: { 
            reason: 'auto_created_for_student',
            student_id: validated.studentId,
            student_name: student.full_name
          }
        });
      }
    }

    // Final audit log for link
    await supabase.from('audit_log').insert({
      entity: 'student',
      entity_id: validated.studentId,
      action: 'link_user',
      actor_user_id: user.id,
      diff: { 
        user_id: validated.userId,
        user_email: userEmail,
        student_name: student.full_name,
        updated_family_email: validated.updateFamilyEmail
      }
    });

    // Count how many siblings were linked
    let siblingsLinked = 0;
    if (student.family_id) {
      const { count } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', student.family_id)
        .eq('linked_user_id', validated.userId)
        .neq('id', validated.studentId);
      siblingsLinked = count || 0;
    }

    return new Response(JSON.stringify({
      success: true,
      warning: emailWarning,
      siblingsLinked,
      vocabClaimed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request data',
        details: error.errors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Failed to link/unlink user. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
