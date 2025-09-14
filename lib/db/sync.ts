import { getDatabase, toSQLiteDate } from './engine';
import { companiesAPI, evidenceAPI, scoringAPI, driftAPI, statsAPI } from '@/lib/api/endpoints';
import type { Company, Evidence, DriftAlert, ScoringRun, ServiceStats, SyncState } from '@/types/db';

// Sync status management
async function getSyncState(resourceType: string): Promise<SyncState | null> {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM sync_state WHERE resource_type = ?');
  return stmt.bind([resourceType]).get<SyncState>();
}

async function updateSyncState(
  resourceType: string,
  updates: Partial<SyncState>
): Promise<void> {
  const db = getDatabase();
  const now = toSQLiteDate();
  
  const stmt = db.prepare(`
    INSERT INTO sync_state (resource_type, last_sync_at, last_etag, last_cursor, sync_status, error_message, records_synced)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(resource_type) DO UPDATE SET
      last_sync_at = excluded.last_sync_at,
      last_etag = excluded.last_etag,
      last_cursor = excluded.last_cursor,
      sync_status = excluded.sync_status,
      error_message = excluded.error_message,
      records_synced = excluded.records_synced
  `);
  
  stmt.bind([
    resourceType,
    updates.last_sync_at || now,
    updates.last_etag || null,
    updates.last_cursor || null,
    updates.sync_status || 'pending',
    updates.error_message || null,
    updates.records_synced || 0,
  ]).run();
}

