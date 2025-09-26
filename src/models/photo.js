/**
 * Photo Model
 * Represents a photo entity with EXIF data handling
 */
export class Photo {
  constructor({
    id = null,
    album_id = null,
    filename = '',
    original_name = '',
    file_size = 0,
    mime_type = '',
    width = null,
    height = null,
    date_taken = null,
    date_added = null,
    thumbnail_path = '',
    exif_data = {}
  } = {}) {
    this.id = id
    this.album_id = album_id
    this.filename = filename
    this.original_name = original_name
    this.file_size = file_size
    this.mime_type = mime_type
    this.width = width
    this.height = height
    this.date_taken = date_taken
    this.date_added = date_added || new Date().toISOString()
    this.thumbnail_path = thumbnail_path
    this.exif_data = typeof exif_data === 'string' ? JSON.parse(exif_data) : exif_data
  }

  /**
   * Validate photo data
   * @returns {Object} Validation result with isValid and errors
   */
  validate() {
    const errors = []

    // Album ID validation
    if (!this.album_id) {
      errors.push('Album ID is required')
    }

    // Filename validation
    if (!this.filename || this.filename.trim().length === 0) {
      errors.push('Filename is required')
    }

    // Original name validation
    if (!this.original_name || this.original_name.trim().length === 0) {
      errors.push('Original name is required')
    }

    // File size validation
    if (typeof this.file_size !== 'number' || this.file_size <= 0) {
      errors.push('File size must be a positive number')
    }

    // MIME type validation
    if (!this.mime_type) {
      errors.push('MIME type is required')
    } else if (!this.isSupportedMimeType(this.mime_type)) {
      errors.push('Unsupported MIME type. Only JPG and PNG are supported.')
    }

    // Dimensions validation
    if (this.width !== null && (typeof this.width !== 'number' || this.width <= 0)) {
      errors.push('Width must be a positive number')
    }

    if (this.height !== null && (typeof this.height !== 'number' || this.height <= 0)) {
      errors.push('Height must be a positive number')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if MIME type is supported
   * @param {string} mimeType - MIME type to check
   * @returns {boolean} Is supported
   */
  isSupportedMimeType(mimeType) {
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    return supportedTypes.includes(mimeType.toLowerCase())
  }

  /**
   * Extract basic EXIF data from file
   * @param {Object} exifData - Raw EXIF data
   */
  processExifData(exifData) {
    this.exif_data = {
      camera: exifData.Make || '',
      model: exifData.Model || '',
      dateTime: exifData.DateTime || exifData.DateTimeOriginal || '',
      iso: exifData.ISOSpeedRatings || '',
      fNumber: exifData.FNumber || '',
      exposureTime: exifData.ExposureTime || '',
      focalLength: exifData.FocalLength || '',
      flash: exifData.Flash || '',
      orientation: exifData.Orientation || 1
    }

    // Set date_taken from EXIF if available
    if (this.exif_data.dateTime) {
      try {
        this.date_taken = new Date(this.exif_data.dateTime).toISOString()
      } catch (error) {
        // If EXIF date is invalid, use file modification time or current time
        this.date_taken = this.date_added
      }
    }
  }

  /**
   * Generate thumbnail filename
   * @returns {string} Thumbnail filename
   */
  generateThumbnailPath() {
    const extension = this.getFileExtension()
    const basename = this.filename.replace(/\.[^/.]+$/, '')
    return `${basename}_thumb.${extension}`
  }

  /**
   * Get file extension from filename
   * @returns {string} File extension
   */
  getFileExtension() {
    return this.filename.split('.').pop().toLowerCase()
  }

  /**
   * Check if photo is landscape orientation
   * @returns {boolean} True if landscape
   */
  isLandscape() {
    return this.width && this.height && this.width > this.height
  }

  /**
   * Check if photo is portrait orientation
   * @returns {boolean} True if portrait
   */
  isPortrait() {
    return this.width && this.height && this.height > this.width
  }

  /**
   * Get aspect ratio
   * @returns {number} Aspect ratio (width/height)
   */
  getAspectRatio() {
    if (!this.width || !this.height) return 1
    return this.width / this.height
  }

  /**
   * Format file size for display
   * @returns {string} Formatted file size
   */
  getFormattedFileSize() {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = this.file_size
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  /**
   * Convert to plain object for database storage
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      album_id: this.album_id,
      filename: this.filename,
      original_name: this.original_name,
      file_size: this.file_size,
      mime_type: this.mime_type,
      width: this.width,
      height: this.height,
      date_taken: this.date_taken,
      date_added: this.date_added,
      thumbnail_path: this.thumbnail_path,
      exif_data: JSON.stringify(this.exif_data)
    }
  }

  /**
   * Create Photo instance from database row
   * @param {Object} row - Database row
   * @returns {Photo} Photo instance
   */
  static fromDatabaseRow(row) {
    return new Photo({
      id: row.id,
      album_id: row.album_id,
      filename: row.filename,
      original_name: row.original_name,
      file_size: row.file_size,
      mime_type: row.mime_type,
      width: row.width,
      height: row.height,
      date_taken: row.date_taken,
      date_added: row.date_added,
      thumbnail_path: row.thumbnail_path,
      exif_data: row.exif_data
    })
  }
}