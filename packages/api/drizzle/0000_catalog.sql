CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO projects (id, external_key, name, description, is_demo)
VALUES ('00000000-0000-4000-8000-000000000001', 'flow-dev-demo', 'Flow Dev', 'Monorepo Next.js + tRPC', true)
ON CONFLICT (external_key) DO NOTHING;
