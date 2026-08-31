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
      analytics_events: {
        Row: {
          id: string;
          event: Database['public']['Enums']['analytics_event'];
          path: string | null;
          locale: string | null;
          visitor_hash: string | null;
          props: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event: Database['public']['Enums']['analytics_event'];
          path?: string | null;
          locale?: string | null;
          visitor_hash?: string | null;
          props?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event?: Database['public']['Enums']['analytics_event'];
          path?: string | null;
          locale?: string | null;
          visitor_hash?: string | null;
          props?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      attraction_translations: {
        Row: {
          id: string;
          attraction_id: string;
          locale: string;
          name: string;
          slug: string;
          summary: string | null;
          tip: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          attraction_id: string;
          locale: string;
          name: string;
          slug: string;
          summary?: string | null;
          tip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          attraction_id?: string;
          locale?: string;
          name?: string;
          slug?: string;
          summary?: string | null;
          tip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attraction_translations_attraction_id_fkey';
            columns: ['attraction_id'];
            isOneToOne: false;
            referencedRelation: 'attractions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attraction_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
        ];
      };
      attractions: {
        Row: {
          id: string;
          key: string;
          destination_id: string;
          kind: Database['public']['Enums']['attraction_kind'];
          latitude: number | null;
          longitude: number | null;
          is_free: boolean | null;
          typical_minutes: number | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          destination_id: string;
          kind: Database['public']['Enums']['attraction_kind'];
          latitude?: number | null;
          longitude?: number | null;
          is_free?: boolean | null;
          typical_minutes?: number | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          destination_id?: string;
          kind?: Database['public']['Enums']['attraction_kind'];
          latitude?: number | null;
          longitude?: number | null;
          is_free?: boolean | null;
          typical_minutes?: number | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attractions_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
        ];
      };
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
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'business_categories_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'business_categories_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      business_claims: {
        Row: {
          id: string;
          business_id: string;
          claimant_id: string;
          contact_name: string;
          contact_email: string;
          contact_phone: string | null;
          evidence: string | null;
          status: Database['public']['Enums']['claim_status'];
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          created_at: string;
          updated_at: string;
          verified_at: string | null;
          verification_method: Database['public']['Enums']['claim_verification_method'] | null;
          verified_contact: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          claimant_id: string;
          contact_name: string;
          contact_email: string;
          contact_phone?: string | null;
          evidence?: string | null;
          status?: Database['public']['Enums']['claim_status'];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          created_at?: string;
          updated_at?: string;
          verified_at?: string | null;
          verification_method?: Database['public']['Enums']['claim_verification_method'] | null;
          verified_contact?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          claimant_id?: string;
          contact_name?: string;
          contact_email?: string;
          contact_phone?: string | null;
          evidence?: string | null;
          status?: Database['public']['Enums']['claim_status'];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          created_at?: string;
          updated_at?: string;
          verified_at?: string | null;
          verification_method?: Database['public']['Enums']['claim_verification_method'] | null;
          verified_contact?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'business_claims_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'business_claims_claimant_id_fkey';
            columns: ['claimant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'business_claims_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'business_destinations_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'business_destinations_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'business_service_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'business_service_translations_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'business_services';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'business_services_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'business_translations_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'business_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
        ];
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
          country_code: string | null;
          claimed_at: string | null;
          associations: string | null;
          day_rate_low: number | null;
          day_rate_high: number | null;
          day_rate_currency: string;
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
          country_code?: string | null;
          claimed_at?: string | null;
          associations?: string | null;
          day_rate_low?: number | null;
          day_rate_high?: number | null;
          day_rate_currency?: string;
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
          country_code?: string | null;
          claimed_at?: string | null;
          associations?: string | null;
          day_rate_low?: number | null;
          day_rate_high?: number | null;
          day_rate_currency?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'businesses_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'businesses_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'businesses_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'category_translations_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'category_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
        ];
      };
      claim_verifications: {
        Row: {
          id: string;
          business_id: string;
          profile_id: string;
          code_hash: string;
          sent_to: string;
          attempts: number;
          expires_at: string;
          verified_at: string | null;
          created_at: string;
          method: Database['public']['Enums']['claim_verification_method'];
        };
        Insert: {
          id?: string;
          business_id: string;
          profile_id: string;
          code_hash: string;
          sent_to: string;
          attempts?: number;
          expires_at: string;
          verified_at?: string | null;
          created_at?: string;
          method?: Database['public']['Enums']['claim_verification_method'];
        };
        Update: {
          id?: string;
          business_id?: string;
          profile_id?: string;
          code_hash?: string;
          sent_to?: string;
          attempts?: number;
          expires_at?: string;
          verified_at?: string | null;
          created_at?: string;
          method?: Database['public']['Enums']['claim_verification_method'];
        };
        Relationships: [
          {
            foreignKeyName: 'claim_verifications_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claim_verifications_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      countries: {
        Row: {
          code: string;
          name: string;
          supports_destinations: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          code: string;
          name: string;
          supports_destinations?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          code?: string;
          name?: string;
          supports_destinations?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      deal_translations: {
        Row: {
          id: string;
          deal_id: string;
          locale: string;
          headline: string;
          terms: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          locale: string;
          headline: string;
          terms: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          locale?: string;
          headline?: string;
          terms?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'deal_translations_deal_id_fkey';
            columns: ['deal_id'];
            isOneToOne: false;
            referencedRelation: 'deals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deal_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
        ];
      };
      deals: {
        Row: {
          id: string;
          business_id: string;
          package_id: string | null;
          deal_price: number | null;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          package_id?: string | null;
          deal_price?: number | null;
          starts_at?: string;
          ends_at: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          package_id?: string | null;
          deal_price?: number | null;
          starts_at?: string;
          ends_at?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'deals_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deals_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'packages';
            referencedColumns: ['id'];
          },
        ];
      };
      destination_costs: {
        Row: {
          destination_id: string;
          currency: string;
          budget_low: number | null;
          budget_high: number | null;
          midrange_low: number | null;
          midrange_high: number | null;
          luxury_low: number | null;
          luxury_high: number | null;
          park_fee_low: number | null;
          park_fee_high: number | null;
          notable_fee_key: string | null;
          notable_fee_amount: number | null;
          authority: string | null;
          fees_as_of: number;
          created_at: string;
          updated_at: string;
          notable_fee_basis: Database['public']['Enums']['notable_fee_basis'] | null;
          notable_fee_nights: number | null;
        };
        Insert: {
          destination_id: string;
          currency?: string;
          budget_low?: number | null;
          budget_high?: number | null;
          midrange_low?: number | null;
          midrange_high?: number | null;
          luxury_low?: number | null;
          luxury_high?: number | null;
          park_fee_low?: number | null;
          park_fee_high?: number | null;
          notable_fee_key?: string | null;
          notable_fee_amount?: number | null;
          authority?: string | null;
          fees_as_of: number;
          created_at?: string;
          updated_at?: string;
          notable_fee_basis?: Database['public']['Enums']['notable_fee_basis'] | null;
          notable_fee_nights?: number | null;
        };
        Update: {
          destination_id?: string;
          currency?: string;
          budget_low?: number | null;
          budget_high?: number | null;
          midrange_low?: number | null;
          midrange_high?: number | null;
          luxury_low?: number | null;
          luxury_high?: number | null;
          park_fee_low?: number | null;
          park_fee_high?: number | null;
          notable_fee_key?: string | null;
          notable_fee_amount?: number | null;
          authority?: string | null;
          fees_as_of?: number;
          created_at?: string;
          updated_at?: string;
          notable_fee_basis?: Database['public']['Enums']['notable_fee_basis'] | null;
          notable_fee_nights?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'destination_costs_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: true;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'destination_seasonality_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'destination_seasonality_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'destination_seasonality_translations_seasonality_id_fkey';
            columns: ['seasonality_id'];
            isOneToOne: false;
            referencedRelation: 'destination_seasonality';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'destination_translations_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'destination_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
        ];
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
          country_code: string | null;
          region_id: string | null;
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
          country_code?: string | null;
          region_id?: string | null;
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
          country_code?: string | null;
          region_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'destinations_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'destinations_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'destinations_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'regions';
            referencedColumns: ['id'];
          },
        ];
      };
      event_translations: {
        Row: {
          id: string;
          event_id: string;
          locale: string;
          name: string;
          slug: string;
          summary: string | null;
          advice: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          locale: string;
          name: string;
          slug: string;
          summary?: string | null;
          advice?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          locale?: string;
          name?: string;
          slug?: string;
          summary?: string | null;
          advice?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_translations_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
        ];
      };
      events: {
        Row: {
          id: string;
          key: string;
          destination_id: string | null;
          country_code: string | null;
          kind: Database['public']['Enums']['event_kind'];
          is_annual: boolean;
          typical_month: number | null;
          next_start: string | null;
          next_end: string | null;
          organiser: string | null;
          website: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          destination_id?: string | null;
          country_code?: string | null;
          kind: Database['public']['Enums']['event_kind'];
          is_annual?: boolean;
          typical_month?: number | null;
          next_start?: string | null;
          next_end?: string | null;
          organiser?: string | null;
          website?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          destination_id?: string | null;
          country_code?: string | null;
          kind?: Database['public']['Enums']['event_kind'];
          is_annual?: boolean;
          typical_month?: number | null;
          next_start?: string | null;
          next_end?: string | null;
          organiser?: string | null;
          website?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'events_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'favorites_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'packages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'featured_listings_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'featured_listings_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'featured_listings_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'featured_listings_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'featured_listings_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'guide_faq_translations_faq_id_fkey';
            columns: ['faq_id'];
            isOneToOne: false;
            referencedRelation: 'guide_faqs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guide_faq_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'guide_faqs_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guide_faqs_guide_id_fkey';
            columns: ['guide_id'];
            isOneToOne: false;
            referencedRelation: 'guides';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'guide_translations_guide_id_fkey';
            columns: ['guide_id'];
            isOneToOne: false;
            referencedRelation: 'guides';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guide_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'guides_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guides_primary_category_id_fkey';
            columns: ['primary_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guides_primary_destination_id_fkey';
            columns: ['primary_destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
        ];
      };
      hidden_gem_translations: {
        Row: {
          id: string;
          hidden_gem_id: string;
          locale: string;
          pitch: string;
          trade_off: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          hidden_gem_id: string;
          locale: string;
          pitch: string;
          trade_off: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          hidden_gem_id?: string;
          locale?: string;
          pitch?: string;
          trade_off?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hidden_gem_translations_hidden_gem_id_fkey';
            columns: ['hidden_gem_id'];
            isOneToOne: false;
            referencedRelation: 'hidden_gems';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hidden_gem_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
        ];
      };
      hidden_gems: {
        Row: {
          id: string;
          destination_id: string;
          instead_of_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          destination_id: string;
          instead_of_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          destination_id?: string;
          instead_of_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hidden_gems_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: true;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hidden_gems_instead_of_id_fkey';
            columns: ['instead_of_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'lead_businesses_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_businesses_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'lead_credits_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_credits_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_credits_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'lead_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_events_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_events_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
        ];
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
          reference?: string;
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
        Relationships: [
          {
            foreignKeyName: 'leads_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'leads_traveler_id_fkey';
            columns: ['traveler_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [];
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
          destination_id: string | null;
          caption: string | null;
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
          destination_id?: string | null;
          caption?: string | null;
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
          destination_id?: string | null;
          caption?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'media_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'media_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'media_guide_id_fkey';
            columns: ['guide_id'];
            isOneToOne: false;
            referencedRelation: 'guides';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'media_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'packages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'media_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'notifications_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      operator_outreach: {
        Row: {
          id: string;
          business_id: string;
          email: string;
          source: string;
          batch: string;
          status: Database['public']['Enums']['outreach_status'];
          subject: string;
          body: string;
          provider: string | null;
          provider_ref: string | null;
          error: string | null;
          queued_at: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          email: string;
          source: string;
          batch: string;
          status?: Database['public']['Enums']['outreach_status'];
          subject: string;
          body: string;
          provider?: string | null;
          provider_ref?: string | null;
          error?: string | null;
          queued_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          email?: string;
          source?: string;
          batch?: string;
          status?: Database['public']['Enums']['outreach_status'];
          subject?: string;
          body?: string;
          provider?: string | null;
          provider_ref?: string | null;
          error?: string | null;
          queued_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'operator_outreach_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: true;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      outreach_suppressions: {
        Row: {
          email: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          email: string;
          reason?: string;
          created_at?: string;
        };
        Update: {
          email?: string;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'package_categories_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'package_categories_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'packages';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'package_destinations_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'package_destinations_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'packages';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'package_inclusion_translations_inclusion_id_fkey';
            columns: ['inclusion_id'];
            isOneToOne: false;
            referencedRelation: 'package_inclusions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'package_inclusion_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'package_inclusions_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'packages';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'package_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'package_translations_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'packages';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'packages_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'page_views_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'page_views_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'page_views_guide_id_fkey';
            columns: ['guide_id'];
            isOneToOne: false;
            referencedRelation: 'guides';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'page_views_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'page_views_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'packages';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'payments_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'platform_settings_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profiles_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
        ];
      };
      regions: {
        Row: {
          id: string;
          country_code: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          country_code: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          country_code?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'regions_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
        ];
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
          is_verified_enquiry: boolean;
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
          is_verified_enquiry?: boolean;
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
          is_verified_enquiry?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'reviews_moderated_by_fkey';
            columns: ['moderated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      saved_trip_stops: {
        Row: {
          id: string;
          trip_id: string;
          destination_id: string;
          nights: number;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          destination_id: string;
          nights: number;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          destination_id?: string;
          nights?: number;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'saved_trip_stops_destination_id_fkey';
            columns: ['destination_id'];
            isOneToOne: false;
            referencedRelation: 'destinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'saved_trip_stops_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'saved_trips';
            referencedColumns: ['id'];
          },
        ];
      };
      saved_trips: {
        Row: {
          id: string;
          profile_id: string;
          name: string | null;
          style: string;
          travellers: number;
          stop_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name?: string | null;
          style: string;
          travellers: number;
          stop_count: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          name?: string | null;
          style?: string;
          travellers?: number;
          stop_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'saved_trips_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'subscription_plan_translations_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'locales';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'subscription_plan_translations_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_plans';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'subscriptions_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_plans';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    // A mapped type over never is an object with NO keys. Record<string, never>
    // would instead declare that every key exists and maps to never, so a table
    // lookup finds a never-typed view and collapses the whole result, surfacing
    // as "Property 'x' does not exist on type 'never'".
    Views: { [_ in never]: never };
    Functions: {
      build_search_query: {
        Args: { input: string; loc: string };
        Returns: string;
      };
      business_has_lead_capacity: {
        Args: { target: string };
        Returns: boolean;
      };
      business_is_public: {
        Args: { target: string };
        Returns: boolean;
      };
      business_is_unclaimed: {
        Args: { target: string };
        Returns: boolean;
      };
      businesses_near: {
        Args: { p_lat: number; p_lng: number; p_radius_km: number; p_limit: number };
        Returns: unknown;
      };
      current_role_is: {
        Args: { target: Database['public']['Enums']['user_role'] };
        Returns: boolean;
      };
      featured_is_live: {
        Args: { f: Database['public']['Tables']['featured_listings']['Row'] };
        Returns: boolean;
      };
      gallery_limit_for: {
        Args: { p_business_id: string };
        Returns: number;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_trusted_context: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      lead_belongs_to_me: {
        Args: { target_lead: string };
        Returns: boolean;
      };
      lead_credit_balance: {
        Args: { target: string };
        Returns: number;
      };
      lead_is_distributed_to_me: {
        Args: { target_lead: string };
        Returns: boolean;
      };
      match_lead_to_businesses: {
        Args: { target_lead: string };
        Returns: number;
      };
      owns_business: {
        Args: { target: string };
        Returns: boolean;
      };
      owns_package: {
        Args: { target: string };
        Returns: boolean;
      };
      package_is_public: {
        Args: { target: string };
        Returns: boolean;
      };
      rls_auto_enable: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      save_trip: {
        Args: { p_name: string; p_style: string; p_travellers: number; p_stops: Json };
        Returns: string;
      };
      score_lead: {
        Args: { lead: Database['public']['Tables']['leads']['Row'] };
        Returns: number;
      };
      slugify: {
        Args: { input: string };
        Returns: string;
      };
    };
    // Required by the GenericSchema constraint in @supabase/supabase-js.
    CompositeTypes: { [_ in never]: never };
    Enums: {
      analytics_event: 'search_started' | 'search_result_clicked' | 'destination_viewed' | 'business_viewed' | 'whatsapp_clicked' | 'phone_clicked' | 'quote_started' | 'quote_submitted' | 'quote_response_received' | 'review_submitted' | 'trip_planner_started' | 'trip_planner_completed' | 'save_clicked' | 'signup_completed' | 'business_signup' | 'subscription_started';
      attraction_kind: 'wildlife' | 'landscape' | 'cultural' | 'historic' | 'museum' | 'water' | 'active';
      business_status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
      claim_status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
      claim_verification_method: 'email' | 'manual' | 'domain';
      content_status: 'draft' | 'published' | 'archived';
      event_kind: 'music' | 'film' | 'culture' | 'sport' | 'wildlife' | 'food' | 'trade';
      lead_business_status: 'sent' | 'viewed' | 'responded' | 'quoted' | 'won' | 'lost' | 'declined';
      lead_status: 'new' | 'distributed' | 'in_progress' | 'closed' | 'spam';
      media_kind: 'logo' | 'cover' | 'gallery' | 'guide_cover' | 'avatar';
      notable_fee_basis: 'per_person' | 'per_vehicle' | 'package_per_person';
      notification_kind: 'lead_new' | 'lead_status_changed' | 'business_approved' | 'business_rejected' | 'verification_decision' | 'subscription_status' | 'review_published';
      outreach_status: 'draft' | 'queued' | 'sent' | 'failed' | 'bounced' | 'skipped';
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
