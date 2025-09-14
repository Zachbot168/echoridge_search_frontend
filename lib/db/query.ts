import { getDatabase, toSQLiteDate } from './engine';
import type {
  Company,
  CompanyDetail,
  SearchOptions,
  SearchFilters,
  DriftAlert,
  WorkspaceBookmark,
  WorkspaceComparison,
  WorkspaceNote,
  SearchHistory,
  FacetBucket,
  CompanyAlias,
  Evidence,
} from '@/types/db';

// Company search and filtering
export async function searchCompanies(options: SearchOptions): Promise<{
  companies: Company[];
  total: number;
  facets: Record<string, FacetBucket[]>;
}> {
  const db = getDatabase();
  const { q, filters, sort = 'score', sort_order = 'desc', limit = 20, offset = 0 } = options;
  
  // Build WHERE clauses
  const whereClauses: string[] = ['companies.is_active = 1'];
  const params: any[] = [];
  
  // Text search
  if (q && q.trim()) {
    whereClauses.push(`(
      companies.global_company_id IN (
        SELECT global_company_id FROM companies_fts WHERE companies_fts MATCH ?
      ) OR companies.global_company_id IN (
        SELECT global_company_id FROM aliases_fts WHERE aliases_fts MATCH ?
      )
    )`);
    params.push(q.trim(), q.trim());
  }
  
  // Filters
  if (filters?.region && filters.region.length > 0) {
    const placeholders = filters.region.map(() => '?').join(',');
    whereClauses.push(`companies.region IN (${placeholders})`);
    params.push(...filters.region);
  }
  
  if (filters?.industry && filters.industry.length > 0) {
    const placeholders = filters.industry.map(() => '?').join(',');
    whereClauses.push(`companies.industry IN (${placeholders})`);
    params.push(...filters.industry);
  }
  
  if (filters?.score_min !== undefined) {
    whereClauses.push('companies.final_score >= ?');
    params.push(filters.score_min);
  }
  
  if (filters?.score_max !== undefined) {
    whereClauses.push('companies.final_score <= ?');
    params.push(filters.score_max);
  }
  
  if (filters?.employee_count_min !== undefined) {
    whereClauses.push('companies.employee_count >= ?');
    params.push(filters.employee_count_min);
  }
  
  if (filters?.employee_count_max !== undefined) {
    whereClauses.push('companies.employee_count <= ?');
    params.push(filters.employee_count_max);
  }
  
  if (filters?.risk_level) {
    const riskRanges = {
      low: [0, 0.3],
      medium: [0.3, 0.7],
      high: [0.7, 1.0],
    };
    const range = riskRanges[filters.risk_level];
    whereClauses.push('companies.risk_score >= ? AND companies.risk_score < ?');
    params.push(...range);
  }
  
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  // Sort mapping
  const sortColumns: Record<string, string> = {
    score: 'final_score',
    name: 'name',
    updated: 'updated_at',
    relevance: 'final_score', // Could be enhanced with search relevance
  };
  
  const sortColumn = sortColumns[sort] || 'final_score';
  const orderClause = `ORDER BY companies.${sortColumn} ${sort_order.toUpperCase()}`;
  
  // Get total count
  const countStmt = db.prepare(`
    SELECT COUNT(*) as total
    FROM companies
    ${whereClause}
  `);
  const { total } = countStmt.bind(params).get<{ total: number }>() || { total: 0 };
  countStmt.finalize();
  
  // Get companies
  const companiesStmt = db.prepare(`
    SELECT companies.*
    FROM companies
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `);
  
  const companies = companiesStmt.bind([...params, limit, offset]).all<Company>();
  companiesStmt.finalize();
  
  // Get facets
  const facets = await getFacets(whereClause, params);
  
  return { companies, total, facets };
}

