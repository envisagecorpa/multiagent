/**
 * Cache Management System
 * Provides intelligent caching for API responses, images, and component data
 */

export class CacheManager {
  constructor(options = {}) {
    this.options = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      maxAge: 30 * 60 * 1000, // 30 minutes default
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      storageKey: 'photo-app-cache',
      enablePersistence: true,
      enableCompression: true,
      ...options
    };

    this.cache = new Map();
    this.metadata = new Map();
    this.accessTimes = new Map();
    this.currentSize = 0;
    
    this.init();
  }

  init() {
    if (this.options.enablePersistence) {
      this.loadFromStorage();
    }
    
    this.startCleanupTimer();
    this.bindUnloadHandler();
  }

  // Core cache operations
  async set(key, value, options = {}) {
    const finalOptions = {
      maxAge: this.options.maxAge,
      tags: [],
      priority: 'normal',
      compress: this.options.enableCompression,
      ...options
    };

    try {
      // Prepare cache entry
      const entry = await this.prepareCacheEntry(value, finalOptions);
      const size = this.calculateSize(entry);

      // Check size limits
      if (size > this.options.maxSize) {
        throw new Error(`Cache entry too large: ${size} bytes`);
      }

      // Make room if necessary
      await this.makeRoom(size);

      // Store entry
      this.cache.set(key, entry);
      this.metadata.set(key, {
        size,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        tags: finalOptions.tags,
        priority: finalOptions.priority,
        maxAge: finalOptions.maxAge
      });
      
      this.accessTimes.set(key, Date.now());
      this.currentSize += size;

      // Persist if enabled
      if (this.options.enablePersistence) {
        this.saveToStorage();
      }

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const metadata = this.metadata.get(key);
    const now = Date.now();

    // Check expiration
    if (now - metadata.createdAt > metadata.maxAge) {
      this.delete(key);
      return null;
    }

    // Update access information
    metadata.lastAccessed = now;
    metadata.accessCount++;
    this.accessTimes.set(key, now);

    // Get and decompress value
    const entry = this.cache.get(key);
    return await this.processCacheEntry(entry);
  }

  delete(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const metadata = this.metadata.get(key);
    this.currentSize -= metadata.size;

    this.cache.delete(key);
    this.metadata.delete(key);
    this.accessTimes.delete(key);

    return true;
  }

  clear() {
    this.cache.clear();
    this.metadata.clear();
    this.accessTimes.clear();
    this.currentSize = 0;

    if (this.options.enablePersistence) {
      this.clearStorage();
    }
  }

  // Advanced operations
  async prepareCacheEntry(value, options) {
    let processedValue = value;

    // Serialize if needed
    if (typeof value === 'object' && value !== null) {
      processedValue = JSON.stringify(value);
    }

    // Compress if enabled and beneficial
    if (options.compress && typeof processedValue === 'string' && processedValue.length > 1000) {
      processedValue = await this.compress(processedValue);
    }

    return {
      data: processedValue,
      type: typeof value,
      compressed: options.compress && processedValue !== value,
      originalSize: this.calculateSize(value)
    };
  }

  async processCacheEntry(entry) {
    let value = entry.data;

    // Decompress if needed
    if (entry.compressed) {
      value = await this.decompress(value);
    }

    // Parse if needed
    if (entry.type === 'object' && typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch (error) {
        console.warn('Failed to parse cached object:', error);
        return null;
      }
    }

    return value;
  }

  async makeRoom(requiredSize) {
    while (this.currentSize + requiredSize > this.options.maxSize) {
      const keyToEvict = this.selectEvictionCandidate();
      if (!keyToEvict) {
        throw new Error('Cannot make room in cache');
      }
      this.delete(keyToEvict);
    }
  }

  selectEvictionCandidate() {
    if (this.cache.size === 0) return null;

    // LRU with priority consideration
    let oldestKey = null;
    let oldestTime = Date.now();
    let lowestPriority = 'high';

    for (const [key, metadata] of this.metadata.entries()) {
      const lastAccessed = this.accessTimes.get(key);
      
      // Prioritize by priority level first
      if (this.comparePriority(metadata.priority, lowestPriority) < 0) {
        oldestKey = key;
        oldestTime = lastAccessed;
        lowestPriority = metadata.priority;
      } else if (metadata.priority === lowestPriority && lastAccessed < oldestTime) {
        oldestKey = key;
        oldestTime = lastAccessed;
      }
    }

    return oldestKey;
  }

  comparePriority(a, b) {
    const priorityOrder = { low: 0, normal: 1, high: 2 };
    return priorityOrder[a] - priorityOrder[b];
  }

  // Tag-based operations
  getByTag(tag) {
    const results = [];
    
    for (const [key, metadata] of this.metadata.entries()) {
      if (metadata.tags.includes(tag)) {
        results.push({
          key,
          value: this.get(key),
          metadata
        });
      }
    }

    return results;
  }

  deleteByTag(tag) {
    const keysToDelete = [];
    
    for (const [key, metadata] of this.metadata.entries()) {
      if (metadata.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }

  // Compression utilities
  async compress(data) {
    if (!window.CompressionStream) {
      return data; // Fallback to uncompressed
    }

    try {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(new TextEncoder().encode(data));
      writer.close();

      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error);
      return data;
    }
  }

  async decompress(compressedData) {
    if (!window.DecompressionStream || typeof compressedData === 'string') {
      return compressedData;
    }

    try {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(compressedData);
      writer.close();

      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
      return new TextDecoder().decode(decompressed);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return compressedData;
    }
  }

  // Persistence
  saveToStorage() {
    try {
      const cacheData = {
        cache: Array.from(this.cache.entries()),
        metadata: Array.from(this.metadata.entries()),
        accessTimes: Array.from(this.accessTimes.entries()),
        currentSize: this.currentSize,
        timestamp: Date.now()
      };

      localStorage.setItem(this.options.storageKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (!stored) return;

      const cacheData = JSON.parse(stored);
      
      // Check if data is not too old
      const age = Date.now() - cacheData.timestamp;
      if (age > this.options.maxAge * 2) {
        this.clearStorage();
        return;
      }

      this.cache = new Map(cacheData.cache);
      this.metadata = new Map(cacheData.metadata);
      this.accessTimes = new Map(cacheData.accessTimes);
      this.currentSize = cacheData.currentSize || 0;

      // Clean expired entries
      this.cleanup();
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
      this.clearStorage();
    }
  }

  clearStorage() {
    try {
      localStorage.removeItem(this.options.storageKey);
    } catch (error) {
      console.warn('Failed to clear cache storage:', error);
    }
  }

  // Cleanup and maintenance
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, metadata] of this.metadata.entries()) {
      if (now - metadata.createdAt > metadata.maxAge) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));

    if (keysToDelete.length > 0) {
      console.debug(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  bindUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      if (this.options.enablePersistence) {
        this.saveToStorage();
      }
    });
  }

  // Utility methods
  calculateSize(value) {
    if (value instanceof Uint8Array) {
      return value.length;
    }
    
    if (typeof value === 'string') {
      return new TextEncoder().encode(value).length;
    }
    
    if (typeof value === 'object' && value !== null) {
      return new TextEncoder().encode(JSON.stringify(value)).length;
    }
    
    return 8; // Approximate size for primitives
  }

  // Statistics and monitoring
  getStats() {
    const stats = {
      size: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.options.maxSize,
      utilization: (this.currentSize / this.options.maxSize) * 100,
      hitRate: 0,
      avgAccessCount: 0,
      tagStats: {}
    };

    if (this.metadata.size > 0) {
      const totalAccess = Array.from(this.metadata.values())
        .reduce((sum, meta) => sum + meta.accessCount, 0);
      stats.avgAccessCount = totalAccess / this.metadata.size;
    }

    // Tag statistics
    for (const metadata of this.metadata.values()) {
      metadata.tags.forEach(tag => {
        stats.tagStats[tag] = (stats.tagStats[tag] || 0) + 1;
      });
    }

    return stats;
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  has(key) {
    return this.cache.has(key) && !this.isExpired(key);
  }

  isExpired(key) {
    const metadata = this.metadata.get(key);
    if (!metadata) return true;
    
    return Date.now() - metadata.createdAt > metadata.maxAge;
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.clear();
  }
}

