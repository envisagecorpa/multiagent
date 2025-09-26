import App from './App.js';

// Import all CSS styles
import './styles/app.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/photos.css';
import './styles/modal.css';
import './styles/navigation.css';
import './styles/settings.css';
import './styles/search.css';

/**
 * Application Entry Point
 * Initialize and start the Photo Album application
 */

let app = null;

// DOM Content Loaded handler
function initializeApp() {
  console.log('Initializing Photo Album Application...');
  
  try {
    // Get or create app container
    let appContainer = document.getElementById('app');
    if (!appContainer) {
      appContainer = document.createElement('div');
      appContainer.id = 'app';
      document.body.appendChild(appContainer);
    }

    // Initialize the main App component
    app = new App(appContainer);
    
    // Make app globally available for debugging
    if (typeof window !== 'undefined') {
      window.photoAlbumApp = app;
    }

    console.log('Photo Album Application initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    showInitializationError(error);
  }
}

// Show initialization error
function showInitializationError(error) {
  const appContainer = document.getElementById('app') || document.body;
  
  appContainer.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      text-align: center;
    ">
      <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">⚠️</div>
      <h1 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">
        Application Failed to Load
      </h1>
      <p style="color: #64748b; margin-bottom: 1.5rem; max-width: 500px; line-height: 1.6;">
        We encountered an error while starting the Photo Album application. 
        Please refresh the page or check the console for more details.
      </p>
      <button 
        onclick="window.location.reload()" 
        style="
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
        "
        onmouseover="this.style.background='#2563eb'"
        onmouseout="this.style.background='#3b82f6'"
      >
        Reload Application
      </button>
      <details style="margin-top: 2rem; max-width: 600px;">
        <summary style="cursor: pointer; color: #64748b; font-size: 0.875rem;">
          Show Error Details
        </summary>
        <pre style="
          background: #f1f5f9;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-top: 1rem;
          text-align: left;
          font-size: 0.75rem;
          color: #374151;
          overflow: auto;
        ">${error.stack || error.message || error}</pre>
      </details>
    </div>
  `;
}

// Handle page unload
function handleUnload() {
  if (app && app.destroy) {
    console.log('Cleaning up application...');
    app.destroy();
  }
}

// Service Worker registration (optional)
async function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.log('Service Worker registration failed:', error);
    }
  }
}

// Check browser compatibility
function checkBrowserCompatibility() {
  const requiredFeatures = [
    'fetch',
    'Promise',
    'WeakMap',
    'Symbol',
    'localStorage'
  ];

  const missingFeatures = requiredFeatures.filter(feature => {
    if (feature === 'localStorage') {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return false;
      } catch {
        return true;
      }
    }
    return typeof window[feature] === 'undefined';
  });

  if (missingFeatures.length > 0) {
    showCompatibilityError(missingFeatures);
    return false;
  }

  return true;
}

function showCompatibilityError(missingFeatures) {
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      text-align: center;
    ">
      <div style="font-size: 4rem; margin-bottom: 1rem;">🌐</div>
      <h1 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">
        Browser Not Supported
      </h1>
      <p style="color: #64748b; margin-bottom: 1rem; max-width: 500px; line-height: 1.6;">
        Your browser doesn't support some features required by this application.
      </p>
      <p style="color: #ef4444; font-size: 0.875rem; margin-bottom: 1.5rem;">
        Missing features: ${missingFeatures.join(', ')}
      </p>
      <p style="color: #64748b; font-size: 0.875rem; max-width: 500px; line-height: 1.6;">
        Please update your browser or use a modern browser like Chrome, Firefox, Safari, or Edge.
      </p>
    </div>
  `;
}

// Main initialization
function main() {
  // Check browser compatibility first
  if (!checkBrowserCompatibility()) {
    return;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }

  // Register service worker
  registerServiceWorker();

  // Handle page unload
  window.addEventListener('beforeunload', handleUnload);
  window.addEventListener('unload', handleUnload);

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (app && app.handleVisibilityChange) {
      app.handleVisibilityChange(document.hidden);
    }
  });

  // Handle online/offline status
  window.addEventListener('online', () => {
    if (app && app.handleConnectionChange) {
      app.handleConnectionChange(true);
    }
  });

  window.addEventListener('offline', () => {
    if (app && app.handleConnectionChange) {
      app.handleConnectionChange(false);
    }
  });
}

// Error handling for the entry point
try {
  main();
} catch (error) {
  console.error('Fatal error in application entry point:', error);
  showInitializationError(error);
}

// Export for module systems
export default app;