// Get facet counts
async function getFacets(
  whereClause: string,
  params: any[]
): Promise<Record<string, FacetBucket[]>> {
  const db = getDatabase();
  
  // Get the base query without the specific facet filters
  const baseFacetQuery = (excludeField?: string) => {
    const clauses = whereClause
      .replace(/WHERE\s+/, '')
      .split(/\s+AND\s+/)
      .filter(clause => {
        if (!excludeField) return true;
        return !clause.includes(`companies.${excludeField}`);
      });
    
    return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  };
  
  const facets: Record<string, FacetBucket[]> = {};
  
  // Region facets
  const regionQuery = baseFacetQuery('region');
  const regionStmt = db.prepare(`
    SELECT region as bucket_value, COUNT(*) as count
    FROM companies
    ${regionQuery}
    GROUP BY region
    HAVING region IS NOT NULL
    ORDER BY count DESC
  `);
  facets.region = regionStmt.bind(params).all<FacetBucket>().map(f => ({
    ...f,
    facet_type: 'region',
    dataset_version: '',
    updated_at: toSQLiteDate(),
  }));
  regionStmt.finalize();
  
  // Industry facets
  const industryQuery = baseFacetQuery('industry');
  const industryStmt = db.prepare(`
    SELECT industry as bucket_value, COUNT(*) as count
    FROM companies
    ${industryQuery}
    GROUP BY industry
    HAVING industry IS NOT NULL
    ORDER BY count DESC
  `);
  facets.industry = industryStmt.bind(params).all<FacetBucket>().map(f => ({
    ...f,
    facet_type: 'industry',
    dataset_version: '',
    updated_at: toSQLiteDate(),
  }));
  industryStmt.finalize();
  
  return facets;
}

// Get company details with related data
export async function getCompanyDetail(
  globalCompanyId: string,
  userId?: string
): Promise<CompanyDetail | null> {
  const db = getDatabase();
  
  // Get company
  const companyStmt = db.prepare('SELECT * FROM companies WHERE global_company_id = ?');
  const company = companyStmt.bind([globalCompanyId]).get<Company>();
  companyStmt.finalize();
  
  if (!company) {
    return null;
  }
  
  // Get aliases
  const aliasesStmt = db.prepare('SELECT * FROM company_aliases WHERE global_company_id = ?');
  const aliases = aliasesStmt.bind([globalCompanyId]).all<CompanyAlias>();
  aliasesStmt.finalize();
  
  // Get evidence
  const evidenceStmt = db.prepare('SELECT * FROM evidence WHERE global_company_id = ? ORDER BY created_at DESC LIMIT 50');
  const evidence = evidenceStmt.bind([globalCompanyId]).all<Evidence>();
  evidenceStmt.finalize();
  
  // Get drift alerts
  const driftStmt = db.prepare('SELECT * FROM drift_alerts WHERE global_company_id = ? ORDER BY detected_at DESC LIMIT 10');
  const drift_alerts = driftStmt.bind([globalCompanyId]).all<DriftAlert>();
  driftStmt.finalize();
  
  // Check if bookmarked (if userId provided)
  let is_bookmarked = false;
  let user_notes: WorkspaceNote[] = [];
  
  if (userId) {
    const bookmarkStmt = db.prepare('SELECT 1 FROM workspace_bookmarks WHERE user_id = ? AND global_company_id = ?');
    is_bookmarked = !!bookmarkStmt.bind([userId, globalCompanyId]).get();
    bookmarkStmt.finalize();
    
    // Get user notes
    const notesStmt = db.prepare('SELECT * FROM workspace_notes WHERE user_id = ? AND global_company_id = ? ORDER BY updated_at DESC');
    user_notes = notesStmt.bind([userId, globalCompanyId]).all<WorkspaceNote>();
    notesStmt.finalize();
  }
  
  return {
    ...company,
    aliases,
    evidence,
    drift_alerts,
    is_bookmarked,
    user_notes,
  };
}

