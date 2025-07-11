
-- Create the table for storing Podio OAuth tokens
CREATE TABLE IF NOT EXISTS public.podio_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comment to describe the table's purpose
COMMENT ON TABLE public.podio_auth_tokens IS 'Stores Podio OAuth tokens for application authentication';