// Phase 1: Sync companies
async function syncCompanies(options?: { forceFullSync?: boolean }): Promise<{
  synced: number;
  errors: number;
}> {
  const db = getDatabase();
  const syncState = await getSyncState('companies');
  
  // Update status to syncing
  await updateSyncState('companies', { sync_status: 'syncing', error_message: null });
  
  let synced = 0;
  let errors = 0;
  let cursor: string | undefined;
  let etag = options?.forceFullSync ? undefined : syncState?.last_etag;
  
  try {
    do {
      // Fetch companies
      const response = await companiesAPI.list({
        cursor,
        etag,
        updated_since: options?.forceFullSync ? undefined : syncState?.last_sync_at,
        limit: 100,
      });
      
      // Process companies in transaction
      db.transaction(() => {
        const insertStmt = db.prepare(`
          INSERT INTO companies (
            global_company_id, dataset_version, name, domain, postal_code, country_code,
            city, state, region, industry, sector, employee_count, revenue_estimate,
            final_score, d_score, o_score, i_score, m_score, b_score,
            confidence_score, norm_context_version, checksum,
            risk_score, feasibility_score,
            created_at, updated_at, synced_at, is_active, tombstone_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?
          )
          ON CONFLICT(global_company_id) DO UPDATE SET
            dataset_version = excluded.dataset_version,
            name = excluded.name,
            domain = excluded.domain,
            postal_code = excluded.postal_code,
            country_code = excluded.country_code,
            city = excluded.city,
            state = excluded.state,
            region = excluded.region,
            industry = excluded.industry,
            sector = excluded.sector,
            employee_count = excluded.employee_count,
            revenue_estimate = excluded.revenue_estimate,
            final_score = excluded.final_score,
            d_score = excluded.d_score,
            o_score = excluded.o_score,
            i_score = excluded.i_score,
            m_score = excluded.m_score,
            b_score = excluded.b_score,
            confidence_score = excluded.confidence_score,
            norm_context_version = excluded.norm_context_version,
            checksum = excluded.checksum,
            risk_score = excluded.risk_score,
            feasibility_score = excluded.feasibility_score,
            updated_at = excluded.updated_at,
            synced_at = excluded.synced_at,
            is_active = excluded.is_active,
            tombstone_at = excluded.tombstone_at
        `);
        
        for (const company of response.companies) {
          try {
            insertStmt.bind([
              company.global_company_id,
              company.dataset_version,
              company.name,
              company.domain,
              company.postal_code,
              company.country_code,
              company.city,
              company.state,
              company.region,
              company.industry,
              company.sector,
              company.employee_count,
              company.revenue_estimate,
              company.final_score,
              company.d_score,
              company.o_score,
              company.i_score,
              company.m_score,
              company.b_score,
              company.confidence_score,
              company.norm_context_version,
              company.checksum,
              company.risk_score,
              company.feasibility_score,
              company.created_at,
              company.updated_at,
              toSQLiteDate(),
              company.is_active !== false ? 1 : 0,
              company.tombstone_at,
            ]).run();
            synced++;
          } catch (error) {
            console.error('Error syncing company:', company.global_company_id, error);
            errors++;
          }
        }
        
        insertStmt.finalize();
      });
      
      // Update cursor and etag
      cursor = response.next_cursor;
      if (response.etag) {
        etag = response.etag;
      }
      
    } while (cursor);
    
    // Update sync state
    await updateSyncState('companies', {
      sync_status: 'success',
      last_etag: etag,
      last_cursor: undefined,
      records_synced: synced,
    });
    
  } catch (error) {
    console.error('Company sync error:', error);
    await updateSyncState('companies', {
      sync_status: 'error',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
  
  return { synced, errors };
}

// Phase 2: Materialize facet buckets
async function materializeFacets(): Promise<void> {
  const db = getDatabase();
  
  db.transaction(() => {
    // Clear existing facets
    db.exec('DELETE FROM facet_buckets');
    
    // Get current dataset version
    const versionResult = db.prepare('SELECT MAX(dataset_version) as version FROM companies').get<{ version: string }>();
    const datasetVersion = versionResult?.version || 'unknown';
    
    // Region facets
    db.exec(`
      INSERT INTO facet_buckets (facet_type, bucket_value, count, dataset_version, updated_at)
      SELECT 'region', region, COUNT(*), ?, ?
      FROM companies
      WHERE region IS NOT NULL AND is_active = 1
      GROUP BY region
    `);
    
    // Industry facets
    db.exec(`
      INSERT INTO facet_buckets (facet_type, bucket_value, count, dataset_version, updated_at)
      SELECT 'industry', industry, COUNT(*), ?, ?
      FROM companies
      WHERE industry IS NOT NULL AND is_active = 1
      GROUP BY industry
    `);
    
    // Score range facets
    const scoreRanges = [
      { min: 0, max: 0.2, label: '0-20' },
      { min: 0.2, max: 0.4, label: '20-40' },
      { min: 0.4, max: 0.6, label: '40-60' },
      { min: 0.6, max: 0.8, label: '60-80' },
      { min: 0.8, max: 1.0, label: '80-100' },
    ];
    
    const facetStmt = db.prepare(`
      INSERT INTO facet_buckets (facet_type, bucket_value, count, dataset_version, updated_at)
      VALUES ('score_range', ?, ?, ?, ?)
    `);
    
    for (const range of scoreRanges) {
      const count = db.prepare(
        'SELECT COUNT(*) as count FROM companies WHERE final_score >= ? AND final_score < ? AND is_active = 1'
      ).bind([range.min, range.max]).get<{ count: number }>()?.count || 0;
      
      facetStmt.bind([range.label, count, datasetVersion, toSQLiteDate()]).run();
    }
    
    facetStmt.finalize();
  });
}

// Sync evidence for specific companies
async function syncEvidence(companyIds: string[]): Promise<number> {
  const db = getDatabase();
  let synced = 0;
  
  for (const companyId of companyIds) {
    try {
      const evidenceGen = evidenceAPI.getAllForCompany(companyId);
      
      for await (const evidenceBatch of evidenceGen) {
        db.transaction(() => {
          const stmt = db.prepare(`
            INSERT INTO evidence (
              evidence_id, global_company_id, type, title, preview,
              source_url, source_name, relevance_score, created_at, extracted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(evidence_id) DO UPDATE SET
              type = excluded.type,
              title = excluded.title,
              preview = excluded.preview,
              source_url = excluded.source_url,
              source_name = excluded.source_name,
              relevance_score = excluded.relevance_score,
              extracted_at = excluded.extracted_at
          `);
          
          for (const evidence of evidenceBatch) {
            stmt.bind([
              evidence.evidence_id,
              evidence.global_company_id,
              evidence.type,
              evidence.title,
              evidence.preview,
              evidence.source_url,
              evidence.source_name,
              evidence.relevance_score,
              evidence.created_at,
              evidence.extracted_at,
            ]).run();
            synced++;
          }
          
          stmt.finalize();
        });
      }
    } catch (error) {
      console.error(`Error syncing evidence for company ${companyId}:`, error);
    }
  }
  
  return synced;
}

// Sync drift alerts
async function syncDriftAlerts(): Promise<number> {
  const db = getDatabase();
  const syncState = await getSyncState('drift');
  
  try {
    const response = await driftAPI.getAlerts({
      since: syncState?.last_sync_at,
      etag: syncState?.last_etag,
    });
    
    let synced = 0;
    
    db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO drift_alerts (
          alert_id, global_company_id, metric, old_value, new_value,
          drift_percentage, detected_at, run_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(alert_id) DO UPDATE SET
          drift_percentage = excluded.drift_percentage
      `);
      
      for (const alert of response.alerts) {
        stmt.bind([
          alert.alert_id,
          alert.global_company_id,
          alert.metric,
          alert.old_value,
          alert.new_value,
          alert.drift_percentage,
          alert.detected_at,
          alert.run_id,
        ]).run();
        synced++;
      }
      
      stmt.finalize();
    });
    
    await updateSyncState('drift', {
      sync_status: 'success',
      last_etag: response.etag,
      records_synced: synced,
    });
    
    return synced;
  } catch (error) {
    await updateSyncState('drift', {
      sync_status: 'error',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// Main sync orchestration
export async function syncUniversalCatalog(options?: {
  forceFullSync?: boolean;
  syncEvidence?: boolean;
}): Promise<{
  companies: { synced: number; errors: number };
  evidence?: number;
  drift?: number;
  duration: number;
}> {
  const startTime = Date.now();
  
  // Phase 1: Sync companies
  console.log('Syncing companies...');
  const companiesResult = await syncCompanies(options);
  
  // Phase 2: Materialize facets
  console.log('Materializing facets...');
  await materializeFacets();
  
  // Phase 3: Sync evidence (optional)
  let evidenceSynced: number | undefined;
  if (options?.syncEvidence) {
    console.log('Syncing evidence...');
    // Get recently updated companies
    const db = getDatabase();
    const recentCompanies = db.prepare(
      'SELECT global_company_id FROM companies WHERE synced_at > datetime("now", "-1 hour") LIMIT 100'
    ).all<{ global_company_id: string }>();
    
    evidenceSynced = await syncEvidence(recentCompanies.map(c => c.global_company_id));
  }
  
  // Sync drift alerts
  console.log('Syncing drift alerts...');
  const driftSynced = await syncDriftAlerts();
  
  const duration = Date.now() - startTime;
  
  console.log(`Sync completed in ${duration}ms`);
  
  return {
    companies: companiesResult,
    evidence: evidenceSynced,
    drift: driftSynced,
    duration,
  };
}

// Check if sync is needed
export async function needsSync(): Promise<boolean> {
  const companiesState = await getSyncState('companies');
  
  if (!companiesState || companiesState.sync_status === 'error') {
    return true;
  }
  
  // Sync if last sync was more than 1 hour ago
  const lastSync = companiesState.last_sync_at ? new Date(companiesState.last_sync_at) : null;
  if (!lastSync || Date.now() - lastSync.getTime() > 60 * 60 * 1000) {
    return true;
  }
  
  return false;
}

// Get sync status for UI
export async function getSyncStatus(): Promise<{
  companies: SyncState | null;
  evidence: SyncState | null;
  drift: SyncState | null;
  isStale: boolean;
}> {
  const companies = await getSyncState('companies');
  const evidence = await getSyncState('evidence');
  const drift = await getSyncState('drift');
  
  const isStale = await needsSync();
  
  return {
    companies,
    evidence,
    drift,
    isStale,
  };
}