export class SettingsManager {
  constructor(options = {}) {
    this.options = {
      storageKey: options.storageKey || 'photo-album-settings',
      autoSave: options.autoSave !== false,
      ...options
    };

    this.settings = this.loadSettings();
    this.listeners = new Map();
    this.themes = this.getAvailableThemes();
    
    // Apply initial settings
    this.applySettings();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(this.options.storageKey);
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

  getAvailableThemes() {
    return {
      light: {
        name: 'Light',
        colors: {
          '--bg-primary': '#ffffff',
          '--bg-secondary': '#f8fafc',
          '--bg-tertiary': '#f1f5f9',
          '--text-primary': '#1f2937',
          '--text-secondary': '#6b7280',
          '--text-tertiary': '#9ca3af',
          '--border-color': '#e5e7eb',
          '--accent-color': '#3b82f6',
          '--accent-color-hover': '#2563eb',
          '--danger-color': '#ef4444',
          '--danger-color-hover': '#dc2626',
          '--warning-color': '#f59e0b',
          '--success-color': '#10b981'
        }
      },
      dark: {
        name: 'Dark',
        colors: {
          '--bg-primary': '#1f2937',
          '--bg-secondary': '#374151',
          '--bg-tertiary': '#4b5563',
          '--text-primary': '#f9fafb',
          '--text-secondary': '#d1d5db',
          '--text-tertiary': '#9ca3af',
          '--border-color': '#4b5563',
          '--accent-color': '#3b82f6',
          '--accent-color-hover': '#2563eb',
          '--danger-color': '#ef4444',
          '--danger-color-hover': '#dc2626',
          '--warning-color': '#f59e0b',
          '--success-color': '#10b981'
        }
      },
      system: {
        name: 'System',
        colors: null // Will use CSS media queries
      }
    };
  }

  get(key, defaultValue = null) {
    return this.settings.hasOwnProperty(key) ? this.settings[key] : defaultValue;
  }

  set(key, value) {
    const oldValue = this.settings[key];
    this.settings[key] = value;

    // Notify listeners
    this.notifyListeners(key, value, oldValue);

    // Auto-save if enabled
    if (this.options.autoSave) {
      this.save();
    }

    // Apply setting if it affects the UI
    this.applySetting(key, value);

    return this;
  }

  setMultiple(settings) {
    const changes = {};
    
    Object.keys(settings).forEach(key => {
      const oldValue = this.settings[key];
      const newValue = settings[key];
      
      if (oldValue !== newValue) {
        this.settings[key] = newValue;
        changes[key] = { oldValue, newValue };
      }
    });

    // Notify listeners for all changes
    Object.keys(changes).forEach(key => {
      const { oldValue, newValue } = changes[key];
      this.notifyListeners(key, newValue, oldValue);
    });

    // Auto-save if enabled
    if (this.options.autoSave) {
      this.save();
    }

    // Apply all settings
    this.applySettings();

    return this;
  }

  save() {
    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  reset() {
    this.settings = this.getDefaultSettings();
    this.save();
    this.applySettings();
    this.notifyListeners('*', this.settings, {});
    return this;
  }

  export() {
    return JSON.stringify(this.settings, null, 2);
  }

  import(settingsJson) {
    try {
      const importedSettings = JSON.parse(settingsJson);
      const validSettings = {};

      // Only import valid settings
      const defaultSettings = this.getDefaultSettings();
      Object.keys(defaultSettings).forEach(key => {
        if (importedSettings.hasOwnProperty(key)) {
          validSettings[key] = importedSettings[key];
        }
      });

      this.setMultiple(validSettings);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  // Event listeners
  on(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
    return this;
  }

  off(key, callback) {
    if (this.listeners.has(key)) {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
    return this;
  }

  notifyListeners(key, newValue, oldValue) {
    // Notify specific key listeners
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => {
        try {
          callback(newValue, oldValue, key);
        } catch (error) {
          console.error('Settings listener error:', error);
        }
      });
    }

    // Notify wildcard listeners
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => {
        try {
          callback(newValue, oldValue, key);
        } catch (error) {
          console.error('Settings listener error:', error);
        }
      });
    }
  }

  // Apply settings to the DOM/UI
  applySettings() {
    this.applyTheme();
    this.applyFontSize();
    this.applyAnimations();
    this.applyCompactMode();
  }

  applySetting(key, value) {
    switch (key) {
      case 'theme':
        this.applyTheme();
        break;
      case 'fontSize':
        this.applyFontSize();
        break;
      case 'animations':
        this.applyAnimations();
        break;
      case 'compactMode':
        this.applyCompactMode();
        break;
    }
  }

  applyTheme() {
    const theme = this.get('theme', 'system');
    const body = document.body;

    // Remove existing theme classes
    body.classList.remove('theme-light', 'theme-dark', 'theme-system');
    
    // Add current theme class
    body.classList.add(`theme-${theme}`);

    // Apply theme colors if not system theme
    if (theme !== 'system' && this.themes[theme]) {
      const themeData = this.themes[theme];
      if (themeData.colors) {
        Object.keys(themeData.colors).forEach(property => {
          document.documentElement.style.setProperty(property, themeData.colors[property]);
        });
      }
    } else if (theme === 'system') {
      // Remove custom properties to let CSS media queries take over
      const themeProperties = Object.keys(this.themes.light.colors);
      themeProperties.forEach(property => {
        document.documentElement.style.removeProperty(property);
      });
    }
  }

  applyFontSize() {
    const fontSize = this.get('fontSize', 'medium');
    const body = document.body;

    // Remove existing font size classes
    body.classList.remove('font-small', 'font-medium', 'font-large');
    
    // Add current font size class
    body.classList.add(`font-${fontSize}`);
  }

  applyAnimations() {
    const animations = this.get('animations', true);
    const body = document.body;

    if (animations) {
      body.classList.remove('no-animations');
    } else {
      body.classList.add('no-animations');
    }
  }

  applyCompactMode() {
    const compactMode = this.get('compactMode', false);
    const body = document.body;

    if (compactMode) {
      body.classList.add('compact-mode');
    } else {
      body.classList.remove('compact-mode');
    }
  }

  // Utility methods
  isFeatureEnabled(feature) {
    return this.get(feature, false);
  }

  getThemeColors() {
    const theme = this.get('theme', 'system');
    return this.themes[theme]?.colors || null;
  }

  getCurrentTheme() {
    const theme = this.get('theme', 'system');
    
    if (theme === 'system') {
      // Detect system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      } else {
        return 'light';
      }
    }
    
    return theme;
  }

  getAllSettings() {
    return { ...this.settings };
  }

  getSettingsForSection(section) {
    const sectionSettings = {};
    
    switch (section) {
      case 'general':
        ['language', 'autoSave', 'confirmDelete', 'defaultView', 'itemsPerPage'].forEach(key => {
          sectionSettings[key] = this.settings[key];
        });
        break;
      case 'appearance':
        ['theme', 'colorScheme', 'fontSize', 'animations', 'compactMode'].forEach(key => {
          sectionSettings[key] = this.settings[key];
        });
        break;
      case 'account':
        ['username', 'email', 'avatar', 'notifications'].forEach(key => {
          sectionSettings[key] = this.settings[key];
        });
        break;
      case 'privacy':
        ['analytics', 'crashReports', 'shareUsageData'].forEach(key => {
          sectionSettings[key] = this.settings[key];
        });
        break;
      case 'advanced':
        ['developerMode', 'debugMode', 'cacheSize', 'preloadImages'].forEach(key => {
          sectionSettings[key] = this.settings[key];
        });
        break;
    }
    
    return sectionSettings;
  }

  // Static instance for global use
  static instance = null;

  static getInstance(options = {}) {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager(options);
    }
    return SettingsManager.instance;
  }
}