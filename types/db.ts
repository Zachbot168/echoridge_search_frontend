// Global catalog types (read-only from API)
export interface Company {
  global_company_id: string;
  dataset_version: string;
  name: string;
  domain?: string;
  postal_code?: string;
  country_code?: string;
  city?: string;
  state?: string;
  region?: string;
  industry?: string;
  sector?: string;
  employee_count?: number;
  revenue_estimate?: number;
  // Echo Ridge scoring fields
  final_score: number;
  d_score: number;
  o_score: number;
  i_score: number;
  m_score: number;
  b_score: number;
  confidence_score: number;
  norm_context_version: string;
  checksum: string;
  risk_score?: number;
  feasibility_score?: number;
  // Metadata
  created_at: string;
  updated_at: string;
  synced_at?: string;
  is_active?: boolean;
  tombstone_at?: string;
}

export interface CompanyAlias {
  alias_id: string;
  global_company_id: string;
  alias: string;
  alias_type: 'legal' | 'dba' | 'brand' | 'former' | 'other';
  created_at: string;
}

export interface Evidence {
  evidence_id: string;
  global_company_id: string;
  type: 'article' | 'report' | 'filing' | 'website' | 'social' | 'other';
  title: string;
  preview: string;
  source_url?: string;
  source_name?: string;
  relevance_score?: number;
  created_at: string;
  extracted_at?: string;
}

export interface FacetBucket {
  facet_type: 'region' | 'industry' | 'score_range' | 'employee_count' | 'risk_level';
  bucket_value: string;
  count: number;
  dataset_version: string;
  updated_at: string;
}

export interface ScoringRun {
  run_id: string;
  started_at: string;
  completed_at?: string;
  companies_scored: number;
  avg_confidence: number;
  norm_context_version: string;
  status: 'running' | 'completed' | 'failed';
  error_message?: string;
}

export interface DriftAlert {
  alert_id: string;
  global_company_id: string;
  metric: 'd_score' | 'o_score' | 'i_score' | 'm_score' | 'b_score' | 'final_score';
  old_value: number;
  new_value: number;
  drift_percentage: number;
  detected_at: string;
  run_id: string;
  seen_at?: string; // Local only
}

export interface ServiceStats {
  stat_name: string;
  stat_value: number;
  unit?: string;
  measured_at: string;
}

export interface SyncState {
  resource_type: 'companies' | 'evidence' | 'scores' | 'runs' | 'drift' | 'stats';
  last_sync_at?: string;
  last_etag?: string;
  last_cursor?: string;
  sync_status: 'pending' | 'syncing' | 'success' | 'error';
  error_message?: string;
  records_synced?: number;
}

// User overlay types (local/syncable)
export interface WorkspaceBookmark {
  user_id: string;
  org_id?: string;
  global_company_id: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface WorkspaceComparison {
  comparison_id: string;
  user_id: string;
  org_id?: string;
  name: string;
  company_ids: string[]; // Array of global_company_ids
  created_at: string;
  updated_at: string;
}

export interface WorkspaceNote {
  note_id: string;
  user_id: string;
  org_id?: string;
  global_company_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface SearchHistory {
  search_id: string;
  user_id: string;
  org_id?: string;
  query: string;
  filters?: Record<string, any>;
  result_count: number;
  executed_at: string;
}

// API response types
export interface CompaniesResponse {
  companies: Company[];
  next_cursor?: string;
  total?: number;
  dataset_version: string;
}

export interface EvidenceResponse {
  evidence: Evidence[];
  next_cursor?: string;
  total?: number;
}

export interface DriftResponse {
  alerts: DriftAlert[];
  summary: {
    total_drifts: number;
    avg_drift_percentage: number;
    most_volatile_metric: string;
  };
}

// Query types
export interface SearchFilters {
  region?: string[];
  industry?: string[];
  score_min?: number;
  score_max?: number;
  employee_count_min?: number;
  employee_count_max?: number;
  risk_level?: 'low' | 'medium' | 'high';
}

export interface SearchOptions {
  q?: string;
  filters?: SearchFilters;
  sort?: 'score' | 'name' | 'updated' | 'relevance';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CompanyDetail extends Company {
  aliases: CompanyAlias[];
  evidence: Evidence[];
  drift_alerts: DriftAlert[];
  is_bookmarked?: boolean;
  user_notes?: WorkspaceNote[];
}

// Environment config
export interface DBConfig {
  driver: 'sqlite-wasm' | 'indexeddb';
  tenantMode: 'universal';
  audienceScope: 'public' | 'partner' | 'enterprise';
  apiBaseUrl: string;
}