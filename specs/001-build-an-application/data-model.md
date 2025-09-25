# Data Model: Photo Album Organization Application

**Feature**: Photo Album Organization Application  
**Branch**: 001-build-an-application  
**Date**: 2025-09-24

## Entity Relationship Overview

```
User (1) ←→ (N) Album (1) ←→ (N) Photo
     ↓           ↓              ↓
  UserSession  AlbumOrder   PhotoMetadata
```

## Core Entities

### User
Represents an authenticated user of the application.

**Attributes**:
- `id` (INTEGER PRIMARY KEY): Unique user identifier
- `email` (TEXT UNIQUE NOT NULL): User email address for authentication
- `password_hash` (TEXT NOT NULL): Hashed password for security
- `display_name` (TEXT): Optional display name
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP): Account creation timestamp
- `last_login` (DATETIME): Last successful login timestamp
- `preferences` (JSON): User preferences (theme, default view, etc.)

**Relationships**:
- One-to-many with Album
- One-to-one with UserSession (active session)

**Business Rules**:
- Email must be valid format and unique across system
- Password must meet security requirements (hashed storage only)
- Soft delete not allowed (privacy compliance)

### Album
Represents a photo album created by a user.

**Attributes**:
- `id` (INTEGER PRIMARY KEY): Unique album identifier
- `user_id` (INTEGER NOT NULL): Foreign key to User
- `name` (TEXT NOT NULL): Album name (user-defined)
- `description` (TEXT): Optional album description
- `date_range_start` (DATE): Optional start date for date-based grouping
- `date_range_end` (DATE): Optional end date for date-based grouping
- `sort_order` (INTEGER NOT NULL): User-defined sort position
- `photo_count` (INTEGER DEFAULT 0): Cached count of photos
- `cover_photo_id` (INTEGER): Foreign key to Photo (optional cover)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP): Creation timestamp
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP): Last modification timestamp

**Relationships**:
- Many-to-one with User
- One-to-many with Photo
- Many-to-one with Photo (cover_photo_id)

**Business Rules**:
- Album names can be duplicated (auto-numbered: "Summer 2024 (2)")
- Sort order must be unique per user (managed by application)
- No nested albums allowed (enforced at application level)
- Date ranges are optional but must be valid if provided

### Photo
Represents a photo file with metadata.

**Attributes**:
- `id` (INTEGER PRIMARY KEY): Unique photo identifier
- `album_id` (INTEGER NOT NULL): Foreign key to Album
- `file_path` (TEXT NOT NULL): Relative path to photo file
- `original_filename` (TEXT NOT NULL): Original filename from user
- `file_size` (INTEGER): File size in bytes
- `width` (INTEGER): Image width in pixels
- `height` (INTEGER): Image height in pixels
- `mime_type` (TEXT): MIME type (image/jpeg, image/png)
- `date_taken` (DATETIME): Date photo was taken (from EXIF if available)
- `date_added` (DATETIME DEFAULT CURRENT_TIMESTAMP): Date added to album
- `thumbnail_path` (TEXT): Path to generated thumbnail
- `checksum` (TEXT): File hash for duplicate detection
- `exif_data` (JSON): Extracted EXIF metadata

**Relationships**:
- Many-to-one with Album
- Zero-to-many with Album (as cover photo)

**Business Rules**:
- File path must be unique within album
- Supported formats: JPEG, PNG only
- Thumbnails generated automatically on add
- Date taken falls back to date added if EXIF unavailable
- Photos are ordered by date_taken DESC within albums

### UserSession
Represents an active user session with application state.

