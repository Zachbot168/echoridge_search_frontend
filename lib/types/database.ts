// Database types for the EchoRidge pipeline management system

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  aliases: string[]; // JSON array
  bbox_coordinates: {
    min_lat: number;
    min_lon: number;
    max_lat: number;
    max_lon: number;
  };
  center_lat: number;
  center_lon: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineRun {
  id: string;
  query: string;
  location_id?: string;
  execution_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  results_path?: string;
  total_businesses: number;
  metadata?: Record<string, any>; // JSON object
}

export interface Business {
  id: string;
  entity_id: string; // From PMF backend
  pipeline_run_id: string;
  name: string;
  category?: string;
  website?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postal?: string;
    country?: string;
    formatted?: string;
  };
  lat?: number;
  lon?: number;
  google_data?: {
    rating?: number;
    ratings_count?: number;
    business_status?: string;
    price_level?: number;
    types?: string[];
    hours?: any;
    raw_data?: any;
  };
  scores?: {
    D?: { value: number; evidence: string; confidence: number };
    O?: { value: number; evidence: string; confidence: number };
    I?: { value: number; evidence: string; confidence: number };
    M?: { value: number; evidence: string; confidence: number };
    B?: { value: number; evidence: string; confidence: number };
  };
  web_snapshot?: string;
  overall_score?: number;
  overall_note?: string;
  scored_at?: string;
  created_at: string;
}

// API Response types
export interface PipelineRunWithBusiness extends PipelineRun {
  businesses: Business[];
  location?: Location;
}

export interface LocationWithRuns extends Location {
  recent_runs: PipelineRun[];
  total_runs: number;
}

// Form/Input types
export interface CreatePipelineRunInput {
  query: string;
  location_id?: string;
  geofence?: {
    center_lat: number;
    center_lon: number;
    radius_km: number;
  };
  max_results?: number;
  providers?: string[];
}

export interface CreateLocationInput {
  name: string;
  aliases: string[];
  bbox_coordinates: {
    min_lat: number;
    min_lon: number;
    max_lat: number;
    max_lon: number;
  };
  center_lat: number;
  center_lon: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Database search and filter types
export interface BusinessSearchFilters {
  query?: string;
  category?: string;
  min_score?: number;
  max_score?: number;
  has_website?: boolean;
  pipeline_run_id?: string;
  location_id?: string;
}

export interface PipelineRunFilters {
  status?: string;
  location_id?: string;
  query?: string;
  execution_id?: string;
  date_from?: string;
  date_to?: string;
}

// Statistics and analytics types
export interface DashboardStats {
  total_pipeline_runs: number;
  total_businesses: number;
  total_locations: number;
  recent_runs: PipelineRun[];
  top_categories: Array<{ category: string; count: number }>;
  score_distribution: Array<{ score_range: string; count: number }>;
}

export interface BusinessMetrics {
  avg_score: number;
  total_count: number;
  by_category: Array<{ category: string; count: number; avg_score: number }>;
  by_location: Array<{ location: string; count: number; avg_score: number }>;
}