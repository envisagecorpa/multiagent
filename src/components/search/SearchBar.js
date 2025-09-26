import { Component } from '../common/Component.js';

export default class SearchBar extends Component {
  constructor(container, options = {}) {
    super(container);
    
    this.options = {
      placeholder: 'Search photos, albums, and tags...',
      showSuggestions: true,
      debounceMs: 300,
      minSearchLength: 2,
      maxSuggestions: 8,
      onSearch: null,
      onSuggestionSelect: null,
      ...options
    };

    this.state = {
      query: '',
      suggestions: [],
      showSuggestions: false,
      highlightedIndex: -1,
      isLoading: false
    };

    this.searchTimeout = null;
    this.suggestionCache = new Map();
    this.currentController = null;

    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    
    // Focus search input if specified
    if (this.options.autoFocus) {
      this.focusInput();
    }

    // Initialize with query if provided
    if (this.options.initialQuery) {
      this.setState({ query: this.options.initialQuery });
      this.updateInputValue();
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="search-bar">
        <input 
          type="text" 
          class="search-input"
          placeholder="${this.options.placeholder}"
          autocomplete="off"
          spellcheck="false"
          aria-label="Search"
          aria-expanded="false"
          aria-haspopup="listbox"
          role="combobox"
        >
        <button class="search-button" type="button" aria-label="Search">
          <span class="search-icon">🔍</span>
        </button>
        <div class="search-suggestions" role="listbox" aria-label="Search suggestions" hidden></div>
      </div>
    `;

    this.searchInput = this.container.querySelector('.search-input');
    this.searchButton = this.container.querySelector('.search-button');
    this.suggestionsContainer = this.container.querySelector('.search-suggestions');
  }

  attachEventListeners() {
    // Input events
    this.searchInput.addEventListener('input', this.handleInput.bind(this));
    this.searchInput.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.searchInput.addEventListener('focus', this.handleFocus.bind(this));
    this.searchInput.addEventListener('blur', this.handleBlur.bind(this));

    // Search button
    this.searchButton.addEventListener('click', this.handleSearch.bind(this));

    // Suggestions container
    this.suggestionsContainer.addEventListener('mousedown', this.handleSuggestionClick.bind(this));
    this.suggestionsContainer.addEventListener('mouseover', this.handleSuggestionHover.bind(this));

    // Global click to close suggestions
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  handleInput(event) {
    const query = event.target.value.trim();
    this.setState({ query });

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search
    this.searchTimeout = setTimeout(() => {
      this.performSearch(query);
    }, this.options.debounceMs);

    // Show/hide suggestions based on query length
    if (query.length >= this.options.minSearchLength && this.options.showSuggestions) {
      this.loadSuggestions(query);
    } else {
      this.hideSuggestions();
    }
  }

  handleKeyDown(event) {
    const { showSuggestions, suggestions, highlightedIndex } = this.state;

    if (!showSuggestions || suggestions.length === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.handleSearch();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightPrevious();
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0) {
          this.selectSuggestion(suggestions[highlightedIndex]);
        } else {
          this.handleSearch();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.hideSuggestions();
        this.searchInput.blur();
        break;
      case 'Tab':
        if (highlightedIndex >= 0) {
          event.preventDefault();
          this.selectSuggestion(suggestions[highlightedIndex]);
        }
        break;
    }
  }

  handleFocus() {
    const { query } = this.state;
    
    if (query.length >= this.options.minSearchLength && this.options.showSuggestions) {
      this.loadSuggestions(query);
    }
  }

  handleBlur() {
    // Delay hiding suggestions to allow for suggestion clicks
    setTimeout(() => {
      this.hideSuggestions();
    }, 150);
  }

  handleSearch() {
    const { query } = this.state;
    
    if (query.trim()) {
      this.hideSuggestions();
      
      if (this.options.onSearch) {
        this.options.onSearch(query.trim());
      }
      
      this.emit('search', { query: query.trim() });
    }
  }

  handleSuggestionClick(event) {
    const suggestionEl = event.target.closest('.search-suggestion');
    if (!suggestionEl) return;

    const index = parseInt(suggestionEl.dataset.index);
    const suggestion = this.state.suggestions[index];
    
    if (suggestion) {
      this.selectSuggestion(suggestion);
    }
  }

  handleSuggestionHover(event) {
    const suggestionEl = event.target.closest('.search-suggestion');
    if (!suggestionEl) return;

    const index = parseInt(suggestionEl.dataset.index);
    this.setState({ highlightedIndex: index });
    this.updateSuggestionHighlight();
  }

  handleDocumentClick(event) {
    if (!this.container.contains(event.target)) {
      this.hideSuggestions();
    }
  }

  async loadSuggestions(query) {
    if (!query || query.length < this.options.minSearchLength) {
      this.hideSuggestions();
      return;
    }

    // Check cache first
    const cacheKey = query.toLowerCase();
    if (this.suggestionCache.has(cacheKey)) {
      const cachedSuggestions = this.suggestionCache.get(cacheKey);
      this.setState({ 
        suggestions: cachedSuggestions,
        showSuggestions: true,
        highlightedIndex: -1
      });
      this.renderSuggestions();
      return;
    }

    this.setState({ isLoading: true });

    try {
      // Cancel previous request
      if (this.currentController) {
        this.currentController.abort();
      }

      this.currentController = new AbortController();
      
      const suggestions = await this.fetchSuggestions(query, {
        signal: this.currentController.signal
      });

      // Cache suggestions
      this.suggestionCache.set(cacheKey, suggestions);

      this.setState({
        suggestions,
        showSuggestions: true,
        highlightedIndex: -1,
        isLoading: false
      });

      this.renderSuggestions();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error loading suggestions:', error);
        this.setState({ 
          suggestions: [],
          showSuggestions: false,
          isLoading: false
        });
      }
    }
  }

  async fetchSuggestions(query, options = {}) {
    // Mock suggestions for now - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 100));

    const mockSuggestions = [
      { id: '1', text: `Photos containing "${query}"`, type: 'photos', icon: '📷' },
      { id: '2', text: `Albums named "${query}"`, type: 'albums', icon: '📁' },
      { id: '3', text: `Tag: ${query}`, type: 'tag', icon: '🏷️' },
      { id: '4', text: `Location: ${query}`, type: 'location', icon: '📍' },
      { id: '5', text: `Date: ${query}`, type: 'date', icon: '📅' }
    ];

    return mockSuggestions.slice(0, this.options.maxSuggestions);
  }

  renderSuggestions() {
    const { suggestions, showSuggestions } = this.state;

    if (!showSuggestions || suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }

    const suggestionsHTML = suggestions.map((suggestion, index) => `
      <div class="search-suggestion" data-index="${index}" role="option" tabindex="-1">
        <span class="search-suggestion-icon">${suggestion.icon}</span>
        <span class="search-suggestion-text">${this.highlightQuery(suggestion.text)}</span>
        <span class="search-suggestion-type">${suggestion.type}</span>
      </div>
    `).join('');

    this.suggestionsContainer.innerHTML = suggestionsHTML;
    this.suggestionsContainer.hidden = false;
    
    // Update ARIA attributes
    this.searchInput.setAttribute('aria-expanded', 'true');
    this.updateSuggestionHighlight();
  }

  hideSuggestions() {
    this.setState({ 
      showSuggestions: false,
      highlightedIndex: -1
    });
    
    this.suggestionsContainer.hidden = true;
    this.searchInput.setAttribute('aria-expanded', 'false');
  }

  highlightNext() {
    const { suggestions, highlightedIndex } = this.state;
    const nextIndex = highlightedIndex < suggestions.length - 1 ? highlightedIndex + 1 : 0;
    
    this.setState({ highlightedIndex: nextIndex });
    this.updateSuggestionHighlight();
  }

  highlightPrevious() {
    const { suggestions, highlightedIndex } = this.state;
    const prevIndex = highlightedIndex > 0 ? highlightedIndex - 1 : suggestions.length - 1;
    
    this.setState({ highlightedIndex: prevIndex });
    this.updateSuggestionHighlight();
  }

  updateSuggestionHighlight() {
    const { highlightedIndex } = this.state;
    const suggestionEls = this.suggestionsContainer.querySelectorAll('.search-suggestion');

    suggestionEls.forEach((el, index) => {
      const isHighlighted = index === highlightedIndex;
      el.classList.toggle('highlighted', isHighlighted);
      el.setAttribute('aria-selected', isHighlighted.toString());

      if (isHighlighted) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  selectSuggestion(suggestion) {
    this.setState({ 
      query: suggestion.text,
      showSuggestions: false,
      highlightedIndex: -1
    });

    this.updateInputValue();
    this.hideSuggestions();

    if (this.options.onSuggestionSelect) {
      this.options.onSuggestionSelect(suggestion);
    }

    this.emit('suggestionSelect', { suggestion });

    // Auto-search if enabled
    if (this.options.autoSearchOnSelect) {
      this.handleSearch();
    }
  }

  highlightQuery(text) {
    const { query } = this.state;
    if (!query) return text;

    const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  updateInputValue() {
    if (this.searchInput.value !== this.state.query) {
      this.searchInput.value = this.state.query;
    }
  }

  performSearch(query) {
    if (query && this.options.onSearch) {
      this.options.onSearch(query);
    }
    
    this.emit('search', { query });
  }

  // Public methods
  focusInput() {
    this.searchInput?.focus();
  }

  clearSearch() {
    this.setState({ 
      query: '',
      suggestions: [],
      showSuggestions: false,
      highlightedIndex: -1
    });
    
    this.updateInputValue();
    this.hideSuggestions();
    this.emit('clear');
  }

  setQuery(query) {
    this.setState({ query });
    this.updateInputValue();
    
    if (query.length >= this.options.minSearchLength && this.options.showSuggestions) {
      this.loadSuggestions(query);
    }
  }

  getQuery() {
    return this.state.query;
  }

  setPlaceholder(placeholder) {
    this.options.placeholder = placeholder;
    if (this.searchInput) {
      this.searchInput.placeholder = placeholder;
    }
  }

  setLoading(isLoading) {
    this.setState({ isLoading });
    
    if (this.searchButton) {
      this.searchButton.disabled = isLoading;
      this.searchButton.querySelector('.search-icon').textContent = isLoading ? '⏳' : '🔍';
    }
  }

  destroy() {
    // Clear timeouts
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Cancel ongoing requests
    if (this.currentController) {
      this.currentController.abort();
    }

    // Clear cache
    this.suggestionCache.clear();

    // Remove global event listeners
    document.removeEventListener('click', this.handleDocumentClick.bind(this));

    super.destroy();
  }
}