/**
 * Cart Attributes
 * Handles conditional field visibility and validation
 */

class CartAttributes {
  constructor() {
    this.builderRadios = document.querySelectorAll('input[name*="Builder"]');
    this.builderNameField = document.getElementById('builder-name-field');
    this.builderNameInput = document.getElementById('builder_name');
    this.checkoutButtons = document.querySelectorAll('button[name="checkout"], .cart__checkout-button, button[type="submit"][form*="cart"]');
    this.allRequiredFields = document.querySelectorAll('.cart-attributes-section .cart-form-control[required]');
    
    if (!this.builderRadios.length || !this.builderNameField) return;
    
    this.init();
  }

  init() {
    // Add event listeners to builder radio buttons
    this.builderRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.toggleBuilderNameField();
        this.validateForm();
      });
    });

    // Add event listeners to all required fields for validation
    this.allRequiredFields.forEach(field => {
      field.addEventListener('input', () => this.validateForm());
      field.addEventListener('change', () => this.validateForm());
    });

    // Check initial state (in case there's a saved value)
    this.checkInitialState();
    
    // Initial validation
    this.validateForm();
  }

  toggleBuilderNameField() {
    const selectedValue = document.querySelector('input[name*="Builder"]:checked')?.value;
    
    if (selectedValue === 'Yes') {
      this.builderNameField.style.display = 'flex';
      if (this.builderNameInput) {
        this.builderNameInput.required = true;
      }
    } else {
      this.builderNameField.style.display = 'none';
      if (this.builderNameInput) {
        this.builderNameInput.required = false;
        // Auto-fill with N/A when "No" is selected
        if (selectedValue === 'No' && !this.builderNameInput.value) {
          this.builderNameInput.value = 'N/A';
        }
      }
    }
  }

  validateForm() {
    let isValid = true;
    
    // Get all currently visible required fields
    const visibleRequiredFields = Array.from(this.allRequiredFields).filter(field => {
      return field.offsetParent !== null && field.required;
    });
    
    // Check if all visible required fields are filled
    visibleRequiredFields.forEach(field => {
      if (field.type === 'radio') {
        // For radio buttons, check if any in the group is selected
        const radioName = field.getAttribute('name');
        const isChecked = document.querySelector(`input[name="${radioName}"]:checked`);
        if (!isChecked) {
          isValid = false;
        }
      } else {
        // For other fields, check if they have a value
        if (!field.value || field.value.trim() === '') {
          isValid = false;
        }
      }
    });
    
    // Enable or disable checkout buttons
    this.checkoutButtons.forEach(button => {
      if (isValid) {
        button.disabled = false;
        button.removeAttribute('disabled');
      } else {
        button.disabled = true;
        button.setAttribute('disabled', 'disabled');
      }
    });
    
    console.log('Cart validation:', isValid ? '✅ Valid' : '❌ Invalid');
  }

  checkInitialState() {
    const selectedRadio = document.querySelector('input[name*="Builder"]:checked');
    if (selectedRadio) {
      this.toggleBuilderNameField();
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CartAttributes();
  });
} else {
  new CartAttributes();
}

