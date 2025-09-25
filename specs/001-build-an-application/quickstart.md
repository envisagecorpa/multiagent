# Quickstart Guide: Photo Album Organization Application

**Feature**: Photo Album Organization Application  
**Branch**: 001-build-an-application  
**Date**: 2025-09-24

## Overview

This guide provides step-by-step instructions for setting up, developing, and running the Photo Album Organization Application. The application is a client-side web app built with Vite, vanilla JavaScript, and SQLite WASM for local data storage.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher (comes with Node.js)
- **Modern Browser**: Chrome 88+, Firefox 85+, or Safari 14+
- **Git**: For version control

### Development Tools (Recommended)
- **VS Code**: With recommended extensions
- **Chrome DevTools**: For debugging and performance analysis

## Initial Setup

### 1. Clone and Initialize Project

```bash
# Clone the repository
git clone <repository-url>
cd photo-album-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Project Structure

```
photo-album-app/
├── src/
│   ├── components/           # UI components
│   │   ├── auth/            # Authentication components
│   │   ├── album/           # Album management components
│   │   ├── photo/           # Photo display components
│   │   └── common/          # Shared components
│   ├── services/            # Business logic services
│   │   ├── auth-service.js  # User authentication
│   │   ├── album-service.js # Album management
│   │   ├── photo-service.js # Photo handling
│   │   └── db-service.js    # Database operations
│   ├── utils/               # Utility functions
│   │   ├── file-utils.js    # File handling utilities
│   │   ├── image-utils.js   # Image processing utilities
│   │   └── validation.js    # Input validation
│   ├── styles/              # CSS files
│   │   ├── main.css         # Global styles
│   │   ├── components.css   # Component styles
│   │   └── responsive.css   # Responsive design
│   ├── assets/              # Static assets
│   └── main.js              # Application entry point
├── public/
│   ├── index.html           # Main HTML file
│   └── favicon.ico          # App icon
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
├── docs/                    # Documentation
├── vite.config.js           # Vite configuration
├── package.json             # Dependencies and scripts
└── README.md                # Project documentation
```

### 3. Configure Development Environment

#### VS Code Extensions
Install these recommended extensions:
- **ES6 String HTML**: HTML syntax highlighting in template literals
- **SQLite Viewer**: View SQLite database files
- **Live Server**: Alternative development server
- **Prettier**: Code formatting
- **ESLint**: Code linting

#### Vite Configuration
The `vite.config.js` includes special configuration for SQLite WASM:

```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    fs: {
      allow: ['..'] // Allow serving files from parent directories
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm']
  },
  build: {
    target: 'es2022'
  }
})
```

## Development Workflow

### 1. Database Setup

The application uses SQLite WASM for client-side data storage. The database is automatically initialized on first run:

```javascript
// src/services/db-service.js
import sqlite3InitModule from '@sqlite.org/sqlite-wasm'

class DatabaseService {
  async init() {
    const sqlite3 = await sqlite3InitModule()
    this.db = new sqlite3.oo1.DB('/photo-albums.db', 'ct')
    await this.createTables()
  }
  
  async createTables() {
    // Create users, albums, photos, user_sessions tables
    // See data-model.md for complete schema
  }
}
```

### 2. Authentication Flow

#### User Registration
```javascript
// Register new user
const authService = new AuthenticationService()
const result = await authService.registerUser(
  'user@example.com', 
  'securePassword123',
  'John Doe'
)

if (result.success) {
  // Store session token and redirect to main app
  localStorage.setItem('sessionToken', result.user.sessionToken)
  window.location.href = '/app'
} else {
  // Display error message
  showError(result.error)
}
```

#### User Login
```javascript
// Login existing user
const result = await authService.loginUser('user@example.com', 'password')

if (result.success) {
  localStorage.setItem('sessionToken', result.user.sessionToken)
  loadUserAlbums()
} else {
  showError('Invalid credentials')
}
```

### 3. Album Management

#### Create Album
```javascript
const albumService = new AlbumService()

// Create new album
const album = await albumService.createAlbum(
  userId, 
  'Summer Vacation 2024',
  'Photos from our amazing summer trip'
)

// Add to UI
renderAlbum(album)
```

#### Drag-and-Drop Reordering
```javascript
// Handle drag-drop reordering
function handleAlbumDragEnd(draggedAlbumId, newPosition) {
  const reorderedAlbums = calculateNewOrder(albums, draggedAlbumId, newPosition)
  
  const albumOrders = reorderedAlbums.map((album, index) => ({
    albumId: album.id,
    sortOrder: index + 1
  }))
  
  await albumService.updateAlbumOrder(userId, albumOrders)
  rerenderAlbums(reorderedAlbums)
}
```

### 4. Photo Management

#### Add Photos to Album
```javascript
const photoService = new PhotoService()

// Handle file selection
async function handlePhotoUpload(files, albumId) {
  try {
    const photos = await photoService.addPhotosToAlbum(userId, albumId, files)
    
    // Update UI with new photos
    photos.forEach(photo => renderPhotoTile(photo))
    
    // Update album photo count
    updateAlbumPhotoCount(albumId, photos.length)
    
  } catch (error) {
    showError(`Failed to add photos: ${error.message}`)
  }
}

