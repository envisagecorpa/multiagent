import { Component } from '../common/Component.js'
import { LoginForm } from './LoginForm.js'
import { RegisterForm } from './RegisterForm.js'

/**
 * Authentication component that manages login and registration forms
 */
export class AuthComponent extends Component {
  constructor(container, options = {}) {
    console.log('🏗️ AuthComponent: constructor called');
    console.log('   container:', container);
    console.log('   options:', options);

    super(container)
    // Add container as an alias to element for consistency
    this.container = container
    this.authService = options.authService
    this.onLoginSuccess = options.onLoginSuccess
    this.onRegisterSuccess = options.onRegisterSuccess
    this.currentForm = 'login'
    this.loginForm = null
    this.registerForm = null

    console.log('🎨 AuthComponent: About to call render()');
    // Render immediately
    this.render()
    console.log('✅ AuthComponent: constructor complete');
  }

  render() {
    console.log('🎨 AuthComponent: render() called');
    console.log('   container:', this.container);

    if (!this.container) {
      console.error('❌ AuthComponent: container is null!');
      return;
    }

    console.log('✏️ AuthComponent: Setting innerHTML');
    this.container.innerHTML = `
      <div class="auth-section">
        <div class="auth-container">
          <div class="auth-header">
            <h1>Photo Album</h1>
            <p>Sign in to manage your photos</p>
          </div>
          <div class="auth-forms" id="auth-forms"></div>
        </div>
      </div>
    `;

    console.log('🔍 AuthComponent: Looking for forms container');
    const formsContainer = this.container.querySelector('#auth-forms');
    console.log('   formsContainer:', formsContainer);

    this.initializeForms(formsContainer);
    this.showForm('login');
    console.log('✅ AuthComponent: render() complete');
    console.log('   Final HTML length:', this.container.innerHTML.length);
  }

  initializeForms(formsContainer) {
    console.log('📋 AuthComponent: initializeForms called');
    console.log('   formsContainer:', formsContainer);

    if (!formsContainer) {
      console.error('❌ AuthComponent: formsContainer is null!');
      return;
    }

    // Create login form
    console.log('👤 AuthComponent: Creating LoginForm');
    this.loginForm = new LoginForm(
      this.authService,
      (user) => this.handleAuthSuccess(user),
      () => this.showForm('register')
    )

    // Create register form
    console.log('📝 AuthComponent: Creating RegisterForm');
    this.registerForm = new RegisterForm(
      this.authService,
      (user) => this.handleAuthSuccess(user),
      () => this.showForm('login')
    )

    // Mount forms to container
    console.log('🔧 AuthComponent: Mounting forms to container');
    this.loginForm.mount(formsContainer)
    this.registerForm.mount(formsContainer)

    // Register forms as children for proper cleanup
    this.addChild(this.loginForm, 'loginForm')
    this.addChild(this.registerForm, 'registerForm')

    console.log('✅ AuthComponent: Forms mounted');
    console.log('   formsContainer children:', formsContainer.children);
  }

  showForm(formType) {
    console.log('👁️ AuthComponent: showForm called with:', formType);
    console.log('   currentForm:', this.currentForm);

    // Allow showing the same form on initial render
    const isInitialRender = this.currentForm === formType && !this.loginForm?.element?.classList?.contains('active');

    if (this.currentForm === formType && !isInitialRender) {
      console.log('ℹ️ AuthComponent: Form already showing, skipping');
      return;
    }

    const previousForm = this.currentForm
    this.currentForm = formType

    console.log('🎬 AuthComponent: Animating form transition from', previousForm, 'to', formType);
    // Animate form transition
    this.animateFormTransition(previousForm, formType)

    // Reset forms when switching (but not on initial render)
    if (!isInitialRender) {
      if (formType === 'login') {
        this.registerForm.reset()
        // Focus the login form after animation
        setTimeout(() => this.loginForm.focus(), 300)
      } else {
        this.loginForm.reset()
        // Focus the register form after animation
        setTimeout(() => this.registerForm.focus(), 300)
      }
    }
  }

  animateFormTransition(from, to) {
    console.log('🎭 AuthComponent: animateFormTransition from', from, 'to', to);
    const fromForm = from === 'login' ? this.loginForm : this.registerForm
    const toForm = to === 'login' ? this.loginForm : this.registerForm

    console.log('   fromForm:', fromForm);
    console.log('   fromForm.element:', fromForm?.element);
    console.log('   toForm:', toForm);
    console.log('   toForm.element:', toForm?.element);

    // Hide current form
    if (fromForm && fromForm.element) {
      console.log('   Hiding fromForm');
      fromForm.element.classList.remove('active')
      fromForm.element.style.opacity = '0'
      fromForm.element.style.transform = 'translateX(-2rem)'
    }

    // Show new form after animation
    setTimeout(() => {
      if (fromForm && fromForm.element) {
        console.log('   Cleaning up fromForm styles');
        fromForm.element.style.display = 'none'
        fromForm.element.style.opacity = ''
        fromForm.element.style.transform = ''
      }

      if (toForm && toForm.element) {
        console.log('   Showing toForm');
        toForm.element.style.display = 'block'
        toForm.element.style.opacity = '0'
        toForm.element.style.transform = 'translateX(2rem)'

        // Trigger reflow
        toForm.element.offsetHeight

        toForm.element.classList.add('active')
        console.log('   toForm classes after adding active:', toForm.element.className);
        toForm.element.style.opacity = '1'
        toForm.element.style.transform = 'translateX(0)'
        console.log('✅ AuthComponent: toForm should now be visible');
      }
    }, 150)
  }

  handleAuthSuccess(user) {
    // Call both onLoginSuccess and onRegisterSuccess (same callback)
    if (this.onLoginSuccess) {
      this.onLoginSuccess(user)
    }
    if (this.onRegisterSuccess) {
      this.onRegisterSuccess(user)
    }
  }

  /**
   * Reset both forms to initial state
   */
  reset() {
    if (this.loginForm) {
      this.loginForm.reset()
    }
    if (this.registerForm) {
      this.registerForm.reset()
    }
    this.showForm('login')
  }

  /**
   * Show login form
   */
  showLogin() {
    this.showForm('login')
  }

  /**
   * Show register form
   */
  showRegister() {
    this.showForm('register')
  }

  /**
   * Get current active form
   */
  getCurrentForm() {
    return this.currentForm
  }

  onDestroy() {
    // Child components will be automatically destroyed by base class
    this.loginForm = null
    this.registerForm = null
  }
}