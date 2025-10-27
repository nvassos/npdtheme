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

      // Get the current variant from the form
      const variantSelector = this.querySelector('variant-selects');
      if (!variantSelector) {
        // No variants, check initial quickship inventory from data attribute
        const quickshipInventory = parseInt(notice.dataset.quickshipInventory || '0', 10);
        return; // Already set correctly on page load
      }
      
      const variantsJson = variantSelector.querySelector('.product-variants-json');
      if (!variantsJson) return;
      
      const variants = JSON.parse(variantsJson.textContent);
      const currentVariantId = this.variantIdInput.value;
      const currentVariant = variants.find(v => v.id == currentVariantId);
      
      if (!currentVariant) return;
      
      // Check if variant has quickship-inventory metafield
      const quickshipInventory = currentVariant.metafields?.custom?.quickship_inventory || 0;
      
      // Update notice based on quickship inventory
      if (quickshipInventory > 0) {
        notice.classList.remove('made-to-order');
        notice.setAttribute('data-quickship-inventory', quickshipInventory);
        notice.innerHTML = '<strong>Quick ship:</strong> items typically ship between 2-3 business days and have no cost towards your no-charge account.';
      } else {
        notice.classList.add('made-to-order');
        notice.setAttribute('data-quickship-inventory', '0');
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
              return response.json().then(err => {
                throw new Error(err.description || 'Could not add to cart');
              });
            }
            return response.json();
          })
          .then(item => {
            console.log('Item added to cart:', item);
            
            // Dispatch Horizon theme cart update event (correct event name is 'cart:update')
            document.dispatchEvent(new CustomEvent('cart:update', {
              bubbles: true,
              detail: {
                data: {
                  itemCount: item.quantity,
                  source: 'product-form-component'
                }
              }
            }));
            
            // Show success feedback
            this.addButton.textContent = '✓ Added to Cart';
            this.addButton.style.background = '#4CAF50';
            
            // Reset after delay
            setTimeout(() => {
              this.addButton.disabled = false;
              this.addButton.textContent = originalText;
              this.addButton.style.background = '';
            }, 2000);
          })
          .catch(error => {
            console.error('Error adding to cart:', error);
            this.addButton.textContent = 'Error - Try Again';
            this.addButton.style.background = '#f44336';
            
            // Reset after delay
            setTimeout(() => {
              this.addButton.disabled = false;
              this.addButton.textContent = originalText;
              this.addButton.style.background = '';
            }, 3000);
          });
      });
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
