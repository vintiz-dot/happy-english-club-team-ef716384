export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "site_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_leaderboards: {
        Row: {
          archived_at: string
          archived_by: string | null
          class_id: string
          homework_points: number
          id: string
          month: string
          participation_points: number
          rank: number | null
          student_id: string
          total_points: number
        }
        Insert: {
          archived_at?: string
          archived_by?: string | null
          class_id: string
          homework_points?: number
          id?: string
          month: string
          participation_points?: number
          rank?: number | null
          student_id: string
          total_points?: number
        }
        Update: {
          archived_at?: string
          archived_by?: string | null
          class_id?: string
          homework_points?: number
          id?: string
          month?: string
          participation_points?: number
          rank?: number | null
          student_id?: string
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "archived_leaderboards_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_leaderboards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          id: string
          marked_at: string
          marked_by: string | null
          notes: string | null
          session_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          notes?: string | null
          session_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          notes?: string | null
          session_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          diff: Json | null
          entity: string
          entity_id: string | null
          id: string
          occurred_at: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          occurred_at?: string
        }
        Relationships: []
      }
      avatars: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          is_premium: boolean
          name: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          image_url: string
          is_active?: boolean
          is_premium?: boolean
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          is_premium?: boolean
          name?: string
        }
        Relationships: []
      }
      bank_info: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: number
          org_address: string | null
          org_name: string | null
          updated_at: string
          vietqr_storage_key: string | null
        }
        Insert: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: number
          org_address?: string | null
          org_name?: string | null
          updated_at?: string
          vietqr_storage_key?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: number
          org_address?: string | null
          org_name?: string | null
          updated_at?: string
          vietqr_storage_key?: string | null
        }
        Relationships: []
      }
      class_monitors: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          class_id: string
          id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          class_id: string
          id?: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          class_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_monitors_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_monitors_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          age_range: string | null
          allow_teacher_override: boolean
          class_notes: string | null
          created_at: string
          created_by: string | null
          curriculum: string | null
          default_session_length_minutes: number
          default_teacher_id: string | null
          description: string | null
          economy_mode: boolean
          id: string
          is_active: boolean
          max_students: number | null
          name: string
          points_to_cash_rate: number
          schedule_template: Json
          session_rate_vnd: number
          teacher_lock_window_hours: number
          typical_start_times: Json | null
          updated_at: string
          updated_by: string | null
          visibility_settings: Json | null
        }
        Insert: {
          age_range?: string | null
          allow_teacher_override?: boolean
          class_notes?: string | null
          created_at?: string
          created_by?: string | null
          curriculum?: string | null
          default_session_length_minutes?: number
          default_teacher_id?: string | null
          description?: string | null
          economy_mode?: boolean
          id?: string
          is_active?: boolean
          max_students?: number | null
          name: string
          points_to_cash_rate?: number
          schedule_template?: Json
          session_rate_vnd?: number
          teacher_lock_window_hours?: number
          typical_start_times?: Json | null
          updated_at?: string
          updated_by?: string | null
          visibility_settings?: Json | null
        }
        Update: {
          age_range?: string | null
          allow_teacher_override?: boolean
          class_notes?: string | null
          created_at?: string
          created_by?: string | null
          curriculum?: string | null
          default_session_length_minutes?: number
          default_teacher_id?: string | null
          description?: string | null
          economy_mode?: boolean
          id?: string
          is_active?: boolean
          max_students?: number | null
          name?: string
          points_to_cash_rate?: number
          schedule_template?: Json
          session_rate_vnd?: number
          teacher_lock_window_hours?: number
          typical_start_times?: Json | null
          updated_at?: string
          updated_by?: string | null
          visibility_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_default_teacher_id_fkey"
            columns: ["default_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_quests: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          points: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          points?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_login_rewards: {
        Row: {
          created_at: string | null
          id: string
          reward_date: string
          student_id: string
          xp_awarded: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reward_date: string
          student_id: string
          xp_awarded?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reward_date?: string
          student_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_login_rewards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          discount_def_id: string
          effective_from: string
          effective_to: string | null
          id: string
          note: string | null
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount_def_id: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          note?: string | null
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount_def_id?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          note?: string | null
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_assignments_discount_def_id_fkey"
            columns: ["discount_def_id"]
            isOneToOne: false
            referencedRelation: "discount_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_definitions: {
        Row: {
          amortize_yearly: boolean
          cadence: Database["public"]["Enums"]["discount_cadence"]
          created_at: string
          created_by: string | null
          end_month: string | null
          id: string
          is_active: boolean
          name: string
          start_month: string
          type: Database["public"]["Enums"]["discount_type"]
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          amortize_yearly?: boolean
          cadence: Database["public"]["Enums"]["discount_cadence"]
          created_at?: string
          created_by?: string | null
          end_month?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_month: string
          type: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          updated_by?: string | null
          value: number
        }
        Update: {
          amortize_yearly?: boolean
          cadence?: Database["public"]["Enums"]["discount_cadence"]
          created_at?: string
          created_by?: string | null
          end_month?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_month?: string
          type?: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: []
      }
      early_submission_rewards: {
        Row: {
          awarded_at: string | null
          homework_id: string
          id: string
          point_transaction_id: string | null
          points_awarded: number
          reversed_at: string | null
          reversed_by: string | null
          student_id: string
          submission_id: string | null
        }
        Insert: {
          awarded_at?: string | null
          homework_id: string
          id?: string
          point_transaction_id?: string | null
          points_awarded?: number
          reversed_at?: string | null
          reversed_by?: string | null
          student_id: string
          submission_id?: string | null
        }
        Update: {
          awarded_at?: string | null
          homework_id?: string
          id?: string
          point_transaction_id?: string | null
          points_awarded?: number
          reversed_at?: string | null
          reversed_by?: string | null
          student_id?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "early_submission_rewards_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_submission_rewards_point_transaction_id_fkey"
            columns: ["point_transaction_id"]
            isOneToOne: false
            referencedRelation: "point_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_submission_rewards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_submission_rewards_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "homework_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      economy_transactions: {
        Row: {
          cash_impact: number
          class_id: string
          created_at: string
          id: string
          note: string | null
          points_impact: number
          processed_by: string | null
          status: Database["public"]["Enums"]["economy_tx_status"]
          student_id: string
          type: Database["public"]["Enums"]["economy_tx_type"]
          updated_at: string
        }
        Insert: {
          cash_impact?: number
          class_id: string
          created_at?: string
          id?: string
          note?: string | null
          points_impact?: number
          processed_by?: string | null
          status?: Database["public"]["Enums"]["economy_tx_status"]
          student_id: string
          type: Database["public"]["Enums"]["economy_tx_type"]
          updated_at?: string
        }
        Update: {
          cash_impact?: number
          class_id?: string
          created_at?: string
          id?: string
          note?: string | null
          points_impact?: number
          processed_by?: string | null
          status?: Database["public"]["Enums"]["economy_tx_status"]
          student_id?: string
          type?: Database["public"]["Enums"]["economy_tx_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "economy_transactions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "economy_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_requests: {
        Row: {
          class_id: string
          created_at: string
          id: string
          message: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          allowed_days: number[] | null
          class_id: string
          created_at: string
          created_by: string | null
          discount_cadence:
            | Database["public"]["Enums"]["discount_cadence"]
            | null
          discount_type: Database["public"]["Enums"]["discount_type"] | null
          discount_value: number | null
          end_date: string | null
          id: string
          rate_override_vnd: number | null
          start_date: string
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_days?: number[] | null
          class_id: string
          created_at?: string
          created_by?: string | null
          discount_cadence?:
            | Database["public"]["Enums"]["discount_cadence"]
            | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number | null
          end_date?: string | null
          id?: string
          rate_override_vnd?: number | null
          start_date?: string
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_days?: number[] | null
          class_id?: string
          created_at?: string
          created_by?: string | null
          discount_cadence?:
            | Database["public"]["Enums"]["discount_cadence"]
            | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number | null
          end_date?: string | null
          id?: string
          rate_override_vnd?: number | null
          start_date?: string
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_reports: {
        Row: {
          class_id: string | null
          content_html: string | null
          created_at: string
          created_by: string | null
          exam_date: string | null
          file_name: string | null
          file_size: number | null
          file_storage_key: string | null
          id: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          exam_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_storage_key?: string | null
          id?: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          exam_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_storage_key?: string | null
          id?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      expenditures: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          memo: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          memo?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          memo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          primary_user_id: string | null
          sibling_percent_override: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          primary_user_id?: string | null
          sibling_percent_override?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          primary_user_id?: string | null
          sibling_percent_override?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "families_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_primary_user_id_fkey"
            columns: ["primary_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reactions: {
        Row: {
          created_at: string
          id: string
          student_id: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_reactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_reactions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "homework_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_files: {
        Row: {
          created_at: string | null
          file_name: string
          homework_id: string
          id: string
          size_bytes: number
          storage_key: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          homework_id: string
          id?: string
          size_bytes: number
          storage_key: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          homework_id?: string
          id?: string
          size_bytes?: number
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_files_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          assignment_instructions: string | null
          celebration_seen_at: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          grade: string | null
          graded_at: string | null
          homework_id: string
          id: string
          status: string
          storage_key: string | null
          student_id: string
          submission_text: string | null
          submitted_at: string | null
          teacher_feedback: string | null
          updated_at: string
        }
        Insert: {
          assignment_instructions?: string | null
          celebration_seen_at?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          grade?: string | null
          graded_at?: string | null
          homework_id: string
          id?: string
          status?: string
          storage_key?: string | null
          student_id: string
          submission_text?: string | null
          submitted_at?: string | null
          teacher_feedback?: string | null
          updated_at?: string
        }
        Update: {
          assignment_instructions?: string | null
          celebration_seen_at?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          grade?: string | null
          graded_at?: string | null
          homework_id?: string
          id?: string
          status?: string
          storage_key?: string | null
          student_id?: string
          submission_text?: string | null
          submitted_at?: string | null
          teacher_feedback?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      homeworks: {
        Row: {
          body: string | null
          class_id: string
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          title: string
        }
        Insert: {
          body?: string | null
          class_id: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          title: string
        }
        Update: {
          body?: string | null
          class_id?: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homeworks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          created_at: string
          last_number: number
          year: number
        }
        Insert: {
          created_at?: string
          last_number?: number
          year: number
        }
        Update: {
          created_at?: string
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          base_amount: number
          carry_in_credit: number | null
          carry_in_debt: number | null
          carry_out_credit: number | null
          carry_out_debt: number | null
          class_breakdown: Json | null
          confirmation_notes: string | null
          confirmation_status: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          discount_amount: number
          id: string
          month: string
          number: string | null
          paid_amount: number
          pdf_storage_key: string | null
          recorded_payment: number | null
          review_flags: Json | null
          status: Database["public"]["Enums"]["invoice_status"]
          student_id: string
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_amount?: number
          carry_in_credit?: number | null
          carry_in_debt?: number | null
          carry_out_credit?: number | null
          carry_out_debt?: number | null
          class_breakdown?: Json | null
          confirmation_notes?: string | null
          confirmation_status?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          month: string
          number?: string | null
          paid_amount?: number
          pdf_storage_key?: string | null
          recorded_payment?: number | null
          review_flags?: Json | null
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_amount?: number
          carry_in_credit?: number | null
          carry_in_debt?: number | null
          carry_out_credit?: number | null
          carry_out_debt?: number | null
          class_breakdown?: Json | null
          confirmation_notes?: string | null
          confirmation_status?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          month?: string
          number?: string | null
          paid_amount?: number
          pdf_storage_key?: string | null
          recorded_payment?: number | null
          review_flags?: Json | null
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      job_lock: {
        Row: {
          finished_at: string | null
          job: string
          month: string
          started_at: string
        }
        Insert: {
          finished_at?: string | null
          job: string
          month: string
          started_at?: string
        }
        Update: {
          finished_at?: string | null
          job?: string
          month?: string
          started_at?: string
        }
        Relationships: []
      }
      journal_audit: {
        Row: {
          action: Database["public"]["Enums"]["journal_action"]
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          journal_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["journal_action"]
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          journal_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["journal_action"]
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          journal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_audit_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          class_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_private: boolean
          student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_private?: boolean
          student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_private?: boolean
          student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_members: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string
          journal_id: string
          role: Database["public"]["Enums"]["journal_member_role"]
          status: Database["public"]["Enums"]["journal_member_status"]
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          journal_id: string
          role?: Database["public"]["Enums"]["journal_member_role"]
          status?: Database["public"]["Enums"]["journal_member_status"]
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          journal_id?: string
          role?: Database["public"]["Enums"]["journal_member_role"]
          status?: Database["public"]["Enums"]["journal_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_members_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          class_id: string | null
          content_rich: string | null
          created_at: string
          id: string
          is_deleted: boolean
          owner_user_id: string
          student_id: string | null
          title: string
          type: Database["public"]["Enums"]["journal_type"]
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          content_rich?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          owner_user_id: string
          student_id?: string | null
          title: string
          type: Database["public"]["Enums"]["journal_type"]
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          content_rich?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          owner_user_id?: string
          student_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["journal_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journals_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_accounts: {
        Row: {
          code: Database["public"]["Enums"]["account_code"]
          created_at: string
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          code: Database["public"]["Enums"]["account_code"]
          created_at?: string
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          code?: Database["public"]["Enums"]["account_code"]
          created_at?: string
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          credit: number
          debit: number
          id: string
          memo: string | null
          month: string
          occurred_at: string
          tx_id: string
          tx_key: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          credit?: number
          debit?: number
          id?: string
          memo?: string | null
          month: string
          occurred_at?: string
          tx_id: string
          tx_key?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          credit?: number
          debit?: number
          id?: string
          memo?: string | null
          month?: string
          occurred_at?: string
          tx_id?: string
          tx_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_leaders: {
        Row: {
          class_id: string
          created_at: string
          id: string
          month: string
          student_id: string
          total_points: number
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          month: string
          student_id: string
          total_points: number
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          month?: string
          student_id?: string
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_leaders_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_leaders_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          journal_id: string | null
          message: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          journal_id?: string | null
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          journal_id?: string | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      pause_windows: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          from_date: string
          id: string
          memo: string | null
          student_id: string
          to_date: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          from_date: string
          id?: string
          memo?: string | null
          student_id: string
          to_date: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          from_date?: string
          id?: string
          memo?: string | null
          student_id?: string
          to_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "pause_windows_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pause_windows_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_amount: number
          allocation_order: number
          created_at: string
          created_by: string | null
          id: string
          parent_payment_id: string
          student_id: string
        }
        Insert: {
          allocated_amount: number
          allocation_order: number
          created_at?: string
          created_by?: string | null
          id?: string
          parent_payment_id: string
          student_id: string
        }
        Update: {
          allocated_amount?: number
          allocation_order?: number
          created_at?: string
          created_by?: string | null
          id?: string
          parent_payment_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_parent_payment_id_fkey"
            columns: ["parent_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_deletions: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string
          id: string
          payment_id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason: string
          id?: string
          payment_id: string
          snapshot: Json
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string
          id?: string
          payment_id?: string
          snapshot?: Json
        }
        Relationships: []
      }
      payment_modifications: {
        Row: {
          after_data: Json
          before_data: Json
          created_at: string
          created_by: string | null
          id: string
          modification_reason: string | null
          new_payment_id: string | null
          original_payment_id: string
          reversal_payment_id: string | null
        }
        Insert: {
          after_data: Json
          before_data: Json
          created_at?: string
          created_by?: string | null
          id?: string
          modification_reason?: string | null
          new_payment_id?: string | null
          original_payment_id: string
          reversal_payment_id?: string | null
        }
        Update: {
          after_data?: Json
          before_data?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          modification_reason?: string | null
          new_payment_id?: string | null
          original_payment_id?: string
          reversal_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_modifications_new_payment_id_fkey"
            columns: ["new_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_modifications_original_payment_id_fkey"
            columns: ["original_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_modifications_reversal_payment_id_fkey"
            columns: ["reversal_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          family_id: string | null
          id: string
          memo: string | null
          method: string
          occurred_at: string
          parent_payment_id: string | null
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          family_id?: string | null
          id?: string
          memo?: string | null
          method: string
          occurred_at?: string
          parent_payment_id?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          family_id?: string | null
          id?: string
          memo?: string | null
          method?: string
          occurred_at?: string
          parent_payment_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_parent_payment_id_fkey"
            columns: ["parent_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_summaries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          month: string
          sessions_count: number
          teacher_id: string
          total_amount: number
          total_hours: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          month: string
          sessions_count?: number
          teacher_id: string
          total_amount?: number
          total_hours?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          month?: string
          sessions_count?: number
          teacher_id?: string
          total_amount?: number
          total_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_summaries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          date: string
          homework_id: string | null
          homework_title: string | null
          id: string
          month: string
          notes: string | null
          points: number
          session_id: string | null
          student_id: string
          type: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          date: string
          homework_id?: string | null
          homework_title?: string | null
          id?: string
          month?: string
          notes?: string | null
          points: number
          session_id?: string | null
          student_id: string
          type: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          homework_id?: string | null
          homework_title?: string | null
          id?: string
          month?: string
          notes?: string | null
          points?: number
          session_id?: string | null
          student_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cefr_level: string | null
          created_at: string | null
          display_name: string | null
          id: string
          school_class: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cefr_level?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          school_class?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cefr_level?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          school_class?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_bonuses: {
        Row: {
          cadence: Database["public"]["Enums"]["discount_cadence"]
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          note: string | null
          student_id: string
          type: Database["public"]["Enums"]["discount_type"]
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          cadence: Database["public"]["Enums"]["discount_cadence"]
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          note?: string | null
          student_id: string
          type: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          updated_by?: string | null
          value: number
        }
        Update: {
          cadence?: Database["public"]["Enums"]["discount_cadence"]
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          note?: string | null
          student_id?: string
          type?: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_bonuses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_class_access: {
        Row: {
          class_id: string
          id: string
          resource_id: string
        }
        Insert: {
          class_id: string
          id?: string
          resource_id: string
        }
        Update: {
          class_id?: string
          id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_class_access_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_class_access_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          blooms_levels: string[] | null
          created_at: string
          description: string | null
          external_url: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          id: string
          pyp_themes: string[] | null
          storage_key: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          uploaded_by: string
          visibility: string
          vocab_tags: string[] | null
        }
        Insert: {
          blooms_levels?: string[] | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          pyp_themes?: string[] | null
          storage_key?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
          visibility?: string
          vocab_tags?: string[] | null
        }
        Update: {
          blooms_levels?: string[] | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          pyp_themes?: string[] | null
          storage_key?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          visibility?: string
          vocab_tags?: string[] | null
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          participant_type: string
          session_id: string
          teacher_id: string | null
          teaching_assistant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          participant_type?: string
          session_id: string
          teacher_id?: string | null
          teaching_assistant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          participant_type?: string
          session_id?: string
          teacher_id?: string | null
          teaching_assistant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_teaching_assistant_id_fkey"
            columns: ["teaching_assistant_id"]
            isOneToOne: false
            referencedRelation: "teaching_assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          canceled_at: string | null
          canceled_by: string | null
          canceled_reason: string | null
          class_id: string
          created_at: string
          created_by: string | null
          date: string
          end_time: string
          id: string
          is_manual: boolean
          manual_reason: string | null
          notes: string | null
          rate_override_vnd: number | null
          start_time: string
          status: Database["public"]["Enums"]["session_status"]
          teacher_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canceled_at?: string | null
          canceled_by?: string | null
          canceled_reason?: string | null
          class_id: string
          created_at?: string
          created_by?: string | null
          date: string
          end_time: string
          id?: string
          is_manual?: boolean
          manual_reason?: string | null
          notes?: string | null
          rate_override_vnd?: number | null
          start_time: string
          status?: Database["public"]["Enums"]["session_status"]
          teacher_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canceled_at?: string | null
          canceled_by?: string | null
          canceled_reason?: string | null
          class_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          end_time?: string
          id?: string
          is_manual?: boolean
          manual_reason?: string | null
          notes?: string | null
          rate_override_vnd?: number | null
          start_time?: string
          status?: Database["public"]["Enums"]["session_status"]
          teacher_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          after_balance: number
          amount: number
          approver_id: string | null
          before_balance: number
          consent_given: boolean | null
          created_at: string
          created_by: string | null
          id: string
          month: string
          reason: string | null
          settlement_type: string
          student_id: string
          tx_id: string
        }
        Insert: {
          after_balance: number
          amount: number
          approver_id?: string | null
          before_balance: number
          consent_given?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          month: string
          reason?: string | null
          settlement_type: string
          student_id: string
          tx_id: string
        }
        Update: {
          after_balance?: number
          amount?: number
          approver_id?: string | null
          before_balance?: number
          consent_given?: boolean | null
          created_at?: string
          created_by?: string | null
          id?: string
          month?: string
          reason?: string | null
          settlement_type?: string
          student_id?: string
          tx_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sibling_discount_state: {
        Row: {
          computed_at: string
          family_id: string
          month: string
          projected_base_snapshot: number | null
          reason: string | null
          sibling_percent: number
          status: string
          winner_class_id: string | null
          winner_student_id: string | null
        }
        Insert: {
          computed_at?: string
          family_id: string
          month: string
          projected_base_snapshot?: number | null
          reason?: string | null
          sibling_percent: number
          status: string
          winner_class_id?: string | null
          winner_student_id?: string | null
        }
        Update: {
          computed_at?: string
          family_id?: string
          month?: string
          projected_base_snapshot?: number | null
          reason?: string | null
          sibling_percent?: number
          status?: string
          winner_class_id?: string | null
          winner_student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sibling_discount_state_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sibling_discount_state_winner_class_id_fkey"
            columns: ["winner_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sibling_discount_state_winner_student_id_fkey"
            columns: ["winner_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      site_announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          display_type: string
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_dismissible: boolean
          placement: string
          priority: number
          starts_at: string | null
          style_config: Json
          target_audience: string
          target_class_ids: string[] | null
          target_student_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by: string
          display_type?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_dismissible?: boolean
          placement?: string
          priority?: number
          starts_at?: string | null
          style_config?: Json
          target_audience?: string
          target_class_ids?: string[] | null
          target_student_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          display_type?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_dismissible?: boolean
          placement?: string
          priority?: number
          starts_at?: string | null
          style_config?: Json
          target_audience?: string
          target_class_ids?: string[] | null
          target_student_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      skill_assessments: {
        Row: {
          class_id: string
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          score: number
          session_id: string | null
          skill: string
          student_id: string
          teacher_comment: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          score: number
          session_id?: string | null
          skill: string
          student_id: string
          teacher_comment?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          score?: number
          session_id?: string | null
          skill?: string
          student_id?: string
          teacher_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_assessments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance_streaks: {
        Row: {
          bonuses_awarded: number | null
          class_id: string
          consecutive_days: number | null
          created_at: string | null
          id: string
          last_attendance_date: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          bonuses_awarded?: number | null
          class_id: string
          consecutive_days?: number | null
          created_at?: string | null
          id?: string
          last_attendance_date?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          bonuses_awarded?: number | null
          class_id?: string
          consecutive_days?: number | null
          created_at?: string | null
          id?: string
          last_attendance_date?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_streaks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_streaks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_login_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_homework_check: string | null
          last_login_date: string | null
          longest_streak: number | null
          streak_freeze_count: number | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_homework_check?: string | null
          last_login_date?: string | null
          longest_streak?: number | null
          streak_freeze_count?: number | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_homework_check?: string | null
          last_login_date?: string | null
          longest_streak?: number | null
          streak_freeze_count?: number | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_login_streaks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_points: {
        Row: {
          class_id: string
          created_at: string
          homework_points: number
          id: string
          month: string
          participation_points: number
          reading_theory_points: number
          student_id: string
          total_points: number | null
          updated_at: string
          vocabulary_quiz_points: number
        }
        Insert: {
          class_id: string
          created_at?: string
          homework_points?: number
          id?: string
          month: string
          participation_points?: number
          reading_theory_points?: number
          student_id: string
          total_points?: number | null
          updated_at?: string
          vocabulary_quiz_points?: number
        }
        Update: {
          class_id?: string
          created_at?: string
          homework_points?: number
          id?: string
          month?: string
          participation_points?: number
          reading_theory_points?: number
          student_id?: string
          total_points?: number | null
          updated_at?: string
          vocabulary_quiz_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_points_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_points_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_vocabulary_entries: {
        Row: {
          cefr: string | null
          class_id: string | null
          created_at: string
          definition_en: string | null
          definition_vi: string | null
          enrichment: Json | null
          id: string
          image_url: string | null
          last_reviewed_at: string | null
          mastery_level: number
          next_review_date: string
          root_word: string
          student_id: string | null
          times_correct: number
          times_reviewed: number
          updated_at: string
          user_examples: Json
          user_id: string
          word: string
        }
        Insert: {
          cefr?: string | null
          class_id?: string | null
          created_at?: string
          definition_en?: string | null
          definition_vi?: string | null
          enrichment?: Json | null
          id?: string
          image_url?: string | null
          last_reviewed_at?: string | null
          mastery_level?: number
          next_review_date?: string
          root_word: string
          student_id?: string | null
          times_correct?: number
          times_reviewed?: number
          updated_at?: string
          user_examples?: Json
          user_id: string
          word: string
        }
        Update: {
          cefr?: string | null
          class_id?: string | null
          created_at?: string
          definition_en?: string | null
          definition_vi?: string | null
          enrichment?: Json | null
          id?: string
          image_url?: string | null
          last_reviewed_at?: string | null
          mastery_level?: number
          next_review_date?: string
          root_word?: string
          student_id?: string | null
          times_correct?: number
          times_reviewed?: number
          updated_at?: string
          user_examples?: Json
          user_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_vocabulary_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_vocabulary_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          avatar_url: string | null
          cash_on_hand: number
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          family_id: string | null
          full_name: string
          id: string
          is_active: boolean
          linked_user_id: string | null
          migration_completed_at: string | null
          notes: string | null
          phone: string | null
          secondary_user_id: string | null
          status_message: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          cash_on_hand?: number
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          family_id?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          linked_user_id?: string | null
          migration_completed_at?: string | null
          notes?: string | null
          phone?: string | null
          secondary_user_id?: string | null
          status_message?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          cash_on_hand?: number
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          family_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          linked_user_id?: string | null
          migration_completed_at?: string | null
          notes?: string | null
          phone?: string | null
          secondary_user_id?: string | null
          status_message?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_banking_info: {
        Row: {
          account_holder_name: string
          account_number: string
          bank_name: string
          branch_name: string | null
          created_at: string
          created_by: string | null
          id: string
          swift_code: string | null
          teacher_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_holder_name: string
          account_number: string
          bank_name: string
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          swift_code?: string | null
          teacher_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          bank_name?: string
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          swift_code?: string | null
          teacher_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_banking_info_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          hourly_rate_vnd: number
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          hourly_rate_vnd?: number
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          hourly_rate_vnd?: number
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_assistants: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          hourly_rate_vnd: number
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          hourly_rate_vnd?: number
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          hourly_rate_vnd?: number
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tuition_review_sessions: {
        Row: {
          ended_at: string | null
          id: string
          month: string
          reviewer_id: string | null
          started_at: string | null
          students_adjusted: number | null
          students_confirmed: number | null
          students_reviewed: number | null
        }
        Insert: {
          ended_at?: string | null
          id?: string
          month: string
          reviewer_id?: string | null
          started_at?: string | null
          students_adjusted?: number | null
          students_confirmed?: number | null
          students_reviewed?: number | null
        }
        Update: {
          ended_at?: string | null
          id?: string
          month?: string
          reviewer_id?: string | null
          started_at?: string | null
          students_adjusted?: number | null
          students_confirmed?: number | null
          students_reviewed?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      vocab_activity_log: {
        Row: {
          activity_type: string
          class_id: string | null
          created_at: string
          id: string
          points_awarded: number
          student_id: string | null
          user_id: string
          word: string | null
        }
        Insert: {
          activity_type: string
          class_id?: string | null
          created_at?: string
          id?: string
          points_awarded?: number
          student_id?: string | null
          user_id: string
          word?: string | null
        }
        Update: {
          activity_type?: string
          class_id?: string | null
          created_at?: string
          id?: string
          points_awarded?: number
          student_id?: string | null
          user_id?: string
          word?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vocab_activity_log_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_activity_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_cache: {
        Row: {
          created_at: string | null
          id: string
          image_urls: Json | null
          payload: Json
          root_word: string | null
          word: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_urls?: Json | null
          payload: Json
          root_word?: string | null
          word: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_urls?: Json | null
          payload?: Json
          root_word?: string | null
          word?: string
        }
        Relationships: []
      }
      vocab_image_cache: {
        Row: {
          counts: Json | null
          created_at: string
          expires_at: string
          hit_count: number
          images: Json
          query: string
          updated_at: string
        }
        Insert: {
          counts?: Json | null
          created_at?: string
          expires_at?: string
          hit_count?: number
          images: Json
          query: string
          updated_at?: string
        }
        Update: {
          counts?: Json | null
          created_at?: string
          expires_at?: string
          hit_count?: number
          images?: Json
          query?: string
          updated_at?: string
        }
        Relationships: []
      }
      xp_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          points: number
          setting_key: string
          setting_name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          points?: number
          setting_key: string
          setting_name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          points?: number
          setting_key?: string
          setting_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_projected_base: {
        Row: {
          month_start: string | null
          projected_base: number | null
          projected_sessions: number | null
          student_id: string | null
          ym: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _attendance_seed_for_class_dates: {
        Args: { p_class: string; p_from: string; p_to: string }
        Returns: undefined
      }
      archive_and_reset_monthly_leaderboard: {
        Args: { target_month: string }
        Returns: {
          archived_count: number
          reset_count: number
        }[]
      }
      assert_job_lock: {
        Args: { p_job: string; p_month: string }
        Returns: boolean
      }
      can_view_classmate: {
        Args: { student_id_to_view: string; viewer_user_id: string }
        Returns: boolean
      }
      can_view_family: {
        Args: { family_id: string; user_id: string }
        Returns: boolean
      }
      can_view_student: {
        Args: { student_id: string; user_id: string }
        Returns: boolean
      }
      check_teacher_availability: {
        Args: {
          p_date: string
          p_end_time: string
          p_exclude_session_id?: string
          p_start_time: string
          p_teacher_id: string
        }
        Returns: boolean
      }
      count_vocab_saves_today: { Args: { p_user_id: string }; Returns: number }
      end_enrollment: {
        Args: { p_class_id: string; p_end_date: string; p_student_id: string }
        Returns: Json
      }
      get_student_homeworks: { Args: { p_student_id: string }; Returns: Json }
      get_student_weekly_stats: {
        Args: { p_student_id: string; p_week_end: string; p_week_start: string }
        Returns: Json
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_journal_member: {
        Args: { _journal_id: string; _user_id: string }
        Returns: boolean
      }
      is_journal_owner: {
        Args: { _journal_id: string; _user_id: string }
        Returns: boolean
      }
      is_student_enrolled_in_class: {
        Args: { class_id_check: string; user_id: string }
        Returns: boolean
      }
      is_teacher_of_class: {
        Args: { class_id: string; user_id: string }
        Returns: boolean
      }
      modify_enrollment_transfer: {
        Args: {
          p_effective_date: string
          p_new_class_id: string
          p_old_class_id: string
          p_student_id: string
        }
        Returns: Json
      }
      normalize_session_statuses: { Args: { p_month: string }; Returns: Json }
      pause_enrollment: {
        Args: {
          p_class_id: string
          p_from_date: string
          p_memo?: string
          p_student_id: string
          p_to_date: string
        }
        Returns: Json
      }
      post_sibling_retro_credit: {
        Args: {
          p_amount: number
          p_memo: string
          p_month: string
          p_student_id: string
        }
        Returns: undefined
      }
      revert_invalid_held_sessions: {
        Args: { p_month: string; p_now: string; p_today: string }
        Returns: Json
      }
    }
    Enums: {
      account_code: "AR" | "REVENUE" | "DISCOUNT" | "CASH" | "BANK" | "CREDIT"
      app_role: "admin" | "teacher" | "family" | "student"
      discount_cadence: "once" | "monthly"
      discount_type: "percent" | "amount"
      economy_tx_status: "pending" | "approved" | "rejected"
      economy_tx_type: "convert_to_cash" | "spend_cash" | "deposit_cash"
      invoice_status: "draft" | "issued" | "paid" | "partial" | "credit"
      journal_action:
        | "create"
        | "invite"
        | "accept"
        | "update"
        | "leave"
        | "delete"
      journal_member_role: "owner" | "editor" | "viewer"
      journal_member_status: "active" | "invited"
      journal_type: "personal" | "student" | "class" | "collab_student_teacher"
      session_status: "Scheduled" | "Held" | "Canceled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_code: ["AR", "REVENUE", "DISCOUNT", "CASH", "BANK", "CREDIT"],
      app_role: ["admin", "teacher", "family", "student"],
      discount_cadence: ["once", "monthly"],
      discount_type: ["percent", "amount"],
      economy_tx_status: ["pending", "approved", "rejected"],
      economy_tx_type: ["convert_to_cash", "spend_cash", "deposit_cash"],
      invoice_status: ["draft", "issued", "paid", "partial", "credit"],
      journal_action: [
        "create",
        "invite",
        "accept",
        "update",
        "leave",
        "delete",
      ],
      journal_member_role: ["owner", "editor", "viewer"],
      journal_member_status: ["active", "invited"],
      journal_type: ["personal", "student", "class", "collab_student_teacher"],
      session_status: ["Scheduled", "Held", "Canceled"],
    },
  },
} as const
