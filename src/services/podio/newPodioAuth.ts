import { supabase } from '@/integrations/supabase/client';

export interface PodioTokenInfo {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: string;
  scope?: string;
}

export interface PodioOAuthState {
  isAuthenticated: boolean;
  isConfigured: boolean;
  user?: {
    name: string;
    email: string;
    podio_user_id: number;
    avatar_url?: string;
  };
  isLoading: boolean;
  error?: string;
}

class PodioAuthService {
  private static instance: PodioAuthService;
  private state: PodioOAuthState = {
    isAuthenticated: false,
    isConfigured: false,
    isLoading: false,
  };
  private listeners: ((state: PodioOAuthState) => void)[] = [];

  static getInstance(): PodioAuthService {
    if (!PodioAuthService.instance) {
      PodioAuthService.instance = new PodioAuthService();
    }
    return PodioAuthService.instance;
  }

  constructor() {
    // Initialize by checking configuration and authentication
    this.initialize();
  }

  private async initialize() {
    await this.checkConfiguration();
    if (this.state.isConfigured) {
      await this.checkAuthentication();
    }
  }

  subscribe(listener: (state: PodioOAuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private updateState(updates: Partial<PodioOAuthState>) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  async checkConfiguration(): Promise<void> {
    try {
      this.updateState({ isLoading: true, error: undefined });
      
      const { data, error } = await supabase.functions.invoke('podio-oauth-url', {
        method: 'GET',
      });

      if (error) {
        console.error('Configuration check failed:', error);
        this.updateState({ 
          isConfigured: false, 
          isLoading: false,
          error: 'Podio OAuth not configured'
        });
        return;
      }

      this.updateState({ 
        isConfigured: true, 
        isLoading: false,
        error: undefined
      });
    } catch (error) {
      console.error('Configuration check error:', error);
      this.updateState({ 
        isConfigured: false, 
        isLoading: false,
        error: 'Failed to check configuration'
      });
    }
  }

  async checkAuthentication(): Promise<void> {
    try {
      this.updateState({ isLoading: true, error: undefined });

      // Check for app-level tokens (no user authentication required)
      const { data: appTokens, error: tokenError } = await supabase
        .from('podio_oauth_tokens')
        .select('*')
        .eq('app_level', true)
        .maybeSingle();

      if (tokenError && tokenError.code !== 'PGRST116') {
        console.error('App token check failed:', tokenError);
        this.updateState({ 
          isAuthenticated: false, 
          isLoading: false,
          error: 'Failed to check app authentication'
        });
        return;
      }

      if (appTokens) {
        this.updateState({
          isAuthenticated: true,
          isLoading: false,
          user: {
            name: 'App Authentication',
            email: 'app@system',
            podio_user_id: 0,
            avatar_url: undefined,
          },
          error: undefined
        });
      } else {
        this.updateState({
          isAuthenticated: false,
          isLoading: false,
          user: undefined,
          error: undefined
        });
      }
    } catch (error) {
      console.error('Authentication check error:', error);
      this.updateState({ 
        isAuthenticated: false, 
        isLoading: false,
        error: 'Failed to check authentication'
      });
    }
  }

  async initiateOAuth(): Promise<string> {
    try {
      this.updateState({ isLoading: true, error: undefined });

      // For app-level OAuth, we don't need user ID
      const { data, error } = await supabase.functions.invoke('podio-oauth-url', {
        method: 'POST',
        body: { appLevel: true },
      });

      if (error) {
        console.error('OAuth initiation failed:', error);
        this.updateState({ 
          isLoading: false,
          error: 'Failed to initiate OAuth flow'
        });
        throw new Error('Failed to initiate OAuth flow');
      }

      this.updateState({ isLoading: false });
      return data.authUrl;
    } catch (error) {
      console.error('OAuth initiation error:', error);
      this.updateState({ 
        isLoading: false,
        error: 'Failed to initiate OAuth flow'
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.updateState({ isLoading: true, error: undefined });

      // Delete app-level tokens
      const { error: tokenError } = await supabase
        .from('podio_oauth_tokens')
        .delete()
        .eq('app_level', true);

      if (tokenError) {
        console.error('Failed to delete app tokens:', tokenError);
      }

      this.updateState({
        isAuthenticated: false,
        isLoading: false,
        user: undefined,
        error: undefined
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      this.updateState({ 
        isLoading: false,
        error: 'Failed to disconnect'
      });
      throw error;
    }
  }

  getState(): PodioOAuthState {
    return { ...this.state };
  }

  async callPodioAPI(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('podio-api-proxy', {
        method: 'POST',
        body: {
          endpoint,
          method,
          body,
        },
      });

      if (error) {
        console.error('Podio API call failed:', error);
        throw new Error('Podio API call failed');
      }

      return data;
    } catch (error) {
      console.error('Podio API call error:', error);
      throw error;
    }
  }
}

export const podioAuthService = PodioAuthService.getInstance();