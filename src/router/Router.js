export class Router {
  constructor(options = {}) {
    this.options = {
      base: options.base || '',
      hash: options.hash !== false, // Use hash routing by default
      ...options
    };

    this.routes = new Map();
    this.middlewares = [];
    this.currentRoute = null;
    this.isStarted = false;
    this.params = {};
    this.query = {};

    // Bind event handlers
    this.handlePopState = this.handlePopState.bind(this);
    this.handleHashChange = this.handleHashChange.bind(this);

    // Register routes if provided in options
    if (options.routes) {
      Object.entries(options.routes).forEach(([path, config]) => {
        this.route(path, config);
      });
    }
  }

  /**
   * Add a route
   * @param {string} path - Route path with optional parameters (e.g., '/album/:id')
   * @param {Function|Object} handlerOrConfig - Route handler function, component, or configuration object
   * @param {Object} options - Route options
   */
  route(path, handlerOrConfig, options = {}) {
    // If handlerOrConfig is an object with a 'component' or 'handler' property, merge it into the route
    let handler;
    let routeConfig = {};

    if (typeof handlerOrConfig === 'object' && (handlerOrConfig.component || handlerOrConfig.handler)) {
      handler = handlerOrConfig.handler || handlerOrConfig.component;
      routeConfig = { ...handlerOrConfig };
    } else {
      handler = handlerOrConfig;
    }

    const route = {
      path: path,
      handler: handler,
      regex: this.pathToRegex(path),
      keys: this.extractKeys(path),
      ...routeConfig,
      ...options
    };

    this.routes.set(path, route);
    return this;
  }

  /**
   * Add middleware
   * @param {Function} middleware - Middleware function
   */
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Start the router
   */
  start() {
    console.log('🎬 Router: start() called');
    console.log('   isStarted:', this.isStarted);
    console.log('   hash mode:', this.options.hash);
    console.log('   current hash:', window.location.hash);

    if (this.isStarted) return this;

    this.isStarted = true;

    if (this.options.hash) {
      console.log('📍 Router: Starting in hash mode');
      window.addEventListener('hashchange', this.handleHashChange);
      // Handle initial route
      console.log('📍 Router: Calling handleHashChange for initial route');
      this.handleHashChange();
    } else {
      console.log('📍 Router: Starting in history mode');
      window.addEventListener('popstate', this.handlePopState);
      // Handle initial route
      this.navigate(this.getCurrentPath(), { replace: true });
    }

    console.log('✅ Router: Started successfully');
    return this;
  }

  /**
   * Stop the router
   */
  stop() {
    this.isStarted = false;

    if (this.options.hash) {
      window.removeEventListener('hashchange', this.handleHashChange);
    } else {
      window.removeEventListener('popstate', this.handlePopState);
    }

    return this;
  }

  /**
   * Navigate to a path
   * @param {string} path - Path to navigate to
   * @param {Object} options - Navigation options
   */
  navigate(path, options = {}) {
    const { replace = false, state = null, trigger = true } = options;

    if (!this.isStarted) {
      console.warn('Router not started. Call router.start() first.');
      return this;
    }

    const fullPath = this.resolvePath(path);

    if (this.options.hash) {
      const hash = '#' + fullPath;
      if (replace) {
        window.location.replace(window.location.pathname + window.location.search + hash);
      } else {
        window.location.hash = hash;
      }
    } else {
      if (replace) {
        window.history.replaceState(state, '', fullPath);
      } else {
        window.history.pushState(state, '', fullPath);
      }

      if (trigger) {
        this.handleRoute(fullPath);
      }
    }

    return this;
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back();
    return this;
  }

  /**
   * Go forward in history
   */
  forward() {
    window.history.forward();
    return this;
  }

  /**
   * Replace current route
   * @param {string} path - Path to replace with
   * @param {Object} state - State object
   */
  replace(path, state = null) {
    return this.navigate(path, { replace: true, state });
  }

  /**
   * Handle popstate event
   */
  handlePopState(event) {
    this.handleRoute(this.getCurrentPath());
  }

  /**
   * Handle hashchange event
   */
  handleHashChange() {
    const hash = window.location.hash.slice(1); // Remove #
    this.handleRoute(hash || '/');
  }

  /**
   * Handle route matching and execution
   * @param {string} path - Path to handle
   */
  async handleRoute(path) {
    console.log('🔀 Router: Handling route:', path);
    const route = this.matchRoute(path);

    if (!route) {
      console.log('❌ Router: No route matched for:', path);
      this.handleNotFound(path);
      return;
    }

    console.log('✅ Router: Route matched:', route.path, 'requiresAuth:', route.requiresAuth);

    // Parse parameters and query
    this.params = this.extractParams(route, path);
    this.query = this.parseQuery(path);

    // Create route context
    const context = {
      path: path,
      route: route,
      params: this.params,
      query: this.query,
      router: this
    };

    try {
      // Check authentication requirement
      if (route.requiresAuth && this.options.onAuthRequired) {
        const isAuthenticated = this.options.checkAuth ? await this.options.checkAuth() : true;
        console.log('🔐 Router: Auth check result:', isAuthenticated);
        if (!isAuthenticated) {
          console.log('🚫 Router: Auth required, calling onAuthRequired');
          await this.options.onAuthRequired(context);
          return;
        }
      }

      // Run middlewares
      for (const middleware of this.middlewares) {
        const result = await middleware(context);
        if (result === false) {
          return; // Middleware cancelled navigation
        }
      }

      // Execute route handler
      console.log('▶️ Router: Executing handler for:', route.path);
      this.currentRoute = route;
      await this.executeHandler(route.handler, context);

    } catch (error) {
      console.error('Route handling error:', error);
      this.handleError(error, context);
    }
  }

  /**
   * Match a path to a route
   * @param {string} path - Path to match
   * @returns {Object|null} Matched route or null
   */
  matchRoute(path) {
    const cleanPath = this.cleanPath(path);

    for (const [, route] of this.routes) {
      if (route.regex.test(cleanPath)) {
        return route;
      }
    }

    return null;
  }

  /**
   * Execute route handler
   * @param {Function|Object|String} handler - Route handler
   * @param {Object} context - Route context
   */
  async executeHandler(handler, context) {
    console.log('🎯 Router: executeHandler called with handler type:', typeof handler, handler);
    if (typeof handler === 'function') {
      await handler(context);
    } else if (handler && typeof handler.render === 'function') {
      // Assuming handler is a component class
      const component = new handler();
      await component.render(context);
    } else if (typeof handler === 'string') {
      // Handler is a string (component name) - call onRouteChange callback
      console.log('📞 Router: Calling onRouteChange with component name:', handler);
      if (this.options.onRouteChange) {
        await this.options.onRouteChange(context.route, context.params);
      } else {
        console.error('⚠️ Router: onRouteChange callback not defined');
      }
    } else {
      console.error('Invalid route handler:', handler);
    }
  }

  /**
   * Convert path pattern to regex
   * @param {string} path - Path pattern
   * @returns {RegExp} Regex pattern
   */
  pathToRegex(path) {
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:([^\/]+)/g, '([^\/]+)')
      .replace(/\*/g, '.*');
    
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Extract parameter keys from path
   * @param {string} path - Path pattern
   * @returns {Array} Parameter keys
   */
  extractKeys(path) {
    const matches = path.match(/:([^\/]+)/g);
    return matches ? matches.map(match => match.slice(1)) : [];
  }

  /**
   * Extract parameters from matched path
   * @param {Object} route - Matched route
   * @param {string} path - Actual path
   * @returns {Object} Parameters object
   */
  extractParams(route, path) {
    const cleanPath = this.cleanPath(path);
    const matches = cleanPath.match(route.regex);
    const params = {};

    if (matches && route.keys) {
      route.keys.forEach((key, index) => {
        params[key] = matches[index + 1];
      });
    }

    return params;
  }

  /**
   * Parse query string from path
   * @param {string} path - Path with optional query string
   * @returns {Object} Query parameters object
   */
  parseQuery(path) {
    const queryIndex = path.indexOf('?');
    if (queryIndex === -1) return {};

    const queryString = path.slice(queryIndex + 1);
    const params = {};

    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key) {
        params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
    });

    return params;
  }

  /**
   * Clean path by removing query string and hash
   * @param {string} path - Path to clean
   * @returns {string} Clean path
   */
  cleanPath(path) {
    return path.split('?')[0].split('#')[0];
  }

  /**
   * Get current path
   * @returns {string} Current path
   */
  getCurrentPath() {
    if (this.options.hash) {
      return window.location.hash.slice(1) || '/';
    } else {
      return window.location.pathname + window.location.search;
    }
  }

  /**
   * Resolve relative path to absolute
   * @param {string} path - Path to resolve
   * @returns {string} Resolved path
   */
  resolvePath(path) {
    if (path.startsWith('/')) {
      return this.options.base + path;
    }
    
    // Handle relative paths
    const currentPath = this.cleanPath(this.getCurrentPath());
    const segments = currentPath.split('/').slice(0, -1);
    const pathSegments = path.split('/');

    pathSegments.forEach(segment => {
      if (segment === '..') {
        segments.pop();
      } else if (segment !== '.' && segment !== '') {
        segments.push(segment);
      }
    });

    return this.options.base + '/' + segments.filter(s => s).join('/');
  }

  /**
   * Handle 404 not found
   * @param {string} path - Path that was not found
   */
  handleNotFound(path) {
    console.warn(`Route not found: ${path}`);
    
    // Try to find a catch-all route
    const notFoundRoute = this.routes.get('*') || this.routes.get('/404');
    if (notFoundRoute) {
      this.executeHandler(notFoundRoute.handler, {
        path: path,
        route: notFoundRoute,
        params: {},
        query: this.parseQuery(path),
        router: this
      });
    }
  }

  /**
   * Handle route errors
   * @param {Error} error - Error that occurred
   * @param {Object} context - Route context
   */
  handleError(error, context) {
    console.error('Router error:', error);
    
    // Try to find an error route
    const errorRoute = this.routes.get('/error');
    if (errorRoute) {
      this.executeHandler(errorRoute.handler, {
        ...context,
        error: error
      });
    }
  }

  /**
   * Generate URL for a route
   * @param {string} name - Route name or path
   * @param {Object} params - Parameters to substitute
   * @param {Object} query - Query parameters
   * @returns {string} Generated URL
   */
  url(name, params = {}, query = {}) {
    let path = name;

    // Substitute parameters
    Object.keys(params).forEach(key => {
      path = path.replace(`:${key}`, params[key]);
    });

    // Add query string
    const queryString = Object.keys(query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');

    if (queryString) {
      path += `?${queryString}`;
    }

    return this.options.hash ? `#${path}` : path;
  }

  /**
   * Get current route information
   * @returns {Object} Current route info
   */
  getCurrentRoute() {
    return {
      route: this.currentRoute,
      path: this.getCurrentPath(),
      params: { ...this.params },
      query: { ...this.query }
    };
  }

  /**
   * Check if a path matches the current route
   * @param {string} path - Path to check
   * @returns {boolean} True if path matches current route
   */
  isActive(path) {
    return this.cleanPath(this.getCurrentPath()) === this.cleanPath(path);
  }

  /**
   * Get all registered routes
   * @returns {Array} Array of route objects
   */
  getRoutes() {
    return Array.from(this.routes.values());
  }
}