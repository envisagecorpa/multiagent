import { Component } from '../common/Component.js';
import { PhotoGrid } from './PhotoGrid.js';

export class Photos extends Component {
  constructor(photoService, albumService, albumId, options = {}) {
    super();
    this.photoService = photoService;
    this.albumService = albumService;
    this.albumId = albumId;
    this.options = {
      onPhotoClick: options.onPhotoClick || (() => {}),
      onNavigateBack: options.onNavigateBack || (() => {}),
      onPhotoEdit: options.onPhotoEdit || (() => {}),
      ...options
    };

    this.album = null;
    this.bulkActionsVisible = false;
    this.selectedPhotos = [];
  }

  async render() {
    const element = this.createElement('div', {
      className: 'photos-page'
    });

    // Load album info
    await this.loadAlbum();

    // Create header
    const header = this.createHeader();
    element.appendChild(header);

    // Create bulk actions bar (initially hidden)
    this.bulkActionsBar = this.createBulkActionsBar();
    element.appendChild(this.bulkActionsBar);

    // Create photo grid
    this.photoGrid = new PhotoGrid(this.photoService, this.albumId, {
      onPhotoClick: this.handlePhotoClick.bind(this),
      onPhotoUpload: this.handlePhotoUpload.bind(this),
      onPhotoDelete: this.handlePhotoDelete.bind(this),
      onPhotoEdit: this.options.onPhotoEdit,
      onSelectionChange: this.handleSelectionChange.bind(this),
      selectable: true
    });

    // Listen for grid events
    this.photoGrid.on('error', (error) => {
      this.emit('error', error);
    });

    this.photoGrid.on('upload-start', () => {
      this.showUploadFeedback('Uploading photos...');
    });

    this.photoGrid.on('upload-progress', (data) => {
      this.updateUploadProgress(data);
    });

    this.photoGrid.on('upload-success', (data) => {
      this.showUploadFeedback(`Uploaded ${data.filename} successfully`, 'success');
    });

    this.photoGrid.on('upload-error', (data) => {
      this.showUploadFeedback(`Failed to upload ${data.filename}: ${data.error}`, 'error');
    });

    this.photoGrid.on('upload-complete', () => {
      this.hideUploadFeedback();
      this.updateAlbumStats();
    });

    const gridElement = await this.photoGrid.render();
    element.appendChild(gridElement);
    this.addChild(this.photoGrid);

    this.element = element;
    return element;
  }

  async loadAlbum() {
    try {
      this.album = await this.albumService.getAlbum(this.albumId);
    } catch (error) {
      console.error('Failed to load album:', error);
      this.emit('error', { message: 'Failed to load album', error });
      this.album = { id: this.albumId, title: 'Unknown Album' };
    }
  }

  createHeader() {
    const header = this.createElement('header', {
      className: 'photos-header'
    });

    // Back button
    const backButton = this.createElement('button', {
      className: 'photos-back-btn',
      'aria-label': 'Back to albums',
      innerHTML: `
        <span class="photos-back-icon" aria-hidden="true">←</span>
        Back to Albums
      `
    });

    backButton.addEventListener('click', () => {
      this.options.onNavigateBack();
    });

    header.appendChild(backButton);

    // Album info
    const albumInfo = this.createElement('div', {
      className: 'photos-album-info'
    });

    const albumTitle = this.createElement('h1', {
      className: 'photos-album-title',
      textContent: this.album?.title || 'Unknown Album'
    });

    const albumStats = this.createElement('div', {
      className: 'photos-album-stats',
      id: 'album-stats'
    });

    this.updateAlbumStatsElement(albumStats);

    albumInfo.appendChild(albumTitle);
    albumInfo.appendChild(albumStats);
    header.appendChild(albumInfo);

    // Header actions
    const actions = this.createElement('div', {
      className: 'photos-header-actions'
    });

    // View options
    const viewOptions = this.createElement('div', {
      className: 'photos-view-options'
    });

    const gridViewBtn = this.createElement('button', {
      className: 'photos-view-btn active',
      'aria-label': 'Grid view',
      'data-view': 'grid',
      innerHTML: '<span aria-hidden="true">⊞</span>'
    });

    const listViewBtn = this.createElement('button', {
      className: 'photos-view-btn',
      'aria-label': 'List view',
      'data-view': 'list',
      innerHTML: '<span aria-hidden="true">☰</span>'
    });

    gridViewBtn.addEventListener('click', () => this.setViewMode('grid'));
    listViewBtn.addEventListener('click', () => this.setViewMode('list'));

    viewOptions.appendChild(gridViewBtn);
    viewOptions.appendChild(listViewBtn);
    actions.appendChild(viewOptions);

    header.appendChild(actions);

    return header;
  }

