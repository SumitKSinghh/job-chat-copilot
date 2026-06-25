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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          job_id: string
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          communication_score: number | null
          created_at: string
          custom_criteria_scores: Json | null
          detailed_feedback: string | null
          id: string
          interview_id: string
          overall_score: number | null
          recommendation: string | null
          skill_score: number | null
          strengths: string[] | null
          weaknesses: string[] | null
        }
        Insert: {
          communication_score?: number | null
          created_at?: string
          custom_criteria_scores?: Json | null
          detailed_feedback?: string | null
          id?: string
          interview_id: string
          overall_score?: number | null
          recommendation?: string | null
          skill_score?: number | null
          strengths?: string[] | null
          weaknesses?: string[] | null
        }
        Update: {
          communication_score?: number | null
          created_at?: string
          custom_criteria_scores?: Json | null
          detailed_feedback?: string | null
          id?: string
          interview_id?: string
          overall_score?: number | null
          recommendation?: string | null
          skill_score?: number | null
          strengths?: string[] | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: true
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_strategies: {
        Row: {
          core_skills: string[] | null
          created_at: string
          difficulty_level: string | null
          evaluation_focus: string[] | null
          id: string
          job_id: string
          role_type: string | null
          strategy_notes: string | null
        }
        Insert: {
          core_skills?: string[] | null
          created_at?: string
          difficulty_level?: string | null
          evaluation_focus?: string[] | null
          id?: string
          job_id: string
          role_type?: string | null
          strategy_notes?: string | null
        }
        Update: {
          core_skills?: string[] | null
          created_at?: string
          difficulty_level?: string | null
          evaluation_focus?: string[] | null
          id?: string
          job_id?: string
          role_type?: string | null
          strategy_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_strategies_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          completed_at: string | null
          id: string
          started_at: string
          status: string
        }
        Insert: {
          application_id: string
          completed_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Update: {
          application_id?: string
          completed_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          additional_criteria: string | null
          additional_qualifications: string | null
          company_name: string | null
          created_at: string
          created_by: string
          custom_criteria: Json | null
          description: string
          education: string | null
          experience: string | null
          id: string
          interview_instructions: string | null
          ranking_weights: Json | null
          salary_max: number | null
          salary_min: number | null
          skills: string[] | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          additional_criteria?: string | null
          additional_qualifications?: string | null
          company_name?: string | null
          created_at?: string
          created_by: string
          custom_criteria?: Json | null
          description: string
          education?: string | null
          experience?: string | null
          id?: string
          interview_instructions?: string | null
          ranking_weights?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          additional_criteria?: string | null
          additional_qualifications?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string
          custom_criteria?: Json | null
          description?: string
          education?: string | null
          experience?: string | null
          id?: string
          interview_instructions?: string | null
          ranking_weights?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string
          id: string
          job_id: string
          order_index: number
          question_text: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          order_index?: number
          question_text: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          order_index?: number
          question_text?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          answer_text: string
          created_at: string
          id: string
          interview_id: string
          question_id: string
        }
        Insert: {
          answer_text: string
          created_at?: string
          id?: string
          interview_id: string
          question_id: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          id?: string
          interview_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          analysis_status: string | null
          candidate_id: string
          created_at: string
          extracted_skills: string[] | null
          gaps: Json | null
          generated_markdown: string
          hiring_risks: string[] | null
          id: string
          job_id: string | null
          match_breakdown: Json | null
          original_text: string
          parsed_certifications: string[] | null
          parsed_education: Json | null
          parsed_experience: Json | null
          total_experience_years: number | null
          updated_at: string
        }
        Insert: {
          analysis_status?: string | null
          candidate_id: string
          created_at?: string
          extracted_skills?: string[] | null
          gaps?: Json | null
          generated_markdown: string
          hiring_risks?: string[] | null
          id?: string
          job_id?: string | null
          match_breakdown?: Json | null
          original_text: string
          parsed_certifications?: string[] | null
          parsed_education?: Json | null
          parsed_experience?: Json | null
          total_experience_years?: number | null
          updated_at?: string
        }
        Update: {
          analysis_status?: string | null
          candidate_id?: string
          created_at?: string
          extracted_skills?: string[] | null
          gaps?: Json | null
          generated_markdown?: string
          hiring_risks?: string[] | null
          id?: string
          job_id?: string | null
          match_breakdown?: Json | null
          original_text?: string
          parsed_certifications?: string[] | null
          parsed_education?: Json | null
          parsed_experience?: Json | null
          total_experience_years?: number | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "company" | "candidate"
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
      app_role: ["company", "candidate"],
    },
  },
} as const