/**
 * Specialized Image Cache
 */
export class ImageCache extends CacheManager {
  constructor(options = {}) {
    super({
      maxSize: 100 * 1024 * 1024, // 100MB for images
      maxAge: 60 * 60 * 1000, // 1 hour
      storageKey: 'photo-app-image-cache',
      ...options
    });

    this.preloadQueue = [];
    this.loadingPromises = new Map();
  }

  async cacheImage(url, options = {}) {
    // Check if already cached
    const cached = await this.get(url);
    if (cached) return cached;

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }

    // Start loading
    const loadPromise = this.loadAndCacheImage(url, options);
    this.loadingPromises.set(url, loadPromise);

    try {
      const result = await loadPromise;
      this.loadingPromises.delete(url);
      return result;
    } catch (error) {
      this.loadingPromises.delete(url);
      throw error;
    }
  }

  async loadAndCacheImage(url, options = {}) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      // Cache the blob URL
      await this.set(url, objectUrl, {
        tags: ['image'],
        priority: options.priority || 'normal',
        maxAge: options.maxAge || this.options.maxAge
      });

      return objectUrl;
    } catch (error) {
      console.error('Failed to cache image:', url, error);
      throw error;
    }
  }

  preloadImages(urls, options = {}) {
    urls.forEach(url => {
      if (!this.has(url) && !this.loadingPromises.has(url)) {
        this.preloadQueue.push({ url, options });
      }
    });

    this.processPreloadQueue();
  }

  async processPreloadQueue() {
    const concurrency = 3; // Load 3 images at once
    const workers = [];

    for (let i = 0; i < concurrency && this.preloadQueue.length > 0; i++) {
      workers.push(this.preloadWorker());
    }

    await Promise.all(workers);
  }

  async preloadWorker() {
    while (this.preloadQueue.length > 0) {
      const { url, options } = this.preloadQueue.shift();
      try {
        await this.cacheImage(url, { ...options, priority: 'low' });
      } catch (error) {
        console.warn('Preload failed for:', url, error);
      }
    }
  }

  revokeImageUrls() {
    for (const [key, metadata] of this.metadata.entries()) {
      if (metadata.tags.includes('image')) {
        const url = this.cache.get(key);
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
    }
  }

  destroy() {
    this.revokeImageUrls();
    super.destroy();
  }
}

// Create default instances
export const globalCache = new CacheManager();
export const imageCache = new ImageCache();

export default {
  CacheManager,
  ImageCache,
  globalCache,
  imageCache
};