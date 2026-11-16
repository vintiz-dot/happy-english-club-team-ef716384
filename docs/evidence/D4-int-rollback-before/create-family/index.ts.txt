import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to convert empty strings to undefined
const emptyStringToUndefined = (val: unknown) => 
  (val === '' || val === null) ? undefined : val;

// Validation schemas
const EnrollmentSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD').transform(emptyStringToUndefined).optional(),
  discountType: z.enum(['percent', 'amount']).optional(),
  discountValue: z.number().int().positive().optional(),
  discountCadence: z.enum(['monthly', 'yearly', 'once']).optional()
});

const StudentSchema = z.object({
  fullName: z.string().min(1, 'Name required').max(200),
  email: z.preprocess(emptyStringToUndefined, z.union([z.string().email('Invalid email').max(255), z.undefined()])),
  phone: z.preprocess(emptyStringToUndefined, z.union([z.string().max(20), z.undefined()])),
  dateOfBirth: z.preprocess(emptyStringToUndefined, z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD'), z.undefined()])),
  notes: z.preprocess(emptyStringToUndefined, z.union([z.string().max(1000), z.undefined()])),
  enrollments: z.array(EnrollmentSchema).optional()
});

const FamilySchema = z.object({
  name: z.string().min(1, 'Family name required').max(200),
  email: z.preprocess(emptyStringToUndefined, z.union([z.string().email('Invalid email').max(255), z.undefined()])),
  phone: z.preprocess(emptyStringToUndefined, z.union([z.string().max(20), z.undefined()])),
  address: z.preprocess(emptyStringToUndefined, z.union([z.string().max(500), z.undefined()])),
  primaryUserId: z.string().uuid('Invalid user ID').optional(),
  students: z.array(StudentSchema).optional()
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (rolesError || !userRoles) {
      throw new Error('User is not authorized to create families')
    }

    // Validate input with Zod
    const body = await req.json()
    const { name, email, phone, address, primaryUserId, students } = FamilySchema.parse(body)

    // Create family
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert([
        {
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          primary_user_id: primaryUserId || null,
          created_by: user.id,
          updated_by: user.id,
        },
      ])
      .select()
      .single()

    if (familyError) {
      console.error('Error creating family:', familyError)
      throw familyError
    }

    console.log('Family created successfully:', family.id)

    // Create students if provided
    const createdStudents = []
    if (students && Array.isArray(students) && students.length > 0) {
      for (const student of students) {
        const { data: newStudent, error: studentError } = await supabase
          .from('students')
          .insert([
            {
              full_name: student.fullName,
              email: student.email || null,
              phone: student.phone || null,
              date_of_birth: student.dateOfBirth || null,
              family_id: family.id,
              notes: student.notes || null,
              created_by: user.id,
              updated_by: user.id,
            },
          ])
          .select()
          .single()

        if (studentError) {
          console.error('Error creating student:', studentError)
          throw studentError
        }

        createdStudents.push(newStudent)

        // Create enrollments if provided
        if (student.enrollments && Array.isArray(student.enrollments)) {
          for (const enrollment of student.enrollments) {
            const enrollmentData: any = {
              student_id: newStudent.id,
              class_id: enrollment.classId,
              start_date: enrollment.startDate || new Date().toISOString().split('T')[0],
              created_by: user.id,
              updated_by: user.id,
            }

            if (enrollment.discountType && enrollment.discountValue && enrollment.discountCadence) {
              enrollmentData.discount_type = enrollment.discountType
              enrollmentData.discount_value = enrollment.discountValue
              enrollmentData.discount_cadence = enrollment.discountCadence
            }

            const { error: enrollmentError } = await supabase
              .from('enrollments')
              .insert([enrollmentData])

            if (enrollmentError) {
              console.error('Error creating enrollment:', enrollmentError)
              throw enrollmentError
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ family, students: createdStudents }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in create-family function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})