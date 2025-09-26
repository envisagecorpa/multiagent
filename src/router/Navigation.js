import { Component } from '../components/common/Component.js';

export class Navigation extends Component {
  constructor(router, options = {}) {
    super();
    this.router = router;
    this.options = {
      brand: options.brand || 'Photo Album',
      brandIcon: options.brandIcon || '📷',
      showMobile: options.showMobile !== false,
      links: options.links || this.getDefaultLinks(),
      ...options
    };

    this.isMobileMenuOpen = false;
    this.currentPath = '/';
    
    // Bind methods
    this.handleRouteChange = this.handleRouteChange.bind(this);
    this.toggleMobileMenu = this.toggleMobileMenu.bind(this);
    this.closeMobileMenu = this.closeMobileMenu.bind(this);
  }

  getDefaultLinks() {
    return [
      {
        path: '/',
        title: 'Home',
        icon: '🏠'
      },
      {
        path: '/albums',
        title: 'Albums',
        icon: '📁'
      },
      {
        path: '/search',
        title: 'Search',
        icon: '🔍'
      },
      {
        path: '/settings',
        title: 'Settings',
        icon: '⚙️'
      }
    ];
  }

  render() {
    const element = this.createElement('nav', {
      className: 'nav-menu'
    });

    const container = this.createElement('div', {
      className: 'nav-menu-container'
    });

    // Brand/Logo
    const brand = this.createBrand();
    container.appendChild(brand);

    // Desktop Navigation
    const desktopNav = this.createDesktopNav();
    container.appendChild(desktopNav);

    // Mobile Toggle (if enabled)
    if (this.options.showMobile) {
      const mobileToggle = this.createMobileToggle();
      container.appendChild(mobileToggle);
    }

    element.appendChild(container);

    // Mobile Menu (if enabled)
    if (this.options.showMobile) {
      const mobileMenu = this.createMobileMenu();
      element.appendChild(mobileMenu);
    }

    // Setup router integration
    this.setupRouterIntegration();

    // Handle clicks outside mobile menu
    document.addEventListener('click', this.handleDocumentClick.bind(this));

    this.element = element;
    return element;
  }

