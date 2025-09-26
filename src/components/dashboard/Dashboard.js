import { Component } from '../common/Component.js';
import { AlbumGrid } from './AlbumGrid.js';

export class Dashboard extends Component {
  constructor(albumService, authService, options = {}) {
    super();
    this.albumService = albumService;
    this.authService = authService;
    this.options = {
      onAlbumOpen: options.onAlbumOpen || (() => {}),
      onCreateAlbumModal: options.onCreateAlbumModal || (() => {}),
      onEditAlbumModal: options.onEditAlbumModal || (() => {}),
      ...options
    };

    this.currentUser = null;
    this.albumGrid = null;
  }

  async render() {
    // Get current user
    try {
      this.currentUser = await this.authService.getCurrentUser();
    } catch (error) {
      console.error('Failed to get current user:', error);
    }

    const element = this.createElement('div', {
      className: 'dashboard-section',
      id: 'dashboard'
    });

    element.innerHTML = `
      <header class="dashboard-header">
        <div>
          <h1 class="dashboard-title">My Albums</h1>
          <p class="dashboard-subtitle">
            Welcome back${this.currentUser ? `, ${this.currentUser.username}` : ''}! 
            Organize your photos into beautiful albums.
          </p>
        </div>
        <div class="dashboard-actions">
          <button class="btn btn-secondary" id="refreshBtn" title="Refresh albums">
            <span aria-hidden="true">🔄</span>
            Refresh
          </button>
          <button class="btn btn-primary" id="createAlbumBtn">
            <span aria-hidden="true">➕</span>
            Create Album
          </button>
          <button class="btn btn-secondary" id="logoutBtn" title="Sign out">
            <span aria-hidden="true">🚪</span>
            Sign Out
          </button>
        </div>
      </header>
      <main class="dashboard-content">
        <div class="albums-container" id="albumsContainer">
          <!-- Album grid will be inserted here -->
        </div>
      </main>
    `;

    // Initialize album grid
    this.albumGrid = new AlbumGrid(this.albumService, {
      onAlbumClick: this.handleAlbumClick.bind(this),
      onAlbumCreate: this.handleCreateAlbum.bind(this),
      onAlbumEdit: this.handleEditAlbum.bind(this),
      onAlbumDelete: this.handleDeleteAlbum.bind(this),
      onAlbumReorder: this.handleAlbumReorder.bind(this)
    });

    // Listen for album grid events
    this.albumGrid.on('error', (error) => {
      this.emit('error', error);
    });

    this.albumGrid.on('reorder', (data) => {
      this.emit('albumReorder', data);
    });

    // Render album grid
    const albumsContainer = element.querySelector('#albumsContainer');
    const gridElement = await this.albumGrid.render();
    albumsContainer.appendChild(gridElement);
    this.addChild(this.albumGrid);

    this.bindEvents(element);
    return element;
  }

  bindEvents(element) {
    // Create album button
    const createAlbumBtn = element.querySelector('#createAlbumBtn');
    createAlbumBtn?.addEventListener('click', () => {
      this.handleCreateAlbumClick();
    });

    // Refresh button
    const refreshBtn = element.querySelector('#refreshBtn');
    refreshBtn?.addEventListener('click', async () => {
      await this.refresh();
    });

    // Logout button
    const logoutBtn = element.querySelector('#logoutBtn');
    logoutBtn?.addEventListener('click', async () => {
      await this.handleLogout();
    });

    // Keyboard shortcuts
    element.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            this.handleCreateAlbumClick();
            break;
          case 'r':
            e.preventDefault();
            this.refresh();
            break;
        }
      }
    });

    // Global drag and drop for creating albums from files
    element.addEventListener('dragover', (e) => {
      const files = Array.from(e.dataTransfer.items).some(item => 
        item.type.startsWith('image/')
      );
      if (files) {
        e.preventDefault();
      }
    });

    element.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      );
      
      if (files.length > 0) {
        e.preventDefault();
        this.handleCreateAlbum({ files });
      }
    });
  }

  handleAlbumClick(album) {
    this.emit('albumOpen', album);
    this.options.onAlbumOpen(album);
  }

  handleCreateAlbumClick() {
    this.options.onCreateAlbumModal();
  }

  async handleCreateAlbum(options = {}) {
    try {
      // If files are provided, create album with photos
      if (options.files && options.files.length > 0) {
        const albumName = `New Album ${new Date().toLocaleDateString()}`;
        
        // Show create album modal with files
        const result = await this.options.onCreateAlbumModal({
          defaultName: albumName,
          files: options.files
        });
        
        return result;
      } else {
        // Show create album modal
        const result = await this.options.onCreateAlbumModal();
        return result;
      }
    } catch (error) {
      console.error('Failed to handle album creation:', error);
      throw error;
    }
  }

  async handleEditAlbum(album) {
    try {
      await this.options.onEditAlbumModal(album);
    } catch (error) {
      console.error('Failed to handle album edit:', error);
      this.emit('error', { message: 'Failed to edit album', error });
    }
  }

  async handleDeleteAlbum(album) {
    try {
      const confirmed = confirm(
        `Are you sure you want to delete "${album.name}"?\n\n` +
        `This will permanently delete the album and all its photos. This action cannot be undone.`
      );

      if (confirmed) {
        // Show loading state
        const albumCard = this.albumGrid.albumCards.get(album.id);
        if (albumCard) {
          albumCard.setLoading(true);
        }

        try {
          await this.albumService.deleteAlbum(album.id);
          
          // Remove from grid
          this.albumGrid.removeAlbum(album.id);
          
          this.emit('albumDelete', album);
          return true;
        } catch (error) {
          if (albumCard) {
            albumCard.setLoading(false);
          }
          throw error;
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to delete album:', error);
      this.emit('error', { message: 'Failed to delete album', error });
      return false;
    }
  }

  handleAlbumReorder(data) {
    this.emit('albumReorder', data);
  }

  async handleLogout() {
    try {
      const confirmed = confirm('Are you sure you want to sign out?');
      if (confirmed) {
        await this.authService.logout();
        this.emit('logout');
      }
    } catch (error) {
      console.error('Failed to logout:', error);
      this.emit('error', { message: 'Failed to sign out', error });
    }
  }

  async refresh() {
    try {
      if (this.albumGrid) {
        await this.albumGrid.refresh();
      }
      this.emit('refresh');
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
      this.emit('error', { message: 'Failed to refresh', error });
    }
  }

  // Public methods for external updates
  updateAlbum(albumId, updates) {
    if (this.albumGrid) {
      this.albumGrid.updateAlbum(albumId, updates);
    }
  }

  addAlbum(album) {
    if (this.albumGrid) {
      this.albumGrid.addAlbum(album);
    }
  }

  removeAlbum(albumId) {
    if (this.albumGrid) {
      this.albumGrid.removeAlbum(albumId);
    }
  }

  getAlbums() {
    return this.albumGrid ? this.albumGrid.getAlbums() : [];
  }

  getAlbumById(albumId) {
    return this.albumGrid ? this.albumGrid.getAlbumById(albumId) : null;
  }
}