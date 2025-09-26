import './styles/main.css'
import './styles/auth.css'

import { DatabaseService } from './services/database-service.js'
import { AuthenticationService } from './services/auth-service.js'
import { AlbumService } from './services/album-service.js'
import { PhotoService } from './services/photo-service.js'

import { AuthComponent } from './components/auth/AuthComponent.js'
import { Dashboard } from './components/dashboard/Dashboard.js'
import { notifications } from './components/common/NotificationManager.js'

/**
 * Main Application class
 */
class PhotoAlbumApp {
  constructor() {
    this.currentUser = null
    this.services = {}
    this.components = {}
    this.initialized = false
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      this.showLoadingScreen('Initializing application...')

      // Initialize services
      await this.initializeServices()

      // Check for existing session
      await this.checkExistingSession()

      // Initialize UI
      this.initializeUI()

      // Mount notification system
      notifications.mount(document.body)

      this.initialized = true
      this.hideLoadingScreen()

      console.log('Photo Album App initialized successfully')
    } catch (error) {
      console.error('Failed to initialize application:', error)
      this.showError('Failed to initialize application. Please refresh the page.')
    }
  }

  /**
   * Initialize all services
   */
  async initializeServices() {
    try {
      // Initialize database service
      this.services.database = new DatabaseService()
      await this.services.database.initialize()

      // Initialize authentication service
      this.services.auth = new AuthenticationService(this.services.database)

      // Initialize album service
      this.services.albums = new AlbumService(this.services.database)

      // Initialize photo service
      this.services.photos = new PhotoService(this.services.database)

      console.log('All services initialized successfully')
    } catch (error) {
      console.error('Service initialization failed:', error)
      throw new Error('Failed to initialize application services')
    }
  }

  /**
   * Check for existing user session
   */
  async checkExistingSession() {
    try {
      const sessionToken = localStorage.getItem('sessionToken')
      if (sessionToken) {
        const result = await this.services.auth.validateSession(sessionToken)
        if (result.success) {
          this.currentUser = result.user
          console.log('Restored user session:', this.currentUser)
          return true
        } else {
          // Clear invalid session
          localStorage.removeItem('sessionToken')
        }
      }
    } catch (error) {
      console.error('Session validation failed:', error)
      localStorage.removeItem('sessionToken')
    }
    return false
  }

  /**
   * Initialize user interface
   */
  initializeUI() {
    // Get main sections
    const loadingScreen = document.getElementById('loading-screen')
    const mainContent = document.getElementById('main-content')
    const authSection = document.getElementById('auth-section')
    const dashboardSection = document.getElementById('dashboard-section')

    if (!mainContent || !authSection || !dashboardSection) {
      throw new Error('Required DOM elements not found')
    }

    // Initialize authentication component
    this.components.auth = new AuthComponent(
      this.services.auth,
      (user) => this.handleAuthSuccess(user)
    )

    // Mount auth component
    const authFormsContainer = document.getElementById('auth-forms')
    if (authFormsContainer) {
      this.components.auth.mount(authFormsContainer, true)
    }

    // Initialize logout handler
    const logoutBtn = document.getElementById('logout-btn')
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout())
    }

    // Show appropriate section based on authentication state
    if (this.currentUser) {
      this.showDashboard()
    } else {
      this.showAuth()
    }
  }

  /**
   * Handle successful authentication
   */
  handleAuthSuccess(user) {
    this.currentUser = user
    
    // Store session token
    if (user.sessionToken) {
      localStorage.setItem('sessionToken', user.sessionToken)
    }

    // Show dashboard
    this.showDashboard()

    console.log('User authenticated:', user)
  }

  /**
   * Handle user logout
   */
  async handleLogout() {
    try {
      const sessionToken = localStorage.getItem('sessionToken')
      if (sessionToken) {
        await this.services.auth.logoutSession(sessionToken)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local session data
      this.currentUser = null
      localStorage.removeItem('sessionToken')
      
      // Reset auth component
      if (this.components.auth) {
        this.components.auth.reset()
      }

      // Show auth section
      this.showAuth()
      
      notifications.info('You have been signed out successfully.')
    }
  }

  /**
   * Show authentication section
   */
  showAuth() {
    const authSection = document.getElementById('auth-section')
    const dashboardSection = document.getElementById('dashboard-section')
    const photoSection = document.getElementById('photo-section')

    if (authSection) authSection.style.display = 'block'
    if (dashboardSection) dashboardSection.style.display = 'none'
    if (photoSection) photoSection.style.display = 'none'

    // Focus auth form
    if (this.components.auth) {
      setTimeout(() => {
        if (this.components.auth.getCurrentForm() === 'login') {
          this.components.auth.loginForm?.focus()
        } else {
          this.components.auth.registerForm?.focus()
        }
      }, 100)
    }
  }

  /**
   * Show dashboard section
   */
  async showDashboard() {
    const authSection = document.getElementById('auth-section')
    const dashboardSection = document.getElementById('dashboard-section')
    const photoSection = document.getElementById('photo-section')

    if (authSection) authSection.style.display = 'none'
    if (dashboardSection) dashboardSection.style.display = 'block'
    if (photoSection) photoSection.style.display = 'none'

    // Initialize dashboard component if not already done
    if (!this.components.dashboard) {
      await this.initializeDashboard()
    }
  }

  /**
   * Initialize dashboard component
   */
  async initializeDashboard() {
    try {
      // Create dashboard component
      this.components.dashboard = new Dashboard(
        this.services.albums,
        this.services.auth,
        {
          onAlbumOpen: this.handleAlbumOpen.bind(this),
          onCreateAlbumModal: this.handleCreateAlbumModal.bind(this),
          onEditAlbumModal: this.handleEditAlbumModal.bind(this)
        }
      )

      // Listen for dashboard events
      this.components.dashboard.on('error', (error) => {
        console.error('Dashboard error:', error)
        notifications.error(error.message || 'An error occurred')
      })

      this.components.dashboard.on('logout', () => {
        this.handleLogout()
      })

      this.components.dashboard.on('albumOpen', (album) => {
        console.log('Opening album:', album)
        // TODO: Navigate to album view
      })

      this.components.dashboard.on('albumDelete', (album) => {
        notifications.success(`Album "${album.name}" deleted successfully`)
      })

      this.components.dashboard.on('albumReorder', (data) => {
        console.log('Albums reordered:', data)
      })

      // Mount dashboard component
      const dashboardSection = document.getElementById('dashboard-section')
      if (dashboardSection) {
        dashboardSection.innerHTML = ''
        const dashboardElement = await this.components.dashboard.render()
        dashboardSection.appendChild(dashboardElement)
      }

    } catch (error) {
      console.error('Failed to initialize dashboard:', error)
      notifications.error('Failed to load dashboard')
    }
  }

  /**
   * Handle album open
   */
  handleAlbumOpen(album) {
    console.log('Opening album:', album)
    // TODO: Implement album view navigation
    notifications.info(`Opening album: ${album.name}`)
  }

  /**
   * Handle create album modal
   */
  async handleCreateAlbumModal(options = {}) {
    try {
      // For now, use a simple prompt - replace with proper modal later
      const albumName = prompt(
        'Enter album name:',
        options.defaultName || 'New Album'
      )

      if (!albumName) return null

      // Create album
      const albumData = {
        name: albumName.trim(),
        description: '',
        userId: this.currentUser.id
      }

      const album = await this.services.albums.createAlbum(albumData)
      
      // If files were provided, upload them
      if (options.files && options.files.length > 0) {
        // TODO: Implement photo upload
        console.log('TODO: Upload photos to album:', options.files)
      }

      notifications.success(`Album "${album.name}" created successfully`)
      return { album }

    } catch (error) {
      console.error('Failed to create album:', error)
      notifications.error('Failed to create album')
      throw error
    }
  }

  /**
   * Handle edit album modal
   */
  async handleEditAlbumModal(album) {
    try {
      // For now, use a simple prompt - replace with proper modal later
      const newName = prompt('Enter new album name:', album.name)

      if (!newName || newName.trim() === album.name) return

      // Update album
      const updatedAlbum = await this.services.albums.updateAlbum(album.id, {
        name: newName.trim()
      })

      // Update dashboard
      if (this.components.dashboard) {
        this.components.dashboard.updateAlbum(album.id, updatedAlbum)
      }

      notifications.success(`Album renamed to "${updatedAlbum.name}"`)

    } catch (error) {
      console.error('Failed to update album:', error)
      notifications.error('Failed to update album')
    }
  }

  /**
   * Load user albums (legacy method for compatibility)
   */
  async loadUserAlbums() {
    try {
      // This is handled by the Dashboard component now
      console.log('Albums are now managed by the Dashboard component')
    } catch (error) {
      console.error('Failed to load albums:', error)
      notifications.error('Failed to load albums. Please try refreshing the page.')
    }
  }

  /**
   * Show loading screen
   */
  showLoadingScreen(message = 'Loading...') {
    const loadingScreen = document.getElementById('loading-screen')
    const mainContent = document.getElementById('main-content')
    
    if (loadingScreen) {
      loadingScreen.style.display = 'flex'
      const loadingText = loadingScreen.querySelector('p')
      if (loadingText) {
        loadingText.textContent = message
      }
    }
    
    if (mainContent) {
      mainContent.style.display = 'none'
    }
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen')
    const mainContent = document.getElementById('main-content')
    
    if (loadingScreen) {
      loadingScreen.style.display = 'none'
    }
    
    if (mainContent) {
      mainContent.style.display = 'block'
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.hideLoadingScreen()
    notifications.error(message)
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser
  }

  /**
   * Get service instance
   */
  getService(name) {
    return this.services[name]
  }

  /**
   * Check if app is initialized
   */
  isInitialized() {
    return this.initialized
  }
}

// Initialize and start the application
const app = new PhotoAlbumApp()

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init())
} else {
  app.init()
}

// Export app instance for debugging
window.photoAlbumApp = app

export default app