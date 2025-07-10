-- Create table for storing Podio OAuth tokens
CREATE TABLE public.podio_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'bearer',
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing Podio user data
CREATE TABLE public.podio_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  podio_user_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing OAuth states (for security)
CREATE TABLE public.podio_oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  user_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.podio_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podio_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podio_oauth_states ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for podio_oauth_tokens
CREATE POLICY "Users can view their own tokens" 
ON public.podio_oauth_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tokens" 
ON public.podio_oauth_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" 
ON public.podio_oauth_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens" 
ON public.podio_oauth_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for podio_users
CREATE POLICY "Users can view their own podio data" 
ON public.podio_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own podio data" 
ON public.podio_users 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own podio data" 
ON public.podio_users 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for podio_oauth_states (more permissive for OAuth flow)
CREATE POLICY "Anyone can create OAuth states" 
ON public.podio_oauth_states 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view non-expired OAuth states" 
ON public.podio_oauth_states 
FOR SELECT 
USING (expires_at > now());

CREATE POLICY "Anyone can delete expired OAuth states" 
ON public.podio_oauth_states 
FOR DELETE 
USING (expires_at <= now());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_podio_oauth_tokens_updated_at
  BEFORE UPDATE ON public.podio_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_podio_users_updated_at
  BEFORE UPDATE ON public.podio_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to clean up expired OAuth states
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM public.podio_oauth_states WHERE expires_at <= now();
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX idx_podio_oauth_tokens_user_id ON public.podio_oauth_tokens(user_id);
CREATE INDEX idx_podio_oauth_tokens_expires_at ON public.podio_oauth_tokens(expires_at);
CREATE INDEX idx_podio_users_user_id ON public.podio_users(user_id);
CREATE INDEX idx_podio_users_podio_user_id ON public.podio_users(podio_user_id);
CREATE INDEX idx_podio_oauth_states_state ON public.podio_oauth_states(state);
CREATE INDEX idx_podio_oauth_states_expires_at ON public.podio_oauth_states(expires_at);