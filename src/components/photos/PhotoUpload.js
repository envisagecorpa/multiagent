import { Component } from '../common/Component.js';

export class PhotoUpload extends Component {
  constructor(options = {}) {
    super();
    this.options = {
      onUpload: options.onUpload || (() => {}),
      onProgress: options.onProgress || (() => {}),
      multiple: options.multiple !== false,
      acceptedTypes: options.acceptedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      ...options
    };

    this.dragCounter = 0;
    this.uploading = false;
  }

  render() {
    const element = this.createElement('div', {
      className: 'photo-upload-area',
      tabindex: '0',
      role: 'button',
      'aria-label': 'Upload photos'
    });

    element.innerHTML = `
      <div class="upload-icon" aria-hidden="true">📷</div>
      <div class="upload-text">Drop photos here or click to upload</div>
      <div class="upload-hint">
        Supports JPEG, PNG, GIF, WebP up to ${this.formatFileSize(this.options.maxFileSize)}
      </div>
      <input 
        type="file" 
        class="upload-file-input" 
        accept="${this.options.acceptedTypes.join(',')}"
        ${this.options.multiple ? 'multiple' : ''}
        aria-label="Select photos to upload"
      />
    `;

    this.bindEvents(element);
    this.element = element;
    return element;
  }

  bindEvents(element) {
    const fileInput = element.querySelector('.upload-file-input');

    // Click to open file dialog
    element.addEventListener('click', () => {
      if (!this.uploading) {
        fileInput.click();
      }
    });

    // Keyboard support
    element.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !this.uploading) {
        e.preventDefault();
        fileInput.click();
      }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFiles(Array.from(e.target.files));
      }
    });

    // Drag and drop
    element.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this.dragCounter++;
      element.classList.add('drag-over');
    });

    element.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.dragCounter--;
      if (this.dragCounter === 0) {
        element.classList.remove('drag-over');
      }
    });

    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dragCounter = 0;
      element.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer.files).filter(file => 
        this.options.acceptedTypes.includes(file.type)
      );

      if (files.length > 0) {
        this.handleFiles(files);
      } else if (e.dataTransfer.files.length > 0) {
        this.emit('error', { 
          message: 'Please select valid image files', 
          type: 'invalid_file_type' 
        });
      }
    });
  }

  async handleFiles(files) {
    if (this.uploading) return;

    // Validate files
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      if (!this.options.acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type`);
        continue;
      }

      if (file.size > this.options.maxFileSize) {
        errors.push(`${file.name}: File too large (max ${this.formatFileSize(this.options.maxFileSize)})`);
        continue;
      }

      validFiles.push(file);
    }

    // Report validation errors
    if (errors.length > 0) {
      this.emit('error', { 
        message: errors.join('\n'), 
        type: 'validation_error' 
      });
    }

    // Upload valid files
    if (validFiles.length > 0) {
      this.setUploading(true);
      
      try {
        await this.uploadFiles(validFiles);
      } catch (error) {
        this.emit('error', { 
          message: 'Upload failed: ' + error.message, 
          type: 'upload_error',
          error 
        });
      } finally {
        this.setUploading(false);
        this.resetInput();
      }
    }
  }

  async uploadFiles(files) {
    const uploads = files.map((file, index) => 
      this.uploadSingleFile(file, index, files.length)
    );

    const results = await Promise.allSettled(uploads);
    
    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

    this.emit('upload-complete', {
      successful,
      failed,
      total: files.length
    });

    if (successful.length > 0) {
      this.options.onUpload(successful);
    }

    if (failed.length > 0) {
      throw new Error(`${failed.length} of ${files.length} uploads failed`);
    }
  }

  async uploadSingleFile(file, index, total) {
    const fileId = `upload_${Date.now()}_${index}`;
    
    // Emit upload start
    this.emit('upload-start', {
      fileId,
      filename: file.name,
      size: file.size,
      index: index + 1,
      total
    });

    try {
      // Create file data URL for immediate preview
      const dataUrl = await this.createFileDataUrl(file);
      
      // Simulate upload progress for better UX
      // In a real app, this would be actual upload progress
      await this.simulateProgress(fileId, 100);

      const result = {
        fileId,
        filename: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
        file // Include original file for actual upload
      };

      this.emit('upload-success', result);
      return result;

    } catch (error) {
      this.emit('upload-error', {
        fileId,
        filename: file.name,
        error: error.message
      });
      throw error;
    }
  }

  createFileDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  async simulateProgress(fileId, duration) {
    const steps = 20;
    const stepDuration = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      const progress = (i / steps) * 100;
      
      this.emit('upload-progress', {
        fileId,
        progress: Math.round(progress)
      });

      this.options.onProgress({
        fileId,
        progress: Math.round(progress)
      });

      if (i < steps) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
    }
  }

  setUploading(uploading) {
    this.uploading = uploading;
    
    if (this.element) {
      const text = this.element.querySelector('.upload-text');
      const hint = this.element.querySelector('.upload-hint');
      
      if (uploading) {
        this.element.classList.add('uploading');
        this.element.style.pointerEvents = 'none';
        if (text) text.textContent = 'Uploading photos...';
        if (hint) hint.textContent = 'Please wait';
      } else {
        this.element.classList.remove('uploading');
        this.element.style.pointerEvents = '';
        if (text) text.textContent = 'Drop photos here or click to upload';
        if (hint) {
          hint.textContent = `Supports JPEG, PNG, GIF, WebP up to ${this.formatFileSize(this.options.maxFileSize)}`;
        }
      }
    }
  }

  resetInput() {
    if (this.element) {
      const fileInput = this.element.querySelector('.upload-file-input');
      if (fileInput) {
        fileInput.value = '';
      }
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

  isUploading() {
    return this.uploading;
  }

  setAcceptedTypes(types) {
    this.options.acceptedTypes = types;
    
    if (this.element) {
      const fileInput = this.element.querySelector('.upload-file-input');
      if (fileInput) {
        fileInput.accept = types.join(',');
      }
    }
  }

  setMaxFileSize(size) {
    this.options.maxFileSize = size;
    
    if (this.element) {
      const hint = this.element.querySelector('.upload-hint');
      if (hint && !this.uploading) {
        hint.textContent = `Supports JPEG, PNG, GIF, WebP up to ${this.formatFileSize(size)}`;
      }
    }
  }
}