import { Component } from './components/common/Component.js';
import { AuthenticationService } from './services/auth-service.js';
import { PhotoService } from './services/photo-service.js';
import { AlbumService } from './services/album-service.js';
import { DatabaseService } from './services/database-service.js';
import SearchService from './services/SearchService.js';
import { AuthComponent } from './components/auth/index.js';
import { Dashboard } from './components/dashboard/index.js';
import { PhotoGrid } from './components/photos/index.js';
import { PhotoUpload } from './components/photos/index.js';
import VirtualPhotoGrid from './components/VirtualPhotoGrid.js';
import { Search } from './components/search/index.js';
import { Settings } from './components/settings/index.js';
import { Modal } from './components/modal/index.js';
import { PhotoViewer } from './components/modal/index.js';
import { Router } from './router/Router.js';
import { Navigation } from './router/Navigation.js';
import { eventBus } from './utils/EventBus.js';
import { performanceMonitor, lazyLoader } from './utils/PerformanceUtils.js';
import { globalCache, imageCache } from './utils/CacheManager.js';
import { accessibilityManager } from './utils/AccessibilityManager.js';
import { pwaManager } from './utils/PWAManager.js';
import { notifications } from './components/common/NotificationManager.js';

/**
 * Main Application Class - Integrates all components and services
 */
export default class App extends Component {
  constructor(container) {
    super(container);

    // Store container reference for app-specific usage
    this.container = container;

    this.state = {
      isInitialized: false,
      currentUser: null,
      currentRoute: null,
      isLoading: true,
      error: null,
      theme: 'light'
    };

    // Initialize shared database service first
    this.databaseService = new DatabaseService();

    // Initialize services with shared database
    this.services = {
      database: this.databaseService,
      auth: new AuthenticationService(this.databaseService),
      photo: new PhotoService(this.databaseService),
      album: new AlbumService(this.databaseService)
    };
    
    // Initialize components
    this.components = {};
    this.modals = {};
    
    // Initialize router and navigation
    this.router = null;
    this.navigation = null;
    
    // Initialize event bus
    this.eventBus = eventBus;
    
    // Initialize performance and utility managers
    this.performanceMonitor = performanceMonitor;
    this.cacheManager = globalCache;
    this.imageCache = imageCache;
    this.accessibilityManager = accessibilityManager;
    this.pwaManager = pwaManager;
    
    // Performance tracking
    this.performanceMetrics = {
      appStartTime: performance.now(),
      componentsLoaded: 0,
      imagesLoaded: 0,
      routeTransitions: 0
    };
    
    // Initialize the application
    this.init();
  }

  async init() {
    try {
      console.log('🚀 Starting app initialization...');
      this.state.isLoading = true;
      this.updateState();
      
      // Start performance monitoring
      this.performanceMonitor.startTimer('app-initialization');
      console.log('✅ Performance monitoring started');
      
      // Initialize error handling
      this.setupGlobalErrorHandling();
      console.log('✅ Error handling initialized');
      
      // Initialize performance and accessibility
      this.initializePerformanceFeatures();
      console.log('✅ Performance features initialized');
      
      // Initialize services (auth, photo, album)
      console.log('⏳ Initializing services...');
      await this.initializeServices();
      console.log('✅ Services initialized');
      
      // Initialize router and navigation
      console.log('⏳ Initializing router...');
      this.initializeRouter();
      console.log('✅ Router initialized');
      
      console.log('⏳ Initializing navigation...');
      this.initializeNavigation();
      console.log('✅ Navigation initialized');
      
      // Initialize modal system
      console.log('⏳ Initializing modals...');
      this.initializeModals();
      console.log('✅ Modals initialized');
      
      // Setup event listeners
      console.log('⏳ Setting up event listeners...');
      this.setupGlobalEventListeners();
      console.log('✅ Event listeners set up');
      
      // Initialize components based on auth state
      console.log('⏳ Initializing components...');
      await this.initializeComponents();
      console.log('✅ Components initialized');
      
      // Complete performance monitoring
      const initTime = this.performanceMonitor.endTimer('app-initialization');
      this.performanceMetrics.initializationTime = initTime;
      
      // ### Temporarily disable continuous monitoring to save resources
      this.performanceMonitor.destroy();

      // Mark as initialized
      this.state.isInitialized = true;
      this.state.isLoading = false;
      this.updateState();
      
      console.log(`✅ App initialized successfully in ${Math.round(initTime)}ms`);
      
      // Announce to screen readers
      this.accessibilityManager.announce('Photo album application loaded');
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      this.handleError(error, 'App initialization failed');
    }
  }

