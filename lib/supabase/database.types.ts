/**
 * Generated from the live database schema — do not edit by hand.
 * Regenerate with: npm run db:types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before: Json | null;
          after: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      business_categories: {
        Row: {
          business_id: string;
          category_id: string;
          is_primary: boolean;
        };
        Insert: {
          business_id: string;
          category_id: string;
          is_primary?: boolean;
        };
        Update: {
          business_id?: string;
          category_id?: string;
          is_primary?: boolean;
        };
      };
      business_destinations: {
        Row: {
          business_id: string;
          destination_id: string;
          is_primary: boolean;
        };
        Insert: {
          business_id: string;
          destination_id: string;
          is_primary?: boolean;
        };
        Update: {
          business_id?: string;
          destination_id?: string;
          is_primary?: boolean;
        };
      };
      business_service_translations: {
        Row: {
          id: string;
          service_id: string;
          locale: string;
          name: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          service_id: string;
          locale: string;
          name: string;
          description?: string | null;
        };
        Update: {
          id?: string;
          service_id?: string;
          locale?: string;
          name?: string;
          description?: string | null;
        };
      };
      business_services: {
        Row: {
          id: string;
          business_id: string;
          price_from: number | null;
          currency: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          price_from?: number | null;
          currency?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          price_from?: number | null;
          currency?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_translations: {
        Row: {
          id: string;
          business_id: string;
          locale: string;
          tagline: string | null;
          short_description: string | null;
          description: string | null;
          seo_title: string | null;
          seo_description: string | null;
          is_machine_translated: boolean;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
          search_vector: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          locale: string;
          tagline?: string | null;
          short_description?: string | null;
          description?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_machine_translated?: boolean;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          search_vector?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          locale?: string;
          tagline?: string | null;
          short_description?: string | null;
          description?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_machine_translated?: boolean;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          search_vector?: string | null;
        };
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          slug: string;
          legal_name: string | null;
          status: Database['public']['Enums']['business_status'];
          tier: Database['public']['Enums']['subscription_tier'];
          is_verified: boolean;
          verified_at: string | null;
          verified_by: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          email: string | null;
          phone: string | null;
          whatsapp: string | null;
          website: string | null;
          address: string | null;
          city: string | null;
          latitude: number | null;
          longitude: number | null;
          founded_year: number | null;
          team_size: number | null;
          license_number: string | null;
          rating_avg: number;
          rating_count: number;
          response_rate: number | null;
          avg_response_minutes: number | null;
          is_demo: boolean;
          submitted_at: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          slug: string;
          legal_name?: string | null;
          status?: Database['public']['Enums']['business_status'];
          tier?: Database['public']['Enums']['subscription_tier'];
          is_verified?: boolean;
          verified_at?: string | null;
          verified_by?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          website?: string | null;
          address?: string | null;
          city?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          founded_year?: number | null;
          team_size?: number | null;
          license_number?: string | null;
          rating_avg?: number;
          rating_count?: number;
          response_rate?: number | null;
          avg_response_minutes?: number | null;
          is_demo?: boolean;
          submitted_at?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          name?: string;
          slug?: string;
          legal_name?: string | null;
          status?: Database['public']['Enums']['business_status'];
          tier?: Database['public']['Enums']['subscription_tier'];
          is_verified?: boolean;
          verified_at?: string | null;
          verified_by?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          website?: string | null;
          address?: string | null;
          city?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          founded_year?: number | null;
          team_size?: number | null;
          license_number?: string | null;
          rating_avg?: number;
          rating_count?: number;
          response_rate?: number | null;
          avg_response_minutes?: number | null;
          is_demo?: boolean;
          submitted_at?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          key: string;
          icon: string | null;
          cover_image_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          icon?: string | null;
          cover_image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          key?: string;
          icon?: string | null;
          cover_image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      category_translations: {
        Row: {
          id: string;
          category_id: string;
          locale: string;
          name: string;
          slug: string;
          name_singular: string | null;
          summary: string | null;
          description: string | null;
          seo_title: string | null;
          seo_description: string | null;
          combo_heading: string | null;
          created_at: string;
          updated_at: string;
          search_vector: string | null;
        };
        Insert: {
          id?: string;
          category_id: string;
          locale: string;
          name: string;
          slug: string;
          name_singular?: string | null;
          summary?: string | null;
          description?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          combo_heading?: string | null;
          created_at?: string;
          updated_at?: string;
          search_vector?: string | null;
        };
        Update: {
          id?: string;
          category_id?: string;
          locale?: string;
          name?: string;
          slug?: string;
          name_singular?: string | null;
          summary?: string | null;
          description?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          combo_heading?: string | null;
          created_at?: string;
          updated_at?: string;
          search_vector?: string | null;
        };
      };
      destination_seasonality: {
        Row: {
          id: string;
          destination_id: string;
          month: number;
          wildlife_rating: number | null;
          weather_rating: number | null;
          crowd_level: number | null;
          rainfall_mm: number | null;
          temp_min_c: number | null;
          temp_max_c: number | null;
          is_peak_season: boolean;
          highlight_key: string | null;
        };
        Insert: {
          id?: string;
          destination_id: string;
          month: number;
          wildlife_rating?: number | null;
          weather_rating?: number | null;
          crowd_level?: number | null;
          rainfall_mm?: number | null;
          temp_min_c?: number | null;
          temp_max_c?: number | null;
          is_peak_season?: boolean;
          highlight_key?: string | null;
        };
        Update: {
          id?: string;
          destination_id?: string;
          month?: number;
          wildlife_rating?: number | null;
          weather_rating?: number | null;
          crowd_level?: number | null;
          rainfall_mm?: number | null;
          temp_min_c?: number | null;
          temp_max_c?: number | null;
          is_peak_season?: boolean;
          highlight_key?: string | null;
        };
      };
      destination_seasonality_translations: {
        Row: {
          id: string;
          seasonality_id: string;
          locale: string;
          highlight: string | null;
          note: string | null;
        };
        Insert: {
          id?: string;
          seasonality_id: string;
          locale: string;
          highlight?: string | null;
          note?: string | null;
        };
        Update: {
          id?: string;
          seasonality_id?: string;
          locale?: string;
          highlight?: string | null;
          note?: string | null;
        };
      };
      destination_translations: {
        Row: {
          id: string;
          destination_id: string;
          locale: string;
          name: string;
          slug: string;
          summary: string | null;
          description: string | null;
          travel_tips: string | null;
          best_time: string | null;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
          search_vector: string | null;
        };
        Insert: {
          id?: string;
          destination_id: string;
          locale: string;
          name: string;
          slug: string;
          summary?: string | null;
          description?: string | null;
          travel_tips?: string | null;
          best_time?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
          search_vector?: string | null;
        };
        Update: {
          id?: string;
          destination_id?: string;
          locale?: string;
          name?: string;
          slug?: string;
          summary?: string | null;
          description?: string | null;
          travel_tips?: string | null;
          best_time?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
          search_vector?: string | null;
        };
      };
      destinations: {
        Row: {
          id: string;
          key: string;
          parent_id: string | null;
          latitude: number | null;
          longitude: number | null;
          cover_image_url: string | null;
          sort_order: number;
          is_featured: boolean;
          is_active: boolean;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          parent_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          cover_image_url?: string | null;
          sort_order?: number;
          is_featured?: boolean;
          is_active?: boolean;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          key?: string;
          parent_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          cover_image_url?: string | null;
          sort_order?: number;
          is_featured?: boolean;
          is_active?: boolean;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      favorites: {
        Row: {
          id: string;
          profile_id: string;
          business_id: string | null;
          package_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          business_id?: string | null;
          package_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          business_id?: string | null;
          package_id?: string | null;
          created_at?: string;
        };
      };
      featured_listings: {
        Row: {
          id: string;
          business_id: string;
          destination_id: string | null;
          category_id: string | null;
          placement: string;
          priority: number;
          starts_at: string;
          ends_at: string | null;
          payment_id: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          destination_id?: string | null;
          category_id?: string | null;
          placement?: string;
          priority?: number;
          starts_at?: string;
          ends_at?: string | null;
          payment_id?: string | null;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          destination_id?: string | null;
          category_id?: string | null;
          placement?: string;
          priority?: number;
          starts_at?: string;
          ends_at?: string | null;
          payment_id?: string | null;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      guide_faq_translations: {
        Row: {
          id: string;
          faq_id: string;
          locale: string;
          question: string;
          answer: string;
        };
        Insert: {
          id?: string;
          faq_id: string;
          locale: string;
          question: string;
          answer: string;
        };
        Update: {
          id?: string;
          faq_id?: string;
          locale?: string;
          question?: string;
          answer?: string;
        };
      };
      guide_faqs: {
        Row: {
          id: string;
          guide_id: string | null;
          destination_id: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          guide_id?: string | null;
          destination_id?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          guide_id?: string | null;
          destination_id?: string | null;
          sort_order?: number;
        };
      };
      guide_translations: {
        Row: {
          id: string;
          guide_id: string;
          locale: string;
          title: string;
          slug: string;
          excerpt: string | null;
          body: string | null;
          seo_title: string | null;
          seo_description: string | null;
          is_machine_translated: boolean;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
          search_vector: string | null;
        };
        Insert: {
          id?: string;
          guide_id: string;
          locale: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          body?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_machine_translated?: boolean;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          search_vector?: string | null;
        };
        Update: {
          id?: string;
          guide_id?: string;
          locale?: string;
          title?: string;
          slug?: string;
          excerpt?: string | null;
          body?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_machine_translated?: boolean;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          search_vector?: string | null;
        };
      };
      guides: {
        Row: {
          id: string;
          author_id: string | null;
          cover_image_url: string | null;
          status: Database['public']['Enums']['content_status'];
          primary_destination_id: string | null;
          primary_category_id: string | null;
          reading_minutes: number | null;
          is_featured: boolean;
          is_demo: boolean;
          allow_ads: boolean;
          view_count: number;
          sort_order: number;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          author_id?: string | null;
          cover_image_url?: string | null;
          status?: Database['public']['Enums']['content_status'];
          primary_destination_id?: string | null;
          primary_category_id?: string | null;
          reading_minutes?: number | null;
          is_featured?: boolean;
          is_demo?: boolean;
          allow_ads?: boolean;
          view_count?: number;
          sort_order?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          author_id?: string | null;
          cover_image_url?: string | null;
          status?: Database['public']['Enums']['content_status'];
          primary_destination_id?: string | null;
          primary_category_id?: string | null;
          reading_minutes?: number | null;
          is_featured?: boolean;
          is_demo?: boolean;
          allow_ads?: boolean;
          view_count?: number;
          sort_order?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      lead_businesses: {
        Row: {
          id: string;
          lead_id: string;
          business_id: string;
          status: Database['public']['Enums']['lead_business_status'];
          rank: number;
          match_reason: Json;
          sent_at: string;
          viewed_at: string | null;
          responded_at: string | null;
          response_minutes: number | null;
          quoted_amount: number | null;
          quoted_currency: string | null;
          decline_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          business_id: string;
          status?: Database['public']['Enums']['lead_business_status'];
          rank?: number;
          match_reason?: Json;
          sent_at?: string;
          viewed_at?: string | null;
          responded_at?: string | null;
          response_minutes?: number | null;
          quoted_amount?: number | null;
          quoted_currency?: string | null;
          decline_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          business_id?: string;
          status?: Database['public']['Enums']['lead_business_status'];
          rank?: number;
          match_reason?: Json;
          sent_at?: string;
          viewed_at?: string | null;
          responded_at?: string | null;
          response_minutes?: number | null;
          quoted_amount?: number | null;
          quoted_currency?: string | null;
          decline_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      lead_credits: {
        Row: {
          id: string;
          business_id: string;
          delta: number;
          reason: string;
          lead_id: string | null;
          payment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          delta: number;
          reason: string;
          lead_id?: string | null;
          payment_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          delta?: number;
          reason?: string;
          lead_id?: string | null;
          payment_id?: string | null;
          created_at?: string;
        };
      };
      lead_events: {
        Row: {
          id: string;
          lead_id: string;
          business_id: string | null;
          actor_id: string | null;
          event: string;
          detail: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          business_id?: string | null;
          actor_id?: string | null;
          event: string;
          detail?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          business_id?: string | null;
          actor_id?: string | null;
          event?: string;
          detail?: Json;
          created_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          reference: string;
          traveler_id: string | null;
          full_name: string;
          email: string;
          phone: string | null;
          whatsapp: string | null;
          destination_id: string | null;
          category_id: string | null;
          destination_other: string | null;
          travel_start: string | null;
          travel_end: string | null;
          dates_flexible: boolean;
          adults: number;
          children: number;
          budget_min: number | null;
          budget_max: number | null;
          budget_currency: string;
          interests: string[];
          message: string | null;
          locale: string;
          status: Database['public']['Enums']['lead_status'];
          quality_score: number;
          source_url: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          referrer: string | null;
          ip_address: string | null;
          user_agent: string | null;
          distributed_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference: string;
          traveler_id?: string | null;
          full_name: string;
          email: string;
          phone?: string | null;
          whatsapp?: string | null;
          destination_id?: string | null;
          category_id?: string | null;
          destination_other?: string | null;
          travel_start?: string | null;
          travel_end?: string | null;
          dates_flexible?: boolean;
          adults?: number;
          children?: number;
          budget_min?: number | null;
          budget_max?: number | null;
          budget_currency?: string;
          interests?: string[];
          message?: string | null;
          locale?: string;
          status?: Database['public']['Enums']['lead_status'];
          quality_score?: number;
          source_url?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          referrer?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          distributed_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reference?: string;
          traveler_id?: string | null;
          full_name?: string;
          email?: string;
          phone?: string | null;
          whatsapp?: string | null;
          destination_id?: string | null;
          category_id?: string | null;
          destination_other?: string | null;
          travel_start?: string | null;
          travel_end?: string | null;
          dates_flexible?: boolean;
          adults?: number;
          children?: number;
          budget_min?: number | null;
          budget_max?: number | null;
          budget_currency?: string;
          interests?: string[];
          message?: string | null;
          locale?: string;
          status?: Database['public']['Enums']['lead_status'];
          quality_score?: number;
          source_url?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          referrer?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          distributed_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      locales: {
        Row: {
          code: string;
          name: string;
          native_name: string;
          pg_catalog: string;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          code: string;
          name: string;
          native_name: string;
          pg_catalog: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          code?: string;
          name?: string;
          native_name?: string;
          pg_catalog?: string;
          is_active?: boolean;
          sort_order?: number;
        };
      };
      media: {
        Row: {
          id: string;
          business_id: string | null;
          package_id: string | null;
          guide_id: string | null;
          uploaded_by: string | null;
          kind: Database['public']['Enums']['media_kind'];
          bucket: string;
          storage_path: string;
          public_url: string | null;
          file_name: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          width: number | null;
          height: number | null;
          blur_data_url: string | null;
          alt_text: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          package_id?: string | null;
          guide_id?: string | null;
          uploaded_by?: string | null;
          kind?: Database['public']['Enums']['media_kind'];
          bucket?: string;
          storage_path: string;
          public_url?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          width?: number | null;
          height?: number | null;
          blur_data_url?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          package_id?: string | null;
          guide_id?: string | null;
          uploaded_by?: string | null;
          kind?: Database['public']['Enums']['media_kind'];
          bucket?: string;
          storage_path?: string;
          public_url?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          width?: number | null;
          height?: number | null;
          blur_data_url?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          kind: Database['public']['Enums']['notification_kind'];
          payload: Json;
          lead_id: string | null;
          business_id: string | null;
          read_at: string | null;
          email_status: string;
          email_sent_at: string | null;
          email_error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          kind: Database['public']['Enums']['notification_kind'];
          payload?: Json;
          lead_id?: string | null;
          business_id?: string | null;
          read_at?: string | null;
          email_status?: string;
          email_sent_at?: string | null;
          email_error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          kind?: Database['public']['Enums']['notification_kind'];
          payload?: Json;
          lead_id?: string | null;
          business_id?: string | null;
          read_at?: string | null;
          email_status?: string;
          email_sent_at?: string | null;
          email_error?: string | null;
          created_at?: string;
        };
      };
      package_categories: {
        Row: {
          package_id: string;
          category_id: string;
        };
        Insert: {
          package_id: string;
          category_id: string;
        };
        Update: {
          package_id?: string;
          category_id?: string;
        };
      };
      package_destinations: {
        Row: {
          package_id: string;
          destination_id: string;
          sort_order: number;
        };
        Insert: {
          package_id: string;
          destination_id: string;
          sort_order?: number;
        };
        Update: {
          package_id?: string;
          destination_id?: string;
          sort_order?: number;
        };
      };
      package_inclusion_translations: {
        Row: {
          id: string;
          inclusion_id: string;
          locale: string;
          label: string;
        };
        Insert: {
          id?: string;
          inclusion_id: string;
          locale: string;
          label: string;
        };
        Update: {
          id?: string;
          inclusion_id?: string;
          locale?: string;
          label?: string;
        };
      };
      package_inclusions: {
        Row: {
          id: string;
          package_id: string;
          is_included: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          package_id: string;
          is_included?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          package_id?: string;
          is_included?: boolean;
          sort_order?: number;
        };
      };
      package_translations: {
        Row: {
          id: string;
          package_id: string;
          locale: string;
          title: string;
          summary: string | null;
          description: string | null;
          itinerary: string | null;
          seo_title: string | null;
          seo_description: string | null;
          is_machine_translated: boolean;
          created_at: string;
          updated_at: string;
          search_vector: string | null;
        };
        Insert: {
          id?: string;
          package_id: string;
          locale: string;
          title: string;
          summary?: string | null;
          description?: string | null;
          itinerary?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_machine_translated?: boolean;
          created_at?: string;
          updated_at?: string;
          search_vector?: string | null;
        };
        Update: {
          id?: string;
          package_id?: string;
          locale?: string;
          title?: string;
          summary?: string | null;
          description?: string | null;
          itinerary?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_machine_translated?: boolean;
          created_at?: string;
          updated_at?: string;
          search_vector?: string | null;
        };
      };
      packages: {
        Row: {
          id: string;
          business_id: string;
          slug: string;
          duration_days: number | null;
          duration_nights: number | null;
          price_from: number | null;
          currency: string;
          price_unit: string;
          max_group_size: number | null;
          min_travelers: number | null;
          cover_image_url: string | null;
          status: Database['public']['Enums']['content_status'];
          is_featured: boolean;
          is_demo: boolean;
          sort_order: number;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          slug: string;
          duration_days?: number | null;
          duration_nights?: number | null;
          price_from?: number | null;
          currency?: string;
          price_unit?: string;
          max_group_size?: number | null;
          min_travelers?: number | null;
          cover_image_url?: string | null;
          status?: Database['public']['Enums']['content_status'];
          is_featured?: boolean;
          is_demo?: boolean;
          sort_order?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          slug?: string;
          duration_days?: number | null;
          duration_nights?: number | null;
          price_from?: number | null;
          currency?: string;
          price_unit?: string;
          max_group_size?: number | null;
          min_travelers?: number | null;
          cover_image_url?: string | null;
          status?: Database['public']['Enums']['content_status'];
          is_featured?: boolean;
          is_demo?: boolean;
          sort_order?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      page_views: {
        Row: {
          id: number;
          path: string;
          locale: string | null;
          business_id: string | null;
          package_id: string | null;
          guide_id: string | null;
          destination_id: string | null;
          visitor_hash: string | null;
          referrer: string | null;
          country: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          path: string;
          locale?: string | null;
          business_id?: string | null;
          package_id?: string | null;
          guide_id?: string | null;
          destination_id?: string | null;
          visitor_hash?: string | null;
          referrer?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          path?: string;
          locale?: string | null;
          business_id?: string | null;
          package_id?: string | null;
          guide_id?: string | null;
          destination_id?: string | null;
          visitor_hash?: string | null;
          referrer?: string | null;
          country?: string | null;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          business_id: string | null;
          subscription_id: string | null;
          amount: number;
          currency: string;
          status: Database['public']['Enums']['payment_status'];
          provider: string;
          provider_ref: string | null;
          method: string | null;
          raw: Json;
          paid_at: string | null;
          failed_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          subscription_id?: string | null;
          amount: number;
          currency?: string;
          status?: Database['public']['Enums']['payment_status'];
          provider?: string;
          provider_ref?: string | null;
          method?: string | null;
          raw?: Json;
          paid_at?: string | null;
          failed_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          subscription_id?: string | null;
          amount?: number;
          currency?: string;
          status?: Database['public']['Enums']['payment_status'];
          provider?: string;
          provider_ref?: string | null;
          method?: string | null;
          raw?: Json;
          paid_at?: string | null;
          failed_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      platform_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          role: Database['public']['Enums']['user_role'];
          email: string | null;
          full_name: string | null;
          phone: string | null;
          whatsapp: string | null;
          avatar_url: string | null;
          locale: string;
          marketing_opt_in: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          role?: Database['public']['Enums']['user_role'];
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          avatar_url?: string | null;
          locale?: string;
          marketing_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          role?: Database['public']['Enums']['user_role'];
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          avatar_url?: string | null;
          locale?: string;
          marketing_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          business_id: string;
          author_id: string;
          lead_id: string | null;
          rating: number;
          title: string | null;
          body: string | null;
          locale: string;
          status: Database['public']['Enums']['review_status'];
          owner_reply: string | null;
          owner_replied_at: string | null;
          moderated_by: string | null;
          moderated_at: string | null;
          moderation_note: string | null;
          is_demo: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          author_id: string;
          lead_id?: string | null;
          rating: number;
          title?: string | null;
          body?: string | null;
          locale?: string;
          status?: Database['public']['Enums']['review_status'];
          owner_reply?: string | null;
          owner_replied_at?: string | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          moderation_note?: string | null;
          is_demo?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          author_id?: string;
          lead_id?: string | null;
          rating?: number;
          title?: string | null;
          body?: string | null;
          locale?: string;
          status?: Database['public']['Enums']['review_status'];
          owner_reply?: string | null;
          owner_replied_at?: string | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          moderation_note?: string | null;
          is_demo?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      schema_migrations: {
        Row: {
          filename: string;
          checksum: string;
          applied_at: string;
        };
        Insert: {
          filename: string;
          checksum: string;
          applied_at?: string;
        };
        Update: {
          filename?: string;
          checksum?: string;
          applied_at?: string;
        };
      };
      subscription_plan_translations: {
        Row: {
          id: string;
          plan_id: string;
          locale: string;
          name: string;
          description: string | null;
          features: string[];
        };
        Insert: {
          id?: string;
          plan_id: string;
          locale: string;
          name: string;
          description?: string | null;
          features?: string[];
        };
        Update: {
          id?: string;
          plan_id?: string;
          locale?: string;
          name?: string;
          description?: string | null;
          features?: string[];
        };
      };
      subscription_plans: {
        Row: {
          id: string;
          key: string;
          tier: Database['public']['Enums']['subscription_tier'];
          price_monthly: number;
          price_yearly: number | null;
          currency: string;
          max_packages: number | null;
          max_gallery_images: number | null;
          max_services: number | null;
          monthly_lead_quota: number | null;
          lead_priority: number;
          can_be_featured: boolean;
          has_analytics: boolean;
          shows_contact_details: boolean;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          tier: Database['public']['Enums']['subscription_tier'];
          price_monthly?: number;
          price_yearly?: number | null;
          currency?: string;
          max_packages?: number | null;
          max_gallery_images?: number | null;
          max_services?: number | null;
          monthly_lead_quota?: number | null;
          lead_priority?: number;
          can_be_featured?: boolean;
          has_analytics?: boolean;
          shows_contact_details?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          tier?: Database['public']['Enums']['subscription_tier'];
          price_monthly?: number;
          price_yearly?: number | null;
          currency?: string;
          max_packages?: number | null;
          max_gallery_images?: number | null;
          max_services?: number | null;
          monthly_lead_quota?: number | null;
          lead_priority?: number;
          can_be_featured?: boolean;
          has_analytics?: boolean;
          shows_contact_details?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          business_id: string;
          plan_id: string;
          status: Database['public']['Enums']['subscription_status'];
          current_period_start: string;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          provider: string | null;
          provider_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          plan_id: string;
          status?: Database['public']['Enums']['subscription_status'];
          current_period_start?: string;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          provider?: string | null;
          provider_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          plan_id?: string;
          status?: Database['public']['Enums']['subscription_status'];
          current_period_start?: string;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          provider?: string | null;
          provider_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      business_status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
      content_status: 'draft' | 'published' | 'archived';
      lead_business_status: 'sent' | 'viewed' | 'responded' | 'quoted' | 'won' | 'lost' | 'declined';
      lead_status: 'new' | 'distributed' | 'in_progress' | 'closed' | 'spam';
      media_kind: 'logo' | 'cover' | 'gallery' | 'guide_cover' | 'avatar';
      notification_kind: 'lead_new' | 'lead_status_changed' | 'business_approved' | 'business_rejected' | 'verification_decision' | 'subscription_status' | 'review_published';
      payment_status: 'pending' | 'succeeded' | 'failed' | 'refunded';
      review_status: 'pending' | 'published' | 'rejected';
      subscription_status: 'active' | 'past_due' | 'canceled' | 'expired';
      subscription_tier: 'free' | 'premium' | 'featured';
      user_role: 'traveler' | 'business_owner' | 'admin';
    };
  };
};

/** Row type for a table, e.g. Tables<'businesses'>. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
