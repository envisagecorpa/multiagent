import { Component } from '../common/Component.js'
import { LoginForm } from './LoginForm.js'
import { RegisterForm } from './RegisterForm.js'

/**
 * Authentication component that manages login and registration forms
 */
export class AuthComponent extends Component {
  constructor(authService, onAuthSuccess) {
    super()
    this.authService = authService
    this.onAuthSuccess = onAuthSuccess
    this.currentForm = 'login'
    this.loginForm = null
    this.registerForm = null
  }

  render() {
    const container = this.createElement('div', {
      id: 'auth-forms',
      className: 'auth-forms'
    })

    return container
  }

  onMount() {
    this.initializeForms()
    this.showForm('login')
  }

  initializeForms() {
    // Create login form
    this.loginForm = new LoginForm(
      this.authService,
      (user) => this.handleAuthSuccess(user),
      () => this.showForm('register')
    )

    // Create register form
    this.registerForm = new RegisterForm(
      this.authService,
      (user) => this.handleAuthSuccess(user),
      () => this.showForm('login')
    )

    // Mount forms to container
    this.loginForm.mount(this.element)
    this.registerForm.mount(this.element)

    // Store as child components for cleanup
    this.addChild('login', this.loginForm)
    this.addChild('register', this.registerForm)
  }

  showForm(formType) {
    if (this.currentForm === formType) return

    const previousForm = this.currentForm
    this.currentForm = formType

    // Animate form transition
    this.animateFormTransition(previousForm, formType)

    // Reset forms when switching
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

  animateFormTransition(from, to) {
    const fromForm = from === 'login' ? this.loginForm : this.registerForm
    const toForm = to === 'login' ? this.loginForm : this.registerForm

    // Hide current form
    if (fromForm && fromForm.element) {
      fromForm.element.classList.remove('active')
      fromForm.element.style.opacity = '0'
      fromForm.element.style.transform = 'translateX(-2rem)'
    }

    // Show new form after animation
    setTimeout(() => {
      if (fromForm && fromForm.element) {
        fromForm.element.style.display = 'none'
        fromForm.element.style.opacity = ''
        fromForm.element.style.transform = ''
      }

      if (toForm && toForm.element) {
        toForm.element.style.display = 'block'
        toForm.element.style.opacity = '0'
        toForm.element.style.transform = 'translateX(2rem)'
        
        // Trigger reflow
        toForm.element.offsetHeight
        
        toForm.element.classList.add('active')
        toForm.element.style.opacity = '1'
        toForm.element.style.transform = 'translateX(0)'
      }
    }, 150)
  }

  handleAuthSuccess(user) {
    // Call the success callback
    this.onAuthSuccess(user)
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