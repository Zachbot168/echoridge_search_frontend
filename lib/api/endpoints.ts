import { getAPIClient } from './client';
import type {
  Company,
  CompaniesResponse,
  Evidence,
  EvidenceResponse,
  DriftAlert,
  DriftResponse,
  ScoringRun,
  ServiceStats,
  SearchFilters,
} from '@/types/db';

// API endpoint definitions
const ENDPOINTS = {
  companies: '/v1/catalog/companies',
  company: (id: string) => `/v1/catalog/companies/${id}`,
  evidence: '/v1/catalog/evidence',
  scores: '/v1/catalog/scores',
  runs: '/v1/catalog/runs',
  drift: '/v1/catalog/drift',
  stats: '/v1/catalog/stats',
} as const;

// Company endpoints
export const companiesAPI = {
  // List companies with filtering and pagination
  async list(params?: {
    updated_since?: string;
    page?: number;
    cursor?: string;
    region?: string[];
    industry?: string[];
    score_min?: number;
    score_max?: number;
    limit?: number;
    etag?: string;
  }): Promise<CompaniesResponse & { etag?: string }> {
    const client = getAPIClient();
    const queryString = params ? client.buildQueryString(params) : '';
    const response = await client.get<CompaniesResponse>(
      `${ENDPOINTS.companies}${queryString}`,
      { etag: params?.etag }
    );
    
    return {
      ...response.data,
      etag: response.etag,
    };
  },
  
  // Get single company by ID
  async get(id: string, etag?: string): Promise<Company | null> {
    const client = getAPIClient();
    try {
      const response = await client.get<Company>(ENDPOINTS.company(id), { etag });
      return response.data;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  
  // Search companies
  async search(params: {
    q: string;
    filters?: SearchFilters;
    limit?: number;
    offset?: number;
    etag?: string;
  }): Promise<CompaniesResponse & { etag?: string }> {
    const client = getAPIClient();
    const { q, filters, ...otherParams } = params;
    
    const queryParams = {
      q,
      ...filters,
      ...otherParams,
    };
    
    const queryString = client.buildQueryString(queryParams);
    const response = await client.get<CompaniesResponse>(
      `${ENDPOINTS.companies}/search${queryString}`,
      { etag: params.etag }
    );
    
    return {
      ...response.data,
      etag: response.etag,
    };
  },
};

// Evidence endpoints
export const evidenceAPI = {
  // List evidence for a company
  async list(params: {
    company_id: string;
    type?: string;
    limit?: number;
    cursor?: string;
    etag?: string;
  }): Promise<EvidenceResponse & { etag?: string; cursor?: string }> {
    const client = getAPIClient();
    const queryString = client.buildQueryString(params);
    const response = await client.get<EvidenceResponse>(
      `${ENDPOINTS.evidence}${queryString}`,
      { etag: params.etag }
    );
    
    return {
      ...response.data,
      etag: response.etag,
      cursor: response.cursor,
    };
  },
  
  // Get all evidence for a company (paginated)
  async *getAllForCompany(companyId: string): AsyncGenerator<Evidence[], void, unknown> {
    const client = getAPIClient();
    const endpoint = `${ENDPOINTS.evidence}?company_id=${companyId}`;
    
    yield* client.paginate<Evidence>(endpoint);
  },
};

// Scoring endpoints
export const scoringAPI = {
  // Get scores for a company (might be included in company data)
  async getScores(companyId: string, etag?: string): Promise<{
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
  } | null> {
    const client = getAPIClient();
    const queryString = client.buildQueryString({ company_id: companyId });
    
    try {
      const response = await client.get<any>(
        `${ENDPOINTS.scores}${queryString}`,
        { etag }
      );
      return response.data;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  
  // List scoring runs
  async listRuns(params?: {
    limit?: number;
    cursor?: string;
    status?: 'running' | 'completed' | 'failed';
    etag?: string;
  }): Promise<{ runs: ScoringRun[]; cursor?: string; etag?: string }> {
    const client = getAPIClient();
    const queryString = params ? client.buildQueryString(params) : '';
    const response = await client.get<{ runs: ScoringRun[] }>(
      `${ENDPOINTS.runs}${queryString}`,
      { etag: params?.etag }
    );
    
    return {
      ...response.data,
      cursor: response.cursor,
      etag: response.etag,
    };
  },
};

// Drift endpoints
export const driftAPI = {
  // Get drift alerts
  async getAlerts(params?: {
    company_id?: string;
    metric?: string;
    since?: string;
    limit?: number;
    etag?: string;
  }): Promise<DriftResponse & { etag?: string }> {
    const client = getAPIClient();
    const queryString = params ? client.buildQueryString(params) : '';
    const response = await client.get<DriftResponse>(
      `${ENDPOINTS.drift}${queryString}`,
      { etag: params?.etag }
    );
    
    return {
      ...response.data,
      etag: response.etag,
    };
  },
};

// Service stats endpoints
export const statsAPI = {
  // Get service statistics
  async get(etag?: string): Promise<{ stats: ServiceStats[]; etag?: string }> {
    const client = getAPIClient();
    const response = await client.get<{ stats: ServiceStats[] }>(
      ENDPOINTS.stats,
      { etag }
    );
    
    return {
      stats: response.data.stats,
      etag: response.etag,
    };
  },
};

// Batch operations helper
export const batchAPI = {
  // Fetch multiple companies by IDs
  async getCompanies(ids: string[]): Promise<Company[]> {
    // If API supports batch endpoint
    const client = getAPIClient();
    const response = await client.post<{ companies: Company[] }>(
      `${ENDPOINTS.companies}/batch`,
      { ids }
    );
    
    return response.data.companies;
  },
  
  // Alternative: fetch in parallel
  async getCompaniesParallel(ids: string[]): Promise<(Company | null)[]> {
    const promises = ids.map(id => companiesAPI.get(id));
    return Promise.all(promises);
  },
};

// Health check
export async function checkAPIHealth(): Promise<{
  healthy: boolean;
  version?: string;
  timestamp?: string;
}> {
  const client = getAPIClient();
  
  try {
    const response = await client.get<{
      status: string;
      version?: string;
      timestamp?: string;
    }>('/health', { retries: 1 });
    
    return {
      healthy: response.data.status === 'ok',
      version: response.data.version,
      timestamp: response.data.timestamp,
    };
  } catch (error) {
    return { healthy: false };
  }
}