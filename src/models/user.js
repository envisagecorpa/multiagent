/**
 * User Model
 * Represents a user entity with validation and business logic
 */
export class User {
  constructor({
    id = null,
    email = '',
    password_hash = '',
    display_name = '',
    created_at = null,
    last_login = null,
    preferences = {}
  } = {}) {
    this.id = id
    this.email = email
    this.password_hash = password_hash
    this.display_name = display_name
    this.created_at = created_at
    this.last_login = last_login
    this.preferences = typeof preferences === 'string' ? JSON.parse(preferences) : preferences
  }

  /**
   * Validate user data
   * @returns {Object} Validation result with isValid and errors
   */
  validate() {
    const errors = []

    // Email validation
    if (!this.email) {
      errors.push('Email is required')
    } else if (!this.isValidEmail(this.email)) {
      errors.push('Invalid email format')
    }

    // Password hash validation (for registration)
    if (!this.password_hash) {
      errors.push('Password hash is required')
    }

    // Display name validation
    if (this.display_name && this.display_name.length > 50) {
      errors.push('Display name must be 50 characters or less')
    }

    // Preferences validation
    if (this.preferences && typeof this.preferences !== 'object') {
      errors.push('Preferences must be a valid object')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Sanitize display name
   * @param {string} displayName - Display name to sanitize
   * @returns {string} Sanitized display name
   */
  static sanitizeDisplayName(displayName) {
    if (!displayName) return ''
    
    return displayName
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 50) // Limit length
  }

  /**
   * Convert to plain object for database storage
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      email: this.email,
      password_hash: this.password_hash,
      display_name: this.display_name,
      created_at: this.created_at,
      last_login: this.last_login,
      preferences: JSON.stringify(this.preferences)
    }
  }

  /**
   * Create User instance from database row
   * @param {Object} row - Database row
   * @returns {User} User instance
   */
  static fromDatabaseRow(row) {
    return new User({
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      display_name: row.display_name,
      created_at: row.created_at,
      last_login: row.last_login,
      preferences: row.preferences
    })
  }

  /**
   * Get user's public data (excluding sensitive information)
   * @returns {Object} Public user data
   */
  getPublicData() {
    return {
      id: this.id,
      email: this.email,
      display_name: this.display_name,
      created_at: this.created_at,
      last_login: this.last_login
    }
  }

  /**
   * Update preferences
   * @param {Object} newPreferences - New preferences to merge
   */
  updatePreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences }
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin() {
    this.last_login = new Date().toISOString()
  }
}