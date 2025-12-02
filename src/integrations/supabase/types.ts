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
      matches: {
        Row: {
          away_score: number | null
          away_team_id: string
          created_at: string | null
          field_number: number | null
          group_id: string | null
          home_score: number | null
          home_team_id: string
          id: string
          match_number: number
          match_type: string
          notes: string | null
          scheduled_time: string
          status: string
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_id: string
          created_at?: string | null
          field_number?: number | null
          group_id?: string | null
          home_score?: number | null
          home_team_id: string
          id?: string
          match_number: number
          match_type?: string
          notes?: string | null
          scheduled_time: string
          status?: string
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string
          created_at?: string | null
          field_number?: number | null
          group_id?: string | null
          home_score?: number | null
          home_team_id?: string
          id?: string
          match_number?: number
          match_type?: string
          notes?: string | null
          scheduled_time?: string
          status?: string
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          creditor_account: string | null
          creditor_address: string | null
          creditor_building_number: string | null
          creditor_city: string | null
          creditor_country: string | null
          creditor_zip: string | null
          full_name: string
          id: string
          organization: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creditor_account?: string | null
          creditor_address?: string | null
          creditor_building_number?: string | null
          creditor_city?: string | null
          creditor_country?: string | null
          creditor_zip?: string | null
          full_name: string
          id: string
          organization?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creditor_account?: string | null
          creditor_address?: string | null
          creditor_building_number?: string | null
          creditor_city?: string | null
          creditor_country?: string | null
          creditor_zip?: string | null
          full_name?: string
          id?: string
          organization?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          logo_url: string | null
          name: string
          tier: string
          tournament_id: string
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          logo_url?: string | null
          name: string
          tier?: string
          tournament_id: string
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          tier?: string
          tournament_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      team_players: {
        Row: {
          created_at: string | null
          id: string
          is_licensed: boolean
          jersey_number: number | null
          license_number: string | null
          name: string
          position: string | null
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_licensed?: boolean
          jersey_number?: number | null
          license_number?: string | null
          name: string
          position?: string | null
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_licensed?: boolean
          jersey_number?: number | null
          license_number?: string | null
          name?: string
          position?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category_id: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          costume_description: string | null
          created_at: string | null
          id: string
          name: string
          payment_method: string | null
          payment_status: string
          registration_token: string
          rules_accepted: boolean
          status: string
          stripe_payment_intent_id: string | null
          supervisor_name: string | null
          terms_accepted: boolean
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          costume_description?: string | null
          created_at?: string | null
          id?: string
          name: string
          payment_method?: string | null
          payment_status?: string
          registration_token?: string
          rules_accepted?: boolean
          status?: string
          stripe_payment_intent_id?: string | null
          supervisor_name?: string | null
          terms_accepted?: boolean
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          costume_description?: string | null
          created_at?: string | null
          id?: string
          name?: string
          payment_method?: string | null
          payment_status?: string
          registration_token?: string
          rules_accepted?: boolean
          status?: string
          stripe_payment_intent_id?: string | null
          supervisor_name?: string | null
          terms_accepted?: boolean
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_categories: {
        Row: {
          created_at: string | null
          description: string | null
          entry_fee: number
          id: string
          max_licensed_players: number
          max_players: number
          max_teams: number | null
          min_players: number
          min_teams: number | null
          name: string
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entry_fee?: number
          id?: string
          max_licensed_players?: number
          max_players?: number
          max_teams?: number | null
          min_players?: number
          min_teams?: number | null
          name: string
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entry_fee?: number
          id?: string
          max_licensed_players?: number
          max_players?: number
          max_teams?: number | null
          min_players?: number
          min_teams?: number | null
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_categories_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_groups: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          name: string
          tournament_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          name: string
          tournament_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_groups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          creditor_account: string | null
          creditor_address: string | null
          creditor_building_number: string | null
          creditor_city: string | null
          creditor_country: string | null
          creditor_name: string | null
          creditor_zip: string | null
          custom_domain: string | null
          date: string
          description: string | null
          domain_status: string | null
          domain_verification_token: string | null
          end_time: string | null
          entry_fee: number
          id: string
          location: string
          name: string
          organizer_id: string
          payment_reference_prefix: string | null
          registration_deadline: string | null
          rules: string | null
          rules_pdf_url: string | null
          sport_type: string | null
          start_time: string | null
          status: string
          terms_and_conditions: string | null
          terms_pdf_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creditor_account?: string | null
          creditor_address?: string | null
          creditor_building_number?: string | null
          creditor_city?: string | null
          creditor_country?: string | null
          creditor_name?: string | null
          creditor_zip?: string | null
          custom_domain?: string | null
          date: string
          description?: string | null
          domain_status?: string | null
          domain_verification_token?: string | null
          end_time?: string | null
          entry_fee?: number
          id?: string
          location: string
          name: string
          organizer_id: string
          payment_reference_prefix?: string | null
          registration_deadline?: string | null
          rules?: string | null
          rules_pdf_url?: string | null
          sport_type?: string | null
          start_time?: string | null
          status?: string
          terms_and_conditions?: string | null
          terms_pdf_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creditor_account?: string | null
          creditor_address?: string | null
          creditor_building_number?: string | null
          creditor_city?: string | null
          creditor_country?: string | null
          creditor_name?: string | null
          creditor_zip?: string | null
          custom_domain?: string | null
          date?: string
          description?: string | null
          domain_status?: string | null
          domain_verification_token?: string | null
          end_time?: string | null
          entry_fee?: number
          id?: string
          location?: string
          name?: string
          organizer_id?: string
          payment_reference_prefix?: string | null
          registration_deadline?: string | null
          rules?: string | null
          rules_pdf_url?: string | null
          sport_type?: string | null
          start_time?: string | null
          status?: string
          terms_and_conditions?: string | null
          terms_pdf_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_verification_token: { Args: never; Returns: string }
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
