import { z } from 'zod';

// Base schemas for common fields
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
const uuidSchema = z.string().uuid();

// Company schema with full validation
export const companySchema = z.object({
  global_company_id: z.string().min(1),
  dataset_version: z.string(),
  name: z.string().min(1),
  domain: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country_code: z.string().length(2).optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  sector: z.string().optional().nullable(),
  employee_count: z.number().int().nonnegative().optional().nullable(),
  revenue_estimate: z.number().nonnegative().optional().nullable(),
  // Echo Ridge scoring fields (all required for determinism)
  final_score: z.number().min(0).max(1),
  d_score: z.number().min(0).max(1),
  o_score: z.number().min(0).max(1),
  i_score: z.number().min(0).max(1),
  m_score: z.number().min(0).max(1),
  b_score: z.number().min(0).max(1),
  confidence_score: z.number().min(0).max(1),
  norm_context_version: z.string().min(1),
  checksum: z.string().min(1),
  risk_score: z.number().min(0).max(1).optional().nullable(),
  feasibility_score: z.number().min(0).max(1).optional().nullable(),
  // Metadata
  created_at: dateStringSchema,
  updated_at: dateStringSchema,
  synced_at: dateStringSchema.optional().nullable(),
  is_active: z.boolean().optional().default(true),
  tombstone_at: dateStringSchema.optional().nullable(),
});

// Company alias schema
export const companyAliasSchema = z.object({
  alias_id: z.string().min(1),
  global_company_id: z.string().min(1),
  alias: z.string().min(1),
  alias_type: z.enum(['legal', 'dba', 'brand', 'former', 'other']),
  created_at: dateStringSchema,
});

// Evidence schema
export const evidenceSchema = z.object({
  evidence_id: z.string().min(1),
  global_company_id: z.string().min(1),
  type: z.enum(['article', 'report', 'filing', 'website', 'social', 'other']),
  title: z.string().min(1),
  preview: z.string().min(1).max(500), // Lightweight preview
  source_url: z.string().url().optional().nullable(),
  source_name: z.string().optional().nullable(),
  relevance_score: z.number().min(0).max(1).optional().nullable(),
  created_at: dateStringSchema,
  extracted_at: dateStringSchema.optional().nullable(),
});

// Drift alert schema
export const driftAlertSchema = z.object({
  alert_id: z.string().min(1),
  global_company_id: z.string().min(1),
  metric: z.enum(['d_score', 'o_score', 'i_score', 'm_score', 'b_score', 'final_score']),
  old_value: z.number().min(0).max(1),
  new_value: z.number().min(0).max(1),
  drift_percentage: z.number(),
  detected_at: dateStringSchema,
  run_id: z.string().min(1),
  seen_at: dateStringSchema.optional().nullable(),
});

// Scoring run schema
export const scoringRunSchema = z.object({
  run_id: z.string().min(1),
  started_at: dateStringSchema,
  completed_at: dateStringSchema.optional().nullable(),
  companies_scored: z.number().int().nonnegative(),
  avg_confidence: z.number().min(0).max(1),
  norm_context_version: z.string().min(1),
  status: z.enum(['running', 'completed', 'failed']),
  error_message: z.string().optional().nullable(),
});

// Service stats schema
export const serviceStatsSchema = z.object({
  stat_name: z.string().min(1),
  stat_value: z.number(),
  unit: z.string().optional().nullable(),
  measured_at: dateStringSchema,
});

// Workspace schemas
export const workspaceBookmarkSchema = z.object({
  user_id: z.string().min(1),
  org_id: z.string().optional().nullable(),
  global_company_id: z.string().min(1),
  tags: z.array(z.string()).optional().default([]),
  created_at: dateStringSchema,
  updated_at: dateStringSchema,
});

export const workspaceComparisonSchema = z.object({
  comparison_id: uuidSchema,
  user_id: z.string().min(1),
  org_id: z.string().optional().nullable(),
  name: z.string().min(1),
  company_ids: z.array(z.string().min(1)).min(2), // At least 2 companies
  created_at: dateStringSchema,
  updated_at: dateStringSchema,
});

