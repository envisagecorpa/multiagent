import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { Dashboard } from '../../src/components/dashboard/Dashboard.js';
import { AlbumGrid } from '../../src/components/dashboard/AlbumGrid.js';
import { AlbumCard } from '../../src/components/dashboard/AlbumCard.js';
import { AlbumCreateCard } from '../../src/components/dashboard/AlbumCreateCard.js';

// Mock services
const mockAlbumService = {
  getAlbums: vi.fn(),
  createAlbum: vi.fn(),
  updateAlbum: vi.fn(),
  deleteAlbum: vi.fn(),
  updateAlbumOrder: vi.fn()
};

const mockAuthService = {
  getCurrentUser: vi.fn(),
  logout: vi.fn()
};

describe('Dashboard Components', () => {
  let dom;
  let document;

  beforeEach(() => {
    // Set up DOM
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .albums-grid { display: grid; }
            .album-card { display: block; }
            .dashboard-section { display: block; }
            .loading-spinner { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div id="test-container"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    global.document = dom.window.document;
    global.window = dom.window;
    global.HTMLElement = dom.window.HTMLElement;
    global.CustomEvent = dom.window.CustomEvent;

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    // Mock console methods
    global.console = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('AlbumCreateCard', () => {
    it('should render create card correctly', () => {
      const onCreate = vi.fn();
      const createCard = new AlbumCreateCard({ onCreate });
      
      const element = createCard.render();
      
      expect(element.classList.contains('album-create-card')).toBe(true);
      expect(element.getAttribute('aria-label')).toBe('Create new album');
      expect(element.querySelector('.album-create-text').textContent).toBe('Create New Album');
    });

    it('should handle click events', () => {
      const onCreate = vi.fn();
      const createCard = new AlbumCreateCard({ onCreate });
      
      const element = createCard.render();
      element.click();
      
      expect(onCreate).toHaveBeenCalled();
    });

    it('should handle keyboard events', () => {
      const onCreate = vi.fn();
      const createCard = new AlbumCreateCard({ onCreate });
      
      const element = createCard.render();
      
      // Test Enter key
      const enterEvent = new dom.window.KeyboardEvent('keydown', { key: 'Enter' });
      element.dispatchEvent(enterEvent);
      expect(onCreate).toHaveBeenCalled();

      onCreate.mockClear();

      // Test Space key
      const spaceEvent = new dom.window.KeyboardEvent('keydown', { key: ' ' });
      element.dispatchEvent(spaceEvent);
      expect(onCreate).toHaveBeenCalled();
    });

    it('should handle file drops', () => {
      const onCreate = vi.fn();
      const createCard = new AlbumCreateCard({ onCreate });
      
      const element = createCard.render();
      
      // Mock file drop
      const mockFiles = [
        { type: 'image/jpeg', name: 'photo1.jpg' },
        { type: 'image/png', name: 'photo2.png' },
        { type: 'text/plain', name: 'document.txt' } // Should be filtered out
      ];

      const dropEvent = new dom.window.Event('drop');
      dropEvent.dataTransfer = { files: mockFiles };
      element.dispatchEvent(dropEvent);
      
      expect(onCreate).toHaveBeenCalledWith({
        files: [mockFiles[0], mockFiles[1]] // Only image files
      });
    });
  });

  describe('AlbumCard', () => {
    const mockAlbum = {
      id: 1,
      name: 'Test Album',
      description: 'Test Description',
      photoCount: 5,
      coverPhoto: 'https://example.com/cover.jpg',
      createdAt: '2023-01-01T00:00:00.000Z'
    };

    it('should render album card correctly', () => {
      const albumCard = new AlbumCard(mockAlbum);
      const element = albumCard.render();
      
      expect(element.classList.contains('album-card')).toBe(true);
      expect(element.getAttribute('data-album-id')).toBe('1');
      expect(element.querySelector('.album-title').textContent).toBe('Test Album');
      expect(element.querySelector('.album-photo-count span:last-child').textContent).toBe('5 photos');
    });

    it('should render without cover photo', () => {
      const album = { ...mockAlbum, coverPhoto: null };
      const albumCard = new AlbumCard(album);
      const element = albumCard.render();
      
      expect(element.querySelector('.album-cover-placeholder')).toBeTruthy();
      expect(element.querySelector('.album-cover-image')).toBeFalsy();
    });

    it('should handle click events', () => {
      const onClick = vi.fn();
      const albumCard = new AlbumCard(mockAlbum, { onClick });
      const element = albumCard.render();
      
      element.click();
      expect(onClick).toHaveBeenCalledWith(mockAlbum);
    });

    it('should handle action button clicks', () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const albumCard = new AlbumCard(mockAlbum, { onEdit, onDelete });
      const element = albumCard.render();
      
      // Test edit button
      const editBtn = element.querySelector('.album-action-btn.edit');
      editBtn.click();
      expect(onEdit).toHaveBeenCalledWith(mockAlbum);
      
      // Test delete button
      const deleteBtn = element.querySelector('.album-action-btn.delete');
      deleteBtn.click();
      expect(onDelete).toHaveBeenCalledWith(mockAlbum);
    });

    it('should handle keyboard navigation', () => {
      const onClick = vi.fn();
      const albumCard = new AlbumCard(mockAlbum, { onClick });
      const element = albumCard.render();
      
      // Test Enter key
      const enterEvent = new dom.window.KeyboardEvent('keydown', { key: 'Enter' });
      element.dispatchEvent(enterEvent);
      expect(onClick).toHaveBeenCalledWith(mockAlbum);

      onClick.mockClear();

      // Test Space key
      const spaceEvent = new dom.window.KeyboardEvent('keydown', { key: ' ' });
      element.dispatchEvent(spaceEvent);
      expect(onClick).toHaveBeenCalledWith(mockAlbum);
    });

    it('should update album data', () => {
      const albumCard = new AlbumCard(mockAlbum);
      const element = albumCard.render();
      
      albumCard.updateAlbum({ name: 'Updated Album', photoCount: 10 });
      
      expect(element.querySelector('.album-title').textContent).toBe('Updated Album');
      expect(element.querySelector('.album-photo-count span:last-child').textContent).toBe('10 photos');
    });

    it('should handle loading state', () => {
      const albumCard = new AlbumCard(mockAlbum);
      const element = albumCard.render();
      
      albumCard.setLoading(true);
      expect(element.classList.contains('loading')).toBe(true);
      expect(element.style.pointerEvents).toBe('none');
      
      albumCard.setLoading(false);
      expect(element.classList.contains('loading')).toBe(false);
      expect(element.style.pointerEvents).toBe('');
    });

    it('should handle drag and drop events', () => {
      const albumCard = new AlbumCard(mockAlbum, { draggable: true });
      const element = albumCard.render();
      
      // Mock drag start
      const dragStartEvent = new dom.window.Event('dragstart');
      dragStartEvent.dataTransfer = {
        setData: vi.fn(),
        effectAllowed: ''
      };
      dragStartEvent.clientX = 100;
      dragStartEvent.clientY = 200;
      
      element.dispatchEvent(dragStartEvent);
      
      expect(element.classList.contains('dragging')).toBe(true);
      expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith(
        'text/plain',
        JSON.stringify({ albumId: 1, type: 'album' })
      );
    });
  });

  describe('AlbumGrid', () => {
    const mockAlbums = [
      {
        id: 1,
        name: 'Album 1',
        photoCount: 5,
        createdAt: '2023-01-01T00:00:00.000Z'
      },
      {
        id: 2,
        name: 'Album 2',
        photoCount: 3,
        createdAt: '2023-01-02T00:00:00.000Z'
      }
    ];

    beforeEach(() => {
      mockAlbumService.getAlbums.mockResolvedValue(mockAlbums);
    });

    it('should render album grid with albums', async () => {
      const albumGrid = new AlbumGrid(mockAlbumService);
      const element = await albumGrid.render();
      
      expect(element.classList.contains('albums-grid')).toBe(true);
      
      // Should have create card + 2 album cards
      const cards = element.querySelectorAll('.album-card');
      expect(cards.length).toBe(3);
      
      // First card should be create card
      expect(cards[0].classList.contains('album-create-card')).toBe(true);
    });

    it('should render empty state when no albums', async () => {
      mockAlbumService.getAlbums.mockResolvedValue([]);
      
      const albumGrid = new AlbumGrid(mockAlbumService);
      const element = await albumGrid.render();
      
      expect(element.classList.contains('empty')).toBe(true);
      expect(element.querySelector('.empty-state')).toBeTruthy();
      expect(element.querySelector('.empty-state-title').textContent).toBe('No Albums Yet');
    });

    it('should handle album creation', async () => {
      const onAlbumCreate = vi.fn().mockResolvedValue({
        album: { id: 3, name: 'New Album' }
      });
      
      const albumGrid = new AlbumGrid(mockAlbumService, { onAlbumCreate });
      const element = await albumGrid.render();
      
      const createCard = element.querySelector('.album-create-card');
      createCard.click();
      
      expect(onAlbumCreate).toHaveBeenCalled();
    });

    it('should handle album reordering', async () => {
      mockAlbumService.updateAlbumOrder.mockResolvedValue();
      
      const albumGrid = new AlbumGrid(mockAlbumService);
      await albumGrid.render();
      
      await albumGrid.handleReorder({
        sourceAlbumId: 1,
        targetAlbumId: 2,
        position: 'after'
      });
      
      expect(mockAlbumService.updateAlbumOrder).toHaveBeenCalled();
    });

    it('should refresh albums', async () => {
      const albumGrid = new AlbumGrid(mockAlbumService);
      await albumGrid.render();
      
      mockAlbumService.getAlbums.mockClear();
      await albumGrid.refresh();
      
      expect(mockAlbumService.getAlbums).toHaveBeenCalled();
    });
  });

  describe('Dashboard', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    };

    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockAlbumService.getAlbums.mockResolvedValue([]);
    });

    it('should render dashboard correctly', async () => {
      const dashboard = new Dashboard(mockAlbumService, mockAuthService);
      const element = await dashboard.render();
      
      expect(element.classList.contains('dashboard-section')).toBe(true);
      expect(element.querySelector('.dashboard-header')).toBeTruthy();
      expect(element.querySelector('.dashboard-title').textContent).toBe('My Albums');
    });

    it('should display user welcome message', async () => {
      const dashboard = new Dashboard(mockAlbumService, mockAuthService);
      const element = await dashboard.render();
      
      const subtitle = element.querySelector('.dashboard-subtitle');
      expect(subtitle.textContent).toContain('Welcome back, testuser!');
    });

    it('should handle create album button click', async () => {
      const onCreateAlbumModal = vi.fn();
      const dashboard = new Dashboard(mockAlbumService, mockAuthService, {
        onCreateAlbumModal
      });
      
      const element = await dashboard.render();
      const createBtn = element.querySelector('#createAlbumBtn');
      
      createBtn.click();
      expect(onCreateAlbumModal).toHaveBeenCalled();
    });

    it('should handle logout', async () => {
      const dashboard = new Dashboard(mockAlbumService, mockAuthService);
      const element = await dashboard.render();
      
      // Mock confirm dialog
      global.confirm = vi.fn().mockReturnValue(true);
      
      const logoutBtn = element.querySelector('#logoutBtn');
      logoutBtn.click();
      
      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should handle refresh', async () => {
      const dashboard = new Dashboard(mockAlbumService, mockAuthService);
      const element = await dashboard.render();
      
      const refreshBtn = element.querySelector('#refreshBtn');
      refreshBtn.click();
      
      // Should trigger album grid refresh
      expect(mockAlbumService.getAlbums).toHaveBeenCalled();
    });

    it('should handle keyboard shortcuts', async () => {
      const onCreateAlbumModal = vi.fn();
      const dashboard = new Dashboard(mockAlbumService, mockAuthService, {
        onCreateAlbumModal
      });
      
      const element = await dashboard.render();
      
      // Test Ctrl+N shortcut
      const ctrlNEvent = new dom.window.KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true
      });
      element.dispatchEvent(ctrlNEvent);
      
      expect(onCreateAlbumModal).toHaveBeenCalled();
    });

    it('should update albums externally', async () => {
      const dashboard = new Dashboard(mockAlbumService, mockAuthService);
      await dashboard.render();
      
      // Should be able to update album
      dashboard.updateAlbum(1, { name: 'Updated Name' });
      
      // Should be able to add album
      dashboard.addAlbum({ id: 2, name: 'New Album' });
      
      // Should be able to remove album
      dashboard.removeAlbum(1);
    });
  });
});