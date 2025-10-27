if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();

      this.form = this.querySelector('form');
      this.quantityInput = this.querySelector('#quantity');
      this.addButton = this.querySelector('[name="add"]');
      this.variantIdInput = this.querySelector('.product-variant-id');
      
      this.setupQuantityControls();
      this.setupOptionButtons();
      this.setupFormSubmit();
      
      // Initialize shipping notice
      this.updateShippingNotice();
    }

    setupQuantityControls() {
      const minusBtn = this.querySelector('.quantity-minus');
      const plusBtn = this.querySelector('.quantity-plus');
      
      if (minusBtn) {
        minusBtn.addEventListener('click', () => {
          const currentValue = parseInt(this.quantityInput.value) || 1;
          if (currentValue > 1) {
            this.quantityInput.value = currentValue - 1;
          }
        });
      }
      
      if (plusBtn) {
        plusBtn.addEventListener('click', () => {
          const currentValue = parseInt(this.quantityInput.value) || 1;
          const maxValue = parseInt(this.quantityInput.getAttribute('max')) || 99;
          if (currentValue < maxValue) {
            this.quantityInput.value = currentValue + 1;
          }
        });
      }
      
      // Validate input on change
      if (this.quantityInput) {
        this.quantityInput.addEventListener('change', () => {
          const value = parseInt(this.quantityInput.value) || 1;
          const min = parseInt(this.quantityInput.getAttribute('min')) || 1;
          const max = parseInt(this.quantityInput.getAttribute('max')) || 99;
          
          if (value < min) this.quantityInput.value = min;
          if (value > max) this.quantityInput.value = max;
        });
      }
    }

    setupOptionButtons() {
      const optionGroups = this.querySelectorAll('.option-buttons:not(.custom-option-buttons)');
      
      optionGroups.forEach(group => {
        group.addEventListener('click', (e) => {
          const button = e.target.closest('.option-button');
          
          if (button && !button.disabled) {
            // Remove selected from siblings
            group.querySelectorAll('.option-button').forEach(btn => {
              btn.classList.remove('selected');
            });
            
            // Add selected to clicked button
            button.classList.add('selected');
            
            // Update variant
            this.updateVariant();
            
            // Update shipping notice
            this.updateShippingNotice();
          }
        });
      });
    }


    updateVariant() {
      const variantSelector = this.querySelector('variant-selects');
      if (!variantSelector) return;
      
      const variantsJson = variantSelector.querySelector('.product-variants-json');
      if (!variantsJson) return;
      
      const variants = JSON.parse(variantsJson.textContent);
      
      // Get selected options
      const selectedOptions = [];
      const optionGroups = variantSelector.querySelectorAll('.option-buttons:not(.custom-option-buttons)');
      
      optionGroups.forEach(group => {
        const selected = group.querySelector('.option-button.selected');
        if (selected) {
          selectedOptions.push(selected.dataset.optionValue);
        }
      });
      
      // Find matching variant
      const matchingVariant = variants.find(variant => {
        return selectedOptions.every((option, index) => {
          return variant[`option${index + 1}`] === option;
        });
      });
      
      if (matchingVariant) {
        // Update variant ID
        this.variantIdInput.value = matchingVariant.id;
        
        // Update price
        this.updatePrice(matchingVariant);
        
        // Update availability
        this.updateAvailability(matchingVariant);
        
        // Update SKU
        this.updateSku(matchingVariant);
        
        // Update URL
        this.updateURL(matchingVariant.id);
      }
    }

    updatePrice(variant) {
      const priceElement = this.querySelector('.price-current');
      const compareElement = this.querySelector('.price-compare');
      
      if (priceElement && variant.price !== undefined) {
        priceElement.textContent = this.formatMoney(variant.price);
      }
      
      if (compareElement && variant.compare_at_price) {
        if (variant.compare_at_price > variant.price) {
          compareElement.textContent = this.formatMoney(variant.compare_at_price);
          compareElement.style.display = 'inline';
        } else {
          compareElement.style.display = 'none';
        }
      }
    }

    updateAvailability(variant) {
      if (this.addButton) {
        if (variant.available) {
          this.addButton.disabled = false;
          this.addButton.textContent = 'Add to Cart';
        } else {
          this.addButton.disabled = true;
          this.addButton.textContent = 'Sold Out';
        }
      }
    }

    updateSku(variant) {
      const skuElement = this.querySelector('.product-sku');
      if (skuElement && variant.sku) {
        skuElement.textContent = variant.sku;
      }
    }

    updateURL(variantId) {
      if (!window.history.replaceState) return;
      
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variantId);
      window.history.replaceState({}, '', url.toString());
    }

    updateShippingNotice() {
      const notice = document.getElementById('ship-notice');
      if (!notice) return;

      // Get selected options from FINISH and HANDLE only (not custom options)
      const variantSelector = this.querySelector('variant-selects');
      if (!variantSelector) return;
      
      const selectedButtons = variantSelector.querySelectorAll('.option-button.selected');
      let hasAnyStock = false;

      selectedButtons.forEach(button => {
        const stockValue = parseInt(button.dataset.stock || '0', 10);
        const hasStockBadge = button.querySelector('.option-stock');
        
        if (stockValue > 0 || hasStockBadge) {
          hasAnyStock = true;
        }
      });

      // Update notice based on inventory
      if (hasAnyStock) {
        notice.classList.remove('made-to-order');
        notice.innerHTML = '<strong>Quick ship:</strong> items typically ship between 2-3 business days and have no cost towards your no-charge account.';
      } else {
        notice.classList.add('made-to-order');
        notice.innerHTML = '<strong>Made to order product:</strong> This item is not quick ship. Made to order product typically takes 7-10 days to produce upon receiving product from Delta.';
      }
    }

    setupFormSubmit() {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (this.addButton.disabled) return;
        
        // Get the form data
        const formData = new FormData(this.form);
        const config = {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/javascript'
          },
          body: formData
        };
        
        // Disable button and show loading
        const originalText = this.addButton.textContent;
        this.addButton.disabled = true;
        this.addButton.textContent = 'Adding...';
        
        fetch(window.Shopify.routes.root + 'cart/add.js', config)
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.json();
          })
          .then(item => {
            console.log('Item added to cart:', item);
            
            // Trigger cart refresh
            this.updateCartCount();
            
            // Show success feedback
            this.showSuccessFeedback(item);
            
            // Dispatch custom event for other components
            document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', {
              bubbles: true
            }));
          })
          .catch(error => {
            console.error('Error adding to cart:', error);
            this.showError('There was an error adding to cart. Please try again.');
          })
          .finally(() => {
            this.addButton.disabled = false;
            this.addButton.textContent = originalText;
          });
      });
    }

    updateCartCount() {
      fetch(window.Shopify.routes.root + 'cart.js')
        .then(response => response.json())
        .then(cart => {
          // Update cart count in header
          const cartCountElements = document.querySelectorAll('.cart-count-bubble, [data-cart-count]');
          cartCountElements.forEach(element => {
            element.textContent = cart.item_count;
            if (cart.item_count > 0) {
              element.classList.remove('hidden');
            }
          });
        })
        .catch(error => console.error('Error updating cart count:', error));
    }

    showSuccessFeedback(item) {
      // Change button text temporarily
      const originalText = this.addButton.textContent;
      this.addButton.textContent = '✓ Added to Cart';
      this.addButton.style.background = '#4CAF50';
      
      setTimeout(() => {
        this.addButton.textContent = originalText;
        this.addButton.style.background = '';
      }, 2000);
      
      // You can also redirect to cart or open cart drawer here
      // window.location.href = '/cart';
    }

    showError(message) {
      alert(message);
    }

    formatMoney(cents) {
      return '$' + (cents / 100).toFixed(2);
    }
  });
}

// Custom element for variant selects wrapper
if (!customElements.get('variant-selects')) {
  customElements.define('variant-selects', class VariantSelects extends HTMLElement {
    constructor() {
      super();
    }
  });
}
