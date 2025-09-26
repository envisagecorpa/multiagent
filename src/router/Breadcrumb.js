import { Component } from '../components/common/Component.js';

export class Breadcrumb extends Component {
  constructor(router, options = {}) {
    super();
    this.router = router;
    this.options = {
      separator: options.separator || '/',
      maxItems: options.maxItems || 5,
      showHome: options.showHome !== false,
      homeText: options.homeText || 'Home',
      homePath: options.homePath || '/',
      className: options.className || '',
      ...options
    };

    this.breadcrumbs = [];
    this.routeMap = new Map(); // Maps paths to breadcrumb info
    
    // Set up route mapping
    this.setupRouteMap();
    
    // Listen for route changes
    if (this.router) {
      this.updateFromRouter = this.updateFromRouter.bind(this);
      // We'll need to trigger this when routes change
    }
  }

  setupRouteMap() {
    // Define breadcrumb mappings for different routes
    this.routeMap.set('/', { 
      title: this.options.homeText, 
      path: '/' 
    });
    
    this.routeMap.set('/albums', { 
      title: 'Albums', 
      path: '/albums' 
    });
    
    this.routeMap.set('/albums/:id', { 
      title: (params) => `Album: ${params.albumTitle || params.id}`, 
      path: (params) => `/albums/${params.id}`,
      parent: '/albums'
    });
    
    this.routeMap.set('/albums/:id/photos', { 
      title: (params) => `Photos in ${params.albumTitle || 'Album'}`, 
      path: (params) => `/albums/${params.id}/photos`,
      parent: (params) => `/albums/${params.id}`
    });
    
    this.routeMap.set('/photos/:id', { 
      title: (params) => `Photo: ${params.photoTitle || params.id}`, 
      path: (params) => `/photos/${params.id}`,
      parent: '/albums'
    });
    
    this.routeMap.set('/search', { 
      title: 'Search Results', 
      path: '/search',
      parent: '/'
    });
    
    this.routeMap.set('/settings', { 
      title: 'Settings', 
      path: '/settings',
      parent: '/'
    });
  }

  render() {
    const element = this.createElement('nav', {
      className: `breadcrumb ${this.options.className}`.trim(),
      'aria-label': 'Breadcrumb navigation'
    });

    const ol = this.createElement('ol', {
      className: 'breadcrumb-list'
    });

    this.renderBreadcrumbs(ol);

    element.appendChild(ol);
    this.element = element;
    return element;
  }

  renderBreadcrumbs(container) {
    container.innerHTML = '';

    if (this.breadcrumbs.length === 0) {
      return;
    }

    this.breadcrumbs.forEach((breadcrumb, index) => {
      const li = this.createElement('li', {
        className: 'breadcrumb-item'
      });

      const isLast = index === this.breadcrumbs.length - 1;
      const isFirst = index === 0;

      if (isLast) {
        // Current page - no link, just text
        li.classList.add('breadcrumb-current');
        const span = this.createElement('span', {
          className: 'breadcrumb-text',
          textContent: breadcrumb.title,
          'aria-current': 'page'
        });
        li.appendChild(span);
      } else {
        // Clickable link
        const link = this.createElement('a', {
          className: 'breadcrumb-link',
          href: breadcrumb.path,
          textContent: breadcrumb.title
        });

        link.addEventListener('click', (e) => {
          e.preventDefault();
          if (this.router) {
            this.router.navigate(breadcrumb.path);
          } else {
            window.location.href = breadcrumb.path;
          }
        });

        li.appendChild(link);
      }

      // Add separator (except for last item)
      if (!isLast) {
        const separator = this.createElement('span', {
          className: 'breadcrumb-separator',
          textContent: this.options.separator,
          'aria-hidden': 'true'
        });
        li.appendChild(separator);
      }

      container.appendChild(li);
    });
  }

  updateFromRouter() {
    if (!this.router) return;

    const currentRoute = this.router.getCurrentRoute();
    if (currentRoute && currentRoute.route) {
      this.updateFromRoute(currentRoute.route.path, currentRoute.params);
    }
  }

  updateFromRoute(routePath, params = {}) {
    const breadcrumbs = this.buildBreadcrumbsForRoute(routePath, params);
    this.setBreadcrumbs(breadcrumbs);
  }

