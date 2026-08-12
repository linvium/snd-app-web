export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          email_verified_at: string | null
          role: 'user' | 'admin'
          status: 'active' | 'suspended' | 'deleted'
          credit_balance_minor: number
          last_login_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          email: string
          email_verified_at?: string | null
          role?: 'user' | 'admin'
          status?: 'active' | 'suspended' | 'deleted'
          credit_balance_minor?: number
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          email_verified_at?: string | null
          role?: 'user' | 'admin'
          status?: 'active' | 'suspended' | 'deleted'
          credit_balance_minor?: number
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string | null
          last_name: string | null
          display_name: string | null
          phone: string | null
          avatar_url: string | null
          about: string | null
          country_code: string
          rating_avg: number | null
          rating_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          about?: string | null
          country_code?: string
          rating_avg?: number | null
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          about?: string | null
          country_code?: string
          rating_avg?: number | null
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_profiles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
