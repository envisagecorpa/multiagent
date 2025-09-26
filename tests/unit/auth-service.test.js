import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AuthenticationService } from '../../src/services/auth-service.js'

describe('AuthenticationService Contract Tests', () => {
  let authService

  beforeEach(async () => {
    // This will fail until AuthenticationService is implemented
    authService = new AuthenticationService()
    await authService.initialize()
  })

  afterEach(async () => {
    if (authService) {
      await authService.cleanup()
    }
  })

  describe('registerUser', () => {
    it('should register a new user with valid credentials', async () => {
      const result = await authService.registerUser(
        'test@example.com',
        'SecurePass123!',
        'Test User'
      )

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user.id).toBeTypeOf('number')
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.displayName).toBe('Test User')
      expect(result.user.sessionToken).toBeTypeOf('string')
      expect(result.user.sessionToken.length).toBeGreaterThan(32)
      expect(result.error).toBeUndefined()
    })

    it('should fail with invalid email format', async () => {
      const result = await authService.registerUser(
        'invalid-email',
        'SecurePass123!',
        'Test User'
      )

      expect(result.success).toBe(false)
      expect(result.user).toBeUndefined()
      expect(result.error).toBe('INVALID_EMAIL')
    })

    it('should fail with duplicate email', async () => {
      // Register first user
      await authService.registerUser('test@example.com', 'SecurePass123!', 'User 1')
      
      // Attempt duplicate registration
      const result = await authService.registerUser(
        'test@example.com',
        'DifferentPass456!',
        'User 2'
      )

      expect(result.success).toBe(false)
      expect(result.user).toBeUndefined()
      expect(result.error).toBe('DUPLICATE_EMAIL')
    })

    it('should fail with weak password', async () => {
      const result = await authService.registerUser(
        'test@example.com',
        'weak',
        'Test User'
      )

      expect(result.success).toBe(false)
      expect(result.user).toBeUndefined()
      expect(result.error).toBe('WEAK_PASSWORD')
    })

    it('should handle optional display name', async () => {
      const result = await authService.registerUser(
        'test@example.com',
        'SecurePass123!'
        // No display name provided
      )

      expect(result.success).toBe(true)
      expect(result.user.displayName).toBe('')
    })
  })

  describe('loginUser', () => {
    beforeEach(async () => {
      // Create test user for login tests
      await authService.registerUser('login@example.com', 'SecurePass123!', 'Login User')
    })

    it('should login with valid credentials', async () => {
      const result = await authService.loginUser('login@example.com', 'SecurePass123!')

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe('login@example.com')
      expect(result.user.displayName).toBe('Login User')
      expect(result.user.sessionToken).toBeTypeOf('string')
      expect(result.error).toBeUndefined()
    })

    it('should fail with invalid email', async () => {
      const result = await authService.loginUser('nonexistent@example.com', 'SecurePass123!')

      expect(result.success).toBe(false)
      expect(result.user).toBeUndefined()
      expect(result.error).toBe('INVALID_CREDENTIALS')
    })

    it('should fail with incorrect password', async () => {
      const result = await authService.loginUser('login@example.com', 'WrongPassword!')

      expect(result.success).toBe(false)
      expect(result.user).toBeUndefined()
      expect(result.error).toBe('INVALID_CREDENTIALS')
    })

    it('should generate new session token on each login', async () => {
      const result1 = await authService.loginUser('login@example.com', 'SecurePass123!')
      const result2 = await authService.loginUser('login@example.com', 'SecurePass123!')

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.user.sessionToken).not.toBe(result2.user.sessionToken)
    })
  })

  describe('validateSession', () => {
    let sessionToken

    beforeEach(async () => {
      const loginResult = await authService.registerUser('session@example.com', 'SecurePass123!', 'Session User')
      sessionToken = loginResult.user.sessionToken
    })

    it('should validate active session token', async () => {
      const result = await authService.validateSession(sessionToken)

      expect(result.valid).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe('session@example.com')
      expect(result.user.displayName).toBe('Session User')
      expect(result.error).toBeUndefined()
    })

    it('should reject invalid session token', async () => {
      const result = await authService.validateSession('invalid-token-12345')

      expect(result.valid).toBe(false)
      expect(result.user).toBeUndefined()
      expect(result.error).toBe('INVALID_SESSION')
    })

    it('should reject expired session token', async () => {
      // Create a user and session, then manually expire it
      const registerResult = await authService.registerUser('expired@example.com', 'SecurePass123!', 'Expired User')
      const validToken = registerResult.user.sessionToken
      
      // Manually update the session to be expired (1 hour ago)
      const expiredTime = new Date(Date.now() - 3600000).toISOString()
      const database = authService.db
      const updateStmt = database.prepare('UPDATE user_sessions SET expires_at = ? WHERE session_token = ?')
      updateStmt.bind([expiredTime, validToken])
      updateStmt.step()
      updateStmt.finalize()
      
      // Now test that it's rejected as expired
      const result = await authService.validateSession(validToken)

      expect(result.valid).toBe(false)
      expect(result.user).toBeUndefined()
      expect(result.error).toBe('SESSION_EXPIRED')
    })
  })

  describe('logoutUser', () => {
    let sessionToken

    beforeEach(async () => {
      const loginResult = await authService.registerUser('logout@example.com', 'SecurePass123!', 'Logout User')
      sessionToken = loginResult.user.sessionToken
    })

    it('should successfully logout with valid token', async () => {
      const result = await authService.logoutUser(sessionToken)

      expect(result).toBe(true)

      // Verify session is invalidated
      const validateResult = await authService.validateSession(sessionToken)
      expect(validateResult.valid).toBe(false)
    })

    it('should return true for invalid token (idempotent)', async () => {
      const result = await authService.logoutUser('invalid-token-12345')

      expect(result).toBe(true)
    })

    it('should return true for already logged out token', async () => {
      await authService.logoutUser(sessionToken)
      const result = await authService.logoutUser(sessionToken)

      expect(result).toBe(true)
    })
  })
})