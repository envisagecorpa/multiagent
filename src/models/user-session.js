/**
 * UserSession Model
 * Represents a user session for authentication state management
 */
export class UserSession {
  constructor({
    id = null,
    user_id = null,
    session_token = '',
    expires_at = null,
    created_at = null,
    last_accessed = null
  } = {}) {
    this.id = id
    this.user_id = user_id
    this.session_token = session_token
    this.expires_at = expires_at
    this.created_at = created_at || new Date().toISOString()
    this.last_accessed = last_accessed || new Date().toISOString()
  }

  /**
   * Validate session data
   * @returns {Object} Validation result with isValid and errors
   */
  validate() {
    const errors = []

    // User ID validation
    if (!this.user_id) {
      errors.push('User ID is required')
    }

    // Session token validation
    if (!this.session_token || this.session_token.length < 32) {
      errors.push('Session token must be at least 32 characters')
    }

    // Expiration validation
    if (!this.expires_at) {
      errors.push('Expiration date is required')
    } else {
      const expirationDate = new Date(this.expires_at)
      if (isNaN(expirationDate.getTime())) {
        errors.push('Invalid expiration date format')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if session is expired
   * @returns {boolean} True if session is expired
   */
  isExpired() {
    if (!this.expires_at) return true
    return new Date() > new Date(this.expires_at)
  }

  /**
   * Check if session is valid (not expired)
   * @returns {boolean} True if session is valid
   */
  isValid() {
    return !this.isExpired()
  }

  /**
   * Extend session expiration
   * @param {number} hours - Hours to extend (default: 24)
   */
  extend(hours = 24) {
    const now = new Date()
    const expirationTime = new Date(now.getTime() + (hours * 60 * 60 * 1000))
    this.expires_at = expirationTime.toISOString()
    this.last_accessed = now.toISOString()
  }

  /**
   * Update last accessed timestamp
   */
  updateLastAccessed() {
    this.last_accessed = new Date().toISOString()
  }

  /**
   * Generate secure session token
   * @returns {string} Secure random token
   */
  static generateToken() {
    // Generate cryptographically secure random token
    const array = new Uint8Array(32)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array)
    } else {
      // Fallback for environments without crypto.getRandomValues
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
    }
    
    // Convert to hex string
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Create new session with default expiration
   * @param {number} userId - User ID
   * @param {number} expirationHours - Hours until expiration (default: 24)
   * @returns {UserSession} New session instance
   */
  static createNew(userId, expirationHours = 24) {
    const now = new Date()
    const expirationTime = new Date(now.getTime() + (expirationHours * 60 * 60 * 1000))
    
    return new UserSession({
      user_id: userId,
      session_token: this.generateToken(),
      expires_at: expirationTime.toISOString(),
      created_at: now.toISOString(),
      last_accessed: now.toISOString()
    })
  }

  /**
   * Get remaining session time in minutes
   * @returns {number} Minutes until expiration (negative if expired)
   */
  getRemainingMinutes() {
    if (!this.expires_at) return 0
    
    const now = new Date()
    const expiration = new Date(this.expires_at)
    const diffMs = expiration.getTime() - now.getTime()
    
    return Math.floor(diffMs / (1000 * 60))
  }

  /**
   * Check if session needs refresh (less than 1 hour remaining)
   * @returns {boolean} True if session should be refreshed
   */
  needsRefresh() {
    return this.getRemainingMinutes() < 60
  }

  /**
   * Convert to plain object for database storage
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      user_id: this.user_id,
      session_token: this.session_token,
      expires_at: this.expires_at,
      created_at: this.created_at,
      last_accessed: this.last_accessed
    }
  }

  /**
   * Create UserSession instance from database row
   * @param {Object} row - Database row
   * @returns {UserSession} UserSession instance
   */
  static fromDatabaseRow(row) {
    return new UserSession({
      id: row.id,
      user_id: row.user_id,
      session_token: row.session_token,
      expires_at: row.expires_at,
      created_at: row.created_at,
      last_accessed: row.last_accessed
    })
  }

  /**
   * Get session info for client (excluding sensitive data)
   * @returns {Object} Public session data
   */
  getPublicData() {
    return {
      expires_at: this.expires_at,
      created_at: this.created_at,
      last_accessed: this.last_accessed,
      remaining_minutes: this.getRemainingMinutes()
    }
  }
}