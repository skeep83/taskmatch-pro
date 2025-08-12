export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bids: {
        Row: {
          created_at: string
          eta_slot: string | null
          id: string
          is_final: boolean
          note: string | null
          price_cents: number
          pro_id: string
          tender_id: string
          warranty_days: number | null
        }
        Insert: {
          created_at?: string
          eta_slot?: string | null
          id?: string
          is_final?: boolean
          note?: string | null
          price_cents: number
          pro_id: string
          tender_id: string
          warranty_days?: number | null
        }
        Update: {
          created_at?: string
          eta_slot?: string | null
          id?: string
          is_final?: boolean
          note?: string | null
          price_cents?: number
          pro_id?: string
          tender_id?: string
          warranty_days?: number | null
        }
        Relationships: []
      }
      biz_invoices: {
        Row: {
          amount_cents: number
          business_id: string
          created_at: string
          currency: string
          due_date: string | null
          id: string
          pdf_url: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          business_id: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          business_id?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Relationships: []
      }
      business_accounts: {
        Row: {
          company_name: string
          contract_url: string | null
          created_at: string
          id: string
          idno: string | null
          legal_address: string | null
          owner_id: string
          rate_multiplier: number
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          company_name: string
          contract_url?: string | null
          created_at?: string
          id?: string
          idno?: string | null
          legal_address?: string | null
          owner_id: string
          rate_multiplier?: number
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          company_name?: string
          contract_url?: string | null
          created_at?: string
          id?: string
          idno?: string | null
          legal_address?: string | null
          owner_id?: string
          rate_multiplier?: number
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      business_jobs: {
        Row: {
          business_id: string
          created_at: string
          id: string
          job_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          job_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          job_id?: string
        }
        Relationships: []
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          limits: Json | null
          role: Database["public"]["Enums"]["biz_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          limits?: Json | null
          role?: Database["public"]["Enums"]["biz_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          limits?: Json | null
          role?: Database["public"]["Enums"]["biz_role"]
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          key: string
          label_ro: string | null
          label_ru: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label_ro?: string | null
          label_ru?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label_ro?: string | null
          label_ru?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          is_read: boolean
          message_type: string
          sender_id: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          client_id: string
          created_at: string
          id: string
          job_id: string | null
          last_message_at: string | null
          professional_id: string
          status: Database["public"]["Enums"]["chat_status"]
          tender_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          professional_id: string
          status?: Database["public"]["Enums"]["chat_status"]
          tender_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          professional_id?: string
          status?: Database["public"]["Enums"]["chat_status"]
          tender_id?: string | null
        }
        Relationships: []
      }
      escrows: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string
          currency: string
          id: string
          job_id: string
          pro_id: string | null
          status: Database["public"]["Enums"]["escrow_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          job_id: string
          pro_id?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          job_id?: string
          pro_id?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          updated_at?: string
        }
        Relationships: []
      }
      job_photos: {
        Row: {
          created_at: string
          file_url: string
          id: string
          job_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          job_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          job_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          budget_max_cents: number | null
          budget_min_cents: number | null
          category_id: string
          client_id: string
          created_at: string
          description: string | null
          end_confirmed: boolean
          id: string
          pro_id: string | null
          scheduled_at: string | null
          start_confirmed: boolean
          status: Database["public"]["Enums"]["job_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          budget_max_cents?: number | null
          budget_min_cents?: number | null
          category_id: string
          client_id: string
          created_at?: string
          description?: string | null
          end_confirmed?: boolean
          id?: string
          pro_id?: string | null
          scheduled_at?: string | null
          start_confirmed?: boolean
          status?: Database["public"]["Enums"]["job_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          budget_max_cents?: number | null
          budget_min_cents?: number | null
          category_id?: string
          client_id?: string
          created_at?: string
          description?: string | null
          end_confirmed?: boolean
          id?: string
          pro_id?: string | null
          scheduled_at?: string | null
          start_confirmed?: boolean
          status?: Database["public"]["Enums"]["job_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_url: string
          id: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_url: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_url?: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          pro_id: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          pro_id: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          pro_id?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          pro_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          pro_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          pro_id?: string
          title?: string | null
        }
        Relationships: []
      }
      pricing_templates: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          currency: string
          id: string
          price_cents: number
          same_day_fee_cents: number | null
          title_ro: string | null
          title_ru: string | null
          updated_at: string
          urgent_multiplier: number | null
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          currency?: string
          id?: string
          price_cents: number
          same_day_fee_cents?: number | null
          title_ro?: string | null
          title_ru?: string | null
          updated_at?: string
          urgent_multiplier?: number | null
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          currency?: string
          id?: string
          price_cents?: number
          same_day_fee_cents?: number | null
          title_ro?: string | null
          title_ru?: string | null
          updated_at?: string
          urgent_multiplier?: number | null
        }
        Relationships: []
      }
      pro_availability: {
        Row: {
          created_at: string
          end_time: string
          id: string
          start_time: string
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          start_time: string
          user_id: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      pro_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      pro_profiles: {
        Row: {
          bio: string | null
          created_at: string
          fixed_price_cents: number | null
          hourly_rate_cents: number | null
          id: string
          radius_km: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          fixed_price_cents?: number | null
          hourly_rate_cents?: number | null
          id?: string
          radius_km?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          fixed_price_cents?: number | null
          hourly_rate_cents?: number | null
          id?: string
          radius_km?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pro_rating_stats: {
        Row: {
          avg_score: number
          pro_id: string
          rating_count: number
          updated_at: string
        }
        Insert: {
          avg_score?: number
          pro_id: string
          rating_count?: number
          updated_at?: string
        }
        Update: {
          avg_score?: number
          pro_id?: string
          rating_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          locale: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          locale?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          locale?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          from_user_id: string
          id: string
          job_id: string
          score: number
          to_user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          job_id: string
          score: number
          to_user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          job_id?: string
          score?: number
          to_user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_cents: number | null
          created_at: string
          id: string
          referred_id: string | null
          referrer_id: string
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          bonus_cents?: number | null
          created_at?: string
          id?: string
          referred_id?: string | null
          referrer_id: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          bonus_cents?: number | null
          created_at?: string
          id?: string
          referred_id?: string | null
          referrer_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          renews_at: string | null
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          renews_at?: string | null
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          renews_at?: string | null
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenders: {
        Row: {
          budget_hint_cents: number | null
          category_id: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          status: Database["public"]["Enums"]["tender_status"]
          title: string | null
          updated_at: string
          window_from: string | null
          window_to: string | null
        }
        Insert: {
          budget_hint_cents?: number | null
          category_id: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["tender_status"]
          title?: string | null
          updated_at?: string
          window_from?: string | null
          window_to?: string | null
        }
        Update: {
          budget_hint_cents?: number | null
          category_id?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["tender_status"]
          title?: string | null
          updated_at?: string
          window_from?: string | null
          window_to?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number
          created_at: string
          direction: Database["public"]["Enums"]["txn_direction"]
          id: string
          job_id: string | null
          meta: Json | null
          pro_id: string | null
          subject: string
          subject_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          direction: Database["public"]["Enums"]["txn_direction"]
          id?: string
          job_id?: string | null
          meta?: Json | null
          pro_id?: string | null
          subject: string
          subject_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          direction?: Database["public"]["Enums"]["txn_direction"]
          id?: string
          job_id?: string | null
          meta?: Json | null
          pro_id?: string | null
          subject?: string
          subject_id?: string | null
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
      wallets: {
        Row: {
          balance_cents: number
          created_at: string
          pro_id: string
          updated_at: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          pro_id: string
          updated_at?: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          pro_id?: string
          updated_at?: string
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
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      refresh_pro_rating_stats: {
        Args: { _pro_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "client" | "pro" | "business" | "admin"
      biz_role: "owner" | "manager" | "member"
      chat_status: "active" | "closed"
      escrow_status: "held" | "released" | "refunded"
      invoice_status: "draft" | "sent" | "paid" | "canceled"
      job_status:
        | "new"
        | "accepted"
        | "in_progress"
        | "done"
        | "disputed"
        | "canceled"
      kyc_status: "pending" | "approved" | "rejected"
      payout_status: "pending" | "approved" | "rejected" | "paid"
      referral_status: "pending" | "granted" | "revoked"
      tender_status: "open" | "closed" | "awarded" | "canceled"
      txn_direction: "credit" | "debit"
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
      app_role: ["client", "pro", "business", "admin"],
      biz_role: ["owner", "manager", "member"],
      chat_status: ["active", "closed"],
      escrow_status: ["held", "released", "refunded"],
      invoice_status: ["draft", "sent", "paid", "canceled"],
      job_status: [
        "new",
        "accepted",
        "in_progress",
        "done",
        "disputed",
        "canceled",
      ],
      kyc_status: ["pending", "approved", "rejected"],
      payout_status: ["pending", "approved", "rejected", "paid"],
      referral_status: ["pending", "granted", "revoked"],
      tender_status: ["open", "closed", "awarded", "canceled"],
      txn_direction: ["credit", "debit"],
    },
  },
} as const
