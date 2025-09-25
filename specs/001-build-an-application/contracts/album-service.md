# Album Management Service Contract

**Service**: AlbumService  
**Version**: 1.0  
**Date**: 2025-09-24

## Interface Definition

### `createAlbum(userId: number, name: string, description?: string): Promise<Album>`

**Purpose**: Create a new photo album for user

**Input**:
- `userId` (number): ID of authenticated user
- `name` (string): Album name (1-100 characters)
- `description` (string, optional): Album description (max 500 chars)

**Output**: `Album`
```typescript
interface Album {
  id: number;
  userId: number;
  name: string;
  description: string;
  dateRangeStart?: string; // ISO date
  dateRangeEnd?: string;   // ISO date
  sortOrder: number;
  photoCount: number;
  coverPhotoId?: number;
  createdAt: string;       // ISO datetime
  updatedAt: string;       // ISO datetime
}
```

**Behavior**:
- MUST auto-append number for duplicate names ("Summer 2024 (2)")
- MUST assign next available sort order
- MUST initialize photoCount to 0
- MUST set createdAt and updatedAt to current timestamp

### `getUserAlbums(userId: number): Promise<Album[]>`

**Purpose**: Get all albums for user ordered by sort position

**Input**:
- `userId` (number): ID of authenticated user

**Output**: `Album[]` - Array of albums ordered by sortOrder ASC

**Behavior**:
- MUST return only albums owned by user
- MUST include current photo count
- MUST be ordered by sortOrder ascending
- MUST return empty array if no albums

### `updateAlbumOrder(userId: number, albumOrders: AlbumOrder[]): Promise<boolean>`

**Purpose**: Update sort order for multiple albums (drag-drop)

**Input**:
- `userId` (number): ID of authenticated user
- `albumOrders` (AlbumOrder[]): Array of album ID and new order
```typescript
interface AlbumOrder {
  albumId: number;
  sortOrder: number;
}
```

**Output**: `boolean` - true if all updates successful

**Behavior**:
- MUST validate all albumIds belong to user
- MUST update all orders in single transaction
- MUST update updatedAt timestamp for affected albums
- MUST maintain sort order uniqueness per user

### `updateAlbum(userId: number, albumId: number, updates: Partial<AlbumUpdate>): Promise<Album>`

**Purpose**: Update album properties

**Input**:
- `userId` (number): ID of authenticated user
- `albumId` (number): ID of album to update
- `updates` (Partial<AlbumUpdate>): Properties to update
```typescript
interface AlbumUpdate {
  name: string;
  description: string;
  dateRangeStart: string; // ISO date
  dateRangeEnd: string;   // ISO date
  coverPhotoId: number;
}
```

**Output**: `Album` - Updated album object

**Behavior**:
- MUST validate album belongs to user
- MUST handle duplicate name auto-numbering
- MUST validate date range (start <= end)
- MUST update updatedAt timestamp

### `deleteAlbum(userId: number, albumId: number): Promise<boolean>`

**Purpose**: Delete album and all associated photos

**Input**:
- `userId` (number): ID of authenticated user
- `albumId` (number): ID of album to delete

**Output**: `boolean` - true if successfully deleted

**Behavior**:
- MUST validate album belongs to user
- MUST check album is empty (photoCount = 0)
- MUST return error if album contains photos
- MUST cascade delete related data

### `getAlbumStats(): Promise<AlbumStats>`

**Purpose**: Get system-wide album statistics

**Output**: `AlbumStats`
```typescript
interface AlbumStats {
  totalAlbums: number;
  totalPhotos: number;
  averagePhotosPerAlbum: number;
  largestAlbumSize: number;
}
```

**Behavior**:
- MUST calculate current statistics
- MUST exclude deleted albums
- MUST handle division by zero for averages

## Error Handling

### Error Types
- `ALBUM_NOT_FOUND`: Album ID doesn't exist or not owned by user
- `INVALID_NAME`: Album name validation failed
- `INVALID_DATE_RANGE`: Start date after end date
- `ALBUM_NOT_EMPTY`: Cannot delete album with photos
- `DUPLICATE_SORT_ORDER`: Sort order conflict detected
- `INVALID_COVER_PHOTO`: Cover photo not in album

### Performance Requirements
- getUserAlbums: < 100ms for up to 1000 albums
- createAlbum: < 200ms including duplicate name check
- updateAlbumOrder: < 500ms for up to 100 albums
- Album operations: < 50ms average response time

## Testing Contract

### Unit Tests Required
- Album creation with valid data
- Duplicate name handling and auto-numbering
- Sort order assignment and uniqueness
- Album ownership validation
- Date range validation
- Empty album deletion validation

### Integration Tests Required
- End-to-end album creation flow
- Drag-drop reordering scenarios
- Album update with various field combinations
- Album deletion with photos present/absent
- Concurrent album operations

### Performance Tests Required
- 1000 albums loading performance
- Bulk sort order updates
- Album search and filtering
- Database query optimization validation

## Database Schema Dependencies

### Required Tables
- `albums` (id, user_id, name, description, date_range_start, date_range_end, sort_order, photo_count, cover_photo_id, created_at, updated_at)
- `photos` (for cascade delete and photo count)

### Required Indexes
- `albums.user_id` 
- `albums.user_id, sort_order` (composite)
- `albums.updated_at`

### Required Constraints
- Foreign key: albums.user_id → users.id
- Unique: albums.user_id, sort_order
- Check: date_range_start <= date_range_end