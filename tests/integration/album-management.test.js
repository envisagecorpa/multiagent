import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AlbumService } from '../../src/services/album-service.js'
import { AuthenticationService } from '../../src/services/auth-service.js'
import { DatabaseService } from '../../src/services/database-service.js'

describe('Album Management Integration Test', () => {
  let albumService, authService, dbService
  let testUser

  beforeEach(async () => {
    // Initialize services
    dbService = new DatabaseService()
    await dbService.initialize()
    
    authService = new AuthenticationService(dbService)
    await authService.initialize()
    
    albumService = new AlbumService(dbService)
    await albumService.initialize()

    // Create test user
    const registration = await authService.registerUser('albums@example.com', 'SecurePass123!', 'Album User')
    testUser = registration.user
  })

  afterEach(async () => {
    if (albumService) await albumService.cleanup()
    if (authService) await authService.cleanup()
    if (dbService) await dbService.close()
  })

  it('should complete full album management workflow', async () => {
    // Step 1: Create multiple albums
    const album1 = await albumService.createAlbum(testUser.id, 'Summer 2024', 'Beach vacation photos')
    const album2 = await albumService.createAlbum(testUser.id, 'Winter 2024', 'Ski trip memories')
    const album3 = await albumService.createAlbum(testUser.id, 'Spring 2024', 'Garden blooms')

    expect(album1.sortOrder).toBe(1)
    expect(album2.sortOrder).toBe(2)
    expect(album3.sortOrder).toBe(3)

    // Step 2: Verify albums are retrieved in correct order
    const albums = await albumService.getUserAlbums(testUser.id)
    expect(albums).toHaveLength(3)
    expect(albums[0].name).toBe('Summer 2024')
    expect(albums[1].name).toBe('Winter 2024')
    expect(albums[2].name).toBe('Spring 2024')

    // Step 3: Reorder albums (move Spring to first position)
    const newOrder = [album3.id, album1.id, album2.id]
    const reorderResult = await albumService.updateAlbumOrder(testUser.id, newOrder)
    expect(reorderResult).toBe(true)

    // Step 4: Verify new order
    const reorderedAlbums = await albumService.getUserAlbums(testUser.id)
    expect(reorderedAlbums[0].name).toBe('Spring 2024')
    expect(reorderedAlbums[1].name).toBe('Summer 2024')
    expect(reorderedAlbums[2].name).toBe('Winter 2024')

    // Step 5: Delete empty album
    const deleteResult = await albumService.deleteAlbum(testUser.id, album3.id)
    expect(deleteResult).toBe(true)

    // Step 6: Verify album is removed
    const finalAlbums = await albumService.getUserAlbums(testUser.id)
    expect(finalAlbums).toHaveLength(2)
    expect(finalAlbums.find(a => a.id === album3.id)).toBeUndefined()
  })

  it('should handle duplicate album names correctly', async () => {
    // Create albums with same name
    const album1 = await albumService.createAlbum(testUser.id, 'Vacation')
    const album2 = await albumService.createAlbum(testUser.id, 'Vacation')
    const album3 = await albumService.createAlbum(testUser.id, 'Vacation')

    expect(album1.name).toBe('Vacation')
    expect(album2.name).toBe('Vacation (2)')
    expect(album3.name).toBe('Vacation (3)')
  })

  it('should enforce user isolation for albums', async () => {
    // Create second user
    const user2Registration = await authService.registerUser('user2@example.com', 'SecurePass123!', 'User 2')
    const user2 = user2Registration.user

    // Create albums for both users
    const user1Album = await albumService.createAlbum(testUser.id, 'User 1 Album')
    const user2Album = await albumService.createAlbum(user2.id, 'User 2 Album')

    // Verify user 1 can only see their albums
    const user1Albums = await albumService.getUserAlbums(testUser.id)
    expect(user1Albums).toHaveLength(1)
    expect(user1Albums[0].name).toBe('User 1 Album')

    // Verify user 2 can only see their albums
    const user2Albums = await albumService.getUserAlbums(user2.id)
    expect(user2Albums).toHaveLength(1)
    expect(user2Albums[0].name).toBe('User 2 Album')

    // Verify user 1 cannot delete user 2's album
    const deleteResult = await albumService.deleteAlbum(testUser.id, user2Album.id)
    expect(deleteResult).toBe(false)
  })

  it('should maintain referential integrity', async () => {
    // Create album
    const album = await albumService.createAlbum(testUser.id, 'Test Album')

    // Verify album exists in database
    const albumRecord = await dbService.getAlbumById(album.id)
    expect(albumRecord).toBeDefined()
    expect(albumRecord.user_id).toBe(testUser.id)

    // Delete album
    await albumService.deleteAlbum(testUser.id, album.id)

    // Verify album is removed from database
    const deletedAlbumRecord = await dbService.getAlbumById(album.id)
    expect(deletedAlbumRecord).toBeNull()
  })

  it('should handle bulk operations efficiently', async () => {
    const startTime = Date.now()

    // Create 20 albums
    const createPromises = Array.from({ length: 20 }, (_, i) => 
      albumService.createAlbum(testUser.id, `Album ${i + 1}`)
    )
    await Promise.all(createPromises)

    const endTime = Date.now()
    const duration = endTime - startTime

    // Should complete within reasonable time (less than 1 second)
    expect(duration).toBeLessThan(1000)

    // Verify all albums created
    const albums = await albumService.getUserAlbums(testUser.id)
    expect(albums).toHaveLength(20)
  })
})