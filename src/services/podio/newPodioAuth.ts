import { supabase } from '@/integrations/supabase/client';

export interface PodioOAuthState {
  isAuthenticated: boolean;
  isConfigured: boolean;
  user?: {
    podio_user_id: number;
    name: string;
    email: string;
    username?: string;
    avatar_url?: string;
  };
  loading: boolean;
  error?: string;
}

export interface PodioTokenInfo {
  expires_at: string;
  scope?: string;
}

export class PodioAuthService {
  private static instance: PodioAuthService;
  private state: PodioOAuthState = {
    isAuthenticated: false,
    isConfigured: false,
    loading: false
  };
  private listeners: ((state: PodioOAuthState) => void)[] = [];

  private constructor() {
    this.checkConfiguration();
  }

  public static getInstance(): PodioAuthService {
    if (!PodioAuthService.instance) {
      PodioAuthService.instance = new PodioAuthService();
    }
    return PodioAuthService.instance;
  }

  public subscribe(listener: (state: PodioOAuthState) => void): () => void {
    this.listeners.push(listener);
    // Send current state immediately
    listener(this.state);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private updateState(updates: Partial<PodioOAuthState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  private async checkConfiguration(): Promise<void> {
    // Check if Podio OAuth is configured by trying to generate an auth URL
    try {
      const { data } = await supabase.functions.invoke('podio-oauth-url', {
        method: 'POST',
        body: {}
      });

      if (data && !data.error) {
        this.updateState({ isConfigured: true });
        await this.checkAuthentication();
      } else {
        this.updateState({ isConfigured: false, error: 'Podio OAuth not configured' });
      }
    } catch (error) {
      console.error('Error checking Podio configuration:', error);
      this.updateState({ isConfigured: false, error: 'Failed to check Podio configuration' });
    }
  }

  public async checkAuthentication(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      this.updateState({ isAuthenticated: false, user: undefined });
      return;
    }

    this.updateState({ loading: true });

    try {
      // Check if user has Podio tokens
      const { data: tokenData, error: tokenError } = await supabase
        .from('podio_oauth_tokens')
        .select('expires_at')
        .eq('user_id', user.id)
        .single();

      if (tokenError || !tokenData) {
        this.updateState({ 
          isAuthenticated: false, 
          user: undefined, 
          loading: false 
        });
        return;
      }

      // Check if token is still valid
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      
      if (expiresAt <= now) {
        this.updateState({ 
          isAuthenticated: false, 
          user: undefined, 
          loading: false,
          error: 'Podio token expired. Please reconnect.'
        });
        return;
      }

      // Get user's Podio data
      const { data: userData, error: userError } = await supabase
        .from('podio_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userError || !userData) {
        this.updateState({ 
          isAuthenticated: false, 
          user: undefined, 
          loading: false,
          error: 'Podio user data not found'
        });
        return;
      }

      this.updateState({
        isAuthenticated: true,
        user: {
          podio_user_id: userData.podio_user_id,
          name: userData.name,
          email: userData.email,
          username: userData.username,
          avatar_url: userData.avatar_url
        },
        loading: false,
        error: undefined
      });

    } catch (error) {
      console.error('Error checking Podio authentication:', error);
      this.updateState({ 
        isAuthenticated: false, 
        user: undefined, 
        loading: false,
        error: 'Failed to check authentication status'
      });
    }
  }

  public async initiateOAuth(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be logged in to connect Podio');
    }

    try {
      const { data, error } = await supabase.functions.invoke('podio-oauth-url', {
        method: 'POST',
        body: { userId: user.id }
      });

      if (error || data.error) {
        throw new Error(data?.error || 'Failed to generate OAuth URL');
      }

      return data.authUrl;
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Delete user's Podio tokens and data
      await Promise.all([
        supabase.from('podio_oauth_tokens').delete().eq('user_id', user.id),
        supabase.from('podio_users').delete().eq('user_id', user.id)
      ]);

      this.updateState({
        isAuthenticated: false,
        user: undefined,
        error: undefined
      });
    } catch (error) {
      console.error('Error disconnecting Podio:', error);
      throw new Error('Failed to disconnect Podio account');
    }
  }

  public getState(): PodioOAuthState {
    return this.state;
  }

  public async callPodioAPI(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    if (!this.state.isAuthenticated) {
      throw new Error('Not authenticated with Podio');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    try {
      const { data, error } = await supabase.functions.invoke('podio-api-proxy', {
        method: 'POST',
        body: {
          endpoint,
          method,
          body
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw new Error(error.message || 'API request failed');
      }

      if (data.status >= 400) {
        throw new Error(data.data?.error_description || data.data?.error || `API request failed with status ${data.status}`);
      }

      return data.data;
    } catch (error) {
      console.error('Podio API call failed:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const podioAuthService = PodioAuthService.getInstance();