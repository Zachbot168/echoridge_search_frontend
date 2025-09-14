# EchoRidge Search - Universal Catalog Database Documentation

## Overview

This is a **frontend-only, universal catalog** implementation for EchoRidge Search. The application:
- Reads from a shared global company dataset via API
- Caches data locally using SQLite WASM for performance
- Never writes to server databases
- Maintains user overlays (bookmarks, notes) separately from global data

## Architecture

### Universal Catalog Principle

All users query the same global company dataset with:
- Canonical IDs from PMF Finder
- Deterministic scoring from Echo Ridge
- Evidence trails and provenance
- No per-tenant data forks

### Data Model Split

**Global Tables (Read-Only)**
- `companies` - Core company data with scoring
- `company_aliases` - Alternative names with FTS
- `evidence` - Lightweight evidence pointers
- `facet_buckets` - Pre-computed filter counts
- `scoring_runs` - Scoring run metadata
- `drift_alerts` - Score change notifications
- `service_stats` - System statistics

**User Overlay Tables (Local/Syncable)**
- `workspace_bookmarks` - User saved companies
- `workspace_comparisons` - Side-by-side analysis
- `workspace_notes` - Personal annotations
- `search_history` - Recent queries

## Environment Configuration

```bash
# Required environment variables
NEXT_PUBLIC_API_BASE_URL=https://api.echoridge.example
NEXT_PUBLIC_TENANT_MODE=universal        # Always 'universal' for shared catalog
NEXT_PUBLIC_AUDIENCE_SCOPE=public        # or 'partner', 'enterprise'
NEXT_PUBLIC_DB_DRIVER=sqlite-wasm        # Preferred, fallback to 'indexeddb'
```

## Database Implementation

### SQLite WASM Engine

The database uses SQLite WASM for client-side storage with:
- Full SQL support with FTS5 for text search
- ACID transactions
- Efficient indexing
- ~50k company capacity with <150ms search

### Schema Design

Key design decisions:
- `global_company_id` as primary key (never generated locally)
- All scoring fields preserved for determinism
- `norm_context_version` and `checksum` required
- User data references global IDs only

### Migration System

Idempotent migrations tracked in `schema_migrations` table:
- Version-based sequential execution
- Rollback support in development
- Schema bundled for browser deployment

## API Integration

### Endpoints

Universal catalog endpoints:
- `GET /v1/catalog/companies` - List with filtering
- `GET /v1/catalog/companies/{id}` - Single company
- `GET /v1/catalog/evidence` - Evidence by company
- `GET /v1/catalog/scores` - Scoring data
- `GET /v1/catalog/runs` - Scoring runs
- `GET /v1/catalog/drift` - Drift alerts
- `GET /v1/catalog/stats` - Service statistics

### ETag Support

All list endpoints support ETags for efficient caching:
- `If-None-Match` header sent with stored ETag
- 304 responses skip data transfer
- ETags persisted in `sync_state` table

### Cursor Pagination

Large datasets paginated with opaque cursors:
- `next_cursor` in response headers or body
- Stateless pagination through full dataset
- Supports interrupted sync resumption

## Sync Strategy

### Three-Phase Sync

1. **Hydrate Global Tables**
   - Fetch companies with ETag/cursor support
   - Preserve all determinism fields
   - Handle soft deletes via `tombstone_at`

2. **Materialize Facets**
   - Compute from local data
   - Pre-bucket for instant filtering
   - Update on each sync

3. **Load User Overlays**
   - Check local storage first
   - Optional Supabase sync
   - Never mix with global data

### Failure Handling

- Keep last good snapshot on API failure
- Show "stale data" indicator in UI
- Overlays remain fully functional offline
- Retry with exponential backoff

## Query API

### Search Interface

```typescript
searchCompanies({
  q: "search term",
  filters: {
    region: ["North America"],
    industry: ["Technology"],
    score_min: 0.7
  },
  sort: "score",
  limit: 20
})
```

### Company Details

```typescript
getCompanyDetail(globalCompanyId, userId?)
// Returns company with aliases, evidence, drift alerts
// Includes user-specific data if userId provided
```

### Workspace Operations

```typescript
addBookmark(userId, globalCompanyId, tags?)
removeBookmark(userId, globalCompanyId)
getBookmarkedCompanies(userId)
createComparison(userId, name, companyIds)
addNote(userId, globalCompanyId, content)
```

## Performance Targets

- **Warm search**: ≤150ms (from cache)
- **Cold search**: ≤350ms (with DB init)
- **Facet toggle**: Instant (pre-computed)
- **50k+ companies**: Smooth performance

## Security & Privacy

- No server writes from frontend
- User data isolated by `user_id`
- Optional `org_id` for multi-org support
- Global data immutable locally

## Development

### Setup

```bash
npm install
npm run dev
```

### Testing Database

```typescript
import { initDatabase, runMigrations } from '@/lib/db/migrate';
import { syncUniversalCatalog } from '@/lib/db/sync';

// Initialize
await initDatabase();
await runMigrations();

// Sync data
await syncUniversalCatalog({ forceFullSync: true });
```

### Reset Database (Dev Only)

```typescript
import { resetDatabase } from '@/lib/db/migrate';
await resetDatabase(); // Drops all tables and re-runs migrations
```

## Upstream System Alignment

### PMF Finder Compatibility
- Preserves company uniqueness rules (domain OR name+postal+country)
- Maintains stable IDs from source
- Keeps evidence provenance

### Echo Ridge Scoring
- All D/O/I/M/B subscores preserved
- `norm_context_version` for model versioning
- `checksum` for reproducibility
- Confidence scores maintained

## Future Considerations

- **Multi-tenant deltas**: Sync layer ready for overlay streams
- **Offline-first**: Full offline support with stale indicators
- **User sync**: Prepared for Supabase auth integration
- **Performance**: Indexed for sub-second queries at scale

## Critical Rules

1. **Never generate local IDs** for catalog entities
2. **Never write to server** databases
3. **Preserve all determinism fields** from scoring
4. **Keep user data in overlays** only
5. **Respect PMF Finder uniqueness** rules

---

## Legacy Supabase Setup (For Reference)

The following was the original Supabase setup before migrating to SQLite WASM:

### Prerequisites
- Supabase CLI installed (`npm install -g supabase`)
- Docker Desktop running (for local development)

### Local Development Setup

1. **Initialize local Supabase**
   ```bash
   npm run supa:init
   ```
   This starts a local Postgres instance via Docker.

2. **Environment Configuration**
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase project URL and anon key:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
     ```

3. **Apply Migrations**
   ```bash
   supabase db reset
   ```

### Production Setup

1. **Create Supabase Project**
   - Visit [Supabase Dashboard](https://supabase.com/dashboard)
   - Create a new project
   - Copy the project URL and anon key

2. **Configure Environment**
   - Update `.env.local` with production values
   - For deployment, set environment variables in your hosting platform

3. **Run Migrations in CI**
   ```bash
   supabase db push
   ```

### Useful Commands

- `npm run supa:status` - Check local database status
- `npm run supa:stop` - Stop local database
- `supabase db diff` - Generate new migrations
- `supabase db reset` - Reset and apply all migrations

### Original Database Schema

The `llm_queries` table stored all search interactions:
- `id` - Auto-incrementing primary key
- `prompt` - User search query
- `llm_response` - Mock API response (JSON)
- `metadata` - Additional context (model version, scores, etc.)
- `created_at` - Timestamp of query