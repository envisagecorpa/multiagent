import { Component } from '../common/Component.js';
import SearchBar from './SearchBar.js';
import FilterPanel from './FilterPanel.js';
import SearchResults from './SearchResults.js';

export default class Search extends Component {
  constructor(container, options = {}) {
    super(container);
    
    this.options = {
      title: 'Search',
      description: 'Find photos, albums, and more',
      showFilters: true,
      showAdvancedSearch: false,
      searchService: null,
      photoService: null,
      albumService: null,
      ...options
    };

    this.state = {
      query: '',
      filters: {},
      results: [],
      totalResults: 0,
      isSearching: false,
      searchHistory: [],
      lastSearchTime: null
    };

    this.searchTimeout = null;
    this.components = {
      searchBar: null,
      filterPanel: null,
      searchResults: null
    };

    this.init();
  }

  init() {
    this.render();
    this.initializeComponents();
    this.attachEventListeners();
    
    // Load search history
    this.loadSearchHistory();
    
    // Initialize with URL parameters if present
    this.initializeFromURL();
  }

  render() {
    this.container.innerHTML = `
      <div class="search-container">
        <div class="search-header">
          <h1 class="search-title">${this.options.title}</h1>
          <p class="search-description">${this.options.description}</p>
        </div>
        
        <div class="search-bar-container"></div>
        
        <div class="search-filters">
          <div class="search-content">
            <div class="search-results-container"></div>
          </div>
          ${this.options.showFilters ? '<div class="search-sidebar-container"></div>' : ''}
        </div>
      </div>
    `;

    // Get component containers
    this.searchBarContainer = this.container.querySelector('.search-bar-container');
    this.searchResultsContainer = this.container.querySelector('.search-results-container');
    this.searchSidebarContainer = this.container.querySelector('.search-sidebar-container');
  }

  initializeComponents() {
    // Initialize SearchBar
    this.components.searchBar = new SearchBar(this.searchBarContainer, {
      placeholder: 'Search photos, albums, and tags...',
      showSuggestions: true,
      debounceMs: 300,
      onSearch: this.handleSearch.bind(this),
      onSuggestionSelect: this.handleSuggestionSelect.bind(this)
    });

    // Initialize SearchResults
    this.components.searchResults = new SearchResults(this.searchResultsContainer, {
      onItemClick: this.handleResultClick.bind(this),
      onItemSelect: this.handleResultSelect.bind(this),
      onSearch: this.performSearch.bind(this)
    });

    // Initialize FilterPanel if enabled
    if (this.options.showFilters && this.searchSidebarContainer) {
      this.components.filterPanel = new FilterPanel(this.searchSidebarContainer, {
        onFilterChange: this.handleFilterChange.bind(this)
      });
    }
  }

  attachEventListeners() {
    // Listen to component events
    Object.values(this.components).forEach(component => {
      if (component) {
        component.on('*', this.handleComponentEvent.bind(this));
      }
    });

    // Browser navigation
    window.addEventListener('popstate', this.handlePopState.bind(this));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
  }

  handleComponentEvent(eventName, data) {
    // Relay component events to parent
    this.emit(eventName, data);
  }

  handleSearch(query) {
    this.setState({ query });
    this.performSearch();
    this.addToSearchHistory(query);
    this.updateURL();
  }

  handleSuggestionSelect(suggestion) {
    // Handle different suggestion types
    switch (suggestion.type) {
      case 'photos':
        this.searchPhotos(suggestion.text);
        break;
      case 'albums':
        this.searchAlbums(suggestion.text);
        break;
      case 'tag':
        this.searchByTag(suggestion.text);
        break;
      case 'location':
        this.searchByLocation(suggestion.text);
        break;
      case 'date':
        this.searchByDate(suggestion.text);
        break;
      default:
        this.handleSearch(suggestion.text);
    }
  }

  handleFilterChange(filters) {
    this.setState({ filters });
    this.performSearch();
    this.updateURL();
  }

  handleResultClick(item, index) {
    // Handle different item types
    switch (item.type) {
      case 'photo':
        this.openPhoto(item);
        break;
      case 'album':
        this.openAlbum(item);
        break;
      case 'video':
        this.openVideo(item);
        break;
      default:
        this.emit('itemOpen', { item, index });
    }
  }

  handleResultSelect(item, selected, selectedItems) {
    this.emit('itemSelect', { item, selected, selectedItems });
  }

