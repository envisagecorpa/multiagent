import { Album } from '../models/album.js'
import { DatabaseService } from './database-service.js'
import { EventEmitter } from '../utils/EventEmitter.js'

/**
 * Album Service
 * Handles album CRUD operations, ordering, and validation
 */
export class AlbumService extends EventEmitter {
  constructor(databaseService = null) {
    super()
    // If a DatabaseService instance is provided, use its db; otherwise initialize later in initialize()
    this.databaseService = databaseService
  }

  /**
   * Initialize the album service
   * Creates database service if not provided
   */
  async initialize() {
    // Use the shared database service provided in constructor
    if (this.databaseService && this.databaseService.db) {
      this.db = this.databaseService.db
    } else if (!this.databaseService) {
      // Only create new DatabaseService if none was provided
      console.log('album-service.js: No database service provided, creating new one');
      this.databaseService = new DatabaseService()
      await this.databaseService.initialize()
      this.db = this.databaseService.db
    } else {
      throw new Error('DatabaseService provided but not initialized')
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
   * Convert Album model to API format with camelCase properties
   * @param {Album} album - Album instance
   * @returns {Object} API-formatted album object
   */
  _toApiFormat(album) {
    return {
      id: album.id,
      userId: album.user_id,
      name: album.name,
      description: album.description,
      dateRangeStart: album.date_range_start,
      dateRangeEnd: album.date_range_end,
      sortOrder: album.sort_order,
      photoCount: album.photo_count,
      coverPhotoId: album.cover_photo_id,
      createdAt: album.created_at,
      updatedAt: album.updated_at
    }
  }

  /**
   * Create a new album
   * @param {number} userId - User ID
   * @param {string} name - Album name
   * @returns {Promise<Album>} Created album
   */
  async createAlbum(userId, name) {
    try {
      // Handle duplicate names by appending number
      const uniqueName = await this.generateUniqueName(userId, name)
      
      // Get next sort order
      const nextSortOrder = await this.getNextSortOrder(userId)
      
      // Create album instance
      const album = new Album({
        user_id: userId,
        name: uniqueName,
        sort_order: nextSortOrder
      })

      // Validate album
      const validation = album.validate()
      if (!validation.isValid) {
        throw new Error(`Album validation failed: ${validation.errors.join(', ')}`)
      }

      // Insert into database
      const database = this.db
      const stmt = database.prepare(`
        INSERT INTO albums (user_id, name, sort_order, created_at)
        VALUES (?, ?, ?, ?)
      `)

      const now = new Date().toISOString()
      stmt.bind([userId, uniqueName, nextSortOrder, now])
      stmt.step()
      stmt.finalize()

      // Get inserted album ID
      const lastInsertRowid = this.databaseService.sqlite3.capi.sqlite3_last_insert_rowid(database.pointer)
      
      // Set album properties
      album.id = Number(lastInsertRowid)
      album.created_at = now
      album.photo_count = 0

      return this._toApiFormat(album)
    } catch (error) {
      console.error('Create album error:', error)
      throw error
    }
  }

  /**
   * Get all albums for a user, ordered by sort_order
   * @param {number} userId - User ID
   * @returns {Promise<Album[]>} Array of albums
   */
  async getUserAlbums(userId) {
    try {
      const database = this.db
      const stmt = database.prepare(`
        SELECT a.*, COUNT(p.id) as photo_count
        FROM albums a
        LEFT JOIN photos p ON a.id = p.album_id
        WHERE a.user_id = ?
        GROUP BY a.id
        ORDER BY a.sort_order ASC
      `)

      stmt.bind([userId])
      const albums = []

      while (stmt.step()) {
        const columnNames = stmt.getColumnNames()
        const row = {}
        for (let i = 0; i < columnNames.length; i++) {
          row[columnNames[i]] = stmt.get(i)
        }
        albums.push(Album.fromDatabaseRow(row))
      }

      stmt.finalize()
      return albums.map(album => this._toApiFormat(album))
    } catch (error) {
      console.error('Get user albums error:', error)
      return []
    }
  }

  /**
   * Update album order for drag-drop reordering
   * @param {number} userId - User ID
   * @param {number[]} albumIds - Array of album IDs in new order
   * @returns {Promise<boolean>} Success status
   */
  async updateAlbumOrder(userId, albumIds) {
    try {
      // Verify all albums belong to the user
      const userAlbums = await this.getUserAlbums(userId)
      const userAlbumIds = userAlbums.map(a => a.id)
      
      // Check if all provided IDs belong to the user
      for (const albumId of albumIds) {
        if (!userAlbumIds.includes(albumId)) {
          return false
        }
      }

      // Check if we have all the user's albums
      if (albumIds.length !== userAlbumIds.length) {
        return false
      }

      // Update sort orders
      const database = this.db
      const stmt = database.prepare('UPDATE albums SET sort_order = ? WHERE id = ?')

      for (let i = 0; i < albumIds.length; i++) {
        stmt.bind([i + 1, albumIds[i]])
        stmt.step()
        stmt.reset()
      }

      stmt.finalize()
      return true
    } catch (error) {
      console.error('Update album order error:', error)
      return false
    }
  }

  /**
   * Delete an album (only if empty)
   * @param {number} userId - User ID
   * @param {number} albumId - Album ID
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If album contains photos
   */
  async deleteAlbum(userId, albumId) {
    try {
      // Verify album exists and belongs to user
      const album = await this.getAlbumById(albumId)
      if (!album || album.user_id !== userId) {
        return false
      }

      // Check if album has photos
      const photoCount = await this.getAlbumPhotoCount(albumId)
      if (photoCount > 0) {
        const error = new Error('Cannot delete album that contains photos')
        error.code = 'ALBUM_NOT_EMPTY'
        throw error
      }

      // Delete album
      const database = this.db
      const stmt = database.prepare('DELETE FROM albums WHERE id = ? AND user_id = ?')
      stmt.bind([albumId, userId])
      stmt.step()
      stmt.finalize()

      const changes = database.changes()
      return changes > 0
    } catch (error) {
      console.error('Delete album error:', error)
      throw error
    }
  }

  /**
   * Update photo count for an album (internal helper)
   * @param {number} albumId - Album ID
   * @param {number} photoCount - New photo count
   * @returns {Promise<void>}
   */
  async _updatePhotoCount(albumId, photoCount) {
    try {
      const database = this.db
      const stmt = database.prepare('UPDATE albums SET photo_count = ? WHERE id = ?')
      stmt.bind([photoCount, albumId])
      stmt.step()
      stmt.finalize()
    } catch (error) {
      console.error('Update photo count error:', error)
    }
  }

  /**
   * Generate unique album name by appending number if needed
   * @param {number} userId - User ID
   * @param {string} baseName - Base album name
   * @returns {Promise<string>} Unique name
   */
  async generateUniqueName(userId, baseName) {
    const existingNames = await this.getUserAlbumNames(userId)
    
    if (!existingNames.includes(baseName)) {
      return baseName
    }

    let counter = 2
    let uniqueName
    do {
      uniqueName = `${baseName} (${counter})`
      counter++
    } while (existingNames.includes(uniqueName))

    return uniqueName
  }

  /**
   * Get all album names for a user
   * @param {number} userId - User ID
   * @returns {Promise<string[]>} Array of album names
   */
  async getUserAlbumNames(userId) {
    try {
      const database = this.db
      const stmt = database.prepare('SELECT name FROM albums WHERE user_id = ?')
      stmt.bind([userId])
      
      const names = []
      while (stmt.step()) {
        names.push(stmt.get(0))
      }
      
      stmt.finalize()
      return names
    } catch (error) {
      console.error('Get user album names error:', error)
      return []
    }
  }

  /**
   * Get next available sort order for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Next sort order
   */
  async getNextSortOrder(userId) {
    try {
      const database = this.db
      const stmt = database.prepare('SELECT MAX(sort_order) FROM albums WHERE user_id = ?')
      stmt.bind([userId])
      
      let maxOrder = 0
      if (stmt.step()) {
        const value = stmt.get(0)
        maxOrder = value !== null ? value : 0
      }
      
      stmt.finalize()
      return maxOrder + 1
    } catch (error) {
      console.error('Get next sort order error:', error)
      return 1
    }
  }

  /**
   * Get album by ID
   * @param {number} albumId - Album ID
   * @returns {Promise<Album|null>} Album or null
   */
  async getAlbumById(albumId) {
    try {
      const database = this.db
      const stmt = database.prepare(`
        SELECT a.*, COUNT(p.id) as photo_count
        FROM albums a
        LEFT JOIN photos p ON a.id = p.album_id
        WHERE a.id = ?
        GROUP BY a.id
      `)

      stmt.bind([albumId])
      let album = null

      if (stmt.step()) {
        const columnNames = stmt.getColumnNames()
        const row = {}
        for (let i = 0; i < columnNames.length; i++) {
          row[columnNames[i]] = stmt.get(i)
        }
        album = Album.fromDatabaseRow(row)
      }

      stmt.finalize()
      return album
    } catch (error) {
      console.error('Get album by ID error:', error)
      return null
    }
  }

  /**
   * Get photo count for an album
   * @param {number} albumId - Album ID
   * @returns {Promise<number>} Photo count
   */
  async getAlbumPhotoCount(albumId) {
    try {
      const database = this.db
      const stmt = database.prepare('SELECT COUNT(*) FROM photos WHERE album_id = ?')
      stmt.bind([albumId])
      
      let count = 0
      if (stmt.step()) {
        count = stmt.get(0)
      }
      
      stmt.finalize()
      return count
    } catch (error) {
      console.error('Get album photo count error:', error)
      return 0
    }
  }

  /**
   * Helper method for tests - Simulates photos in an album by inserting fake records
   * @param {number} albumId - Album ID
   * @param {number} count - Number of fake photos to create
   */
  async _updatePhotoCount(albumId, count) {
    // This is a test helper method - creates fake photo records for testing
    // In real implementation photos would be created through PhotoService
    
    try {
      // First, delete any existing fake photos for this album
      const deleteStmt = this.db.prepare('DELETE FROM photos WHERE album_id = ? AND filename LIKE ?')
      deleteStmt.bind([albumId, 'test-photo-%'])
      deleteStmt.step()
      deleteStmt.finalize()
      
      // Insert fake photos
      if (count > 0) {
        for (let i = 1; i <= count; i++) {
          const insertStmt = this.db.prepare(`
            INSERT INTO photos (album_id, filename, original_name, file_size, mime_type, width, height, date_taken)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          
          const filename = `test-photo-${i}.jpg`
          insertStmt.bind([
            albumId,
            filename,
            filename,
            1024 * i, // fake file size
            'image/jpeg',
            800,
            600,
            new Date().toISOString()
          ])
          insertStmt.step()
          insertStmt.finalize()
        }
      }
    } catch (error) {
      console.error('Update photo count error:', error)
      throw error
    }
  }

  /**
   * Get all albums across all users (for search indexing)
   * @returns {Promise<Array>} Array of all albums
   */
  async getAllAlbums() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = this.db.exec(`
        SELECT
          *,
          (SELECT COUNT(*) FROM photos WHERE album_id = albums.id) as photo_count
        FROM albums
        ORDER BY created_at DESC
      `);

      // If no albums exist, return empty array
      if (!result || result.length === 0 || !result[0] || !result[0].columns) {
        return [];
      }

      const columns = result[0].columns;
      const values = result[0].values || [];

      return values.map(row => {
        const album = {};
        columns.forEach((col, index) => {
          album[col] = row[index];
        });
        return album;
      });
    } catch (error) {
      console.error('Error getting all albums:', error);
      throw error;
    }
  }
}