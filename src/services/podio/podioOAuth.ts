
// Service for handling Podio API credentials and environment
// Now just provides dummy implementations with no actual OAuth

// Get client ID from environment (stubbed)
export const getPodioClientId = (): string => "dummy-client-id";

// Get client secret from environment (stubbed)
export const getPodioClientSecret = (): string => "dummy-client-secret";

// Get the redirect URI based on the current environment (stubbed)
export const getPodioRedirectUri = (): string => "https://localhost/podio-callback";

// Generate a random state for CSRF protection (stubbed)
export const generatePodioAuthState = (): string => "dummy-state";
