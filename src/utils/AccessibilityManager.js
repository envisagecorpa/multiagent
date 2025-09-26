/**
 * Accessibility Enhancement Utilities
 * Provides comprehensive accessibility features and ARIA support
 */

export class AccessibilityManager {
  constructor(options = {}) {
    this.options = {
      enableAnnouncements: true,
      enableKeyboardNavigation: true,
      enableFocusManagement: true,
      enableColorContrast: true,
      enableMotionReduction: true,
      announceDelay: 100,
      ...options
    };

    this.announcer = null;
    this.focusHistory = [];
    this.keyboardListeners = new Map();
    this.observers = new Map();
    
    this.init();
  }

  init() {
    this.createAnnouncer();
    this.setupMediaQueryObservers();
    this.setupGlobalKeyboardHandlers();
    this.setupFocusManagement();
    this.checkAccessibilityPreferences();
  }

  // Screen Reader Announcements
  createAnnouncer() {
    this.announcer = document.createElement('div');
    this.announcer.id = 'a11y-announcer';
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.style.cssText = `
      position: absolute !important;
      left: -10000px !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
    `;
    
    document.body.appendChild(this.announcer);
  }

  announce(message, priority = 'polite') {
    if (!this.options.enableAnnouncements || !this.announcer) return;

    this.announcer.setAttribute('aria-live', priority);
    
    // Clear previous message
    this.announcer.textContent = '';
    
    // Announce new message after brief delay
    setTimeout(() => {
      this.announcer.textContent = message;
    }, this.options.announceDelay);
  }

  announceImmediate(message) {
    this.announce(message, 'assertive');
  }

  // Focus Management
  setupFocusManagement() {
    if (!this.options.enableFocusManagement) return;

    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
  }

  handleFocusIn(event) {
    this.focusHistory.push({
      element: event.target,
      timestamp: Date.now()
    });

    // Limit history size
    if (this.focusHistory.length > 50) {
      this.focusHistory.shift();
    }
  }

  handleFocusOut(event) {
    // Add any focus-out specific logic here
  }

