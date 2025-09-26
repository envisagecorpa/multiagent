/**
 * Performance Monitor and Optimization Utilities
 * Provides performance tracking, lazy loading, caching, and optimization features
 */

export class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      enableMetrics: true,
      enableLogging: true,
      sampleRate: 1.0, // 100% by default
      maxMetrics: 1000,
      reportInterval: 30000, // 30 seconds
      ...options
    };

    this.metrics = [];
    this.observers = new Map();
    this.timers = new Map();
    this.cache = new Map();
    
    this.init();
  }

  init() {
    if (!this.shouldCollectMetrics()) return;

    this.setupPerformanceObservers();
    this.startReporting();
    this.monitorVitals();
  }

  shouldCollectMetrics() {
    return this.options.enableMetrics && 
           Math.random() < this.options.sampleRate;
  }

  setupPerformanceObservers() {
    if (!window.PerformanceObserver) return;

    // Navigation timing
    this.observeNavigationTiming();
    
    // Resource timing
    this.observeResourceTiming();
    
    // Layout shifts
    this.observeLayoutShifts();
    
    // Largest contentful paint
    this.observeLCP();
    
    // First input delay
    this.observeFID();
  }

  observeNavigationTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('navigation', {
            type: 'navigation',
            duration: entry.duration,
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            timestamp: Date.now()
          });
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', observer);
    } catch (error) {
      console.warn('Navigation timing observer not supported');
    }
  }

  observeResourceTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) { // Only track slow resources
            this.recordMetric('resource', {
              type: 'resource',
              name: entry.name,
              duration: entry.duration,
              size: entry.transferSize,
              cached: entry.transferSize === 0,
              timestamp: Date.now()
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    } catch (error) {
      console.warn('Resource timing observer not supported');
    }
  }

  observeLayoutShifts() {
    try {
      let cumulativeLayoutShift = 0;
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            cumulativeLayoutShift += entry.value;
          }
        }
        
        this.recordMetric('cls', {
          type: 'cls',
          value: cumulativeLayoutShift,
          timestamp: Date.now()
        });
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', observer);
    } catch (error) {
      console.warn('Layout shift observer not supported');
    }
  }

  observeLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.recordMetric('lcp', {
          type: 'lcp',
          value: lastEntry.startTime,
          element: lastEntry.element?.tagName,
          timestamp: Date.now()
        });
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);
    } catch (error) {
      console.warn('LCP observer not supported');
    }
  }

  observeFID() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('fid', {
            type: 'fid',
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now()
          });
        }
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);
    } catch (error) {
      console.warn('FID observer not supported');
    }
  }

  monitorVitals() {
    // Monitor memory usage
    this.monitorMemory();
    
    // Monitor frame rate
    this.monitorFrameRate();
    
    // Monitor bundle size
    this.monitorBundleSize();
  }

  monitorMemory() {
    if (!performance.memory) return;

    const checkMemory = () => {
      const memory = performance.memory;
      this.recordMetric('memory', {
        type: 'memory',
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      });
    };

    setInterval(checkMemory, 10000); // Check every 10 seconds
  }

  monitorFrameRate() {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let totalFrameTime = 0;

    const measureFrame = (currentTime) => {
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      
      frameCount++;
      totalFrameTime += deltaTime;

      if (frameCount >= 60) { // Sample every 60 frames
        const avgFrameTime = totalFrameTime / frameCount;
        const fps = 1000 / avgFrameTime;
        
        this.recordMetric('fps', {
          type: 'fps',
          value: fps,
          avgFrameTime: avgFrameTime,
          timestamp: Date.now()
        });

        frameCount = 0;
        totalFrameTime = 0;
      }

      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  monitorBundleSize() {
    if (!navigator.connection) return;

    this.recordMetric('connection', {
      type: 'connection',
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      timestamp: Date.now()
    });
  }

  // Custom timing methods
  startTimer(name) {
    this.timers.set(name, performance.now());
  }

  endTimer(name, metadata = {}) {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.recordMetric('custom-timing', {
      type: 'custom-timing',
      name,
      duration,
      ...metadata,
      timestamp: Date.now()
    });

    return duration;
  }

  // Metric recording
  recordMetric(type, data) {
    if (!this.options.enableMetrics) return;

    const metric = {
      id: this.generateId(),
      type,
      ...data
    };

    this.metrics.push(metric);

    // Keep metrics array size manageable
    if (this.metrics.length > this.options.maxMetrics) {
      this.metrics.shift();
    }

    if (this.options.enableLogging) {
      console.debug(`Performance metric [${type}]:`, data);
    }
  }

  // Reporting
  startReporting() {
    if (!this.options.reportInterval) return;

    setInterval(() => {
      this.generateReport();
    }, this.options.reportInterval);
  }

  generateReport() {
    const report = {
      timestamp: Date.now(),
      metrics: this.getMetricsSummary(),
      vitals: this.getWebVitals(),
      performance: this.getPerformanceScore()
    };

    if (this.options.enableLogging) {
      console.group('🚀 Performance Report');
      console.table(report.vitals);
      console.log('Performance Score:', report.performance);
      console.groupEnd();
    }

    // Send to analytics if configured
    this.sendReport(report);

    return report;
  }

  getMetricsSummary() {
    const summary = {};
    
    this.metrics.forEach(metric => {
      if (!summary[metric.type]) {
        summary[metric.type] = {
          count: 0,
          total: 0,
          min: Infinity,
          max: -Infinity,
          avg: 0
        };
      }

      const value = metric.duration || metric.value || 0;
      const typeData = summary[metric.type];
      
      typeData.count++;
      typeData.total += value;
      typeData.min = Math.min(typeData.min, value);
      typeData.max = Math.max(typeData.max, value);
      typeData.avg = typeData.total / typeData.count;
    });

    return summary;
  }

  getWebVitals() {
    const vitals = {};
    const recentMetrics = this.metrics.filter(m => 
      Date.now() - m.timestamp < 60000 // Last minute
    );

    // LCP (Largest Contentful Paint)
    const lcpMetrics = recentMetrics.filter(m => m.type === 'lcp');
    if (lcpMetrics.length > 0) {
      vitals.lcp = lcpMetrics[lcpMetrics.length - 1].value;
    }

    // FID (First Input Delay)
    const fidMetrics = recentMetrics.filter(m => m.type === 'fid');
    if (fidMetrics.length > 0) {
      vitals.fid = Math.max(...fidMetrics.map(m => m.value));
    }

    // CLS (Cumulative Layout Shift)
    const clsMetrics = recentMetrics.filter(m => m.type === 'cls');
    if (clsMetrics.length > 0) {
      vitals.cls = clsMetrics[clsMetrics.length - 1].value;
    }

    // FPS
    const fpsMetrics = recentMetrics.filter(m => m.type === 'fps');
    if (fpsMetrics.length > 0) {
      vitals.fps = fpsMetrics.reduce((sum, m) => sum + m.value, 0) / fpsMetrics.length;
    }

    return vitals;
  }

  getPerformanceScore() {
    const vitals = this.getWebVitals();
    let score = 100;

    // LCP scoring (0-2.5s good, 2.5-4s needs improvement, >4s poor)
    if (vitals.lcp > 4000) score -= 30;
    else if (vitals.lcp > 2500) score -= 15;

    // FID scoring (0-100ms good, 100-300ms needs improvement, >300ms poor)
    if (vitals.fid > 300) score -= 25;
    else if (vitals.fid > 100) score -= 10;

    // CLS scoring (0-0.1 good, 0.1-0.25 needs improvement, >0.25 poor)
    if (vitals.cls > 0.25) score -= 25;
    else if (vitals.cls > 0.1) score -= 10;

    // FPS scoring
    if (vitals.fps < 30) score -= 20;
    else if (vitals.fps < 50) score -= 10;

    return Math.max(0, score);
  }

  sendReport(report) {
    // Send to analytics service if configured
    if (this.options.analyticsEndpoint) {
      fetch(this.options.analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(error => {
        console.warn('Failed to send performance report:', error);
      });
    }
  }

  // Public API
  getMetrics(type = null) {
    if (type) {
      return this.metrics.filter(m => m.type === type);
    }
    return [...this.metrics];
  }

  clearMetrics() {
    this.metrics = [];
  }

  generateId() {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  destroy() {
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // Clear timers and data
    this.timers.clear();
    this.metrics = [];
    this.cache.clear();
  }
}

/**
 * Lazy Loading Utility
 */
export class LazyLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      enableCache: true,
      ...options
    };

    this.observer = null;
    this.loadedItems = new Set();
    this.cache = new Map();
    
    this.init();
  }

  init() {
    if (!window.IntersectionObserver) {
      console.warn('IntersectionObserver not supported, falling back to immediate loading');
      return;
    }

    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );
  }

  observe(element, loader) {
    if (!this.observer) {
      // Fallback: load immediately
      loader();
      return;
    }

    element.lazyLoader = loader;
    this.observer.observe(element);
  }

  unobserve(element) {
    if (this.observer) {
      this.observer.unobserve(element);
    }
    delete element.lazyLoader;
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const loader = element.lazyLoader;

        if (loader && !this.loadedItems.has(element)) {
          this.loadedItems.add(element);
          loader();
          this.unobserve(element);
        }
      }
    });
  }

  // Preload utility
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      if (this.options.enableCache && this.cache.has(src)) {
        resolve(this.cache.get(src));
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (this.options.enableCache) {
          this.cache.set(src, img);
        }
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // Preload component
  async preloadComponent(componentLoader) {
    try {
      const component = await componentLoader();
      return component;
    } catch (error) {
      console.error('Failed to preload component:', error);
      throw error;
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.loadedItems.clear();
    this.cache.clear();
  }
}

/**
 * Virtual Scrolling Implementation
 */
export class VirtualScroller {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemHeight: 50,
      buffer: 5,
      tolerance: 0,
      ...options
    };

    this.items = [];
    this.visibleItems = [];
    this.scrollTop = 0;
    this.containerHeight = 0;
    
    this.init();
  }

  init() {
    this.setupContainer();
    this.bindEvents();
    this.updateVisibleItems();
  }

  setupContainer() {
    this.container.style.overflowY = 'auto';
    this.container.style.position = 'relative';
    
    // Create viewport
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'absolute';
    this.viewport.style.top = '0';
    this.viewport.style.left = '0';
    this.viewport.style.right = '0';
    
    this.container.appendChild(this.viewport);
    
    this.updateContainerHeight();
  }

  bindEvents() {
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  handleScroll() {
    this.scrollTop = this.container.scrollTop;
    this.updateVisibleItems();
  }

  handleResize() {
    this.updateContainerHeight();
    this.updateVisibleItems();
  }

  updateContainerHeight() {
    this.containerHeight = this.container.clientHeight;
  }

  setItems(items) {
    this.items = items;
    this.updateTotalHeight();
    this.updateVisibleItems();
  }

  updateTotalHeight() {
    const totalHeight = this.items.length * this.options.itemHeight;
    this.container.style.height = `${totalHeight}px`;
  }

  updateVisibleItems() {
    const startIndex = Math.max(0, 
      Math.floor(this.scrollTop / this.options.itemHeight) - this.options.buffer
    );
    
    const endIndex = Math.min(this.items.length - 1,
      Math.ceil((this.scrollTop + this.containerHeight) / this.options.itemHeight) + this.options.buffer
    );

    this.visibleItems = this.items.slice(startIndex, endIndex + 1);
    this.renderVisibleItems(startIndex);
  }

  renderVisibleItems(startIndex) {
    // Clear viewport
    this.viewport.innerHTML = '';
    
    // Set viewport position
    this.viewport.style.transform = `translateY(${startIndex * this.options.itemHeight}px)`;
    
    // Render visible items
    this.visibleItems.forEach((item, index) => {
      const element = this.renderItem(item, startIndex + index);
      element.style.height = `${this.options.itemHeight}px`;
      this.viewport.appendChild(element);
    });
  }

  renderItem(item, index) {
    // Override this method to customize item rendering
    const element = document.createElement('div');
    element.className = 'virtual-scroll-item';
    element.textContent = `Item ${index}: ${JSON.stringify(item)}`;
    return element;
  }

  scrollToIndex(index) {
    const scrollTop = index * this.options.itemHeight;
    this.container.scrollTop = scrollTop;
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize.bind(this));
    if (this.viewport && this.viewport.parentNode) {
      this.viewport.parentNode.removeChild(this.viewport);
    }
  }
}

/**
 * Image Optimization Utility
 */
export class ImageOptimizer {
  static async generateThumbnail(file, maxWidth = 200, maxHeight = 200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate dimensions
        const { width, height } = this.calculateDimensions(
          img.width, img.height, maxWidth, maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', quality);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  static calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
    const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
    
    return {
      width: Math.round(originalWidth * ratio),
      height: Math.round(originalHeight * ratio)
    };
  }

  static async compressImage(file, maxSize = 1024 * 1024, quality = 0.8) {
    if (file.size <= maxSize) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        
        // Calculate compression ratio based on file size
        const compressionRatio = Math.sqrt(maxSize / file.size);
        width *= compressionRatio;
        height *= compressionRatio;

        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, 'image/jpeg', quality);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
}

// Export default instances
export const performanceMonitor = new PerformanceMonitor();
export const lazyLoader = new LazyLoader();

export default {
  PerformanceMonitor,
  LazyLoader,
  VirtualScroller,
  ImageOptimizer,
  performanceMonitor,
  lazyLoader
};