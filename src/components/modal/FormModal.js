import { Modal } from './Modal.js';

export class FormModal extends Modal {
  constructor(options = {}) {
    super({
      size: options.size || 'md',
      title: options.title || 'Form',
      className: `modal-form ${options.className || ''}`.trim(),
      ...options
    });

    this.formData = {};
    this.validators = {};
    this.errors = {};
    this.fields = options.fields || [];
    this.submitText = options.submitText || 'Submit';
    this.cancelText = options.cancelText || 'Cancel';
    this.onSubmit = options.onSubmit || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.validateOnChange = options.validateOnChange !== false;
  }

  render() {
    super.render();
    this.createForm();
    this.createFormFooter();
    return this.overlay;
  }

  createForm() {
    this.form = this.createElement('form', {
      className: 'modal-form-content',
      noValidate: true
    });

    this.fields.forEach(field => {
      const fieldElement = this.createField(field);
      this.form.appendChild(fieldElement);
    });

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    this.setContent(this.form);
  }

  createField(fieldConfig) {
    const fieldGroup = this.createElement('div', {
      className: 'form-group',
      'data-field': fieldConfig.name
    });

    // Label
    if (fieldConfig.label) {
      const label = this.createElement('label', {
        className: 'form-label',
        textContent: fieldConfig.label,
        htmlFor: `field-${fieldConfig.name}`
      });

      if (fieldConfig.required) {
        label.innerHTML += ' <span class="form-required">*</span>';
      }

      fieldGroup.appendChild(label);
    }

    // Input element
    let inputElement;
    const inputConfig = {
      id: `field-${fieldConfig.name}`,
      name: fieldConfig.name,
      className: 'form-input',
      placeholder: fieldConfig.placeholder || '',
      required: fieldConfig.required || false
    };

    switch (fieldConfig.type) {
      case 'textarea':
        inputElement = this.createElement('textarea', {
          ...inputConfig,
          className: 'form-textarea',
          rows: fieldConfig.rows || 3
        });
        break;

      case 'select':
        inputElement = this.createElement('select', {
          ...inputConfig,
          className: 'form-select'
        });

        // Add options
        if (fieldConfig.options) {
          fieldConfig.options.forEach(option => {
            const optionElement = this.createElement('option', {
              value: option.value,
              textContent: option.label
            });
            inputElement.appendChild(optionElement);
          });
        }
        break;

      case 'checkbox':
        const checkboxWrapper = this.createElement('div', {
          className: 'form-checkbox-wrapper'
        });

        inputElement = this.createElement('input', {
          ...inputConfig,
          type: 'checkbox',
          className: 'form-checkbox'
        });

        const checkboxLabel = this.createElement('label', {
          className: 'form-checkbox-label',
          textContent: fieldConfig.checkboxLabel || fieldConfig.label,
          htmlFor: inputConfig.id
        });

        checkboxWrapper.appendChild(inputElement);
        checkboxWrapper.appendChild(checkboxLabel);
        fieldGroup.appendChild(checkboxWrapper);
        break;

      case 'radio':
        const radioGroup = this.createElement('div', {
          className: 'form-radio-group'
        });

        fieldConfig.options.forEach((option, index) => {
          const radioWrapper = this.createElement('div', {
            className: 'form-radio-wrapper'
          });

          const radioInput = this.createElement('input', {
            type: 'radio',
            id: `${fieldConfig.name}-${index}`,
            name: fieldConfig.name,
            value: option.value,
            className: 'form-radio',
            required: fieldConfig.required
          });

          const radioLabel = this.createElement('label', {
            className: 'form-radio-label',
            textContent: option.label,
            htmlFor: `${fieldConfig.name}-${index}`
          });

          radioWrapper.appendChild(radioInput);
          radioWrapper.appendChild(radioLabel);
          radioGroup.appendChild(radioWrapper);
        });

        fieldGroup.appendChild(radioGroup);
        inputElement = radioGroup; // For reference
        break;

      case 'file':
        inputElement = this.createElement('input', {
          ...inputConfig,
          type: 'file',
          className: 'form-file',
          accept: fieldConfig.accept || '',
          multiple: fieldConfig.multiple || false
        });
        break;

      default:
        inputElement = this.createElement('input', {
          ...inputConfig,
          type: fieldConfig.type || 'text'
        });
    }

    if (fieldConfig.type !== 'checkbox' && fieldConfig.type !== 'radio') {
      fieldGroup.appendChild(inputElement);
    }

    // Help text
    if (fieldConfig.help) {
      const helpText = this.createElement('div', {
        className: 'form-help',
        textContent: fieldConfig.help
      });
      fieldGroup.appendChild(helpText);
    }

    // Error container
    const errorContainer = this.createElement('div', {
      className: 'form-error',
      id: `error-${fieldConfig.name}`
    });
    fieldGroup.appendChild(errorContainer);

    // Setup validation
    this.setupFieldValidation(fieldConfig, inputElement);

    // Set default value
    if (fieldConfig.defaultValue !== undefined) {
      this.setFieldValue(fieldConfig.name, fieldConfig.defaultValue);
    }

    return fieldGroup;
  }

