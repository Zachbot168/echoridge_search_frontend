// SQLite database client for frontend pipeline management
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User, Location, PipelineRun, Business,
  BusinessSearchFilters, PipelineRunFilters,
  DashboardStats, CreateLocationInput, AuthUser
} from '../types/database';

class DatabaseClient {
  private db: Database.Database;
  private static instance: DatabaseClient;

  constructor() {
    // Create database directory if it doesn't exist
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize SQLite database
    const dbPath = path.join(dbDir, 'frontend.db');
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');

    this.initializeSchema();
  }

  static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  private initializeSchema(): void {
    // Read and execute schema
    const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
    const seedPath = path.join(process.cwd(), 'lib', 'db', 'seed.sql');

    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);
    }

    if (fs.existsSync(seedPath)) {
      const seed = fs.readFileSync(seedPath, 'utf-8');
      this.db.exec(seed);
    }
  }

  // User Management
  async authenticateUser(email: string, password: string): Promise<AuthUser | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as User | undefined;

    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role
    };
  }

  async createUser(email: string, password: string, role: string = 'admin'): Promise<string> {
    const hashedPassword = await bcrypt.hash(password, 12);
    const stmt = this.db.prepare(`
      INSERT INTO users (email, password_hash, role)
      VALUES (?, ?, ?)
      RETURNING id
    `);
    const result = stmt.get(email, hashedPassword, role) as { id: string };
    return result.id;
  }

  // Location Management
  getLocations(): Location[] {
    const stmt = this.db.prepare(`
      SELECT id, name, aliases, bbox_coordinates, center_lat, center_lon,
             is_active, created_at, updated_at
      FROM locations WHERE is_active = 1 ORDER BY name
    `);

    return stmt.all().map((row: any) => ({
      ...row,
      aliases: JSON.parse(row.aliases || '[]'),
      bbox_coordinates: JSON.parse(row.bbox_coordinates || '{}'),
      is_active: Boolean(row.is_active)
    }));
  }

  createLocation(input: CreateLocationInput): string {
    const stmt = this.db.prepare(`
      INSERT INTO locations (name, aliases, bbox_coordinates, center_lat, center_lon)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id
    `);

    const result = stmt.get(
      input.name,
      JSON.stringify(input.aliases),
      JSON.stringify(input.bbox_coordinates),
      input.center_lat,
      input.center_lon
    ) as { id: string };

    return result.id;
  }

  // Pipeline Run Management
  createPipelineRun(query: string, location_id?: string, execution_id?: string): string {
    const stmt = this.db.prepare(`
      INSERT INTO pipeline_runs (query, location_id, execution_id, status)
      VALUES (?, ?, ?, 'pending')
      RETURNING id
    `);

    const result = stmt.get(query, location_id, execution_id) as { id: string };
    return result.id;
  }

  updatePipelineRun(id: string, updates: Partial<PipelineRun>): void {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = this.db.prepare(`UPDATE pipeline_runs SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
  }

  getPipelineRuns(filters: PipelineRunFilters = {}): PipelineRun[] {
    let query = `
      SELECT pr.*, l.name as location_name
      FROM pipeline_runs pr
      LEFT JOIN locations l ON pr.location_id = l.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.status) {
      query += ' AND pr.status = ?';
      params.push(filters.status);
    }

    if (filters.location_id) {
      query += ' AND pr.location_id = ?';
      params.push(filters.location_id);
    }

    if (filters.query) {
      query += ' AND pr.query LIKE ?';
      params.push(`%${filters.query}%`);
    }

    if (filters.execution_id) {
      query += ' AND pr.execution_id = ?';
      params.push(filters.execution_id);
    }

    query += ' ORDER BY pr.started_at DESC LIMIT 100';

    const stmt = this.db.prepare(query);
    return stmt.all(params).map((row: any) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  // Business Management
  createBusiness(business: Omit<Business, 'id' | 'created_at'>): string {
    const stmt = this.db.prepare(`
      INSERT INTO businesses (
        entity_id, pipeline_run_id, name, category, website, phone,
        address, lat, lon, google_data, scores, web_snapshot,
        overall_score, overall_note, scored_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `);

    const result = stmt.get(
      business.entity_id,
      business.pipeline_run_id,
      business.name,
      business.category,
      business.website,
      business.phone,
      business.address ? JSON.stringify(business.address) : null,
      business.lat,
      business.lon,
      business.google_data ? JSON.stringify(business.google_data) : null,
      business.scores ? JSON.stringify(business.scores) : null,
      business.web_snapshot,
      business.overall_score,
      business.overall_note,
      business.scored_at
    ) as { id: string };

    return result.id;
  }

  getBusinesses(filters: BusinessSearchFilters = {}): Business[] {
    let query = `
      SELECT b.*, pr.query as pipeline_query, l.name as location_name
      FROM businesses b
      LEFT JOIN pipeline_runs pr ON b.pipeline_run_id = pr.id
      LEFT JOIN locations l ON pr.location_id = l.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.query) {
      // Split the query into individual words for more flexible matching
      const queryWords = filters.query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      if (queryWords.length > 0) {
        const searchConditions = queryWords.map(() =>
          '(b.name LIKE ? OR b.category LIKE ? OR b.google_data LIKE ?)'
        ).join(' OR ');
        query += ` AND (${searchConditions})`;

        queryWords.forEach(word => {
          const pattern = `%${word}%`;
          params.push(pattern, pattern, pattern);
        });
      }
    }

    if (filters.category) {
      query += ' AND b.category = ?';
      params.push(filters.category);
    }

    if (filters.min_score !== undefined) {
      query += ' AND b.overall_score >= ?';
      params.push(filters.min_score);
    }

    if (filters.max_score !== undefined) {
      query += ' AND b.overall_score <= ?';
      params.push(filters.max_score);
    }

    if (filters.has_website !== undefined) {
      query += filters.has_website ? ' AND b.website IS NOT NULL' : ' AND b.website IS NULL';
    }

    if (filters.pipeline_run_id) {
      query += ' AND b.pipeline_run_id = ?';
      params.push(filters.pipeline_run_id);
    }

    query += ' ORDER BY b.overall_score DESC, b.created_at DESC LIMIT 1000';

    const stmt = this.db.prepare(query);
    return stmt.all(params).map((row: any) => ({
      ...row,
      address: row.address ? JSON.parse(row.address) : undefined,
      google_data: row.google_data ? JSON.parse(row.google_data) : undefined,
      scores: row.scores ? JSON.parse(row.scores) : undefined
    }));
  }

  // Dashboard Statistics
  getDashboardStats(): DashboardStats {
    const totalRuns = this.db.prepare('SELECT COUNT(*) as count FROM pipeline_runs').get() as { count: number };
    const totalBusinesses = this.db.prepare('SELECT COUNT(*) as count FROM businesses').get() as { count: number };
    const totalLocations = this.db.prepare('SELECT COUNT(*) as count FROM locations WHERE is_active = 1').get() as { count: number };

    const recentRuns = this.db.prepare(`
      SELECT pr.*, l.name as location_name
      FROM pipeline_runs pr
      LEFT JOIN locations l ON pr.location_id = l.id
      ORDER BY pr.started_at DESC LIMIT 10
    `).all();

    const topCategories = this.db.prepare(`
      SELECT category, COUNT(*) as count
      FROM businesses
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC LIMIT 10
    `).all();

    const scoreDistribution = this.db.prepare(`
      SELECT
        CASE
          WHEN overall_score >= 0.8 THEN '0.8-1.0'
          WHEN overall_score >= 0.6 THEN '0.6-0.8'
          WHEN overall_score >= 0.4 THEN '0.4-0.6'
          WHEN overall_score >= 0.2 THEN '0.2-0.4'
          ELSE '0.0-0.2'
        END as score_range,
        COUNT(*) as count
      FROM businesses
      WHERE overall_score IS NOT NULL
      GROUP BY score_range
      ORDER BY score_range DESC
    `).all();

    return {
      total_pipeline_runs: totalRuns.count,
      total_businesses: totalBusinesses.count,
      total_locations: totalLocations.count,
      recent_runs: recentRuns.map((row: any) => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      })),
      top_categories: topCategories as Array<{ category: string; count: number }>,
      score_distribution: scoreDistribution as Array<{ score_range: string; count: number }>
    };
  }

  // Bulk operations for importing pipeline results
  bulkCreateBusinesses(businesses: Array<Omit<Business, 'id' | 'created_at'>>): void {
    const stmt = this.db.prepare(`
      INSERT INTO businesses (
        entity_id, pipeline_run_id, name, category, website, phone,
        address, lat, lon, google_data, scores, web_snapshot,
        overall_score, overall_note, scored_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((businesses: Array<Omit<Business, 'id' | 'created_at'>>) => {
      for (const business of businesses) {
        stmt.run(
          business.entity_id,
          business.pipeline_run_id,
          business.name,
          business.category,
          business.website,
          business.phone,
          business.address ? JSON.stringify(business.address) : null,
          business.lat,
          business.lon,
          business.google_data ? JSON.stringify(business.google_data) : null,
          business.scores ? JSON.stringify(business.scores) : null,
          business.web_snapshot,
          business.overall_score,
          business.overall_note,
          business.scored_at
        );
      }
    });

    transaction(businesses);
  }

  close(): void {
    this.db.close();
  }
}

export default DatabaseClient;