export const workspaceNoteSchema = z.object({
  note_id: uuidSchema,
  user_id: z.string().min(1),
  org_id: z.string().optional().nullable(),
  global_company_id: z.string().min(1),
  content: z.string().min(1),
  created_at: dateStringSchema,
  updated_at: dateStringSchema,
});

export const searchHistorySchema = z.object({
  search_id: uuidSchema,
  user_id: z.string().min(1),
  org_id: z.string().optional().nullable(),
  query: z.string(),
  filters: z.record(z.any()).optional().nullable(),
  result_count: z.number().int().nonnegative(),
  executed_at: dateStringSchema,
});

// API response schemas
export const companiesResponseSchema = z.object({
  companies: z.array(companySchema),
  next_cursor: z.string().optional(),
  total: z.number().int().nonnegative().optional(),
  dataset_version: z.string(),
});

export const evidenceResponseSchema = z.object({
  evidence: z.array(evidenceSchema),
  next_cursor: z.string().optional(),
  total: z.number().int().nonnegative().optional(),
});

export const driftResponseSchema = z.object({
  alerts: z.array(driftAlertSchema),
  summary: z.object({
    total_drifts: z.number().int().nonnegative(),
    avg_drift_percentage: z.number(),
    most_volatile_metric: z.string(),
  }),
});

// Search filter schema
export const searchFiltersSchema = z.object({
  region: z.array(z.string()).optional(),
  industry: z.array(z.string()).optional(),
  score_min: z.number().min(0).max(1).optional(),
  score_max: z.number().min(0).max(1).optional(),
  employee_count_min: z.number().int().nonnegative().optional(),
  employee_count_max: z.number().int().nonnegative().optional(),
  risk_level: z.enum(['low', 'medium', 'high']).optional(),
});

// Validation helpers
export function validateCompany(data: unknown): z.infer<typeof companySchema> {
  return companySchema.parse(data);
}

export function validateCompanyArray(data: unknown): z.infer<typeof companySchema>[] {
  return z.array(companySchema).parse(data);
}

export function validateEvidence(data: unknown): z.infer<typeof evidenceSchema> {
  return evidenceSchema.parse(data);
}

export function validateDriftAlert(data: unknown): z.infer<typeof driftAlertSchema> {
  return driftAlertSchema.parse(data);
}

// Safe parsing helpers (return null on error)
export function safeParseCompany(data: unknown): z.infer<typeof companySchema> | null {
  const result = companySchema.safeParse(data);
  return result.success ? result.data : null;
}

export function safeParseEvidence(data: unknown): z.infer<typeof evidenceSchema> | null {
  const result = evidenceSchema.safeParse(data);
  return result.success ? result.data : null;
}

// Transform helpers for API responses
export function transformAPICompany(apiData: any): z.infer<typeof companySchema> {
  // Handle any API-specific transformations
  return {
    ...apiData,
    is_active: apiData.is_active !== false,
    created_at: apiData.created_at || new Date().toISOString(),
    updated_at: apiData.updated_at || new Date().toISOString(),
  };
}

// Validation for determinism fields
export function validateDeterminismFields(company: any): boolean {
  const requiredFields = [
    'norm_context_version',
    'checksum',
    'final_score',
    'd_score',
    'o_score',
    'i_score',
    'm_score',
    'b_score',
    'confidence_score',
  ];
  
  return requiredFields.every(field => {
    const value = company[field];
    return value !== undefined && value !== null && value !== '';
  });
}

// Export type inference helpers
export type Company = z.infer<typeof companySchema>;
export type CompanyAlias = z.infer<typeof companyAliasSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type DriftAlert = z.infer<typeof driftAlertSchema>;
export type WorkspaceBookmark = z.infer<typeof workspaceBookmarkSchema>;
export type WorkspaceComparison = z.infer<typeof workspaceComparisonSchema>;
export type WorkspaceNote = z.infer<typeof workspaceNoteSchema>;
export type SearchHistory = z.infer<typeof searchHistorySchema>;
export type SearchFilters = z.infer<typeof searchFiltersSchema>;