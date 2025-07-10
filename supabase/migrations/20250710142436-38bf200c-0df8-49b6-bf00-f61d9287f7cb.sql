-- Phase 1: Database Schema Changes for App-Level Podio OAuth

-- Make user_id nullable in podio_oauth_tokens for app-level tokens
ALTER TABLE public.podio_oauth_tokens 
ALTER COLUMN user_id DROP NOT NULL;

-- Add app_level column to distinguish between user and app tokens
ALTER TABLE public.podio_oauth_tokens 
ADD COLUMN app_level BOOLEAN NOT NULL DEFAULT false;

-- Update RLS policies for podio_oauth_tokens to handle app-level tokens
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.podio_oauth_tokens;
DROP POLICY IF EXISTS "Users can create their own tokens" ON public.podio_oauth_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON public.podio_oauth_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON public.podio_oauth_tokens;

-- Create new RLS policies that handle both user and app-level tokens
CREATE POLICY "Users can view their own tokens or app-level tokens" 
ON public.podio_oauth_tokens 
FOR SELECT 
USING (
  (app_level = true) OR 
  (app_level = false AND auth.uid() = user_id)
);

CREATE POLICY "Users can create their own tokens or app-level tokens" 
ON public.podio_oauth_tokens 
FOR INSERT 
WITH CHECK (
  (app_level = true AND user_id IS NULL) OR 
  (app_level = false AND auth.uid() = user_id)
);

CREATE POLICY "Users can update their own tokens or app-level tokens" 
ON public.podio_oauth_tokens 
FOR UPDATE 
USING (
  (app_level = true) OR 
  (app_level = false AND auth.uid() = user_id)
);

CREATE POLICY "Users can delete their own tokens or app-level tokens" 
ON public.podio_oauth_tokens 
FOR DELETE 
USING (
  (app_level = true) OR 
  (app_level = false AND auth.uid() = user_id)
);

-- Create index for app_level queries
CREATE INDEX idx_podio_oauth_tokens_app_level ON public.podio_oauth_tokens(app_level);