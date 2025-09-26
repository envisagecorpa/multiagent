import { Modal } from './Modal.js';

export class PhotoViewer extends Modal {
  constructor(photos, initialIndex = 0, options = {}) {
    super({
      size: 'fullscreen',
      className: 'modal-photo-viewer',
      closable: true,
      closeOnOverlayClick: true,
      closeOnEscape: true,
      title: '',
      ariaLabel: 'Photo viewer',
      ...options
    });

    this.photos = photos || [];
    this.currentIndex = Math.max(0, Math.min(initialIndex, this.photos.length - 1));
    this.isSlideshow = false;
    this.slideshowInterval = null;
    this.slideshowDelay = options.slideshowDelay || 5000;
    this.showThumbnails = options.showThumbnails !== false;
    this.showMetadata = options.showMetadata !== false;
    this.zoomLevel = 1;
    this.maxZoom = 5;
    this.minZoom = 0.1;
  }

  render() {
    super.render();
    
    // Override header to include navigation and controls
    if (this.header) {
      this.header.innerHTML = '';
      this.createViewerHeader();
    }

    // Create main viewer content
    this.createViewerContent();

    // Create thumbnail strip if enabled
    if (this.showThumbnails && this.photos.length > 1) {
      this.createThumbnailStrip();
    }

    // Create metadata panel if enabled
    if (this.showMetadata) {
      this.createMetadataPanel();
    }

    this.setupViewerEvents();
    this.updatePhoto();

    return this.overlay;
  }

  createViewerHeader() {
    // Photo counter
    const counter = this.createElement('div', {
      className: 'photo-viewer-counter',
      id: 'photo-counter'
    });
    this.header.appendChild(counter);

    // Controls
    const controls = this.createElement('div', {
      className: 'photo-viewer-controls'
    });

    // Previous button
    if (this.photos.length > 1) {
      this.prevButton = this.createElement('button', {
        className: 'photo-viewer-nav-btn',
        'aria-label': 'Previous photo',
        innerHTML: '‹'
      });
      this.prevButton.addEventListener('click', () => this.previousPhoto());
      controls.appendChild(this.prevButton);

      // Next button
      this.nextButton = this.createElement('button', {
        className: 'photo-viewer-nav-btn',
        'aria-label': 'Next photo',
        innerHTML: '›'
      });
      this.nextButton.addEventListener('click', () => this.nextPhoto());
      controls.appendChild(this.nextButton);
    }

    // Zoom controls
    const zoomOut = this.createElement('button', {
      className: 'photo-viewer-control-btn',
      'aria-label': 'Zoom out',
      innerHTML: '−'
    });
    zoomOut.addEventListener('click', () => this.zoomOut());
    controls.appendChild(zoomOut);

    this.zoomLevel = this.createElement('span', {
      className: 'photo-viewer-zoom-level',
      textContent: '100%'
    });
    controls.appendChild(this.zoomLevel);

    const zoomIn = this.createElement('button', {
      className: 'photo-viewer-control-btn',
      'aria-label': 'Zoom in',
      innerHTML: '+'
    });
    zoomIn.addEventListener('click', () => this.zoomIn());
    controls.appendChild(zoomIn);

    const resetZoom = this.createElement('button', {
      className: 'photo-viewer-control-btn',
      'aria-label': 'Reset zoom',
      textContent: 'Fit'
    });
    resetZoom.addEventListener('click', () => this.resetZoom());
    controls.appendChild(resetZoom);

    // Slideshow button
    if (this.photos.length > 1) {
      this.slideshowButton = this.createElement('button', {
        className: 'photo-viewer-control-btn',
        'aria-label': 'Start slideshow',
        innerHTML: '▶'
      });
      this.slideshowButton.addEventListener('click', () => this.toggleSlideshow());
      controls.appendChild(this.slideshowButton);
    }

    // Fullscreen button
    const fullscreenBtn = this.createElement('button', {
      className: 'photo-viewer-control-btn',
      'aria-label': 'Toggle fullscreen',
      innerHTML: '⛶'
    });
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    controls.appendChild(fullscreenBtn);

    this.header.appendChild(controls);

    // Close button
    const closeBtn = this.createElement('button', {
      className: 'modal-close',
      'aria-label': 'Close photo viewer',
      innerHTML: '×'
    });
    closeBtn.addEventListener('click', () => this.close());
    this.header.appendChild(closeBtn);
  }