// Wire up file input
document.getElementById('photo-input').addEventListener('change', (e) => {
  handlePhotoUpload(e.target.files, currentAlbumId)
})
```

#### Display Photos in Grid
```javascript
// Render photo tile with lazy loading
function renderPhotoGrid(albumId) {
  const container = document.getElementById('photo-tile')
  
  // Implement virtual scrolling for performance
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadPhotoThumbnail(entry.target)
      }
    })
  })
  
  photos.forEach(photo => {
    const tile = createPhotoTile(photo)
    container.appendChild(tile)
    observer.observe(tile)
  })
}
```

### 5. Photo Modal and Interactions

#### Full-Size Photo Modal
```javascript
// Show photo in modal overlay
function showPhotoModal(photoId) {
  const modal = document.getElementById('photo-modal')
  const img = modal.querySelector('img')
  
  // Load full-size image
  img.src = getPhotoUrl(photoId)
  img.alt = getPhotoAltText(photoId)
  
  // Show modal with proper focus management
  modal.classList.add('active')
  modal.querySelector('.close-button').focus()
  
  // Handle keyboard navigation
  document.addEventListener('keydown', handleModalKeydown)
}

function handleModalKeydown(e) {
  switch (e.key) {
    case 'Escape':
      closePhotoModal()
      break
    case 'ArrowLeft':
      showPreviousPhoto()
      break
    case 'ArrowRight':
      showNextPhoto()
      break
  }
}
```

## Testing

### 1. Unit Tests (Vitest)

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

Example unit test:
```javascript
// tests/unit/album-service.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { AlbumService } from '../../src/services/album-service.js'

describe('AlbumService', () => {
  let albumService
  
  beforeEach(() => {
    albumService = new AlbumService()
  })
  
  it('should create album with auto-numbered duplicate names', async () => {
    // Test duplicate name handling
    const album1 = await albumService.createAlbum(1, 'Summer 2024')
    const album2 = await albumService.createAlbum(1, 'Summer 2024')
    
    expect(album1.name).toBe('Summer 2024')
    expect(album2.name).toBe('Summer 2024 (2)')
  })
})
```

### 2. End-to-End Tests (Playwright)

```bash
# Run e2e tests
npm run test:e2e

# Run e2e tests in headed mode
npm run test:e2e:headed
```

Example e2e test:
```javascript
// tests/e2e/album-management.spec.js
import { test, expect } from '@playwright/test'

test('user can create and reorder albums', async ({ page }) => {
  await page.goto('/app')
  
  // Login
  await page.fill('[data-testid="email"]', 'test@example.com')
  await page.fill('[data-testid="password"]', 'password123')
  await page.click('[data-testid="login-button"]')
  
  // Create album
  await page.click('[data-testid="create-album-button"]')
  await page.fill('[data-testid="album-name"]', 'Test Album')
  await page.click('[data-testid="save-album"]')
  
  // Verify album appears
  await expect(page.locator('[data-testid="album-tile"]')).toContainText('Test Album')
  
  // Test drag-drop reordering
  await page.dragAndDrop('[data-album-id="1"]', '[data-album-id="2"]')
  
  // Verify new order persisted
  await page.reload()
  // Assert new order...
})
```

## Performance Optimization

### 1. Image Optimization
- Generate multiple thumbnail sizes (150px, 300px, 600px)
- Use WebP format when supported with JPEG fallback
- Implement lazy loading for photo tiles
- Cache thumbnails in IndexedDB

### 2. Virtual Scrolling
For albums with many photos, implement virtual scrolling:

```javascript
class VirtualPhotoGrid {
  constructor(container, photos, itemHeight = 200) {
    this.container = container
    this.photos = photos
    this.itemHeight = itemHeight
    this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2
    
    this.setupScrollListener()
    this.render()
  }
  
  render() {
    const scrollTop = this.container.scrollTop
    const startIndex = Math.floor(scrollTop / this.itemHeight)
    const endIndex = Math.min(startIndex + this.visibleItems, this.photos.length)
    
    // Render only visible photo tiles
    this.renderVisiblePhotos(startIndex, endIndex)
  }
}
```

### 3. Database Optimization
- Use prepared statements for all queries
- Implement proper indexing on frequently queried columns
- Batch database operations when possible
- Clean up expired sessions regularly

## Deployment

### 1. Build for Production

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

### 2. Static Hosting

The application can be deployed to any static hosting service:

```bash
# Deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist

# Deploy to Vercel
npm install -g vercel
vercel --prod
```

### 3. Performance Monitoring

Add performance monitoring to track Core Web Vitals:

```javascript
// src/utils/performance.js
function measureWebVitals() {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log)
    getFID(console.log)
    getFCP(console.log)
    getLCP(console.log)
    getTTFB(console.log)
  })
}

// Call on app initialization
measureWebVitals()
```

## Troubleshooting

### Common Issues

#### 1. SQLite WASM Not Loading
**Problem**: Database initialization fails
**Solution**: Check CORS headers and ensure proper Vite configuration

#### 2. Photo Upload Fails
**Problem**: Large photos cause memory issues
**Solution**: Implement image resizing before processing

#### 3. Drag-Drop Not Working on Mobile
**Problem**: Touch events not properly handled
**Solution**: Use Pointer Events API with touch polyfills

#### 4. Performance Issues with Large Albums
**Problem**: Slow rendering with 200+ photos
**Solution**: Implement virtual scrolling and lazy loading

### Debug Tools

```javascript
// Enable debug mode
localStorage.setItem('debug', 'true')

// View database contents in console
window.debugDB = async () => {
  const db = await DatabaseService.getInstance()
  const albums = await db.query('SELECT * FROM albums')
  console.table(albums)
}
```

## Next Steps

1. **Add Features**: Implement photo search, album sharing, batch operations
2. **Improve Performance**: Add service worker for offline support
3. **Enhance UX**: Add photo editing tools, better mobile gestures
4. **Add Analytics**: Track user engagement and performance metrics
5. **Implement Backup**: Add export/import functionality for user data

For additional help, see the detailed specifications in `spec.md` and service contracts in the `contracts/` directory.