# API Documentation

## Overview

The Photo Album Application provides a comprehensive client-side API for managing photos, albums, users, and search functionality. All services are built on top of SQLite WASM for local data storage.

## Services Architecture

### Service Base Class

All services extend the base `Service` class which provides:

```javascript
class Service {
  constructor(database) {
    this.db = database;
    this.isInitialized = false;
  }
  
  async init() {
    // Override in subclasses
  }
  
  async destroy() {
    // Cleanup resources
  }
}
```

## AuthService

Handles user authentication and session management.

### Methods

#### `async register(userData)`

Registers a new user account.

**Parameters:**
```javascript
userData = {
  username: string,    // Required, 3-50 characters
  email: string,       // Required, valid email format
  password: string,    // Required, minimum 8 characters
  displayName?: string // Optional display name
}
```

**Returns:**
```javascript
{
  success: boolean,
  user?: {
    id: string,
    username: string,
    email: string,
    displayName: string,
    createdAt: string,
    avatar?: string
  },
  error?: string
}
```

**Example:**
```javascript
const result = await authService.register({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'securePassword123',
  displayName: 'John Doe'
});

if (result.success) {
  console.log('User registered:', result.user);
} else {
  console.error('Registration failed:', result.error);
}
```

#### `async login(credentials)`

Authenticates a user and creates a session.

**Parameters:**
```javascript
credentials = {
  username: string,    // Username or email
  password: string,    // User password
  rememberMe?: boolean // Optional, defaults to false
}
```

**Returns:**
```javascript
{
  success: boolean,
  user?: User,
  token?: string,
  error?: string
}
```

#### `async logout()`

Logs out the current user and clears session.

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

#### `async getCurrentUser()`

Gets the currently authenticated user.

**Returns:**
```javascript
User | null
```

#### `async updateProfile(userData)`

Updates user profile information.

**Parameters:**
```javascript
userData = {
  displayName?: string,
  email?: string,
  avatar?: File,
  bio?: string
}
```

#### `async changePassword(passwords)`

Changes user password.

**Parameters:**
```javascript
passwords = {
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
}
```

---

## PhotoService

Manages photo upload, storage, and metadata.

### Methods

#### `async uploadPhoto(file, metadata)`

Uploads a photo with metadata.

**Parameters:**
```javascript
file = File                    // Photo file to upload
metadata = {
  title?: string,              // Photo title
  description?: string,        // Photo description
  tags?: string[],            // Array of tags
  albumId?: string,           // Album to add photo to
  location?: {                // GPS location
    lat: number,
    lng: number,
    address?: string
  },
  takenAt?: Date             // When photo was taken
}
```

**Returns:**
```javascript
{
  success: boolean,
  photo?: {
    id: string,
    filename: string,
    title: string,
    description: string,
    fileSize: number,
    mimeType: string,
    width: number,
    height: number,
    url: string,
    thumbnailUrl: string,
    tags: string[],
    location?: Location,
    takenAt: string,
    uploadedAt: string,
    userId: string,
    albumId?: string
  },
  error?: string
}
```

**Example:**
```javascript
const fileInput = document.getElementById('photo-input');
const file = fileInput.files[0];

const result = await photoService.uploadPhoto(file, {
  title: 'Sunset at the Beach',
  description: 'Beautiful sunset captured during vacation',
  tags: ['vacation', 'sunset', 'beach', 'nature'],
  location: {
    lat: 40.7128,
    lng: -74.0060,
    address: 'New York, NY'
  }
});
```

#### `async getPhotos(options)`

Retrieves photos with filtering and pagination.

**Parameters:**
```javascript
options = {
  limit?: number,             // Default: 20
  offset?: number,            // Default: 0
  sortBy?: string,           // 'uploadedAt', 'takenAt', 'title'
  sortOrder?: string,        // 'asc', 'desc'
  albumId?: string,          // Filter by album
  tags?: string[],           // Filter by tags
  startDate?: Date,          // Filter by date range
  endDate?: Date,
  search?: string            // Text search
}
```

**Returns:**
```javascript
{
  success: boolean,
  photos?: Photo[],
  total?: number,
  hasMore?: boolean,
  error?: string
}
```

#### `async getPhoto(photoId)`

Gets a single photo by ID.

**Parameters:**
- `photoId: string` - Photo identifier

**Returns:**
```javascript
{
  success: boolean,
  photo?: Photo,
  error?: string
}
```

#### `async updatePhoto(photoId, updates)`

