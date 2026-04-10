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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          bg_color: string | null
          created_at: string
          id: string
          link_text: string | null
          link_url: string | null
          message: string
        }
        Insert: {
          active?: boolean
          bg_color?: string | null
          created_at?: string
          id?: string
          link_text?: string | null
          link_url?: string | null
          message: string
        }
        Update: {
          active?: boolean
          bg_color?: string | null
          created_at?: string
          id?: string
          link_text?: string | null
          link_url?: string | null
          message?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string
          created_at: string
          excerpt: string
          id: string
          image_url: string | null
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order_amount: number
          updated_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string
          city: string
          country: string
          created_at: string
          email: string
          id: string
          lifetime_value: number
          name: string
          notes: string
          phone: string
          state: string
          status: string
          tags: string[]
          total_orders: number
          updated_at: string
          whatsapp: string
          zip_code: string
        }
        Insert: {
          address?: string
          city?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          lifetime_value?: number
          name?: string
          notes?: string
          phone?: string
          state?: string
          status?: string
          tags?: string[]
          total_orders?: number
          updated_at?: string
          whatsapp?: string
          zip_code?: string
        }
        Update: {
          address?: string
          city?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          lifetime_value?: number
          name?: string
          notes?: string
          phone?: string
          state?: string
          status?: string
          tags?: string[]
          total_orders?: number
          updated_at?: string
          whatsapp?: string
          zip_code?: string
        }
        Relationships: []
      }
      download_tokens: {
        Row: {
          created_at: string
          download_count: number
          expires_at: string | null
          id: string
          max_downloads: number
          order_id: string
          product_file_id: string
          token: string
        }
        Insert: {
          created_at?: string
          download_count?: number
          expires_at?: string | null
          id?: string
          max_downloads?: number
          order_id: string
          product_file_id: string
          token?: string
        }
        Update: {
          created_at?: string
          download_count?: number
          expires_at?: string | null
          id?: string
          max_downloads?: number
          order_id?: string
          product_file_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_tokens_product_file_id_fkey"
            columns: ["product_file_id"]
            isOneToOne: false
            referencedRelation: "product_files"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          created_at: string
          id: string
          language_mode: string
          product_id: string | null
          published: boolean
          sections_bn: Json
          sections_en: Json
          slug: string
          template: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_mode?: string
          product_id?: string | null
          published?: boolean
          sections_bn?: Json
          sections_en?: Json
          slug: string
          template?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language_mode?: string
          product_id?: string | null
          published?: boolean
          sections_bn?: Json
          sections_en?: Json
          slug?: string
          template?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_config: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          active: boolean
          email: string
          id: string
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          active?: boolean
          email: string
          id?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          active?: boolean
          email?: string
          id?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          tier_label: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          tier_label?: string
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          tier_label?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bkash_response: Json | null
          coupon_code: string | null
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          discount: number
          id: string
          notes: string
          order_number: string
          payment_method: string
          payment_status: string
          shipping_address: string
          shipping_city: string
          shipping_cost: number
          shipping_country: string
          shipping_state: string
          shipping_zip: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          bkash_response?: Json | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          discount?: number
          id?: string
          notes?: string
          order_number?: string
          payment_method?: string
          payment_status?: string
          shipping_address?: string
          shipping_city?: string
          shipping_cost?: number
          shipping_country?: string
          shipping_state?: string
          shipping_zip?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          bkash_response?: Json | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          discount?: number
          id?: string
          notes?: string
          order_number?: string
          payment_method?: string
          payment_status?: string
          shipping_address?: string
          shipping_city?: string
          shipping_cost?: number
          shipping_country?: string
          shipping_state?: string
          shipping_zip?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      page_contents: {
        Row: {
          content: string
          id: string
          page_slug: string
          section_key: string
          updated_at: string
        }
        Insert: {
          content?: string
          id?: string
          page_slug: string
          section_key: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          page_slug?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_email_templates: {
        Row: {
          active: boolean
          body_html: string
          category: string
          created_at: string
          id: string
          is_global: boolean
          name: string
          product_id: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body_html?: string
          category?: string
          created_at?: string
          id?: string
          is_global?: boolean
          name?: string
          product_id?: string | null
          subject?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body_html?: string
          category?: string
          created_at?: string
          id?: string
          is_global?: boolean
          name?: string
          product_id?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_email_templates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_files: {
        Row: {
          created_at: string
          file_size: number
          file_type: string
          file_url: string
          filename: string
          id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          file_size?: number
          file_type?: string
          file_url: string
          filename?: string
          id?: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          file_size?: number
          file_type?: string
          file_url?: string
          filename?: string
          id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          alt_text?: string
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tiers: {
        Row: {
          badge: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string
          price: number
          product_id: string
          sort_order: number
        }
        Insert: {
          badge?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          price?: number
          product_id: string
          sort_order?: number
        }
        Update: {
          badge?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          price?: number
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          billing_cycle: string | null
          category: string
          created_at: string
          description: string
          external_url: string
          featured: boolean
          features: string[]
          id: string
          image_url: string | null
          in_stock: boolean
          name: string
          price: number
          price_label: string
          published: boolean
          slug: string
          tagline: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          billing_cycle?: string | null
          category?: string
          created_at?: string
          description?: string
          external_url?: string
          featured?: boolean
          features?: string[]
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name: string
          price?: number
          price_label?: string
          published?: boolean
          slug?: string
          tagline?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          billing_cycle?: string | null
          category?: string
          created_at?: string
          description?: string
          external_url?: string
          featured?: boolean
          features?: string[]
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name?: string
          price?: number
          price_label?: string
          published?: boolean
          slug?: string
          tagline?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved: boolean
          content: string
          created_at: string
          customer_email: string
          customer_name: string
          featured: boolean
          id: string
          product_id: string | null
          rating: number
          title: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          content?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          featured?: boolean
          id?: string
          product_id?: string | null
          rating?: number
          title?: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          content?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          featured?: boolean
          id?: string
          product_id?: string | null
          rating?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      send_money_verifications: {
        Row: {
          amount: number
          created_at: string
          id: string
          provider: string
          raw_data: Json | null
          sender_number: string
          trx_id: string
          verified: boolean
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          provider?: string
          raw_data?: Json | null
          sender_number?: string
          trx_id: string
          verified?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          provider?: string
          raw_data?: Json | null
          sender_number?: string
          trx_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          order_id: string
          order_number: string
          payment_id: string
          payment_method: string
          provider: string
          raw_response: Json | null
          sender_number: string
          status: string
          trx_id: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          order_id: string
          order_number?: string
          payment_id?: string
          payment_method?: string
          provider?: string
          raw_response?: Json | null
          sender_number?: string
          status?: string
          trx_id?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          order_id?: string
          order_number?: string
          payment_id?: string
          payment_method?: string
          provider?: string
          raw_response?: Json | null
          sender_number?: string
          status?: string
          trx_id?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      coupons_public: {
        Row: {
          code: string | null
          discount_type: string | null
          discount_value: number | null
          is_valid: boolean | null
          min_order_amount: number | null
        }
        Insert: {
          code?: string | null
          discount_type?: string | null
          discount_value?: number | null
          is_valid?: never
          min_order_amount?: number | null
        }
        Update: {
          code?: string | null
          discount_type?: string | null
          discount_value?: number | null
          is_valid?: never
          min_order_amount?: number | null
        }
        Relationships: []
      }
      reviews_public: {
        Row: {
          approved: boolean | null
          content: string | null
          created_at: string | null
          customer_name: string | null
          featured: boolean | null
          id: string | null
          product_id: string | null
          rating: number | null
          title: string | null
        }
        Insert: {
          approved?: boolean | null
          content?: string | null
          created_at?: string | null
          customer_name?: string | null
          featured?: boolean | null
          id?: string | null
          product_id?: string | null
          rating?: number | null
          title?: string | null
        }
        Update: {
          approved?: boolean | null
          content?: string | null
          created_at?: string | null
          customer_name?: string | null
          featured?: boolean | null
          id?: string | null
          product_id?: string | null
          rating?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      generate_download_tokens: {
        Args: { _order_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      track_order: {
        Args: { _email: string; _order_number: string }
        Returns: Json
      }
      upsert_checkout_customer: {
        Args: {
          _address: string
          _email: string
          _name: string
          _phone: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