  setupFieldValidation(fieldConfig, inputElement) {
    // Store validator
    if (fieldConfig.validator) {
      this.validators[fieldConfig.name] = fieldConfig.validator;
    }

    // Setup change handler
    const handleChange = () => {
      const value = this.getFieldValue(fieldConfig.name);
      this.formData[fieldConfig.name] = value;

      if (this.validateOnChange) {
        this.validateField(fieldConfig.name);
      }
    };

    if (fieldConfig.type === 'radio') {
      const radioInputs = inputElement.querySelectorAll('input[type="radio"]');
      radioInputs.forEach(radio => {
        radio.addEventListener('change', handleChange);
      });
    } else if (inputElement.addEventListener) {
      inputElement.addEventListener('input', handleChange);
      inputElement.addEventListener('change', handleChange);
    }
  }

  createFormFooter() {
    const actions = [
      {
        text: this.cancelText,
        className: 'modal-btn-secondary',
        onClick: () => {
          this.close();
          this.onCancel();
        }
      },
      {
        text: this.submitText,
        className: 'modal-btn-primary',
        type: 'submit',
        onClick: () => this.handleSubmit()
      }
    ];

    this.options.actions = actions;
    this.footer = this.createFooter();
    this.modal.appendChild(this.footer);
  }

  async handleSubmit() {
    // Collect all form data
    this.collectFormData();

    // Validate all fields
    const isValid = this.validateForm();
    if (!isValid) {
      this.focusFirstError();
      return;
    }

    try {
      // Show loading state
      this.setSubmitLoading(true);

      // Call submit handler
      const result = await this.onSubmit(this.formData);

      // Close modal if submit was successful
      if (result !== false) {
        this.close();
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.showSubmitError(error.message || 'An error occurred while submitting the form');
    } finally {
      this.setSubmitLoading(false);
    }
  }

  collectFormData() {
    this.fields.forEach(field => {
      this.formData[field.name] = this.getFieldValue(field.name);
    });
  }

  validateForm() {
    this.errors = {};
    let isValid = true;

    this.fields.forEach(field => {
      if (!this.validateField(field.name)) {
        isValid = false;
      }
    });

    return isValid;
  }

  validateField(fieldName) {
    const field = this.fields.find(f => f.name === fieldName);
    if (!field) return true;

    const value = this.getFieldValue(fieldName);
    let error = null;

    // Required validation
    if (field.required && (value === null || value === undefined || value === '')) {
      error = `${field.label || fieldName} is required`;
    }

    // Custom validator
    if (!error && this.validators[fieldName]) {
      try {
        const validationResult = this.validators[fieldName](value, this.formData);
        if (validationResult !== true) {
          error = validationResult || 'Invalid value';
        }
      } catch (e) {
        error = e.message || 'Validation error';
      }
    }

    // Update error display
    this.setFieldError(fieldName, error);
    
    return !error;
  }

  getFieldValue(fieldName) {
    const field = this.fields.find(f => f.name === fieldName);
    if (!field) return null;

    switch (field.type) {
      case 'checkbox':
        const checkbox = this.form.querySelector(`input[name="${fieldName}"]`);
        return checkbox ? checkbox.checked : false;

      case 'radio':
        const radioInput = this.form.querySelector(`input[name="${fieldName}"]:checked`);
        return radioInput ? radioInput.value : null;

      case 'file':
        const fileInput = this.form.querySelector(`input[name="${fieldName}"]`);
        return fileInput ? fileInput.files : null;

      default:
        const input = this.form.querySelector(`[name="${fieldName}"]`);
        return input ? input.value : null;
    }
  }

  setFieldValue(fieldName, value) {
    const field = this.fields.find(f => f.name === fieldName);
    if (!field) return;

    switch (field.type) {
      case 'checkbox':
        const checkbox = this.form.querySelector(`input[name="${fieldName}"]`);
        if (checkbox) checkbox.checked = Boolean(value);
        break;

      case 'radio':
        const radioInput = this.form.querySelector(`input[name="${fieldName}"][value="${value}"]`);
        if (radioInput) radioInput.checked = true;
        break;

      default:
        const input = this.form.querySelector(`[name="${fieldName}"]`);
        if (input) input.value = value || '';
    }

    this.formData[fieldName] = value;
  }

  setFieldError(fieldName, error) {
    const errorContainer = this.form.querySelector(`#error-${fieldName}`);
    const fieldGroup = this.form.querySelector(`[data-field="${fieldName}"]`);
    
    if (errorContainer) {
      if (error) {
        errorContainer.textContent = error;
        errorContainer.style.display = 'block';
        fieldGroup?.classList.add('has-error');
        this.errors[fieldName] = error;
      } else {
        errorContainer.textContent = '';
        errorContainer.style.display = 'none';
        fieldGroup?.classList.remove('has-error');
        delete this.errors[fieldName];
      }
    }
  }

  setSubmitLoading(loading) {
    const submitBtn = this.footer?.querySelector('.modal-btn-primary');
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.innerHTML = loading 
        ? '<div class="modal-loading-spinner"></div> Submitting...'
        : this.submitText;
    }
  }