  handlePopState(event) {
    if (event.state && event.state.search) {
      const { query, filters } = event.state.search;
      this.setState({ query, filters });
      this.updateComponents();
      this.performSearch();
    }
  }

  handleGlobalKeydown(event) {
    // Ctrl/Cmd + F to focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      this.focusSearch();
    }
    
    // Escape to clear search
    if (event.key === 'Escape' && this.state.query) {
      this.clearSearch();
    }
  }

  async performSearch() {
    const { query, filters } = this.state;
    
    if (!query.trim() && Object.keys(filters).length === 0) {
      this.components.searchResults.setResults([], 0, '');
      return;
    }

    this.setState({ isSearching: true, lastSearchTime: Date.now() });
    this.components.searchResults.setLoading(true);

    try {
      const searchParams = {
        query: query.trim(),
        filters,
        sortBy: this.components.searchResults.state.sortBy,
        page: this.components.searchResults.state.currentPage,
        limit: this.components.searchResults.options.itemsPerPage
      };

      const results = await this.executeSearch(searchParams);
      
      this.setState({ 
        results: results.items,
        totalResults: results.total,
        isSearching: false
      });

      this.components.searchResults.setResults(
        results.items,
        results.total,
        query
      );

      this.emit('searchComplete', { 
        query, 
        filters, 
        results: results.items,
        total: results.total 
      });

    } catch (error) {
      console.error('Search error:', error);
      this.setState({ isSearching: false });
      this.components.searchResults.setError(error);
      
      this.emit('searchError', { error, query, filters });
    }
  }

  async executeSearch(params) {
    // Use provided search service or implement default behavior
    if (this.options.searchService) {
      return await this.options.searchService.search(params);
    }

    // Default implementation using photo and album services
    return await this.defaultSearch(params);
  }

  async defaultSearch(params) {
    const { query, filters, sortBy, page, limit } = params;
    const results = [];

    try {
      // Search photos
      if (this.options.photoService) {
        const photoResults = await this.options.photoService.searchPhotos({
          query,
          filters,
          limit: Math.ceil(limit / 2)
        });
        
        results.push(...photoResults.map(photo => ({
          id: `photo-${photo.id}`,
          type: 'photo',
          title: photo.filename || photo.title,
          description: photo.description,
          thumbnail: photo.thumbnail_url,
          date: photo.created_at,
          size: photo.file_size,
          dimensions: {
            width: photo.width,
            height: photo.height
          },
          location: photo.location,
          tags: photo.tags || [],
          data: photo
        })));
      }

      // Search albums
      if (this.options.albumService) {
        const albumResults = await this.options.albumService.searchAlbums({
          query,
          filters,
          limit: Math.floor(limit / 2)
        });
        
        results.push(...albumResults.map(album => ({
          id: `album-${album.id}`,
          type: 'album',
          title: album.name,
          description: album.description,
          thumbnail: album.cover_photo_url,
          date: album.created_at,
          location: null,
          tags: album.tags || [],
          data: album
        })));
      }

      // Sort results
      this.sortResults(results, sortBy);

      // Paginate results
      const startIndex = (page - 1) * limit;
      const paginatedResults = results.slice(startIndex, startIndex + limit);

      return {
        items: paginatedResults,
        total: results.length,
        page,
        totalPages: Math.ceil(results.length / limit)
      };

    } catch (error) {
      console.error('Default search error:', error);
      return { items: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  sortResults(results, sortBy) {
    switch (sortBy) {
      case 'date-desc':
        results.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'date-asc':
        results.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'name-asc':
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'name-desc':
        results.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'size-desc':
        results.sort((a, b) => (b.size || 0) - (a.size || 0));
        break;
      case 'size-asc':
        results.sort((a, b) => (a.size || 0) - (b.size || 0));
        break;
      case 'relevance':
      default:
        // Keep original order for relevance
        break;
    }
  }

  // Specific search methods
  async searchPhotos(query) {
    this.setState({ 
      query,
      filters: { type: ['photos'] }
    });
    
    this.updateComponents();
    this.performSearch();
  }

  async searchAlbums(query) {
    this.setState({ 
      query,
      filters: { type: ['albums'] }
    });
    
    this.updateComponents();
    this.performSearch();
  }

  async searchByTag(tag) {
    this.setState({ 
      query: '',
      filters: { tags: [tag] }
    });
    
    this.updateComponents();
    this.performSearch();
  }

  async searchByLocation(location) {
    this.setState({ 
      query: '',
      filters: { location: [location] }
    });
    
    this.updateComponents();
    this.performSearch();
  }

  async searchByDate(dateQuery) {
    // Parse date query and set appropriate filter
    const dateFilter = this.parseDateQuery(dateQuery);
    
    this.setState({ 
      query: '',
      filters: { dateRange: dateFilter }
    });
    
    this.updateComponents();
    this.performSearch();
  }

  parseDateQuery(dateQuery) {
    // Simple date parsing - can be enhanced
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];

    if (dateQuery.includes('today')) {
      return { start: formatDate(today), end: formatDate(today) };
    } else if (dateQuery.includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: formatDate(yesterday), end: formatDate(yesterday) };
    } else if (dateQuery.includes('week')) {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: formatDate(weekAgo), end: formatDate(today) };
    } else if (dateQuery.includes('month')) {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { start: formatDate(monthAgo), end: formatDate(today) };
    }
    
    return {};
  }

  // Item actions
  openPhoto(item) {
    if (this.options.onPhotoOpen) {
      this.options.onPhotoOpen(item.data);
    } else {
      // Default: emit event for parent to handle
      this.emit('photoOpen', { photo: item.data });
    }
  }

  openAlbum(item) {
    if (this.options.onAlbumOpen) {
      this.options.onAlbumOpen(item.data);
    } else {
      // Default: emit event for parent to handle
      this.emit('albumOpen', { album: item.data });
    }
  }

  openVideo(item) {
    if (this.options.onVideoOpen) {
      this.options.onVideoOpen(item.data);
    } else {
      // Default: emit event for parent to handle
      this.emit('videoOpen', { video: item.data });
    }
  }

  // Search history management
  loadSearchHistory() {
    try {
      const history = localStorage.getItem('photo-album-search-history');
      if (history) {
        this.setState({ searchHistory: JSON.parse(history) });
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }

  addToSearchHistory(query) {
    if (!query.trim()) return;

    const { searchHistory } = this.state;
    const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, 10);
    
    this.setState({ searchHistory: newHistory });
    
    try {
      localStorage.setItem('photo-album-search-history', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  clearSearchHistory() {
    this.setState({ searchHistory: [] });
    
    try {
      localStorage.removeItem('photo-album-search-history');
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  // URL management
  updateURL() {
    const { query, filters } = this.state;
    const params = new URLSearchParams();
    
    if (query) params.set('q', query);
    if (Object.keys(filters).length > 0) {
      params.set('filters', JSON.stringify(filters));
    }

    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    
    history.pushState(
      { search: { query, filters } },
      '',
      newURL
    );
  }

  initializeFromURL() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';
    let filters = {};
    
    try {
      const filtersParam = params.get('filters');
      if (filtersParam) {
        filters = JSON.parse(filtersParam);
      }
    } catch (error) {
      console.error('Error parsing URL filters:', error);
    }

    if (query || Object.keys(filters).length > 0) {
      this.setState({ query, filters });
      this.updateComponents();
      this.performSearch();
    }
  }

  updateComponents() {
    const { query, filters } = this.state;
    
    if (this.components.searchBar) {
      this.components.searchBar.setQuery(query);
    }
    
    if (this.components.filterPanel) {
      this.components.filterPanel.setFilters(filters);
    }
  }

  // Public methods
  focusSearch() {
    this.components.searchBar?.focusInput();
  }

  clearSearch() {
    this.setState({ query: '', filters: {}, results: [], totalResults: 0 });
    this.updateComponents();
    this.components.searchResults.setResults([], 0, '');
    this.updateURL();
  }

  setQuery(query) {
    this.setState({ query });
    this.updateComponents();
  }

  setFilters(filters) {
    this.setState({ filters });
    this.updateComponents();
  }

  search(query, filters = {}) {
    this.setState({ query, filters });
    this.updateComponents();
    this.performSearch();
    this.updateURL();
  }

  getSearchState() {
    return {
      query: this.state.query,
      filters: this.state.filters,
      results: this.state.results,
      totalResults: this.state.totalResults,
      isSearching: this.state.isSearching
    };
  }

  destroy() {
    // Clear timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Remove global event listeners
    window.removeEventListener('popstate', this.handlePopState.bind(this));
    document.removeEventListener('keydown', this.handleGlobalKeydown.bind(this));

    // Destroy components
    Object.values(this.components).forEach(component => {
      if (component && component.destroy) {
        component.destroy();
      }
    });

    super.destroy();
  }
}