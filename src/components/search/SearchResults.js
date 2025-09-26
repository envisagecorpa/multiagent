import { Component } from '../common/Component.js';

export default class SearchResults extends Component {
  constructor(container, options = {}) {
    super(container);
    
    this.options = {
      sortOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'date-desc', label: 'Date (Newest)' },
        { value: 'date-asc', label: 'Date (Oldest)' },
        { value: 'name-asc', label: 'Name (A-Z)' },
        { value: 'name-desc', label: 'Name (Z-A)' },
        { value: 'size-desc', label: 'Size (Largest)' },
        { value: 'size-asc', label: 'Size (Smallest)' }
      ],
      defaultSort: 'relevance',
      itemsPerPage: 20,
      showPagination: true,
      onItemClick: null,
      onItemSelect: null,
      ...options
    };

    this.state = {
      results: [],
      query: '',
      totalResults: 0,
      currentPage: 1,
      sortBy: this.options.defaultSort,
      isLoading: false,
      error: null,
      selectedItems: new Set()
    };

    this.currentController = null;

    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="search-results">
        ${this.renderHeader()}
        ${this.renderContent()}
      </div>
    `;

    this.headerContainer = this.container.querySelector('.search-results-header');
    this.contentContainer = this.container.querySelector('.search-results-content');
  }

  renderHeader() {
    const { query, totalResults, sortBy } = this.state;
    
    if (!query && totalResults === 0) {
      return '';
    }

    return `
      <div class="search-results-header">
        <div class="search-results-info">
          ${query ? `
            <span>Search results for </span>
            <span class="search-results-query">"${this.escapeHtml(query)}"</span>
            <span> - </span>
          ` : ''}
          <span class="search-results-count">${totalResults.toLocaleString()} result${totalResults !== 1 ? 's' : ''}</span>
        </div>
        <div class="search-results-sort">
          <label class="search-sort-label" for="sort-select">Sort by:</label>
          <select class="search-sort-select" id="sort-select">
            ${this.options.sortOptions.map(option => `
              <option value="${option.value}" ${sortBy === option.value ? 'selected' : ''}>
                ${option.label}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
    `;
  }

  renderContent() {
    const { isLoading, error, results } = this.state;

    if (isLoading) {
      return this.renderLoading();
    }

    if (error) {
      return this.renderError();
    }

    if (results.length === 0) {
      return this.renderEmpty();
    }

    return `
      <div class="search-results-content">
        <div class="search-results-list">
          ${results.map((item, index) => this.renderResultItem(item, index)).join('')}
        </div>
        ${this.options.showPagination ? this.renderPagination() : ''}
      </div>
    `;
  }

  renderLoading() {
    return `
      <div class="search-loading">
        <div class="search-loading-spinner"></div>
        <div class="search-loading-text">Searching...</div>
      </div>
    `;
  }

  renderError() {
    return `
      <div class="search-empty">
        <div class="search-empty-icon">⚠️</div>
        <div class="search-empty-title">Search Error</div>
        <div class="search-empty-description">
          ${this.escapeHtml(this.state.error.message || 'An error occurred while searching.')}
          <br><br>
          <button class="filter-btn filter-btn-primary" onclick="this.retry()">
            Try Again
          </button>
        </div>
      </div>
    `;
  }

  renderEmpty() {
    const { query } = this.state;
    
    return `
      <div class="search-empty">
        <div class="search-empty-icon">🔍</div>
        <div class="search-empty-title">
          ${query ? 'No Results Found' : 'Start Searching'}
        </div>
        <div class="search-empty-description">
          ${query 
            ? `We couldn't find anything matching "${this.escapeHtml(query)}". Try different keywords or adjust your filters.`
            : 'Enter a search term to find photos, albums, and more.'
          }
        </div>
      </div>
    `;
  }

  renderResultItem(item, index) {
    const isSelected = this.state.selectedItems.has(item.id);
    
    return `
      <div class="search-result-item" data-item-id="${item.id}" data-index="${index}">
        ${this.options.selectable ? `
          <input 
            type="checkbox" 
            class="search-result-checkbox"
            ${isSelected ? 'checked' : ''}
            aria-label="Select ${item.title}"
          >
        ` : ''}
        
        <div class="search-result-thumbnail">
          ${item.thumbnail ? `
            <img src="${item.thumbnail}" alt="${this.escapeHtml(item.title)}" loading="lazy">
          ` : `
            <div class="search-result-thumbnail-placeholder">
              ${this.getTypeIcon(item.type)}
            </div>
          `}
        </div>
        
        <div class="search-result-content">
          <h3 class="search-result-title">
            ${this.highlightQuery(item.title)}
          </h3>
          
          ${item.description ? `
            <p class="search-result-description">
              ${this.highlightQuery(item.description)}
            </p>
          ` : ''}
          
          <div class="search-result-meta">
            <span class="search-result-type">${item.type}</span>
            
            ${item.date ? `
              <span class="search-result-meta-item">
                📅 ${this.formatDate(item.date)}
              </span>
            ` : ''}
            
            ${item.size ? `
              <span class="search-result-meta-item">
                📏 ${this.formatFileSize(item.size)}
              </span>
            ` : ''}
            
            ${item.dimensions ? `
              <span class="search-result-meta-item">
                📐 ${item.dimensions.width}×${item.dimensions.height}
              </span>
            ` : ''}
            
            ${item.location ? `
              <span class="search-result-meta-item">
                📍 ${this.escapeHtml(item.location)}
              </span>
            ` : ''}
            
            ${item.tags && item.tags.length > 0 ? `
              <span class="search-result-meta-item">
                🏷️ ${item.tags.slice(0, 3).map(tag => this.highlightQuery(tag)).join(', ')}
                ${item.tags.length > 3 ? ` +${item.tags.length - 3} more` : ''}
              </span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderPagination() {
    const { currentPage, totalResults } = this.state;
    const totalPages = Math.ceil(totalResults / this.options.itemsPerPage);
    
    if (totalPages <= 1) {
      return '';
    }

    const startItem = (currentPage - 1) * this.options.itemsPerPage + 1;
    const endItem = Math.min(currentPage * this.options.itemsPerPage, totalResults);

    return `
      <div class="search-pagination">
        <div class="pagination-info">
          Showing ${startItem.toLocaleString()}-${endItem.toLocaleString()} of ${totalResults.toLocaleString()} results
        </div>
        <div class="pagination-controls">
          <button 
            class="pagination-btn" 
            data-page="${currentPage - 1}"
            ${currentPage <= 1 ? 'disabled' : ''}
          >
            ← Previous
          </button>
          
          ${this.renderPageNumbers(currentPage, totalPages)}
          
          <button 
            class="pagination-btn" 
            data-page="${currentPage + 1}"
            ${currentPage >= totalPages ? 'disabled' : ''}
          >
            Next →
          </button>
        </div>
      </div>
    `;
  }

  renderPageNumbers(currentPage, totalPages) {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(`<button class="pagination-btn" data-page="1">1</button>`);
      if (start > 2) {
        pages.push(`<span class="pagination-ellipsis">...</span>`);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(`
        <button 
          class="pagination-btn ${i === currentPage ? 'active' : ''}" 
          data-page="${i}"
        >
          ${i}
        </button>
      `);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(`<span class="pagination-ellipsis">...</span>`);
      }
      pages.push(`<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`);
    }

    return pages.join('');
  }

  attachEventListeners() {
    // Sort selection
    this.container.addEventListener('change', this.handleSortChange.bind(this));
    
    // Result item clicks
    this.container.addEventListener('click', this.handleItemClick.bind(this));
    
    // Checkbox selection
    this.container.addEventListener('change', this.handleItemSelect.bind(this));
    
    // Pagination
    this.container.addEventListener('click', this.handlePaginationClick.bind(this));
    
    // Keyboard navigation
    this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleSortChange(event) {
    if (event.target.matches('.search-sort-select')) {
      const sortBy = event.target.value;
      this.setState({ sortBy, currentPage: 1 });
      this.performSearch();
    }
  }

  handleItemClick(event) {
    // Handle retry button
    if (event.target.matches('.search-empty button')) {
      this.retry();
      return;
    }

    const itemEl = event.target.closest('.search-result-item');
    if (!itemEl) return;

    // Don't trigger item click if clicking on checkbox
    if (event.target.matches('.search-result-checkbox')) return;

    const itemId = itemEl.dataset.itemId;
    const index = parseInt(itemEl.dataset.index);
    const item = this.state.results[index];

    if (item && this.options.onItemClick) {
      this.options.onItemClick(item, index);
    }

    this.emit('itemClick', { item, index });
  }

  handleItemSelect(event) {
    if (event.target.matches('.search-result-checkbox')) {
      const itemEl = event.target.closest('.search-result-item');
      const itemId = itemEl.dataset.itemId;
      const index = parseInt(itemEl.dataset.index);
      const item = this.state.results[index];
      const isSelected = event.target.checked;

      this.toggleItemSelection(itemId, isSelected);

      if (this.options.onItemSelect) {
        this.options.onItemSelect(item, isSelected, this.getSelectedItems());
      }

      this.emit('itemSelect', { 
        item, 
        selected: isSelected, 
        selectedItems: this.getSelectedItems() 
      });
    }
  }

  handlePaginationClick(event) {
    const pageBtn = event.target.closest('.pagination-btn[data-page]');
    if (!pageBtn || pageBtn.disabled) return;

    const page = parseInt(pageBtn.dataset.page);
    this.goToPage(page);
  }

  handleKeyDown(event) {
    // Handle keyboard navigation for result items
    if (event.target.matches('.search-result-item')) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.handleItemClick(event);
      }
    }
  }

  async performSearch() {
    // This method should be called by the parent search component
    // Implementation depends on the search service
    this.setState({ isLoading: true, error: null });
    
    try {
      // Cancel previous request
      if (this.currentController) {
        this.currentController.abort();
      }

      this.currentController = new AbortController();
      
      const searchParams = {
        query: this.state.query,
        sortBy: this.state.sortBy,
        page: this.state.currentPage,
        limit: this.options.itemsPerPage,
        signal: this.currentController.signal
      };

      // This should be implemented by the parent or passed as option
      if (this.options.onSearch) {
        await this.options.onSearch(searchParams);
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        this.setState({ error, isLoading: false });
      }
    }
  }

  // Public methods
  setResults(results, totalResults = results.length, query = '') {
    this.setState({ 
      results, 
      totalResults, 
      query,
      isLoading: false, 
      error: null 
    });
    
    this.updateHeader();
    this.updateContent();
  }

  setLoading(isLoading) {
    this.setState({ isLoading });
    this.updateContent();
  }

  setError(error) {
    this.setState({ error, isLoading: false });
    this.updateContent();
  }

  goToPage(page) {
    if (page >= 1 && page <= Math.ceil(this.state.totalResults / this.options.itemsPerPage)) {
      this.setState({ currentPage: page });
      this.performSearch();
      
      // Scroll to top of results
      this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  toggleItemSelection(itemId, selected) {
    const { selectedItems } = this.state;
    
    if (selected) {
      selectedItems.add(itemId);
    } else {
      selectedItems.delete(itemId);
    }

    this.setState({ selectedItems });
  }

  selectAllItems() {
    const selectedItems = new Set(this.state.results.map(item => item.id));
    this.setState({ selectedItems });
    this.updateContent();
  }

  clearSelection() {
    this.setState({ selectedItems: new Set() });
    this.updateContent();
  }

  getSelectedItems() {
    return this.state.results.filter(item => this.state.selectedItems.has(item.id));
  }

  retry() {
    this.setState({ error: null });
    this.performSearch();
  }

  updateHeader() {
    if (this.headerContainer) {
      this.headerContainer.innerHTML = this.renderHeader();
    }
  }

  updateContent() {
    if (this.contentContainer) {
      this.contentContainer.innerHTML = this.renderContent();
    }
  }

  // Utility methods
  highlightQuery(text) {
    const { query } = this.state;
    if (!query || !text) return this.escapeHtml(text);

    const escapedQuery = this.escapeRegExp(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    return this.escapeHtml(text).replace(regex, '<span class="search-highlight">$1</span>');
  }

  getTypeIcon(type) {
    const icons = {
      photo: '📷',
      album: '📁',
      video: '🎬',
      document: '📄',
      folder: '📂'
    };
    
    return icons[type] || '📄';
  }

  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  destroy() {
    if (this.currentController) {
      this.currentController.abort();
    }
    
    super.destroy();
  }
}