  showSubmitError(message) {
    // Create or update error message
    let errorElement = this.form.querySelector('.form-submit-error');
    if (!errorElement) {
      errorElement = this.createElement('div', {
        className: 'form-submit-error form-error'
      });
      this.form.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  focusFirstError() {
    const firstErrorField = Object.keys(this.errors)[0];
    if (firstErrorField) {
      const input = this.form.querySelector(`[name="${firstErrorField}"]`);
      if (input) {
        input.focus();
      }
    }
  }

  getFormData() {
    return { ...this.formData };
  }

  setFormData(data) {
    Object.keys(data).forEach(fieldName => {
      this.setFieldValue(fieldName, data[fieldName]);
    });
  }

  resetForm() {
    this.formData = {};
    this.errors = {};
    
    this.fields.forEach(field => {
      this.setFieldValue(field.name, field.defaultValue || '');
      this.setFieldError(field.name, null);
    });

    // Clear submit error
    const submitError = this.form.querySelector('.form-submit-error');
    if (submitError) {
      submitError.style.display = 'none';
    }
  }

  // Static helper for creating common form modals
  static createAlbumForm(album = null, options = {}) {
    const isEdit = Boolean(album);
    
    return new FormModal({
      title: isEdit ? 'Edit Album' : 'Create Album',
      size: 'md',
      submitText: isEdit ? 'Update' : 'Create',
      fields: [
        {
          name: 'title',
          label: 'Album Title',
          type: 'text',
          required: true,
          placeholder: 'Enter album title',
          defaultValue: album?.title || '',
          validator: (value) => {
            if (value.trim().length < 2) {
              return 'Title must be at least 2 characters long';
            }
            return true;
          }
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Enter album description (optional)',
          defaultValue: album?.description || '',
          rows: 3
        },
        {
          name: 'isPrivate',
          label: 'Privacy',
          type: 'checkbox',
          checkboxLabel: 'Make this album private',
          defaultValue: album?.isPrivate || false
        }
      ],
      ...options
    });
  }

  static createPhotoEditForm(photo, options = {}) {
    return new FormModal({
      title: 'Edit Photo',
      size: 'md',
      submitText: 'Update',
      fields: [
        {
          name: 'title',
          label: 'Photo Title',
          type: 'text',
          placeholder: 'Enter photo title (optional)',
          defaultValue: photo?.title || ''
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Enter photo description (optional)',
          defaultValue: photo.description || '',
          rows: 3
        },
        {
          name: 'tags',
          label: 'Tags',
          type: 'text',
          placeholder: 'Enter tags separated by commas',
          defaultValue: photo.tags ? photo.tags.join(', ') : '',
          help: 'Separate multiple tags with commas'
        }
      ],
      ...options
    });
  }
}