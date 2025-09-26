/**
 * Virtual Photo Grid Component
 * High-performance photo grid with virtual scrolling for large datasets
 */

import { Component } from './common/Component.js';
import { VirtualScroller, ImageOptimizer, lazyLoader } from '../utils/PerformanceUtils.js';
import { imageCache } from '../utils/CacheManager.js';

export class VirtualPhotoGrid extends Component {
  constructor(container, options = {}) {
    super(container);
    
    this.options = {
      itemHeight: 200,
      itemsPerRow: 4,
      gap: 16,
      buffer: 10,
      enableLazyLoading: true,
      enableImageOptimization: true,
      thumbnailSize: { width: 300, height: 300 },
      ...options
    };

    this.photos = [];
    this.filteredPhotos = [];
    this.virtualScroller = null;
    this.resizeObserver = null;
    this.loadingElements = new Set();
    
    this.bindMethods();
  }

  render() {
    this.container.innerHTML = `
      <div class="virtual-photo-grid">
        <div class="grid-header">
          <div class="grid-stats">
            <span class="photo-count">0 photos</span>
            <span class="performance-info"></span>
          </div>
          <div class="grid-controls">
            <div class="view-options">
              <button class="grid-size-btn" data-size="small" title="Small grid">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                </svg>
              </button>
              <button class="grid-size-btn active" data-size="medium" title="Medium grid">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <rect x="4" y="4" width="6" height="6"/>
                  <rect x="14" y="4" width="6" height="6"/>
                  <rect x="4" y="14" width="6" height="6"/>
                  <rect x="14" y="14" width="6" height="6"/>
                </svg>
              </button>
              <button class="grid-size-btn" data-size="large" title="Large grid">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <rect x="6" y="6" width="12" height="12"/>
                </svg>
              </button>
            </div>
            <button class="performance-btn" title="Performance settings">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97L2.46 14.6c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.31.61.22l2.49-1c.52.39 1.06.73 1.69.98l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.25 1.17-.59 1.69-.98l2.49 1c.22.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div class="virtual-grid-container" tabindex="0" role="grid" aria-label="Photo grid">
          <div class="grid-loading" style="display: none;">
            <div class="loading-spinner"></div>
            <p>Loading photos...</p>
          </div>
          
          <div class="grid-empty" style="display: none;">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" width="48" height="48">
                <path d="M21,17H7V3A1,1 0 0,0 6,2H4A1,1 0 0,0 3,3V17A4,4 0 0,0 7,21H21A1,1 0 0,0 22,20V18A1,1 0 0,0 21,17M5,17V4H5V17A2,2 0 0,1 7,19H19V17H7A2,2 0 0,1 5,17Z"/>
              </svg>
            </div>
            <h3>No photos found</h3>
            <p>Upload some photos to get started</p>
          </div>
        </div>
        
        <div class="performance-overlay" style="display: none;">
          <div class="performance-stats">
            <h3>Performance Statistics</h3>
            <div class="stat-group">
              <div class="stat">
                <label>Rendered Items:</label>
                <span class="rendered-count">0</span>
              </div>
              <div class="stat">
                <label>Total Items:</label>
                <span class="total-count">0</span>
              </div>
              <div class="stat">
                <label>Memory Usage:</label>
                <span class="memory-usage">0 MB</span>
              </div>
              <div class="stat">
                <label>FPS:</label>
                <span class="fps-counter">0</span>
              </div>
              <div class="stat">
                <label>Load Time:</label>
                <span class="load-time">0ms</span>
              </div>
            </div>
            <button class="close-performance">Close</button>
          </div>
        </div>
      </div>
    `;

    this.setupVirtualScrolling();
    this.setupEventListeners();
    this.setupResizeObserver();
    this.updateGridLayout();
  }

  setupVirtualScrolling() {
    const container = this.container.querySelector('.virtual-grid-container');
    
    this.virtualScroller = new VirtualScroller(container, {
      itemHeight: this.calculateItemHeight(),
      buffer: this.options.buffer,
      tolerance: 50
    });

    // Override renderItem method
    this.virtualScroller.renderItem = (photo, index) => {
      return this.renderPhotoItem(photo, index);
    };
  }