  buildBreadcrumbsForRoute(routePath, params = {}) {
    const breadcrumbs = [];
    const routeInfo = this.routeMap.get(routePath);

    if (!routeInfo) {
      // Fallback: build breadcrumbs from path segments
      return this.buildBreadcrumbsFromPath(routePath, params);
    }

    // Build breadcrumb chain by following parent relationships
    const chain = [];
    let currentRoute = routePath;
    let currentParams = params;

    while (currentRoute) {
      const info = this.routeMap.get(currentRoute);
      if (!info) break;

      chain.unshift({
        route: currentRoute,
        info: info,
        params: currentParams
      });

      // Get parent route
      if (info.parent) {
        currentRoute = typeof info.parent === 'function' 
          ? info.parent(currentParams)
          : info.parent;
      } else {
        break;
      }
    }

    // Convert chain to breadcrumbs
    chain.forEach(({ info, params: itemParams }) => {
      const title = typeof info.title === 'function' 
        ? info.title(itemParams)
        : info.title;
      
      const path = typeof info.path === 'function' 
        ? info.path(itemParams)
        : info.path;

      breadcrumbs.push({
        title: title,
        path: path
      });
    });

    return breadcrumbs;
  }

  buildBreadcrumbsFromPath(path, params = {}) {
    const breadcrumbs = [];
    
    // Always include home if enabled
    if (this.options.showHome && path !== '/') {
      breadcrumbs.push({
        title: this.options.homeText,
        path: this.options.homePath
      });
    }

    // Split path into segments
    const segments = path.split('/').filter(segment => segment);
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += '/' + segment;
      
      // Skip if this is the root path and we already added home
      if (currentPath === '/' && this.options.showHome) {
        return;
      }

      let title = segment;
      
      // Try to get better title from parameters
      if (segment.startsWith(':')) {
        const paramName = segment.slice(1);
        if (params[paramName]) {
          title = params[paramName];
        }
      } else {
        // Capitalize and format segment
        title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      }

      breadcrumbs.push({
        title: title,
        path: currentPath
      });
    });

    return breadcrumbs;
  }

  setBreadcrumbs(breadcrumbs) {
    // Limit number of breadcrumbs if maxItems is set
    if (this.options.maxItems > 0 && breadcrumbs.length > this.options.maxItems) {
      const start = breadcrumbs.slice(0, 1); // Keep first (usually home)
      const end = breadcrumbs.slice(-(this.options.maxItems - 2)); // Keep last n-2
      
      this.breadcrumbs = [
        ...start,
        { title: '...', path: null }, // Ellipsis
        ...end
      ];
    } else {
      this.breadcrumbs = breadcrumbs;
    }

    // Re-render if element exists
    if (this.element) {
      const ol = this.element.querySelector('.breadcrumb-list');
      if (ol) {
        this.renderBreadcrumbs(ol);
      }
    }
  }

  addBreadcrumb(title, path) {
    this.breadcrumbs.push({ title, path });
    this.setBreadcrumbs(this.breadcrumbs);
  }

  removeBreadcrumb(index) {
    if (index >= 0 && index < this.breadcrumbs.length) {
      this.breadcrumbs.splice(index, 1);
      this.setBreadcrumbs(this.breadcrumbs);
    }
  }

  clearBreadcrumbs() {
    this.setBreadcrumbs([]);
  }

  getBreadcrumbs() {
    return [...this.breadcrumbs];
  }

  // Custom route mapping methods
  addRouteMapping(routePath, config) {
    this.routeMap.set(routePath, config);
  }

  updateRouteTitle(routePath, title, params = {}) {
    const routeInfo = this.routeMap.get(routePath);
    if (routeInfo) {
      if (typeof routeInfo.title === 'function') {
        // For dynamic titles, we need to update the current breadcrumbs
        this.updateFromRoute(routePath, { ...params, title });
      } else {
        routeInfo.title = title;
        this.updateFromRoute(routePath, params);
      }
    }
  }

  // Static method to create breadcrumb from router
  static fromRouter(router, options = {}) {
    const breadcrumb = new Breadcrumb(router, options);
    
    // Listen for route changes
    const originalHandleRoute = router.handleRoute;
    router.handleRoute = function(path) {
      const result = originalHandleRoute.call(this, path);
      // Update breadcrumb after route is handled
      setTimeout(() => breadcrumb.updateFromRouter(), 0);
      return result;
    };

    return breadcrumb;
  }
}