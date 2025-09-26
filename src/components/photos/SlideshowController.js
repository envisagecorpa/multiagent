import { Component } from '../common/Component.js';
import { PhotoViewerIntegration } from './PhotoViewerIntegration.js';

export class SlideshowController extends Component {
  constructor(photoService, options = {}) {
    super();
    this.photoService = photoService;
    this.options = {
      autoStart: options.autoStart || false,
      defaultDelay: options.defaultDelay || 5000,
      randomOrder: options.randomOrder || false,
      loop: options.loop !== false,
      showControls: options.showControls !== false,
      ...options
    };

    this.isPlaying = false;
    this.currentViewer = null;
    this.playlist = [];
    this.currentIndex = 0;
  }

  render() {
    const element = this.createElement('div', {
      className: 'slideshow-controller'
    });

    if (this.options.showControls) {
      const controls = this.createControls();
      element.appendChild(controls);
    }

    this.element = element;
    return element;
  }

  createControls() {
    const controls = this.createElement('div', {
      className: 'slideshow-controls'
    });

    // Play/Pause button
    this.playButton = this.createElement('button', {
      className: 'slideshow-btn slideshow-play-btn',
      'aria-label': 'Start slideshow',
      innerHTML: '▶ Start Slideshow'
    });

    this.playButton.addEventListener('click', () => {
      this.isPlaying ? this.stop() : this.start();
    });

    controls.appendChild(this.playButton);

    // Album selector
    const albumSelector = this.createElement('select', {
      className: 'slideshow-album-select',
      'aria-label': 'Select album for slideshow'
    });

    const defaultOption = this.createElement('option', {
      value: '',
      textContent: 'All Photos'
    });
    albumSelector.appendChild(defaultOption);

    albumSelector.addEventListener('change', (e) => {
      this.selectedAlbumId = e.target.value || null;
    });

    controls.appendChild(albumSelector);

    // Speed control
    const speedControl = this.createElement('div', {
      className: 'slideshow-speed-control'
    });

    const speedLabel = this.createElement('label', {
      textContent: 'Speed: ',
      htmlFor: 'slideshow-speed'
    });

    this.speedSlider = this.createElement('input', {
      type: 'range',
      id: 'slideshow-speed',
      className: 'slideshow-speed-slider',
      min: '1000',
      max: '10000',
      step: '500',
      value: this.options.defaultDelay
    });

    this.speedValue = this.createElement('span', {
      className: 'slideshow-speed-value',
      textContent: `${this.options.defaultDelay / 1000}s`
    });

    this.speedSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.speedValue.textContent = `${value / 1000}s`;
      
      if (this.currentViewer && this.isPlaying) {
        this.currentViewer.slideshowDelay = value;
        // Restart slideshow with new delay
        this.currentViewer.stopSlideshow();
        this.currentViewer.startSlideshow();
      }
    });

    speedControl.appendChild(speedLabel);
    speedControl.appendChild(this.speedSlider);
    speedControl.appendChild(this.speedValue);
    controls.appendChild(speedControl);

    // Options
    const options = this.createElement('div', {
      className: 'slideshow-options'
    });

    // Random order checkbox
    this.randomCheckbox = this.createElement('input', {
      type: 'checkbox',
      id: 'slideshow-random',
      checked: this.options.randomOrder
    });

    const randomLabel = this.createElement('label', {
      textContent: 'Random Order',
      htmlFor: 'slideshow-random'
    });

    this.randomCheckbox.addEventListener('change', (e) => {
      this.options.randomOrder = e.target.checked;
    });

    options.appendChild(this.randomCheckbox);
    options.appendChild(randomLabel);

    controls.appendChild(options);

    return controls;
  }

  async loadAlbums() {
    // This would be called to populate the album selector
    // Implementation depends on having access to AlbumService
    if (this.options.albumService) {
      try {
        const albums = await this.options.albumService.getAllAlbums();
        const selector = this.element.querySelector('.slideshow-album-select');
        
        // Clear existing options except the first one
        while (selector.children.length > 1) {
          selector.removeChild(selector.lastChild);
        }

        albums.forEach(album => {
          const option = this.createElement('option', {
            value: album.id,
            textContent: album.title
          });
          selector.appendChild(option);
        });
      } catch (error) {
        console.error('Failed to load albums:', error);
      }
    }
  }

  async start(albumId = null) {
    try {
      // Get photos for slideshow
      let photos = [];
      
      if (albumId || this.selectedAlbumId) {
        photos = await this.photoService.getPhotosInAlbum(albumId || this.selectedAlbumId);
      } else {
        // Get recent photos if no album specified
        photos = await this.photoService.getRecentPhotos(50);
      }

      if (!photos || photos.length === 0) {
        this.showError('No photos found for slideshow');
        return;
      }

      // Shuffle if random order is enabled
      if (this.options.randomOrder) {
        photos = this.shuffleArray([...photos]);
      }

      this.playlist = photos;
      this.currentIndex = 0;
      this.isPlaying = true;

      // Update controls
      this.updatePlayButton();

      // Start slideshow using PhotoViewerIntegration
      const integration = new PhotoViewerIntegration(this.photoService, {
        autoSlideshow: true,
        slideshowDelay: parseInt(this.speedSlider?.value || this.options.defaultDelay),
        showThumbnails: true,
        showMetadata: false
      });

      this.currentViewer = await integration.showPhotosSlideshow(photos, {
        onClose: () => {
          this.stop();
        }
      });

      // Listen for slideshow events
      this.currentViewer.on('slideshow-stop', () => {
        this.stop();
      });

      this.emit('slideshow-start', { photos: this.playlist });

    } catch (error) {
      console.error('Failed to start slideshow:', error); 
      this.showError('Failed to start slideshow');
    }
  }

  stop() {
    this.isPlaying = false;
    
    if (this.currentViewer) {
      this.currentViewer.stopSlideshow();
      this.currentViewer.close();
      this.currentViewer = null;
    }

    this.updatePlayButton();
    this.emit('slideshow-stop');
  }

  pause() {
    if (this.currentViewer && this.isPlaying) {
      this.currentViewer.stopSlideshow();
      this.isPlaying = false;
      this.updatePlayButton();
      this.emit('slideshow-pause');
    }
  }

  resume() {
    if (this.currentViewer && !this.isPlaying) {
      this.currentViewer.startSlideshow();
      this.isPlaying = true;
      this.updatePlayButton();
      this.emit('slideshow-resume');
    }
  }

  updatePlayButton() {
    if (this.playButton) {
      if (this.isPlaying) {
        this.playButton.innerHTML = '⏸ Stop Slideshow';
        this.playButton.setAttribute('aria-label', 'Stop slideshow');
      } else {
        this.playButton.innerHTML = '▶ Start Slideshow';
        this.playButton.setAttribute('aria-label', 'Start slideshow');
      }
    }
  }

  showError(message) {
    // Create or update error display
    let errorElement = this.element.querySelector('.slideshow-error');
    if (!errorElement) {
      errorElement = this.createElement('div', {
        className: 'slideshow-error'
      });
      this.element.appendChild(errorElement);
    }

    errorElement.textContent = message;
    errorElement.style.display = 'block';

    // Hide error after 5 seconds
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Public API methods
  isActive() {
    return this.isPlaying;
  }

  getCurrentPlaylist() {
    return [...this.playlist];
  }

  getCurrentPhoto() {
    return this.currentViewer ? this.currentViewer.getCurrentPhoto() : null;
  }

  setSpeed(delay) {
    if (this.speedSlider) {
      this.speedSlider.value = delay;
      this.speedValue.textContent = `${delay / 1000}s`;
    }

    if (this.currentViewer && this.isPlaying) {
      this.currentViewer.slideshowDelay = delay;
      // Restart with new delay
      this.currentViewer.stopSlideshow();
      this.currentViewer.startSlideshow();
    }
  }

  setRandomOrder(random) {
    this.options.randomOrder = random;
    if (this.randomCheckbox) {
      this.randomCheckbox.checked = random;
    }
  }

  destroy() {
    this.stop();
    super.destroy();
  }

  // Static method to create a quick slideshow
  static async createQuickSlideshow(photoService, options = {}) {
    const controller = new SlideshowController(photoService, {
      autoStart: true,
      showControls: false,
      ...options
    });

    // Start immediately with options
    if (options.albumId) {
      await controller.start(options.albumId);
    } else if (options.photos) {
      // Direct photo array
      const integration = new PhotoViewerIntegration(photoService, {
        autoSlideshow: true,
        slideshowDelay: options.delay || 5000
      });

      return await integration.showPhotosSlideshow(options.photos);
    } else {
      await controller.start();
    }

    return controller;
  }
}