/**
 * Base Component class for all UI components
 * Provides common functionality for component lifecycle and DOM management
 */
export class Component {
  constructor(element = null) {
    this.element = element
    this.domListeners = new Map() // For DOM event listeners
    this.eventListeners = new Map() // For custom event listeners
    this.children = new Map()
    this.destroyed = false
  }

  /**
   * Create the component's DOM element
   * Override in subclasses to define component structure
   */
  render() {
    throw new Error('render() method must be implemented by subclass')
  }

  /**
   * Mount the component to a parent element
   * @param {Element} parent - Parent DOM element
   * @param {boolean} replace - Whether to replace parent content
   */
  mount(parent, replace = false) {
    if (this.destroyed) {
      throw new Error('Cannot mount destroyed component')
    }

    if (!this.element) {
      this.element = this.render()
    }

    if (replace) {
      parent.innerHTML = ''
    }

    parent.appendChild(this.element)
    this.onMount()
    return this
  }

  /**
   * Unmount the component from its parent
   */
  unmount() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    this.onUnmount()
    return this
  }

  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    if (this.destroyed) return

    this.onDestroy()
    this.unmount()
    this.removeAllListeners()
    this.removeAllEventListeners()
    
    // Destroy child components
    for (const child of this.children.values()) {
      if (child && typeof child.destroy === 'function') {
        child.destroy()
      }
    }
    this.children.clear()

    this.element = null
    this.destroyed = true
  }

  /**
   * Add event listener and track it for cleanup
   * @param {Element} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   */
  addEventListener(element, event, handler, options = {}) {
    if (this.destroyed) return

    const key = `${event}_${Math.random()}`
    const boundHandler = handler.bind(this)
    
    element.addEventListener(event, boundHandler, options)
    
    this.domListeners.set(key, {
      element,
      event,
      handler: boundHandler,
      options
    })

    return key
  }

  /**
   * Remove specific event listener
   * @param {string} key - Listener key returned by addEventListener
   */
  removeEventListener(key) {
    if (this.domListeners.has(key)) {
      const { element, event, handler } = this.domListeners.get(key)
      element.removeEventListener(event, handler)
      this.domListeners.delete(key)
    }
  }

  /**
   * Remove all DOM event listeners
   */
  removeAllListeners() {
    for (const { element, event, handler } of this.domListeners.values()) {
      element.removeEventListener(event, handler)
    }
    this.domListeners.clear()
  }

  /**
   * Add child component
   * @param {Component} child - Child component
   * @param {string} name - Child name (optional)
   */
  addChild(child, name = null) {
    if (child && typeof child.destroy === 'function') {
      const childName = name || `child_${this.children.size}`
      this.children.set(childName, child)
    }
    return this
  }

  /**
   * Remove child component
   * @param {string} name - Child name
   */
  removeChild(name) {
    if (this.children.has(name)) {
      this.children.get(name).destroy()
      this.children.delete(name)
    }
    return this
  }

  /**
   * Remove all child components
   */
  removeAllChildren() {
    for (const child of this.children.values()) {
      child.destroy()
    }
    this.children.clear()
    return this
  }

  /**
   * Helper method to create DOM elements
   * @param {string} tagName - HTML tag name
   * @param {Object} attributes - Element attributes
   * @param {string} textContent - Element text content
   */
  createElement(tagName, attributes = {}, textContent = '') {
    const element = document.createElement(tagName)
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value)
      } else if (key.startsWith('data-') || key.startsWith('aria-')) {
        element.setAttribute(key, value)
      } else {
        element[key] = value
      }
    })

    if (textContent) {
      element.textContent = textContent
    }

    return element
  }

  /**
   * Find element within component
   * @param {string} selector - CSS selector
   */
  querySelector(selector) {
    return this.element?.querySelector(selector) || null
  }

  /**
   * Alias for querySelector for shorter syntax
   * @param {string} selector - CSS selector
   */
  find(selector) {
    return this.querySelector(selector)
  }

  /**
   * Find elements within component
   * @param {string} selector - CSS selector
   */
  querySelectorAll(selector) {
    return this.element?.querySelectorAll(selector) || []
  }

  /**
   * Alias for querySelectorAll for shorter syntax
   * @param {string} selector - CSS selector
   */
  findAll(selector) {
    return this.querySelectorAll(selector)
  }

  /**
   * Add CSS class to component element
   * @param {string} className - CSS class name
   */
  addClass(className) {
    if (this.element) {
      this.element.classList.add(className)
    }
    return this
  }

  /**
   * Remove CSS class from component element
   * @param {string} className - CSS class name
   */
  removeClass(className) {
    if (this.element) {
      this.element.classList.remove(className)
    }
    return this
  }

  /**
   * Toggle CSS class on component element
   * @param {string} className - CSS class name
   */
  toggleClass(className) {
    if (this.element) {
      this.element.classList.toggle(className)
    }
    return this
  }

  /**
   * Check if component element has CSS class
   * @param {string} className - CSS class name
   */
  hasClass(className) {
    return this.element?.classList.contains(className) || false
  }

  /**
   * Set component visibility
   * @param {boolean} visible - Whether component should be visible
   */
  setVisible(visible) {
    if (this.element) {
      this.element.style.display = visible ? '' : 'none'
    }
    return this
  }

  /**
   * Show component
   */
  show() {
    return this.setVisible(true)
  }

  /**
   * Hide component
   */
  hide() {
    return this.setVisible(false)
  }

  /**
   * Toggle component visibility
   */
  toggle() {
    if (!this.element) {
      return this
    }
    
    const isHidden = this.element?.style.display === 'none' || 
                     this.element?.hasAttribute('hidden')
    return isHidden ? this.show() : this.hide()
  }

  // Event handling
  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {function} handler - Event handler
   */
  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event).add(handler)
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} handler - Event handler
   */
  off(event, handler) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(handler)
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error)
        }
      })
    }
  }

  /**
   * Remove all custom event listeners
   */
  removeAllEventListeners() {
    this.eventListeners.clear()
  }

  // Lifecycle hooks - override in subclasses
  onMount() {}
  onUnmount() {}
  onDestroy() {}
}