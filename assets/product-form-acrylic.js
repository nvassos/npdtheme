/**
 * Acrylic Product Form Handler
 */

class AcrylicProductForm {
  constructor() {
    this.form = document.getElementById('product-form-acrylic');
    if (!this.form) return;

    this.variantIdInput = document.getElementById('product-variant-id');
    this.quantityInput = document.getElementById('quantity-input');
    this.increaseBtn = document.getElementById('increase-qty');
    this.decreaseBtn = document.getElementById('decrease-qty');
    this.addToCartBtn = document.getElementById('add-to-cart-btn');
    this.priceElement = document.querySelector('.price-amount');
    this.featuredImage = document.getElementById('product-featured-image');

    // Load variant data
    const variantsDataEl = document.getElementById('product-variants-data');
    this.variants = variantsDataEl ? JSON.parse(variantsDataEl.textContent).variants : [];
    this.currentVariant = this.variants[0] || null;

    this.init();
  }

  init() {
    this.setupQuantityControls();
    this.setupOptionButtons();
    this.setupFormSubmit();
    this.initializeCurrentVariant();
  }

  setupQuantityControls() {
    if (this.increaseBtn) {
      this.increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(this.quantityInput.value) || 1;
        this.quantityInput.value = currentValue + 1;
        this.updatePriceByQuantity();
      });
    }

    if (this.decreaseBtn) {
      this.decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(this.quantityInput.value) || 1;
        if (currentValue > 1) {
          this.quantityInput.value = currentValue - 1;
          this.updatePriceByQuantity();
        }
      });
    }

    if (this.quantityInput) {
      this.quantityInput.addEventListener('change', () => {
        const value = parseInt(this.quantityInput.value) || 1;
        if (value < 1) this.quantityInput.value = 1;
        this.updatePriceByQuantity();
      });
    }
  }

  setupOptionButtons() {
    const optionGroups = document.querySelectorAll('.option-buttons');
    
    optionGroups.forEach((group) => {
      const buttons = group.querySelectorAll('.option-button');
      
      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          // Remove selected from siblings
          buttons.forEach(btn => btn.classList.remove('selected'));
          // Add selected to clicked
          button.classList.add('selected');
          
          // Update variant
          this.updateVariantFromOptions();
        });
      });
    });
  }

  updateVariantFromOptions() {
    const selectedOptions = [];
    const optionGroups = document.querySelectorAll('.option-buttons');
    
    optionGroups.forEach((group) => {
      const selectedButton = group.querySelector('.option-button.selected');
      if (selectedButton) {
        selectedOptions.push(selectedButton.dataset.optionValue);
      }
    });

    // Find matching variant
    const matchingVariant = this.variants.find(variant => {
      return variant.options.every((option, index) => option === selectedOptions[index]);
    });

    if (matchingVariant) {
      this.currentVariant = matchingVariant;
      this.updateVariant();
    }
  }

  updateVariant() {
    if (!this.currentVariant) return;

    // Update hidden input
    this.variantIdInput.value = this.currentVariant.id;

    // Update price
    this.updatePriceByQuantity();

    // Update image if available
    if (this.currentVariant.featured_image && this.featuredImage) {
      this.featuredImage.src = this.currentVariant.featured_image;
    }
  }

  updatePriceByQuantity() {
    if (!this.currentVariant || !this.priceElement) return;

    const basePriceCents = parseInt(this.priceElement.getAttribute('data-base-price-cents') || 0, 10);
    if (!basePriceCents) return;
    
    const quantity = parseInt(this.quantityInput?.value || 1, 10);
    
    // Apply 70% discount (multiply by 0.3 to get 30% of original)
    const discountedPriceCents = Math.round(basePriceCents * 0.3);
    
    // Calculate total in cents
    const totalCents = discountedPriceCents * quantity;
    
    // Convert to dollars
    const dollars = Math.floor(totalCents / 100);
    const cents = totalCents % 100;
    const centsDisplay = cents < 10 ? `0${cents}` : cents;
    
    this.priceElement.textContent = `$${dollars}.${centsDisplay} USD`;
  }

  initializeCurrentVariant() {
    if (this.currentVariant && this.currentVariant.metafields?.cost_variant) {
      this.priceElement.setAttribute('data-base-price-cents', this.currentVariant.metafields.cost_variant);
      this.updatePriceByQuantity();
    }
  }

  setupFormSubmit() {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(this.form);
      
      // Add cost_variant as property
      if (this.currentVariant?.metafields?.cost_variant) {
        formData.append('properties[_cost_variant]', this.currentVariant.metafields.cost_variant);
      }

      // Update button state
      this.addToCartBtn.disabled = true;
      this.addToCartBtn.querySelector('.btn-text').textContent = 'Adding...';

      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Failed to add to cart');
        }

        const data = await response.json();
        console.log('Added to cart:', data);

        // Success feedback
        this.addToCartBtn.querySelector('.btn-text').textContent = 'Added!';
        
        // Dispatch cart update event
        document.dispatchEvent(new CustomEvent('cart:update'));

        // Reset button after delay
        setTimeout(() => {
          this.addToCartBtn.disabled = false;
          this.addToCartBtn.querySelector('.btn-text').textContent = 'Add to Cart';
        }, 2000);

      } catch (error) {
        console.error('Error adding to cart:', error);
        this.addToCartBtn.querySelector('.btn-text').textContent = 'Error - Try Again';
        
        setTimeout(() => {
          this.addToCartBtn.disabled = false;
          this.addToCartBtn.querySelector('.btn-text').textContent = 'Add to Cart';
        }, 3000);
      }
    });
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AcrylicProductForm();
  });
} else {
  new AcrylicProductForm();
}

