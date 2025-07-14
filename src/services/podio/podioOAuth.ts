
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
  // Store the state in localStorage for validation when the user returns
  localStorage.setItem('podio_auth_state', randomString);
  return randomString;
};

// Get Podio auth URL for redirecting the user
export const getPodioAuthUrl = (): string => {
  // We'll use the edge function to get the auth URL
  return `${window.location.origin}/api/podio-auth-url`;
};

// Validate the state returned from Podio to prevent CSRF attacks
export const validatePodioAuthState = (returnedState: string): boolean => {
  const storedState = localStorage.getItem('podio_oauth_state');
  // Clean up the stored state regardless of validation result
  localStorage.removeItem('podio_oauth_state');
  
  // Validate that the state matches to prevent CSRF attacks
  if (!storedState || !returnedState) {
    console.error('State validation failed:', { storedState: !!storedState, returnedState: !!returnedState });
    return false;
  }
  
  const isValid = storedState === returnedState;
  console.log('State validation result:', { isValid, storedState, returnedState });
  return isValid;
};