  saveFocus() {
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body) {
      this.savedFocus = activeElement;
    }
  }

  restoreFocus() {
    if (this.savedFocus && this.savedFocus.isConnected) {
      this.savedFocus.focus();
      this.savedFocus = null;
    }
  }

  focusFirstInteractive(container) {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      return true;
    }
    return false;
  }

  focusLastInteractive(container) {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
      return true;
    }
    return false;
  }

  getFocusableElements(container = document) {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(el => this.isVisible(el) && this.isInteractive(el));
  }

  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  isInteractive(element) {
    return !element.disabled && 
           !element.hasAttribute('aria-disabled') &&
           element.tabIndex !== -1;
  }

  // Keyboard Navigation
  setupGlobalKeyboardHandlers() {
    if (!this.options.enableKeyboardNavigation) return;

    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
  }

  handleGlobalKeydown(event) {
    // Handle global keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '/':
          event.preventDefault();
          this.focusSearch();
          break;
        case 'k':
          event.preventDefault();
          this.focusSearch();
          break;
      }
    }

    // Handle modal/dialog keyboard navigation
    if (event.key === 'Escape') {
      this.handleEscapeKey(event);
    }
  }

  focusSearch() {
    const searchInput = document.querySelector('[role="search"] input, input[type="search"]');
    if (searchInput) {
      searchInput.focus();
      this.announce('Search focused');
    }
  }

  handleEscapeKey(event) {
    // Find the topmost modal or dialog
    const modal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])');
    if (modal) {
      // Trigger close event
      const closeEvent = new CustomEvent('modal:close', {
        bubbles: true,
        detail: { source: 'keyboard' }
      });
      modal.dispatchEvent(closeEvent);
    }
  }

  // Roving Tabindex Implementation
  createRovingTabindex(container, options = {}) {
    const settings = {
      selector: '[role="gridcell"], [role="option"], [role="tab"]',
      orientation: 'horizontal', // 'horizontal', 'vertical', 'both'
      wrap: true,
      ...options
    };

    const elements = Array.from(container.querySelectorAll(settings.selector));
    if (elements.length === 0) return;

    // Set initial tabindex
    elements.forEach((el, index) => {
      el.tabIndex = index === 0 ? 0 : -1;
    });

    // Add keyboard handlers
    const handleKeydown = (event) => {
      const currentIndex = elements.indexOf(event.target);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      let handled = false;

      switch (event.key) {
        case 'ArrowRight':
          if (settings.orientation === 'horizontal' || settings.orientation === 'both') {
            nextIndex = settings.wrap && currentIndex === elements.length - 1 ? 0 : currentIndex + 1;
            handled = true;
          }
          break;
        case 'ArrowLeft':
          if (settings.orientation === 'horizontal' || settings.orientation === 'both') {
            nextIndex = settings.wrap && currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
            handled = true;
          }
          break;
        case 'ArrowDown':
          if (settings.orientation === 'vertical' || settings.orientation === 'both') {
            nextIndex = settings.wrap && currentIndex === elements.length - 1 ? 0 : currentIndex + 1;
            handled = true;
          }
          break;
        case 'ArrowUp':
          if (settings.orientation === 'vertical' || settings.orientation === 'both') {
            nextIndex = settings.wrap && currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
            handled = true;
          }
          break;
        case 'Home':
          nextIndex = 0;
          handled = true;
          break;
        case 'End':
          nextIndex = elements.length - 1;
          handled = true;
          break;
      }

      if (handled && nextIndex !== currentIndex && elements[nextIndex]) {
        event.preventDefault();
        
        // Update tabindex
        elements[currentIndex].tabIndex = -1;
        elements[nextIndex].tabIndex = 0;
        elements[nextIndex].focus();
      }
    };

    elements.forEach(el => {
      el.addEventListener('keydown', handleKeydown);
    });

    // Return cleanup function
    return () => {
      elements.forEach(el => {
        el.removeEventListener('keydown', handleKeydown);
      });
    };
  }

  // ARIA State Management
  setAriaExpanded(element, expanded) {
    element.setAttribute('aria-expanded', expanded.toString());
    
    // Announce state change
    const label = element.getAttribute('aria-label') || element.textContent.trim();
    this.announce(`${label} ${expanded ? 'expanded' : 'collapsed'}`);
  }

  setAriaSelected(element, selected) {
    element.setAttribute('aria-selected', selected.toString());
    
    if (selected) {
      const label = element.getAttribute('aria-label') || element.textContent.trim();
      this.announce(`${label} selected`);
    }
  }

  setAriaChecked(element, checked) {
    element.setAttribute('aria-checked', checked.toString());
    
    const label = element.getAttribute('aria-label') || element.textContent.trim();
    this.announce(`${label} ${checked ? 'checked' : 'unchecked'}`);
  }

  setAriaDisabled(element, disabled) {
    element.setAttribute('aria-disabled', disabled.toString());
    
    if (disabled) {
      element.tabIndex = -1;
    } else {
      element.removeAttribute('tabindex');
    }
  }

  // Media Query Observers
  setupMediaQueryObservers() {
    // Reduced motion
    if (window.matchMedia) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.handleReducedMotion(prefersReducedMotion);
      prefersReducedMotion.addListener(this.handleReducedMotion.bind(this));

      // High contrast
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
      this.handleHighContrast(prefersHighContrast);
      prefersHighContrast.addListener(this.handleHighContrast.bind(this));

      // Color scheme
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
      this.handleColorScheme(prefersDarkMode);
      prefersDarkMode.addListener(this.handleColorScheme.bind(this));
    }
  }

  handleReducedMotion(mediaQuery) {
    if (!this.options.enableMotionReduction) return;

    document.documentElement.classList.toggle('reduce-motion', mediaQuery.matches);
    
    if (mediaQuery.matches) {
      // Disable or reduce animations
      document.documentElement.style.setProperty('--animation-duration', '0s');
      document.documentElement.style.setProperty('--transition-duration', '0s');
    } else {
      document.documentElement.style.removeProperty('--animation-duration');
      document.documentElement.style.removeProperty('--transition-duration');
    }
  }

  handleHighContrast(mediaQuery) {
    if (!this.options.enableColorContrast) return;

    document.documentElement.classList.toggle('high-contrast', mediaQuery.matches);
  }

  handleColorScheme(mediaQuery) {
    document.documentElement.classList.toggle('dark-mode', mediaQuery.matches);
  }

  // Accessibility Preferences
  checkAccessibilityPreferences() {
    // Check for screen reader
    this.detectScreenReader();
    
    // Check for keyboard navigation preference
    this.detectKeyboardNavigation();
  }

  detectScreenReader() {
    // Basic screen reader detection
    const hasScreenReader = 
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver') ||
      window.speechSynthesis !== undefined;

    if (hasScreenReader) {
      document.documentElement.classList.add('screen-reader');
    }
  }

  detectKeyboardNavigation() {
    let usingKeyboard = false;

    const handleKeydown = (event) => {
      if (event.key === 'Tab') {
        usingKeyboard = true;
        document.documentElement.classList.add('keyboard-navigation');
        document.removeEventListener('keydown', handleKeydown);
        
        // Add mouse handler to remove class
        document.addEventListener('mousedown', () => {
          usingKeyboard = false;
          document.documentElement.classList.remove('keyboard-navigation');
        }, { once: true });
      }
    };

    document.addEventListener('keydown', handleKeydown);
  }

  // Live Region Management
  createLiveRegion(id, options = {}) {
    const settings = {
      level: 'polite',
      atomic: 'true',
      relevant: 'additions text',
      ...options
    };

    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', settings.level);
    region.setAttribute('aria-atomic', settings.atomic);
    region.setAttribute('aria-relevant', settings.relevant);
    region.style.cssText = `
      position: absolute !important;
      left: -10000px !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
    `;

    document.body.appendChild(region);
    return region;
  }

  updateLiveRegion(regionId, message) {
    const region = document.getElementById(regionId);
    if (region) {
      region.textContent = message;
    }
  }

  // Form Accessibility
  enhanceFormAccessibility(form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      // Associate labels
      this.associateLabel(input);
      
      // Add required indicators
      this.addRequiredIndicator(input);
      
      // Setup error announcement
      this.setupErrorAnnouncement(input);
    });
  }

  associateLabel(input) {
    if (input.id && !input.getAttribute('aria-labelledby')) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        input.setAttribute('aria-labelledby', label.id || this.generateId('label'));
      }
    }
  }

  addRequiredIndicator(input) {
    if (input.required && !input.getAttribute('aria-required')) {
      input.setAttribute('aria-required', 'true');
    }
  }

  setupErrorAnnouncement(input) {
    input.addEventListener('invalid', (event) => {
      const errorMessage = input.validationMessage;
      this.announceImmediate(`Error: ${errorMessage}`);
    });
  }

  // Utility methods
  generateId(prefix = 'a11y') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  destroy() {
    // Remove announcer
    if (this.announcer && this.announcer.parentNode) {
      this.announcer.parentNode.removeChild(this.announcer);
    }

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Remove event listeners
    this.keyboardListeners.forEach((listener, element) => {
      element.removeEventListener('keydown', listener);
    });
    this.keyboardListeners.clear();
  }
}

/**
 * Color Contrast Utilities
 */
export class ColorContrast {
  static calculateContrast(color1, color2) {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }

  static getLuminance(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const rsRGB = rgb.r / 255;
    const gsRGB = rgb.g / 255;
    const bsRGB = rgb.b / 255;

    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  static meetsWCAG(color1, color2, level = 'AA') {
    const contrast = this.calculateContrast(color1, color2);
    
    switch (level) {
      case 'AA':
        return contrast >= 4.5;
      case 'AAA':
        return contrast >= 7;
      case 'AA-large':
        return contrast >= 3;
      case 'AAA-large':
        return contrast >= 4.5;
      default:
        return false;
    }
  }
}

// Create default instance
export const accessibilityManager = new AccessibilityManager();

export default {
  AccessibilityManager,
  ColorContrast,
  accessibilityManager
};