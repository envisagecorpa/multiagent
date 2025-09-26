import { Component } from '../common/Component.js';

export class AlbumCard extends Component {
  constructor(album, options = {}) {
    super();
    this.album = album;
    this.options = {
      onEdit: options.onEdit || (() => {}),
      onDelete: options.onDelete || (() => {}),
      onClick: options.onClick || (() => {}),
      draggable: options.draggable !== false,
      ...options
    };
    
    this.isDragging = false;
    this.dragStartPosition = { x: 0, y: 0 };
  }

  render() {
    const { album } = this;
    const photoCount = album.photoCount || 0;
    const coverPhoto = album.coverPhoto;
    const createdDate = new Date(album.createdAt).toLocaleDateString();

    const element = this.createElement('div', {
      className: 'album-card',
      'data-album-id': album.id,
      draggable: this.options.draggable
    });

    element.innerHTML = `
      <div class="album-cover ${coverPhoto ? 'has-photos' : ''}">
        ${coverPhoto 
          ? `<img src="${coverPhoto}" alt="${album.name}" class="album-cover-image" loading="lazy">`
          : '<div class="album-cover-placeholder">📷</div>'
        }
        <div class="album-cover-overlay">
          <div class="album-actions">
            <button class="album-action-btn edit" title="Edit album" aria-label="Edit ${album.name}">
              ✏️
            </button>
            <button class="album-action-btn delete" title="Delete album" aria-label="Delete ${album.name}">
              🗑️
            </button>
          </div>
        </div>
      </div>
      <div class="album-info">
        <h3 class="album-title">${this.escapeHtml(album.name)}</h3>
        <div class="album-meta">
          <span class="album-photo-count">
            <span aria-hidden="true">📸</span>
            <span>${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}</span>
          </span>
          <span class="album-date">${createdDate}</span>
        </div>
      </div>
    `;

    this.bindEvents(element);
    this.element = element; // Store element reference
    return element;
  }

  bindEvents(element) {
    // Click handler for opening album
    element.addEventListener('click', (e) => {
      if (!e.target.closest('.album-actions')) {
        this.options.onClick(this.album);
      }
    });

    // Action button handlers
    const editBtn = element.querySelector('.album-action-btn.edit');
    const deleteBtn = element.querySelector('.album-action-btn.delete');

    editBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onEdit(this.album);
    });

    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onDelete(this.album);
    });

    // Drag and drop handlers
    if (this.options.draggable) {
      this.setupDragAndDrop(element);
    }

    // Keyboard navigation
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', `Open album ${this.album.name}`);

    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.options.onClick(this.album);
      }
    });
  }

  setupDragAndDrop(element) {
    // Drag start
    element.addEventListener('dragstart', (e) => {
      this.isDragging = true;
      element.classList.add('dragging');
      
      // Store drag data
      e.dataTransfer.setData('text/plain', JSON.stringify({
        albumId: this.album.id,
        type: 'album'
      }));
      
      e.dataTransfer.effectAllowed = 'move';
      
      // Store initial position for visual feedback
      this.dragStartPosition = {
        x: e.clientX,
        y: e.clientY
      };

      // Emit drag start event
      this.emit('dragstart', { album: this.album, element });
    });

    // Drag end
    element.addEventListener('dragend', (e) => {
      this.isDragging = false;
      element.classList.remove('dragging');
      
      // Emit drag end event
      this.emit('dragend', { album: this.album, element });
    });

    // Drag over (for reordering)
    element.addEventListener('dragover', (e) => {
      if (this.isDragging) return; // Don't allow drop on self
      
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      element.classList.add('drag-over');
    });

    // Drag leave
    element.addEventListener('dragleave', (e) => {
      if (!element.contains(e.relatedTarget)) {
        element.classList.remove('drag-over');
      }
    });

    // Drop
    element.addEventListener('drop', (e) => {
      e.preventDefault();
      element.classList.remove('drag-over');
      
      try {
        const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
        
        if (dragData.type === 'album' && dragData.albumId !== this.album.id) {
          this.emit('reorder', {
            sourceAlbumId: dragData.albumId,
            targetAlbumId: this.album.id,
            position: this.getDropPosition(e)
          });
        }
      } catch (error) {
        console.warn('Invalid drag data:', error);
      }
    });
  }

  getDropPosition(e) {
    const rect = this.element.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    return e.clientY < centerY ? 'before' : 'after';
  }

  setLoading(loading) {
    if (!this.element) return;
    
    if (loading) {
      this.element.classList.add('loading');
      this.element.style.pointerEvents = 'none';
    } else {
      this.element.classList.remove('loading');
      this.element.style.pointerEvents = '';
    }
  }

  updateAlbum(updatedAlbum) {
    this.album = { ...this.album, ...updatedAlbum };
    
    if (this.element) {
      // Update title
      const titleElement = this.element.querySelector('.album-title');
      if (titleElement) {
        titleElement.textContent = this.album.name;
      }

      // Update photo count
      const countElement = this.element.querySelector('.album-photo-count span:last-child');
      if (countElement) {
        const photoCount = this.album.photoCount || 0;
        countElement.textContent = `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`;
      }

      // Update cover photo
      if (updatedAlbum.coverPhoto !== undefined) {
        const coverElement = this.element.querySelector('.album-cover');
        const imageElement = this.element.querySelector('.album-cover-image');
        const placeholderElement = this.element.querySelector('.album-cover-placeholder');

        if (this.album.coverPhoto) {
          coverElement.classList.add('has-photos');
          if (imageElement) {
            imageElement.src = this.album.coverPhoto;
            imageElement.alt = this.album.name;
          } else if (placeholderElement) {
            placeholderElement.outerHTML = `<img src="${this.album.coverPhoto}" alt="${this.album.name}" class="album-cover-image" loading="lazy">`;
          }
        } else {
          coverElement.classList.remove('has-photos');
          if (imageElement) {
            imageElement.outerHTML = '<div class="album-cover-placeholder">📷</div>';
          }
        }
      }

      // Update accessibility label
      this.element.setAttribute('aria-label', `Open album ${this.album.name}`);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}