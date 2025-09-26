import { Component } from '../common/Component.js'
import { notifications } from '../common/NotificationManager.js'

/**
 * Registration form component with password strength validation
 */
export class RegisterForm extends Component {
  constructor(authService, onSuccess, onSwitchToLogin) {
    super()
    this.authService = authService
    this.onSuccess = onSuccess
    this.onSwitchToLogin = onSwitchToLogin
    this.isLoading = false
  }

  render() {
    const form = this.createElement('form', {
      className: 'auth-form',
      id: 'register-form',
      novalidate: true
    })

    // Form header
    const header = this.createElement('div', {
      className: 'auth-form-header'
    })

    const title = this.createElement('h2', {
      className: 'auth-form-title'
    }, 'Create Account')

    const subtitle = this.createElement('p', {
      className: 'auth-form-subtitle'
    }, 'Join us to start organizing your photos')

    header.appendChild(title)
    header.appendChild(subtitle)

    // Form body
    const body = this.createElement('div', {
      className: 'auth-form-body'
    })

    // Full name field
    const nameGroup = this.createElement('div', {
      className: 'form-group'
    })

    const nameLabel = this.createElement('label', {
      className: 'form-label',
      for: 'register-name'
    }, 'Full Name')

    const nameInput = this.createElement('input', {
      type: 'text',
      id: 'register-name',
      name: 'name',
      className: 'form-input',
      placeholder: 'Enter your full name',
      required: true,
      autocomplete: 'name'
    })

    const nameError = this.createElement('div', {
      className: 'form-error',
      id: 'register-name-error',
      role: 'alert',
      'aria-live': 'polite'
    })

    nameGroup.appendChild(nameLabel)
    nameGroup.appendChild(nameInput)
    nameGroup.appendChild(nameError)

    // Email field
    const emailGroup = this.createElement('div', {
      className: 'form-group'
    })

    const emailLabel = this.createElement('label', {
      className: 'form-label',
      for: 'register-email'
    }, 'Email Address')

    const emailInput = this.createElement('input', {
      type: 'email',
      id: 'register-email',
      name: 'email',
      className: 'form-input',
      placeholder: 'Enter your email',
      required: true,
      autocomplete: 'email'
    })

    const emailError = this.createElement('div', {
      className: 'form-error',
      id: 'register-email-error',
      role: 'alert',
      'aria-live': 'polite'
    })

    emailGroup.appendChild(emailLabel)
    emailGroup.appendChild(emailInput)
    emailGroup.appendChild(emailError)

    // Password field with strength indicator
    const passwordGroup = this.createElement('div', {
      className: 'form-group'
    })

    const passwordLabel = this.createElement('label', {
      className: 'form-label',
      for: 'register-password'
    }, 'Password')

    const passwordInput = this.createElement('input', {
      type: 'password',
      id: 'register-password',
      name: 'password',
      className: 'form-input',
      placeholder: 'Create a secure password',
      required: true,
      autocomplete: 'new-password'
    })

    const passwordError = this.createElement('div', {
      className: 'form-error',
      id: 'register-password-error',
      role: 'alert',
      'aria-live': 'polite'
    })

    // Password strength indicator
    const strengthContainer = this.createPasswordStrengthIndicator()

    passwordGroup.appendChild(passwordLabel)
    passwordGroup.appendChild(passwordInput)
    passwordGroup.appendChild(passwordError)
    passwordGroup.appendChild(strengthContainer)

    // Confirm password field
    const confirmGroup = this.createElement('div', {
      className: 'form-group'
    })

    const confirmLabel = this.createElement('label', {
      className: 'form-label',
      for: 'register-confirm-password'
    }, 'Confirm Password')

    const confirmInput = this.createElement('input', {
      type: 'password',
      id: 'register-confirm-password',
      name: 'confirmPassword',
      className: 'form-input',
      placeholder: 'Confirm your password',
      required: true,
      autocomplete: 'new-password'
    })

    const confirmError = this.createElement('div', {
      className: 'form-error',
      id: 'register-confirm-password-error',
      role: 'alert',
      'aria-live': 'polite'
    })

    confirmGroup.appendChild(confirmLabel)
    confirmGroup.appendChild(confirmInput)
    confirmGroup.appendChild(confirmError)

    body.appendChild(nameGroup)
    body.appendChild(emailGroup)
    body.appendChild(passwordGroup)
    body.appendChild(confirmGroup)

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
    }, 'Create Account')

    actions.appendChild(submitBtn)

    const switchText = this.createElement('p', {
      className: 'auth-form-switch'
    })

    switchText.appendChild(document.createTextNode('Already have an account? '))

    const switchLink = this.createElement('a', {
      href: '#',
      className: 'auth-form-switch-link',
      onclick: (e) => {
        e.preventDefault()
        this.onSwitchToLogin()
      }
    }, 'Sign in')

    switchText.appendChild(switchLink)

    footer.appendChild(actions)
    footer.appendChild(switchText)

    // Assemble form
    form.appendChild(header)
    form.appendChild(body)
    form.appendChild(footer)

    return form
  }

  createPasswordStrengthIndicator() {
    const container = this.createElement('div', {
      className: 'password-strength',
      id: 'password-strength'
    })

    const label = this.createElement('div', {
      className: 'password-strength-label'
    }, 'Password strength:')

    const bar = this.createElement('div', {
      className: 'password-strength-bar'
    })

    const fill = this.createElement('div', {
      className: 'password-strength-fill'
    })

    bar.appendChild(fill)

    const requirements = this.createElement('div', {
      className: 'password-requirements'
    })

    const requirementsList = [
      { id: 'length', text: 'At least 8 characters' },
      { id: 'uppercase', text: 'One uppercase letter' },
      { id: 'lowercase', text: 'One lowercase letter' },
      { id: 'number', text: 'One number' },
      { id: 'special', text: 'One special character' }
    ]

    requirementsList.forEach(req => {
      const item = this.createElement('div', {
        className: 'password-requirement',
        id: `req-${req.id}`
      })

      const icon = this.createElement('span', {
        className: 'password-requirement-icon'
      }, '○')

      const text = this.createElement('span', {}, req.text)

      item.appendChild(icon)
      item.appendChild(text)
      requirements.appendChild(item)
    })

    container.appendChild(label)
    container.appendChild(bar)
    container.appendChild(requirements)

    return container
  }

  onMount() {
    // Add form submission handler
    this.addEventListener(this.element, 'submit', this.handleSubmit)

    // Add real-time validation
    const nameInput = this.find('#register-name')
    const emailInput = this.find('#register-email')
    const passwordInput = this.find('#register-password')
    const confirmInput = this.find('#register-confirm-password')

    this.addEventListener(nameInput, 'blur', () => this.validateName())
    this.addEventListener(emailInput, 'blur', () => this.validateEmail())
    this.addEventListener(passwordInput, 'input', () => this.validatePassword())
    this.addEventListener(confirmInput, 'blur', () => this.validateConfirmPassword())
    
    // Clear errors on input
    this.addEventListener(nameInput, 'input', () => this.clearFieldError('name'))
    this.addEventListener(emailInput, 'input', () => this.clearFieldError('email'))
    this.addEventListener(passwordInput, 'input', () => this.clearFieldError('password'))
    this.addEventListener(confirmInput, 'input', () => this.clearFieldError('confirm-password'))
  }

  async handleSubmit(e) {
    e.preventDefault()

    if (this.isLoading) return

    const formData = new FormData(this.element)
    const name = formData.get('name').trim()
    const email = formData.get('email').trim()
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')

    // Validate form
    const isValid = this.validateForm(name, email, password, confirmPassword)
    if (!isValid) return

    this.setLoading(true)

    try {
      const result = await this.authService.registerUser(name, email, password)

      if (result.success) {
        notifications.success('Account created successfully! Welcome to Photo Album.')
        this.onSuccess(result.user)
      } else {
        this.handleRegistrationError(result.error)
      }
    } catch (error) {
      console.error('Registration error:', error)
      notifications.error('An unexpected error occurred. Please try again.')
    } finally {
      this.setLoading(false)
    }
  }

  validateForm(name, email, password, confirmPassword) {
    let isValid = true

    // Validate name
    if (!name) {
      this.showFieldError('name', 'Full name is required')
      isValid = false
    } else if (name.length < 2) {
      this.showFieldError('name', 'Name must be at least 2 characters long')
      isValid = false
    }

    // Validate email
    if (!email) {
      this.showFieldError('email', 'Email address is required')
      isValid = false
    } else if (!this.isValidEmail(email)) {
      this.showFieldError('email', 'Please enter a valid email address')
      isValid = false
    }

    // Validate password
    const passwordStrength = this.checkPasswordStrength(password)
    if (!password) {
      this.showFieldError('password', 'Password is required')
      isValid = false
    } else if (passwordStrength.score < 3) {
      this.showFieldError('password', 'Please create a stronger password')
      isValid = false
    }

    // Validate confirm password
    if (!confirmPassword) {
      this.showFieldError('confirm-password', 'Please confirm your password')
      isValid = false
    } else if (password !== confirmPassword) {
      this.showFieldError('confirm-password', 'Passwords do not match')
      isValid = false
    }

    return isValid
  }

  validateName() {
    const nameInput = this.find('#register-name')
    const name = nameInput.value.trim()

    if (name && name.length < 2) {
      this.showFieldError('name', 'Name must be at least 2 characters long')
      return false
    }

    this.clearFieldError('name')
    return true
  }

  validateEmail() {
    const emailInput = this.find('#register-email')
    const email = emailInput.value.trim()

    if (email && !this.isValidEmail(email)) {
      this.showFieldError('email', 'Please enter a valid email address')
      return false
    }

    this.clearFieldError('email')
    return true
  }

  validatePassword() {
    const passwordInput = this.find('#register-password')
    const password = passwordInput.value

    const strength = this.checkPasswordStrength(password)
    this.updatePasswordStrengthUI(strength)

    this.clearFieldError('password')
    return true
  }

  validateConfirmPassword() {
    const passwordInput = this.find('#register-password')
    const confirmInput = this.find('#register-confirm-password')
    const password = passwordInput.value
    const confirmPassword = confirmInput.value

    if (confirmPassword && password !== confirmPassword) {
      this.showFieldError('confirm-password', 'Passwords do not match')
      return false
    }

    this.clearFieldError('confirm-password')
    return true
  }

  checkPasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    }

    const score = Object.values(checks).filter(Boolean).length
    
    let level = 'weak'
    if (score >= 5) level = 'strong'
    else if (score >= 3) level = 'medium'

    return { checks, score, level }
  }

  updatePasswordStrengthUI(strength) {
    const container = this.find('#password-strength')
    const fill = this.find('.password-strength-fill')

    // Update strength bar
    container.className = `password-strength password-strength-${strength.level}`

    // Update requirement indicators
    Object.entries(strength.checks).forEach(([requirement, met]) => {
      const item = this.find(`#req-${requirement}`)
      const icon = item?.querySelector('.password-requirement-icon')
      
      if (item && icon) {
        if (met) {
          item.classList.add('met')
          icon.textContent = '✓'
        } else {
          item.classList.remove('met')
          icon.textContent = '○'
        }
      }
    })
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  showFieldError(field, message) {
    const errorElement = this.find(`#register-${field}-error`)
    const inputElement = this.find(`#register-${field}`)

    if (errorElement && inputElement) {
      errorElement.textContent = message
      inputElement.setAttribute('aria-invalid', 'true')
      inputElement.setAttribute('aria-describedby', `register-${field}-error`)
    }
  }

  clearFieldError(field) {
    const errorElement = this.find(`#register-${field}-error`)
    const inputElement = this.find(`#register-${field}`)

    if (errorElement && inputElement) {
      errorElement.textContent = ''
      inputElement.removeAttribute('aria-invalid')
      inputElement.removeAttribute('aria-describedby')
    }
  }

  handleRegistrationError(error) {
    switch (error) {
      case 'DUPLICATE_EMAIL':
        this.showFieldError('email', 'An account with this email already exists')
        notifications.error('This email is already registered. Please use a different email or try signing in.')
        break
      case 'WEAK_PASSWORD':
        notifications.error('Password is too weak. Please create a stronger password.')
        break
      case 'INVALID_EMAIL':
        this.showFieldError('email', 'Please enter a valid email address')
        break
      default:
        notifications.error('Registration failed. Please try again.')
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
    this.clearFieldError('name')
    this.clearFieldError('email')
    this.clearFieldError('password')
    this.clearFieldError('confirm-password')
    
    // Reset password strength indicator
    const container = this.find('#password-strength')
    if (container) {
      container.className = 'password-strength'
      const requirements = this.findAll('.password-requirement')
      requirements.forEach(req => {
        req.classList.remove('met')
        const icon = req.querySelector('.password-requirement-icon')
        if (icon) icon.textContent = '○'
      })
    }
    
    this.setLoading(false)
  }

  focus() {
    const nameInput = this.find('#register-name')
    if (nameInput) {
      nameInput.focus()
    }
  }
}