  createBulkActionsBar() {
    const bar = this.createElement('div', {
      className: 'photos-bulk-actions',
      id: 'bulk-actions-bar'
    });

    const content = this.createElement('div', {
      className: 'photos-bulk-actions-content'
    });

    // Selection info
    const selectionInfo = this.createElement('div', {
      className: 'photos-selection-info',
      id: 'selection-info'
    });

    content.appendChild(selectionInfo);

    // Actions
    const actions = this.createElement('div', {
      className: 'photos-bulk-actions-list'
    });

    const downloadBtn = this.createElement('button', {
      className: 'photos-bulk-action-btn',
      innerHTML: `
        <span class="photos-bulk-action-icon" aria-hidden="true">↓</span>
        Download
      `
    });

    const moveBtn = this.createElement('button', {
      className: 'photos-bulk-action-btn',
      innerHTML: `
        <span class="photos-bulk-action-icon" aria-hidden="true">→</span>
        Move to Album
      `
    });

    const deleteBtn = this.createElement('button', {
      className: 'photos-bulk-action-btn photos-bulk-action-danger',
      innerHTML: `
        <span class="photos-bulk-action-icon" aria-hidden="true">🗑</span>
        Delete
      `
    });

    downloadBtn.addEventListener('click', () => this.downloadSelectedPhotos());
    moveBtn.addEventListener('click', () => this.moveSelectedPhotos());
    deleteBtn.addEventListener('click', () => this.deleteSelectedPhotos());

    actions.appendChild(downloadBtn);
    actions.appendChild(moveBtn);
    actions.appendChild(deleteBtn);
    content.appendChild(actions);

    // Clear selection button
    const clearBtn = this.createElement('button', {
      className: 'photos-clear-selection-btn',
      'aria-label': 'Clear selection',
      innerHTML: '<span aria-hidden="true">×</span>'
    });

    clearBtn.addEventListener('click', () => {
      this.photoGrid.clearSelection();
    });

    content.appendChild(clearBtn);
    bar.appendChild(content);

    return bar;
  }

