import { Component } from '../common/Component.js';

export class Modal extends Component {
  constructor(options = {}) {
    super();
    this.options = {
      size: options.size || 'md', // sm, md, lg, xl, fullscreen
      closable: options.closable !== false,
      closeOnOverlayClick: options.closeOnOverlayClick !== false,
      closeOnEscape: options.closeOnEscape !== false,
      title: options.title || '',
      className: options.className || '',
      ariaLabel: options.ariaLabel || options.title || 'Modal',
      ...options
    };

    this.isVisible = false;
    this.previousFocus = null;
    this.focusableElements = [];
    this.firstFocusable = null;
    this.lastFocusable = null;
  }

  render() {
    // Create overlay
    this.overlay = this.createElement('div', {
      className: 'modal-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': this.options.ariaLabel
    });

    // Create modal container
    this.modal = this.createElement('div', {
      className: `modal modal-${this.options.size} ${this.options.className}`.trim()
    });

    // Create header if title provided
    if (this.options.title || this.options.closable) {
      this.header = this.createHeader();
      this.modal.appendChild(this.header);
    }

    // Create body
    this.body = this.createElement('div', {
      className: 'modal-body'
    });
    this.modal.appendChild(this.body);

    // Create footer if needed
    if (this.options.footer || this.options.actions) {
      this.footer = this.createFooter();
      this.modal.appendChild(this.footer);
    }

    this.overlay.appendChild(this.modal);
    this.setupEventListeners();

    this.element = this.overlay;
    return this.overlay;
  }

  createHeader() {
    const header = this.createElement('div', {
      className: 'modal-header'
    });

    if (this.options.title) {
      const title = this.createElement('h2', {
        className: 'modal-title',
        id: `modal-title-${this.id}`,
        textContent: this.options.title
      });
      header.appendChild(title);
      
      // Set aria-labelledby
      this.overlay.setAttribute('aria-labelledby', `modal-title-${this.id}`);
    }

    if (this.options.closable) {
      this.closeButton = this.createElement('button', {
        className: 'modal-close',
        type: 'button',
        'aria-label': 'Close modal',
        innerHTML: '×'
      });

      this.closeButton.addEventListener('click', () => {
        this.close();
      });

      header.appendChild(this.closeButton);
    }

    return header;
  }

  createFooter() {
    const footer = this.createElement('div', {
      className: 'modal-footer'
    });

    if (this.options.actions) {
      this.options.actions.forEach(action => {
        const button = this.createElement('button', {
          className: `modal-btn ${action.className || 'modal-btn-secondary'}`,
          type: action.type || 'button',
          textContent: action.text
        });

        if (action.disabled) {
          button.disabled = true;
        }

        if (action.onClick) {
          button.addEventListener('click', (e) => {
            action.onClick(e, this);
          });
        }

        footer.appendChild(button);
      });
    }

    return footer;
  }

