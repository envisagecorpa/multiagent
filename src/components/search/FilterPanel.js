import { Component } from '../common/Component.js';

export default class FilterPanel extends Component {
  constructor(container, options = {}) {
    super(container);
    
    this.options = {
      filters: {
        type: {
          title: 'Content Type',
          type: 'checkbox',
          options: [
            { value: 'photos', label: 'Photos', count: 0 },
            { value: 'albums', label: 'Albums', count: 0 },
            { value: 'videos', label: 'Videos', count: 0 }
          ]
        },
        dateRange: {
          title: 'Date Range',
          type: 'date-range',
          collapsed: false
        },
        fileSize: {
          title: 'File Size',
          type: 'range',
          min: 0,
          max: 100,
          unit: 'MB',
          collapsed: true
        },
        tags: {
          title: 'Tags',
          type: 'tags',
          collapsed: false
        },
        location: {
          title: 'Location',
          type: 'checkbox',
          collapsed: true,
          options: []
        },
        rating: {
          title: 'Rating',
          type: 'range',
          min: 1,
          max: 5,
          step: 1,
          collapsed: true
        }
      },
      collapsible: true,
      onFilterChange: null,
      ...options
    };

    this.state = {
      activeFilters: {},
      collapsedSections: new Set(),
      availableTags: [],
      availableLocations: []
    };

    this.init();
  }

  init() {
    this.loadFilterData();
    this.render();
    this.attachEventListeners();
    
    // Initialize with default filters if provided
    if (this.options.defaultFilters) {
      this.setState({ activeFilters: { ...this.options.defaultFilters } });
      this.updateFilterUI();
    }
  }

