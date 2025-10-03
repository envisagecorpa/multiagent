import { Component } from './Component.js'

/**
 * Notification system for displaying messages to users
 */
export class NotificationManager extends Component {
  constructor() {
    super()
    this.notifications = new Map()
    this.nextId = 1
  }

  render() {
    return this.createElement('div', {
      id: 'notifications',
      className: 'notifications',
      'aria-live': 'polite'
    })
  }

  /**
   * Show a notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, warning, info)
   * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
   * @returns {number} Notification ID
   */
  show(message, type = 'info', duration = 5000) {
    console.log('📢 NotificationManager: show() called')
    console.log('   message:', message)
    console.log('   type:', type)
    console.log('   duration:', duration)
    console.log('   this.element:', this.element)

    if (!this.element) {
      console.error('❌ NotificationManager: element is null! Manager not mounted to DOM.')
      console.error('   Call notifications.mount(container) before using it.')
      return -1
    }

    const id = this.nextId++
    const notification = this.createNotification(id, message, type)

    console.log('   Created notification:', notification)

    this.notifications.set(id, notification)
    this.element.appendChild(notification.element)
    console.log('✅ NotificationManager: Notification appended to DOM')

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id)
      }, duration)
    }

    return id
  }

  /**
   * Show success notification
   * @param {string} message - Success message
   * @param {number} duration - Auto-dismiss duration
   */
  success(message, duration = 5000) {
    console.log('✅ NotificationManager: success() called with:', message)
    return this.show(message, 'success', duration)
  }

  /**
   * Show error notification
   * @param {string} message - Error message
   * @param {number} duration - Auto-dismiss duration
   */
  error(message, duration = 8000) {
    console.log('🚨 NotificationManager: error() called with:', message)
    return this.show(message, 'error', duration)
  }

  /**
   * Show warning notification
   * @param {string} message - Warning message
   * @param {number} duration - Auto-dismiss duration
   */
  warning(message, duration = 6000) {
    return this.show(message, 'warning', duration)
  }

  /**
   * Show info notification
   * @param {string} message - Info message
   * @param {number} duration - Auto-dismiss duration
   */
  info(message, duration = 5000) {
    return this.show(message, 'info', duration)
  }

  /**
   * Dismiss a notification
   * @param {number} id - Notification ID
   */
  dismiss(id) {
    const notification = this.notifications.get(id)
    if (notification) {
      // Animate out
      notification.element.style.transition = 'all 0.3s ease-out'
      notification.element.style.opacity = '0'
      notification.element.style.transform = 'translateX(100%)'
      
      setTimeout(() => {
        if (notification.element.parentNode) {
          notification.element.parentNode.removeChild(notification.element)
        }
        this.notifications.delete(id)
      }, 300)
    }
  }

  /**
   * Dismiss all notifications
   */
  dismissAll() {
    for (const id of this.notifications.keys()) {
      this.dismiss(id)
    }
  }

  /**
   * Create notification element
   * @param {number} id - Notification ID
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   */
  createNotification(id, message, type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    }

    const element = this.createElement('div', {
      className: `notification notification-${type}`,
      role: 'alert',
      'aria-live': 'assertive'
    })

    const content = this.createElement('div', {
      className: 'notification-content'
    })

    const icon = this.createElement('span', {
      className: 'notification-icon',
      'aria-hidden': 'true'
    }, icons[type] || icons.info)

    const text = this.createElement('span', {
      className: 'notification-text'
    }, message)

    const closeBtn = this.createElement('button', {
      className: 'notification-close',
      type: 'button',
      'aria-label': 'Dismiss notification',
      onclick: () => this.dismiss(id)
    }, '×')

    content.appendChild(icon)
    content.appendChild(text)
    element.appendChild(content)
    element.appendChild(closeBtn)

    // Animate in after a brief delay
    setTimeout(() => {
      element.style.opacity = '1'
      element.style.transform = 'translateX(0)'
    }, 10)

    return { element, id, type, message }
  }

  onDestroy() {
    this.dismissAll()
  }
}

// Create global notification manager instance
export const notifications = new NotificationManager()