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

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Save a search query and its response to the database
 * TODO: When REST API is ready, swap saveQuery to fetch('/api/queries', …) and keep types unchanged.
 */
export async function saveQuery(
  prompt: string,
  response: unknown,
  meta?: Record<string, unknown>
): Promise<number> {
  const { data, error } = await supabase
    .from('llm_queries')
    .insert({
      prompt,
      llm_response: response,
      metadata: meta || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save query:', error);
    throw new Error(`Failed to save query: ${error.message}`);
  }

  return data.id;
}