// Drift alerts
export async function listDriftAlerts(options: {
  unseenOnly?: boolean;
  companyId?: string;
  limit?: number;
}): Promise<DriftAlert[]> {
  const db = getDatabase();
  const { unseenOnly, companyId, limit = 50 } = options;
  
  const whereClauses: string[] = [];
  const params: any[] = [];
  
  if (unseenOnly) {
    whereClauses.push('seen_at IS NULL');
  }
  
  if (companyId) {
    whereClauses.push('global_company_id = ?');
    params.push(companyId);
  }
  
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  const stmt = db.prepare(`
    SELECT * FROM drift_alerts
    ${whereClause}
    ORDER BY detected_at DESC
    LIMIT ?
  `);
  
  const alerts = stmt.bind([...params, limit]).all<DriftAlert>();
  stmt.finalize();
  
  return alerts;
}

export async function markDriftSeen(alertId: string): Promise<void> {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE drift_alerts SET seen_at = ? WHERE alert_id = ?');
  stmt.bind([toSQLiteDate(), alertId]).run();
  stmt.finalize();
}

// Workspace operations
export async function addBookmark(
  userId: string,
  globalCompanyId: string,
  tags?: string[]
): Promise<void> {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO workspace_bookmarks (user_id, global_company_id, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, global_company_id) DO UPDATE SET
      tags = excluded.tags,
      updated_at = excluded.updated_at
  `);
  
  const now = toSQLiteDate();
  stmt.bind([userId, globalCompanyId, JSON.stringify(tags || []), now, now]).run();
  stmt.finalize();
}

export async function removeBookmark(userId: string, globalCompanyId: string): Promise<void> {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM workspace_bookmarks WHERE user_id = ? AND global_company_id = ?');
  stmt.bind([userId, globalCompanyId]).run();
  stmt.finalize();
}

export async function getBookmarkedCompanies(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<Company[]> {
  const db = getDatabase();
  const { limit = 50, offset = 0 } = options || {};
  
  const stmt = db.prepare(`
    SELECT c.*
    FROM companies c
    INNER JOIN workspace_bookmarks b ON c.global_company_id = b.global_company_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `);
  
  const companies = stmt.bind([userId, limit, offset]).all<Company>();
  stmt.finalize();
  
  return companies;
}

export async function createComparison(
  userId: string,
  name: string,
  companyIds: string[]
): Promise<string> {
  const db = getDatabase();
  const comparisonId = crypto.randomUUID();
  const now = toSQLiteDate();
  
  const stmt = db.prepare(`
    INSERT INTO workspace_comparisons (comparison_id, user_id, name, company_ids, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.bind([comparisonId, userId, name, JSON.stringify(companyIds), now, now]).run();
  stmt.finalize();
  
  return comparisonId;
}

export async function addNote(
  userId: string,
  globalCompanyId: string,
  content: string
): Promise<string> {
  const db = getDatabase();
  const noteId = crypto.randomUUID();
  const now = toSQLiteDate();
  
  const stmt = db.prepare(`
    INSERT INTO workspace_notes (note_id, user_id, global_company_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.bind([noteId, userId, globalCompanyId, content, now, now]).run();
  stmt.finalize();
  
  return noteId;
}

export async function saveSearchHistory(
  userId: string,
  query: string,
  filters: SearchFilters | undefined,
  resultCount: number
): Promise<void> {
  const db = getDatabase();
  const searchId = crypto.randomUUID();
  
  const stmt = db.prepare(`
    INSERT INTO search_history (search_id, user_id, query, filters, result_count, executed_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.bind([
    searchId,
    userId,
    query,
    JSON.stringify(filters || {}),
    resultCount,
    toSQLiteDate(),
  ]).run();
  stmt.finalize();
}

export async function getSearchHistory(
  userId: string,
  limit: number = 10
): Promise<SearchHistory[]> {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM search_history
    WHERE user_id = ?
    ORDER BY executed_at DESC
    LIMIT ?
  `);
  
  const history = stmt.bind([userId, limit]).all<SearchHistory>();
  stmt.finalize();
  
  // Parse filters JSON
  return history.map(h => ({
    ...h,
    filters: h.filters ? JSON.parse(h.filters as string) : undefined,
  }));
}