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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      billing_orders: {
        Row: {
          amount_minor: number
          created_at: string
          credit_pack_key: string | null
          credits: number | null
          currency: string
          expires_at: string
          id: string
          kind: string
          last_error: string | null
          paid_at: string | null
          payment_id: string | null
          plan_key: string | null
          provider: string
          provider_checkout_url: string | null
          provider_reference: string | null
          provider_session_id: string | null
          status: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          credit_pack_key?: string | null
          credits?: number | null
          currency?: string
          expires_at: string
          id?: string
          kind: string
          last_error?: string | null
          paid_at?: string | null
          payment_id?: string | null
          plan_key?: string | null
          provider?: string
          provider_checkout_url?: string | null
          provider_reference?: string | null
          provider_session_id?: string | null
          status?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          credit_pack_key?: string | null
          credits?: number | null
          currency?: string
          expires_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          paid_at?: string | null
          payment_id?: string | null
          plan_key?: string | null
          provider?: string
          provider_checkout_url?: string | null
          provider_reference?: string | null
          provider_session_id?: string | null
          status?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_orders_credit_pack_key_fkey"
            columns: ["credit_pack_key"]
            isOneToOne: false
            referencedRelation: "credit_packs"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "billing_orders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_orders_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "billing_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "billing_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          interval_months: number
          is_active: boolean
          key: string
          listing_limit: number
          name: string
          price_minor: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          interval_months?: number
          is_active?: boolean
          key: string
          listing_limit: number
          name: string
          price_minor: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          interval_months?: number
          is_active?: boolean
          key?: string
          listing_limit?: number
          name?: string
          price_minor?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      blocked_dates: {
        Row: {
          booking_id: string | null
          created_at: string
          date: string
          id: string
          listing_id: string
          reason: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          date: string
          id?: string
          listing_id: string
          reason: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          date?: string
          id?: string
          listing_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_blocked_dates_booking"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          accepted_at: string | null
          booked_at: string | null
          cancellation_policy: string
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          days_count: number | null
          declined_at: string | null
          end_date: string | null
          id: string
          item_value_minor: number
          listing_id: string
          owner_id: string
          picked_up_at: string | null
          pickup_location_id: string
          rated_at: string | null
          reference: string
          rental_price_minor: number
          renter_id: string
          requested_at: string
          returned_at: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          booked_at?: string | null
          cancellation_policy: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          days_count?: number | null
          declined_at?: string | null
          end_date?: string | null
          id?: string
          item_value_minor: number
          listing_id: string
          owner_id: string
          picked_up_at?: string | null
          pickup_location_id: string
          rated_at?: string | null
          reference: string
          rental_price_minor: number
          renter_id: string
          requested_at?: string
          returned_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          booked_at?: string | null
          cancellation_policy?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          days_count?: number | null
          declined_at?: string | null
          end_date?: string | null
          id?: string
          item_value_minor?: number
          listing_id?: string
          owner_id?: string
          picked_up_at?: string | null
          pickup_location_id?: string
          rated_at?: string | null
          reference?: string
          rental_price_minor?: number
          renter_id?: string
          requested_at?: string
          returned_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "public_listing_locations"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "bookings_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          full_path: string
          icon_name: string | null
          id: string
          is_enabled: boolean
          level: number
          listing_count: number
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          suggested_price_1_day_minor: number | null
          suggested_price_3_days_minor: number | null
          suggested_price_7_days_minor: number | null
        }
        Insert: {
          full_path: string
          icon_name?: string | null
          id?: string
          is_enabled?: boolean
          level?: number
          listing_count?: number
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          suggested_price_1_day_minor?: number | null
          suggested_price_3_days_minor?: number | null
          suggested_price_7_days_minor?: number | null
        }
        Update: {
          full_path?: string
          icon_name?: string | null
          id?: string
          is_enabled?: boolean
          level?: number
          listing_count?: number
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          suggested_price_1_day_minor?: number | null
          suggested_price_3_days_minor?: number | null
          suggested_price_7_days_minor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          listing_id: string
          owner_id: string
          owner_unread_count: number
          renter_id: string
          renter_unread_count: number
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          listing_id: string
          owner_id: string
          owner_unread_count?: number
          renter_id: string
          renter_unread_count?: number
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          listing_id?: string
          owner_id?: string
          owner_unread_count?: number
          renter_id?: string
          renter_unread_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packs: {
        Row: {
          created_at: string
          credits: number
          currency: string
          is_active: boolean
          key: string
          name: string
          price_minor: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits: number
          currency?: string
          is_active?: boolean
          key: string
          name: string
          price_minor: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          currency?: string
          is_active?: boolean
          key?: string
          name?: string
          price_minor?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          attempts: number
          booking_id: string | null
          created_at: string
          id: string
          last_error: string | null
          provider_message_id: string | null
          scheduled_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_delivery_status"]
          subject: string | null
          template_key: string
          to_email: string
          to_user_id: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          attempts?: number
          booking_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          provider_message_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_delivery_status"]
          subject?: string | null
          template_key: string
          to_email: string
          to_user_id?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          attempts?: number
          booking_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          provider_message_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_delivery_status"]
          subject?: string | null
          template_key?: string
          to_email?: string
          to_user_id?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_template_key_fkey"
            columns: ["template_key"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "email_messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "email_messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_body: string
          is_active: boolean
          key: string
          locale: string
          name: string
          subject: string
          text_body: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_body: string
          is_active?: boolean
          key: string
          locale?: string
          name: string
          subject: string
          text_body?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          html_body?: string
          is_active?: boolean
          key?: string
          locale?: string
          name?: string
          subject?: string
          text_body?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          provider_session_id: string | null
          rejected_reason: string | null
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          provider_session_id?: string | null
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          provider_session_id?: string | null
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "kyc_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_webhook_events: {
        Row: {
          event_id: string
          received_at: string
        }
        Insert: {
          event_id: string
          received_at?: string
        }
        Update: {
          event_id?: string
          received_at?: string
        }
        Relationships: []
      }
      listing_credit_transactions: {
        Row: {
          created_at: string
          delta: number
          id: string
          listing_id: string | null
          note: string | null
          order_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          listing_id?: string | null
          note?: string | null
          order_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          listing_id?: string | null
          note?: string | null
          order_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_credit_transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_credit_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "billing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "listing_credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          large_url: string
          listing_id: string
          medium_url: string
          sort_order: number
          thumbnail_url: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          large_url: string
          listing_id: string
          medium_url: string
          sort_order?: number
          thumbnail_url: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          large_url?: string
          listing_id?: string
          medium_url?: string
          sort_order?: number
          thumbnail_url?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_locations: {
        Row: {
          listing_id: string
          location_id: string
        }
        Insert: {
          listing_id: string
          location_id: string
        }
        Update: {
          listing_id?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_locations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "public_listing_locations"
            referencedColumns: ["location_id"]
          },
        ]
      }
      listing_unlocks: {
        Row: {
          created_at: string
          listing_id: string
          source: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          source: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          source?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_unlocks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_unlocks_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "listing_credit_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "listing_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          cancellation_policy: string
          category_id: string | null
          category_name_cached: string
          created_at: string
          deleted_at: string | null
          description: string | null
          favorite_count: number
          id: string
          item_value_minor: number | null
          owner_id: string
          price_1_day_minor: number | null
          price_3_days_minor: number | null
          price_7_days_minor: number | null
          published_at: string | null
          rating_avg: number | null
          rating_count: number
          search_vector: unknown
          slug: string | null
          status: string
          title: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          cancellation_policy?: string
          category_id?: string | null
          category_name_cached?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          favorite_count?: number
          id?: string
          item_value_minor?: number | null
          owner_id: string
          price_1_day_minor?: number | null
          price_3_days_minor?: number | null
          price_7_days_minor?: number | null
          published_at?: string | null
          rating_avg?: number | null
          rating_count?: number
          search_vector?: unknown
          slug?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          cancellation_policy?: string
          category_id?: string | null
          category_name_cached?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          favorite_count?: number
          id?: string
          item_value_minor?: number | null
          owner_id?: string
          price_1_day_minor?: number | null
          price_3_days_minor?: number | null
          price_7_days_minor?: number | null
          published_at?: string | null
          rating_avg?: number | null
          rating_count?: number
          search_vector?: unknown
          slug?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          approx_latitude: number
          approx_longitude: number
          city: string
          country_code: string
          created_at: string
          deleted_at: string | null
          id: string
          is_default: boolean
          label: string
          latitude: number
          longitude: number
          municipality: string | null
          postal_code: string | null
          street: string
          user_id: string
        }
        Insert: {
          approx_latitude: number
          approx_longitude: number
          city: string
          country_code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          label: string
          latitude: number
          longitude: number
          municipality?: string | null
          postal_code?: string | null
          street: string
          user_id: string
        }
        Update: {
          approx_latitude?: number
          approx_longitude?: number
          city?: string
          country_code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number
          longitude?: number
          municipality?: string | null
          postal_code?: string | null
          street?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          sender_id: string | null
          type: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          type: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          email_sent_at: string | null
          id: string
          link_url: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          link_url?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          link_url?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_published: boolean
          published_at: string
          slug: string
          sort_order: number
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string
          slug: string
          sort_order?: number
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string
          slug?: string
          sort_order?: number
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          failure_code: string | null
          id: string
          provider: string | null
          provider_payment_id: string | null
          purpose: string
          refunded_amount_minor: number
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          failure_code?: string | null
          id?: string
          provider?: string | null
          provider_payment_id?: string | null
          purpose: string
          refunded_amount_minor?: number
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          failure_code?: string | null
          id?: string
          provider?: string | null
          provider_payment_id?: string | null
          purpose?: string
          refunded_amount_minor?: number
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          review_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          review_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          review_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          booking_id: string
          comment: string | null
          created_at: string
          direction: string
          id: string
          is_published: boolean
          listing_id: string | null
          published_at: string | null
          rating: number
          reply: string | null
          reply_at: string | null
          subject_user_id: string
        }
        Insert: {
          author_id: string
          booking_id: string
          comment?: string | null
          created_at?: string
          direction: string
          id?: string
          is_published?: boolean
          listing_id?: string | null
          published_at?: string | null
          rating: number
          reply?: string | null
          reply_at?: string | null
          subject_user_id: string
        }
        Update: {
          author_id?: string
          booking_id?: string
          comment?: string | null
          created_at?: string
          direction?: string
          id?: string
          is_published?: boolean
          listing_id?: string | null
          published_at?: string | null
          rating?: number
          reply?: string | null
          reply_at?: string | null
          subject_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          about: string | null
          avatar_url: string | null
          avg_response_minutes: number | null
          country_code: string
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          phone_verified_at: string | null
          primary_location_id: string | null
          rating_avg: number | null
          rating_count: number
          response_rate: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          avg_response_minutes?: number | null
          country_code?: string
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          primary_location_id?: string | null
          rating_avg?: number | null
          rating_count?: number
          response_rate?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          avg_response_minutes?: number | null
          country_code?: string
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          primary_location_id?: string | null
          rating_avg?: number | null
          rating_count?: number
          response_rate?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_profiles_primary_location"
            columns: ["primary_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_profiles_primary_location"
            columns: ["primary_location_id"]
            isOneToOne: false
            referencedRelation: "public_listing_locations"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          order_id: string | null
          plan_key: string
          provider: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          order_id?: string | null
          plan_key: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          order_id?: string | null
          plan_key?: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "billing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_owner_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          credit_balance_minor: number
          deleted_at: string | null
          email: string | null
          email_verified_at: string | null
          id: string
          last_login_at: string | null
          phone: string | null
          phone_verified_at: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_balance_minor?: number
          deleted_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          id: string
          last_login_at?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_balance_minor?: number
          deleted_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          id?: string
          last_login_at?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      waitlist_emails: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_deleted_listing_slugs: {
        Row: {
          slug: string | null
        }
        Insert: {
          slug?: string | null
        }
        Update: {
          slug?: string | null
        }
        Relationships: []
      }
      public_listing_locations: {
        Row: {
          approx_latitude: number | null
          approx_longitude: number | null
          city: string | null
          label: string | null
          listing_id: string | null
          location_id: string | null
          municipality: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_locations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      public_owner_profiles: {
        Row: {
          avatar_url: string | null
          avg_response_minutes: number | null
          conversation_count: number | null
          display_name: string | null
          is_verified: boolean | null
          member_since: string | null
          rating_avg: number | null
          rating_count: number | null
          response_rate: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      snd_billing_order_payload: { Args: { p_order_id: string }; Returns: Json }
      snd_billing_order_summary: { Args: { p_token: string }; Returns: Json }
      snd_billing_summary: { Args: never; Returns: Json }
      snd_booking_email_vars: { Args: { p_booking_id: string }; Returns: Json }
      snd_build_tsquery: { Args: { raw: string }; Returns: unknown }
      snd_category_subtree: {
        Args: { p_slug: string }
        Returns: {
          id: string
        }[]
      }
      snd_category_tree: {
        Args: { p_lat?: number; p_lng?: number; p_radius_km?: number }
        Returns: {
          full_path: string
          icon_name: string
          id: string
          level: number
          listing_count: number
          name: string
          parent_id: string
          slug: string
          sort_order: number
        }[]
      }
      snd_conversation_parties: {
        Args: { p_user_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          first_name: string
          last_name: string
          user_id: string
        }[]
      }
      snd_create_billing_order: {
        Args: { p_item_key: string; p_kind: string }
        Returns: Json
      }
      snd_create_rental_request: {
        Args: {
          p_body: string
          p_end_date?: string
          p_listing_id: string
          p_start_date?: string
        }
        Returns: Json
      }
      snd_current_subscription: {
        Args: { p_user_id: string }
        Returns: {
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          order_id: string | null
          plan_key: string
          provider: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      snd_delete_text_message: {
        Args: { p_conversation_id: string; p_message_id: string }
        Returns: Json
      }
      snd_edit_text_message: {
        Args: {
          p_body: string
          p_conversation_id: string
          p_message_id: string
        }
        Returns: Json
      }
      snd_end_subscription: {
        Args: { p_provider_subscription_id: string }
        Returns: Json
      }
      snd_enforce_listing_limits: {
        Args: { p_user_id?: string }
        Returns: number
      }
      snd_filter_listings: {
        Args: {
          p_category_slug?: string
          p_date_from?: string
          p_date_to?: string
          p_fuzzy?: boolean
          p_lat?: number
          p_lng?: number
          p_price_max_minor?: number
          p_price_min_minor?: number
          p_query?: string
          p_radius_km?: number
        }
        Returns: {
          distance_m: number
          listing_id: string
          rank: number
        }[]
      }
      snd_format_minor: { Args: { p_minor: number }; Returns: string }
      snd_haversine_m: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      snd_increment_listing_view: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      snd_listing_credit_balance: {
        Args: { p_user_id: string }
        Returns: number
      }
      snd_listing_detail: {
        Args: { p_lat?: number; p_lng?: number; p_slug: string }
        Returns: Json
      }
      snd_listing_slot_usage: { Args: { p_user_id: string }; Returns: number }
      snd_mark_booking_picked_up: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      snd_mark_booking_returned: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      snd_message_payload: {
        Args: { p_message: Database["public"]["Tables"]["messages"]["Row"] }
        Returns: Json
      }
      snd_purge_expired_drafts: { Args: never; Returns: undefined }
      snd_queue_email: {
        Args: {
          p_booking_id?: string
          p_template_key: string
          p_to_email?: string
          p_to_user_id: string
          p_variables?: Json
        }
        Returns: string
      }
      snd_record_billing_failure: {
        Args: {
          p_provider_reference?: string
          p_reason?: string
          p_token: string
        }
        Returns: Json
      }
      snd_recount_category: { Args: { target_id: string }; Returns: undefined }
      snd_recount_review_targets: {
        Args: { p_listing_id: string; p_subject_user_id: string }
        Returns: undefined
      }
      snd_refresh_last_message_preview: {
        Args: {
          p_conversation_id: string
          p_message_id: string
          p_preview: string
        }
        Returns: undefined
      }
      snd_refresh_owner_response_metrics: { Args: never; Returns: number }
      snd_renew_subscription: {
        Args: {
          p_amount_minor?: number
          p_period_end: string
          p_provider_reference?: string
          p_provider_subscription_id: string
        }
        Returns: Json
      }
      snd_rental_price_minor: {
        Args: {
          p_days: number
          p_price_1: number
          p_price_3: number
          p_price_7: number
        }
        Returns: number
      }
      snd_respond_to_rental_request: {
        Args: {
          p_action: string
          p_booking_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      snd_schedule_subscription_cancel: {
        Args: { p_user_id: string }
        Returns: Json
      }
      snd_search_listings: {
        Args: {
          p_category_slug?: string
          p_date_from?: string
          p_date_to?: string
          p_fuzzy?: boolean
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_page?: number
          p_price_max_minor?: number
          p_price_min_minor?: number
          p_query?: string
          p_radius_km?: number
          p_sort?: string
        }
        Returns: {
          approx_latitude: number
          approx_longitude: number
          distance_m: number
          id: string
          is_favorite: boolean
          is_own: boolean
          municipality: string
          owner_display_name: string
          owner_id: string
          owner_is_verified: boolean
          price_1_day_minor: number
          rating_avg: number
          rating_count: number
          slug: string
          thumbnail_url: string
          title: string
          total_count: number
        }[]
      }
      snd_search_pins: {
        Args: {
          p_category_slug?: string
          p_date_from?: string
          p_date_to?: string
          p_fuzzy?: boolean
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_price_max_minor?: number
          p_price_min_minor?: number
          p_query?: string
          p_radius_km?: number
        }
        Returns: {
          approx_latitude: number
          approx_longitude: number
          city: string
          id: string
          price_1_day_minor: number
          slug: string
          title: string
          total_count: number
        }[]
      }
      snd_search_suggestion: { Args: { p_query: string }; Returns: string }
      snd_send_text_message: {
        Args: { p_body: string; p_conversation_id: string }
        Returns: Json
      }
      snd_settle_billing_order: {
        Args: {
          p_period_end?: string
          p_provider_reference?: string
          p_provider_subscription_id?: string
          p_token: string
        }
        Returns: Json
      }
      snd_start_billing_checkout: {
        Args: {
          p_checkout_url: string
          p_provider: string
          p_session_id: string
          p_token: string
        }
        Returns: Json
      }
      snd_submit_booking_review: {
        Args: { p_booking_id: string; p_comment?: string; p_rating: number }
        Returns: Json
      }
      snd_unaccent: { Args: { value: string }; Returns: string }
    }
    Enums: {
      booking_status:
        | "requested"
        | "booked"
        | "picked_up"
        | "returned"
        | "rated"
        | "declined"
        | "expired"
        | "cancelled_by_renter"
        | "cancelled_by_owner"
      email_delivery_status:
        | "queued"
        | "sending"
        | "sent"
        | "failed"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      booking_status: [
        "requested",
        "booked",
        "picked_up",
        "returned",
        "rated",
        "declined",
        "expired",
        "cancelled_by_renter",
        "cancelled_by_owner",
      ],
      email_delivery_status: [
        "queued",
        "sending",
        "sent",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
