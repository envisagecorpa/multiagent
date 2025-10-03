/**
 * Progressive Web App (PWA) Utilities
 * Provides service worker management, offline functionality, and app installation
 */

export class PWAManager {
  constructor(options = {}) {
    this.options = {
      swPath: '/sw.js',
      enableNotifications: true,
      enableOfflineMode: true,
      enableInstallPrompt: true,
      cacheStrategies: {
        images: 'cache-first',
        api: 'network-first',
        static: 'cache-first'
      },
      ...options
    };

    this.serviceWorker = null;
    this.installPrompt = null;
    this.isOnline = navigator.onLine;
    this.notifications = [];
    
    this.init();
  }

  async init() {
    // Register service worker
    await this.registerServiceWorker();
    
    // Setup online/offline detection
    this.setupConnectionMonitoring();
    
    // Setup install prompt
    this.setupInstallPrompt();
    
    // Setup notifications
    if (this.options.enableNotifications) {
      await this.setupNotifications();
    }
    
    // Setup background sync
    this.setupBackgroundSync();
  }

  // Service Worker Management
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return false;
    }

    // TODO: Create a service worker file before enabling registration
    // For now, skip registration to avoid MIME type errors
    console.log('Service Worker registration disabled (no sw.js file)');
    return false;

    /* Uncomment when sw.js is created
    try {
      const registration = await navigator.serviceWorker.register(this.options.swPath);
      this.serviceWorker = registration;

      console.log('Service Worker registered:', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        this.handleServiceWorkerUpdate(registration);
      });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', this.handleSWMessage.bind(this));

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
    */
  }

  handleServiceWorkerUpdate(registration) {
    const newWorker = registration.installing;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New version available
        this.showUpdateNotification();
      }
    });
  }

  showUpdateNotification() {
    const event = new CustomEvent('pwa:update-available', {
      detail: {
        action: () => this.applyUpdate()
      }
    });
    
    document.dispatchEvent(event);
  }

  async applyUpdate() {
    if (!this.serviceWorker) return;

    const registration = this.serviceWorker;
    const waitingWorker = registration.waiting;

    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  handleSWMessage(event) {
    const { data } = event;
    
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data.payload);
        break;
      case 'BACKGROUND_SYNC':
        this.handleBackgroundSync(data.payload);
        break;
      case 'OFFLINE_FALLBACK':
        this.handleOfflineFallback(data.payload);
        break;
    }
  }

  // Connection Monitoring
  setupConnectionMonitoring() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Monitor connection quality
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', this.handleConnectionChange.bind(this));
    }
  }

  handleOnline() {
    this.isOnline = true;
    document.body.classList.remove('offline');
    document.body.classList.add('online');
    
    const event = new CustomEvent('pwa:online', {
      detail: {
        connectionType: navigator.connection?.effectiveType,
        downlink: navigator.connection?.downlink
      }
    });
    
    document.dispatchEvent(event);
    
    // Sync pending data
    this.syncPendingData();
  }

  handleOffline() {
    this.isOnline = false;
    document.body.classList.remove('online');
    document.body.classList.add('offline');
    
    const event = new CustomEvent('pwa:offline');
    document.dispatchEvent(event);
  }

  handleConnectionChange() {
    const connection = navigator.connection;
    
    const event = new CustomEvent('pwa:connection-change', {
      detail: {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      }
    });
    
    document.dispatchEvent(event);
  }

  // Install Prompt
  setupInstallPrompt() {
    if (!this.options.enableInstallPrompt) return;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt = event;
      
      const installEvent = new CustomEvent('pwa:install-available', {
        detail: {
          prompt: () => this.showInstallPrompt()
        }
      });
      
      document.dispatchEvent(installEvent);
    });

    // Track installation
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null;
      
      const event = new CustomEvent('pwa:installed');
      document.dispatchEvent(event);
    });
  }

  async showInstallPrompt() {
    if (!this.installPrompt) return false;

    try {
      this.installPrompt.prompt();
      const result = await this.installPrompt.userChoice;
      
      console.log('Install prompt result:', result.outcome);
      
      if (result.outcome === 'accepted') {
        this.installPrompt = null;
      }
      
      return result.outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt error:', error);
      return false;
    }
  }

  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // Notifications
  async setupNotifications() {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  async showNotification(options = {}) {
    if (!this.options.enableNotifications) return null;

    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'photo-app',
      requireInteraction: false,
      ...options
    };

    try {
      if (this.serviceWorker && this.serviceWorker.active) {
        // Show via service worker for better offline support
        await this.serviceWorker.showNotification(options.title, defaultOptions);
      } else {
        // Fallback to regular notification
        const notification = new Notification(options.title, defaultOptions);
        this.notifications.push(notification);
        return notification;
      }
    } catch (error) {
      console.error('Notification error:', error);
      return null;
    }
  }

  // Background Sync
  setupBackgroundSync() {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('Background Sync not supported');
      return;
    }

    // Listen for sync events
    document.addEventListener('pwa:sync-data', this.handleSyncRequest.bind(this));
  }

  async handleSyncRequest(event) {
    const { tag, data } = event.detail;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      
      // Store data for sync
      localStorage.setItem(`sync-${tag}`, JSON.stringify(data));
      
      console.log('Background sync registered:', tag);
    } catch (error) {
      console.error('Background sync error:', error);
    }
  }

  async syncPendingData() {
    // Find all pending sync data
    const syncKeys = Object.keys(localStorage).filter(key => key.startsWith('sync-'));
    
    for (const key of syncKeys) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        const tag = key.replace('sync-', '');
        
        // Attempt to sync
        const success = await this.performSync(tag, data);
        
        if (success) {
          localStorage.removeItem(key);
          console.log('Sync completed:', tag);
        }
      } catch (error) {
        console.error('Sync error:', error);
      }
    }
  }

  async performSync(tag, data) {
    // Override this method for custom sync logic
    console.log('Performing sync:', tag, data);
    return true;
  }

  handleBackgroundSync(payload) {
    const event = new CustomEvent('pwa:background-sync', {
      detail: payload
    });
    
    document.dispatchEvent(event);
  }

  // Offline Handling
  handleOfflineFallback(payload) {
    const event = new CustomEvent('pwa:offline-fallback', {
      detail: payload
    });
    
    document.dispatchEvent(event);
  }

  // Cache Management
  async clearCache(cacheName = null) {
    if (!('caches' in window)) return false;

    try {
      if (cacheName) {
        await caches.delete(cacheName);
      } else {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  async getCacheSize() {
    if (!('caches' in window)) return 0;

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Cache size calculation error:', error);
      return 0;
    }
  }

  // App Lifecycle
  setupAppLifecycle() {
    // Page Visibility API
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        const event = new CustomEvent('pwa:app-hidden');
        document.dispatchEvent(event);
      } else {
        const event = new CustomEvent('pwa:app-visible');
        document.dispatchEvent(event);
      }
    });

    // Beforeunload
    window.addEventListener('beforeunload', (event) => {
      const beforeUnloadEvent = new CustomEvent('pwa:before-unload', {
        detail: { event }
      });
      document.dispatchEvent(beforeUnloadEvent);
    });
  }

  // Storage Management
  async getStorageEstimate() {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        available: estimate.quota - estimate.usage,
        percentUsed: (estimate.usage / estimate.quota) * 100
      };
    } catch (error) {
      console.error('Storage estimate error:', error);
      return null;
    }
  }

  async requestPersistentStorage() {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) {
      return false;
    }

    try {
      const granted = await navigator.storage.persist();
      console.log('Persistent storage:', granted ? 'granted' : 'denied');
      return granted;
    } catch (error) {
      console.error('Persistent storage request error:', error);
      return false;
    }
  }

  // Utility Methods
  getConnectionInfo() {
    const connection = navigator.connection;
    if (!connection) return null;

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  isSlowConnection() {
    const connection = this.getConnectionInfo();
    return connection && (
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g' ||
      connection.saveData
    );
  }

  destroy() {
    // Clear notifications
    this.notifications.forEach(notification => notification.close());
    this.notifications = [];
    
    // Reset install prompt
    this.installPrompt = null;
  }
}

