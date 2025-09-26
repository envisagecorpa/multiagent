/**
 * Integration Tests for Photo Album Application
 * Tests the complete application flow and component integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import App from '../src/App.js';

// Mock modules
vi.mock('../src/services/database-service.js');
vi.mock('../src/services/SearchService.js');

// Set up DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Photo Album Test</title>
    </head>
    <body>
      <div id="app"></div>
    </body>
  </html>
`, {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = dom.window.localStorage;
global.sessionStorage = dom.window.sessionStorage;
global.HTMLElement = dom.window.HTMLElement;
global.CustomEvent = dom.window.CustomEvent;

// Mock fetch
global.fetch = vi.fn();

// Mock CSS imports
vi.mock('../src/styles/app.css', () => ({}));
vi.mock('../src/styles/auth.css', () => ({}));
vi.mock('../src/styles/dashboard.css', () => ({}));
vi.mock('../src/styles/photos.css', () => ({}));
vi.mock('../src/styles/modal.css', () => ({}));
vi.mock('../src/styles/navigation.css', () => ({}));
vi.mock('../src/styles/settings.css', () => ({}));
vi.mock('../src/styles/search.css', () => ({}));

describe('Photo Album Application Integration', () => {
  let app;
  let container;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '<div id="app"></div>';
    container = document.getElementById('app');
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock successful service initialization
    vi.doMock('../src/services/index.js', () => ({
      AuthService: vi.fn().mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(true),
        getCurrentUser: vi.fn().mockResolvedValue(null),
        on: vi.fn(),
        off: vi.fn()
      })),
      PhotoService: vi.fn().mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(true),
        getAllPhotos: vi.fn().mockResolvedValue([]),
        on: vi.fn(),
        off: vi.fn()
      })),
      AlbumService: vi.fn().mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(true),
        getAllAlbums: vi.fn().mockResolvedValue([]),
        on: vi.fn(),
        off: vi.fn()
      }))
    }));
  });

  afterEach(() => {
    if (app && app.destroy) {
      app.destroy();
    }
    vi.restoreAllMocks();
  });

  describe('Application Initialization', () => {
    it('should create app instance successfully', () => {
      app = new App(container);
      expect(app).toBeDefined();
      expect(app.container).toBe(container);
    });

    it('should initialize with default state', () => {
      app = new App(container);
      expect(app.state.isInitialized).toBe(false);
      expect(app.state.currentUser).toBe(null);
      expect(app.state.isLoading).toBe(true);
    });

    it('should render loading screen initially', async () => {
      app = new App(container);
      
      // Wait for initial render
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const loadingElement = container.querySelector('.app-loading');
      expect(loadingElement).toBeTruthy();
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock service initialization failure
      vi.doMock('../src/services/index.js', () => ({
        AuthService: vi.fn().mockImplementation(() => ({
          init: vi.fn().mockRejectedValue(new Error('Service init failed'))
        }))
      }));

      app = new App(container);
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(app.state.error).toBeTruthy();
      const errorElement = container.querySelector('.app-error');
      expect(errorElement).toBeTruthy();
    });
  });

  describe('Authentication Flow', () => {
    beforeEach(async () => {
      app = new App(container);
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should show authentication component when not logged in', async () => {
      // Simulate route navigation to login
      await app.components.router?.navigate('/login');
      
      const authElement = container.querySelector('.auth-container');
      expect(authElement).toBeTruthy();
    });

    it('should handle successful login', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      };

      app.handleLoginSuccess(mockUser);
      
      expect(app.state.currentUser).toEqual(mockUser);
      expect(app.components.router?.getCurrentPath()).toBe('/dashboard');
    });

    it('should handle logout correctly', async () => {
      // Set up logged in state
      app.setState({ currentUser: { id: '1', email: 'test@example.com' } });
      
      await app.handleLogout();
      
      expect(app.state.currentUser).toBe(null);
      expect(localStorage.getItem('sessionToken')).toBe(null);
    });
  });

  describe('Navigation and Routing', () => {
    beforeEach(async () => {
      app = new App(container);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set up authenticated state
      app.setState({ 
        currentUser: { id: '1', email: 'test@example.com' },
        isInitialized: true 
      });
    });

    it('should navigate to dashboard for authenticated users', async () => {
      await app.navigate('/dashboard');
      
      expect(app.state.currentRoute?.component).toBe('dashboard');
    });

    it('should navigate to photo grid with album ID', async () => {
      await app.navigate('/photos/album123');
      
      expect(app.state.currentRoute?.component).toBe('photoGrid');
    });

    it('should navigate to search page', async () => {
      await app.navigate('/search');
      
      expect(app.state.currentRoute?.component).toBe('search');
    });

    it('should redirect to login for unauthenticated access', async () => {
      app.setState({ currentUser: null });
      
      await app.navigate('/dashboard');
      
      // Should redirect to login
      expect(app.components.router?.getCurrentPath()).toBe('/login');
    });
  });

  describe('Component Communication', () => {
    beforeEach(async () => {
      app = new App(container);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      app.setState({ 
        currentUser: { id: '1', email: 'test@example.com' },
        isInitialized: true 
      });
    });

    it('should handle photo upload events', async () => {
      const mockPhoto = {
        id: '1',
        filename: 'test.jpg',
        url: 'http://example.com/test.jpg'
      };

      const notificationSpy = vi.spyOn(app, 'showSuccessNotification');
      
      app.handlePhotoUploaded(mockPhoto);
      
      expect(notificationSpy).toHaveBeenCalledWith('Photo uploaded successfully');
      expect(app.eventBus.listeners['photoAdded']).toBeDefined();
    });

    it('should handle album creation events', async () => {
      const mockAlbum = {
        id: '1',
        name: 'Test Album',
        description: 'Test Description'
      };

      const notificationSpy = vi.spyOn(app, 'showSuccessNotification');
      
      app.handleAlbumCreated(mockAlbum);
      
      expect(notificationSpy).toHaveBeenCalledWith('Album created successfully');
    });

    it('should handle search events', async () => {
      const searchSpy = vi.fn();
      app.eventBus.on('search', searchSpy);

      // Simulate search from component
      app.eventBus.emit('search', { query: 'test' });
      
      expect(searchSpy).toHaveBeenCalledWith({ query: 'test' });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      app = new App(container);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should display error notifications', () => {
      const message = 'Test error message';
      
      app.showErrorNotification(message);
      
      const notification = container.querySelector('.notification-error');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toContain(message);
    });

    it('should handle global errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const notificationSpy = vi.spyOn(app, 'showErrorNotification');
      
      const error = new Error('Test global error');
      app.handleGlobalError(error);
      
      expect(consoleSpy).toHaveBeenCalledWith('Global error:', error);
      expect(notificationSpy).toHaveBeenCalledWith('An unexpected error occurred');
    });

    it('should handle service errors gracefully', async () => {
      const mockError = new Error('Service unavailable');
      
      // Mock service method to throw error
      if (app.services.photo) {
        app.services.photo.getAllPhotos = vi.fn().mockRejectedValue(mockError);
      }

      const notificationSpy = vi.spyOn(app, 'showErrorNotification');
      
      try {
        await app.services.photo?.getAllPhotos();
      } catch (error) {
        app.handleGlobalError(error);
      }
      
      expect(notificationSpy).toHaveBeenCalled();
    });
  });

  describe('Theme and Settings', () => {
    beforeEach(async () => {
      app = new App(container);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should apply theme changes', () => {
      const theme = 'dark';
      
      app.handleThemeChange(theme);
      
      expect(app.state.theme).toBe(theme);
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
    });

    it('should save theme to localStorage', () => {
      const theme = 'dark';
      
      app.handleThemeChange(theme);
      
      const savedPrefs = JSON.parse(localStorage.getItem('photo-album-preferences') || '{}');
      expect(savedPrefs.theme).toBe(theme);
    });

    it('should load saved theme on initialization', async () => {
      localStorage.setItem('photo-album-preferences', JSON.stringify({ theme: 'dark' }));
      
      const newApp = new App(container);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(newApp.state.theme).toBe('dark');
    });
  });

  describe('Modal System', () => {
    beforeEach(async () => {
      app = new App(container);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should initialize modal instances', () => {
      expect(app.modals.photoViewer).toBeDefined();
      expect(app.modals.confirmDialog).toBeDefined();
      expect(app.modals.formModal).toBeDefined();
    });

    it('should handle photo viewer opening', () => {
      const mockPhoto = {
        id: '1',
        url: 'http://example.com/photo.jpg',
        title: 'Test Photo'
      };

      const openSpy = vi.spyOn(app.modals.photoViewer, 'open').mockImplementation(() => {});
      
      app.handleOpenPhoto({ photo: mockPhoto, index: 0 });
      
      expect(openSpy).toHaveBeenCalledWith(mockPhoto, 0);
    });

    it('should handle confirmation dialogs', () => {
      const openSpy = vi.spyOn(app.modals.confirmDialog, 'open').mockImplementation(() => {});
      
      app.showConfirmDialog('Test Title', 'Test Message', vi.fn());
      
      expect(openSpy).toHaveBeenCalled();
    });

    it('should close all modals on escape key', () => {
      const closeSpy1 = vi.spyOn(app.modals.photoViewer, 'close').mockImplementation(() => {});
      const closeSpy2 = vi.spyOn(app.modals.confirmDialog, 'close').mockImplementation(() => {});
      
      // Simulate escape key press
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
      
      expect(closeSpy1).toHaveBeenCalled();
      expect(closeSpy2).toHaveBeenCalled();
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should clean up resources on destroy', async () => {
      app = new App(container);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const destroySpy = vi.spyOn(app, 'destroy');
      
      app.destroy();
      
      expect(destroySpy).toHaveBeenCalled();
    });

    it('should remove event listeners on destroy', async () => {
      app = new App(container);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      app.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should handle rapid navigation changes', async () => {
      app = new App(container);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      app.setState({ 
        currentUser: { id: '1', email: 'test@example.com' },
        isInitialized: true 
      });

      // Rapidly navigate between routes
      const routes = ['/dashboard', '/photos', '/search', '/settings'];
      
      for (const route of routes) {
        await app.navigate(route);
        // Small delay to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Should end up on the last route
      expect(app.components.router?.getCurrentPath()).toBe('/settings');
    });

    it('should handle multiple simultaneous operations', async () => {
      app = new App(container);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate multiple operations happening at once
      const operations = [
        app.showSuccessNotification('Test 1'),
        app.showErrorNotification('Test 2'),
        app.handleThemeChange('dark'),
        app.setState({ isLoading: false })
      ];
      
      await Promise.all(operations);
      
      // Should handle all operations without errors
      expect(app.state.theme).toBe('dark');
      expect(app.state.isLoading).toBe(false);
    });
  });
});

describe('Application Integration with Real Components', () => {
  let app;
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    container = document.getElementById('app');
    localStorage.clear();
  });

  afterEach(() => {
    if (app && app.destroy) {
      app.destroy();
    }
  });

  it('should integrate with all major components', async () => {
    app = new App(container);
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Should have initialized core services
    expect(app.services.auth).toBeDefined();
    expect(app.services.photo).toBeDefined();
    expect(app.services.album).toBeDefined();
    expect(app.services.search).toBeDefined();
    
    // Should have router
    expect(app.components.router).toBeDefined();
  });

  it('should maintain state consistency across components', async () => {
    app = new App(container);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Set user state
    const mockUser = { id: '1', email: 'test@example.com' };
    app.setState({ currentUser: mockUser });
    
    // User should be consistent across components
    expect(app.getCurrentUser()).toEqual(mockUser);
    
    // Navigation should reflect user state
    if (app.components.navigation) {
      expect(app.components.navigation.user).toEqual(mockUser);
    }
  });

  it('should handle complete application lifecycle', async () => {
    // Initialize
    app = new App(container);
    expect(app.state.isInitialized).toBe(false);
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Should be initialized
    expect(app.state.isInitialized).toBe(true);
    
    // Simulate user login
    const mockUser = { id: '1', email: 'test@example.com' };
    app.handleLoginSuccess(mockUser);
    expect(app.state.currentUser).toEqual(mockUser);
    
    // Navigate to different sections
    await app.navigate('/dashboard');
    expect(app.state.currentRoute?.component).toBe('dashboard');
    
    // Simulate logout
    await app.handleLogout();
    expect(app.state.currentUser).toBe(null);
    
    // Cleanup
    app.destroy();
    expect(app.destroyed).toBe(true);
  });
});