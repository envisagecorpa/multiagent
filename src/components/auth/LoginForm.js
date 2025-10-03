import { Component } from '../common/Component.js'
import { notifications } from '../common/NotificationManager.js'

/**
 * Login form component
 */
export class LoginForm extends Component {
  constructor(authService, onSuccess, onSwitchToRegister) {
    super()
    this.authService = authService
    this.onSuccess = onSuccess
    this.onSwitchToRegister = onSwitchToRegister
    this.isLoading = false
  }

  render() {
    const form = this.createElement('form', {
      className: 'auth-form active',
      id: 'login-form',
      novalidate: true
    })

    // Form header
    const header = this.createElement('div', {
      className: 'auth-form-header'
    })

    const title = this.createElement('h2', {
      className: 'auth-form-title'
    }, 'Welcome Back')

    const subtitle = this.createElement('p', {
      className: 'auth-form-subtitle'
    }, 'Sign in to your account to continue')

    header.appendChild(title)
    header.appendChild(subtitle)

    // Form body
    const body = this.createElement('div', {
      className: 'auth-form-body'
    })

    // Email field
    const emailGroup = this.createElement('div', {
      className: 'form-group'
    })

    const emailLabel = this.createElement('label', {
      className: 'form-label',
      for: 'login-email'
    }, 'Email Address')

    const emailInput = this.createElement('input', {
      type: 'email',
      id: 'login-email',
      name: 'email',
      className: 'form-input',
      placeholder: 'Enter your email',
      required: true,
      autocomplete: 'email'
    })

    const emailError = this.createElement('div', {
      className: 'form-error',
      id: 'login-email-error',
      role: 'alert',
      'aria-live': 'polite'
    })

    emailGroup.appendChild(emailLabel)
    emailGroup.appendChild(emailInput)
    emailGroup.appendChild(emailError)

    // Password field
    const passwordGroup = this.createElement('div', {
      className: 'form-group'
    })

    const passwordLabel = this.createElement('label', {
      className: 'form-label',
      for: 'login-password'
    }, 'Password')

    const passwordInput = this.createElement('input', {
      type: 'password',
      id: 'login-password',
      name: 'password',
      className: 'form-input',
      placeholder: 'Enter your password',
      required: true,
      autocomplete: 'current-password'
    })

    const passwordError = this.createElement('div', {
      className: 'form-error',
      id: 'login-password-error',
      role: 'alert',
      'aria-live': 'polite'
    })

    passwordGroup.appendChild(passwordLabel)
    passwordGroup.appendChild(passwordInput)
    passwordGroup.appendChild(passwordError)

    body.appendChild(emailGroup)
    body.appendChild(passwordGroup)

    // Form footer
    const footer = this.createElement('div', {
      className: 'auth-form-footer'
    })

    const actions = this.createElement('div', {
      className: 'auth-form-actions'
    })

    const submitBtn = this.createElement('button', {
      type: 'submit',
      className: 'btn btn-primary auth-form-submit'
    }, 'Sign In')

    actions.appendChild(submitBtn)

    const switchText = this.createElement('p', {
      className: 'auth-form-switch'
    })

    switchText.appendChild(document.createTextNode("Don't have an account? "))

    const switchLink = this.createElement('a', {
      href: '#',
      className: 'auth-form-switch-link',
      onclick: (e) => {
        e.preventDefault()
        this.onSwitchToRegister()
      }
    }, 'Create one')

    switchText.appendChild(switchLink)

    footer.appendChild(actions)
    footer.appendChild(switchText)

    // Assemble form
    form.appendChild(header)
    form.appendChild(body)
    form.appendChild(footer)

    return form
  }

  onMount() {
    console.log('🎬 LoginForm: onMount() called')
    console.log('   this.element:', this.element)
    console.log('   this.handleSubmit:', this.handleSubmit)

    // Add form submission handler
    this.addEventListener(this.element, 'submit', this.handleSubmit)
    console.log('✅ LoginForm: Submit handler registered')

    // Add real-time validation
    const emailInput = this.find('#login-email')
    const passwordInput = this.find('#login-password')

    console.log('   emailInput:', emailInput)
    console.log('   passwordInput:', passwordInput)

    if (emailInput) {
      this.addEventListener(emailInput, 'blur', () => this.validateEmail())
      this.addEventListener(emailInput, 'input', () => this.clearFieldError('email'))
      console.log('✅ LoginForm: Email input listeners registered')
    }

    if (passwordInput) {
      this.addEventListener(passwordInput, 'blur', () => this.validatePassword())
      this.addEventListener(passwordInput, 'input', () => this.clearFieldError('password'))
      console.log('✅ LoginForm: Password input listeners registered')
    }

    console.log('🏁 LoginForm: onMount() complete')
  }