  /**
   * Update the application state and trigger re-render if needed
   */
  updateState() {
    // If the component is mounted and rendered, update the content
    if (this.contentContainer) {
      this.contentContainer.innerHTML = this.renderContent();
    }
  }

  /**
   * Handle application errors
   */
  handleError(error, context = '') {
    console.error(`App Error (${context}):`, error);
    
    // Set error state
    this.state.error = error.message || 'An unexpected error occurred';
    this.state.isLoading = false;
    this.updateState();
    
    // Show user-friendly notification
    this.showErrorNotification(context || 'An error occurred');
  }

  /**
   * Initialize main application components
   */
  async initializeComponents() {
    console.log('🎨 App: Initializing components...');

    // Render the main app structure
    console.log('🎨 App: Calling render()');
    this.render();
    console.log('🎨 App: contentContainer set to:', this.contentContainer);

    // NOW start the router after contentContainer is ready
    if (this.components.router) {
      console.log('🚀 App: Starting router now that contentContainer is ready');
      this.components.router.start();
    }

    console.log('✅ App: Components initialized');
  }

  initializePerformanceFeatures() {
    console.log('Initializing performance features...');
    
    // Configure performance monitoring
    this.performanceMonitor.options.enableMetrics = true;
    this.performanceMonitor.options.enableLogging = process.env.NODE_ENV === 'development';
    
    // Setup accessibility features
    this.accessibilityManager.options.enableAnnouncements = true;
    this.accessibilityManager.options.enableKeyboardNavigation = true;
    
    // Configure cache managers
    this.cacheManager.options.maxSize = 50 * 1024 * 1024; // 50MB
    this.imageCache.options.maxSize = 100 * 1024 * 1024; // 100MB
    
    // Initialize PWA features
    if ('serviceWorker' in navigator) {
      this.pwaManager.options.enableOfflineMode = true;
      this.pwaManager.options.enableInstallPrompt = true;
    }
    
    console.log('✅ Performance features initialized');
  }

