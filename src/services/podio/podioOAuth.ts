
// Service for handling Podio API credentials and environment variables

// These functions now return empty strings since we're using Edge Functions
// and the client doesn't need these values directly anymore
export const getPodioClientId = (): string => {
  return '';
};

export const getPodioClientSecret = (): string => {
  return '';
};

// Get the redirect URI based on the current environment
export const getPodioRedirectUri = (): string => {
  // Use the current origin for the redirect URI to handle different environments
  return `${window.location.origin}/podio-callback`;
};

// Generate a random state for CSRF protection
export const generatePodioAuthState = (): string => {
  const randomString = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
  // Store the state in localStorage for validation when the user returns
  localStorage.setItem('podio_auth_state', randomString);
  return randomString;
};

// Get Podio auth URL for redirecting the user
export const getPodioAuthUrl = (): string => {
  const clientId = getPodioClientId();
  const redirectUri = getPodioRedirectUri();
  const state = generatePodioAuthState();
  
  // Build the authentication URL with necessary parameters
  // Using 'code' response type for authorization code flow
  return `https://podio.com/oauth/authorize?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&scope=global` +
    `&response_type=code`;
};

// Validate the state returned from Podio to prevent CSRF attacks
export const validatePodioAuthState = (returnedState: string): boolean => {
  const storedState = localStorage.getItem('podio_auth_state');
  // Clean up the stored state regardless of validation result
  localStorage.removeItem('podio_auth_state');
  
  // Validate that the state matches to prevent CSRF attacks
  return storedState === returnedState;
};
