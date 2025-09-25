# Photo Management Service Contract

**Service**: PhotoService  
**Version**: 1.0  
**Date**: 2025-09-24

## Interface Definition

### `addPhotosToAlbum(userId: number, albumId: number, files: FileList): Promise<Photo[]>`

**Purpose**: Add multiple photos to an album from local files

**Input**:
- `userId` (number): ID of authenticated user
- `albumId` (number): ID of target album
- `files` (FileList): Browser FileList from input or drag-drop

**Output**: `Photo[]` - Array of created photo objects
```typescript
interface Photo {
  id: number;
  albumId: number;
  filePath: string;
  originalFilename: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
  dateTaken?: string;     // ISO datetime
  dateAdded: string;      // ISO datetime
  thumbnailPath: string;
  checksum: string;
  exifData: Record<string, any>;
}
```

**Behavior**:
- MUST validate album belongs to user
- MUST check album photo count doesn't exceed 200
- MUST validate file types (JPEG, PNG only)
- MUST generate thumbnails asynchronously
- MUST extract EXIF data when available
- MUST calculate file checksums for duplicate detection
- MUST update album photo count

### `getAlbumPhotos(userId: number, albumId: number, options?: PhotoQueryOptions): Promise<PhotoPage>`

**Purpose**: Get photos in album with pagination and sorting

**Input**:
- `userId` (number): ID of authenticated user
- `albumId` (number): ID of album
- `options` (PhotoQueryOptions, optional): Query parameters
```typescript
interface PhotoQueryOptions {
  page?: number;        // Default: 1
  limit?: number;       // Default: 50, max: 200
  sortBy?: 'dateTaken' | 'dateAdded' | 'filename';
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
}
```

**Output**: `PhotoPage`
```typescript
interface PhotoPage {
  photos: Photo[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

**Behavior**:
- MUST validate album belongs to user
- MUST default to dateTaken DESC, dateAdded DESC
- MUST handle pagination efficiently with large albums
- MUST return thumbnail paths for grid display
- MUST include EXIF data for photo details

### `removePhotosFromAlbum(userId: number, albumId: number, photoIds: number[]): Promise<boolean>`

**Purpose**: Remove multiple photos from an album

**Input**:
- `userId` (number): ID of authenticated user
- `albumId` (number): ID of album
- `photoIds` (number[]): Array of photo IDs to remove

**Output**: `boolean` - true if all photos successfully removed

**Behavior**:
- MUST validate album belongs to user
- MUST validate all photos belong to the album
- MUST remove thumbnail files from storage
- MUST update album photo count
- MUST handle partial failures gracefully

### `generateThumbnail(photoId: number, size: ThumbnailSize): Promise<string>`

**Purpose**: Generate thumbnail for photo at specified size

**Input**:
- `photoId` (number): ID of photo
- `size` (ThumbnailSize): Thumbnail dimensions
```typescript
enum ThumbnailSize {
  SMALL = 150,   // 150x150px for grid view
  MEDIUM = 300,  // 300x300px for modal preview
  LARGE = 600    // 600x600px for full modal
}
```

**Output**: `string` - Path to generated thumbnail file

**Behavior**:
- MUST maintain aspect ratio
- MUST use efficient image processing (Canvas API)
- MUST cache thumbnails in IndexedDB
- MUST handle various image orientations (EXIF rotation)
- MUST generate WebP format when supported

### `getPhotoMetadata(userId: number, photoId: number): Promise<PhotoMetadata>`

**Purpose**: Get detailed metadata for a specific photo

**Input**:
- `userId` (number): ID of authenticated user
- `photoId` (number): ID of photo

**Output**: `PhotoMetadata`
```typescript
interface PhotoMetadata {
  id: number;
  albumId: number;
  filename: string;
  fileSize: number;
  dimensions: { width: number; height: number };
  dateTaken?: string;
  camera?: string;
  settings?: {
    aperture?: string;
    shutterSpeed?: string;
    iso?: number;
    focalLength?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  colors?: string[]; // Dominant colors
}
```

**Behavior**:
- MUST validate photo belongs to user's album
- MUST parse EXIF data for camera settings
- MUST extract GPS coordinates when available
- MUST analyze dominant colors for UI theming

### `searchPhotos(userId: number, query: PhotoSearchQuery): Promise<Photo[]>`

**Purpose**: Search photos across all user albums

**Input**:
- `userId` (number): ID of authenticated user
- `query` (PhotoSearchQuery): Search parameters
```typescript
interface PhotoSearchQuery {
  filename?: string;    // Partial filename match
  dateFrom?: string;    // ISO date
  dateTo?: string;      // ISO date
  albumIds?: number[];  // Specific albums
  hasLocation?: boolean; // Photos with GPS data
  minSize?: number;     // Minimum file size
  maxSize?: number;     // Maximum file size
  limit?: number;       // Max results (default: 100)
}
```

**Output**: `Photo[]` - Array of matching photos

**Behavior**:
- MUST search only user's photos
- MUST support partial text matching
- MUST handle date range queries efficiently
- MUST rank results by relevance
- MUST limit results to prevent performance issues

## Error Handling

### Error Types
- `ALBUM_NOT_FOUND`: Album doesn't exist or not owned by user
- `PHOTO_NOT_FOUND`: Photo doesn't exist or not in user's albums
- `ALBUM_FULL`: Album already contains maximum photos (200)
- `INVALID_FILE_TYPE`: File is not JPEG or PNG
- `FILE_TOO_LARGE`: File exceeds size limit (50MB)
- `THUMBNAIL_GENERATION_FAILED`: Could not create thumbnail
- `DUPLICATE_PHOTO`: Photo with same checksum already exists
- `STORAGE_FULL`: Not enough storage space available

### Performance Requirements
- Photo upload: < 2 seconds per photo (including thumbnail)
- Album photo loading: < 500ms for 50 photos
- Thumbnail generation: < 1 second per thumbnail
- Photo search: < 300ms for typical queries
- Metadata extraction: < 100ms per photo

## Testing Contract

### Unit Tests Required
- File type validation (JPEG/PNG accepted, others rejected)
- File size validation and limits
- Thumbnail generation for various sizes and orientations
- EXIF data extraction and parsing
- Photo metadata structure validation
- Duplicate detection via checksum

### Integration Tests Required
- End-to-end photo upload flow
- Album photo count updates
- Thumbnail caching and retrieval
- Photo removal and cleanup
- Search functionality across albums
- Performance with 200 photos per album

### Performance Tests Required
- Upload 50 photos simultaneously
- Load album with 200 photos
- Generate thumbnails for batch of photos
- Search across 1000+ photos

## Browser API Dependencies

### Required APIs
- **File API**: Reading selected files
- **FileReader API**: Processing file contents
- **Canvas API**: Thumbnail generation and image processing
- **URL.createObjectURL()**: Displaying photos
- **IndexedDB**: Thumbnail caching
- **Web Workers**: Background image processing

### Fallback Strategies
- **File System Access API**: Primary for folder selection
- **File Input**: Fallback for older browsers
- **Progressive Enhancement**: Core functionality without advanced APIs

## Database Schema Dependencies

### Required Tables
- `photos` (id, album_id, file_path, original_filename, file_size, width, height, mime_type, date_taken, date_added, thumbnail_path, checksum, exif_data)
- `albums` (for photo count updates)

### Required Indexes
- `photos.album_id`
- `photos.album_id, date_taken DESC` (composite)
- `photos.checksum` (duplicate detection)
- `photos.original_filename` (search)