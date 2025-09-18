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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          after: Json | null
          before: Json | null
          created_at: string | null
          entity: string
          entity_id: string
          id: number
        }
        Insert: {
          action: string
          actor_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          entity: string
          entity_id: string
          id?: number
        }
        Update: {
          action?: string
          actor_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          entity?: string
          entity_id?: string
          id?: number
        }
        Relationships: []
      }
      badges: {
        Row: {
          active: boolean
          created_at: string
          criteria: Json | null
          id: string
          key: string
          title_ro: string | null
          title_ru: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          criteria?: Json | null
          id?: string
          key: string
          title_ro?: string | null
          title_ru?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          criteria?: Json | null
          id?: string
          key?: string
          title_ro?: string | null
          title_ru?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      chat_sessions: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          job_id: string | null
          last_message_at: string | null
          pro_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          pro_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          pro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          active: boolean
          category_id: string | null
          city: string | null
          created_at: string | null
          id: string
          min_fee_cents: number
          night_coef: number
          pct: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          min_fee_cents?: number
          night_coef?: number
          pct?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          category_id?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          min_fee_cents?: number
          night_coef?: number
          pct?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimal_places: number
          exchange_rate: number
          id: string
          is_active: boolean
          is_base: boolean
          name_en: string
          name_ro: string | null
          name_ru: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          decimal_places?: number
          exchange_rate?: number
          id?: string
          is_active?: boolean
          is_base?: boolean
          name_en: string
          name_ro?: string | null
          name_ru?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          decimal_places?: number
          exchange_rate?: number
          id?: string
          is_active?: boolean
          is_base?: boolean
          name_en?: string
          name_ro?: string | null
          name_ru?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      dispute_cases: {
        Row: {
          assigned_to: string | null
          claimant: string
          created_at: string | null
          evidence: Json | null
          id: string
          job_id: string
          penalty_cents: number | null
          refund_cents: number | null
          resolution: string | null
          sla_due_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          claimant: string
          created_at?: string | null
          evidence?: Json | null
          id?: string
          job_id: string
          penalty_cents?: number | null
          refund_cents?: number | null
          resolution?: string | null
          sla_due_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          claimant?: string
          created_at?: string | null
          evidence?: Json | null
          id?: string
          job_id?: string
          penalty_cents?: number | null
          refund_cents?: number | null
          resolution?: string | null
          sla_due_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          created_at: string
          error_message: string | null
          html_content: string
          id: string
          language: string | null
          recipient: string
          sent_at: string | null
          status: string | null
          subject: string
          template: string
          template_data: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          html_content: string
          id?: string
          language?: string | null
          recipient: string
          sent_at?: string | null
          status?: string | null
          subject: string
          template: string
          template_data?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          html_content?: string
          id?: string
          language?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          template?: string
          template_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      endorsements: {
        Row: {
          created_at: string
          from_id: string
          id: string
          note: string | null
          skill: string
          to_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          note?: string | null
          skill: string
          to_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          note?: string | null
          skill?: string
          to_id?: string
          weight?: number
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
      exchange_rate_history: {
        Row: {
          changed_by: string | null
          created_at: string
          currency_id: string
          id: string
          new_rate: number
          old_rate: number
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          currency_id: string
          id?: string
          new_rate: number
          old_rate: number
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          currency_id?: string
          id?: string
          new_rate?: number
          old_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rate_history_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          provider: string
          request_data: Json | null
          response_data: Json | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          provider: string
          request_data?: Json | null
          response_data?: Json | null
          status: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          provider?: string
          request_data?: Json | null
          response_data?: Json | null
          status?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          created_at: string
          eta_slot: string | null
          id: string
          is_final: boolean
          job_id: string
          note: string | null
          price_cents: number
          pro_id: string
          status: string
          warranty_days: number | null
        }
        Insert: {
          created_at?: string
          eta_slot?: string | null
          id?: string
          is_final?: boolean
          job_id: string
          note?: string | null
          price_cents: number
          pro_id: string
          status?: string
          warranty_days?: number | null
        }
        Update: {
          created_at?: string
          eta_slot?: string | null
          id?: string
          is_final?: boolean
          job_id?: string
          note?: string | null
          price_cents?: number
          pro_id?: string
          status?: string
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      job_price_proposals: {
        Row: {
          created_at: string | null
          eta_slot: string | null
          id: string
          job_id: string
          note: string | null
          price_cents: number
          pro_id: string
          status: string | null
          updated_at: string | null
          warranty_days: number | null
        }
        Insert: {
          created_at?: string | null
          eta_slot?: string | null
          id?: string
          job_id: string
          note?: string | null
          price_cents: number
          pro_id: string
          status?: string | null
          updated_at?: string | null
          warranty_days?: number | null
        }
        Update: {
          created_at?: string | null
          eta_slot?: string | null
          id?: string
          job_id?: string
          note?: string | null
          price_cents?: number
          pro_id?: string
          status?: string | null
          updated_at?: string | null
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_price_proposals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          otp_code: string | null
          pro_id: string | null
          scheduled_at: string | null
          start_confirmed: boolean
          status: Database["public"]["Enums"]["job_status"]
          title: string | null
          updated_at: string
          urgency: string
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
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          otp_code?: string | null
          pro_id?: string | null
          scheduled_at?: string | null
          start_confirmed?: boolean
          status?: Database["public"]["Enums"]["job_status"]
          title?: string | null
          updated_at?: string
          urgency?: string
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
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          otp_code?: string | null
          pro_id?: string | null
          scheduled_at?: string | null
          start_confirmed?: boolean
          status?: Database["public"]["Enums"]["job_status"]
          title?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      languages: {
        Row: {
          code: string
          created_at: string
          flag_emoji: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          native_name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          native_name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          native_name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          job_id: string | null
          message_type: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          job_id?: string | null
          message_type?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          job_id?: string | null
          message_type?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: number
          reason: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: number
          reason?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: number
          reason?: string | null
          status?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          email_sent: boolean | null
          id: string
          is_read: boolean | null
          message: string
          message_ro: string | null
          push_sent: boolean | null
          sms_sent: boolean | null
          title: string
          title_ro: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          message: string
          message_ro?: string | null
          push_sent?: boolean | null
          sms_sent?: boolean | null
          title: string
          title_ro?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          message?: string
          message_ro?: string | null
          push_sent?: boolean | null
          sms_sent?: boolean | null
          title?: string
          title_ro?: string | null
          type?: string
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
      payouts: {
        Row: {
          amount_cents: number
          id: string
          initiated_at: string | null
          method: string | null
          pro_id: string
          settled_at: string | null
          status: string | null
        }
        Insert: {
          amount_cents: number
          id?: string
          initiated_at?: string | null
          method?: string | null
          pro_id: string
          settled_at?: string | null
          status?: string | null
        }
        Update: {
          amount_cents?: number
          id?: string
          initiated_at?: string | null
          method?: string | null
          pro_id?: string
          settled_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
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
      portfolio_media: {
        Row: {
          created_at: string
          display_order: number | null
          file_name: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          portfolio_item_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          file_name?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          portfolio_item_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          portfolio_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_media_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      post_photos: {
        Row: {
          created_at: string
          file_url: string
          id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          post_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          post_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          category_id: string | null
          city: string | null
          content: string | null
          created_at: string
          id: string
          is_published: boolean
          org_id: string | null
          title: string | null
          type: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          category_id?: string | null
          city?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          org_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          category_id?: string | null
          city?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          org_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      price_estimations: {
        Row: {
          accuracy_score: number | null
          actual_hours: number | null
          actual_price: number | null
          category: string
          created_at: string
          description: string
          estimated_hours: number
          estimated_price: number
          id: string
          image_analysis: string | null
          location: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          accuracy_score?: number | null
          actual_hours?: number | null
          actual_price?: number | null
          category: string
          created_at?: string
          description: string
          estimated_hours: number
          estimated_price: number
          id?: string
          image_analysis?: string | null
          location?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          accuracy_score?: number | null
          actual_hours?: number | null
          actual_price?: number | null
          category?: string
          created_at?: string
          description?: string
          estimated_hours?: number
          estimated_price?: number
          id?: string
          image_analysis?: string | null
          location?: string | null
          updated_at?: string
          urgency?: string | null
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
        Relationships: [
          {
            foreignKeyName: "fk_pro_profiles_user_id"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      pro_services: {
        Row: {
          base_price_cents: number | null
          category_id: string
          coverage_radius_km: number | null
          created_at: string
          hourly_rate_cents: number | null
          id: string
          is_active: boolean | null
          location_lat: number | null
          location_lng: number | null
          pro_id: string
          response_time_minutes: number | null
          updated_at: string
        }
        Insert: {
          base_price_cents?: number | null
          category_id: string
          coverage_radius_km?: number | null
          created_at?: string
          hourly_rate_cents?: number | null
          id?: string
          is_active?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          pro_id: string
          response_time_minutes?: number | null
          updated_at?: string
        }
        Update: {
          base_price_cents?: number | null
          category_id?: string
          coverage_radius_km?: number | null
          created_at?: string
          hourly_rate_cents?: number | null
          id?: string
          is_active?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          pro_id?: string
          response_time_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_upgrade_requests: {
        Row: {
          created_at: string
          id: string
          kyc_documents: Json
          profile_data: Json
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kyc_documents?: Json
          profile_data?: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kyc_documents?: Json
          profile_data?: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          latitude: number | null
          locale: string | null
          longitude: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          latitude?: number | null
          locale?: string | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          latitude?: number | null
          locale?: string | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: unknown
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          request_count?: number | null
          window_start?: string | null
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
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          job_id: string
          score: number
          to_user_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          job_id?: string
          score?: number
          to_user_id?: string
          updated_at?: string | null
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
      scores: {
        Row: {
          entity_id: string
          entity_type: string
          id: string
          price_fairness: number
          quality: number
          reliability: number
          social_trust: number
          total: number
          updated_at: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          id?: string
          price_fairness?: number
          quality?: number
          reliability?: number
          social_trust?: number
          total?: number
          updated_at?: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          id?: string
          price_fairness?: number
          quality?: number
          reliability?: number
          social_trust?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          description_ro: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ro: string
          name_ru: string | null
          parent_id: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ro?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ro: string
          name_ru?: string | null
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ro?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ro?: string
          name_ru?: string | null
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_queue: {
        Row: {
          created_at: string
          error_message: string | null
          external_id: string | null
          id: string
          language: string | null
          message: string
          phone: string
          provider_response: Json | null
          sent_at: string | null
          status: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          language?: string | null
          message: string
          phone: string
          provider_response?: Json | null
          sent_at?: string | null
          status?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          language?: string | null
          message?: string
          phone?: string
          provider_response?: Json | null
          sent_at?: string | null
          status?: string | null
          type?: string
          updated_at?: string
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
      tender_evaluations: {
        Row: {
          bid_id: string
          created_at: string | null
          id: string
          judge_id: string
          note: string | null
          rubric_id: string
          score: number
        }
        Insert: {
          bid_id: string
          created_at?: string | null
          id?: string
          judge_id: string
          note?: string | null
          rubric_id: string
          score: number
        }
        Update: {
          bid_id?: string
          created_at?: string | null
          id?: string
          judge_id?: string
          note?: string | null
          rubric_id?: string
          score?: number
        }
        Relationships: []
      }
      tender_rubrics: {
        Row: {
          created_at: string | null
          criterion: string
          id: string
          tender_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          criterion: string
          id?: string
          tender_id: string
          weight?: number
        }
        Update: {
          created_at?: string | null
          criterion?: string
          id?: string
          tender_id?: string
          weight?: number
        }
        Relationships: []
      }
      tenders: {
        Row: {
          budget_hint_cents: number | null
          business_id: string | null
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
          business_id?: string | null
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
          business_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "tenders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      translations: {
        Row: {
          context: string | null
          created_at: string
          id: string
          is_pluralized: boolean | null
          key: string | null
          language_code: string
          namespace: string | null
          translation_key: string
          translation_value: string
          updated_at: string
          value: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          is_pluralized?: boolean | null
          key?: string | null
          language_code: string
          namespace?: string | null
          translation_key: string
          translation_value: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          is_pluralized?: boolean | null
          key?: string | null
          language_code?: string
          namespace?: string | null
          translation_key?: string
          translation_value?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          created_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          device_token: string
          id: string
          is_active: boolean | null
          last_used: string | null
          platform: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_token: string
          id?: string
          is_active?: boolean | null
          last_used?: string | null
          platform?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_token?: string
          id?: string
          is_active?: boolean | null
          last_used?: string | null
          platform?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          upgraded_at: string | null
          upgraded_from: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          upgraded_at?: string | null
          upgraded_from?: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          upgraded_at?: string | null
          upgraded_from?: Database["public"]["Enums"]["app_role"] | null
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
      add_admin_role: {
        Args: { _user_id: string }
        Returns: undefined
      }
      approve_pro_upgrade_request: {
        Args: { _request_id: string }
        Returns: boolean
      }
      cleanup_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_expired_otp: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      find_nearby_pros: {
        Args: {
          job_category_id: string
          job_lat: number
          job_lng: number
          limit_results?: number
          max_distance_km?: number
        }
        Returns: {
          avatar_url: string
          avg_rating: number
          base_price_cents: number
          city: string
          coverage_radius_km: number
          distance_km: number
          first_name: string
          hourly_rate_cents: number
          last_name: string
          match_score: number
          pro_id: string
          rating_count: number
          response_time_minutes: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_member: {
        Args: { _biz: string; _user: string }
        Returns: boolean
      }
      is_business_owner: {
        Args: { _biz: string; _user: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_ip_address?: string
          p_new_values?: Json
          p_old_values?: Json
          p_resource_id?: string
          p_resource_type: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: { details?: Json; event_type: string }
        Returns: undefined
      }
      make_user_admin: {
        Args: { _email: string }
        Returns: undefined
      }
      manage_admin_role: {
        Args: {
          action_type: string
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_email: string
        }
        Returns: boolean
      }
      notify_user: {
        Args: {
          p_data?: Json
          p_message_ro?: string
          p_message_ru: string
          p_title_ro?: string
          p_title_ru: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      refresh_pro_rating_stats: {
        Args: { _pro_id: string }
        Returns: undefined
      }
      reject_pro_upgrade_request: {
        Args: { _reason?: string; _request_id: string }
        Returns: boolean
      }
      upgrade_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_user_role_assignment: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      verify_admin_access: {
        Args: { required_role?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "client"
        | "pro"
        | "business"
        | "admin"
        | "superadmin"
        | "ops"
        | "kyc"
        | "finance"
        | "dispute_manager"
        | "content"
        | "risk"
        | "city_manager"
        | "tender"
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
      app_role: [
        "client",
        "pro",
        "business",
        "admin",
        "superadmin",
        "ops",
        "kyc",
        "finance",
        "dispute_manager",
        "content",
        "risk",
        "city_manager",
        "tender",
      ],
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
