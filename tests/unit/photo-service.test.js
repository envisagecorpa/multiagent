import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PhotoService } from '../../src/services/photo-service.js'
import { AuthenticationService } from '../../src/services/auth-service.js'
import { AlbumService } from '../../src/services/album-service.js'

describe('PhotoService Contract Tests', () => {
  let photoService
  let authService
  let albumService
  let testAlbumId
  let testUserId

  beforeEach(async () => {
    // Initialize authentication service to create test user
    authService = new AuthenticationService()
    await authService.initialize()
    
    // Create a test user
    const registerResult = await authService.registerUser(
      'test@example.com',
      'TestPass123!',
      'Test User'
    )
    testUserId = registerResult.user.id

    // Initialize album service to create test album
    albumService = new AlbumService()
    albumService.databaseService = authService.databaseService
    albumService.db = authService.db

    // Create a test album
    const album = await albumService.createAlbum(testUserId, 'Test Album')
    testAlbumId = album.id

    // Initialize photo service with shared database
    photoService = new PhotoService()
    photoService.databaseService = authService.databaseService
    photoService.db = authService.db
  })

  afterEach(async () => {
    if (photoService) {
      await photoService.cleanup()
    }
    if (albumService) {
      await albumService.cleanup()
    }
    if (authService) {
      await authService.cleanup()
    }
  })

  describe('addPhotosToAlbum', () => {
    it('should add photos to album successfully', async () => {
      const mockFiles = [
        new File(['mock-content'], 'photo1.jpg', { type: 'image/jpeg' }),
        new File(['mock-content'], 'photo2.png', { type: 'image/png' })
      ]

      const results = await photoService.addPhotosToAlbum(testAlbumId, mockFiles)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[0].photo.id).toBeTypeOf('number')
      expect(results[0].photo.albumId).toBe(testAlbumId)
      expect(results[0].photo.filename).toMatch(/photo1.*\.jpg/)
      expect(results[0].photo.originalName).toBe('photo1.jpg')
      expect(results[0].photo.mimeType).toBe('image/jpeg')
      expect(results[0].photo.dateAdded).toBeTypeOf('string')
    })

    it('should reject unsupported file types', async () => {
      const mockFile = new File(['mock-content'], 'document.pdf', { type: 'application/pdf' })

      const results = await photoService.addPhotosToAlbum(testAlbumId, [mockFile])

      expect(results[0].success).toBe(false)
      expect(results[0].error).toBe('UNSUPPORTED_FORMAT')
    })

    it('should reject files that are too large', async () => {
      const largeContent = new Array(10 * 1024 * 1024).fill('x').join('') // 10MB
      const mockFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })

      const results = await photoService.addPhotosToAlbum(testAlbumId, [mockFile])

      expect(results[0].success).toBe(false)
      expect(results[0].error).toBe('FILE_TOO_LARGE')
    })

    it('should generate unique filenames for duplicates', async () => {
      const mockFile1 = new File(['content1'], 'photo.jpg', { type: 'image/jpeg' })
      const mockFile2 = new File(['content2'], 'photo.jpg', { type: 'image/jpeg' })

      const results = await photoService.addPhotosToAlbum(testAlbumId, [mockFile1, mockFile2])

      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(results[0].photo.filename).not.toBe(results[1].photo.filename)
      expect(results[1].photo.filename).toMatch(/_\d+\.jpg$/)
    })
  })

  describe('getAlbumPhotos', () => {
    beforeEach(async () => {
      // Add test photos
      const mockFiles = [
        new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' }),
        new File(['content3'], 'photo3.jpg', { type: 'image/jpeg' })
      ]
      await photoService.addPhotosToAlbum(testAlbumId, mockFiles)
    })

    it('should return photos ordered chronologically (newest first)', async () => {
      const photos = await photoService.getAlbumPhotos(testAlbumId)

      expect(photos).toHaveLength(3)
      expect(new Date(photos[0].dateAdded)).toBeInstanceOf(Date)
      
      // Check chronological order (newest first)
      for (let i = 1; i < photos.length; i++) {
        const current = new Date(photos[i].dateAdded)
        const previous = new Date(photos[i-1].dateAdded)
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime())
      }
    })

    it('should return empty array for album with no photos', async () => {
      const photos = await photoService.getAlbumPhotos(999)
      expect(photos).toEqual([])
    })

    it('should include thumbnail paths', async () => {
      const photos = await photoService.getAlbumPhotos(testAlbumId)

      photos.forEach(photo => {
        expect(photo.thumbnailPath).toBeTypeOf('string')
        expect(photo.thumbnailPath).toMatch(/thumb_.*\.(jpg|webp)/)
      })
    })
  })

  describe('generateThumbnail', () => {
    it('should generate thumbnail for valid image', async () => {
      const mockFile = new File(['mock-image-content'], 'test.jpg', { type: 'image/jpeg' })

      const thumbnailPath = await photoService.generateThumbnail(mockFile, 'test.jpg')

      expect(thumbnailPath).toBeTypeOf('string')
      expect(thumbnailPath).toMatch(/thumb_test.*\.(jpg|webp)/)
    })

    it('should generate different sizes for different contexts', async () => {
      const mockFile = new File(['mock-image-content'], 'test.jpg', { type: 'image/jpeg' })

      const smallThumb = await photoService.generateThumbnail(mockFile, 'test.jpg', { size: 'small' })
      const largeThumb = await photoService.generateThumbnail(mockFile, 'test.jpg', { size: 'large' })

      expect(smallThumb).not.toBe(largeThumb)
      expect(smallThumb).toMatch(/thumb_test.*small/)
      expect(largeThumb).toMatch(/thumb_test.*large/)
    })

    it('should maintain aspect ratio', async () => {
      const mockFile = new File(['mock-image-content'], 'test.jpg', { type: 'image/jpeg' })

      const thumbnail = await photoService.generateThumbnail(mockFile, 'test.jpg')
      const metadata = await photoService._getThumbnailMetadata(thumbnail)

      expect(metadata.width).toBeTypeOf('number')
      expect(metadata.height).toBeTypeOf('number')
      expect(metadata.width / metadata.height).toBeCloseTo(1.33, 1) // Approximate aspect ratio
    })

    it('should handle thumbnail generation errors gracefully', async () => {
      const invalidFile = new File(['not-an-image'], 'invalid.txt', { type: 'text/plain' })

      try {
        await photoService.generateThumbnail(invalidFile, 'invalid.txt')
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error.code).toBe('THUMBNAIL_GENERATION_FAILED')
      }
    })
  })

  describe('extractExifData', () => {
    it('should extract EXIF data from JPEG files', async () => {
      const mockJpegFile = new File(['mock-jpeg-with-exif'], 'photo.jpg', { type: 'image/jpeg' })

      const exifData = await photoService.extractExifData(mockJpegFile)

      expect(exifData).toBeTypeOf('object')
      expect(exifData.dateTaken).toBeTypeOf('string')
      expect(exifData.camera).toBeTypeOf('string')
      expect(exifData.dimensions).toEqual({
        width: expect.any(Number),
        height: expect.any(Number)
      })
    })

    it('should return empty object for files without EXIF', async () => {
      const mockPngFile = new File(['mock-png-content'], 'image.png', { type: 'image/png' })

      const exifData = await photoService.extractExifData(mockPngFile)

      expect(exifData).toEqual({})
    })

    it('should handle corrupted EXIF data gracefully', async () => {
      const corruptedFile = new File(['corrupted-exif-data'], 'corrupt.jpg', { type: 'image/jpeg' })

      const exifData = await photoService.extractExifData(corruptedFile)

      expect(exifData).toEqual({})
    })
  })
})