import { Component } from '../common/Component.js';

export class Dashboard extends Component {
  constructor(container, options = {}) {
    super(container);
    // Add container as an alias to element for consistency
    this.container = container;
    this.albumService = options.albumService;
    this.photoService = options.photoService;
    this.searchService = options.searchService;
    this.onAlbumSelect = options.onAlbumSelect || (() => {});
    this.onCreateAlbum = options.onCreateAlbum || (() => {});
    this.eventBus = options.eventBus;

    // Render immediately
    this.render();
  }

  async render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="dashboard-section" id="dashboard">
        <header class="dashboard-header">
          <div>
            <h1 class="dashboard-title">My Albums</h1>
            <p class="dashboard-subtitle">
              Welcome back! Organize your photos into beautiful albums.
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
          </div>
        </header>
        <main class="dashboard-content">
          <div class="albums-container" id="albumsContainer">
            <p>Loading albums...</p>
          </div>
        </main>
      </div>
    `;

    this.bindEvents();
    await this.loadAlbums();
  }

  async loadAlbums() {
    const albumsContainer = this.container.querySelector('#albumsContainer');
    if (!albumsContainer) return;

    try {
      const albums = await this.albumService.getAllAlbums();
      if (albums && albums.length > 0) {
        albumsContainer.innerHTML = `<p>Found ${albums.length} albums</p>`;
      } else {
        albumsContainer.innerHTML = `<p>No albums yet. Create your first album!</p>`;
      }
    } catch (error) {
      console.error('Error loading albums:', error);
      albumsContainer.innerHTML = `<p>Error loading albums</p>`;
    }
  }

  bindEvents() {
    // Create album button
    const createAlbumBtn = this.container.querySelector('#createAlbumBtn');
    createAlbumBtn?.addEventListener('click', () => {
      this.handleCreateAlbumClick();
    });

    // Refresh button
    const refreshBtn = this.container.querySelector('#refreshBtn');
    refreshBtn?.addEventListener('click', async () => {
      await this.loadAlbums();
    });
  }

  handleCreateAlbumClick() {
    if (this.onCreateAlbum) {
      this.onCreateAlbum();
    }
  }

  destroy() {
    // Cleanup if needed
    super.destroy();
  }
}
