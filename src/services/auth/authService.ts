
import { refreshPodioToken, isPodioConfigured, ensureInitialPodioAuth } from '../podioApi';
import { toast } from '@/hooks/use-toast';

// Session duration in milliseconds (4 hours by default)
const SESSION_DURATION = 4 * 60 * 60 * 1000;

// Error types for better error handling
export enum AuthErrorType {
  NETWORK = 'network',
  CONFIGURATION = 'configuration',
  AUTHENTICATION = 'authentication',
  TOKEN = 'token',
  SESSION = 'session',
  UNKNOWN = 'unknown'
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  recoverable: boolean;
  retry?: () => Promise<any>;
}

// Check if the token will expire soon (within 5 minutes)
export const willTokenExpireSoon = (): boolean => {
  const tokenExpiry = localStorage.getItem('podio_token_expiry');
  if (!tokenExpiry) return true;
  
  const expiryTime = parseInt(tokenExpiry, 10);
  const nowPlus5Min = Date.now() + 5 * 60 * 1000; // 5 minute buffer
  
  return expiryTime < nowPlus5Min;
};

// Enhanced token refresh with retry logic
let refreshInProgress = false;
let refreshPromise: Promise<boolean> | null = null;

export const ensureValidToken = async (): Promise<boolean> => {
  // If a refresh is already in progress, wait for it to complete
  if (refreshInProgress && refreshPromise) {
    return refreshPromise;
  }
  
  // If token will expire soon, refresh it
  if (willTokenExpireSoon()) {
    refreshInProgress = true;
    refreshPromise = refreshPodioToken()
      .catch(error => {
        console.error('Failed to refresh token:', error);
        return false;
      })
      .finally(() => {
        refreshInProgress = false;
        refreshPromise = null;
      });
    
    return refreshPromise;
  }
  
  return true;
};

// Check session validity
export const isSessionValid = (): boolean => {
  const sessionExpiry = localStorage.getItem('nzhg_session_expiry');
  if (!sessionExpiry) return false;
  
  return parseInt(sessionExpiry, 10) > Date.now();
};

// Extend session
export const extendSession = (): void => {
  const expiry = Date.now() + SESSION_DURATION;
  localStorage.setItem('nzhg_session_expiry', expiry.toString());
  
  // Also broadcast to other tabs
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'nzhg_session_expiry',
    newValue: expiry.toString()
  }));
};

// Helper to create a standardized auth error
export const createAuthError = (
  type: AuthErrorType, 
  message: string,
  recoverable: boolean = false,
  retry?: () => Promise<any>
): AuthError => ({
  type,
  message,
  recoverable,
  retry
});

// Handle auth errors with standardized handling
export const handleAuthError = (error: AuthError): void => {
  console.error(`Auth error (${error.type}):`, error.message);
  
  // Log error for debugging
  if (import.meta.env.DEV) {
    console.error('Authentication error details:', error);
  }
  
  // Different handling based on error type
  switch (error.type) {
    case AuthErrorType.NETWORK:
      toast({
        title: 'Connection Error',
        description: 'Please check your internet connection and try again.',
        variant: 'destructive',
      });
      break;
      
    case AuthErrorType.CONFIGURATION:
      if (import.meta.env.DEV) {
        toast({
          title: 'Configuration Error',
          description: 'Podio is not configured correctly. Please check your settings.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Service Temporarily Unavailable',
          description: 'Please try again later or contact support.',
          variant: 'destructive',
        });
      }
      break;
      
    case AuthErrorType.AUTHENTICATION:
      toast({
        title: 'Authentication Failed',
        description: 'Invalid credentials. Please try again.',
        variant: 'destructive',
      });
      break;
      
    case AuthErrorType.TOKEN:
      if (error.recoverable && error.retry) {
        toast({
          title: 'Session Expired',
          description: 'Reconnecting to service...',
        });
        // Attempt to refresh the token
        error.retry();
      } else {
        toast({
          title: 'Session Expired',
          description: 'Please log in again.',
          variant: 'destructive',
        });
      }
      break;
      
    case AuthErrorType.SESSION:
      toast({
        title: 'Session Expired',
        description: 'Please log in again to continue.',
        variant: 'destructive',
      });
      break;
      
    default:
      toast({
        title: 'An Error Occurred',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
  }
};

// Initialize auth monitoring (call this on app start)
export const initAuthMonitoring = (): void => {
  // In production, ensure we're authenticated with Podio
  if (import.meta.env.PROD) {
    ensureInitialPodioAuth().catch(error => {
      console.error('Error during initial Podio authentication:', error);
    });
  }
  
  // Set initial session expiry if not set
  if (!localStorage.getItem('nzhg_session_expiry') && localStorage.getItem('nzhg_user')) {
    extendSession();
  }
  
  // Check token validity every minute
  const interval = setInterval(async () => {
    if (isPodioConfigured() && willTokenExpireSoon()) {
      await ensureValidToken();
    }
  }, 60 * 1000);
  
  // Handle session expiry across tabs
  window.addEventListener('storage', (event) => {
    if (event.key === 'nzhg_session_expiry') {
      // Another tab extended the session
      // No need to do anything as the localStorage is already updated
    } else if (event.key === 'nzhg_user' && event.newValue === null) {
      // User logged out in another tab
      window.location.reload();
    }
  });
  
  // Activity tracking for session extension
  const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
  let lastActivity = Date.now();
  
  activityEvents.forEach(eventType => {
    window.addEventListener(eventType, () => {
      // Only extend session if more than 5 minutes since last activity
      if (Date.now() - lastActivity > 5 * 60 * 1000) {
        lastActivity = Date.now();
        if (localStorage.getItem('nzhg_user')) {
          extendSession();
        }
      }
    }, { passive: true });
  });
  
  // The cleanup function that would run if this were a React hook
  const cleanup = () => {
    clearInterval(interval);
    activityEvents.forEach(eventType => {
      window.removeEventListener(eventType, () => {});
    });
    window.removeEventListener('storage', () => {});
  };
  
  // For environments where a cleanup function is expected (like testing)
  // We can expose the cleanup function as a property
  (initAuthMonitoring as any).cleanup = cleanup;
};
