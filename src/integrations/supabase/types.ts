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
      admin_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      cart_sessions: {
        Row: {
          contacted_at: string | null
          converted_at: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          device: string
          entry_page: string
          id: string
          item_count: number
          items: Json
          last_page: string
          order_reference: string | null
          reached_checkout: boolean
          referrer: string
          status: string
          subtotal: number
          updated_at: string
          user_id: string | null
          utm_campaign: string
          utm_medium: string
          utm_source: string
        }
        Insert: {
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          device?: string
          entry_page?: string
          id: string
          item_count?: number
          items?: Json
          last_page?: string
          order_reference?: string | null
          reached_checkout?: boolean
          referrer?: string
          status?: string
          subtotal?: number
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string
          utm_medium?: string
          utm_source?: string
        }
        Update: {
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          device?: string
          entry_page?: string
          id?: string
          item_count?: number
          items?: Json
          last_page?: string
          order_reference?: string | null
          reached_checkout?: boolean
          referrer?: string
          status?: string
          subtotal?: number
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string
          utm_medium?: string
          utm_source?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          backorder: boolean
          created_at: string
          description: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          backorder?: boolean
          created_at?: string
          description?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          backorder?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      consignment_events: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          entity_id: string | null
          id: string
          partner_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          id?: string
          partner_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          id?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignment_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "consignment_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_inventories: {
        Row: {
          created_at: string
          created_by: string
          decision: string
          expected_qty: number
          id: string
          item_id: string
          physical_qty: number
          reason: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          decision?: string
          expected_qty: number
          id?: string
          item_id: string
          physical_qty: number
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          decision?: string
          expected_qty?: number
          id?: string
          item_id?: string
          physical_qty?: number
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consignment_inventories_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "consignment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_items: {
        Row: {
          id: string
          lost_qty: number
          lot: string
          product_id: string
          product_name: string
          qty: number
          returned_qty: number
          serial: string
          shipment_id: string
          sold_qty: number
          suggested_price: number
          supply_price: number
        }
        Insert: {
          id?: string
          lost_qty?: number
          lot?: string
          product_id: string
          product_name: string
          qty: number
          returned_qty?: number
          serial?: string
          shipment_id: string
          sold_qty?: number
          suggested_price?: number
          supply_price: number
        }
        Update: {
          id?: string
          lost_qty?: number
          lot?: string
          product_id?: string
          product_name?: string
          qty?: number
          returned_qty?: number
          serial?: string
          shipment_id?: string
          sold_qty?: number
          suggested_price?: number
          supply_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "consignment_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "consignment_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_partners: {
        Row: {
          blocked: boolean
          closing_period: string
          created_at: string
          customer_id: string | null
          customer_key: string
          enabled: boolean
          id: string
          limit_qty: number
          limit_value: number
          payment_days: number
          prices: Json
          terms: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          blocked?: boolean
          closing_period?: string
          created_at?: string
          customer_id?: string | null
          customer_key: string
          enabled?: boolean
          id?: string
          limit_qty?: number
          limit_value?: number
          payment_days?: number
          prices?: Json
          terms?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          blocked?: boolean
          closing_period?: string
          created_at?: string
          customer_id?: string | null
          customer_key?: string
          enabled?: boolean
          id?: string
          limit_qty?: number
          limit_value?: number
          payment_days?: number
          prices?: Json
          terms?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consignment_partners_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_partners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          external_id: string | null
          id: string
          method: string
          notes: string
          paid_on: string
          settlement_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          external_id?: string | null
          id?: string
          method: string
          notes?: string
          paid_on?: string
          settlement_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          external_id?: string | null
          id?: string
          method?: string
          notes?: string
          paid_on?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignment_payments_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "consignment_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_returns: {
        Row: {
          condition: string
          created_at: string
          created_by: string
          id: string
          item_id: string
          qty: number
          reason: string
          received_at: string | null
          status: string
        }
        Insert: {
          condition: string
          created_at?: string
          created_by: string
          id?: string
          item_id: string
          qty: number
          reason: string
          received_at?: string | null
          status?: string
        }
        Update: {
          condition?: string
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          qty?: number
          reason?: string
          received_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignment_returns_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "consignment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_sales: {
        Row: {
          created_at: string
          created_by: string
          id: string
          item_id: string
          mode: string
          notes: string
          qty: number
          settlement_id: string | null
          sold_on: string
          supply_price: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          item_id: string
          mode?: string
          notes?: string
          qty: number
          settlement_id?: string | null
          sold_on?: string
          supply_price: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          mode?: string
          notes?: string
          qty?: number
          settlement_id?: string | null
          sold_on?: string
          supply_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "consignment_sales_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "consignment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_sales_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "consignment_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_settlements: {
        Row: {
          cancellation_reason: string
          cancelled_at: string | null
          created_at: string
          created_by: string
          due_date: string
          external_id: string | null
          id: string
          mode: string
          number: number
          partner_id: string
          period_end: string | null
          period_start: string | null
          sync_error: string
          sync_status: string
          total: number
        }
        Insert: {
          cancellation_reason?: string
          cancelled_at?: string | null
          created_at?: string
          created_by: string
          due_date: string
          external_id?: string | null
          id?: string
          mode: string
          number?: never
          partner_id: string
          period_end?: string | null
          period_start?: string | null
          sync_error?: string
          sync_status?: string
          total: number
        }
        Update: {
          cancellation_reason?: string
          cancelled_at?: string | null
          created_at?: string
          created_by?: string
          due_date?: string
          external_id?: string | null
          id?: string
          mode?: string
          number?: never
          partner_id?: string
          period_end?: string | null
          period_start?: string | null
          sync_error?: string
          sync_status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "consignment_settlements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "consignment_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_shipments: {
        Row: {
          created_at: string
          created_by: string
          dispatched_at: string | null
          id: string
          notes: string
          number: number
          partner_id: string
          received_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dispatched_at?: string | null
          id?: string
          notes?: string
          number?: never
          partner_id: string
          received_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dispatched_at?: string | null
          id?: string
          notes?: string
          number?: never
          partner_id?: string
          received_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignment_shipments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "consignment_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      conta_azul_links: {
        Row: {
          external_id: string
          kind: string
          local_key: string
          updated_at: string
        }
        Insert: {
          external_id: string
          kind: string
          local_key: string
          updated_at?: string
        }
        Update: {
          external_id?: string
          kind?: string
          local_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      conta_azul_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          state_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          state_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          state_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      conta_azul_order_sync: {
        Row: {
          error: string | null
          external_id: string | null
          external_number: number | null
          order_id: string
          situacao: string | null
          status: string
          updated_at: string
        }
        Insert: {
          error?: string | null
          external_id?: string | null
          external_number?: number | null
          order_id: string
          situacao?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          error?: string | null
          external_id?: string | null
          external_number?: number | null
          order_id?: string
          situacao?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conta_azul_tokens: {
        Row: {
          access_token: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_printer_models: {
        Row: {
          course_id: string
          created_at: string
          id: string
          printer_model_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          printer_model_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          printer_model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_printer_models_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_printer_models_printer_model_id_fkey"
            columns: ["printer_model_id"]
            isOneToOne: false
            referencedRelation: "printer_models"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_key: string
          created_at: string
          description: string
          id: string
          level: string
          printer_model_id: string | null
          published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_key?: string
          created_at?: string
          description?: string
          id?: string
          level?: string
          printer_model_id?: string | null
          published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          cover_key?: string
          created_at?: string
          description?: string
          id?: string
          level?: string
          printer_model_id?: string | null
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_printer_model_id_fkey"
            columns: ["printer_model_id"]
            isOneToOne: false
            referencedRelation: "printer_models"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          city: string
          complement: string
          created_at: string
          document: string
          email: string
          id: string
          name: string
          neighborhood: string
          notes: string
          number: string
          phone: string
          state: string
          street: string
          updated_at: string
          user_id: string | null
          zip: string
        }
        Insert: {
          city?: string
          complement?: string
          created_at?: string
          document?: string
          email?: string
          id?: string
          name: string
          neighborhood?: string
          notes?: string
          number?: string
          phone?: string
          state?: string
          street?: string
          updated_at?: string
          user_id?: string | null
          zip?: string
        }
        Update: {
          city?: string
          complement?: string
          created_at?: string
          document?: string
          email?: string
          id?: string
          name?: string
          neighborhood?: string
          notes?: string
          number?: string
          phone?: string
          state?: string
          street?: string
          updated_at?: string
          user_id?: string | null
          zip?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          brand: string
          created_at: string
          id: string
          invoice_date: string | null
          invoice_number: string
          model: string
          notes: string
          order_reference: string
          owner_id: string | null
          purchase_date: string | null
          serial: string
          updated_at: string
        }
        Insert: {
          brand?: string
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          model?: string
          notes?: string
          order_reference?: string
          owner_id?: string | null
          purchase_date?: string | null
          serial: string
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          model?: string
          notes?: string
          order_reference?: string
          owner_id?: string | null
          purchase_date?: string | null
          serial?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment_ownership: {
        Row: {
          equipment_id: string
          id: string
          new_owner_id: string | null
          notes: string
          previous_owner_id: string | null
          proof: string
          requested_by: string | null
          transferred_at: string
        }
        Insert: {
          equipment_id: string
          id?: string
          new_owner_id?: string | null
          notes?: string
          previous_owner_id?: string | null
          proof?: string
          requested_by?: string | null
          transferred_at?: string
        }
        Update: {
          equipment_id?: string
          id?: string
          new_owner_id?: string | null
          notes?: string
          previous_owner_id?: string | null
          proof?: string
          requested_by?: string | null
          transferred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_ownership_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          last_page: number
          lesson_id: string
          total_pages: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_page?: number
          lesson_id: string
          total_pages?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_page?: number
          lesson_id?: string
          total_pages?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          description: string
          duration_min: number
          id: string
          resource_url: string | null
          sort_order: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string
          duration_min?: number
          id?: string
          resource_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string
          duration_min?: number
          id?: string
          resource_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_printer_models: {
        Row: {
          created_at: string
          id: string
          printer_model_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          printer_model_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          printer_model_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_printer_models_printer_model_id_fkey"
            columns: ["printer_model_id"]
            isOneToOne: false
            referencedRelation: "printer_models"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          active: boolean
          granted_at: string
          id: string
          notes: string | null
          printer_model: string | null
          printer_model_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          granted_at?: string
          id?: string
          notes?: string | null
          printer_model?: string | null
          printer_model_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          granted_at?: string
          id?: string
          notes?: string | null
          printer_model?: string | null
          printer_model_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_printer_model_id_fkey"
            columns: ["printer_model_id"]
            isOneToOne: false
            referencedRelation: "printer_models"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_documents: {
        Row: {
          cancel_protocol: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          chave: string | null
          created_at: string
          created_by: string | null
          danfe_url: string | null
          environment: string
          error_message: string | null
          id: string
          numero: number | null
          order_id: string | null
          payload: Json
          protocolo: string | null
          recipient_document: string
          recipient_name: string
          response: Json
          serie: number | null
          status: string
          total: number
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          cancel_protocol?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          chave?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          environment?: string
          error_message?: string | null
          id?: string
          numero?: number | null
          order_id?: string | null
          payload?: Json
          protocolo?: string | null
          recipient_document?: string
          recipient_name?: string
          response?: Json
          serie?: number | null
          status?: string
          total?: number
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          cancel_protocol?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          chave?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          environment?: string
          error_message?: string | null
          id?: string
          numero?: number | null
          order_id?: string | null
          payload?: Json
          protocolo?: string | null
          recipient_document?: string
          recipient_name?: string
          response?: Json
          serie?: number | null
          status?: string
          total?: number
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_slug: string
          qty: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_slug: string
          qty: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_slug?: string
          qty?: number
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
          created_at: string
          customer_document: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          discount: number
          id: string
          notes: string | null
          payment_method: string
          picked_at: string | null
          picked_item_ids: Json
          picker_id: string | null
          picker_name: string
          picking_started_at: string | null
          picking_status: string
          reference: string
          shipping: number
          shipping_address: Json
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_document?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string
          picked_at?: string | null
          picked_item_ids?: Json
          picker_id?: string | null
          picker_name?: string
          picking_started_at?: string | null
          picking_status?: string
          reference?: string
          shipping?: number
          shipping_address?: Json
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_document?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string
          picked_at?: string | null
          picked_item_ids?: Json
          picker_id?: string | null
          picker_name?: string
          picking_started_at?: string | null
          picking_status?: string
          reference?: string
          shipping?: number
          shipping_address?: Json
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partner_brands: {
        Row: {
          active: boolean
          created_at: string
          id: string
          logo_url: string | null
          name: string
          sort_order: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      printer_models: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          name: string
          product_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          name: string
          product_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          product_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printer_models_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          backorder: boolean
          badge: string | null
          brand: string
          category: string
          created_at: string
          description: string
          id: string
          image_key: string
          image_url: string | null
          installments: Json
          name: string
          old_price: number | null
          price: number
          slug: string
          specs: Json
          stock: number
          subcategory: string
          subtitle: string
          updated_at: string
          use_cases: string[]
        }
        Insert: {
          active?: boolean
          backorder?: boolean
          badge?: string | null
          brand?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_key?: string
          image_url?: string | null
          installments?: Json
          name: string
          old_price?: number | null
          price?: number
          slug: string
          specs?: Json
          stock?: number
          subcategory?: string
          subtitle?: string
          updated_at?: string
          use_cases?: string[]
        }
        Update: {
          active?: boolean
          backorder?: boolean
          badge?: string | null
          brand?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_key?: string
          image_url?: string | null
          installments?: Json
          name?: string
          old_price?: number | null
          price?: number
          slug?: string
          specs?: Json
          stock?: number
          subcategory?: string
          subtitle?: string
          updated_at?: string
          use_cases?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_events: {
        Row: {
          actor_id: string | null
          actor_name: string
          created_at: string
          description: string
          field: string | null
          id: string
          kind: string
          new_value: string | null
          old_value: string | null
          order_id: string | null
          request_id: string | null
          visible_to_client: boolean
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          description: string
          field?: string | null
          id?: string
          kind?: string
          new_value?: string | null
          old_value?: string | null
          order_id?: string | null
          request_id?: string | null
          visible_to_client?: boolean
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          description?: string
          field?: string | null
          id?: string
          kind?: string
          new_value?: string | null
          old_value?: string | null
          order_id?: string | null
          request_id?: string | null
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "service_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_files: {
        Row: {
          category: string
          created_at: string
          equipment_id: string | null
          id: string
          locked: boolean
          mime: string
          name: string
          order_id: string | null
          owner_id: string | null
          path: string
          request_id: string | null
          size: number
          stage: string
          uploaded_by: string | null
          visible_to_client: boolean
        }
        Insert: {
          category?: string
          created_at?: string
          equipment_id?: string | null
          id?: string
          locked?: boolean
          mime?: string
          name: string
          order_id?: string | null
          owner_id?: string | null
          path: string
          request_id?: string | null
          size?: number
          stage?: string
          uploaded_by?: string | null
          visible_to_client?: boolean
        }
        Update: {
          category?: string
          created_at?: string
          equipment_id?: string | null
          id?: string
          locked?: boolean
          mime?: string
          name?: string
          order_id?: string | null
          owner_id?: string | null
          path?: string
          request_id?: string | null
          size?: number
          stage?: string
          uploaded_by?: string | null
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "service_files_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_files_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          budget: Json
          budget_status: string
          closed_at: string | null
          closing: Json
          created_at: string
          diagnosis: Json
          due_at: string | null
          equipment_id: string
          execution: Json
          id: string
          number: number
          private_term: Json | null
          received_at: string
          received_by: string | null
          reception: Json
          reported: Json
          request_id: string | null
          status: string
          updated_at: string
          user_id: string | null
          validation: Json
          warranty: Json
          warranty_status: string
        }
        Insert: {
          budget?: Json
          budget_status?: string
          closed_at?: string | null
          closing?: Json
          created_at?: string
          diagnosis?: Json
          due_at?: string | null
          equipment_id: string
          execution?: Json
          id?: string
          number?: number
          private_term?: Json | null
          received_at?: string
          received_by?: string | null
          reception?: Json
          reported?: Json
          request_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          validation?: Json
          warranty?: Json
          warranty_status?: string
        }
        Update: {
          budget?: Json
          budget_status?: string
          closed_at?: string | null
          closing?: Json
          created_at?: string
          diagnosis?: Json
          due_at?: string | null
          equipment_id?: string
          execution?: Json
          id?: string
          number?: number
          private_term?: Json | null
          received_at?: string
          received_by?: string | null
          reception?: Json
          reported?: Json
          request_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          validation?: Json
          warranty?: Json
          warranty_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          created_at: string
          equipment_id: string
          error_code: string
          failure_type: string
          frequency: string
          id: string
          number: number
          problem: string
          service_order_id: string | null
          staff_message: string
          started_when: string
          status: string
          steps_tried: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          error_code?: string
          failure_type?: string
          frequency?: string
          id?: string
          number?: number
          problem: string
          service_order_id?: string | null
          staff_message?: string
          started_when?: string
          status?: string
          steps_tried?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          error_code?: string
          failure_type?: string
          frequency?: string
          id?: string
          number?: number
          problem?: string
          service_order_id?: string | null
          staff_message?: string
          started_when?: string
          status?: string
          steps_tried?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_order_fk"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      site_images: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stock_entries: {
        Row: {
          access_key: string
          created_at: string
          created_by: string
          id: string
          invoice_number: string
          invoice_series: string
          issued_at: string | null
          item_count: number
          supplier_document: string
          supplier_name: string
          total_amount: number
        }
        Insert: {
          access_key: string
          created_at?: string
          created_by: string
          id?: string
          invoice_number: string
          invoice_series?: string
          issued_at?: string | null
          item_count?: number
          supplier_document: string
          supplier_name: string
          total_amount?: number
        }
        Update: {
          access_key?: string
          created_at?: string
          created_by?: string
          id?: string
          invoice_number?: string
          invoice_series?: string
          issued_at?: string | null
          item_count?: number
          supplier_document?: string
          supplier_name?: string
          total_amount?: number
        }
        Relationships: []
      }
      stock_entry_items: {
        Row: {
          action: string
          created_at: string
          description: string
          ean: string | null
          entry_id: string
          id: string
          previous_stock: number | null
          product_id: string | null
          quantity: number
          resulting_stock: number | null
          supplier_code: string
          total_cost: number
          unit_cost: number
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          ean?: string | null
          entry_id: string
          id?: string
          previous_stock?: number | null
          product_id?: string | null
          quantity: number
          resulting_stock?: number | null
          supplier_code: string
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          ean?: string | null
          entry_id?: string
          id?: string
          previous_stock?: number | null
          product_id?: string | null
          quantity?: number
          resulting_stock?: number | null
          supplier_code?: string
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_entry_items_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "stock_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_withdrawals: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string
          id: string
          kind: string
          previous_stock: number
          product_id: string | null
          product_name: string
          product_slug: string
          quantity: number
          reason: string
          resulting_stock: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          id?: string
          kind: string
          previous_stock: number
          product_id?: string | null
          product_name?: string
          product_slug?: string
          quantity: number
          reason: string
          resulting_stock: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          id?: string
          kind?: string
          previous_stock?: number
          product_id?: string | null
          product_name?: string
          product_slug?: string
          quantity?: number
          reason?: string
          resulting_stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_withdrawals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          active: boolean
          backorder: boolean
          category_slug: string
          created_at: string
          description: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          backorder?: boolean
          category_slug: string
          created_at?: string
          description?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          backorder?: boolean
          category_slug?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      supplier_product_links: {
        Row: {
          created_at: string
          ean: string | null
          id: string
          product_id: string
          supplier_code: string
          supplier_document: string
          supplier_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ean?: string | null
          id?: string
          product_id: string
          supplier_code: string
          supplier_document: string
          supplier_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ean?: string | null
          id?: string
          product_id?: string
          supplier_code?: string
          supplier_document?: string
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_product_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      is_active_member: { Args: { _user_id: string }; Returns: boolean }
      manage_consignment: {
        Args: { _action: string; _actor: string; _data: Json }
        Returns: Json
      }
      member_can_view_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      member_has_printer_model: {
        Args: { _model_id: string; _user_id: string }
        Returns: boolean
      }
      member_printer_model: { Args: { _user_id: string }; Returns: string }
      process_nfe_stock_entry: {
        Args: { _invoice: Json; _items: Json }
        Returns: string
      }
      register_stock_withdrawal: {
        Args: {
          _actor: string
          _actor_name: string
          _kind: string
          _product_id: string
          _quantity: number
          _reason: string
        }
        Returns: string
      }
      replace_pending_order_items: {
        Args: {
          _discount: number
          _items: Json
          _order_id: string
          _shipping: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "member" | "seller"
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
      app_role: ["admin", "member", "seller"],
    },
  },
} as const
