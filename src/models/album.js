/**
 * Album Model
 * Represents an album entity with sort order logic and validation
 */
export class Album {
  constructor({
    id = null,
    user_id = null,
    name = '',
    description = '',
    date_range_start = null,
    date_range_end = null,
    sort_order = 0,
    photo_count = 0,
    cover_photo_id = null,
    created_at = null,
    updated_at = null
  } = {}) {
    this.id = id
    this.user_id = user_id
    this.name = name
    this.description = description
    this.date_range_start = date_range_start
    this.date_range_end = date_range_end
    this.sort_order = sort_order
    this.photo_count = photo_count
    this.cover_photo_id = cover_photo_id
    this.created_at = created_at
    this.updated_at = updated_at
  }

  /**
   * Validate album data
   * @returns {Object} Validation result with isValid and errors
   */
  validate() {
    const errors = []

    // User ID validation
    if (!this.user_id) {
      errors.push('User ID is required')
    }

    // Name validation
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Album name is required')
    } else if (this.name.length > 100) {
      errors.push('Album name must be 100 characters or less')
    }

    // Description validation
    if (this.description && this.description.length > 500) {
      errors.push('Album description must be 500 characters or less')
    }

    // Sort order validation
    if (typeof this.sort_order !== 'number' || this.sort_order < 0) {
      errors.push('Sort order must be a non-negative number')
    }

    // Photo count validation
    if (typeof this.photo_count !== 'number' || this.photo_count < 0) {
      errors.push('Photo count must be a non-negative number')
    }

    // Date range validation
    if (this.date_range_start && this.date_range_end) {
      const startDate = new Date(this.date_range_start)
      const endDate = new Date(this.date_range_end)
      
      if (startDate > endDate) {
        errors.push('Start date must be before end date')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate unique album name by appending number
   * @param {string} baseName - Base album name
   * @param {string[]} existingNames - Array of existing album names
   * @returns {string} Unique album name
   */
  static generateUniqueName(baseName, existingNames) {
    if (!existingNames.includes(baseName)) {
      return baseName
    }

    let counter = 2
    let uniqueName = `${baseName} (${counter})`
    
    while (existingNames.includes(uniqueName)) {
      counter++
      uniqueName = `${baseName} (${counter})`
    }

    return uniqueName
  }

  /**
   * Calculate next available sort order
   * @param {Album[]} existingAlbums - Array of existing albums for user
   * @returns {number} Next sort order
   */
  static getNextSortOrder(existingAlbums) {
    if (!existingAlbums || existingAlbums.length === 0) {
      return 1
    }

    const maxSortOrder = Math.max(...existingAlbums.map(album => album.sort_order))
    return maxSortOrder + 1
  }

  /**
   * Reorder albums array based on new sort positions
   * @param {Album[]} albums - Array of albums to reorder
   * @param {number} fromIndex - Original index
   * @param {number} toIndex - Target index
   * @returns {Album[]} Reordered albums with updated sort_order
   */
  static reorderAlbums(albums, fromIndex, toIndex) {
    const reordered = [...albums]
    const [movedAlbum] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, movedAlbum)

    // Update sort order for all albums
    return reordered.map((album, index) => {
      album.sort_order = index + 1
      album.updated_at = new Date().toISOString()
      return album
    })
  }

  /**
   * Update photo count
   * @param {number} newCount - New photo count
   */
  updatePhotoCount(newCount) {
    this.photo_count = Math.max(0, newCount)
    this.updated_at = new Date().toISOString()
  }

  /**
   * Increment photo count
   */
  incrementPhotoCount() {
    this.photo_count += 1
    this.updated_at = new Date().toISOString()
  }

  /**
   * Decrement photo count
   */
  decrementPhotoCount() {
    this.photo_count = Math.max(0, this.photo_count - 1)
    this.updated_at = new Date().toISOString()
  }

  /**
   * Check if album is empty
   * @returns {boolean} True if album has no photos
   */
  isEmpty() {
    return this.photo_count === 0
  }

  /**
   * Set cover photo
   * @param {number} photoId - ID of photo to use as cover
   */
  setCoverPhoto(photoId) {
    this.cover_photo_id = photoId
    this.updated_at = new Date().toISOString()
  }

  /**
   * Convert to plain object for database storage
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      user_id: this.user_id,
      name: this.name,
      description: this.description,
      date_range_start: this.date_range_start,
      date_range_end: this.date_range_end,
      sort_order: this.sort_order,
      photo_count: this.photo_count,
      cover_photo_id: this.cover_photo_id,
      created_at: this.created_at,
      updated_at: this.updated_at
    }
  }

  /**
   * Create Album instance from database row
   * @param {Object} row - Database row
   * @returns {Album} Album instance
   */
  static fromDatabaseRow(row) {
    return new Album({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      date_range_start: row.date_range_start,
      date_range_end: row.date_range_end,
      sort_order: row.sort_order,
      photo_count: row.photo_count,
      cover_photo_id: row.cover_photo_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    })
  }

  /**
   * Update timestamp
   */
  touch() {
    this.updated_at = new Date().toISOString()
  }
}