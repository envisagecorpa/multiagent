import { Component } from '../common/Component.js';

export class PhotoCard extends Component {
  constructor(photo, options = {}) {
    super();
    this.photo = photo;
    this.options = {
      onSelect: options.onSelect || (() => {}),
      onDelete: options.onDelete || (() => {}),
      onClick: options.onClick || (() => {}),
      selectable: options.selectable !== false,
      draggable: options.draggable !== false,
      ...options
    };
    
    this.selected = false;
    this.isDragging = false;
  }

  render() {
    const { photo } = this;
    const photoDate = new Date(photo.createdAt).toLocaleDateString();
    const fileSize = this.formatFileSize(photo.fileSize);

    const element = this.createElement('div', {
      className: 'photo-card',
      'data-photo-id': photo.id,
      draggable: this.options.draggable,
      tabindex: '0',
      role: 'button',
      'aria-label': `Photo ${photo.filename}`
    });

    element.innerHTML = `
      <img 
        src="${photo.thumbnailUrl || photo.url}" 
        alt="${this.escapeHtml(photo.filename)}" 
        class="photo-image"
        loading="lazy"
      />
      
      <div class="photo-overlay"></div>
      
      ${this.options.selectable ? `
        <input 
          type="checkbox" 
          class="photo-selection-checkbox" 
          aria-label="Select ${photo.filename}"
        />
      ` : ''}
      
      <div class="photo-actions">
        <button class="photo-action-btn edit" title="Edit photo" aria-label="Edit ${photo.filename}">
          ✏️
        </button>
        <button class="photo-action-btn delete" title="Delete photo" aria-label="Delete ${photo.filename}">
          🗑️
        </button>
      </div>
      
      <div class="photo-info">
        <div class="photo-filename">${this.escapeHtml(photo.filename)}</div>
        <div class="photo-meta">
          <span class="photo-size">
            <span aria-hidden="true">📏</span>
            ${fileSize}
          </span>
          <span class="photo-date">${photoDate}</span>
        </div>
      </div>
    `;

    this.bindEvents(element);
    this.element = element;
    return element;
  }

  bindEvents(element) {
    // Main click handler
    element.addEventListener('click', (e) => {
      // Don't trigger if clicking on action buttons or checkbox
      if (!e.target.closest('.photo-actions') && !e.target.closest('.photo-selection-checkbox')) {
        this.options.onClick(this.photo);
      }
    });

    // Selection checkbox
    if (this.options.selectable) {
      const checkbox = element.querySelector('.photo-selection-checkbox');
      checkbox?.addEventListener('change', (e) => {
        e.stopPropagation();
        this.setSelected(e.target.checked);
        this.options.onSelect(this.photo, e.target.checked);
      });
    }

    // Action buttons
    const editBtn = element.querySelector('.photo-action-btn.edit');
    const deleteBtn = element.querySelector('.photo-action-btn.delete');

    editBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onEdit?.(this.photo);
    });

    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onDelete(this.photo);
    });

    // Keyboard navigation
    element.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.options.onClick(this.photo);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            this.options.onDelete(this.photo);
          }
          break;
      }
    });

    // Drag and drop
    if (this.options.draggable) {
      this.setupDragAndDrop(element);
    }
  }

  setupDragAndDrop(element) {
    // Drag start
    element.addEventListener('dragstart', (e) => {
      this.isDragging = true;
      element.classList.add('dragging');
      
      e.dataTransfer.setData('text/plain', JSON.stringify({
        photoId: this.photo.id,
        type: 'photo'
      }));
      
      e.dataTransfer.effectAllowed = 'move';
      this.emit('dragstart', { photo: this.photo, element });
    });

    // Drag end
    element.addEventListener('dragend', (e) => {
      this.isDragging = false;
      element.classList.remove('dragging');
      this.emit('dragend', { photo: this.photo, element });
    });

    // Drag over (for reordering)
    element.addEventListener('dragover', (e) => {
      if (this.isDragging) return;
      
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
        
        if (dragData.type === 'photo' && dragData.photoId !== this.photo.id) {
          this.emit('reorder', {
            sourcePhotoId: dragData.photoId,
            targetPhotoId: this.photo.id,
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
    const centerX = rect.left + rect.width / 2;
    return e.clientX < centerX ? 'before' : 'after';
  }

  setSelected(selected) {
    this.selected = selected;
    
    if (this.element) {
      const checkbox = this.element.querySelector('.photo-selection-checkbox');
      if (checkbox) {
        checkbox.checked = selected;
      }
      
      if (selected) {
        this.element.classList.add('selected');
      } else {
        this.element.classList.remove('selected');
      }
    }
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

  updatePhoto(updatedPhoto) {
    this.photo = { ...this.photo, ...updatedPhoto };
    
    if (this.element) {
      // Update image src
      const image = this.element.querySelector('.photo-image');
      if (image && this.photo.thumbnailUrl) {
        image.src = this.photo.thumbnailUrl || this.photo.url;
      }

      // Update filename
      const filename = this.element.querySelector('.photo-filename');
      if (filename) {
        filename.textContent = this.photo.filename;
      }

      // Update file size
      const sizeElement = this.element.querySelector('.photo-size');
      if (sizeElement && this.photo.fileSize) {
        const fileSize = this.formatFileSize(this.photo.fileSize);
        sizeElement.innerHTML = `<span aria-hidden="true">📏</span>${fileSize}`;
      }

      // Update date
      const dateElement = this.element.querySelector('.photo-date');
      if (dateElement) {
        const photoDate = new Date(this.photo.createdAt).toLocaleDateString();
        dateElement.textContent = photoDate;
      }

      // Update accessibility
      this.element.setAttribute('aria-label', `Photo ${this.photo.filename}`);
      const editBtn = this.element.querySelector('.photo-action-btn.edit');
      const deleteBtn = this.element.querySelector('.photo-action-btn.delete');
      if (editBtn) editBtn.setAttribute('aria-label', `Edit ${this.photo.filename}`);
      if (deleteBtn) deleteBtn.setAttribute('aria-label', `Delete ${this.photo.filename}`);
    }
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  focus() {
    if (this.element) {
      this.element.focus();
    }
  }

  getPhoto() {
    return this.photo;
  }

  isSelected() {
    return this.selected;
  }
}