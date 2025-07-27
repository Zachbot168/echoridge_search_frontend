-- Create the llm_queries table
CREATE TABLE llm_queries (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  prompt text NOT NULL,
  llm_response jsonb NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE llm_queries ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for prototyping (allow all operations)
CREATE POLICY "Allow all operations on llm_queries" ON llm_queries
  FOR ALL USING (true) WITH CHECK (true);