  handleSubmit = async (e) => {
    console.log('🔑 LoginForm: handleSubmit called')
    console.log('   event:', e)
    console.log('   this:', this)
    console.log('   this.element:', this.element)
    console.log('   this.authService:', this.authService)
    console.log('   this.isLoading:', this.isLoading)

    e.preventDefault()
    console.log('   preventDefault() called')

    if (this.isLoading) {
      console.log('⏳ LoginForm: Already loading, returning early')
      return
    }

    const formData = new FormData(this.element)
    const email = formData.get('email')?.trim()
    const password = formData.get('password')

    console.log('📝 LoginForm: Form data extracted')
    console.log('   email:', email)
    console.log('   password:', password ? '***' : '(empty)')

    // Validate form
    const isValid = this.validateForm(email, password)
    console.log('✓ LoginForm: Form validation result:', isValid)
    if (!isValid) {
      console.log('❌ LoginForm: Validation failed, returning')
      return
    }

    console.log('🚀 LoginForm: Starting login process')
    this.setLoading(true)

    try {
      console.log('📡 LoginForm: Calling authService.loginUser()')
      const result = await this.authService.loginUser(email, password)
      console.log('📬 LoginForm: Login result received:', result)

      if (result.success) {
        console.log('✅ LoginForm: Login successful')
        notifications.success('Welcome back! You have been signed in successfully.')
        this.onSuccess(result.user)
      } else {
        console.log('❌ LoginForm: Login failed:', result.error)
        this.handleLoginError(result.error)
      }
    } catch (error) {
      console.error('💥 LoginForm: Exception during login:', error)
      notifications.error('An unexpected error occurred. Please try again.')
    } finally {
      console.log('🏁 LoginForm: Setting loading to false')
      this.setLoading(false)
    }
  }

  validateForm(email, password) {
    let isValid = true

    // Validate email
    if (!email) {
      this.showFieldError('email', 'Email address is required')
      isValid = false
    } else if (!this.isValidEmail(email)) {
      this.showFieldError('email', 'Please enter a valid email address')
      isValid = false
    }

    // Validate password
    if (!password) {
      this.showFieldError('password', 'Password is required')
      isValid = false
    }

    return isValid
  }

  validateEmail() {
    const emailInput = this.find('#login-email')
    const email = emailInput.value.trim()

    if (email && !this.isValidEmail(email)) {
      this.showFieldError('email', 'Please enter a valid email address')
      return false
    }

    this.clearFieldError('email')
    return true
  }

  validatePassword() {
    const passwordInput = this.find('#login-password')
    const password = passwordInput.value

    if (password && password.length < 8) {
      this.showFieldError('password', 'Password must be at least 8 characters long')
      return false
    }

    this.clearFieldError('password')
    return true
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  showFieldError(field, message) {
    const errorElement = this.find(`#login-${field}-error`)
    const inputElement = this.find(`#login-${field}`)

    if (errorElement && inputElement) {
      errorElement.textContent = message
      inputElement.setAttribute('aria-invalid', 'true')
      inputElement.setAttribute('aria-describedby', `login-${field}-error`)
    }
  }

  clearFieldError(field) {
    const errorElement = this.find(`#login-${field}-error`)
    const inputElement = this.find(`#login-${field}`)

    if (errorElement && inputElement) {
      errorElement.textContent = ''
      inputElement.removeAttribute('aria-invalid')
      inputElement.removeAttribute('aria-describedby')
    }
  }

  handleLoginError(error) {
    switch (error) {
      case 'INVALID_CREDENTIALS':
        notifications.error('Invalid email or password. Please check your credentials and try again.')
        break
      case 'USER_NOT_FOUND':
        notifications.error('No account found with this email address.')
        break
      case 'ACCOUNT_LOCKED':
        notifications.error('Your account has been temporarily locked due to too many failed login attempts.')
        break
      default:
        notifications.error('Login failed. Please try again.')
    }
  }

  setLoading(loading) {
    this.isLoading = loading
    
    if (loading) {
      this.element.classList.add('loading')
    } else {
      this.element.classList.remove('loading')
    }

    // Disable/enable form elements
    const inputs = this.findAll('input, button')
    inputs.forEach(input => {
      input.disabled = loading
    })
  }

  reset() {
    this.element.reset()
    this.clearFieldError('email')
    this.clearFieldError('password')
    this.setLoading(false)
  }

  focus() {
    const emailInput = this.find('#login-email')
    if (emailInput) {
      emailInput.focus()
    }
  }
}