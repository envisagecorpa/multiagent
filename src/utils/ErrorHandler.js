/**
 * Global Error Handler for Photo Album Application
 * Provides centralized error handling, logging, and user feedback
 */

export class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      enableLogging: true,
      enableNotifications: true,
      logToConsole: true,
      logToServer: false,
      serverEndpoint: '/api/errors',
      maxRetries: 3,
      notificationDuration: 5000,
      ...options
    };

    this.errorLog = [];
    this.retryCount = new Map();
    this.notificationSystem = null;
    
    this.init();
  }

  init() {
    // Set up global error handlers
    this.setupGlobalHandlers();
    
    // Initialize notification system reference
    this.setupNotificationSystem();
  }

  setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandledrejection',
        context: 'global',
        preventDefault: () => event.preventDefault()
      });
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        type: 'javascript',
        context: 'global',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle service worker errors
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('error', (event) => {
        this.handleError(event, {
          type: 'serviceworker',
          context: 'global'
        });
      });
    }
  }

  setupNotificationSystem() {
    // This will be set by the main app
    this.notificationSystem = null;
  }

  setNotificationSystem(notificationSystem) {
    this.notificationSystem = notificationSystem;
  }

  /**
   * Main error handling method
   */
  handleError(error, context = {}) {
    try {
      const errorInfo = this.normalizeError(error, context);
      
      // Log the error
      if (this.options.enableLogging) {
        this.logError(errorInfo);
      }
      
      // Show user notification if appropriate
      if (this.options.enableNotifications && this.shouldShowNotification(errorInfo)) {
        this.showErrorNotification(errorInfo);
      }
      
      // Send to server if configured
      if (this.options.logToServer) {
        this.sendErrorToServer(errorInfo);
      }
      
      // Handle specific error types
      this.handleSpecificError(errorInfo);
      
      return errorInfo;
      
    } catch (handlerError) {
      console.error('Error in error handler:', handlerError);
      // Fallback to basic error display
      this.showFallbackError(error);
    }
  }

  normalizeError(error, context = {}) {
    const timestamp = new Date().toISOString();
    const id = this.generateErrorId();
    
    let errorInfo = {
      id,
      timestamp,
      context: {
        type: 'unknown',
        component: 'unknown',
        action: 'unknown',
        ...context
      }
    };

    if (error instanceof Error) {
      errorInfo = {
        ...errorInfo,
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      };
    } else if (typeof error === 'string') {
      errorInfo = {
        ...errorInfo,
        name: 'StringError',
        message: error,
        stack: null
      };
    } else if (typeof error === 'object' && error !== null) {
      errorInfo = {
        ...errorInfo,
        name: error.name || 'ObjectError',
        message: error.message || JSON.stringify(error),
        stack: error.stack || null,
        ...error
      };
    } else {
      errorInfo = {
        ...errorInfo,
        name: 'UnknownError',
        message: String(error),
        stack: null
      };
    }

    // Add browser and user context
    errorInfo.browser = this.getBrowserInfo();
    errorInfo.url = window.location.href;
    errorInfo.userAgent = navigator.userAgent;

    return errorInfo;
  }

  logError(errorInfo) {
    // Add to internal log
    this.errorLog.push(errorInfo);
    
    // Keep log size manageable
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }

    // Console logging
    if (this.options.logToConsole) {
      console.group(`🚨 Error ${errorInfo.id}`);
      console.error('Message:', errorInfo.message);
      console.error('Type:', errorInfo.context.type);
      console.error('Component:', errorInfo.context.component);
      
      if (errorInfo.stack) {
        console.error('Stack:', errorInfo.stack);
      }
      
      console.error('Full Error Info:', errorInfo);
      console.groupEnd();
    }
  }

  shouldShowNotification(errorInfo) {
    // Don't show notifications for certain error types
    const silentErrors = [
      'AbortError',
      'NetworkError',
      'ChunkLoadError'
    ];

    if (silentErrors.includes(errorInfo.name)) {
      return false;
    }

    // Don't show too many notifications for the same error
    const errorKey = `${errorInfo.name}_${errorInfo.context.component}`;
    const recentErrors = this.errorLog.filter(
      err => err.timestamp > Date.now() - 60000 && // Last minute
             `${err.name}_${err.context.component}` === errorKey
    );

    return recentErrors.length <= 3;
  }

  showErrorNotification(errorInfo) {
    if (!this.notificationSystem) {
      console.warn('No notification system available');
      return;
    }

    const message = this.getUserFriendlyMessage(errorInfo);
    
    this.notificationSystem.error(message, {
      duration: this.options.notificationDuration,
      id: errorInfo.id,
      actions: this.getErrorActions(errorInfo)
    });
  }

  getUserFriendlyMessage(errorInfo) {
    // Map technical errors to user-friendly messages
    const messageMap = {
      'NetworkError': 'Network connection problem. Please check your internet connection.',
      'TypeError': 'A technical error occurred. Please try again.',
      'ReferenceError': 'A technical error occurred. Please refresh the page.',
      'ChunkLoadError': 'Failed to load application resources. Please refresh the page.',
      'QuotaExceededError': 'Storage quota exceeded. Please clear some data.',
      'NotAllowedError': 'Permission denied. Please check your browser settings.',
      'AbortError': 'Operation was cancelled.',
      'TimeoutError': 'Operation timed out. Please try again.',
      'ValidationError': 'Invalid data provided. Please check your input.',
      'AuthenticationError': 'Authentication failed. Please log in again.',
      'AuthorizationError': 'You don\'t have permission to perform this action.',
      'NotFoundError': 'The requested resource was not found.',
      'ConflictError': 'A conflict occurred. Please try again.',
      'ServiceUnavailableError': 'Service is temporarily unavailable. Please try again later.'
    };

    const friendlyMessage = messageMap[errorInfo.name];
    
    if (friendlyMessage) {
      return friendlyMessage;
    }

    // Fallback to original message if it's user-friendly
    if (errorInfo.message && errorInfo.message.length < 100 && 
        !errorInfo.message.includes('undefined') && 
        !errorInfo.message.includes('null')) {
      return errorInfo.message;
    }

    // Generic fallback
    return 'An unexpected error occurred. Please try again.';
  }

  getErrorActions(errorInfo) {
    const actions = [];

    // Retry action for recoverable errors
    if (this.isRecoverableError(errorInfo)) {
      actions.push({
        label: 'Retry',
        action: () => this.retryOperation(errorInfo)
      });
    }

    // Refresh action for certain errors
    if (this.shouldOfferRefresh(errorInfo)) {
      actions.push({
        label: 'Refresh Page',
        action: () => window.location.reload()
      });
    }

    // Report action for unexpected errors
    if (this.shouldOfferReport(errorInfo)) {
      actions.push({
        label: 'Report Issue',
        action: () => this.reportError(errorInfo)
      });
    }

    return actions;
  }

  async sendErrorToServer(errorInfo) {
    if (!this.options.serverEndpoint) return;

    try {
      await fetch(this.options.serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: errorInfo,
          timestamp: Date.now(),
          sessionId: this.getSessionId()
        })
      });
    } catch (serverError) {
      console.warn('Failed to send error to server:', serverError);
    }
  }

  handleSpecificError(errorInfo) {
    switch (errorInfo.name) {
      case 'QuotaExceededError':
        this.handleQuotaExceeded(errorInfo);
        break;
      
      case 'NetworkError':
        this.handleNetworkError(errorInfo);
        break;
      
      case 'ChunkLoadError':
        this.handleChunkLoadError(errorInfo);
        break;
      
      case 'AuthenticationError':
        this.handleAuthenticationError(errorInfo);
        break;
      
      case 'ValidationError':
        this.handleValidationError(errorInfo);
        break;
    }
  }

  handleQuotaExceeded(errorInfo) {
    // Clear some localStorage if possible
    try {
      const keysToRemove = ['photo-album-cache', 'temp-data'];
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  handleNetworkError(errorInfo) {
    // Check online status
    if (!navigator.onLine) {
      this.showOfflineMessage();
    }
  }

  handleChunkLoadError(errorInfo) {
    // Suggest page refresh for chunk loading errors
    if (this.notificationSystem) {
      this.notificationSystem.warning(
        'Failed to load application resources. Refreshing the page may help.',
        {
          actions: [{
            label: 'Refresh Now',
            action: () => window.location.reload()
          }]
        }
      );
    }
  }

  handleAuthenticationError(errorInfo) {
    // Redirect to login or show login modal
    if (window.photoAlbumApp && window.photoAlbumApp.handleSessionExpired) {
      window.photoAlbumApp.handleSessionExpired();
    }
  }

  handleValidationError(errorInfo) {
    // Focus on the problematic field if context provides it
    if (errorInfo.context.field) {
      const field = document.querySelector(`[name="${errorInfo.context.field}"]`);
      if (field) {
        field.focus();
        field.classList.add('error');
      }
    }
  }

  showOfflineMessage() {
    if (this.notificationSystem) {
      this.notificationSystem.warning(
        'You appear to be offline. Some features may not work properly.',
        { duration: 0 } // Persistent until online
      );
    }
  }

  showFallbackError(error) {
    // Last resort error display
    const message = error?.message || String(error) || 'An unexpected error occurred';
    alert(`Error: ${message}`);
  }

  // Utility methods
  isRecoverableError(errorInfo) {
    const recoverableErrors = [
      'NetworkError',
      'TimeoutError',
      'ServiceUnavailableError'
    ];
    return recoverableErrors.includes(errorInfo.name);
  }

  shouldOfferRefresh(errorInfo) {
    const refreshErrors = [
      'ChunkLoadError',
      'ReferenceError',
      'TypeError'
    ];
    return refreshErrors.includes(errorInfo.name);
  }

  shouldOfferReport(errorInfo) {
    // Only offer report for unexpected errors
    return !this.isRecoverableError(errorInfo) && 
           !this.shouldOfferRefresh(errorInfo) &&
           errorInfo.name !== 'ValidationError';
  }

  retryOperation(errorInfo) {
    const key = errorInfo.id;
    const currentRetries = this.retryCount.get(key) || 0;
    
    if (currentRetries >= this.options.maxRetries) {
      this.showErrorNotification({
        ...errorInfo,
        message: 'Maximum retry attempts reached. Please try again later.'
      });
      return;
    }

    this.retryCount.set(key, currentRetries + 1);
    
    // Emit retry event for the application to handle
    if (window.photoAlbumApp && window.photoAlbumApp.eventBus) {
      window.photoAlbumApp.eventBus.emit('errorRetry', {
        errorInfo,
        retryCount: currentRetries + 1
      });
    }
  }

  reportError(errorInfo) {
    // Open error report form or send to external service
    const reportData = {
      error: errorInfo,
      userFeedback: prompt('Optional: Describe what you were doing when this error occurred:'),
      timestamp: Date.now()
    };

    // Send to reporting service
    if (this.options.logToServer) {
      this.sendErrorReport(reportData);
    } else {
      // Open email client as fallback
      const subject = encodeURIComponent(`Error Report: ${errorInfo.name}`);
      const body = encodeURIComponent(JSON.stringify(reportData, null, 2));
      window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
    }
  }

  async sendErrorReport(reportData) {
    try {
      await fetch('/api/error-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      
      if (this.notificationSystem) {
        this.notificationSystem.success('Error report sent. Thank you!');
      }
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('errorHandlerSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('errorHandlerSessionId', sessionId);
    }
    return sessionId;
  }

  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      }
    };
  }

  // Public API methods
  getErrorLog() {
    return [...this.errorLog];
  }

  clearErrorLog() {
    this.errorLog = [];
    this.retryCount.clear();
  }

  getErrorStats() {
    const now = Date.now();
    const last24h = this.errorLog.filter(err => 
      new Date(err.timestamp).getTime() > now - 24 * 60 * 60 * 1000
    );

    const errorTypes = {};
    last24h.forEach(err => {
      errorTypes[err.name] = (errorTypes[err.name] || 0) + 1;
    });

    return {
      total: this.errorLog.length,
      last24h: last24h.length,
      errorTypes,
      mostCommon: Object.entries(errorTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    };
  }

  destroy() {
    // Clean up event listeners
    window.removeEventListener('unhandledrejection', this);
    window.removeEventListener('error', this);
    
    // Clear data
    this.errorLog = [];
    this.retryCount.clear();
    this.notificationSystem = null;
  }
}

// Create and export default instance
export const errorHandler = new ErrorHandler();

// Export class for custom instances
export default ErrorHandler;