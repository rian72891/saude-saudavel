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
      clinics: {
        Row: {
          address: string
          clinic_type: string
          created_at: string
          emoji: string
          id: string
          lat: number
          lng: number
          name: string
          phone: string | null
          specialty: string | null
        }
        Insert: {
          address: string
          clinic_type?: string
          created_at?: string
          emoji?: string
          id?: string
          lat: number
          lng: number
          name: string
          phone?: string | null
          specialty?: string | null
        }
        Update: {
          address?: string
          clinic_type?: string
          created_at?: string
          emoji?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          phone?: string | null
          specialty?: string | null
        }
        Relationships: []
      }
      gyms: {
        Row: {
          address: string
          created_at: string
          emoji: string
          id: string
          lat: number
          lng: number
          name: string
          price_range: string
          rating: number
          specialty: string | null
        }
        Insert: {
          address: string
          created_at?: string
          emoji?: string
          id?: string
          lat: number
          lng: number
          name: string
          price_range?: string
          rating?: number
          specialty?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          emoji?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          price_range?: string
          rating?: number
          specialty?: string | null
        }
        Relationships: []
      }
      health_logs: {
        Row: {
          ai_insight: string | null
          created_at: string
          glucose_mg_dl: number | null
          id: string
          log_date: string
          meals: Json
          mood: number | null
          sleep_hours: number | null
          steps: number
          total_calories: number
          updated_at: string
          user_id: string
          water_ml: number
          weight_kg: number | null
        }
        Insert: {
          ai_insight?: string | null
          created_at?: string
          glucose_mg_dl?: number | null
          id?: string
          log_date?: string
          meals?: Json
          mood?: number | null
          sleep_hours?: number | null
          steps?: number
          total_calories?: number
          updated_at?: string
          user_id: string
          water_ml?: number
          weight_kg?: number | null
        }
        Update: {
          ai_insight?: string | null
          created_at?: string
          glucose_mg_dl?: number | null
          id?: string
          log_date?: string
          meals?: Json
          mood?: number | null
          sleep_hours?: number | null
          steps?: number
          total_calories?: number
          updated_at?: string
          user_id?: string
          water_ml?: number
          weight_kg?: number | null
        }
        Relationships: []
      }
      news: {
        Row: {
          body: string | null
          category: string
          emoji: string
          gradient: string
          id: string
          published_at: string
          summary: string
          title: string
        }
        Insert: {
          body?: string | null
          category: string
          emoji?: string
          gradient?: string
          id?: string
          published_at?: string
          summary: string
          title: string
        }
        Update: {
          body?: string | null
          category?: string
          emoji?: string
          gradient?: string
          id?: string
          published_at?: string
          summary?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          city: string | null
          created_at: string
          full_name: string
          height_cm: number | null
          level: number
          updated_at: string
          user_id: string
          weekly_goal_cal: number
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          city?: string | null
          created_at?: string
          full_name?: string
          height_cm?: number | null
          level?: number
          updated_at?: string
          user_id: string
          weekly_goal_cal?: number
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          city?: string | null
          created_at?: string
          full_name?: string
          height_cm?: number | null
          level?: number
          updated_at?: string
          user_id?: string
          weekly_goal_cal?: number
          weight_kg?: number | null
        }
        Relationships: []
      }
      screenings: {
        Row: {
          created_at: string
          diet_level: number
          exercise_level: number
          family_history: number
          id: string
          risk_level: string
          score: number
          sleep_level: number
          user_id: string
        }
        Insert: {
          created_at?: string
          diet_level: number
          exercise_level: number
          family_history: number
          id?: string
          risk_level: string
          score: number
          sleep_level: number
          user_id: string
        }
        Update: {
          created_at?: string
          diet_level?: number
          exercise_level?: number
          family_history?: number
          id?: string
          risk_level?: string
          score?: number
          sleep_level?: number
          user_id?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          log_date: string
          user_id: string
          workout_type: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          log_date?: string
          user_id: string
          workout_type: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          log_date?: string
          user_id?: string
          workout_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