**Attributes**:
- `id` (INTEGER PRIMARY KEY): Unique session identifier
- `user_id` (INTEGER UNIQUE NOT NULL): Foreign key to User
- `session_token` (TEXT UNIQUE NOT NULL): Session authentication token
- `current_album_id` (INTEGER): Currently viewed album
- `view_mode` (TEXT DEFAULT 'grid')`: Current view mode (grid/list)
- `albums_per_page` (INTEGER DEFAULT 20): Pagination preference
- `photos_per_page` (INTEGER DEFAULT 50): Photos pagination preference
- `last_activity` (DATETIME DEFAULT CURRENT_TIMESTAMP): Last user activity
- `expires_at` (DATETIME NOT NULL): Session expiration time

**Relationships**:
- One-to-one with User
- Many-to-one with Album (current_album_id)

**Business Rules**:
- Sessions expire after 24 hours of inactivity
- Only one active session per user
- Session tokens must be cryptographically secure

## Database Schema

### SQLite Table Definitions

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  preferences JSON DEFAULT '{}'
);

-- Albums table
CREATE TABLE albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  date_range_start DATE,
  date_range_end DATE,
  sort_order INTEGER NOT NULL,
  photo_count INTEGER DEFAULT 0,
  cover_photo_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (cover_photo_id) REFERENCES photos(id)
);

-- Photos table
CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  album_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  date_taken DATETIME,
  date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
  thumbnail_path TEXT,
  checksum TEXT,
  exif_data JSON DEFAULT '{}',
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

-- User sessions table
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  current_album_id INTEGER,
  view_mode TEXT DEFAULT 'grid',
  albums_per_page INTEGER DEFAULT 20,
  photos_per_page INTEGER DEFAULT 50,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (current_album_id) REFERENCES albums(id)
);
```

### Indexes for Performance

```sql
-- User lookup indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_login ON users(last_login);

-- Album indexes
CREATE INDEX idx_albums_user_id ON albums(user_id);
CREATE INDEX idx_albums_sort_order ON albums(user_id, sort_order);
CREATE INDEX idx_albums_updated_at ON albums(updated_at);

-- Photo indexes
CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_date_taken ON photos(album_id, date_taken DESC);
CREATE INDEX idx_photos_checksum ON photos(checksum);

-- Session indexes
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

## Data Access Patterns

### Common Queries

1. **Get user albums ordered by sort position**:
   ```sql
   SELECT * FROM albums 
   WHERE user_id = ? 
   ORDER BY sort_order ASC
   ```

2. **Get photos in album by date (newest first)**:
   ```sql
   SELECT * FROM photos 
   WHERE album_id = ? 
   ORDER BY date_taken DESC, date_added DESC
   ```

3. **Update album sort orders after drag-drop**:
   ```sql
   UPDATE albums 
   SET sort_order = ?, updated_at = CURRENT_TIMESTAMP 
   WHERE id = ? AND user_id = ?
   ```

4. **Check for duplicate album names**:
   ```sql
   SELECT COUNT(*) FROM albums 
   WHERE user_id = ? AND name LIKE ?
   ```

### Performance Considerations

- Album sort order updates batched for drag-drop operations
- Photo thumbnails cached in IndexedDB for faster loading
- EXIF data extraction performed asynchronously
- Virtual scrolling for albums with 200+ photos
- Prepared statements for all database operations

## Data Validation Rules

### Client-Side Validation
- Email format validation using regex
- Password strength requirements (8+ chars, mixed case, numbers)
- File type validation (JPEG/PNG only)
- Image dimension validation (max 10000x10000px)
- Album name length (1-100 characters)

### Database Constraints
- Foreign key integrity enforced
- Unique constraints on email and session tokens
- Check constraints on date ranges (start <= end)
- NOT NULL constraints on required fields

## Migration Strategy

### Initial Schema Setup
1. Create all tables with proper constraints
2. Create indexes for performance
3. Insert default user preferences schema
4. Set up triggers for updated_at timestamps

### Future Schema Changes
- Use ALTER TABLE statements for non-breaking changes
- Backup data before major structural changes
- Version control schema migrations
- Test migrations with sample data

## Privacy and Security

### Data Protection
- Passwords stored as salted hashes only
- Session tokens cryptographically secure
- No photo file data stored in database (paths only)
- User data isolated by user_id foreign keys

### Data Retention
- User account deletion removes all associated data
- Session cleanup for expired sessions
- Optional photo thumbnail cleanup on album deletion
- Audit trail for data access (future enhancement)