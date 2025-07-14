-- Enable RLS on podio_auth_tokens table
ALTER TABLE public.podio_auth_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only service role access
CREATE POLICY "Service role only access" ON public.podio_auth_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny all access to authenticated and anon roles
CREATE POLICY "Deny authenticated access" ON public.podio_auth_tokens
  FOR ALL
  TO authenticated
  USING (false);

CREATE POLICY "Deny anon access" ON public.podio_auth_tokens
  FOR ALL
  TO anon
  USING (false);

-- Check for duplicate tables (this will show any other token-related tables)
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE '%podio%' OR tablename LIKE '%token%' OR tablename LIKE '%auth%')
ORDER BY tablename;
