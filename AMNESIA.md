# AMNESIA.md - EchoRidge Search Frontend Context Recovery

## 🎯 Core Product Philosophy

This is a **frontend-only, universal catalog search application** for EchoRidge Search. Key principles:

1. **Universal Catalog**: All users query the same global company dataset - no per-tenant data forks
2. **Frontend-Only**: This repo NEVER writes to server databases - only reads from API and caches locally
3. **User Overlays**: Personal data (bookmarks, notes) stored locally or synced to user stores, never mixed with global data

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        API (Read-Only)                        │
│  /v1/catalog/companies  /v1/catalog/evidence  /v1/catalog/scores  │
└──────────────────────────┬──────────────────────────────────┘
                           │ ETags, Cursors
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (This Repo)                       │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   SQLite WASM   │  │  API Client  │  │   Next.js    │   │
│  │  Local Cache    │  │  (ETag/Retry)│  │   UI Layer   │   │
│  └─────────────────┘  └──────────────┘  └──────────────┘   │
│         ▲                                                     │
│         │                                                     │
│  ┌──────┴────────┐                    ┌─────────────────┐   │
│  │ Global Tables │                    │ Overlay Tables  │   │
│  │  (Read-Only)  │                    │   (User Data)   │   │
│  └───────────────┘                    └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Critical Concepts

### 1. Universal Catalog vs User Overlays

**Universal (Shared by Everyone)**:
- `companies` - Global company records with canonical IDs
- `aliases` - Alternative names with FTS
- `evidence` - Proof/citations (pointers to docs)
- `facet_buckets` - Pre-computed filter counts
- `runs` - Scoring run metadata
- `drift_alerts` - Score change notifications
- All scoring fields (D/O/I/M/B subscores, final scores)
- Determinism metadata (checksums, norm_context_version)

**User Overlays (Per-User/Org)**:
- `workspace_bookmarks` - Saved companies
- `workspace_comparisons` - Side-by-side analysis
- `workspace_notes` - Personal annotations
- `search_history` - Recent queries

### 2. ID Strategy
- **NEVER generate local IDs** for catalog data
- Use `global_company_id` from API as primary key
- Overlays reference global IDs, never duplicate data
- Preserve PMF Finder uniqueness rules (domain OR name+postal+country)

### 3. Scoring Determinism
Every score MUST preserve:
- `norm_context_version` - Which scoring model version
- `checksum` - Reproducibility hash
- `confidence_score` - Statistical confidence
- Full D/O/I/M/B breakdown
- These enable explainability and audit trails

## 🌐 Environment Configuration

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://api.echoridge.example

# Multi-tenant Mode
NEXT_PUBLIC_TENANT_MODE=universal        # Always 'universal' for shared catalog
NEXT_PUBLIC_AUDIENCE_SCOPE=public        # or 'partner', 'enterprise'

# Database Driver
NEXT_PUBLIC_DB_DRIVER=sqlite-wasm        # Preferred, fallback to 'indexeddb'
```

## 📊 Database Schema

### Global Tables (Read-Only from API)
```sql
-- Companies with global IDs and scoring
CREATE TABLE companies (
    global_company_id TEXT PRIMARY KEY,  -- From API, never generated
    dataset_version TEXT,                -- e.g., "Catalog v2025.09"
    name TEXT NOT NULL,
    domain TEXT,
    -- PMF Finder fields
    postal_code TEXT,
    country_code TEXT,
    -- Echo Ridge scoring
    final_score REAL,
    d_score REAL,
    o_score REAL,
    i_score REAL,
    m_score REAL,
    b_score REAL,
    confidence_score REAL,
    norm_context_version TEXT,           -- Critical for determinism
    checksum TEXT,                       -- Critical for reproducibility
    -- Metadata
    updated_at TEXT,
    synced_at TEXT
);

