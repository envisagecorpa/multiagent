import { Component } from '../common/Component.js';
import { PhotoCard } from './PhotoCard.js';
import { PhotoUpload } from './PhotoUpload.js';

export class PhotoGrid extends Component {
  constructor(photoService, albumId, options = {}) {
    super();
    this.photoService = photoService;
    this.albumId = albumId;
    this.options = {
      onPhotoClick: options.onPhotoClick || (() => {}),
      onPhotoUpload: options.onPhotoUpload || (() => {}),
      onPhotoDelete: options.onPhotoDelete || (() => {}),
      onPhotoEdit: options.onPhotoEdit || (() => {}),
      onSelectionChange: options.onSelectionChange || (() => {}),
      selectable: options.selectable !== false,
      ...options
    };

    this.photos = [];
    this.photoCards = new Map();
    this.selectedPhotos = new Set();
    this.loading = false;
    this.uploading = false;
  }

  async render() {
    const element = this.createElement('div', {
      className: 'photos-container'
    });

    // Add upload area
    this.photoUpload = new PhotoUpload({
      onUpload: this.handlePhotoUpload.bind(this),
      onProgress: this.handleUploadProgress.bind(this),
      multiple: true
    });

    // Listen for upload events
    this.photoUpload.on('upload-start', this.handleUploadStart.bind(this));
    this.photoUpload.on('upload-progress', this.handleUploadProgress.bind(this));
    this.photoUpload.on('upload-success', this.handleUploadSuccess.bind(this));
    this.photoUpload.on('upload-error', this.handleUploadError.bind(this));
    this.photoUpload.on('upload-complete', this.handleUploadComplete.bind(this));
    this.photoUpload.on('error', this.handleUploadError.bind(this));

    const uploadElement = this.photoUpload.render();
    element.appendChild(uploadElement);
    this.addChild(this.photoUpload);

    // Add photos grid
    const gridElement = this.createElement('div', {
      className: 'photos-grid',
      id: 'photos-grid'
    });
    element.appendChild(gridElement);

    // Load photos
    await this.loadPhotos();
    this.renderPhotos(gridElement);

    // Setup grid event listeners
    this.setupGridEvents(gridElement);

    this.element = element;
    return element;
  }

  async loadPhotos() {
    try {
      this.loading = true;
      this.photos = await this.photoService.getPhotosInAlbum(this.albumId);
    } catch (error) {
      console.error('Failed to load photos:', error);
      this.emit('error', { message: 'Failed to load photos', error });
      this.photos = [];
    } finally {
      this.loading = false;
    }
  }