Updates photo metadata.

**Parameters:**
```javascript
photoId = string
updates = {
  title?: string,
  description?: string,
  tags?: string[],
  location?: Location
}
```

#### `async deletePhoto(photoId)`

Deletes a photo and its files.

**Parameters:**
- `photoId: string` - Photo identifier

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

#### `async generateThumbnail(file, options)`

Generates thumbnail for uploaded photo.

**Parameters:**
```javascript
file = File
options = {
  width?: number,            // Default: 300
  height?: number,           // Default: 300
  quality?: number           // Default: 0.8
}
```

---

## AlbumService

Manages photo albums and collections.

### Methods

#### `async createAlbum(albumData)`

Creates a new photo album.

**Parameters:**
```javascript
albumData = {
  name: string,              // Required, album name
  description?: string,      // Optional description
  coverPhotoId?: string,     // Optional cover photo
  isPrivate?: boolean,       // Default: false
  tags?: string[]           // Optional tags
}
```

**Returns:**
```javascript
{
  success: boolean,
  album?: {
    id: string,
    name: string,
    description: string,
    coverPhotoId?: string,
    coverPhotoUrl?: string,
    photoCount: number,
    isPrivate: boolean,
    tags: string[],
    createdAt: string,
    updatedAt: string,
    userId: string
  },
  error?: string
}
```

#### `async getAlbums(options)`

Retrieves user's albums.

**Parameters:**
```javascript
options = {
  limit?: number,
  offset?: number,
  sortBy?: string,           // 'name', 'createdAt', 'updatedAt'
  sortOrder?: string,        // 'asc', 'desc'
  includePrivate?: boolean,  // Default: true
  search?: string
}
```

#### `async getAlbum(albumId, options)`

Gets a single album with photos.

**Parameters:**
```javascript
albumId = string
options = {
  includePhotos?: boolean,   // Default: true
  photoLimit?: number,       // Default: 50
  photoOffset?: number       // Default: 0
}
```

#### `async updateAlbum(albumId, updates)`

Updates album information.

**Parameters:**
```javascript
albumId = string
updates = {
  name?: string,
  description?: string,
  coverPhotoId?: string,
  isPrivate?: boolean,
  tags?: string[]
}
```

#### `async deleteAlbum(albumId, options)`

Deletes an album.

**Parameters:**
```javascript
albumId = string
options = {
  deletePhotos?: boolean     // Default: false
}
```

#### `async addPhotosToAlbum(albumId, photoIds)`

Adds photos to an album.

**Parameters:**
- `albumId: string` - Album identifier
- `photoIds: string[]` - Array of photo IDs

#### `async removePhotosFromAlbum(albumId, photoIds)`

Removes photos from an album.

---

## SearchService

Provides advanced search and filtering capabilities.

### Methods

#### `async search(query, options)`

Performs full-text search across photos and albums.

**Parameters:**
```javascript
query = string               // Search query
options = {
  type?: string,             // 'photos', 'albums', 'all'
  limit?: number,
  offset?: number,
  filters?: {
    tags?: string[],
    dateRange?: {
      start: Date,
      end: Date
    },
    location?: {
      lat: number,
      lng: number,
      radius: number         // In kilometers
    },
    fileType?: string[],     // 'image/jpeg', 'image/png', etc.
    albumId?: string
  },
  sortBy?: string,
  sortOrder?: string
}
```

**Returns:**
```javascript
{
  success: boolean,
  results?: {
    photos: Photo[],
    albums: Album[],
    total: number,
    facets: {
      tags: { name: string, count: number }[],
      fileTypes: { type: string, count: number }[],
      years: { year: number, count: number }[]
    }
  },
  error?: string
}
```

#### `async getSuggestions(query, type)`

Gets search suggestions for autocomplete.

**Parameters:**
- `query: string` - Partial search query
- `type: string` - 'tags', 'locations', 'albums'

**Returns:**
```javascript
{
  success: boolean,
  suggestions?: string[],
  error?: string
}
```

#### `async indexContent()`

Rebuilds search index (maintenance operation).

#### `async getPopularTags(limit)`

Gets most popular tags.

**Parameters:**
- `limit: number` - Number of tags to return

---

## Event System

All services emit events through the global EventBus for loose coupling.

### Common Events

#### Photo Events
```javascript
// Photo uploaded
eventBus.emit('photo:uploaded', { photo });

// Photo updated
eventBus.emit('photo:updated', { photoId, updates });

// Photo deleted
eventBus.emit('photo:deleted', { photoId });

// Photo viewed
eventBus.emit('photo:viewed', { photoId });
```

