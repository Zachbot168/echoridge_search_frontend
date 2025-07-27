# Database Setup Instructions

## Prerequisites
- Supabase CLI installed (`npm install -g supabase`)
- Docker Desktop running (for local development)

## Local Development Setup

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

## Production Setup

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

## Useful Commands

- `npm run supa:status` - Check local database status
- `npm run supa:stop` - Stop local database
- `supabase db diff` - Generate new migrations
- `supabase db reset` - Reset and apply all migrations

## Database Schema

The `llm_queries` table stores all search interactions:
- `id` - Auto-incrementing primary key
- `prompt` - User search query
- `llm_response` - Mock API response (JSON)
- `metadata` - Additional context (model version, scores, etc.)
- `created_at` - Timestamp of query