  async loadFilterData() {
    try {
      // Load available tags and locations for filter options
      const [tags, locations] = await Promise.all([
        this.loadAvailableTags(),
        this.loadAvailableLocations()
      ]);

      this.setState({ 
        availableTags: tags,
        availableLocations: locations
      });

      // Update location filter options
      if (this.options.filters.location) {
        this.options.filters.location.options = locations.map(location => ({
          value: location.id,
          label: location.name,
          count: location.count
        }));
      }

      this.updateFilterSection('tags');
      this.updateFilterSection('location');
    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  }

  async loadAvailableTags() {
    // Mock data - replace with actual API call
    return [
      { id: '1', name: 'vacation', count: 15 },
      { id: '2', name: 'family', count: 32 },
      { id: '3', name: 'nature', count: 28 },
      { id: '4', name: 'portrait', count: 19 },
      { id: '5', name: 'landscape', count: 24 },
      { id: '6', name: 'food', count: 12 },
      { id: '7', name: 'travel', count: 18 },
      { id: '8', name: 'wedding', count: 8 }
    ];
  }

  async loadAvailableLocations() {
    // Mock data - replace with actual API call
    return [
      { id: '1', name: 'New York', count: 45 },
      { id: '2', name: 'Los Angeles', count: 32 },
      { id: '3', name: 'Paris', count: 18 },
      { id: '4', name: 'Tokyo', count: 12 },
      { id: '5', name: 'London', count: 28 }
    ];
  }

  render() {
    const filtersHTML = Object.entries(this.options.filters).map(([key, filter]) => 
      this.renderFilterSection(key, filter)
    ).join('');

    this.container.innerHTML = `
      <div class="search-sidebar">
        <h3 class="filter-title">Filters</h3>
        ${filtersHTML}
        <div class="filter-actions">
          <button class="filter-btn filter-btn-primary" data-action="apply">
            Apply Filters
          </button>
          <button class="filter-btn filter-btn-secondary" data-action="clear">
            Clear All
          </button>
        </div>
      </div>
    `;
  }

  renderFilterSection(key, filter) {
    const isCollapsed = this.state.collapsedSections.has(key);
    const toggleButton = this.options.collapsible ? `
      <button class="filter-toggle" data-section="${key}" aria-expanded="${!isCollapsed}">
        ${isCollapsed ? '▶' : '▼'}
      </button>
    ` : '';

    return `
      <div class="filter-section" data-section="${key}">
        <div class="filter-title">
          ${filter.title}
          ${toggleButton}
        </div>
        <div class="filter-content ${isCollapsed ? 'collapsed' : ''}" data-content="${key}">
          ${this.renderFilterContent(key, filter)}
        </div>
      </div>
    `;
  }

  renderFilterContent(key, filter) {
    switch (filter.type) {
      case 'checkbox':
        return this.renderCheckboxFilters(key, filter);
      case 'date-range':
        return this.renderDateRangeFilter(key, filter);
      case 'range':
        return this.renderRangeFilter(key, filter);
      case 'tags':
        return this.renderTagsFilter(key, filter);
      default:
        return '';
    }
  }

  renderCheckboxFilters(key, filter) {
    return filter.options.map(option => `
      <div class="filter-item">
        <label class="filter-checkbox">
          <input 
            type="checkbox" 
            name="${key}" 
            value="${option.value}"
            ${this.isFilterActive(key, option.value) ? 'checked' : ''}
          >
          <span class="filter-checkbox-label">${option.label}</span>
          <span class="filter-checkbox-count">(${option.count})</span>
        </label>
      </div>
    `).join('');
  }

  renderDateRangeFilter(key, filter) {
    const activeFilter = this.state.activeFilters[key] || {};
    
    return `
      <div class="filter-range">
        <div class="filter-range-inputs">
          <input 
            type="date" 
            class="filter-date-picker" 
            name="${key}-start"
            value="${activeFilter.start || ''}"
            placeholder="Start date"
          >
          <span class="filter-range-separator">to</span>
          <input 
            type="date" 
            class="filter-date-picker" 
            name="${key}-end"
            value="${activeFilter.end || ''}"
            placeholder="End date"
          >
        </div>
      </div>
    `;
  }

  renderRangeFilter(key, filter) {
    const activeFilter = this.state.activeFilters[key] || {};
    const min = activeFilter.min !== undefined ? activeFilter.min : filter.min;
    const max = activeFilter.max !== undefined ? activeFilter.max : filter.max;
    
    return `
      <div class="filter-range">
        <div class="filter-range-inputs">
          <input 
            type="number" 
            class="filter-range-input" 
            name="${key}-min"
            value="${min}"
            min="${filter.min}"
            max="${filter.max}"
            step="${filter.step || 1}"
            placeholder="Min ${filter.unit || ''}"
          >
          <span class="filter-range-separator">to</span>
          <input 
            type="number" 
            class="filter-range-input" 
            name="${key}-max"
            value="${max}"
            min="${filter.min}"
            max="${filter.max}"
            step="${filter.step || 1}"
            placeholder="Max ${filter.unit || ''}"
          >
        </div>
      </div>
    `;
  }

  renderTagsFilter(key, filter) {
    const { availableTags } = this.state;
    const activeTags = this.state.activeFilters[key] || [];

    return `
      <div class="filter-tags">
        ${availableTags.map(tag => `
          <span 
            class="filter-tag ${activeTags.includes(tag.id) ? 'active' : ''}" 
            data-tag="${tag.id}"
            role="button"
            tabindex="0"
          >
            ${tag.name} (${tag.count})
          </span>
        `).join('')}
      </div>
    `;
  }

  attachEventListeners() {
    // Filter toggle buttons
    this.container.addEventListener('click', this.handleToggleClick.bind(this));
    
    // Filter inputs
    this.container.addEventListener('change', this.handleFilterChange.bind(this));
    this.container.addEventListener('input', this.handleFilterInput.bind(this));
    
    // Tag filters
    this.container.addEventListener('click', this.handleTagClick.bind(this));
    this.container.addEventListener('keydown', this.handleTagKeydown.bind(this));
    
    // Action buttons
    this.container.addEventListener('click', this.handleActionClick.bind(this));
  }

  handleToggleClick(event) {
    const toggleBtn = event.target.closest('.filter-toggle');
    if (!toggleBtn) return;

    const section = toggleBtn.dataset.section;
    const { collapsedSections } = this.state;
    
    if (collapsedSections.has(section)) {
      collapsedSections.delete(section);
    } else {
      collapsedSections.add(section);
    }

    this.setState({ collapsedSections });
    this.updateSectionCollapse(section);
  }

  handleFilterChange(event) {
    const { name, type, value, checked } = event.target;
    
    if (type === 'checkbox') {
      this.updateCheckboxFilter(name, value, checked);
    } else if (type === 'date') {
      this.updateDateFilter(name, value);
    } else if (type === 'number') {
      this.updateRangeFilter(name, parseFloat(value) || 0);
    }
  }

  handleFilterInput(event) {
    // Handle real-time updates for range inputs
    if (event.target.type === 'number') {
      clearTimeout(this.inputTimeout);
      this.inputTimeout = setTimeout(() => {
        this.handleFilterChange(event);
      }, 300);
    }
  }

  handleTagClick(event) {
    const tagEl = event.target.closest('.filter-tag');
    if (!tagEl) return;

    const tagId = tagEl.dataset.tag;
    this.toggleTag(tagId);
  }

  handleTagKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleTagClick(event);
    }
  }

  handleActionClick(event) {
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    
    switch (action) {
      case 'apply':
        this.applyFilters();
        break;
      case 'clear':
        this.clearAllFilters();
        break;
    }
  }

  updateCheckboxFilter(name, value, checked) {
    const { activeFilters } = this.state;
    
    if (!activeFilters[name]) {
      activeFilters[name] = [];
    }

    if (checked) {
      if (!activeFilters[name].includes(value)) {
        activeFilters[name].push(value);
      }
    } else {
      activeFilters[name] = activeFilters[name].filter(v => v !== value);
      if (activeFilters[name].length === 0) {
        delete activeFilters[name];
      }
    }

    this.setState({ activeFilters });
    this.notifyFilterChange();
  }

  updateDateFilter(name, value) {
    const { activeFilters } = this.state;
    const [filterName, range] = name.split('-');
    
    if (!activeFilters[filterName]) {
      activeFilters[filterName] = {};
    }

    activeFilters[filterName][range] = value;

    // Remove empty date ranges
    if (!activeFilters[filterName].start && !activeFilters[filterName].end) {
      delete activeFilters[filterName];
    }

    this.setState({ activeFilters });
    this.notifyFilterChange();
  }

  updateRangeFilter(name, value) {
    const { activeFilters } = this.state;
    const [filterName, range] = name.split('-');
    
    if (!activeFilters[filterName]) {
      activeFilters[filterName] = {};
    }

    activeFilters[filterName][range] = value;

    this.setState({ activeFilters });
    this.notifyFilterChange();
  }

  toggleTag(tagId) {
    const { activeFilters } = this.state;
    const tagFilters = activeFilters.tags || [];
    
    if (tagFilters.includes(tagId)) {
      activeFilters.tags = tagFilters.filter(id => id !== tagId);
      if (activeFilters.tags.length === 0) {
        delete activeFilters.tags;
      }
    } else {
      activeFilters.tags = [...tagFilters, tagId];
    }

    this.setState({ activeFilters });
    this.updateFilterSection('tags');
    this.notifyFilterChange();
  }

  updateSectionCollapse(section) {
    const contentEl = this.container.querySelector(`[data-content="${section}"]`);
    const toggleBtn = this.container.querySelector(`[data-section="${section}"] .filter-toggle`);
    
    if (contentEl && toggleBtn) {
      const isCollapsed = this.state.collapsedSections.has(section);
      contentEl.classList.toggle('collapsed', isCollapsed);
      toggleBtn.setAttribute('aria-expanded', (!isCollapsed).toString());
      toggleBtn.textContent = isCollapsed ? '▶' : '▼';
    }
  }

  updateFilterSection(section) {
    const contentEl = this.container.querySelector(`[data-content="${section}"]`);
    if (!contentEl) return;

    const filter = this.options.filters[section];
    if (filter) {
      contentEl.innerHTML = this.renderFilterContent(section, filter);
    }
  }

  updateFilterUI() {
    // Update all checkboxes
    Object.entries(this.state.activeFilters).forEach(([filterName, filterValue]) => {
      if (Array.isArray(filterValue)) {
        // Checkbox filters
        filterValue.forEach(value => {
          const checkbox = this.container.querySelector(`input[name="${filterName}"][value="${value}"]`);
          if (checkbox) checkbox.checked = true;
        });
      } else if (typeof filterValue === 'object') {
        // Range/date filters
        Object.entries(filterValue).forEach(([range, value]) => {
          const input = this.container.querySelector(`input[name="${filterName}-${range}"]`);
          if (input) input.value = value;
        });
      }
    });

    // Update tags
    this.updateFilterSection('tags');
  }

  applyFilters() {
    this.notifyFilterChange();
    this.emit('apply', { filters: this.getActiveFilters() });
  }

  clearAllFilters() {
    this.setState({ activeFilters: {} });
    
    // Clear all form inputs
    const inputs = this.container.querySelectorAll('input');
    inputs.forEach(input => {
      if (input.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });

    // Update tags UI
    this.updateFilterSection('tags');
    
    this.notifyFilterChange();
    this.emit('clear');
  }

  notifyFilterChange() {
    const filters = this.getActiveFilters();
    
    if (this.options.onFilterChange) {
      this.options.onFilterChange(filters);
    }
    
    this.emit('filterChange', { filters });
  }

  // Public methods
  getActiveFilters() {
    return { ...this.state.activeFilters };
  }

  setFilters(filters) {
    this.setState({ activeFilters: { ...filters } });
    this.updateFilterUI();
  }

  hasActiveFilters() {
    return Object.keys(this.state.activeFilters).length > 0;
  }

  getFilterCount() {
    let count = 0;
    Object.values(this.state.activeFilters).forEach(value => {
      if (Array.isArray(value)) {
        count += value.length;
      } else if (typeof value === 'object') {
        count += Object.keys(value).length;
      } else {
        count += 1;
      }
    });
    return count;
  }

  isFilterActive(filterName, value) {
    const filter = this.state.activeFilters[filterName];
    return filter && Array.isArray(filter) && filter.includes(value);
  }

  destroy() {
    if (this.inputTimeout) {
      clearTimeout(this.inputTimeout);
    }
    
    super.destroy();
  }
}