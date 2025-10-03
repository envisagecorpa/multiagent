/**
 * SearchService - Comprehensive search engine for photo management application
 * 
 * PURPOSE:
 * Provides full-text search capabilities across photos and albums with advanced filtering,
 * relevance scoring, and real-time indexing for a photo management application.
 * 
 * KEY FEATURES:
 * • Multi-Index Search System (main, tag, location, date indexes)
 * • Intelligent relevance scoring with metadata weighting
 * • Advanced filtering (type, tags, date range, file size, location, rating)
 * • Multiple sort options (relevance, date, name, file size)
 * • Real-time index management with incremental updates
 * • Search suggestions & autocomplete functionality
 * • Pagination support with configurable page sizes
 * 
 * ARCHITECTURE:
 * - Main Search Index: Full-text search across photo/album metadata
 * - Tag Index: Fast tag-based filtering and suggestions
 * - Location Index: Geographic search capabilities  
 * - Date Index: Time-based organization and filtering
 * 
 * USAGE:
 * The service acts as a centralized search engine that other components can use
 * to provide users with fast, relevant search results across their photo library
 * with sophisticated filtering and ranking capabilities.
 */
export default class SearchService {
  /**
   * Creates a new SearchService instance
   * @param {Object} options - Configuration options
   * @param {Object} options.photoService - Photo service instance for data access
   * @param {Object} options.albumService - Album service instance for data access
   * @param {Object} options.indexedDB - IndexedDB instance for persistence
   * @param {number} options.searchTimeout - Search operation timeout in milliseconds
   */
  constructor(options = {}) {
    this.options = {
      photoService: null,
      albumService: null,
      indexedDB: null,
      searchTimeout: 5000,
      ...options
    };

    this.searchIndex = new Map();
    this.tagIndex = new Map();
    this.locationIndex = new Map();
    this.dateIndex = new Map();
    
    this.initialized = false;
    this.initPromise = null;
  }

  // ==================== INITIALIZATION METHODS ====================

  /**
   * Initializes the search service and builds all search indexes
   * Uses lazy initialization with promise caching to prevent multiple builds
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.buildSearchIndex();
    await this.initPromise;
    this.initialized = true;
  }

  /**
   * Builds all search indexes in parallel for optimal performance
   * Creates main search index, tag index, location index, and date index
   * @returns {Promise<void>}
   * @throws {Error} If index building fails
   */
  async buildSearchIndex() {
    try {
      console.log('Building search index...');
      
      // Build indexes for photos and albums
      await Promise.all([
        this.indexPhotos(),
        this.indexAlbums(),
        this.indexTags(),
        this.indexLocations()
      ]);

      console.log('Search index built successfully');
    } catch (error) {
      console.error('Error building search index:', error);
      throw error;
    }
  }

  // ==================== INDEX BUILDING METHODS ====================