#### Album Events
```javascript
// Album created
eventBus.emit('album:created', { album });

// Album updated
eventBus.emit('album:updated', { albumId, updates });

// Album deleted
eventBus.emit('album:deleted', { albumId });

// Photos added to album
eventBus.emit('album:photos-added', { albumId, photoIds });
```

#### Auth Events
```javascript
// User logged in
eventBus.emit('auth:login', { user });

// User logged out
eventBus.emit('auth:logout');

// Profile updated
eventBus.emit('auth:profile-updated', { user });
```

#### Search Events
```javascript
// Search performed
eventBus.emit('search:performed', { query, results });

// Search index updated
eventBus.emit('search:index-updated');
```

### Usage Example

```javascript
// Listen for photo uploads
eventBus.on('photo:uploaded', (data) => {
  console.log('New photo uploaded:', data.photo);
  // Update UI, clear cache, etc.
});

// Listen for errors
eventBus.on('error', (error) => {
  console.error('Service error:', error);
  // Show user notification
});
```

## Error Handling

All services use consistent error handling patterns.

### Error Types

```javascript
// Validation errors
{
  type: 'validation',
  field: string,
  message: string,
  code: 'REQUIRED' | 'INVALID_FORMAT' | 'TOO_SHORT' | 'TOO_LONG'
}

// Database errors
{
  type: 'database',
  message: string,
  code: 'CONNECTION_FAILED' | 'QUERY_FAILED' | 'CONSTRAINT_VIOLATION'
}

// Authentication errors
{
  type: 'auth',
  message: string,
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'TOKEN_EXPIRED'
}

// File system errors
{
  type: 'filesystem',
  message: string,
  code: 'FILE_NOT_FOUND' | 'INSUFFICIENT_SPACE' | 'UNSUPPORTED_FORMAT'
}
```

### Error Handling Example

```javascript
try {
  const result = await photoService.uploadPhoto(file, metadata);
  
  if (!result.success) {
    // Handle specific error types
    if (result.error.type === 'validation') {
      showFieldError(result.error.field, result.error.message);
    } else {
      showGenericError(result.error.message);
    }
    return;
  }
  
  // Success handling
  console.log('Photo uploaded:', result.photo);
  
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
  showGenericError('An unexpected error occurred');
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);
```

### Photos Table
```sql
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  title TEXT,
  description TEXT,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  taken_at DATETIME,
  location_lat REAL,
  location_lng REAL,
  location_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Albums Table
```sql
CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_photo_id TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  photo_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL
);
```

### Photo_Albums Table (Many-to-Many)
```sql
CREATE TABLE photo_albums (
  photo_id TEXT NOT NULL,
  album_id TEXT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (photo_id, album_id),
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);
```

### Tags Table
```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Photo_Tags Table (Many-to-Many)
```sql
CREATE TABLE photo_tags (
  photo_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (photo_id, tag_id),
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

## Performance Considerations

### Caching Strategy

- **Photos**: Cached with expiration based on last modified date
- **Albums**: Cached for 5 minutes with cache invalidation on updates
- **Search Results**: Cached for 1 minute to improve search performance
- **User Data**: Cached for session duration

### Database Optimization

- **Indexes**: Proper indexing on frequently queried columns
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized SQL queries with proper joins
- **Batch Operations**: Bulk operations for multiple records

### File Handling

- **Streaming**: Large file uploads use streaming for memory efficiency
- **Thumbnails**: Generated asynchronously to avoid blocking UI
- **Compression**: Automatic image compression for storage optimization
- **Cleanup**: Automatic cleanup of orphaned files

## Security Considerations

### Authentication

- **Password Hashing**: bcrypt with salt for secure password storage
- **Session Management**: Secure session tokens with expiration
- **CSRF Protection**: Anti-CSRF tokens for state-changing operations
- **Rate Limiting**: API rate limiting to prevent abuse

### File Security

- **File Type Validation**: Strict validation of uploaded file types
- **Size Limits**: File size limits to prevent storage abuse
- **Virus Scanning**: Optional virus scanning for uploaded files
- **Access Control**: Proper access control for private content

### Data Privacy

- **Data Encryption**: Sensitive data encrypted at rest
- **Audit Logging**: Comprehensive audit logs for security monitoring
- **Data Retention**: Configurable data retention policies
- **Privacy Controls**: User privacy settings and data export/deletion