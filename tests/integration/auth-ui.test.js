import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { AuthComponent } from '../../src/components/auth/AuthComponent.js'
import { AuthenticationService } from '../../src/services/auth-service.js'

// Setup DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Test</title>
    </head>
    <body>
      <div id="app">
        <div id="auth-forms"></div>
      </div>
    </body>
  </html>
`, { 
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
})

global.window = dom.window
global.document = dom.window.document
global.HTMLElement = dom.window.HTMLElement
global.HTMLFormElement = dom.window.HTMLFormElement
global.HTMLInputElement = dom.window.HTMLInputElement
global.HTMLButtonElement = dom.window.HTMLButtonElement
global.Event = dom.window.Event
global.FormData = dom.window.FormData

describe('Authentication Components Integration', () => {
  let authService
  let authComponent
  let container

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="app">
        <div id="auth-forms"></div>
      </div>
    `
    
    // Mock authentication service
    authService = {
      loginUser: vi.fn(),
      registerUser: vi.fn()
    }

    // Create container
    container = document.getElementById('auth-forms')
    
    // Create auth component
    authComponent = new AuthComponent(
      authService,
      vi.fn() // onAuthSuccess callback
    )
  })

  afterEach(() => {
    authComponent?.destroy()
  })

  describe('AuthComponent', () => {
    it('should render and mount successfully', () => {
      expect(authComponent).toBeDefined()
      
      authComponent.mount(container)
      
      expect(authComponent.element).toBeDefined()
      expect(container.contains(authComponent.element)).toBe(true)
    })

    it('should initialize with login form active', () => {
      authComponent.mount(container)
      
      expect(authComponent.getCurrentForm()).toBe('login')
      
      const loginForm = container.querySelector('#login-form')
      const registerForm = container.querySelector('#register-form')
      
      expect(loginForm).toBeDefined()
      expect(registerForm).toBeDefined()
      expect(loginForm.classList.contains('active')).toBe(true)
    })

    it('should switch between login and register forms', () => {
      authComponent.mount(container)
      
      // Initially should show login
      expect(authComponent.getCurrentForm()).toBe('login')
      
      // Switch to register
      authComponent.showRegister()
      expect(authComponent.getCurrentForm()).toBe('register')
      
      // Switch back to login
      authComponent.showLogin()
      expect(authComponent.getCurrentForm()).toBe('login')
    })

    it('should have form switch links working', () => {
      authComponent.mount(container)
      
      // Find switch link in login form
      const loginSwitchLink = container.querySelector('#login-form .auth-form-switch-link')
      expect(loginSwitchLink).toBeDefined()
      
      // Click should switch to register
      loginSwitchLink.click()
      expect(authComponent.getCurrentForm()).toBe('register')
      
      // Find switch link in register form
      const registerSwitchLink = container.querySelector('#register-form .auth-form-switch-link')
      expect(registerSwitchLink).toBeDefined()
      
      // Click should switch back to login
      registerSwitchLink.click()
      expect(authComponent.getCurrentForm()).toBe('login')
    })

    it('should validate email format in login form', () => {
      authComponent.mount(container)
      
      const emailInput = container.querySelector('#login-email')
      const emailError = container.querySelector('#login-email-error')
      
      expect(emailInput).toBeDefined()
      expect(emailError).toBeDefined()
      
      // Test invalid email
      emailInput.value = 'invalid-email'
      emailInput.dispatchEvent(new dom.window.Event('blur'))
      
      expect(emailError.textContent).toContain('valid email')
      expect(emailInput.getAttribute('aria-invalid')).toBe('true')
    })

    it('should validate password strength in register form', () => {
      authComponent.mount(container)
      authComponent.showRegister()
      
      const passwordInput = container.querySelector('#register-password')
      const strengthContainer = container.querySelector('#password-strength')
      
      expect(passwordInput).toBeDefined()
      expect(strengthContainer).toBeDefined()
      
      // Test weak password
      passwordInput.value = '123'
      passwordInput.dispatchEvent(new dom.window.Event('input'))
      
      expect(strengthContainer.classList.contains('password-strength-weak')).toBe(true)
      
      // Test strong password
      passwordInput.value = 'StrongPass123!'
      passwordInput.dispatchEvent(new dom.window.Event('input'))
      
      expect(strengthContainer.classList.contains('password-strength-strong')).toBe(true)
    })

    it('should validate password confirmation in register form', () => {
      authComponent.mount(container)
      authComponent.showRegister()
      
      const passwordInput = container.querySelector('#register-password')
      const confirmInput = container.querySelector('#register-confirm-password')
      const confirmError = container.querySelector('#register-confirm-password-error')
      
      expect(passwordInput).toBeDefined()
      expect(confirmInput).toBeDefined()
      expect(confirmError).toBeDefined()
      
      // Set different passwords
      passwordInput.value = 'password123'
      confirmInput.value = 'different123'
      confirmInput.dispatchEvent(new dom.window.Event('blur'))
      
      expect(confirmError.textContent).toContain('do not match')
      expect(confirmInput.getAttribute('aria-invalid')).toBe('true')
    })

    it('should reset forms when switching', () => {
      authComponent.mount(container)
      
      // Fill login form
      const loginEmail = container.querySelector('#login-email')
      const loginPassword = container.querySelector('#login-password')
      
      loginEmail.value = 'test@example.com'
      loginPassword.value = 'password123'
      
      // Switch to register
      authComponent.showRegister()
      
      // Switch back to login
      authComponent.showLogin()
      
      // Form should be reset
      expect(loginEmail.value).toBe('')
      expect(loginPassword.value).toBe('')
    })

    it('should clean up properly when destroyed', () => {
      authComponent.mount(container)
      
      expect(container.children.length).toBeGreaterThan(0)
      
      authComponent.destroy()
      
      expect(authComponent.destroyed).toBe(true)
      expect(authComponent.element).toBe(null)
    })
  })

  describe('Form Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      authComponent.mount(container)
      
      // Check login form
      const loginForm = container.querySelector('#login-form')
      const emailInput = container.querySelector('#login-email')
      const emailLabel = container.querySelector('label[for="login-email"]')
      
      expect(loginForm.getAttribute('novalidate')).toBe('')
      expect(emailInput.getAttribute('type')).toBe('email')
      expect(emailInput.getAttribute('required')).toBe('')
      expect(emailLabel.getAttribute('for')).toBe('login-email')
    })

    it('should link error messages to inputs', () => {
      authComponent.mount(container)
      
      const emailInput = container.querySelector('#login-email')
      
      // Trigger validation error
      emailInput.value = 'invalid'
      emailInput.dispatchEvent(new dom.window.Event('blur'))
      
      expect(emailInput.getAttribute('aria-invalid')).toBe('true')
      expect(emailInput.getAttribute('aria-describedby')).toBe('login-email-error')
    })

    it('should have live regions for errors', () => {
      authComponent.mount(container)
      
      const errorElements = container.querySelectorAll('.form-error[role="alert"]')
      
      expect(errorElements.length).toBeGreaterThan(0)
      
      errorElements.forEach(error => {
        expect(error.getAttribute('aria-live')).toBe('polite')
      })
    })

    it('should have proper form labels', () => {
      authComponent.mount(container)
      
      // Test login form labels
      const loginLabels = container.querySelectorAll('#login-form .form-label')
      expect(loginLabels.length).toBe(2) // email and password
      
      // Switch to register and test labels
      authComponent.showRegister()
      const registerLabels = container.querySelectorAll('#register-form .form-label')
      expect(registerLabels.length).toBe(4) // name, email, password, confirm
    })
  })
})