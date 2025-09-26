import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AlbumService } from '../../src/services/album-service.js'
import { AuthenticationService } from '../../src/services/auth-service.js'

describe('AlbumService Contract Tests', () => {
  let albumService
  let authService
  let testUserId

  beforeEach(async () => {
    // Initialize authentication service to create test user
    authService = new AuthenticationService()
    await authService.initialize()
    
    // Create a test user for album operations
    const registerResult = await authService.registerUser(
      'test@example.com',
      'TestPass123!',
      'Test User'
    )
    testUserId = registerResult.user.id

    // Share the same database service with AlbumService
    albumService = new AlbumService()
    albumService.databaseService = authService.databaseService
    albumService.db = authService.db  // Share the same database connection
    // No need to initialize since we're sharing the existing connection
  })

  afterEach(async () => {
    if (albumService) {
      await albumService.cleanup()
    }
    if (authService) {
      await authService.cleanup()
    }
  })

  describe('createAlbum', () => {
    it('should create album with valid data', async () => {
      const album = await albumService.createAlbum(testUserId, 'Summer 2024')

      expect(album.id).toBeTypeOf('number')
      expect(album.userId).toBe(testUserId)
      expect(album.name).toBe('Summer 2024')
      expect(album.sortOrder).toBeTypeOf('number')
      expect(album.photoCount).toBe(0)
      expect(album.createdAt).toBeTypeOf('string')
    })

    it('should auto-append number for duplicate names', async () => {
      await albumService.createAlbum(testUserId, 'Summer 2024')
      const duplicate = await albumService.createAlbum(testUserId, 'Summer 2024')

      expect(duplicate.name).toBe('Summer 2024 (2)')
    })

    it('should assign next available sort order', async () => {
      const album1 = await albumService.createAlbum(testUserId, 'Album 1')
      const album2 = await albumService.createAlbum(testUserId, 'Album 2')

      expect(album2.sortOrder).toBe(album1.sortOrder + 1)
    })
  })

  describe('getUserAlbums', () => {
    beforeEach(async () => {
      // Create test albums
      await albumService.createAlbum(testUserId, 'Album C')
      await albumService.createAlbum(testUserId, 'Album A')
      await albumService.createAlbum(testUserId, 'Album B')
    })

    it('should return albums ordered by sort position', async () => {
      const albums = await albumService.getUserAlbums(testUserId)

      expect(albums).toHaveLength(3)
      expect(albums[0].sortOrder).toBeLessThan(albums[1].sortOrder)
      expect(albums[1].sortOrder).toBeLessThan(albums[2].sortOrder)
    })

    it('should return empty array for user with no albums', async () => {
      const albums = await albumService.getUserAlbums(999)
      expect(albums).toEqual([])
    })
  })

  describe('updateAlbumOrder', () => {
    let albums

    beforeEach(async () => {
      await albumService.createAlbum(testUserId, 'First')
      await albumService.createAlbum(testUserId, 'Second')
      await albumService.createAlbum(testUserId, 'Third')
      albums = await albumService.getUserAlbums(testUserId)
    })

    it('should reorder albums correctly', async () => {
      const albumIds = albums.map(a => a.id)
      const newOrder = [albumIds[2], albumIds[0], albumIds[1]] // Move third to first

      const result = await albumService.updateAlbumOrder(testUserId, newOrder)
      expect(result).toBe(true)

      const reorderedAlbums = await albumService.getUserAlbums(testUserId)
      expect(reorderedAlbums[0].id).toBe(albumIds[2])
      expect(reorderedAlbums[1].id).toBe(albumIds[0])
      expect(reorderedAlbums[2].id).toBe(albumIds[1])
    })

    it('should fail for invalid album IDs', async () => {
      const result = await albumService.updateAlbumOrder(testUserId, [999, 888])
      expect(result).toBe(false)
    })

    it('should fail for albums not owned by user', async () => {
      const albumIds = albums.map(a => a.id)
      const result = await albumService.updateAlbumOrder(999, albumIds)
      expect(result).toBe(false)
    })
  })

  describe('deleteAlbum', () => {
    let emptyAlbum, albumWithPhotos

    beforeEach(async () => {
      emptyAlbum = await albumService.createAlbum(testUserId, 'Empty Album')
      albumWithPhotos = await albumService.createAlbum(testUserId, 'Album With Photos')
      
      // Simulate album with photos by updating photo count
      await albumService._updatePhotoCount(albumWithPhotos.id, 5)
    })

    it('should delete empty album successfully', async () => {
      const result = await albumService.deleteAlbum(testUserId, emptyAlbum.id)
      expect(result).toBe(true)

      const albums = await albumService.getUserAlbums(testUserId)
      expect(albums.find(a => a.id === emptyAlbum.id)).toBeUndefined()
    })

    it('should fail to delete album with photos', async () => {
      try {
        await albumService.deleteAlbum(testUserId, albumWithPhotos.id)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error.code).toBe('ALBUM_NOT_EMPTY')
      }
    })

    it('should fail for non-existent album', async () => {
      const result = await albumService.deleteAlbum(testUserId, 999)
      expect(result).toBe(false)
    })

    it('should fail for album not owned by user', async () => {
      const result = await albumService.deleteAlbum(999, emptyAlbum.id)
      expect(result).toBe(false)
    })
  })
})