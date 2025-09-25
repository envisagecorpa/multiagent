# Authentication Service Contract

**Service**: AuthenticationService  
**Version**: 1.0  
**Date**: 2025-09-24

## Interface Definition

### `registerUser(email: string, password: string, displayName?: string): Promise<AuthResult>`

**Purpose**: Register a new user account

**Input**:
- `email` (string): Valid email address, must be unique
- `password` (string): Plain text password (min 8 chars, mixed case, numbers)
- `displayName` (string, optional): User display name (max 50 chars)

**Output**: `AuthResult`
```typescript
interface AuthResult {
  success: boolean;
  user?: {
    id: number;
    email: string;
    displayName: string;
    sessionToken: string;
  };
  error?: string;
}
```

**Behavior**:
- MUST validate email format and uniqueness
- MUST hash password before storage (bcrypt, 12 rounds minimum)
- MUST generate secure session token
- MUST return error for duplicate email
- MUST sanitize display name input

### `loginUser(email: string, password: string): Promise<AuthResult>`

**Purpose**: Authenticate existing user

**Input**:
- `email` (string): User email address
- `password` (string): Plain text password

**Output**: `AuthResult` (same as registerUser)

**Behavior**:
- MUST verify email exists
- MUST verify password hash matches
- MUST generate new session token
- MUST update last_login timestamp
- MUST invalidate any existing session

### `validateSession(token: string): Promise<SessionResult>`

**Purpose**: Validate active session token

**Input**:
- `token` (string): Session token from client

**Output**: `SessionResult`
```typescript
interface SessionResult {
  valid: boolean;
  user?: {
    id: number;
    email: string;
    displayName: string;
  };
  error?: string;
}
```

**Behavior**:
- MUST check token exists and not expired
- MUST extend session expiration on valid access
- MUST return user data for valid sessions
- MUST clean up expired sessions

### `logoutUser(token: string): Promise<boolean>`

**Purpose**: Invalidate user session

**Input**:
- `token` (string): Session token to invalidate

**Output**: `boolean` - true if successfully logged out

**Behavior**:
- MUST remove session from database
- MUST return true even if session not found (idempotent)

## Error Handling

### Error Types
- `INVALID_EMAIL`: Email format validation failed
- `DUPLICATE_EMAIL`: Email already registered
- `WEAK_PASSWORD`: Password doesn't meet requirements
- `INVALID_CREDENTIALS`: Login failed (wrong email/password)
- `SESSION_EXPIRED`: Session token expired
- `SESSION_INVALID`: Session token not found or malformed

### Error Response Format
```typescript
interface AuthError {
  code: string;
  message: string;
  field?: string; // For validation errors
}
```

## Security Requirements

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, and numbers
- Hashed with bcrypt (cost factor 12)
- Plain text passwords never stored

### Session Security
- Tokens generated with crypto.getRandomValues()
- 256-bit entropy minimum
- 24-hour expiration (configurable)
- Secure transmission only (HTTPS in production)

### Rate Limiting
- Login attempts: 5 per minute per IP
- Registration: 3 per hour per IP
- Session validation: 100 per minute per token

## Testing Contract

### Unit Tests Required
- Valid email formats accepted
- Invalid email formats rejected
- Password strength validation
- Hash generation and verification
- Session token generation uniqueness
- Session expiration handling

### Integration Tests Required
- End-to-end registration flow
- End-to-end login flow
- Session persistence across requests
- Logout and session cleanup
- Concurrent session handling

### Performance Tests Required
- 100 concurrent logins < 1 second
- Session validation < 50ms average
- Password hashing < 200ms per operation

## Database Schema Dependencies

### Required Tables
- `users` (id, email, password_hash, display_name, created_at, last_login)
- `user_sessions` (id, user_id, session_token, expires_at, last_activity)

### Required Indexes
- `users.email` (unique)
- `user_sessions.session_token` (unique)
- `user_sessions.expires_at` (for cleanup)