  createBrand() {
    const brand = this.createElement('a', {
      className: 'nav-brand',
      href: '/'
    });

    const icon = this.createElement('div', {
      className: 'nav-brand-icon',
      textContent: this.options.brandIcon
    });

    const text = this.createElement('span', {
      textContent: this.options.brand
    });

    brand.appendChild(icon);
    brand.appendChild(text);

    brand.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.router) {
        this.router.navigate('/');
      } else {
        window.location.href = '/';
      }
      this.closeMobileMenu();
    });

    return brand;
  }

  createDesktopNav() {
    const nav = this.createElement('ul', {
      className: 'nav-links'
    });

    this.options.links.forEach(link => {
      const li = this.createElement('li');
      const linkElement = this.createNavLink(link);
      li.appendChild(linkElement);
      nav.appendChild(li);
    });

    return nav;
  }

  createMobileToggle() {
    const toggle = this.createElement('button', {
      className: 'nav-mobile-toggle',
      'aria-label': 'Toggle mobile menu',
      'aria-expanded': 'false',
      innerHTML: '☰'
    });

    toggle.addEventListener('click', this.toggleMobileMenu);

    return toggle;
  }

  createMobileMenu() {
    const menu = this.createElement('div', {
      className: 'nav-mobile-menu',
      id: 'mobile-menu'
    });

    const links = this.createElement('ul', {
      className: 'nav-mobile-links'
    });

    this.options.links.forEach(link => {
      const li = this.createElement('li');
      const linkElement = this.createNavLink(link, true);
      li.appendChild(linkElement);
      links.appendChild(li);
    });

    menu.appendChild(links);
    return menu;
  }

  createNavLink(link, isMobile = false) {
    const linkElement = this.createElement('a', {
      className: 'nav-link',
      href: link.path,
      'data-path': link.path
    });

    if (link.icon) {
      const icon = this.createElement('span', {
        className: 'nav-link-icon',
        textContent: link.icon
      });
      linkElement.appendChild(icon);
    }

    const text = this.createElement('span', {
      textContent: link.title
    });
    linkElement.appendChild(text);

    linkElement.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.router) {
        this.router.navigate(link.path);
      } else {
        window.location.href = link.path;
      }
      
      if (isMobile) {
        this.closeMobileMenu();
      }
    });

    return linkElement;
  }

  setupRouterIntegration() {
    if (!this.router) return;

    // Get initial path
    this.updateActiveLinks();

    // Listen for route changes
    const originalHandleRoute = this.router.handleRoute;
    this.router.handleRoute = (path) => {
      const result = originalHandleRoute.call(this.router, path);
      this.handleRouteChange(path);
      return result;
    };
  }

  handleRouteChange(path) {
    this.currentPath = path;
    this.updateActiveLinks();
  }

  updateActiveLinks() {
    if (!this.element) return;

    const allLinks = this.element.querySelectorAll('.nav-link');
    
    allLinks.forEach(link => {
      const linkPath = link.getAttribute('data-path');
      const isActive = this.isPathActive(linkPath);
      
      link.classList.toggle('active', isActive);
    });
  }

  isPathActive(linkPath) {
    if (!linkPath || !this.currentPath) return false;

    // Exact match for home
    if (linkPath === '/' && this.currentPath === '/') {
      return true;
    }

    // For other paths, check if current path starts with link path
    if (linkPath !== '/' && this.currentPath.startsWith(linkPath)) {
      return true;
    }

    return false;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    const menu = this.element.querySelector('#mobile-menu');
    const toggle = this.element.querySelector('.nav-mobile-toggle');
    
    if (menu && toggle) {
      menu.classList.toggle('open', this.isMobileMenuOpen);
      toggle.setAttribute('aria-expanded', this.isMobileMenuOpen.toString());
      
      if (this.isMobileMenuOpen) {
        toggle.innerHTML = '×';
      } else {
        toggle.innerHTML = '☰';
      }
    }
  }

  closeMobileMenu() {
    if (!this.isMobileMenuOpen) return;

    this.isMobileMenuOpen = false;
    
    const menu = this.element.querySelector('#mobile-menu');
    const toggle = this.element.querySelector('.nav-mobile-toggle');
    
    if (menu && toggle) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '☰';
    }
  }

  handleDocumentClick(e) {
    if (!this.isMobileMenuOpen) return;

    const menu = this.element.querySelector('#mobile-menu');
    const toggle = this.element.querySelector('.nav-mobile-toggle');
    
    // Close if click is outside menu and toggle
    if (menu && toggle && !menu.contains(e.target) && !toggle.contains(e.target)) {
      this.closeMobileMenu();
    }
  }

  addLink(link, position = -1) {
    if (position === -1) {
      this.options.links.push(link);
    } else {
      this.options.links.splice(position, 0, link);
    }
    
    // Re-render navigation if already rendered
    if (this.element) {
      this.updateNavigation();
    }
  }

  removeLink(path) {
    const index = this.options.links.findIndex(link => link.path === path);
    if (index !== -1) {
      this.options.links.splice(index, 1);
      
      // Re-render navigation if already rendered
      if (this.element) {
        this.updateNavigation();
      }
    }
  }

  updateLink(path, updates) {
    const link = this.options.links.find(link => link.path === path);
    if (link) {
      Object.assign(link, updates);
      
      // Re-render navigation if already rendered
      if (this.element) {
        this.updateNavigation();
      }
    }
  }

  updateNavigation() {
    // Re-create desktop nav
    const desktopNav = this.element.querySelector('.nav-links');
    if (desktopNav) {
      const newDesktopNav = this.createDesktopNav();
      desktopNav.parentNode.replaceChild(newDesktopNav, desktopNav);
    }

    // Re-create mobile nav
    const mobileLinks = this.element.querySelector('.nav-mobile-links');
    if (mobileLinks) {
      const newMobileLinks = this.createElement('ul', {
        className: 'nav-mobile-links'
      });

      this.options.links.forEach(link => {
        const li = this.createElement('li');
        const linkElement = this.createNavLink(link, true);
        li.appendChild(linkElement);
        newMobileLinks.appendChild(li);
      });

      mobileLinks.parentNode.replaceChild(newMobileLinks, mobileLinks);
    }

    // Update active states
    this.updateActiveLinks();
  }

  destroy() {
    // Remove document event listener
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
    
    super.destroy();
  }

  // Static method to create navigation from router
  static fromRouter(router, options = {}) {
    return new Navigation(router, options);
  }
}