import { Component } from '../common/Component.js';
import { AlbumCard } from './AlbumCard.js';
import { AlbumCreateCard } from './AlbumCreateCard.js';

export class AlbumGrid extends Component {
  constructor(albumService, options = {}) {
    super();
    this.albumService = albumService;
    this.options = {
      onAlbumClick: options.onAlbumClick || (() => {}),
      onAlbumCreate: options.onAlbumCreate || (() => {}),
      onAlbumEdit: options.onAlbumEdit || (() => {}),
      onAlbumDelete: options.onAlbumDelete || (() => {}),
      onAlbumReorder: options.onAlbumReorder || (() => {}),
      ...options
    };

    this.albums = [];
    this.albumCards = new Map();
    this.loading = false;
    this.draggedAlbum = null;
  }

  async render() {
    const element = this.createElement('div', {
      className: 'albums-grid'
    });

    // Add drop zone for reordering
    this.setupDropZone(element);

    await this.loadAlbums();
    this.renderAlbums(element);

    return element;
  }

  async loadAlbums() {
    try {
      this.loading = true;
      this.albums = await this.albumService.getAlbums();
    } catch (error) {
      console.error('Failed to load albums:', error);
      this.emit('error', { message: 'Failed to load albums', error });
      this.albums = [];
    } finally {
      this.loading = false;
    }
  }

  renderAlbums(container) {
    // Clear existing content
    container.innerHTML = '';
    this.albumCards.clear();

    if (this.loading) {
      container.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading albums...</p>
        </div>
      `;
      return;
    }

    // Show empty state if no albums
    if (this.albums.length === 0) {
      container.classList.add('empty');
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">📁</div>
          <h3 class="empty-state-title">No Albums Yet</h3>
          <p class="empty-state-description">
            Create your first album to start organizing your photos. 
            You can drag and drop images directly onto the create button!
          </p>
          <div class="create-album-placeholder"></div>
        </div>
      `;

      // Add create card to empty state
      const placeholder = container.querySelector('.create-album-placeholder');
      const createCard = new AlbumCreateCard({
        onCreate: this.handleAlbumCreate.bind(this)
      });
      placeholder.appendChild(createCard.render());
      this.addChild(createCard);
      return;
    }

    container.classList.remove('empty');

    // Add create card first
    const createCard = new AlbumCreateCard({
      onCreate: this.handleAlbumCreate.bind(this)
    });
    container.appendChild(createCard.render());
    this.addChild(createCard);

    // Add album cards
    this.albums.forEach(album => {
      const albumCard = new AlbumCard(album, {
        onClick: this.options.onAlbumClick,
        onEdit: this.handleAlbumEdit.bind(this),
        onDelete: this.handleAlbumDelete.bind(this),
        draggable: true
      });

      // Listen for drag events
      albumCard.on('dragstart', this.handleDragStart.bind(this));
      albumCard.on('dragend', this.handleDragEnd.bind(this));
      albumCard.on('reorder', this.handleReorder.bind(this));

      const cardElement = albumCard.render();
      container.appendChild(cardElement);
      
      this.albumCards.set(album.id, albumCard);
      this.addChild(albumCard);
    });
  }

  setupDropZone(element) {
    let dragCounter = 0;

    element.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      
      if (this.draggedAlbum) {
        element.classList.add('drag-active');
      }
    });

    element.addEventListener('dragleave', (e) => {
      dragCounter--;
      
      if (dragCounter === 0) {
        element.classList.remove('drag-active');
      }
    });

    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      element.classList.remove('drag-active');
    });
  }

  handleDragStart({ album }) {
    this.draggedAlbum = album;
    this.element.classList.add('drag-active');
  }

  handleDragEnd() {
    this.draggedAlbum = null;
    this.element.classList.remove('drag-active');
  }

  async handleReorder({ sourceAlbumId, targetAlbumId, position }) {
    try {
      // Find source and target albums
      const sourceIndex = this.albums.findIndex(a => a.id === sourceAlbumId);
      const targetIndex = this.albums.findIndex(a => a.id === targetAlbumId);
      
      if (sourceIndex === -1 || targetIndex === -1) return;

      // Calculate new position
      let newIndex = position === 'before' ? targetIndex : targetIndex + 1;
      if (sourceIndex < targetIndex && position === 'after') {
        newIndex = targetIndex;
      } else if (sourceIndex > targetIndex && position === 'before') {
        newIndex = targetIndex;
      }

      // Reorder in local array
      const [movedAlbum] = this.albums.splice(sourceIndex, 1);
      this.albums.splice(newIndex, 0, movedAlbum);

      // Update display order values
      this.albums.forEach((album, index) => {
        album.displayOrder = index;
      });

      // Save new order to database
      await this.albumService.updateAlbumOrder(
        this.albums.map(album => ({
          id: album.id,
          displayOrder: album.displayOrder
        }))
      );

      // Re-render grid with new order
      this.renderAlbums(this.element);

      this.emit('reorder', {
        albums: this.albums,
        movedAlbum: movedAlbum
      });

    } catch (error) {
      console.error('Failed to reorder albums:', error);
      this.emit('error', { message: 'Failed to reorder albums', error });
      
      // Reload albums to restore correct order
      await this.refresh();
    }
  }

  async handleAlbumCreate(options = {}) {
    try {
      const result = await this.options.onAlbumCreate(options);
      
      if (result && result.album) {
        // Add new album to local array
        this.albums.push(result.album);
        
        // Re-render grid
        this.renderAlbums(this.element);
      }
    } catch (error) {
      console.error('Failed to create album:', error);
      this.emit('error', { message: 'Failed to create album', error });
    }
  }

  async handleAlbumEdit(album) {
    try {
      await this.options.onAlbumEdit(album);
    } catch (error) {
      console.error('Failed to edit album:', error);
      this.emit('error', { message: 'Failed to edit album', error });
    }
  }

  async handleAlbumDelete(album) {
    try {
      const confirmed = await this.options.onAlbumDelete(album);
      
      if (confirmed) {
        // Remove from local array
        const index = this.albums.findIndex(a => a.id === album.id);
        if (index !== -1) {
          this.albums.splice(index, 1);
          
          // Re-render grid
          this.renderAlbums(this.element);
        }
      }
    } catch (error) {
      console.error('Failed to delete album:', error);
      this.emit('error', { message: 'Failed to delete album', error });
    }
  }

  async refresh() {
    await this.loadAlbums();
    if (this.element) {
      this.renderAlbums(this.element);
    }
  }

  updateAlbum(albumId, updates) {
    const album = this.albums.find(a => a.id === albumId);
    if (album) {
      Object.assign(album, updates);
      
      const albumCard = this.albumCards.get(albumId);
      if (albumCard) {
        albumCard.updateAlbum(updates);
      }
    }
  }

  removeAlbum(albumId) {
    const index = this.albums.findIndex(a => a.id === albumId);
    if (index !== -1) {
      this.albums.splice(index, 1);
      this.albumCards.delete(albumId);
      
      if (this.element) {
        this.renderAlbums(this.element);
      }
    }
  }

  addAlbum(album) {
    this.albums.push(album);
    
    if (this.element) {
      this.renderAlbums(this.element);
    }
  }

  setLoading(loading) {
    this.loading = loading;
    
    if (this.element) {
      if (loading) {
        this.element.innerHTML = `
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading albums...</p>
          </div>
        `;
      } else {
        this.renderAlbums(this.element);
      }
    }
  }

  getAlbums() {
    return [...this.albums];
  }

  getAlbumById(albumId) {
    return this.albums.find(a => a.id === albumId);
  }
}