-- Evidence pointers (not full documents)
CREATE TABLE evidence (
    evidence_id TEXT PRIMARY KEY,
    global_company_id TEXT,
    type TEXT,
    title TEXT,
    preview TEXT,                        -- Lightweight preview only
    source_url TEXT,
    created_at TEXT
);
```

### User Overlay Tables (Local/Syncable)
```sql
-- User bookmarks reference global IDs
CREATE TABLE workspace_bookmarks (
    user_id TEXT NOT NULL,
    org_id TEXT,                         -- Optional for multi-org
    global_company_id TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT,
    UNIQUE(user_id, global_company_id)
);
```

## 🔄 Sync Strategy

### Phase 1: Hydrate Global Catalog
1. Check ETags for each resource type
2. Fetch changed companies with cursor pagination
3. Preserve ALL scoring metadata and determinism fields
4. Update `sync_state` table with last ETags

### Phase 2: Materialize Facets
1. Compute facet buckets from local data
2. Store in `facet_buckets` for instant filtering

### Phase 3: Load User Overlays
1. Check local storage first
2. Optionally sync with Supabase user store
3. Never mix with global data

### Failure Handling
- If API unreachable: Use last good cache, show "stale" badge
- Overlays remain fully functional offline
- Never lose determinism metadata

## 🚀 Performance Targets

- **Warm search**: ≤150ms (from cache)
- **Cold search**: ≤350ms (with DB init)
- **Facet toggle**: Instant (pre-bucketed)
- **50k+ companies**: Must handle smoothly

## ⚠️ Critical Rules

1. **NO SERVER WRITES** - This frontend never mutates catalog data
2. **PRESERVE DETERMINISM** - Never drop checksums or norm_context_version
3. **RESPECT UNIQUENESS** - Follow PMF Finder rules (domain OR name+postal+country)
4. **NO DATA FORKING** - User edits go in overlays only, never duplicate global rows
5. **GLOBAL IDS ONLY** - Never generate local IDs for catalog entities

## 📁 Key Files to Implement

```
lib/
├── db/
│   ├── engine.ts        # SQLite WASM initialization ✅
│   ├── schema.sql       # Complete DDL ✅
│   ├── migrate.ts       # Idempotent migrations ✅
│   ├── sync.ts          # API sync orchestration ✅
│   ├── query.ts         # Query API for UI ✅
│   └── parse.ts         # Zod validation schemas ✅
├── api/
│   ├── client.ts        # HTTP client with ETag/retry ✅
│   └── endpoints.ts     # Typed API definitions ✅
└── types/
    └── db.ts            # TypeScript interfaces ✅
```

All core infrastructure has been implemented.

## 🔮 Future Considerations

- **Multi-tenant deltas**: If backend adds per-tenant enrichments, sync layer must support overlay streams
- **Offline-first**: Current architecture supports full offline with stale data warnings
- **User sync**: Overlay tables ready for Supabase auth integration

## 🎭 State Management

The app maintains three levels of state:
1. **Global Catalog State** - Immutable, from API
2. **User Overlay State** - Mutable, local-first
3. **UI State** - Ephemeral (selections, modals, etc.)

Never let these mix - maintain clear boundaries.

## 🔍 Query Patterns

```typescript
// Always query global tables for catalog data
searchCompanies({ q, filters, sort }) // → queries companies + facet_buckets

// Overlay queries always join to global
getBookmarkedCompanies(userId) // → JOIN workspace_bookmarks to companies

// Never duplicate data
addBookmark(userId, globalCompanyId) // → INSERT to overlay only
```

## 📝 Testing Considerations

1. Mock API responses must include all determinism fields
2. Test overlay isolation (user data doesn't leak)
3. Verify ETag caching behavior
4. Test offline scenarios with stale data
5. Ensure global IDs are never generated locally

---

Remember: This is a **read-only window** into a **universal catalog**. User personalizations live in **overlays** that reference (never duplicate) the global truth.