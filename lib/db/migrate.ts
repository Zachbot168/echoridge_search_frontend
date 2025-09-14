import { getDatabase, initDatabase } from './engine';
import { readFileSync } from 'fs';
import path from 'path';

interface Migration {
  version: number;
  name: string;
  sql: string;
}

// Track migration history
const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
`;

// Get current schema version
async function getCurrentVersion(): Promise<number> {
  const db = getDatabase();
  
  try {
    const result = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get<{ version: number | null }>();
    return result?.version || 0;
  } catch (error) {
    // Table doesn't exist yet
    return 0;
  }
}

// Load schema SQL
function loadSchema(): string {
  // In browser environment, we'll need to bundle this differently
  if (typeof window !== 'undefined') {
    // For browser, import schema as string during build
    return require('./schema.sql').default;
  }
  
  // For Node.js environment (build time)
  return readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
}

// Apply a migration
async function applyMigration(migration: Migration): Promise<void> {
  const db = getDatabase();
  
  db.transaction(() => {
    // Execute migration SQL
    db.exec(migration.sql);
    
    // Record migration
    db.prepare(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
    ).run([migration.version, migration.name, new Date().toISOString()]);
  });
  
  console.log(`Applied migration ${migration.version}: ${migration.name}`);
}

// Define migrations
const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: loadSchema(),
  },
  // Future migrations will be added here
  // {
  //   version: 2,
  //   name: 'add_company_tags',
  //   sql: `
  //     ALTER TABLE companies ADD COLUMN tags TEXT;
  //     CREATE INDEX idx_companies_tags ON companies(tags);
  //   `,
  // },
];

// Run all pending migrations
export async function runMigrations(): Promise<void> {
  // Ensure database is initialized
  await initDatabase();
  
  const db = getDatabase();
  
  // Create migrations table
  db.exec(MIGRATIONS_TABLE);
  
  // Get current version
  const currentVersion = await getCurrentVersion();
  
  // Filter pending migrations
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);
  
  if (pendingMigrations.length === 0) {
    console.log('Database schema is up to date');
    return;
  }
  
  console.log(`Found ${pendingMigrations.length} pending migrations`);
  
  // Apply migrations in order
  for (const migration of pendingMigrations) {
    await applyMigration(migration);
  }
  
  console.log('All migrations completed successfully');
}

// Check if migrations are needed
export async function needsMigration(): Promise<boolean> {
  try {
    await initDatabase();
    const currentVersion = await getCurrentVersion();
    const latestVersion = Math.max(...migrations.map(m => m.version));
    return currentVersion < latestVersion;
  } catch (error) {
    // Database not initialized or error checking version
    return true;
  }
}

// Get migration status
export async function getMigrationStatus(): Promise<{
  current: number;
  latest: number;
  pending: number;
  appliedMigrations: Array<{
    version: number;
    name: string;
    applied_at: string;
  }>;
}> {
  await initDatabase();
  const db = getDatabase();
  
  // Ensure migrations table exists
  db.exec(MIGRATIONS_TABLE);
  
  const current = await getCurrentVersion();
  const latest = Math.max(...migrations.map(m => m.version), 0);
  
  const appliedMigrations = db.prepare(
    'SELECT version, name, applied_at FROM schema_migrations ORDER BY version'
  ).all<{ version: number; name: string; applied_at: string }>();
  
  return {
    current,
    latest,
    pending: latest - current,
    appliedMigrations,
  };
}

// Reset database (development only)
export async function resetDatabase(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot reset database in production');
  }
  
  const db = getDatabase();
  
  // Get all tables
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).all<{ name: string }>();
  
  // Drop all tables
  db.transaction(() => {
    for (const table of tables) {
      db.exec(`DROP TABLE IF EXISTS ${table.name}`);
    }
  });
  
  console.log('Database reset complete');
  
  // Run migrations to recreate schema
  await runMigrations();
}

// Export schema for bundling
export const SCHEMA_SQL = loadSchema();