
// Service for handling Podio API credentials and environment variables

// Now configured to use Edge Functions exclusively
export const getPodioClientId = (): string => {
  // This is now intentionally empty as client-side doesn't need these values
  // All authentication happens through Edge Functions
  return '';
};

export const getPodioClientSecret = (): string => {
  // This is now intentionally empty as client-side doesn't need these values
  // All authentication happens through Edge Functions
  return '';
};

// Get the redirect URI based on the current environment
export const getPodioRedirectUri = (): string => {
  // Use the current origin for the redirect URI to handle different environments
  return `${window.location.origin}`;
};

// Generate a random state for CSRF protection
export const generatePodioAuthState = (): string => {
  const randomString = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
  localStorage.setItem('podio_oauth_state', randomString);
  return randomString;
};

// Validate the state returned from Podio to prevent CSRF attacks
export const validatePodioAuthState = (returnedState: string): boolean => {
  const storedState = localStorage.getItem('podio_oauth_state');
  localStorage.removeItem('podio_oauth_state');
  
  if (!storedState || !returnedState) {
    return false;
  }
  
  return storedState === returnedState;
};