  createViewerContent() {
    this.body.className = 'modal-body photo-viewer-body';
    
    // Main photo container
    this.photoContainer = this.createElement('div', {
      className: 'photo-viewer-main',
      id: 'photo-container'
    });

    // Photo element
    this.photoElement = this.createElement('img', {
      className: 'photo-viewer-image',
      alt: 'Photo',
      draggable: false
    });

    // Loading indicator
    this.loadingIndicator = this.createElement('div', {
      className: 'photo-viewer-loading',
      innerHTML: `
        <div class="photo-viewer-loading-spinner"></div>
        <div class="photo-viewer-loading-text">Loading photo...</div>
      `
    });

    this.photoContainer.appendChild(this.loadingIndicator);
    this.photoContainer.appendChild(this.photoElement);

    // Navigation arrows (for overlay on photo)
    if (this.photos.length > 1) {
      this.leftArrow = this.createElement('button', {
        className: 'photo-viewer-arrow photo-viewer-arrow-left',
        'aria-label': 'Previous photo',
        innerHTML: '‹'
      });
      this.leftArrow.addEventListener('click', () => this.previousPhoto());

      this.rightArrow = this.createElement('button', {
        className: 'photo-viewer-arrow photo-viewer-arrow-right',
        'aria-label': 'Next photo',
        innerHTML: '›'
      });
      this.rightArrow.addEventListener('click', () => this.nextPhoto());

      this.photoContainer.appendChild(this.leftArrow);
      this.photoContainer.appendChild(this.rightArrow);
    }

    this.body.appendChild(this.photoContainer);
  }

  createThumbnailStrip() {
    this.thumbnailStrip = this.createElement('div', {
      ClassName: 'photo-viewer-thumbnails',
      id: 'thumbnail-strip'
    });

    const thumbnailContainer = this.createElement('div', {
      className: 'photo-viewer-thumbnail-container'
    });

    this.photos.forEach((photo, index) => {
      const thumbnail = this.createElement('button', {
        className: 'photo-viewer-thumbnail',
        'aria-label': `View photo ${index + 1}`,
        'data-index': index
      });

      const img = this.createElement('img', {
        src: photo.thumbnailUrl || photo.url,
        alt: photo.title || `Photo ${index + 1}`,
        loading: 'lazy'
      });

      thumbnail.appendChild(img);
      thumbnail.addEventListener('click', () => this.goToPhoto(index));
      
      thumbnailContainer.appendChild(thumbnail);
    });

    this.thumbnailStrip.appendChild(thumbnailContainer);
    this.body.appendChild(this.thumbnailStrip);
  }

  createMetadataPanel() {
    this.metadataPanel = this.createElement('div', {
      className: 'photo-viewer-metadata',
      id: 'metadata-panel'
    });

    this.body.appendChild(this.metadataPanel);
  }

  setupViewerEvents() {
    // Keyboard navigation
    this.viewerKeyHandler = (e) => {
      if (!this.isVisible) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this.previousPhoto();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.nextPhoto();
          break;
        case ' ':
          e.preventDefault();
          this.toggleSlideshow();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case '+':
        case '=':
          e.preventDefault();
          this.zoomIn();
          break;
        case '-':
          e.preventDefault();
          this.zoomOut();
          break;
        case '0':
          e.preventDefault();
          this.resetZoom();
          break;
      }
    };

