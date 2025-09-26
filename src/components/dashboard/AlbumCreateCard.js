import { Component } from '../common/Component.js';

export class AlbumCreateCard extends Component {
  constructor(options = {}) {
    super();
    this.options = {
      onCreate: options.onCreate || (() => {}),
      ...options
    };
  }

  render() {
    const element = this.createElement('div', {
      className: 'album-card album-create-card',
      tabindex: '0',
      role: 'button',
      'aria-label': 'Create new album'
    });

    element.innerHTML = `
      <div class="album-create-icon" aria-hidden="true">📁</div>
      <div class="album-create-text">Create New Album</div>
    `;

    this.bindEvents(element);
    return element;
  }

  bindEvents(element) {
    const handleCreate = (e) => {
      e.preventDefault();
      this.options.onCreate();
    };

    element.addEventListener('click', handleCreate);
    
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleCreate(e);
      }
    });

    // Drag over for file uploads
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      element.style.backgroundColor = 'var(--color-primary-light)';
      element.style.borderColor = 'var(--color-primary)';
    });

    element.addEventListener('dragleave', (e) => {
      if (!element.contains(e.relatedTarget)) {
        element.style.backgroundColor = '';
        element.style.borderColor = '';
      }
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      element.style.backgroundColor = '';
      element.style.borderColor = '';

      const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      );

      if (files.length > 0) {
        this.options.onCreate({ files });
      }
    });
  }
}