/**
 * Service Worker Generator
 */
export class ServiceWorkerGenerator {
  static generate(options = {}) {
    const config = {
      cacheName: 'photo-app-v1',
      staticAssets: [
        '/',
        '/index.html',
        '/src/main.js',
        '/src/styles/app.css',
        '/icons/icon-192x192.png'
      ],
      strategies: {
        html: 'network-first',
        images: 'cache-first',
        api: 'network-first',
        static: 'cache-first'
      },
      ...options
    };

    return `
// Generated Service Worker
const CACHE_NAME = '${config.cacheName}';
const STATIC_ASSETS = ${JSON.stringify(config.staticAssets)};

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Determine strategy
  let strategy = 'network-first';
  
  if (request.destination === 'image') {
    strategy = '${config.strategies.images}';
  } else if (url.pathname.includes('/api/')) {
    strategy = '${config.strategies.api}';
  } else if (request.destination === 'document') {
    strategy = '${config.strategies.html}';
  } else {
    strategy = '${config.strategies.static}';
  }
  
  event.respondWith(handleRequest(request, strategy));
});

// Request handlers
async function handleRequest(request, strategy) {
  switch (strategy) {
    case 'cache-first':
      return cacheFirst(request);
    case 'network-first':
      return networkFirst(request);
    case 'cache-only':
      return cacheOnly(request);
    case 'network-only':
      return networkOnly(request);
    default:
      return networkFirst(request);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

async function cacheOnly(request) {
  return caches.match(request);
}

async function networkOnly(request) {
  return fetch(request);
}

// Message handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  event.waitUntil(
    handleBackgroundSync(event.tag)
  );
});

async function handleBackgroundSync(tag) {
  // Handle sync operations
  console.log('Handling sync:', tag);
}
`;
  }
}

// Create default instance
export const pwaManager = new PWAManager();

export default {
  PWAManager,
  ServiceWorkerGenerator,
  pwaManager
};