    document.addEventListener('keydown', this.viewerKeyHandler);

    // Mouse wheel zoom
    this.photoElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.zoom(this.currentZoom + delta);
    });

    // Photo load events
    this.photoElement.addEventListener('load', () => {
      this.hideLoading();
      this.resetZoom();
    });

    this.photoElement.addEventListener('error', () => {
      this.hideLoading();
      this.showError('Failed to load photo');
    });

    // Touch/drag for panning when zoomed
    this.setupPanEvents();
  }

  setupPanEvents() {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;

    const startDrag = (e) => {
      if (this.currentZoom <= 1) return;
      
      isDragging = true;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      
      startX = clientX - translateX;
      startY = clientY - translateY;
      
      this.photoElement.style.cursor = 'grabbing';
    };

    const drag = (e) => {
      if (!isDragging || this.currentZoom <= 1) return;
      
      e.preventDefault();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      
      translateX = clientX - startX;
      translateY = clientY - startY;
      
      this.updatePhotoTransform();
    };

    const endDrag = () => {
      isDragging = false;
      this.photoElement.style.cursor = this.currentZoom > 1 ? 'grab' : 'default';
    };

    // Mouse events
    this.photoElement.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    // Touch events
    this.photoElement.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', endDrag);

    // Store transform values
    this.panX = 0;
    this.panY = 0;
  }

  updatePhoto() {
    if (!this.photos.length) return;

    const currentPhoto = this.photos[this.currentIndex];
    if (!currentPhoto) return;

    // Update counter
    const counter = this.element.querySelector('#photo-counter');
    if (counter) {
      counter.textContent = `${this.currentIndex + 1} of ${this.photos.length}`;
    }

    // Update thumbnails
    if (this.thumbnailStrip) {
      const thumbnails = this.thumbnailStrip.querySelectorAll('.photo-viewer-thumbnail');
      thumbnails.forEach((thumb, index) => {
        thumb.classList.toggle('active', index === this.currentIndex);
      });

      // Scroll active thumbnail into view
      const activeThumbnail = thumbnails[this.currentIndex];
      if (activeThumbnail) {
        activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // Show loading
    this.showLoading();

    // Load photo
    this.photoElement.src = currentPhoto.url;
    this.photoElement.alt = currentPhoto.title || `Photo ${this.currentIndex + 1}`;

    // Update metadata
    this.updateMetadata(currentPhoto);

    // Update navigation buttons
    if (this.prevButton) {
      this.prevButton.disabled = this.currentIndex === 0;
    }
    if (this.nextButton) {
      this.nextButton.disabled = this.currentIndex === this.photos.length - 1;
    }

    // Update arrows
    if (this.leftArrow) {
      this.leftArrow.style.display = this.currentIndex === 0 ? 'none' : 'block';
    }
    if (this.rightArrow) {
      this.rightArrow.style.display = this.currentIndex === this.photos.length - 1 ? 'none' : 'block';
    }

    this.emit('photo-change', { photo: currentPhoto, index: this.currentIndex });
  }

  updateMetadata(photo) {
    if (!this.metadataPanel) return;

    const metadata = [];
    
    if (photo.title) {
      metadata.push(`<div class="photo-metadata-item"><strong>Title:</strong> ${photo.title}</div>`);
    }
    
    if (photo.description) {
      metadata.push(`<div class="photo-metadata-item"><strong>Description:</strong> ${photo.description}</div>`);
    }
    
    if (photo.createdAt) {
      const date = new Date(photo.createdAt).toLocaleString();
      metadata.push(`<div class="photo-metadata-item"><strong>Date:</strong> ${date}</div>`);
    }
    
    if (photo.fileSize) {
      const size = this.formatFileSize(photo.fileSize);
      metadata.push(`<div class="photo-metadata-item"><strong>Size:</strong> ${size}</div>`);
    }

    this.metadataPanel.innerHTML = metadata.length 
      ? `<div class="photo-metadata-content">${metadata.join('')}</div>`
      : '';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showLoading() {
    this.loadingIndicator.style.display = 'flex';
    this.photoElement.style.opacity = '0';
  }

  hideLoading() {
    this.loadingIndicator.style.display = 'none';
    this.photoElement.style.opacity = '1';
  }

  showError(message) {
    this.loadingIndicator.innerHTML = `
      <div class="photo-viewer-error">
        <div class="photo-viewer-error-icon">⚠</div>
        <div class="photo-viewer-error-message">${message}</div>
      </div>
    `;
  }

  previousPhoto() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updatePhoto();
    }
  }

  nextPhoto() {
    if (this.currentIndex < this.photos.length - 1) {
      this.currentIndex++;
      this.updatePhoto();
    }
  }

  goToPhoto(index) {
    if (index >= 0 && index < this.photos.length) {
      this.currentIndex = index;
      this.updatePhoto();
    }
  }

  zoom(level) {
    this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    this.updateZoomDisplay();
    this.updatePhotoTransform();
    
    // Update cursor
    this.photoElement.style.cursor = this.currentZoom > 1 ? 'grab' : 'default';
  }

  zoomIn() {
    this.zoom(this.currentZoom * 1.2);
  }

  zoomOut() {
    this.zoom(this.currentZoom / 1.2);
  }

  resetZoom() {
    this.currentZoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateZoomDisplay();
    this.updatePhotoTransform();
    this.photoElement.style.cursor = 'default';
  }

  updateZoomDisplay() {
    if (this.zoomLevelElement) {
      this.zoomLevelElement.textContent = `${Math.round(this.currentZoom * 100)}%`;
    }
  }

  updatePhotoTransform() {
    this.photoElement.style.transform = 
      `scale(${this.currentZoom}) translate(${this.panX}px, ${this.panY}px)`;
  }

  toggleSlideshow() {
    if (this.isSlideshow) {
      this.stopSlideshow();
    } else {
      this.startSlideshow();
    }
  }

  startSlideshow() {
    if (this.photos.length <= 1) return;

    this.isSlideshow = true;
    this.slideshowButton.innerHTML = '⏸';
    this.slideshowButton.setAttribute('aria-label', 'Pause slideshow');

    this.slideshowInterval = setInterval(() => {
      if (this.currentIndex < this.photos.length - 1) {
        this.nextPhoto();
      } else {
        this.goToPhoto(0); // Loop back to start
      }
    }, this.slideshowDelay);

    this.emit('slideshow-start');
  }

  stopSlideshow() {
    this.isSlideshow = false;
    if (this.slideshowInterval) {
      clearInterval(this.slideshowInterval);
      this.slideshowInterval = null;
    }

    if (this.slideshowButton) {
      this.slideshowButton.innerHTML = '▶';
      this.slideshowButton.setAttribute('aria-label', 'Start slideshow');
    }

    this.emit('slideshow-stop');
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.overlay.requestFullscreen();
    }
  }

  close() {
    this.stopSlideshow();
    super.close();
  }

  destroy() {
    this.stopSlideshow();
    
    if (this.viewerKeyHandler) {
      document.removeEventListener('keydown', this.viewerKeyHandler);
    }

    super.destroy();
  }

  // Public API methods
  getCurrentPhoto() {
    return this.photos[this.currentIndex];
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  getPhotos() {
    return this.photos;
  }

  setPhotos(photos, startIndex = 0) {
    this.photos = photos || [];
    this.currentIndex = Math.max(0, Math.min(startIndex, this.photos.length - 1));
    
    if (this.isVisible) {
      this.updatePhoto();
      
      // Recreate thumbnails if needed
      if (this.showThumbnails && this.thumbnailStrip) {
        this.thumbnailStrip.remove();
        this.createThumbnailStrip();
      }
    }
  }
}