import { createClient } from '@supabase/supabase-js';

// Database types
export interface LLMQuery {
  id: number;
  prompt: string;
  llm_response: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      llm_queries: {
        Row: LLMQuery;
        Insert: Omit<LLMQuery, 'id' | 'created_at'>;
        Update: Partial<Omit<LLMQuery, 'id' | 'created_at'>>;
      };
    };
  };
}

// Initialize Supabase client (optional for catalog mode)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder'))
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Save a search query and its response to the database
 * TODO: When REST API is ready, swap saveQuery to fetch('/api/queries', …) and keep types unchanged.
 */
export async function saveQuery(
  prompt: string,
  response: unknown,
  meta?: Record<string, unknown>
): Promise<number> {
  // TODO: Implement with catalog API when query logging is needed
  console.log('Query saved (stubbed):', { prompt: prompt.substring(0, 50) + '...', meta });
  return Math.floor(Math.random() * 1000);
}