  renderPhotos(container) {
    // Clear existing content
    container.innerHTML = '';
    this.photoCards.clear();

    if (this.loading) {
      container.classList.add('loading');
      container.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading photos...</p>
        </div>
      `;
      return;
    }

    container.classList.remove('loading');

    // Show empty state if no photos
    if (this.photos.length === 0) {
      container.classList.add('empty');
      container.innerHTML = `
        <div class="photos-empty-state">
          <div class="photos-empty-icon" aria-hidden="true">📷</div>
          <h3 class="photos-empty-title">No Photos Yet</h3>
          <p class="photos-empty-description">
            Upload your first photos to this album using the upload area above.
          </p>
        </div>
      `;
      return;
    }

    container.classList.remove('empty');

    // Render photo cards
    this.photos.forEach(photo => {
      const photoCard = new PhotoCard(photo, {
        onSelect: this.handlePhotoSelect.bind(this),
        onDelete: this.handlePhotoDelete.bind(this),
        onClick: this.options.onPhotoClick,
        onEdit: this.options.onPhotoEdit,
        selectable: this.options.selectable,
        draggable: true
      });

      // Listen for drag events
      photoCard.on('dragstart', this.handleDragStart.bind(this));
      photoCard.on('dragend', this.handleDragEnd.bind(this));
      photoCard.on('reorder', this.handleReorder.bind(this));

      const cardElement = photoCard.render();
      container.appendChild(cardElement);
      
      this.photoCards.set(photo.id, photoCard);
      this.addChild(photoCard);
    });
  }

  setupGridEvents(grid) {
    let dragCounter = 0;

    grid.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      grid.classList.add('drag-active');
    });

    grid.addEventListener('dragleave', (e) => {
      dragCounter--;
      if (dragCounter === 0) {
        grid.classList.remove('drag-active');
      }
    });

    grid.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    grid.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      grid.classList.remove('drag-active');
    });

    // Keyboard shortcuts for selection
    grid.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            this.selectAll();
            break;
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            if (this.selectedPhotos.size > 0) {
              this.deleteSelectedPhotos();
            }
            break;
        }
      } else if (e.key === 'Escape') {
        this.clearSelection();
      }
    });
  }

  handlePhotoSelect(photo, selected) {
    if (selected) {
      this.selectedPhotos.add(photo.id);
    } else {
      this.selectedPhotos.delete(photo.id);
    }

    this.options.onSelectionChange(Array.from(this.selectedPhotos), this.getSelectedPhotos());
    this.updateBulkActions();
  }

  handlePhotoDelete(photo) {
    this.options.onPhotoDelete(photo);
  }

  async handlePhotoUpload(uploadResults) {
    try {
      this.uploading = true;
      const uploadedPhotos = [];

      for (const result of uploadResults) {
        try {
          // Create photo record in database
          const photoData = {
            albumId: this.albumId,
            filename: result.filename,
            originalName: result.filename,
            mimeType: result.type,
            fileSize: result.size,
            url: result.dataUrl, // In real app, this would be uploaded to storage
            thumbnailUrl: result.dataUrl // In real app, this would be generated
          };

          const photo = await this.photoService.addPhotoToAlbum(this.albumId, photoData);
          uploadedPhotos.push(photo);

        } catch (error) {
          console.error('Failed to save photo:', result.filename, error);
          this.emit('error', { 
            message: `Failed to save ${result.filename}`, 
            error 
          });
        }
      }

      if (uploadedPhotos.length > 0) {
        // Add new photos to local array
        this.photos.push(...uploadedPhotos);
        
        // Re-render grid
        const gridElement = this.element.querySelector('#photos-grid');
        if (gridElement) {
          this.renderPhotos(gridElement);
        }

        this.options.onPhotoUpload(uploadedPhotos);
      }

    } catch (error) {
      console.error('Photo upload failed:', error);
      this.emit('error', { message: 'Photo upload failed', error });
    } finally {
      this.uploading = false;
    }
  }

  handleUploadStart(data) {
    this.uploading = true;
    this.emit('upload-start', data);
  }

  handleUploadProgress(data) {
    this.emit('upload-progress', data);
  }

  handleUploadSuccess(data) {
    this.emit('upload-success', data);
  }

  handleUploadError(data) {
    this.emit('upload-error', data);
  }

  handleUploadComplete(data) {
    this.uploading = false;
    this.emit('upload-complete', data);
  }

  handleDragStart({ photo }) {
    this.draggedPhoto = photo;
  }

  handleDragEnd() {
    this.draggedPhoto = null;
  }

  async handleReorder({ sourcePhotoId, targetPhotoId, position }) {
    try {
      // Find source and target photos
      const sourceIndex = this.photos.findIndex(p => p.id === sourcePhotoId);
      const targetIndex = this.photos.findIndex(p => p.id === targetPhotoId);
      
      if (sourceIndex === -1 || targetIndex === -1) return;

      // Calculate new position
      let newIndex = position === 'before' ? targetIndex : targetIndex + 1;
      if (sourceIndex < targetIndex && position === 'after') {
        newIndex = targetIndex;
      } else if (sourceIndex > targetIndex && position === 'before') {
        newIndex = targetIndex;
      }

      // Reorder in local array
      const [movedPhoto] = this.photos.splice(sourceIndex, 1);
      this.photos.splice(newIndex, 0, movedPhoto);

      // Update display order values
      this.photos.forEach((photo, index) => {
        photo.displayOrder = index;
      });

      // Save new order to database
      await this.photoService.updatePhotoOrder(
        this.albumId,
        this.photos.map(photo => ({
          id: photo.id,
          displayOrder: photo.displayOrder
        }))
      );

      // Re-render grid with new order
      const gridElement = this.element.querySelector('#photos-grid');
      if (gridElement) {
        this.renderPhotos(gridElement);
      }

      this.emit('reorder', {
        photos: this.photos,
        movedPhoto: movedPhoto
      });

    } catch (error) {
      console.error('Failed to reorder photos:', error);
      this.emit('error', { message: 'Failed to reorder photos', error });
      
      // Reload photos to restore correct order
      await this.refresh();
    }
  }

  selectAll() {
    this.selectedPhotos.clear();
    this.photos.forEach(photo => {
      this.selectedPhotos.add(photo.id);
      const photoCard = this.photoCards.get(photo.id);
      if (photoCard) {
        photoCard.setSelected(true);
      }
    });

    this.options.onSelectionChange(Array.from(this.selectedPhotos), this.getSelectedPhotos());
    this.updateBulkActions();
  }

  clearSelection() {
    this.selectedPhotos.forEach(photoId => {
      const photoCard = this.photoCards.get(photoId);
      if (photoCard) {
        photoCard.setSelected(false);
      }
    });

    this.selectedPhotos.clear();
    this.options.onSelectionChange([], []);
    this.updateBulkActions();
  }

  deleteSelectedPhotos() {
    const selectedPhotos = this.getSelectedPhotos();
    if (selectedPhotos.length > 0) {
      this.options.onPhotoDelete(selectedPhotos);
    }
  }

  updateBulkActions() {
    this.emit('selection-change', {
      count: this.selectedPhotos.size,
      photos: this.getSelectedPhotos()
    });
  }

  getSelectedPhotos() {
    return this.photos.filter(photo => this.selectedPhotos.has(photo.id));
  }

  async refresh() {
    await this.loadPhotos();
    const gridElement = this.element?.querySelector('#photos-grid');
    if (gridElement) {
      this.renderPhotos(gridElement);
    }
  }

  updatePhoto(photoId, updates) {
    const photo = this.photos.find(p => p.id === photoId);
    if (photo) {
      Object.assign(photo, updates);
      
      const photoCard = this.photoCards.get(photoId);
      if (photoCard) {
        photoCard.updatePhoto(updates);
      }
    }
  }

  removePhoto(photoId) {
    const index = this.photos.findIndex(p => p.id === photoId);
    if (index !== -1) {
      this.photos.splice(index, 1);
      this.photoCards.delete(photoId);
      this.selectedPhotos.delete(photoId);
      
      const gridElement = this.element?.querySelector('#photos-grid');
      if (gridElement) {
        this.renderPhotos(gridElement);
      }

      this.updateBulkActions();
    }
  }

  addPhoto(photo) {
    this.photos.push(photo);
    
    const gridElement = this.element?.querySelector('#photos-grid');
    if (gridElement) {
      this.renderPhotos(gridElement);
    }
  }

  setLoading(loading) {
    this.loading = loading;
    
    const gridElement = this.element?.querySelector('#photos-grid');
    if (gridElement) {
      if (loading) {
        gridElement.classList.add('loading');
        gridElement.innerHTML = `
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading photos...</p>
          </div>
        `;
      } else {
        this.renderPhotos(gridElement);
      }
    }
  }

  getPhotos() {
    return [...this.photos];
  }

  getPhotoById(photoId) {
    return this.photos.find(p => p.id === photoId);
  }

  isUploading() {
    return this.uploading;
  }

  getSelectedCount() {
    return this.selectedPhotos.size;
  }
}