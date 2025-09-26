import bcrypt from 'bcryptjs'
import { User } from '../models/user.js'
import { UserSession } from '../models/user-session.js'
import { DatabaseService } from './database-service.js'

/**
 * Authentication Service
 * Handles user registration, login, session management
 */
export class AuthenticationService {
  constructor(databaseService = null) {
    this.db = databaseService
    this.databaseService = null
    this.saltRounds = 12
  }

  /**
   * Initialize the authentication service
   * Creates database service if not provided
   */
  async initialize() {
    if (!this.db) {
      this.databaseService = new DatabaseService()
      await this.databaseService.initialize()
      this.db = this.databaseService.db
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.databaseService) {
      await this.databaseService.close()
    }
    this.db = null
    this.databaseService = null
  }

  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @param {string} displayName - Optional display name
   * @returns {Promise<AuthResult>} Registration result
   */
  async registerUser(email, password, displayName = '') {
    try {
      // Validate input
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        }
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(password)
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.error
        }
      }

      // Create user instance for basic validation (email format, etc.)
      const cleanEmail = email.toLowerCase().trim()
      const cleanDisplayName = User.sanitizeDisplayName(displayName)
      
      // Basic email format validation  
      const user = new User({
        email: cleanEmail,
        display_name: cleanDisplayName,
        password_hash: 'temp' // Temporary hash to pass validation
      })

      const validation = user.validate()
      if (!validation.isValid) {
        // Filter out password hash error since we'll set it properly
        const nonPasswordErrors = validation.errors.filter(error => !error.includes('Password hash'))
        if (nonPasswordErrors.length > 0) {
          const hasEmailError = nonPasswordErrors.some(error => error.includes('email'))
          return {
            success: false,
            error: hasEmailError ? 'INVALID_EMAIL' : nonPasswordErrors.join(', ')
          }
        }
      }

      // Check if email already exists
      const existingUser = await this.getUserByEmail(cleanEmail)
      if (existingUser) {
        return {
          success: false,
          error: 'DUPLICATE_EMAIL'
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, this.saltRounds)
      user.password_hash = passwordHash
      user.email = cleanEmail
      user.display_name = cleanDisplayName

      // Insert user into database
      const database = this.db
      const stmt = database.prepare(`
        INSERT INTO users (email, password_hash, display_name, created_at)
        VALUES (?, ?, ?, ?)
      `)

      const now = new Date().toISOString()
      stmt.bind([user.email, passwordHash, user.display_name, now])
      const insertResult = stmt.step()
      stmt.finalize()

      // Check if insert was successful
      const changes = database.changes()
      if (changes === 0) {
        return {
          success: false,
          error: 'Failed to create user account'
        }
      }

      // Get the inserted user ID
      const lastInsertRowid = this.databaseService.sqlite3.capi.sqlite3_last_insert_rowid(database.pointer)
      
      // Set user ID and create session
      user.id = Number(lastInsertRowid)
      user.created_at = now
      
      const session = await this.createSession(user.id)

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          sessionToken: session.session_token
        }
      }

    } catch (error) {
      console.error('Registration error:', error)
      return {
        success: false,
        error: 'Registration failed due to server error'
      }
    }
  }

  /**
   * Login existing user
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<AuthResult>} Login result
   */
  async loginUser(email, password) {
    try {
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        }
      }

      // Get user by email
      const user = await this.getUserByEmail(email.toLowerCase().trim())
      if (!user) {
        return {
          success: false,
          error: 'INVALID_CREDENTIALS'
        }
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash)
      if (!isValid) {
        return {
          success: false,
          error: 'INVALID_CREDENTIALS'
        }
      }

      // Update last login
      user.updateLastLogin()
      await this.updateUserLastLogin(user.id, user.last_login)

      // Invalidate existing sessions
      await this.invalidateUserSessions(user.id)

      // Create new session
      const session = await this.createSession(user.id)

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          sessionToken: session.session_token
        }
      }

    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: 'Login failed due to server error'
      }
    }
  }

  /**
   * Validate session token
   * @param {string} token - Session token
   * @returns {Promise<SessionResult>} Validation result
   */
  async validateSession(token) {
    try {
      if (!token) {
        return {
          valid: false,
          error: 'Session token is required'
        }
      }

      const database = this.db
      
      // First check if session exists at all
      const checkStmt = database.prepare(`
        SELECT s.*, u.email, u.display_name
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ?
      `)

      checkStmt.bind([token])
      const checkHasRow = checkStmt.step()
      
      let checkResult = null
      if (checkHasRow) {
        const columnNames = checkStmt.getColumnNames()
        checkResult = {}
        for (let i = 0; i < columnNames.length; i++) {
          checkResult[columnNames[i]] = checkStmt.get(i)
        }
      }
      
      checkStmt.finalize()

      if (!checkResult) {
        return {
          valid: false,
          error: 'INVALID_SESSION'
        }
      }

      // Check if session is expired by converting to SQLite datetime format
      const expiredStmt = database.prepare("SELECT datetime('now') > datetime(?) as is_expired")
      expiredStmt.bind([checkResult.expires_at])
      const expiredHasRow = expiredStmt.step()
      const isExpired = expiredHasRow ? expiredStmt.get(0) : 1
      expiredStmt.finalize()

      if (isExpired) {
        return {
          valid: false,
          error: 'SESSION_EXPIRED'
        }
      }

      const result = checkResult

      // Create session instance and extend if needed
      const session = UserSession.fromDatabaseRow(result)
      
      if (session.needsRefresh()) {
        session.extend()
        await this.updateSessionExpiration(session.id, session.expires_at)
      }

      // Update last accessed time
      session.updateLastAccessed()
      await this.updateSessionAccess(session.id, session.last_accessed)

      return {
        valid: true,
        user: {
          id: result.user_id,
          email: result.email,
          displayName: result.display_name
        }
      }

    } catch (error) {
      console.error('Session validation error:', error)
      return {
        valid: false,
        error: 'Session validation failed'
      }
    }
  }

  /**
   * Logout user by invalidating session
   * @param {string} token - Session token
   * @returns {Promise<boolean>} Success status
   */
  async logoutUser(token) {
    try {
      if (!token) return true // Idempotent

      const database = this.db
      const stmt = database.prepare('DELETE FROM user_sessions WHERE session_token = ?')
      stmt.bind([token])
      stmt.step()
      stmt.finalize()

      return true
    } catch (error) {
      console.error('Logout error:', error)
      return true // Idempotent - don't fail logout
    }
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePassword(password) {
    if (!password || password.length < 8) {
      return {
        isValid: false,
        error: 'WEAK_PASSWORD'
      }
    }

    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return {
        isValid: false,
        error: 'WEAK_PASSWORD'
      }
    }

    return { isValid: true }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>} User instance or null
   */
  async getUserByEmail(email) {
    try {
      const database = this.db
      const stmt = database.prepare('SELECT * FROM users WHERE email = ?')
      stmt.bind([email])
      const hasRow = stmt.step()
      
      let result = null
      if (hasRow) {
        const columnNames = stmt.getColumnNames()
        result = {}
        for (let i = 0; i < columnNames.length; i++) {
          result[columnNames[i]] = stmt.get(i)
        }
      }
      
      stmt.finalize()
      return result ? User.fromDatabaseRow(result) : null
    } catch (error) {
      console.error('Get user by email error:', error)
      return null
    }
  }

  /**
   * Create new session
   * @param {number} userId - User ID
   * @returns {Promise<UserSession>} New session
   */
  async createSession(userId) {
    const session = UserSession.createNew(userId)
    
    const database = this.db
    const stmt = database.prepare(`
      INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_accessed)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.bind([
      session.user_id,
      session.session_token,
      session.expires_at,
      session.created_at,
      session.last_accessed
    ])
    stmt.step()
    stmt.finalize()

    const lastInsertRowid = this.databaseService.sqlite3.capi.sqlite3_last_insert_rowid(database.pointer)
    session.id = Number(lastInsertRowid)
    return session
  }

  /**
   * Update user's last login timestamp
   * @param {number} userId - User ID
   * @param {string} timestamp - ISO timestamp
   */
  async updateUserLastLogin(userId, timestamp) {
    const database = this.db
    const stmt = database.prepare('UPDATE users SET last_login = ? WHERE id = ?')
    stmt.bind([timestamp, userId])
    stmt.step()
    stmt.finalize()
  }

  /**
   * Invalidate all user sessions
   * @param {number} userId - User ID
   */
  async invalidateUserSessions(userId) {
    const database = this.db
    const stmt = database.prepare('DELETE FROM user_sessions WHERE user_id = ?')
    stmt.bind([userId])
    stmt.step()
    stmt.finalize()
  }

  /**
   * Update session expiration
   * @param {number} sessionId - Session ID
   * @param {string} expiresAt - New expiration timestamp
   */
  async updateSessionExpiration(sessionId, expiresAt) {
    const database = this.db
    const stmt = database.prepare('UPDATE user_sessions SET expires_at = ? WHERE id = ?')
    stmt.bind([expiresAt, sessionId])
    stmt.step()
    stmt.finalize()
  }

  /**
   * Update session last accessed
   * @param {number} sessionId - Session ID
   * @param {string} lastAccessed - Last accessed timestamp
   */
  async updateSessionAccess(sessionId, lastAccessed) {
    const database = this.db
    const stmt = database.prepare('UPDATE user_sessions SET last_accessed = ? WHERE id = ?')
    stmt.bind([lastAccessed, sessionId])
    stmt.step()
    stmt.finalize()
  }

  /**
   * Clean up expired sessions
   * @returns {Promise<number>} Number of sessions cleaned up
   */
  async cleanupExpiredSessions() {
    try {
      const database = this.db
      const stmt = database.prepare("DELETE FROM user_sessions WHERE expires_at < datetime('now')")
      stmt.step()
      stmt.finalize()

      return database.changes() || 0
    } catch (error) {
      console.error('Session cleanup error:', error)
      return 0
    }
  }
}