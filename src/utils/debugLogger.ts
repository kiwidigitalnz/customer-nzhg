// Debug logging utility for Podio connection issues
export class DebugLogger {
  private static logs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    component: string;
    message: string;
    data?: any;
  }> = [];

  static log(level: 'info' | 'warn' | 'error', component: string, message: string, data?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
    
    // Also log to console
    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logMethod(`[${component}] ${message}`, data || '');
  }

  static info(component: string, message: string, data?: any) {
    this.log('info', component, message, data);
  }

  static warn(component: string, message: string, data?: any) {
    this.log('warn', component, message, data);
  }

  static error(component: string, message: string, data?: any) {
    this.log('error', component, message, data);
  }

  static getLogs() {
    return [...this.logs];
  }

  static clearLogs() {
    this.logs = [];
  }

  static getTokenStatus() {
    const tokenExpiry = localStorage.getItem('podio_token_expiry');
    const userData = localStorage.getItem('podio_user_data');
    
    return {
      hasTokenExpiry: !!tokenExpiry,
      hasUserData: !!userData,
      tokenExpiryRaw: tokenExpiry,
      tokenExpiryParsed: tokenExpiry ? new Date(parseInt(tokenExpiry, 10)).toISOString() : null,
      tokenExpiryValid: tokenExpiry ? !isNaN(new Date(parseInt(tokenExpiry, 10)).getTime()) : false,
      isExpired: tokenExpiry ? parseInt(tokenExpiry, 10) <= Date.now() : true,
      timeUntilExpiry: tokenExpiry ? Math.max(0, parseInt(tokenExpiry, 10) - Date.now()) : 0,
      userData: userData ? JSON.parse(userData) : null
    };
  }
}
