import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: adminRole } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isAdmin = !!adminRole;

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetStudentId = formData.get('studentId') as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file
    // PNG, JPEG, WebP or GIF only, and the bytes must say so too (audit
    // F-13): "image/" let image/svg+xml through - a file that can carry
    // script - into a PUBLIC bucket, on a type the browser declared.
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const looksLike =
      (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) ? 'image/png'
      : (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) ? 'image/jpeg'
      : (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) ? 'image/gif'
      : (head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46
         && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50) ? 'image/webp'
      : null;
    const declared = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    if (!looksLike || declared !== looksLike) {
      return new Response(JSON.stringify({ error: 'File must be a PNG, JPEG, WebP or GIF image' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File must be less than 5MB' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let student = null;

    // If admin provides a studentId, use that directly
    if (isAdmin && targetStudentId) {
      const { data: targetStudent } = await serviceClient
        .from('students')
        .select('id, avatar_url, full_name')
        .eq('id', targetStudentId)
        .maybeSingle();
      
      if (targetStudent) {
        student = targetStudent;
        console.log('Admin uploading for student:', student.full_name);
      }
    }

    // Otherwise, find student linked to current user
    if (!student) {
      const { data: directStudent } = await serviceClient
        .from('students')
        .select('id, avatar_url, full_name')
        .eq('linked_user_id', user.id)
        .maybeSingle();
      
      if (directStudent) {
        student = directStudent;
      } else {
        const { data: family } = await serviceClient
          .from('families')
          .select('id')
          .eq('primary_user_id', user.id)
          .maybeSingle();
        
        if (family) {
          const { data: familyStudents } = await serviceClient
            .from('students')
            .select('id, avatar_url, full_name')
            .eq('family_id', family.id)
            .limit(1);
          
          if (familyStudents?.length) {
            student = familyStudents[0];
          }
        }
      }
    }

    if (!student) {
      return new Response(JSON.stringify({ error: 'No student profile found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete old avatar if exists
    if (student.avatar_url) {
      try {
        const url = new URL(student.avatar_url);
        const pathMatch = url.pathname.match(/student-avatars\/(.+)$/);
        if (pathMatch) {
          await serviceClient.storage.from('student-avatars').remove([pathMatch[1]]);
        }
      } catch (e) {
        console.log('Could not delete old avatar:', e);
      }
    }

    // Upload new avatar
    // The extension follows the checked bytes, not the browser's file name.
    const fileExt = looksLike.slice('image/'.length).replace('jpeg', 'jpg');
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${student.id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceClient.storage
      .from('student-avatars')
      .upload(filePath, arrayBuffer, { contentType: looksLike, upsert: true });

    if (uploadError) {
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { publicUrl } } = serviceClient.storage
      .from('student-avatars')
      .getPublicUrl(filePath);

    const { error: updateError } = await serviceClient
      .from('students')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', student.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      avatarUrl: publicUrl,
      studentId: student.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});