  async initializeServices() {
    console.log('Initializing services...');
    
    try {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service initialization timeout')), 10000)
      );
      
      // Initialize database service first
      console.log('App.js: Initializing database service...');
      await this.databaseService.initialize();
      console.log('✅ App.js: Database service initialized');

      if (this.databaseService.db == null) {
        console.log('App.js: databaseService.db not initialized');
      }

      // Initialize other services with the shared database
      const serviceInit = Promise.all([
        this.services.auth.initialize(),
        this.services.photo.initialize(),
        this.services.album.initialize()
      ]);
      
      await Promise.race([serviceInit, timeout]);
      console.log('✅ Core services initialized');

      // Initialize search service with other services and database
      this.services.search = new SearchService({
        photoService: this.services.photo,
        albumService: this.services.album,
        database: this.databaseService
      });
      
      await this.services.search.init();
      console.log('✅ Search service initialized');
      
      console.log('✅ All services initialized successfully');
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      throw error;
    }
  }

  initializeRouter() {
    this.components.router = new Router({
      routes: {
        '/': { component: 'dashboard', requiresAuth: true },
        '/login': { component: 'auth', requiresAuth: false },
        '/register': { component: 'auth', requiresAuth: false },
        '/dashboard': { component: 'dashboard', requiresAuth: true },
        '/photos': { component: 'photoGrid', requiresAuth: true },
        '/photos/:albumId': { component: 'photoGrid', requiresAuth: true },
        '/upload': { component: 'photoUpload', requiresAuth: true },
        '/search': { component: 'search', requiresAuth: true },
        '/settings': { component: 'settings', requiresAuth: true }
      },
      onRouteChange: this.handleRouteChange.bind(this),
      onAuthRequired: this.handleAuthRequired.bind(this),
      checkAuth: this.checkAuth.bind(this)
    });

    // DON'T start the router yet - wait until components are initialized
    console.log('✅ Router created (not started yet)');
  }

  initializeNavigation() {
    const navContainer = document.createElement('nav');
    navContainer.className = 'app-navigation';
    this.container.appendChild(navContainer);

    this.components.navigation = new Navigation(navContainer, {
      router: this.components.router,
      user: this.state.currentUser,
      onLogout: this.handleLogout.bind(this)
    });
  }

  initializeModals() {
    // Create modal containers
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    document.body.appendChild(modalContainer);

    // Initialize photo viewer modal
    this.modals.photoViewer = new PhotoViewer(modalContainer, {
      photoService: this.services.photo,
      onPhotoUpdate: this.handlePhotoUpdate.bind(this),
      onPhotoDelete: this.handlePhotoDelete.bind(this)
    });

    // Initialize other modals as needed
    this.modals.confirmDialog = new Modal(modalContainer, {
      type: 'confirm'
    });

    this.modals.formModal = new Modal(modalContainer, {
      type: 'form'
    });
  }

  setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleGlobalError(event.reason);
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleGlobalError(event.error);
    });

    // Handle service worker errors
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('error', (event) => {
        console.error('Service worker error:', event);
      });
    }
  }

  setupGlobalEventListeners() {
    
    // Listen to service events
    this.services.auth.on('userLogin', this.handleUserLogin.bind(this));
    this.services.auth.on('userLogout', this.handleUserLogout.bind(this));
    this.services.auth.on('sessionExpired', this.handleSessionExpired.bind(this));

    this.services.photo.on('photoUploaded', this.handlePhotoUploaded.bind(this));
    this.services.photo.on('photoDeleted', this.handlePhotoDeleted.bind(this));
    this.services.photo.on('photoUpdated', this.handlePhotoUpdated.bind(this));

    this.services.album.on('albumCreated', this.handleAlbumCreated.bind(this));
    this.services.album.on('albumDeleted', this.handleAlbumDeleted.bind(this));
    this.services.album.on('albumUpdated', this.handleAlbumUpdated.bind(this));

    // Listen to global component events
    this.eventBus.on('openPhoto', this.handleOpenPhoto.bind(this));
    this.eventBus.on('editPhoto', this.handleEditPhoto.bind(this));
    this.eventBus.on('deletePhoto', this.handleDeletePhoto.bind(this));
    this.eventBus.on('openAlbum', this.handleOpenAlbum.bind(this));
    this.eventBus.on('showError', this.handleShowError.bind(this));
    this.eventBus.on('showSuccess', this.handleShowSuccess.bind(this));
    
    // Theme changes
    this.eventBus.on('themeChange', this.handleThemeChange.bind(this));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
  }

  async loadUserPreferences() {
    try {
      const preferences = localStorage.getItem('photo-album-preferences');
      if (preferences) {
        const prefs = JSON.parse(preferences);
        this.setState({ theme: prefs.theme || 'light' });
        this.applyTheme(prefs.theme || 'light');
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  async checkAuthenticationStatus() {
    try {
      // Check if we already have a current user
      if (this.services.auth.currentUser) {
        this.setState({ currentUser: this.services.auth.currentUser });
        this.updateNavigationUser(this.services.auth.currentUser);
      }
      // Otherwise validate token if we have one
      else if (this.services.auth.token) {
        await this.services.auth.validateToken();
        if (this.services.auth.currentUser) {
          this.setState({ currentUser: this.services.auth.currentUser });
          this.updateNavigationUser(this.services.auth.currentUser);
        }
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
      // Not critical, user can still log in
    }
  }

  async startApplication() {
    // Create main app container
    this.render();
    
    // Initialize the current route
    const currentPath = window.location.pathname;
    await this.components.router.navigate(currentPath);
  }

  render() {
    this.container.innerHTML = `
      <div class="app ${this.state.theme}">
        <div class="app-header">
          <!-- Navigation will be inserted here -->
        </div>
        <main class="app-main">
          <div class="app-content" id="app-content">
            ${this.renderContent()}
          </div>
        </main>
        <div class="app-notifications" id="app-notifications"></div>
      </div>
    `;

    this.contentContainer = this.container.querySelector('#app-content');
    this.notificationsContainer = this.container.querySelector('#app-notifications');

    // Mount the global notification manager to the notifications container
    if (this.notificationsContainer && !notifications.element) {
      console.log('📢 App: Mounting global notification manager');
      notifications.mount(this.notificationsContainer, true);
    }
  }

  renderContent() {
    const { isLoading, error, isInitialized } = this.state;

    if (isLoading) {
      return this.renderLoading();
    }

    if (error) {
      return this.renderError();
    }

    if (!isInitialized) {
      return this.renderLoading();
    }

    return '<div class="route-content"></div>';
  }

  renderLoading() {
    return `
      <div class="app-loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading Photo Album...</div>
      </div>
    `;
  }

  renderError() {
    return `
      <div class="app-error">
        <div class="error-icon">⚠️</div>
        <div class="error-title">Application Error</div>
        <div class="error-message">${this.state.error}</div>
        <button class="error-retry-btn" onclick="window.location.reload()">
          Retry
        </button>
      </div>
    `;
  }

  // Authentication check for router
  async checkAuth() {
    try {
      // Check if we have a current user or token
      if (this.services.auth.currentUser) {
        return true;
      }

      // Check if we have a token and validate it
      if (this.services.auth.token) {
        const result = await this.services.auth.validateToken();
        return !!result;
      }

      return false;
    } catch (error) {
      console.error('Error checking auth:', error);
      return false;
    }
  }

  // Route handling
  async handleRouteChange(route, params) {
    console.log('📍 App: handleRouteChange called');
    console.log('   Route:', route);
    console.log('   Params:', params);
    console.log('   Component:', route.component || route.handler);

    this.setState({ currentRoute: route });

    try {
      const componentName = route.component || route.handler;
      console.log('🔄 App: Loading component:', componentName);
      await this.loadRouteComponent(componentName, params);
      console.log('✅ App: Component loaded successfully');
    } catch (error) {
      console.error('❌ App: Error loading route component:', error);
      this.handleShowError('Failed to load page');
    }
  }

  async loadRouteComponent(componentName, params = {}) {
    console.log('🏗️ App: loadRouteComponent called with:', componentName);
    console.log('   contentContainer:', this.contentContainer);

    // Clear current content and show loading
    if (this.contentContainer) {
      console.log('🧹 App: Clearing content container');
      this.contentContainer.innerHTML = '<div class="route-content"><div class="loading-spinner"></div></div>';
    } else {
      console.error('⚠️ App: contentContainer is null!');
      return;
    }

    // Get the route-content div that was just created
    const routeContainer = this.contentContainer.querySelector('.route-content');
    console.log('📦 App: routeContainer:', routeContainer);

    // Destroy existing component if any
    if (this.currentComponent && this.currentComponent.destroy) {
      this.currentComponent.destroy();
    }

    let component = null;

    console.log('🔍 App: Switching on component:', componentName);
    switch (componentName) {
      case 'auth':
        console.log('👤 App: Loading auth component, passing routeContainer');
        component = await this.loadAuthComponent(routeContainer);
        break;
      case 'dashboard':
        console.log('📊 App: Loading dashboard component, passing routeContainer');
        component = await this.loadDashboardComponent(routeContainer);
        break;
      case 'photoGrid':
        component = await this.loadPhotoGridComponent(routeContainer, params);
        break;
      case 'photoUpload':
        component = await this.loadPhotoUploadComponent(routeContainer);
        break;
      case 'search':
        component = await this.loadSearchComponent(routeContainer);
        break;
      case 'settings':
        component = await this.loadSettingsComponent(routeContainer);
        break;
      default:
        console.error('❌ App: Unknown component:', componentName);
        throw new Error(`Unknown component: ${componentName}`);
    }

    console.log('✅ App: Component created:', component);
    this.currentComponent = component;
  }

  async loadAuthComponent(container) {
    console.log('🏗️ App: loadAuthComponent, container:', container);
    const component = new AuthComponent(container || this.contentContainer, {
      authService: this.services.auth,
      onLoginSuccess: this.handleLoginSuccess.bind(this),
      onRegisterSuccess: this.handleRegisterSuccess.bind(this)
    });

    return component;
  }

  async loadDashboardComponent(container) {
    console.log('🏗️ App: loadDashboardComponent, container:', container);
    const component = new Dashboard(container || this.contentContainer, {
      albumService: this.services.album,
      photoService: this.services.photo,
      searchService: this.services.search,
      onAlbumSelect: this.handleAlbumSelect.bind(this),
      onCreateAlbum: this.handleCreateAlbum.bind(this),
      eventBus: this.eventBus
    });

    return component;
  }

  async loadPhotoGridComponent(params) {
    const albumId = params.albumId;
    
    const component = new PhotoGrid(this.contentContainer, {
      photoService: this.services.photo,
      albumService: this.services.album,
      albumId: albumId,
      onPhotoClick: this.handlePhotoClick.bind(this),
      onPhotoSelect: this.handlePhotoSelect.bind(this),
      eventBus: this.eventBus
    });

    return component;
  }

  async loadPhotoUploadComponent() {
    const component = new PhotoUpload(this.contentContainer, {
      photoService: this.services.photo,
      albumService: this.services.album,
      onUploadComplete: this.handleUploadComplete.bind(this),
      eventBus: this.eventBus
    });

    return component;
  }

  async loadSearchComponent() {
    const component = new Search(this.contentContainer, {
      searchService: this.services.search,
      photoService: this.services.photo,
      albumService: this.services.album,
      onPhotoOpen: this.handleOpenPhoto.bind(this),
      onAlbumOpen: this.handleOpenAlbum.bind(this),
      eventBus: this.eventBus
    });

    return component;
  }

  async loadSettingsComponent() {
    const component = new Settings(this.contentContainer, {
      user: this.state.currentUser,
      onSettingsChange: this.handleSettingsChange.bind(this),
      onThemeChange: this.handleThemeChange.bind(this),
      eventBus: this.eventBus
    });

    return component;
  }

  // Event handlers
  async handleAuthRequired() {
    console.log('Auth required - redirecting to login');
    // Directly navigate to login without triggering route handler
    this.components.router.navigate('/login', { replace: true });
  }

  handleLoginSuccess(user) {
    this.setState({ currentUser: user });
    this.components.router.navigate('/dashboard');
    this.showSuccessNotification('Login successful!');
  }

  handleRegisterSuccess(user) {
    this.setState({ currentUser: user });
    this.components.router.navigate('/dashboard');
    this.showSuccessNotification('Registration successful!');
  }

  async handleLogout() {
    try {
      await this.services.auth.logout();
      this.setState({ currentUser: null });
      this.updateNavigationUser(null);
      this.components.router.navigate('/login');
      this.showSuccessNotification('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      this.showErrorNotification('Error logging out');
    }
  }

  handleUserLogin(user) {
    this.setState({ currentUser: user });
    this.updateNavigationUser(user);
  }

  handleUserLogout() {
    this.setState({ currentUser: null });
    this.updateNavigationUser(null);
    this.components.router.navigate('/login');
  }

  handleSessionExpired() {
    this.setState({ currentUser: null });
    this.updateNavigationUser(null);
    this.components.router.navigate('/login');
    this.showErrorNotification('Session expired. Please log in again.');
  }

  // Photo event handlers
  handlePhotoUploaded(photo) {
    this.showSuccessNotification('Photo uploaded successfully');
    this.eventBus.emit('photoAdded', photo);
    
    // Update search index
    if (this.services.search) {
      this.services.search.addPhoto(photo);
    }
  }

  handlePhotoDeleted(photoId) {
    this.showSuccessNotification('Photo deleted successfully');
    this.eventBus.emit('photoRemoved', photoId);
    
    // Update search index
    if (this.services.search) {
      this.services.search.removePhoto(photoId);
    }
  }

  handlePhotoUpdated(photo) {
    this.showSuccessNotification('Photo updated successfully');
    this.eventBus.emit('photoUpdated', photo);
    
    // Update search index
    if (this.services.search) {
      this.services.search.addPhoto(photo); // This will update existing entry
    }
  }

  handlePhotoClick(photo, index) {
    this.handleOpenPhoto({ photo, index });
  }

  handlePhotoSelect(photos) {
    this.eventBus.emit('photosSelected', photos);
  }

  handleOpenPhoto(data) {
    if (this.modals.photoViewer) {
      this.modals.photoViewer.open(data.photo, data.index);
    }
  }

  handleEditPhoto(photo) {
    // Implement photo editing functionality
    console.log('Edit photo:', photo);
  }

  handleDeletePhoto(photo) {
    this.showConfirmDialog(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      async () => {
        try {
          await this.services.photo.deletePhoto(photo.id);
        } catch (error) {
          console.error('Error deleting photo:', error);
          this.showErrorNotification('Failed to delete photo');
        }
      }
    );
  }

  handlePhotoUpdate(photo) {
    this.eventBus.emit('photoUpdated', photo);
  }

  handlePhotoDelete(photo) {
    this.eventBus.emit('photoDeleted', photo.id);
  }

  // Album event handlers
  handleAlbumCreated(album) {
    this.showSuccessNotification('Album created successfully');
    this.eventBus.emit('albumAdded', album);
  }

  handleAlbumDeleted(albumId) {
    this.showSuccessNotification('Album deleted successfully');
    this.eventBus.emit('albumRemoved', albumId);
  }

  handleAlbumUpdated(album) {
    this.showSuccessNotification('Album updated successfully');
    this.eventBus.emit('albumUpdated', album);
  }

  handleAlbumSelect(album) {
    this.components.router.navigate(`/photos/${album.id}`);
  }

  handleCreateAlbum() {
    // Implement album creation modal
    console.log('Create album');
  }

  handleOpenAlbum(data) {
    this.components.router.navigate(`/photos/${data.album.id}`);
  }

  handleUploadComplete(results) {
    this.showSuccessNotification(`${results.successful} photo(s) uploaded successfully`);
    
    if (results.failed > 0) {
      this.showErrorNotification(`${results.failed} photo(s) failed to upload`);
    }
  }

  // Settings handlers
  handleSettingsChange(settings) {
    // Save settings to localStorage
    try {
      localStorage.setItem('photo-album-preferences', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  handleThemeChange(theme) {
    this.setState({ theme });
    this.applyTheme(theme);
    
    // Save theme preference
    const preferences = { theme };
    try {
      localStorage.setItem('photo-album-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }

  // Global event handlers
  handleGlobalError(error) {
    console.error('Global error:', error);
    this.showErrorNotification('An unexpected error occurred');
  }

  handleShowError(message) {
    this.showErrorNotification(message);
  }

  handleShowSuccess(message) {
    this.showSuccessNotification(message);
  }

  handleGlobalKeydown(event) {
    // Global keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '/':
          event.preventDefault();
          this.components.router.navigate('/search');
          break;
        case 'h':
          event.preventDefault();
          this.components.router.navigate('/dashboard');
          break;
        case 'u':
          event.preventDefault();
          this.components.router.navigate('/upload');
          break;
      }
    }

    // Escape key to close modals
    if (event.key === 'Escape') {
      this.closeAllModals();
    }
  }

  // Utility methods
  updateNavigationUser(user) {
    // Navigation component doesn't currently display user info
    // This method is reserved for future use
    console.log('App: User updated:', user);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;
  }

  showSuccessNotification(message) {
    this.showNotification(message, 'success');
  }

  showErrorNotification(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info', duration = 5000) {
    if (!this.notificationsContainer) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close">×</button>
      </div>
    `;

    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.removeNotification(notification);
    });

    // Auto-remove after duration
    setTimeout(() => {
      this.removeNotification(notification);
    }, duration);

    this.notificationsContainer.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });
  }

  removeNotification(notification) {
    if (notification && notification.parentNode) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }

  showConfirmDialog(title, message, onConfirm, onCancel = null) {
    if (this.modals.confirmDialog) {
      this.modals.confirmDialog.open({
        title,
        content: message,
        type: 'confirm',
        onConfirm,
        onCancel
      });
    }
  }

  closeAllModals() {
    Object.values(this.modals).forEach(modal => {
      if (modal && modal.close) {
        modal.close();
      }
    });
  }

  // Public methods
  getService(serviceName) {
    return this.services[serviceName];
  }

  getCurrentUser() {
    return this.state.currentUser;
  }

  navigate(path) {
    return this.components.router.navigate(path);
  }

  // Performance Event Handlers
  handlePerformanceMetric(data) {
    this.performanceMetrics[data.type] = data.value;
    
    // Log significant performance events
    if (data.type === 'component-load' && data.value > 1000) {
      console.warn(`Slow component load: ${data.component} took ${data.value}ms`);
    }
  }

  async handleCacheClear(data) {
    try {
      if (data.type === 'images') {
        await this.imageCache.clear();
        this.showNotification('Image cache cleared', 'success');
      } else if (data.type === 'all') {
        await this.cacheManager.clear();
        await this.imageCache.clear();
        this.showNotification('All cache cleared', 'success');
      }
    } catch (error) {
      this.handleError(error, 'Failed to clear cache');
    }
  }

  // PWA Event Handlers
  handlePWAUpdate(event) {
    this.showNotification(
      'App update available',
      'info',
      [{
        text: 'Update Now',
        action: () => event.detail.action()
      }]
    );
  }

  handlePWAInstall(event) {
    this.showNotification(
      'Install app for better experience',
      'info',
      [{
        text: 'Install',
        action: () => event.detail.prompt()
      }]
    );
  }

  handleOfflineMode() {
    this.showNotification('You are offline. Some features may be limited.', 'warning');
    document.body.classList.add('offline-mode');
  }

  handleOnlineMode() {
    this.showNotification('You are back online!', 'success');
    document.body.classList.remove('offline-mode');
  }

  // Enhanced photo grid with virtual scrolling
  createVirtualPhotoGrid(container, photos) {
    const grid = new VirtualPhotoGrid(container, {
      itemHeight: 250,
      itemsPerRow: 4,
      buffer: 10,
      enableLazyLoading: true,
      enableImageOptimization: true
    });

    grid.setPhotos(photos);
    
    // Setup event handlers
    grid.on('photo:view', (data) => this.handlePhotoView(data.photo));
    grid.on('photo:edit', (data) => this.handlePhotoEdit(data.photo));
    grid.on('photo:delete', (data) => this.handlePhotoDelete(data.photo));
    grid.on('photo:select', (data) => this.handlePhotoSelect(data.photo));

    return grid;
  }

  // Performance monitoring helpers
  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      cacheStats: this.cacheManager.getStats(),
      imageCacheStats: this.imageCache.getStats(),
      webVitals: this.performanceMonitor.getWebVitals()
    };
  }

  // Cleanup
  destroy() {
    // Destroy all components
    Object.values(this.components).forEach(component => {
      if (component && component.destroy) {
        component.destroy();
      }
    });

    // Destroy all modals
    Object.values(this.modals).forEach(modal => {
      if (modal && modal.destroy) {
        modal.destroy();
      }
    });

    // Remove global event listeners
    window.removeEventListener('unhandledrejection', this.handleGlobalError);
    window.removeEventListener('error', this.handleGlobalError);
    document.removeEventListener('keydown', this.handleGlobalKeydown);

    // Clean up services (database service should be cleaned up last)
    const servicesToDestroy = Object.entries(this.services).filter(([key]) => key !== 'database');
    servicesToDestroy.forEach(([key, service]) => {
      if (service && service.destroy) {
        service.destroy();
      }
    });

    // Clean up database service last
    if (this.databaseService && this.databaseService.destroy) {
      this.databaseService.destroy();
    }

    super.destroy();
  }

  // Add method to get database service for other components that might need it
  getDatabaseService() {
    return this.databaseService;
  }

  // Add missing setState method
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.updateState();
  }

  // Add missing photo event handlers
  handlePhotoView(photo) {
    this.handleOpenPhoto({ photo, index: 0 });
  }

  handlePhotoEdit(photo) {
    // Navigate to edit mode or open edit modal
    this.eventBus.emit('editPhoto', photo);
  }
}