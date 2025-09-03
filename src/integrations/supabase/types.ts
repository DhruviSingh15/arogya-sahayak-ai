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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          created_at: string
          description: string
          expires_at: string | null
          id: string
          insight_type: string
          is_read: boolean
          priority: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          insight_type: string
          is_read?: boolean
          priority?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_read?: boolean
          priority?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      behavioral_signals: {
        Row: {
          confidence_level: number | null
          detected_at: string
          id: string
          impact_score: number | null
          is_active: boolean
          signal_data: Json
          signal_type: string
          twin_id: string
        }
        Insert: {
          confidence_level?: number | null
          detected_at?: string
          id?: string
          impact_score?: number | null
          is_active?: boolean
          signal_data: Json
          signal_type: string
          twin_id: string
        }
        Update: {
          confidence_level?: number | null
          detected_at?: string
          id?: string
          impact_score?: number | null
          is_active?: boolean
          signal_data?: Json
          signal_type?: string
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_signals_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "financial_digital_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string
          id: string
          tokens: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding: string
          id?: string
          tokens?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string
          id?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          checksum: string | null
          content_html: string | null
          content_text: string
          created_at: string
          doc_type: string
          fetched_at: string
          id: string
          jurisdiction: string
          language: string
          published_at: string | null
          source_url: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string | null
          checksum?: string | null
          content_html?: string | null
          content_text: string
          created_at?: string
          doc_type: string
          fetched_at?: string
          id?: string
          jurisdiction?: string
          language?: string
          published_at?: string | null
          source_url?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string | null
          checksum?: string | null
          content_html?: string | null
          content_text?: string
          created_at?: string
          doc_type?: string
          fetched_at?: string
          id?: string
          jurisdiction?: string
          language?: string
          published_at?: string | null
          source_url?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      financial_accounts: {
        Row: {
          account_name: string
          account_type: string
          balance: number
          created_at: string
          currency: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_type: string
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_type?: string
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_digital_twins: {
        Row: {
          behavioral_patterns: Json
          created_at: string
          financial_personality: Json
          id: string
          is_active: boolean
          last_model_update: string | null
          prediction_accuracy: number | null
          risk_profile: Json
          twin_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          behavioral_patterns?: Json
          created_at?: string
          financial_personality?: Json
          id?: string
          is_active?: boolean
          last_model_update?: string | null
          prediction_accuracy?: number | null
          risk_profile?: Json
          twin_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          behavioral_patterns?: Json
          created_at?: string
          financial_personality?: Json
          id?: string
          is_active?: boolean
          last_model_update?: string | null
          prediction_accuracy?: number | null
          risk_profile?: Json
          twin_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          category: string
          created_at: string
          current_amount: number
          id: string
          status: string
          target_amount: number
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          current_amount?: number
          id?: string
          status?: string
          target_amount: number
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_amount?: number
          id?: string
          status?: string
          target_amount?: number
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_states: {
        Row: {
          cash_flow: number
          debt_total: number
          emergency_fund: number
          id: string
          investment_value: number
          monthly_expenses: number
          monthly_income: number
          net_worth: number
          risk_exposure: number
          state_metadata: Json
          state_timestamp: string
          twin_id: string
        }
        Insert: {
          cash_flow: number
          debt_total?: number
          emergency_fund?: number
          id?: string
          investment_value?: number
          monthly_expenses?: number
          monthly_income?: number
          net_worth: number
          risk_exposure?: number
          state_metadata?: Json
          state_timestamp?: string
          twin_id: string
        }
        Update: {
          cash_flow?: number
          debt_total?: number
          emergency_fund?: number
          id?: string
          investment_value?: number
          monthly_expenses?: number
          monthly_income?: number
          net_worth?: number
          risk_exposure?: number
          state_metadata?: Json
          state_timestamp?: string
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_states_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "financial_digital_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      market_conditions: {
        Row: {
          condition_date: string
          created_at: string
          economic_indicators: Json
          id: string
          market_data: Json
          sentiment_score: number | null
          volatility_index: number | null
        }
        Insert: {
          condition_date?: string
          created_at?: string
          economic_indicators?: Json
          id?: string
          market_data: Json
          sentiment_score?: number | null
          volatility_index?: number | null
        }
        Update: {
          condition_date?: string
          created_at?: string
          economic_indicators?: Json
          id?: string
          market_data?: Json
          sentiment_score?: number | null
          volatility_index?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scenario_predictions: {
        Row: {
          actual_outcome: Json | null
          confidence_level: number | null
          expires_at: string | null
          id: string
          is_realized: boolean | null
          market_conditions_id: string | null
          prediction_data: Json
          prediction_date: string
          scenario_name: string
          scenario_type: string
          twin_id: string
        }
        Insert: {
          actual_outcome?: Json | null
          confidence_level?: number | null
          expires_at?: string | null
          id?: string
          is_realized?: boolean | null
          market_conditions_id?: string | null
          prediction_data: Json
          prediction_date?: string
          scenario_name: string
          scenario_type: string
          twin_id: string
        }
        Update: {
          actual_outcome?: Json | null
          confidence_level?: number | null
          expires_at?: string | null
          id?: string
          is_realized?: boolean | null
          market_conditions_id?: string | null
          prediction_data?: Json
          prediction_date?: string
          scenario_name?: string
          scenario_type?: string
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_predictions_market_conditions_id_fkey"
            columns: ["market_conditions_id"]
            isOneToOne: false
            referencedRelation: "market_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_predictions_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "financial_digital_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category: string
          created_at?: string
          description: string
          id?: string
          transaction_date?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_learning_sessions: {
        Row: {
          confidence_score: number | null
          created_at: string
          feedback_score: number | null
          id: string
          input_data: Json
          learning_weights: Json
          output_data: Json
          session_type: string
          twin_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          feedback_score?: number | null
          id?: string
          input_data: Json
          learning_weights?: Json
          output_data: Json
          session_type: string
          twin_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          feedback_score?: number | null
          id?: string
          input_data?: Json
          learning_weights?: Json
          output_data?: Json
          session_type?: string
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_learning_sessions_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "financial_digital_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_snapshots: {
        Row: {
          created_at: string
          id: string
          net_worth: number
          snapshot_date: string
          total_assets: number
          total_liabilities: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          net_worth: number
          snapshot_date?: string
          total_assets: number
          total_liabilities: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          net_worth?: number
          snapshot_date?: string
          total_assets?: number
          total_liabilities?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
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
