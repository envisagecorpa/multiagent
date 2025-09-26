import { Component } from '../common/Component.js';

export class Settings extends Component {
  constructor(options = {}) {
    super();
    this.options = {
      sections: options.sections || this.getDefaultSections(),
      onSave: options.onSave || (() => {}),
      onReset: options.onReset || (() => {}),
      onImport: options.onImport || (() => {}),
      onExport: options.onExport || (() => {}),
      ...options
    };

    this.currentSection = 'general';
    this.settings = this.loadSettings();
    this.hasChanges = false;
  }

  getDefaultSections() {
    return [
      {
        id: 'general',
        title: 'General',
        icon: '⚙️',
        description: 'Basic application settings and preferences'
      },
      {
        id: 'appearance',
        title: 'Appearance',
        icon: '🎨',
        description: 'Customize the look and feel of the application'
      },
      {
        id: 'account',
        title: 'Account',
        icon: '👤',
        description: 'Manage your account information and security'
      },
      {
        id: 'privacy',
        title: 'Privacy',
        icon: '🔒',
        description: 'Control your privacy and data settings'
      },
      {
        id: 'advanced',
        title: 'Advanced',
        icon: '🔧',
        description: 'Advanced settings and developer options'
      }
    ];
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('photo-album-settings');
      return saved ? JSON.parse(saved) : this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
      return this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      // General
      language: 'en',
      autoSave: true,
      confirmDelete: true,
      defaultView: 'grid',
      itemsPerPage: 20,
      
      // Appearance
      theme: 'system',
      colorScheme: 'blue',
      fontSize: 'medium',
      animations: true,
      compactMode: false,
      
      // Account
      username: '',
      email: '',
      avatar: '',
      notifications: true,
      
      // Privacy
      analytics: false,
      crashReports: true,
      shareUsageData: false,
      
      // Advanced
      developerMode: false,
      debugMode: false,
      cacheSize: 100,
      preloadImages: 3
    };
  }

  render() {
    const element = this.createElement('div', {
      className: 'settings-container'
    });

    // Header
    const header = this.createHeader();
    element.appendChild(header);

    // Sections container
    const sectionsContainer = this.createElement('div', {
      className: 'settings-sections'
    });

    // Sidebar
    const sidebar = this.createSidebar();
    sectionsContainer.appendChild(sidebar);

    // Content
    const content = this.createContent();
    sectionsContainer.appendChild(content);

    element.appendChild(sectionsContainer);

    this.element = element;
    return element;
  }

  createHeader() {
    const header = this.createElement('div', {
      className: 'settings-header'
    });

    const title = this.createElement('h1', {
      className: 'settings-title',
      textContent: 'Settings'
    });

    const description = this.createElement('p', {
      className: 'settings-description',
      textContent: 'Customize your photo album experience'
    });

    header.appendChild(title);
    header.appendChild(description);

    return header;
  }

  createSidebar() {
    const sidebar = this.createElement('div', {
      className: 'settings-sidebar'
    });

    const nav = this.createElement('ul', {
      className: 'settings-nav'
    });

    this.options.sections.forEach(section => {
      const item = this.createElement('li', {
        className: 'settings-nav-item'
      });

      const link = this.createElement('a', {
        className: `settings-nav-link ${section.id === this.currentSection ? 'active' : ''}`,
        href: '#',
        'data-section': section.id
      });

      const icon = this.createElement('span', {
        className: 'settings-nav-icon',
        textContent: section.icon
      });

      const text = this.createElement('span', {
        textContent: section.title
      });

      link.appendChild(icon);
      link.appendChild(text);

      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchSection(section.id);
      });

      item.appendChild(link);
      nav.appendChild(item);
    });

    sidebar.appendChild(nav);
    return sidebar;
  }

  createContent() {
    const content = this.createElement('div', {
      className: 'settings-content'
    });

    this.options.sections.forEach(section => {
      const sectionElement = this.createSection(section);
      content.appendChild(sectionElement);
    });

    return content;
  }

  createSection(section) {
    const sectionElement = this.createElement('div', {
      className: `settings-section ${section.id === this.currentSection ? 'active' : ''}`,
      'data-section': section.id
    });

    const title = this.createElement('h2', {
      className: 'settings-section-title',
      textContent: section.title
    });

    const description = this.createElement('p', {
      className: 'settings-section-description',
      textContent: section.description
    });

    sectionElement.appendChild(title);
    sectionElement.appendChild(description);

    // Add section-specific content
    const sectionContent = this.createSectionContent(section.id);
    sectionElement.appendChild(sectionContent);

    // Add actions
    const actions = this.createSectionActions(section.id);
    sectionElement.appendChild(actions);

    return sectionElement;
  }

  createSectionContent(sectionId) {
    const container = this.createElement('div', {
      className: 'settings-section-content'
    });

    switch (sectionId) {
      case 'general':
        container.appendChild(this.createGeneralSettings());
        break;
      case 'appearance':
        container.appendChild(this.createAppearanceSettings());
        break;
      case 'account':
        container.appendChild(this.createAccountSettings());
        break;
      case 'privacy':
        container.appendChild(this.createPrivacySettings());
        break;
      case 'advanced':
        container.appendChild(this.createAdvancedSettings());
        break;
      default:
        container.innerHTML = '<p>Section content not implemented</p>';
    }

    return container;
  }

  createGeneralSettings() {
    const group = this.createElement('div', {
      className: 'settings-group'
    });

    group.appendChild(this.createSettingsItem(
      'Language',
      'Choose your preferred language',
      this.createSelect('language', [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Español' },
        { value: 'fr', label: 'Français' },
        { value: 'de', label: 'Deutsch' }
      ])
    ));

    group.appendChild(this.createSettingsItem(
      'Default View',
      'Default layout for viewing photos',
      this.createSelect('defaultView', [
        { value: 'grid', label: 'Grid' },
        { value: 'list', label: 'List' },
        { value: 'masonry', label: 'Masonry' }
      ])
    ));

    group.appendChild(this.createSettingsItem(
      'Items per Page',
      'Number of items to show per page',
      this.createRange('itemsPerPage', 10, 100, 10)
    ));

    group.appendChild(this.createSettingsItem(
      'Auto Save',
      'Automatically save changes as you make them',
      this.createToggle('autoSave')
    ));

    group.appendChild(this.createSettingsItem(
      'Confirm Delete',
      'Show confirmation dialog before deleting items',
      this.createToggle('confirmDelete')
    ));

    return group;
  }

  createAppearanceSettings() {
    const container = this.createElement('div');

    // Theme Selection
    const themeGroup = this.createElement('div', {
      className: 'settings-group'
    });

    const themeTitle = this.createElement('h3', {
      className: 'settings-group-title',
      textContent: 'Theme'
    });

    const themeDescription = this.createElement('p', {
      className: 'settings-group-description',
      textContent: 'Choose how the application looks'
    });

    themeGroup.appendChild(themeTitle);
    themeGroup.appendChild(themeDescription);

    const themePreview = this.createThemePreview();
    themeGroup.appendChild(themePreview);

    container.appendChild(themeGroup);

    // Other appearance settings
    const otherGroup = this.createElement('div', {
      className: 'settings-group'
    });

    otherGroup.appendChild(this.createSettingsItem(
      'Font Size',
      'Adjust the text size throughout the application',
      this.createSelect('fontSize', [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' }
      ])
    ));

    otherGroup.appendChild(this.createSettingsItem(
      'Animations',
      'Enable smooth transitions and animations',
      this.createToggle('animations')
    ));

    otherGroup.appendChild(this.createSettingsItem(
      'Compact Mode',
      'Use a more compact layout to show more content',
      this.createToggle('compactMode')
    ));

    container.appendChild(otherGroup);

    return container;
  }

  createAccountSettings() {
    const container = this.createElement('div');

    // Avatar section
    const avatarSection = this.createElement('div', {
      className: 'settings-avatar'
    });

    const avatarImage = this.createElement('div', {
      className: 'settings-avatar-image',
      textContent: this.settings.avatar || '👤'
    });

    const avatarActions = this.createElement('div', {
      className: 'settings-avatar-actions'
    });

    const uploadBtn = this.createElement('button', {
      className: 'settings-btn settings-btn-secondary',
      textContent: 'Upload Photo'
    });

    const removeBtn = this.createElement('button', {
      className: 'settings-btn settings-btn-secondary',
      textContent: 'Remove'
    });

    avatarActions.appendChild(uploadBtn);
    avatarActions.appendChild(removeBtn);

    avatarSection.appendChild(avatarImage);
    avatarSection.appendChild(avatarActions);

    container.appendChild(avatarSection);

    // Account info
    const infoGroup = this.createElement('div', {
      className: 'settings-group'
    });

    infoGroup.appendChild(this.createSettingsItem(
      'Username',
      'Your display name',
      this.createInput('username', 'text', 'Enter username')
    ));

    infoGroup.appendChild(this.createSettingsItem(
      'Email',
      'Your email address',
      this.createInput('email', 'email', 'Enter email')
    ));

    infoGroup.appendChild(this.createSettingsItem(
      'Notifications',
      'Receive email notifications about updates',
      this.createToggle('notifications')
    ));

    container.appendChild(infoGroup);

    return container;
  }

  createPrivacySettings() {
    const group = this.createElement('div', {
      className: 'settings-group'
    });

    group.appendChild(this.createSettingsItem(
      'Analytics',
      'Help improve the app by sharing anonymous usage data',
      this.createToggle('analytics')
    ));

    group.appendChild(this.createSettingsItem(
      'Crash Reports',
      'Automatically send crash reports to help fix bugs',
      this.createToggle('crashReports')
    ));

    group.appendChild(this.createSettingsItem(
      'Share Usage Data',
      'Share anonymous usage statistics',
      this.createToggle('shareUsageData')
    ));

    return group;
  }

  createAdvancedSettings() {
    const container = this.createElement('div');

    // Developer options
    const devGroup = this.createElement('div', {
      className: 'settings-group'
    });

    const devTitle = this.createElement('h3', {
      className: 'settings-group-title',
      textContent: 'Developer Options'
    });

    const devDescription = this.createElement('p', {
      className: 'settings-group-description',
      textContent: 'Advanced settings for developers and power users'
    });

    devGroup.appendChild(devTitle);
    devGroup.appendChild(devDescription);

    devGroup.appendChild(this.createSettingsItem(
      'Developer Mode',
      'Enable additional debugging features',
      this.createToggle('developerMode')
    ));

    devGroup.appendChild(this.createSettingsItem(
      'Debug Mode',
      'Show detailed error messages and logs',
      this.createToggle('debugMode')
    ));

    container.appendChild(devGroup);

    // Performance options
    const perfGroup = this.createElement('div', {
      className: 'settings-group'
    });

    const perfTitle = this.createElement('h3', {
      className: 'settings-group-title',
      textContent: 'Performance'
    });

    perfGroup.appendChild(perfTitle);

    perfGroup.appendChild(this.createSettingsItem(
      'Cache Size (MB)',
      'Amount of storage used for caching images',
      this.createRange('cacheSize', 50, 500, 50)
    ));

    perfGroup.appendChild(this.createSettingsItem(
      'Preload Images',
      'Number of images to preload ahead',
      this.createRange('preloadImages', 1, 10, 1)
    ));

    container.appendChild(perfGroup);

    // Import/Export
    const dataGroup = this.createElement('div', {
      className: 'settings-group'
    });

    const dataTitle = this.createElement('h3', {
      className: 'settings-group-title',
      textContent: 'Data Management'
    });

    dataGroup.appendChild(dataTitle);

    const importExportActions = this.createElement('div', {
      className: 'settings-actions'
    });

    const exportBtn = this.createElement('button', {
      className: 'settings-btn settings-btn-secondary',
      textContent: 'Export Settings'
    });

    const importInput = this.createElement('input', {
      type: 'file',
      className: 'settings-file-input',
      id: 'import-settings',
      accept: '.json'
    });

    const importLabel = this.createElement('label', {
      className: 'settings-file-label',
      textContent: 'Import Settings',
      htmlFor: 'import-settings'
    });

    const resetBtn = this.createElement('button', {
      className: 'settings-btn settings-btn-danger',
      textContent: 'Reset All Settings'
    });

    exportBtn.addEventListener('click', () => this.exportSettings());
    importInput.addEventListener('change', (e) => this.importSettings(e));
    resetBtn.addEventListener('click', () => this.resetSettings());

    importExportActions.appendChild(exportBtn);
    importExportActions.appendChild(importInput);
    importExportActions.appendChild(importLabel);
    importExportActions.appendChild(resetBtn);

    dataGroup.appendChild(importExportActions);
    container.appendChild(dataGroup);

    return container;
  }

  createSettingsItem(label, description, control) {
    const item = this.createElement('div', {
      className: 'settings-item'
    });

    const info = this.createElement('div', {
      className: 'settings-item-info'
    });

    const labelEl = this.createElement('div', {
      className: 'settings-item-label',
      textContent: label
    });

    const descEl = this.createElement('div', {
      className: 'settings-item-description',
      textContent: description
    });

    info.appendChild(labelEl);
    info.appendChild(descEl);

    const controlContainer = this.createElement('div', {
      className: 'settings-item-control'
    });
    controlContainer.appendChild(control);

    item.appendChild(info);
    item.appendChild(controlContainer);

    return item;
  }

  createInput(key, type = 'text', placeholder = '') {
    const input = this.createElement('input', {
      type: type,
      className: 'settings-input',
      placeholder: placeholder,
      value: this.settings[key] || ''
    });

    input.addEventListener('input', (e) => {
      this.updateSetting(key, e.target.value);
    });

    return input;
  }

  createSelect(key, options) {
    const select = this.createElement('select', {
      className: 'settings-select'
    });

    options.forEach(option => {
      const optionEl = this.createElement('option', {
        value: option.value,
        textContent: option.label,
        selected: this.settings[key] === option.value
      });
      select.appendChild(optionEl);
    });

    select.addEventListener('change', (e) => {
      this.updateSetting(key, e.target.value);
    });

    return select;
  }

  createToggle(key) {
    const toggle = this.createElement('div', {
      className: `settings-toggle ${this.settings[key] ? 'active' : ''}`,
      'data-key': key
    });

    toggle.addEventListener('click', () => {
      const newValue = !this.settings[key];
      this.updateSetting(key, newValue);
      toggle.classList.toggle('active', newValue);
    });

    return toggle;
  }

  createRange(key, min, max, step) {
    const container = this.createElement('div', {
      className: 'settings-range-container'
    });

    const range = this.createElement('input', {
      type: 'range',
      className: 'settings-range',
      min: min,
      max: max,
      step: step,
      value: this.settings[key] || min
    });

    const value = this.createElement('span', {
      className: 'settings-range-value',
      textContent: this.settings[key] || min
    });

    range.addEventListener('input', (e) => {
      const newValue = parseInt(e.target.value);
      this.updateSetting(key, newValue);
      value.textContent = newValue;
    });

    container.appendChild(range);
    container.appendChild(value);

    return container;
  }

  createThemePreview() {
    const preview = this.createElement('div', {
      className: 'settings-theme-preview'
    });

    const themes = [
      { id: 'light', name: 'Light', colors: ['#ffffff', '#f8fafc', '#3b82f6'] },
      { id: 'dark', name: 'Dark', colors: ['#1f2937', '#374151', '#3b82f6'] },
      { id: 'system', name: 'System', colors: ['#6b7280', '#9ca3af', '#3b82f6'] }
    ];

    themes.forEach(theme => {
      const card = this.createElement('div', {
        className: `settings-theme-card ${this.settings.theme === theme.id ? 'active' : ''}`,
        'data-theme': theme.id
      });

      const name = this.createElement('div', {
        className: 'settings-theme-name',
        textContent: theme.name
      });

      const colors = this.createElement('div', {
        className: 'settings-theme-colors'
      });

      theme.colors.forEach(color => {
        const colorEl = this.createElement('div', {
          className: 'settings-theme-color',
          style: `background-color: ${color}`
        });
        colors.appendChild(colorEl);
      });

      card.appendChild(name);
      card.appendChild(colors);

      card.addEventListener('click', () => {
        this.updateSetting('theme', theme.id);
        
        // Update active state
        preview.querySelectorAll('.settings-theme-card').forEach(c => {
          c.classList.remove('active');
        });
        card.classList.add('active');
      });

      preview.appendChild(card);
    });

    return preview;
  }

  createSectionActions(sectionId) {
    const actions = this.createElement('div', {
      className: 'settings-actions'
    });

    const saveBtn = this.createElement('button', {
      className: 'settings-btn settings-btn-primary',
      textContent: 'Save Changes'
    });

    const cancelBtn = this.createElement('button', {
      className: 'settings-btn settings-btn-secondary',
      textContent: 'Cancel'
    });

    saveBtn.addEventListener('click', () => this.saveSettings());
    cancelBtn.addEventListener('click', () => this.cancelChanges());

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);

    return actions;
  }

  switchSection(sectionId) {
    this.currentSection = sectionId;

    // Update navigation
    this.element.querySelectorAll('.settings-nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === sectionId);
    });

    // Update content
    this.element.querySelectorAll('.settings-section').forEach(section => {
      section.classList.toggle('active', section.dataset.section === sectionId);
    });
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this.hasChanges = true;
    this.emit('setting-change', { key, value, settings: this.settings });
  }

  saveSettings() {
    try {
      localStorage.setItem('photo-album-settings', JSON.stringify(this.settings));
      this.hasChanges = false;
      this.options.onSave(this.settings);
      this.showNotification('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('Failed to save settings', 'error');
    }
  }

  cancelChanges() {
    this.settings = this.loadSettings();
    this.hasChanges = false;
    this.refreshUI();
    this.showNotification('Changes cancelled', 'info');
  }

  resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default? This cannot be undone.')) {
      this.settings = this.getDefaultSettings();
      this.saveSettings();
      this.refreshUI();
      this.options.onReset(this.settings);
      this.showNotification('Settings reset to default', 'success');
    }
  }

  exportSettings() {
    try {
      const dataStr = JSON.stringify(this.settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'photo-album-settings.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      this.showNotification('Settings exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export settings:', error);
      this.showNotification('Failed to export settings', 'error');
    }
  }

  importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target.result);
        this.settings = { ...this.getDefaultSettings(), ...importedSettings };
        this.saveSettings();
        this.refreshUI();
        this.options.onImport(this.settings);
        this.showNotification('Settings imported successfully', 'success');
      } catch (error) {
        console.error('Failed to import settings:', error);
        this.showNotification('Failed to import settings. Invalid file format.', 'error');
      }
    };
    reader.readAsText(file);
  }

  refreshUI() {
    // Re-render the entire component
    if (this.element && this.element.parentNode) {
      const parent = this.element.parentNode;
      const newElement = this.render();
      parent.replaceChild(newElement, this.element);
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = this.createElement('div', {
      className: `settings-notification ${type}`,
      textContent: message
    });

    // Add to container
    this.element.insertBefore(notification, this.element.firstChild);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  getSettings() {
    return { ...this.settings };
  }

  getSetting(key) {
    return this.settings[key];
  }

  setSetting(key, value) {
    this.updateSetting(key, value);
  }

  hasUnsavedChanges() {
    return this.hasChanges;
  }
}