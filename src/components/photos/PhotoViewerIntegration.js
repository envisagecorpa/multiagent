import { PhotoViewer } from '../modal/PhotoViewer.js';

export class PhotoViewerIntegration {
  constructor(photoService, options = {}) {
    this.photoService = photoService;
    this.options = {
      autoSlideshow: options.autoSlideshow || false,
      slideshowDelay: options.slideshowDelay || 5000,
      showThumbnails: options.showThumbnails !== false,
      showMetadata: options.showMetadata !== false,
      preloadCount: options.preloadCount || 3,
      ...options
    };

    this.currentViewer = null;
    this.preloadedImages = new Map();
  }

  async showPhoto(photo, albumId = null, context = {}) {
    try {
      // Get all photos in the same context (album or search results)
      let photos = [];
      let startIndex = 0;

      if (albumId) {
        photos = await this.photoService.getPhotosInAlbum(albumId);
        startIndex = photos.findIndex(p => p.id === photo.id);
      } else if (context.photos) {
        photos = context.photos;
        startIndex = photos.findIndex(p => p.id === photo.id);
      } else {
        photos = [photo];
        startIndex = 0;
      }

      // Ensure valid index
      if (startIndex === -1) {
        startIndex = 0;
      }

      // Create photo viewer
      this.currentViewer = new PhotoViewer(photos, startIndex, {
        ...this.options,
        onClose: () => {
          this.currentViewer = null;
        }
      });

      // Setup event handlers
      this.setupViewerEvents();

      // Show viewer
      this.currentViewer.render();
      this.currentViewer.show();

      // Start preloading adjacent photos
      this.preloadAdjacentPhotos(photos, startIndex);

      // Auto-start slideshow if enabled
      if (this.options.autoSlideshow && photos.length > 1) {
        setTimeout(() => {
          if (this.currentViewer) {
            this.currentViewer.startSlideshow();
          }
        }, 2000);
      }

      return this.currentViewer;

    } catch (error) {
      console.error('Failed to show photo viewer:', error);
      throw error;
    }
  }

  setupViewerEvents() {
    if (!this.currentViewer) return;

    // Listen for photo changes to preload adjacent photos
    this.currentViewer.on('photo-change', ({ index }) => {
      const photos = this.currentViewer.getPhotos();
      this.preloadAdjacentPhotos(photos, index);
    });

    // Listen for slideshow events
    this.currentViewer.on('slideshow-start', () => {
      console.log('Slideshow started');
    });

    this.currentViewer.on('slideshow-stop', () => {
      console.log('Slideshow stopped');
    });

    // Handle fullscreen events
    document.addEventListener('fullscreenchange', () => {
      if (this.currentViewer) {
        const isFullscreen = Boolean(document.fullscreenElement);
        this.currentViewer.emit('fullscreen-change', { isFullscreen });
      }
    });
  }

  preloadAdjacentPhotos(photos, currentIndex) {
    const toPreload = [];
    
    // Calculate indices to preload
    for (let i = 1; i <= this.options.preloadCount; i++) {
      const prevIndex = currentIndex - i;
      const nextIndex = currentIndex + i;
      
      if (prevIndex >= 0) toPreload.push(prevIndex);
      if (nextIndex < photos.length) toPreload.push(nextIndex);
    }

    // Preload images
    toPreload.forEach(index => {
      const photo = photos[index];
      if (photo && !this.preloadedImages.has(photo.id)) {
        this.preloadImage(photo);
      }
    });
  }

  preloadImage(photo) {
    const img = new Image();
    img.onload = () => {
      this.preloadedImages.set(photo.id, img);
    };
    img.onerror = () => {
      console.warn('Failed to preload image:', photo.url);
    };
    img.src = photo.url;
  }

  async showPhotosSlideshow(photos, options = {}) {
    if (!photos || photos.length === 0) {
      throw new Error('No photos provided for slideshow');
    }

    const slideshowOptions = {
      ...this.options,
      ...options,
      autoSlideshow: true,
      showThumbnails: photos.length > 1,
      showMetadata: true
    };

    this.currentViewer = new PhotoViewer(photos, 0, slideshowOptions);
    
    this.setupViewerEvents();
    
    this.currentViewer.render();
    this.currentViewer.show();

    // Start slideshow immediately
    if (photos.length > 1) {
      setTimeout(() => {
        if (this.currentViewer) {
          this.currentViewer.startSlideshow();
        }
      }, 1000);
    }

    // Preload all photos for smooth slideshow
    this.preloadAllPhotos(photos);

    return this.currentViewer;
  }

  preloadAllPhotos(photos) {
    photos.forEach(photo => {
      if (!this.preloadedImages.has(photo.id)) {
        this.preloadImage(photo);
      }
    });
  }

  closeViewer() {
    if (this.currentViewer) {
      this.currentViewer.close();
      this.currentViewer = null;
    }
  }

  isViewerOpen() {
    return this.currentViewer && this.currentViewer.isOpen();
  }

  getCurrentViewer() {
    return this.currentViewer;
  }

  // Static helper methods
  static async showPhotoFromAlbum(photoService, photoId, albumId, options = {}) {
    const integration = new PhotoViewerIntegration(photoService, options);
    
    try {
      const photo = await photoService.getPhoto(photoId);
      if (!photo) {
        throw new Error('Photo not found');
      }

      return await integration.showPhoto(photo, albumId);
    } catch (error) {
      console.error('Failed to show photo from album:', error);
      throw error;
    }
  }

  static async showSlideshowForAlbum(photoService, albumId, options = {}) {
    const integration = new PhotoViewerIntegration(photoService, options);
    
    try {
      const photos = await photoService.getPhotosInAlbum(albumId);
      if (!photos || photos.length === 0) {
        throw new Error('No photos found in album');
      }

      return await integration.showPhotosSlideshow(photos, options);
    } catch (error) {
      console.error('Failed to show album slideshow:', error);
      throw error;
    }
  }

  static async showRandomSlideshow(photoService, count = 20, options = {}) {
    const integration = new PhotoViewerIntegration(photoService, options);
    
    try {
      // Get random photos (this would need to be implemented in PhotoService)
      const photos = await photoService.getRandomPhotos(count);
      if (!photos || photos.length === 0) {
        throw new Error('No photos found for slideshow');
      }

      return await integration.showPhotosSlideshow(photos, {
        ...options,
        slideshowDelay: options.slideshowDelay || 3000 // Faster for random slideshow
      });
    } catch (error) {
      console.error('Failed to show random slideshow:', error);
      throw error;
    }
  }
}