  setupEventListeners() {
    // Close on overlay click
    if (this.options.closeOnOverlayClick) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });
    }

    // Close on escape key
    if (this.options.closeOnEscape) {
      this.handleKeyDown = (e) => {
        if (e.key === 'Escape' && this.isVisible) {
          this.close();
        } else if (e.key === 'Tab') {
          this.handleTabKey(e);
        }
      };

      document.addEventListener('keydown', this.handleKeyDown);
    }
  }

  handleTabKey(e) {
    if (!this.isVisible) return;

    this.updateFocusableElements();

    if (this.focusableElements.length === 0) return;

    if (e.shiftKey) {
      // Shift + Tab - move backwards
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault();
        this.lastFocusable.focus();
      }
    } else {
      // Tab - move forwards
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault();
        this.firstFocusable.focus();
      }
    }
  }

  updateFocusableElements() {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    this.focusableElements = Array.from(
      this.modal.querySelectorAll(focusableSelectors)
    ).filter(el => {
      return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.disabled;
    });

    this.firstFocusable = this.focusableElements[0];
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
  }

  setContent(content) {
    this.body.innerHTML = '';
    
    if (typeof content === 'string') {
      this.body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.body.appendChild(content);
    } else if (content instanceof Component) {
      const element = content.render();
      this.body.appendChild(element);
      this.addChild(content);
    }

    return this;
  }

  setTitle(title) {
    this.options.title = title;
    const titleElement = this.modal.querySelector('.modal-title');
    if (titleElement) {
      titleElement.textContent = title;
    } else if (title && this.header) {
      const titleEl = this.createElement('h2', {
        className: 'modal-title',
        id: `modal-title-${this.id}`,
        textContent: title
      });
      this.header.insertBefore(titleEl, this.header.firstChild);
      this.overlay.setAttribute('aria-labelledby', `modal-title-${this.id}`);
    }
    return this;
  }

  setSize(size) {
    this.modal.className = this.modal.className.replace(/modal-(sm|md|lg|xl|fullscreen)/, `modal-${size}`);
    this.options.size = size;
    return this;
  }

  setLoading(loading) {
    if (loading) {
      this.body.innerHTML = `
        <div class="modal-loading">
          <div class="modal-loading-spinner"></div>
          Loading...
        </div>
      `;
    }
    return this;
  }

  show() {
    if (this.isVisible) return this;

    // Store current focus
    this.previousFocus = document.activeElement;

    // Add to DOM if not already added
    if (!this.overlay.parentNode) {
      document.body.appendChild(this.overlay);
    }

    // Show modal
    this.isVisible = true;
    this.overlay.classList.add('active');
    document.body.classList.add('modal-open');

    // Focus management
    requestAnimationFrame(() => {
      this.updateFocusableElements();
      if (this.firstFocusable) {
        this.firstFocusable.focus();
      } else {
        this.modal.focus();
      }
    });

    this.emit('show');
    return this;
  }

  hide() {
    if (!this.isVisible) return this;

    this.isVisible = false;
    this.overlay.classList.remove('active');
    document.body.classList.remove('modal-open');

    // Restore focus
    if (this.previousFocus && this.previousFocus.focus) {
      this.previousFocus.focus();
    }

    this.emit('hide');
    return this;
  }

  close() {
    this.emit('close');
    this.hide();
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
    }, 200);

    return this;
  }

  toggle() {
    return this.isVisible ? this.hide() : this.show();
  }

  destroy() {
    // Remove event listeners
    if (this.handleKeyDown) {
      document.removeEventListener('keydown', this.handleKeyDown);
    }

    // Remove from DOM
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    // Clean up body class
    if (this.isVisible) {
      document.body.classList.remove('modal-open');
    }

    super.destroy();
  }

  isOpen() {
    return this.isVisible;
  }

  getSize() {
    return this.options.size;
  }

  getTitle() {
    return this.options.title;
  }

  // Static methods for common modal types
  static confirm(options = {}) {
    const modal = new Modal({
      size: 'sm',
      title: options.title || 'Confirm',
      className: 'modal-confirmation',
      closable: options.closable !== false,
      actions: [
        {
          text: options.cancelText || 'Cancel',
          className: 'modal-btn-secondary',
          onClick: () => {
            modal.close();
            if (options.onCancel) options.onCancel();
          }
        },
        {
          text: options.confirmText || 'OK',
          className: options.danger ? 'modal-btn-danger' : 'modal-btn-primary',
          onClick: () => {
            modal.close();
            if (options.onConfirm) options.onConfirm();
          }
        }
      ]
    });

    const content = `
      <div class="modal-confirmation">
        ${options.icon ? `<div class="modal-confirmation-icon ${options.iconClass || ''}">${options.icon}</div>` : ''}
        <div class="modal-confirmation-message">${options.message || 'Are you sure?'}</div>
        ${options.description ? `<div class="modal-confirmation-description">${options.description}</div>` : ''}
      </div>
    `;

    modal.render();
    modal.setContent(content);
    modal.show();

    return modal;
  }

  static alert(options = {}) {
    const modal = new Modal({
      size: 'sm',
      title: options.title || 'Alert',
      className: 'modal-confirmation',
      closable: options.closable !== false,
      actions: [
        {
          text: options.okText || 'OK',
          className: 'modal-btn-primary',
          onClick: () => {
            modal.close();
            if (options.onOk) options.onOk();
          }
        }
      ]
    });

    const content = `
      <div class="modal-confirmation">
        ${options.icon ? `<div class="modal-confirmation-icon ${options.iconClass || ''}">${options.icon}</div>` : ''}
        <div class="modal-confirmation-message">${options.message || ''}</div>
        ${options.description ? `<div class="modal-confirmation-description">${options.description}</div>` : ''}
      </div>
    `;

    modal.render();
    modal.setContent(content);
    modal.show();

    return modal;
  }

  static prompt(options = {}) {
    let inputValue = options.defaultValue || '';

    const modal = new Modal({
      size: 'sm',
      title: options.title || 'Input',
      className: 'modal-form',
      closable: options.closable !== false,
      actions: [
        {
          text: options.cancelText || 'Cancel',
          className: 'modal-btn-secondary',
          onClick: () => {
            modal.close();
            if (options.onCancel) options.onCancel();
          }
        },
        {
          text: options.confirmText || 'OK',
          className: 'modal-btn-primary',
          onClick: () => {
            modal.close();
            if (options.onConfirm) options.onConfirm(inputValue);
          }
        }
      ]
    });

    const content = `
      <div class="form-group">
        ${options.label ? `<label class="form-label">${options.label}</label>` : ''}
        <input type="${options.type || 'text'}" class="form-input" 
               placeholder="${options.placeholder || ''}" 
               value="${inputValue}" />
        ${options.help ? `<div class="form-help">${options.help}</div>` : ''}
      </div>
    `;

    modal.render();
    modal.setContent(content);

    // Setup input handling
    const input = modal.body.querySelector('.form-input');
    if (input) {
      input.addEventListener('input', (e) => {
        inputValue = e.target.value;
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          modal.close();
          if (options.onConfirm) options.onConfirm(inputValue);
        }
      });
    }

    modal.show();

    // Focus input after modal is shown
    setTimeout(() => {
      if (input) input.focus();
    }, 100);

    return modal;
  }
}