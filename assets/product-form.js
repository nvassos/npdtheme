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
      
      // Initialize price calculation on page load
      this.updatePriceByQuantity();
      
      // Initialize currentVariant from the initial variant ID
      this.initializeCurrentVariant();
    }
    
    initializeCurrentVariant() {
      const variantSelector = this.querySelector('variant-selects');
      if (!variantSelector) return;
      
      const variantsJson = variantSelector.querySelector('.product-variants-json');
      if (!variantsJson) return;
      
      const data = JSON.parse(variantsJson.textContent);
      const variants = data.variants || data;
      
      const currentVariantId = this.variantIdInput.value;
      this.currentVariant = variants.find(v => v.id == currentVariantId);
    }

    setupQuantityControls() {
      const minusBtn = this.querySelector('.quantity-minus');
      const plusBtn = this.querySelector('.quantity-plus');
      
      if (minusBtn) {
        minusBtn.addEventListener('click', () => {
          const currentValue = parseInt(this.quantityInput.value) || 1;
          if (currentValue > 1) {
            this.quantityInput.value = currentValue - 1;
            this.updatePriceByQuantity();
          }
        });
      }
      
      if (plusBtn) {
        plusBtn.addEventListener('click', () => {
          const currentValue = parseInt(this.quantityInput.value) || 1;
          const maxValue = parseInt(this.quantityInput.getAttribute('max')) || 99;
          if (currentValue < maxValue) {
            this.quantityInput.value = currentValue + 1;
            this.updatePriceByQuantity();
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
          
          this.updatePriceByQuantity();
        });
        
        // Also listen for input events (while typing)
        this.quantityInput.addEventListener('input', () => {
          this.updatePriceByQuantity();
        });
      }
    }

    setupOptionButtons() {
      const optionGroups = this.querySelectorAll('.option-buttons:not(.custom-option-buttons)');
      
      optionGroups.forEach((group, groupIndex) => {
        group.addEventListener('click', (e) => {
          const button = e.target.closest('.option-button');
          
          if (button && !button.disabled) {
            // Remove selected from siblings
            group.querySelectorAll('.option-button').forEach(btn => {
              btn.classList.remove('selected');
            });
            
            // Add selected to clicked button
            button.classList.add('selected');
            
            // Update option availability
            this.updateOptionAvailability();
            
            // Auto-select first available option in subsequent groups
            let selectionChanged = false;
            optionGroups.forEach((nextGroup, nextGroupIndex) => {
              if (nextGroupIndex > groupIndex) {
                const selectedBtn = nextGroup.querySelector('.option-button.selected');
                // If current selection is now disabled, auto-select first available
                if (selectedBtn && selectedBtn.disabled) {
                  selectedBtn.classList.remove('selected');
                  const firstAvailable = nextGroup.querySelector('.option-button:not([disabled])');
                  if (firstAvailable) {
                    firstAvailable.classList.add('selected');
                    selectionChanged = true;
                  }
                }
              }
            });
            
            // If we auto-selected something, recalculate availability again
            if (selectionChanged) {
              this.updateOptionAvailability();
            }
            
            // Update variant
            this.updateVariant();
            
            // Update shipping notice
            this.updateShippingNotice();
          }
        });
      });
      
      // Initialize option availability on load
      this.updateOptionAvailability();
    }
    
    updateOptionAvailability() {
      const variantSelector = this.querySelector('variant-selects');
      if (!variantSelector) return;
      
      const variantsJson = variantSelector.querySelector('.product-variants-json');
      if (!variantsJson) return;
      
      const data = JSON.parse(variantsJson.textContent);
      const variants = data.variants || data; // Support both new and old format
      const optionGroups = variantSelector.querySelectorAll('.option-buttons:not(.custom-option-buttons)');
      
      // Get currently selected options
      const selectedOptions = [];
      optionGroups.forEach((group, index) => {
        const selected = group.querySelector('.option-button.selected');
        selectedOptions[index] = selected ? selected.dataset.optionValue : null;
      });
      
      console.log('Checking availability with selected options:', selectedOptions);
      console.log('Total variants:', variants.length);
      console.log('All variants:', variants.map(v => ({
        id: v.id,
        option1: v.option1,
        option2: v.option2,
        option3: v.option3,
        available: v.available,
        inventory: v.inventory_quantity
      })));
      
      // Update each option group
      optionGroups.forEach((group, optionIndex) => {
        const buttons = group.querySelectorAll('.option-button');
        
        buttons.forEach(button => {
          const optionValue = button.dataset.optionValue;
          
          // Check if this option value exists in any variant combination
          const variantExists = variants.some(variant => {
            // Check if variant matches this option value
            const variantOptionValue = variant[`option${optionIndex + 1}`];
            if (variantOptionValue !== optionValue) return false;
            
            // For option 1 (COLOR), allow if ANY variant exists with this color
            if (optionIndex === 0) {
              return true;
            }
            
            // For option 2 (STYLE), check if variant matches option 1 selection (if any)
            if (optionIndex === 1) {
              if (selectedOptions[0] && variant.option1 !== selectedOptions[0]) {
                return false;
              }
              return true;
            }
            
            // For option 3 (ACRYLIC), check if variant matches option 1 and 2 selections
            if (optionIndex === 2) {
              if (selectedOptions[0] && variant.option1 !== selectedOptions[0]) {
                return false;
              }
              if (selectedOptions[1] && variant.option2 !== selectedOptions[1]) {
                return false;
              }
              return true;
            }
            
            // Fallback for any additional options
            for (let i = 0; i < selectedOptions.length; i++) {
              if (i !== optionIndex && selectedOptions[i]) {
                if (variant[`option${i + 1}`] !== selectedOptions[i]) {
                  return false;
                }
              }
            }
            
            return true;
          });
          
          if (!variantExists) {
            console.log(`Option ${optionIndex + 1}: "${optionValue}" - NO MATCHING VARIANT FOUND with selections:`, selectedOptions);
          }
          
          // Update button state - enable all options that exist
          if (variantExists) {
            button.disabled = false;
            button.classList.remove('unavailable');
          } else {
            button.disabled = true;
            button.classList.add('unavailable');
          }
        });
      });
    }


    updateVariant() {
      const variantSelector = this.querySelector('variant-selects');
      if (!variantSelector) return;
      
      const variantsJson = variantSelector.querySelector('.product-variants-json');
      if (!variantsJson) return;
      
      const data = JSON.parse(variantsJson.textContent);
      const variants = data.variants || data; // Support both new and old format

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
        
        // Store current variant for price calculations
        this.currentVariant = matchingVariant;
        
        // Update price based on variant item_cost × quantity
        this.updatePrice(matchingVariant);
        
        // Update availability
        this.updateAvailability(matchingVariant);
        
        // Update SKU
        this.updateSku(matchingVariant);
        
        // Update featured image if variant has one
        this.updateFeaturedImage(matchingVariant);
        
        // Update URL
        this.updateURL(matchingVariant.id);
      }
    }
    
    updatePrice(variant) {
      const priceElement = this.querySelector('.price-current');
      if (!priceElement) return;
      
      const costCents = variant.metafields?.custom?.cost_variant || 0;
      if (!costCents || costCents === 0) {
        // Fallback to variant price if no cost_variant metafield
        priceElement.textContent = this.formatMoney(variant.price);
        priceElement.setAttribute('data-base-price-cents', '0');
        return;
      }
      
      // Store base price in cents in data attribute
      priceElement.setAttribute('data-base-price-cents', costCents);
      
      // Calculate total: cost_variant (cents) × quantity
      this.updatePriceByQuantity();
    }
    
    updatePriceByQuantity() {
      const priceElement = this.querySelector('.price-current');
      if (!priceElement) return;
      
      const basePriceCents = parseInt(priceElement.getAttribute('data-base-price-cents') || 0, 10);
      if (!basePriceCents) return;
      
      const quantity = parseInt(this.quantityInput?.value || 1, 10);
      
      // Calculate total in cents
      const totalCents = basePriceCents * quantity;
      
      // Convert to dollars
      const dollars = Math.floor(totalCents / 100);
      const cents = totalCents % 100;
      
      // Format and display
      priceElement.textContent = `$${dollars}.${cents.toString().padStart(2, '0')}`;
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
      
      // Update quantity note with variant inventory
      this.updateQuantityNote(variant);
    }
    
    updateQuantityNote(variant) {
      const quantityNote = document.getElementById('quantity-note');
      if (!quantityNote) return;
      
      const inventory = variant.inventory_quantity || 0;

      if (inventory > 0) {
        quantityNote.innerHTML = `<span class="quick-ship-available" data-inventory="${inventory}">${inventory} quick ship available</span><br>Quantities beyond this are made to order and billed to your no-charge account.`;
    } else {
        quantityNote.innerHTML = 'Quantities are made to order and billed to your no-charge account.';
    }
    }

    updateSku(variant) {
      const skuElement = this.querySelector('.product-sku');
      if (skuElement && variant.sku) {
        skuElement.textContent = variant.sku;
      }
    }

    updateFeaturedImage(variant) {
      if (!variant.featured_image) return;
      
      const mainImage = document.querySelector('.product-main-image');
      if (!mainImage) return;
      
      // Update the image src
      const imageUrl = variant.featured_image.src || variant.featured_image;
      mainImage.src = imageUrl;
      mainImage.srcset = imageUrl;
      
      // Update alt text if available
      if (variant.featured_image.alt) {
        mainImage.alt = variant.featured_image.alt;
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
      
      const data = JSON.parse(variantsJson.textContent);
      const variants = data.variants || data; // Support both new and old format
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
        
        // Add cost_variant (in cents) as a line item property
        if (this.currentVariant && this.currentVariant.metafields?.custom?.cost_variant) {
          formData.append('properties[_cost_variant]', this.currentVariant.metafields.custom.cost_variant);
        }
        
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
