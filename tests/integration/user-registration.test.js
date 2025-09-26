import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AuthenticationService } from '../../src/services/auth-service.js'
import { DatabaseService } from '../../src/services/database-service.js'

describe('User Registration Flow Integration Test', () => {
  let authService
  let dbService

  beforeEach(async () => {
    // Initialize services - these will fail until implemented
    dbService = new DatabaseService()
    await dbService.initialize()
    
    authService = new AuthenticationService(dbService)
    await authService.initialize()
  })

  afterEach(async () => {
    if (authService) await authService.cleanup()
    if (dbService) await dbService.close()
  })

  it('should complete full user registration and login flow', async () => {
    // Step 1: Register new user
    const registrationResult = await authService.registerUser(
      'integration@example.com',
      'SecurePassword123!',
      'Integration Test User'
    )

    expect(registrationResult.success).toBe(true)
    expect(registrationResult.user.sessionToken).toBeDefined()

    const userId = registrationResult.user.id
    const sessionToken = registrationResult.user.sessionToken

    // Step 2: Verify user exists in database
    const userRecord = await dbService.getUserById(userId)
    expect(userRecord).toBeDefined()
    expect(userRecord.email).toBe('integration@example.com')
    expect(userRecord.display_name).toBe('Integration Test User')

    // Step 3: Verify session is active
    const sessionValidation = await authService.validateSession(sessionToken)
    expect(sessionValidation.valid).toBe(true)
    expect(sessionValidation.user.id).toBe(userId)

    // Step 4: Logout user
    const logoutResult = await authService.logoutUser(sessionToken)
    expect(logoutResult).toBe(true)

    // Step 5: Verify session is invalidated
    const invalidSessionCheck = await authService.validateSession(sessionToken)
    expect(invalidSessionCheck.valid).toBe(false)

    // Step 6: Login with same credentials
    const loginResult = await authService.loginUser('integration@example.com', 'SecurePassword123!')
    expect(loginResult.success).toBe(true)
    expect(loginResult.user.id).toBe(userId)
    expect(loginResult.user.sessionToken).not.toBe(sessionToken) // New token generated

    // Step 7: Verify last login timestamp updated
    const updatedUserRecord = await dbService.getUserById(userId)
    expect(new Date(updatedUserRecord.last_login)).toBeInstanceOf(Date)
  })

  it('should handle concurrent registration attempts', async () => {
    const email = 'concurrent@example.com'
    const password = 'SecurePassword123!'

    // Attempt concurrent registrations with same email
    const [result1, result2] = await Promise.all([
      authService.registerUser(email, password, 'User 1'),
      authService.registerUser(email, password, 'User 2')
    ])

    // Only one should succeed
    const successes = [result1, result2].filter(r => r.success)
    const failures = [result1, result2].filter(r => !r.success)

    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)
    expect(failures[0].error).toBe('DUPLICATE_EMAIL')
  })

  it('should enforce password security requirements', async () => {
    const testCases = [
      { password: 'short', expectedError: 'WEAK_PASSWORD' },
      { password: 'alllowercase123', expectedError: 'WEAK_PASSWORD' },
      { password: 'ALLUPPERCASE123', expectedError: 'WEAK_PASSWORD' },
      { password: 'NoNumbers!', expectedError: 'WEAK_PASSWORD' },
      { password: 'ValidPassword123!', expectedError: null }
    ]

    for (const testCase of testCases) {
      const result = await authService.registerUser(
        `test${Date.now()}@example.com`,
        testCase.password,
        'Test User'
      )

      if (testCase.expectedError) {
        expect(result.success).toBe(false)
        expect(result.error).toBe(testCase.expectedError)
      } else {
        expect(result.success).toBe(true)
      }
    }
  })

  it('should clean up expired sessions automatically', async () => {
    // Register user
    const registrationResult = await authService.registerUser(
      'cleanup@example.com',
      'SecurePassword123!',
      'Cleanup Test User'
    )

    const sessionToken = registrationResult.user.sessionToken

    // Mock session expiration (in real implementation, this would be time-based)
    await dbService.expireSession(sessionToken)

    // Validate expired session
    const validationResult = await authService.validateSession(sessionToken)
    expect(validationResult.valid).toBe(false)
    expect(validationResult.error).toBe('SESSION_EXPIRED')

    // Verify expired session was cleaned up
    const sessionRecord = await dbService.getSessionByToken(sessionToken)
    expect(sessionRecord).toBeNull()
  })

  it('should handle database connection errors gracefully', async () => {
    // Simulate database connection failure
    await dbService.close()

    const result = await authService.registerUser(
      'error@example.com',
      'SecurePassword123!',
      'Error Test User'
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('DATABASE_ERROR')
  })
})