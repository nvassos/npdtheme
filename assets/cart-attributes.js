/**
 * Cart Attributes
 * Handles conditional field visibility and validation
 */

class CartAttributes {
  constructor() {
    this.builderRadios = document.querySelectorAll('input[name*="Builder"]');
    this.builderNameField = document.getElementById('builder-name-field');
    this.builderNameInput = document.getElementById('builder_name');
    
    if (!this.builderRadios.length || !this.builderNameField) return;
    
    this.init();
  }

  init() {
    // Add event listeners to builder radio buttons
    this.builderRadios.forEach(radio => {
      radio.addEventListener('change', () => this.toggleBuilderNameField());
    });

    // Check initial state (in case there's a saved value)
    this.checkInitialState();
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

