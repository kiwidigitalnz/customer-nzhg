
// Service for handling Podio API credentials and environment

// Get client ID from environment
export const getPodioClientId = (): string | null => {
  // Always prioritize environment variables
  if (import.meta.env.VITE_PODIO_CLIENT_ID) {
    return import.meta.env.VITE_PODIO_CLIENT_ID;
  }
  return localStorage.getItem('podio_client_id');
};

// Get client secret from environment
export const getPodioClientSecret = (): string | null => {
  // Always prioritize environment variables
  if (import.meta.env.VITE_PODIO_CLIENT_SECRET) {
    return import.meta.env.VITE_PODIO_CLIENT_SECRET;
  }
  return localStorage.getItem('podio_client_secret');
};

// Get the redirect URI based on the current environment
export const getPodioRedirectUri = (): string => {
  // In development, use localhost
  if (import.meta.env.DEV) {
    const port = window.location.port;
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}${port ? ':' + port : ''}/podio-callback`;
  }
  
  // In production, use the production URL
  return 'https://customer.nzhg.com/podio-callback';
};

// Generate a random state for CSRF protection
export const generatePodioAuthState = (): string => {
  const state = Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
  localStorage.setItem('podio_auth_state', state);
  return state;
};