  /**
   * Indexes all photos into the search system
   * Creates searchable text from filename, title, description, location, and tags
   * Populates tag, location, and date indexes for fast filtering
   * @returns {Promise<void>}
   */
  async indexPhotos() {
    if (!this.options.photoService) return;

    try {
      const photos = await this.options.photoService.getAllPhotos();
      
      photos.forEach(photo => {
        // Create searchable text
        const searchableText = [
          photo.filename,
          photo.title,
          photo.description,
          photo.location,
          ...(photo.tags || [])
        ].filter(Boolean).join(' ').toLowerCase();

        // Add to main search index
        this.searchIndex.set(`photo-${photo.id}`, {
          id: photo.id,
          type: 'photo',
          searchText: searchableText,
          data: photo,
          weight: this.calculatePhotoWeight(photo)
        });

        // Index tags
        if (photo.tags && photo.tags.length > 0) {
          photo.tags.forEach(tag => {
            if (!this.tagIndex.has(tag.toLowerCase())) {
              this.tagIndex.set(tag.toLowerCase(), []);
            }
            this.tagIndex.get(tag.toLowerCase()).push(`photo-${photo.id}`);
          });
        }

        // Index location
        if (photo.location) {
          const location = photo.location.toLowerCase();
          if (!this.locationIndex.has(location)) {
            this.locationIndex.set(location, []);
          }
          this.locationIndex.get(location).push(`photo-${photo.id}`);
        }

        // Index date
        if (photo.date_added) {
          const date = new Date(photo.date_added);
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!this.dateIndex.has(dateKey)) {
            this.dateIndex.set(dateKey, []);
          }
          this.dateIndex.get(dateKey).push(`photo-${photo.id}`);
        }
      });

    } catch (error) {
      console.error('Error indexing photos:', error);
    }
  }

  /**
   * Indexes all albums into the search system
   * Creates searchable text from name, description, and tags
   * Populates tag and date indexes for albums
   * @returns {Promise<void>}
   */
  async indexAlbums() {
    if (!this.options.albumService) return;

    try {
      const albums = await this.options.albumService.getAllAlbums();
      
      albums.forEach(album => {
        // Create searchable text
        const searchableText = [
          album.name,
          album.description,
          ...(album.tags || [])
        ].filter(Boolean).join(' ').toLowerCase();

        // Add to main search index
        this.searchIndex.set(`album-${album.id}`, {
          id: album.id,
          type: 'album',
          searchText: searchableText,
          data: album,
          weight: this.calculateAlbumWeight(album)
        });

        // Index tags
        if (album.tags && album.tags.length > 0) {
          album.tags.forEach(tag => {
            if (!this.tagIndex.has(tag.toLowerCase())) {
              this.tagIndex.set(tag.toLowerCase(), []);
            }
            this.tagIndex.get(tag.toLowerCase()).push(`album-${album.id}`);
          });
        }

        // Index date
        if (album.created_at) {
          const date = new Date(album.created_at);
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!this.dateIndex.has(dateKey)) {
            this.dateIndex.set(dateKey, []);
          }
          this.dateIndex.get(dateKey).push(`album-${album.id}`);
        }
      });

    } catch (error) {
      console.error('Error indexing albums:', error);
    }
  }

  /**
   * Finalizes tag indexing and logs statistics
   * Tags are indexed during photo/album indexing for efficiency
   * @returns {Promise<void>}
   */
  async indexTags() {
    // Tags are indexed during photo/album indexing
    // This method can be used for additional tag processing
    console.log(`Indexed ${this.tagIndex.size} unique tags`);
  }

  /**
   * Finalizes location indexing and logs statistics
   * Locations are indexed during photo indexing for efficiency
   * @returns {Promise<void>}
   */
  async indexLocations() {
    // Locations are indexed during photo indexing
    // This method can be used for additional location processing
    console.log(`Indexed ${this.locationIndex.size} unique locations`);
  }

  // ==================== WEIGHT CALCULATION METHODS ====================

  /**
   * Calculates relevance weight for a photo based on metadata richness and recency
   * Higher weight for photos with title, description, tags, location
   * Boosts recent photos (within 30/90 days)
   * @param {Object} photo - Photo object to calculate weight for
   * @returns {number} Weight score (higher = more relevant)
   */
  calculatePhotoWeight(photo) {
    let weight = 1;
    
    // Boost weight for photos with metadata
    if (photo.title) weight += 0.5;
    if (photo.description) weight += 0.3;
    if (photo.tags && photo.tags.length > 0) weight += photo.tags.length * 0.1;
    if (photo.location) weight += 0.2;
    
    // Boost recent photos
    if (photo.date_added) {
      const daysSinceCreation = (Date.now() - new Date(photo.date_added)) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 30) weight += 0.3;
      else if (daysSinceCreation < 90) weight += 0.1;
    }

    return weight;
  }

  /**
   * Calculates relevance weight for an album
   * Albums get higher base weight than photos
   * Boosts for description, tags, and photo count
   * @param {Object} album - Album object to calculate weight for
   * @returns {number} Weight score (higher = more relevant)
   */
  calculateAlbumWeight(album) {
    let weight = 2; // Albums generally have higher base weight
    
    if (album.description) weight += 0.5;
    if (album.tags && album.tags.length > 0) weight += album.tags.length * 0.1;
    if (album.photo_count > 0) weight += Math.min(album.photo_count * 0.05, 1);

    return weight;
  }

  // ==================== MAIN SEARCH METHOD ====================

  /**
   * Performs comprehensive search across photos and albums
   * Supports text queries, filtering, sorting, and pagination
   * @param {Object} params - Search parameters
   * @param {string} params.query - Text query to search for
   * @param {Object} params.filters - Filter criteria (type, tags, dateRange, etc.)
   * @param {string} params.sortBy - Sort method ('relevance', 'date-desc', 'name-asc', etc.)
   * @param {number} params.page - Page number for pagination (1-based)
   * @param {number} params.limit - Number of results per page
   * @returns {Promise<Object>} Search results with items, pagination info, and metadata
   */
  async search(params) {
    await this.init();

    const {
      query = '',
      filters = {},
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = params;

    try {
      let results = [];

      if (query.trim()) {
        results = await this.performTextSearch(query.trim());
      } else {
        // No query - get all items
        results = Array.from(this.searchIndex.values());
      }

      // Apply filters
      results = this.applyFilters(results, filters);

      // Calculate relevance scores for text search
      if (query.trim()) {
        results = this.calculateRelevanceScores(results, query.trim());
      }

      // Sort results
      results = this.sortResults(results, sortBy);

      // Paginate
      const total = results.length;
      const startIndex = (page - 1) * limit;
      const paginatedResults = results.slice(startIndex, startIndex + limit);

      // Convert to result format
      const items = paginatedResults.map(item => this.formatSearchResult(item));

      return {
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        query,
        filters
      };

    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  // ==================== SEARCH IMPLEMENTATION METHODS ====================

  /**
   * Performs full-text search across the main search index
   * Uses term matching with relevance scoring based on exact matches and word boundaries
   * @param {string} query - Search query text
   * @returns {Promise<Array>} Array of matching items with relevance scores
   */
  async performTextSearch(query) {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
    const results = new Map();

    // Search in main index
    for (const [key, item] of this.searchIndex) {
      let score = 0;
      
      queryTerms.forEach(term => {
        if (item.searchText.includes(term)) {
          // Exact match gets higher score
          const exactMatches = (item.searchText.match(new RegExp(term, 'g')) || []).length;
          score += exactMatches * item.weight;
          
          // Boost for matches at word boundaries
          const wordBoundaryMatches = (item.searchText.match(new RegExp(`\\b${term}`, 'g')) || []).length;
          score += wordBoundaryMatches * 0.5;
        }
      });

      if (score > 0) {
        results.set(key, { ...item, relevanceScore: score });
      }
    }

    return Array.from(results.values());
  }

  /**
   * Applies various filters to search results
   * Supports filtering by type, tags, date range, file size, location, and rating
   * @param {Array} results - Initial search results to filter
   * @param {Object} filters - Filter criteria object
   * @returns {Array} Filtered results array
   */
  applyFilters(results, filters) {
    let filteredResults = [...results];

    // Type filter
    if (filters.type && filters.type.length > 0) {
      const allowedTypes = filters.type.map(type => {
        if (type === 'photos') return 'photo';
        if (type === 'albums') return 'album';
        return type;
      });
      
      filteredResults = filteredResults.filter(item => 
        allowedTypes.includes(item.type)
      );
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      filteredResults = filteredResults.filter(item => {
        const itemTags = (item.data.tags || []).map(tag => tag.toLowerCase());
        return filters.tags.some(filterTag => 
          itemTags.includes(filterTag.toLowerCase())
        );
      });
    }

    // Date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;

      filteredResults = filteredResults.filter(item => {
        // Use appropriate date field based on item type
        const dateField = item.type === 'photo' ? item.data.date_added : item.data.created_at;
        if (!dateField) return false;

        const itemDate = new Date(dateField);
        const startDate = start ? new Date(start) : null;
        const endDate = end ? new Date(end) : null;

        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;

        return true;
      });
    }

    // File size filter (for photos)
    if (filters.fileSize) {
      const { min, max } = filters.fileSize;
      
      filteredResults = filteredResults.filter(item => {
        if (item.type !== 'photo' || !item.data.file_size) return true;
        
        const sizeMB = item.data.file_size / (1024 * 1024);
        
        if (min !== undefined && sizeMB < min) return false;
        if (max !== undefined && sizeMB > max) return false;
        
        return true;
      });
    }

    // Location filter
    if (filters.location && filters.location.length > 0) {
      filteredResults = filteredResults.filter(item => {
        if (!item.data.location) return false;
        
        return filters.location.some(filterLocation =>
          item.data.location.toLowerCase().includes(filterLocation.toLowerCase())
        );
      });
    }

    // Rating filter
    if (filters.rating) {
      const { min, max } = filters.rating;
      
      filteredResults = filteredResults.filter(item => {
        const rating = item.data.rating || 0;
        
        if (min !== undefined && rating < min) return false;
        if (max !== undefined && rating > max) return false;
        
        return true;
      });
    }

    return filteredResults;
  }

  /**
   * Calculates and enhances relevance scores for search results
   * Boosts items with title matches and exact phrase matches
   * @param {Array} results - Search results to score
   * @param {string} query - Original search query
   * @returns {Array} Results with updated relevance scores
   */
  calculateRelevanceScores(results, query) {
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return results.map(item => {
      let relevanceScore = item.relevanceScore || 0;
      
      // Boost for title matches
      if (item.data.title || item.data.name) {
        const title = (item.data.title || item.data.name).toLowerCase();
        queryTerms.forEach(term => {
          if (title.includes(term)) {
            relevanceScore += 2;
          }
        });
      }

      // Boost for exact phrase matches
      if (item.searchText.includes(query.toLowerCase())) {
        relevanceScore += 3;
      }

      return { ...item, relevanceScore };
    });
  }

  /**
   * Sorts search results by specified criteria
   * Supports relevance, date (asc/desc), name (asc/desc), and size (asc/desc) sorting
   * @param {Array} results - Results to sort
   * @param {string} sortBy - Sort method identifier
   * @returns {Array} Sorted results array
   */
  sortResults(results, sortBy) {
    switch (sortBy) {
      case 'relevance':
        return results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      
      case 'date-desc':
        return results.sort((a, b) => {
          const dateA = new Date(a.type === 'photo' ? (a.data.date_added || 0) : (a.data.created_at || 0));
          const dateB = new Date(b.type === 'photo' ? (b.data.date_added || 0) : (b.data.created_at || 0));
          return dateB - dateA;
        });

      case 'date-asc':
        return results.sort((a, b) => {
          const dateA = new Date(a.type === 'photo' ? (a.data.date_added || 0) : (a.data.created_at || 0));
          const dateB = new Date(b.type === 'photo' ? (b.data.date_added || 0) : (b.data.created_at || 0));
          return dateA - dateB;
        });
      
      case 'name-asc':
        return results.sort((a, b) => {
          const nameA = (a.data.title || a.data.name || a.data.filename || '').toLowerCase();
          const nameB = (b.data.title || b.data.name || b.data.filename || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      
      case 'name-desc':
        return results.sort((a, b) => {
          const nameA = (a.data.title || a.data.name || a.data.filename || '').toLowerCase();
          const nameB = (b.data.title || b.data.name || b.data.filename || '').toLowerCase();
          return nameB.localeCompare(nameA);
        });
      
      case 'size-desc':
        return results.sort((a, b) => (b.data.file_size || 0) - (a.data.file_size || 0));
      
      case 'size-asc':
        return results.sort((a, b) => (a.data.file_size || 0) - (b.data.file_size || 0));
      
      default:
        return results;
    }
  }

  /**
   * Formats raw search results into standardized result objects
   * Provides consistent structure for photos and albums with relevant metadata
   * @param {Object} item - Raw search result item
   * @returns {Object} Formatted search result with standardized fields
   */
  formatSearchResult(item) {
    const baseResult = {
      id: `${item.type}-${item.id}`,
      type: item.type,
      relevanceScore: item.relevanceScore || 0,
      data: item.data
    };

    if (item.type === 'photo') {
      return {
        ...baseResult,
        title: item.data.filename || item.data.title || 'Untitled Photo',
        description: item.data.description || '',
        thumbnail: item.data.thumbnail_url,
        date: item.data.date_added,
        size: item.data.file_size,
        dimensions: {
          width: item.data.width,
          height: item.data.height
        },
        location: item.data.location,
        tags: item.data.tags || []
      };
    } else if (item.type === 'album') {
      return {
        ...baseResult,
        title: item.data.name || 'Untitled Album',
        description: item.data.description || '',
        thumbnail: item.data.cover_photo_url,
        date: item.data.created_at,
        location: null,
        tags: item.data.tags || [],
        photoCount: item.data.photo_count || 0
      };
    }

    return baseResult;
  }

  // ==================== SUGGESTION AND AUTOCOMPLETE METHODS ====================

  /**
   * Generates search suggestions for autocomplete functionality
   * Provides tag, location, and generic search suggestions based on partial query
   * @param {string} query - Partial search query (minimum 2 characters)
   * @param {number} limit - Maximum number of suggestions to return
   * @returns {Promise<Array>} Array of suggestion objects with text, type, and metadata
   */
  async getSearchSuggestions(query, limit = 8) {
    await this.init();

    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    const suggestions = [];

    // Add tag suggestions
    for (const [tag, items] of this.tagIndex) {
      if (tag.includes(queryLower) && suggestions.length < limit) {
        suggestions.push({
          id: `tag-${tag}`,
          text: tag,
          type: 'tag',
          icon: '🏷️',
          count: items.length
        });
      }
    }

    // Add location suggestions
    for (const [location, items] of this.locationIndex) {
      if (location.includes(queryLower) && suggestions.length < limit) {
        suggestions.push({
          id: `location-${location}`,
          text: location,
          type: 'location',
          icon: '📍',
          count: items.length
        });
      }
    }

    // Add generic search suggestions
    if (suggestions.length < limit) {
      suggestions.push({
        id: `search-photos-${query}`,
        text: `Photos containing "${query}"`,
        type: 'photos',
        icon: '📷'
      });
    }

    if (suggestions.length < limit) {
      suggestions.push({
        id: `search-albums-${query}`,
        text: `Albums named "${query}"`,
        type: 'albums',
        icon: '📁'
      });
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Retrieves all indexed tags with usage counts
   * Useful for tag clouds, filters, and suggestion systems
   * @returns {Promise<Array>} Array of tag objects with id, name, and count
   */
  async getTags() {
    await this.init();
    return Array.from(this.tagIndex.keys()).map(tag => ({
      id: tag,
      name: tag,
      count: this.tagIndex.get(tag).length
    }));
  }

  /**
   * Retrieves all indexed locations with usage counts
   * Useful for location filters and suggestion systems
   * @returns {Promise<Array>} Array of location objects with id, name, and count
   */
  async getLocations() {
    await this.init();
    return Array.from(this.locationIndex.keys()).map(location => ({
      id: location,
      name: location,
      count: this.locationIndex.get(location).length
    }));
  }

  // ==================== INDEX MAINTENANCE METHODS ====================

  /**
   * Adds a single photo to all relevant indexes in real-time
   * Updates main search index, tag index, and location index
   * @param {Object} photo - Photo object to add to indexes
   * @returns {Promise<void>}
   */
  async addPhoto(photo) {
    // Add single photo to index
    const searchableText = [
      photo.filename,
      photo.title,
      photo.description,
      photo.location,
      ...(photo.tags || [])
    ].filter(Boolean).join(' ').toLowerCase();

    this.searchIndex.set(`photo-${photo.id}`, {
      id: photo.id,
      type: 'photo',
      searchText: searchableText,
      data: photo,
      weight: this.calculatePhotoWeight(photo)
    });

    // Update tag index
    if (photo.tags) {
      photo.tags.forEach(tag => {
        const tagLower = tag.toLowerCase();
        if (!this.tagIndex.has(tagLower)) {
          this.tagIndex.set(tagLower, []);
        }
        this.tagIndex.get(tagLower).push(`photo-${photo.id}`);
      });
    }

    // Update location index
    if (photo.location) {
      const locationLower = photo.location.toLowerCase();
      if (!this.locationIndex.has(locationLower)) {
        this.locationIndex.set(locationLower, []);
      }
      this.locationIndex.get(locationLower).push(`photo-${photo.id}`);
    }
  }

  /**
   * Removes a photo from all indexes in real-time
   * Cleans up main search index, tag index, and location index
   * @param {string|number} photoId - ID of photo to remove
   * @returns {Promise<void>}
   */
  async removePhoto(photoId) {
    const key = `photo-${photoId}`;
    const item = this.searchIndex.get(key);
    
    if (item) {
      // Remove from main index
      this.searchIndex.delete(key);

      // Remove from tag index
      if (item.data.tags) {
        item.data.tags.forEach(tag => {
          const tagLower = tag.toLowerCase();
          const tagItems = this.tagIndex.get(tagLower);
          if (tagItems) {
            const index = tagItems.indexOf(key);
            if (index > -1) {
              tagItems.splice(index, 1);
              if (tagItems.length === 0) {
                this.tagIndex.delete(tagLower);
              }
            }
          }
        });
      }

      // Remove from location index
      if (item.data.location) {
        const locationLower = item.data.location.toLowerCase();
        const locationItems = this.locationIndex.get(locationLower);
        if (locationItems) {
          const index = locationItems.indexOf(key);
          if (index > -1) {
            locationItems.splice(index, 1);
            if (locationItems.length === 0) {
              this.locationIndex.delete(locationLower);
            }
          }
        }
      }
    }
  }

  /**
   * Completely rebuilds all search indexes from scratch
   * Useful for data consistency recovery or major schema changes
   * @returns {Promise<void>}
   */
  async rebuildIndex() {
    // Clear existing indexes
    this.searchIndex.clear();
    this.tagIndex.clear();
    this.locationIndex.clear();
    this.dateIndex.clear();

    // Rebuild
    this.initialized = false;
    await this.init();
  }
}