  setupEventListeners() {
    // Grid size controls
    this.container.querySelectorAll('.grid-size-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleGridSizeChange(e.target.dataset.size);
      });
    });

    // Performance overlay
    const perfBtn = this.container.querySelector('.performance-btn');
    const perfOverlay = this.container.querySelector('.performance-overlay');
    const closeBtn = this.container.querySelector('.close-performance');

    perfBtn.addEventListener('click', () => {
      perfOverlay.style.display = 'flex';
      this.updatePerformanceStats();
    });

    closeBtn.addEventListener('click', () => {
      perfOverlay.style.display = 'none';
    });

    // Keyboard navigation
    const gridContainer = this.container.querySelector('.virtual-grid-container');
    gridContainer.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
  }

  setupResizeObserver() {
    if (!window.ResizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateGridLayout();
    });

    this.resizeObserver.observe(this.container);
  }

  calculateItemHeight() {
    const containerWidth = this.container.clientWidth || 800;
    const itemWidth = (containerWidth - (this.options.itemsPerRow - 1) * this.options.gap) / this.options.itemsPerRow;
    return itemWidth + 60; // Add space for metadata
  }

  calculateItemsPerRow() {
    const containerWidth = this.container.clientWidth || 800;
    const minItemWidth = 150;
    return Math.floor(containerWidth / (minItemWidth + this.options.gap));
  }

  updateGridLayout() {
    this.options.itemsPerRow = this.calculateItemsPerRow();
    this.options.itemHeight = this.calculateItemHeight();
    
    if (this.virtualScroller) {
      this.virtualScroller.options.itemHeight = this.options.itemHeight;
      this.virtualScroller.updateVisibleItems();
    }

    // Update CSS custom properties
    this.container.style.setProperty('--grid-columns', this.options.itemsPerRow);
    this.container.style.setProperty('--grid-gap', `${this.options.gap}px`);
    this.container.style.setProperty('--item-height', `${this.options.itemHeight}px`);
  }

  renderPhotoItem(photo, index) {
    const item = document.createElement('div');
    item.className = 'virtual-photo-item';
    item.setAttribute('role', 'gridcell');
    item.setAttribute('tabindex', '-1');
    item.dataset.photoId = photo.id;
    item.dataset.index = index;

    item.innerHTML = `
      <div class="photo-card">
        <div class="photo-container">
          <div class="photo-placeholder">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19C20.1,21 21,20.1 21,19Z"/>
            </svg>
          </div>
          <img class="photo-image" alt="${photo.title || 'Photo'}" style="display: none;">
          <div class="photo-overlay">
            <div class="photo-actions">
              <button class="action-btn view-btn" title="View photo">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                </svg>
              </button>
              <button class="action-btn edit-btn" title="Edit photo">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                </svg>
              </button>
              <button class="action-btn delete-btn" title="Delete photo">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div class="photo-info">
          <h4 class="photo-title">${photo.title || 'Untitled'}</h4>
          <div class="photo-meta">
            <span class="photo-date">${this.formatDate(photo.createdAt)}</span>
            <span class="photo-size">${this.formatFileSize(photo.fileSize)}</span>
          </div>
        </div>
      </div>
    `;

    // Setup lazy loading
    if (this.options.enableLazyLoading) {
      this.setupLazyLoading(item, photo);
    } else {
      this.loadPhoto(item, photo);
    }

    // Setup event handlers
    this.setupItemEventHandlers(item, photo);

    return item;
  }

  setupLazyLoading(item, photo) {
    const placeholder = item.querySelector('.photo-placeholder');
    const img = item.querySelector('.photo-image');

    lazyLoader.observe(item, async () => {
      try {
        placeholder.classList.add('loading');
        await this.loadPhoto(item, photo);
        placeholder.style.display = 'none';
        img.style.display = 'block';
        item.classList.add('loaded');
      } catch (error) {
        console.error('Failed to load photo:', error);
        placeholder.classList.add('error');
      }
    });
  }

  async loadPhoto(item, photo) {
    const img = item.querySelector('.photo-image');
    const placeholder = item.querySelector('.photo-placeholder');

    try {
      // Check cache first
      let imageUrl = await imageCache.get(photo.thumbnailUrl || photo.url);
      
      if (!imageUrl) {
        // Generate or load thumbnail
        if (this.options.enableImageOptimization && photo.file) {
          const thumbnail = await ImageOptimizer.generateThumbnail(
            photo.file,
            this.options.thumbnailSize.width,
            this.options.thumbnailSize.height
          );
          imageUrl = URL.createObjectURL(thumbnail);
          
          // Cache the thumbnail
          await imageCache.set(photo.thumbnailUrl || photo.url, imageUrl, {
            tags: ['thumbnail'],
            priority: 'normal'
          });
        } else {
          imageUrl = photo.thumbnailUrl || photo.url;
        }
      }

      // Load image
      await this.loadImage(img, imageUrl);
      
      // Update loading state
      placeholder.style.display = 'none';
      img.style.display = 'block';
      item.classList.add('loaded');
      
    } catch (error) {
      console.error('Failed to load photo:', error);
      placeholder.classList.add('error');
      
      // Show error state
      placeholder.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V19A2,2 0 0,0 5,21H11V19H5V3H13V9H21Z"/>
        </svg>
      `;
    }
  }

  loadImage(img, src) {
    return new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
  }

  setupItemEventHandlers(item, photo) {
    // View button
    const viewBtn = item.querySelector('.view-btn');
    viewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.emit('photo:view', { photo, element: item });
    });

    // Edit button
    const editBtn = item.querySelector('.edit-btn');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.emit('photo:edit', { photo, element: item });
    });

    // Delete button
    const deleteBtn = item.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.emit('photo:delete', { photo, element: item });
    });

    // Item click
    item.addEventListener('click', () => {
      this.emit('photo:select', { photo, element: item });
    });

    // Keyboard support
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.emit('photo:select', { photo, element: item });
      }
    });
  }

  handleGridSizeChange(size) {
    // Update active button
    this.container.querySelectorAll('.grid-size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });

    // Update grid size
    switch (size) {
      case 'small':
        this.options.itemsPerRow = Math.min(6, this.calculateItemsPerRow());
        break;
      case 'medium':
        this.options.itemsPerRow = Math.min(4, this.calculateItemsPerRow());
        break;
      case 'large':
        this.options.itemsPerRow = Math.min(2, this.calculateItemsPerRow());
        break;
    }

    this.updateGridLayout();
    this.emit('grid:size-changed', { size });
  }

  handleKeyboardNavigation(event) {
    const focusedItem = document.activeElement;
    if (!focusedItem.classList.contains('virtual-photo-item')) return;

    const items = Array.from(this.container.querySelectorAll('.virtual-photo-item'));
    const currentIndex = items.indexOf(focusedItem);
    
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = Math.min(currentIndex + 1, items.length - 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + this.options.itemsPerRow, items.length - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - this.options.itemsPerRow, 0);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    if (nextIndex !== currentIndex && items[nextIndex]) {
      event.preventDefault();
      items[nextIndex].focus();
    }
  }

  // Public API
  setPhotos(photos) {
    this.photos = photos;
    this.filteredPhotos = [...photos];
    this.updateDisplay();
  }

  filterPhotos(filterFn) {
    this.filteredPhotos = this.photos.filter(filterFn);
    this.updateDisplay();
  }

  updateDisplay() {
    const container = this.container.querySelector('.virtual-grid-container');
    const loading = this.container.querySelector('.grid-loading');
    const empty = this.container.querySelector('.grid-empty');

    if (this.filteredPhotos.length === 0) {
      container.style.display = 'none';
      loading.style.display = 'none';
      empty.style.display = 'flex';
    } else {
      container.style.display = 'block';
      loading.style.display = 'none';
      empty.style.display = 'none';
      
      // Update virtual scroller
      if (this.virtualScroller) {
        this.virtualScroller.setItems(this.filteredPhotos);
      }
    }

    this.updateStats();
  }

  updateStats() {
    const photoCount = this.container.querySelector('.photo-count');
    const perfInfo = this.container.querySelector('.performance-info');

    photoCount.textContent = `${this.filteredPhotos.length} photos`;
    
    if (this.virtualScroller && this.virtualScroller.visibleItems) {
      const rendered = this.virtualScroller.visibleItems.length;
      perfInfo.textContent = `${rendered} rendered`;
    }
  }

  updatePerformanceStats() {
    const stats = {
      renderedCount: this.virtualScroller?.visibleItems?.length || 0,
      totalCount: this.filteredPhotos.length,
      memoryUsage: this.getMemoryUsage(),
      fps: this.getFPS(),
      loadTime: this.getLoadTime()
    };

    this.container.querySelector('.rendered-count').textContent = stats.renderedCount;
    this.container.querySelector('.total-count').textContent = stats.totalCount;
    this.container.querySelector('.memory-usage').textContent = `${stats.memoryUsage} MB`;
    this.container.querySelector('.fps-counter').textContent = Math.round(stats.fps);
    this.container.querySelector('.load-time').textContent = `${stats.loadTime}ms`;
  }

  getMemoryUsage() {
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
  }

  getFPS() {
    // Simple FPS counter - would be more accurate with actual frame monitoring
    return 60; // Placeholder
  }

  getLoadTime() {
    return performance.now() - (this.startTime || 0);
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  formatFileSize(bytes) {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }

  scrollToPhoto(photoId) {
    const index = this.filteredPhotos.findIndex(photo => photo.id === photoId);
    if (index !== -1 && this.virtualScroller) {
      this.virtualScroller.scrollToIndex(index);
    }
  }

  getSelectedPhotos() {
    return Array.from(this.container.querySelectorAll('.virtual-photo-item.selected'))
      .map(item => {
        const photoId = item.dataset.photoId;
        return this.filteredPhotos.find(photo => photo.id === photoId);
      })
      .filter(Boolean);
  }

  destroy() {
    if (this.virtualScroller) {
      this.virtualScroller.destroy();
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Revoke any created object URLs
    this.container.querySelectorAll('.photo-image').forEach(img => {
      if (img.src && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });

    super.destroy();
  }
}

export default VirtualPhotoGrid;