  setViewMode(mode) {
    const viewBtns = this.element.querySelectorAll('.photos-view-btn');
    viewBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === mode);
    });

    const photosContainer = this.element.querySelector('.photos-container');
    if (photosContainer) {
      photosContainer.dataset.view = mode;
    }
  }

  handlePhotoClick(photo) {
    this.options.onPhotoClick(photo);
  }

  handlePhotoUpload(photos) {
    this.updateAlbumStats();
    this.emit('photo-upload', { photos, album: this.album });
  }

  async handlePhotoDelete(photos) {
    const photosToDelete = Array.isArray(photos) ? photos : [photos];
    
    try {
      // Show confirmation
      const confirmed = await this.showDeleteConfirmation(photosToDelete);
      if (!confirmed) return;

      // Delete photos
      for (const photo of photosToDelete) {
        await this.photoService.deletePhoto(photo.id);
        this.photoGrid.removePhoto(photo.id);
      }

      // Show success message
      const message = photosToDelete.length === 1 
        ? 'Photo deleted successfully'
        : `${photosToDelete.length} photos deleted successfully`;
      
      this.showFeedback(message, 'success');
      this.updateAlbumStats();

      this.emit('photo-delete', { photos: photosToDelete, album: this.album });

    } catch (error) {
      console.error('Failed to delete photos:', error);
      this.showFeedback('Failed to delete photos', 'error');
      this.emit('error', { message: 'Failed to delete photos', error });
    }
  }

  handleSelectionChange(selectedIds, selectedPhotos) {
    this.selectedPhotos = selectedPhotos;
    
    if (selectedPhotos.length > 0) {
      this.showBulkActions(selectedPhotos.length);
    } else {
      this.hideBulkActions();
    }
  }

  showBulkActions(count) {
    this.bulkActionsVisible = true;
    this.bulkActionsBar.classList.add('visible');
    
    const selectionInfo = this.element.querySelector('#selection-info');
    if (selectionInfo) {
      selectionInfo.textContent = `${count} photo${count === 1 ? '' : 's'} selected`;
    }
  }

  hideBulkActions() {
    this.bulkActionsVisible = false;
    this.bulkActionsBar.classList.remove('visible');
  }

  async downloadSelectedPhotos() {
    // In a real app, this would create a zip file or download individual photos
    this.showFeedback('Download feature coming soon!', 'info');
  }

  async moveSelectedPhotos() {
    // In a real app, this would show an album picker modal
    this.showFeedback('Move to album feature coming soon!', 'info');
  }

  async deleteSelectedPhotos() {
    if (this.selectedPhotos.length > 0) {
      await this.handlePhotoDelete(this.selectedPhotos);
    }
  }

  async showDeleteConfirmation(photos) {
    const count = photos.length;
    const message = count === 1 
      ? 'Are you sure you want to delete this photo? This action cannot be undone.'
      : `Are you sure you want to delete these ${count} photos? This action cannot be undone.`;

    return confirm(message);
  }

  async updateAlbumStats() {
    try {
      const photos = this.photoGrid.getPhotos();
      const stats = this.element.querySelector('#album-stats');
      if (stats) {
        this.updateAlbumStatsElement(stats, photos.length);
      }
    } catch (error) {
      console.error('Failed to update album stats:', error);
    }
  }

  updateAlbumStatsElement(element, photoCount = null) {
    if (photoCount === null) {
      photoCount = this.photoGrid?.getPhotos().length || 0;
    }

    const lastModified = this.album?.updatedAt 
      ? new Date(this.album.updatedAt).toLocaleDateString()
      : 'Unknown';

    element.innerHTML = `
      <span class="photos-stat">
        <span class="photos-stat-value">${photoCount}</span>
        <span class="photos-stat-label">photo${photoCount === 1 ? '' : 's'}</span>
      </span>
      <span class="photos-stat-separator">•</span>
      <span class="photos-stat">
        <span class="photos-stat-label">Updated</span>
        <span class="photos-stat-value">${lastModified}</span>
      </span>
    `;
  }

  showUploadFeedback(message, type = 'info') {
    // Create or update upload feedback element
    let feedback = this.element.querySelector('#upload-feedback');
    if (!feedback) {
      feedback = this.createElement('div', {
        id: 'upload-feedback',
        className: 'photos-upload-feedback'
      });
      this.element.insertBefore(feedback, this.photoGrid.element);
    }

    feedback.className = `photos-upload-feedback ${type}`;
    feedback.textContent = message;
    feedback.style.display = 'block';
  }

  updateUploadProgress(data) {
    const feedback = this.element.querySelector('#upload-feedback');
    if (feedback && data.progress !== undefined) {
      feedback.innerHTML = `
        <div class="photos-upload-progress">
          <div class="photos-upload-progress-bar">
            <div class="photos-upload-progress-fill" style="width: ${data.progress}%"></div>
          </div>
          <span class="photos-upload-progress-text">${Math.round(data.progress)}%</span>
        </div>
      `;
    }
  }

  hideUploadFeedback() {
    const feedback = this.element.querySelector('#upload-feedback');
    if (feedback) {
      setTimeout(() => {
        feedback.style.display = 'none';
      }, 2000);
    }
  }

  showFeedback(message, type = 'info') {
    // Create temporary feedback element
    const feedback = this.createElement('div', {
      className: `photos-feedback ${type}`,
      textContent: message
    });

    this.element.insertBefore(feedback, this.element.firstChild);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 3000);
  }

  async refresh() {
    await this.loadAlbum();
    await this.photoGrid.refresh();
    this.updateAlbumStats();
  }

  getAlbum() {
    return this.album;
  }

  getPhotos() {
    return this.photoGrid.getPhotos();
  }

  getSelectedPhotos() {
    return this.selectedPhotos;
  }
}