/**
 * Header Search
 * Uses the same search logic as collection page
 */

if (!window.HeaderSearch) {
  window.HeaderSearch = class HeaderSearch {
  constructor() {
    // Get ALL toggle buttons (might be multiple for mobile/desktop)
    this.toggleBtns = document.querySelectorAll('#header-search-toggle');
    this.dropdowns = document.querySelectorAll('#header-search-dropdown');
    this.searchInputs = document.querySelectorAll('#header-search-input');
    
    console.log('🔍 Header Search Init:', {
      toggleBtns: this.toggleBtns.length,
      dropdowns: this.dropdowns.length,
      searchInputs: this.searchInputs.length
    });
    
    if (this.toggleBtns.length === 0 || this.dropdowns.length === 0 || this.searchInputs.length === 0) {
      console.warn('❌ Header search elements not found');
      return;
    }
    
    this.searchTimeout = null;
    this.searchQuery = '';
    
    this.init();
  }

  init() {
    console.log('✅ Header Search initialized');
    
    // Attach listeners to ALL toggle buttons
    this.toggleBtns.forEach((btn, index) => {
      const dropdown = this.dropdowns[index];
      const searchInput = this.searchInputs[index];
      
      if (!dropdown || !searchInput) return;
      
      console.log(`🔘 Attaching listener to button ${index}`);
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`🖱️ Search icon ${index} clicked`);
        
        const isVisible = dropdown.style.display === 'block';
        console.log('Dropdown visible?', isVisible);
        
        if (isVisible) {
          this.hideDropdown(index);
        } else {
          this.showDropdown(index);
        }
      });
      
      // Search input handler
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        this.searchQuery = query;
        
        const clearBtn = dropdown.querySelector('.header-search-clear-btn');
        if (clearBtn) {
          clearBtn.style.display = query ? 'flex' : 'none';
        }
        
        clearTimeout(this.searchTimeout);
        if (query.length >= 2) {
          this.searchTimeout = setTimeout(() => this.performSearch(query, index), 300);
        } else {
          this.hideSearchResults(index);
        }
      });
      
      // Clear button handler
      const clearBtn = dropdown.querySelector('.header-search-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          searchInput.value = '';
          this.searchQuery = '';
          clearBtn.style.display = 'none';
          this.hideSearchResults(index);
          searchInput.focus();
        });
      }
      
      // Show results again when focusing input
      searchInput.addEventListener('focus', () => {
        const results = dropdown.querySelector('.header-search-results');
        if (this.searchQuery && results && results.querySelector('.search-result-item')) {
          results.style.display = 'block';
        }
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-search-action')) {
        this.hideAllDropdowns();
      }
    });
  }

  showDropdown(index) {
    console.log(`📖 Showing dropdown ${index}`);
    const dropdown = this.dropdowns[index];
    const btn = this.toggleBtns[index];
    const searchInput = this.searchInputs[index];
    
    dropdown.style.display = 'block';
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => searchInput.focus(), 100);
  }

  hideDropdown(index) {
    const dropdown = this.dropdowns[index];
    const btn = this.toggleBtns[index];
    const searchInput = this.searchInputs[index];
    
    dropdown.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');
    searchInput.value = '';
    this.searchQuery = '';
    
    const clearBtn = dropdown.querySelector('.header-search-clear-btn');
    if (clearBtn) {
      clearBtn.style.display = 'none';
    }
    this.hideSearchResults(index);
  }
  
  hideAllDropdowns() {
    this.dropdowns.forEach((dropdown, index) => {
      if (dropdown.style.display === 'block') {
        this.hideDropdown(index);
      }
    });
  }

  async performSearch(query, index) {
    try {
      // Use external API for search - searches across all 11k+ products
      const apiUrl = `https://phpstack-1318127-5961230.cloudwaysapps.com/api/products/search?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Search API request failed');
      }
      
      const data = await response.json();
      console.log('✅ Header search API returned:', data.results.length, 'results');
      
      // Transform API results to match our display format
      // Filter out products without valid URL or handle
      const results = data.results
        .filter(item => item.url && item.handle)
        .map(item => ({
          product: {
            id: item.id,
            title: item.title,
            handle: item.handle,
            vendor: item.vendor,
            tags: item.tags,
            image: item.image
          },
          matchedVariant: item.matched_variant ? {
            id: item.matched_variant.id,
            title: item.matched_variant.title,
            sku: item.matched_variant.sku
          } : null,
          primarySKU: item.matched_variant?.sku || '',
          deposcoId: item.matched_variant?.deposco_id || '',
          productUrl: item.url
        }));
      
      // Display results (top 8)
      this.displaySearchResults(results.slice(0, 8), query, index);
      
    } catch (error) {
      console.error('❌ Header search API error:', error);
      // Show error in search results
      this.displaySearchResults([], query, index);
    }
  }

  displaySearchResults(results, query, index) {
    const dropdown = this.dropdowns[index];
    const searchResults = dropdown.querySelector('.header-search-results');
    const resultsList = searchResults.querySelector('.search-results-list');
    const resultsCount = searchResults.querySelector('.search-results-count');

    if (results.length === 0) {
      resultsList.innerHTML = `
        <div class="search-no-results">
          <svg class="search-no-results-icon" viewBox="0 0 48 48" fill="none" width="48" height="48">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2"/>
            <path d="M24 16v12M24 32h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          No products found for "${query}"
        </div>
      `;
      resultsCount.textContent = 'No Results';
    } else {
      resultsCount.textContent = `${results.length} Result${results.length !== 1 ? 's' : ''}`;
      
      resultsList.innerHTML = results.map(result => {
        const product = result.product;
        const imageUrl = product.image || '';
        const isQuickShip = product.tags && product.tags.some(tag => tag.toLowerCase().includes('quick ship'));
        
        // Use the URL from API response or build it
        let productUrl = result.productUrl || `/products/${product.handle}`;
        
        // If the URL doesn't include a variant parameter but we have a matchedVariant, add it
        if (result.matchedVariant && result.matchedVariant.id && !productUrl.includes('variant=')) {
          const separator = productUrl.includes('?') ? '&' : '?';
          productUrl = `${productUrl}${separator}variant=${result.matchedVariant.id}`;
          console.log('✅ Header search linking to variant:', result.matchedVariant.id, 'SKU:', result.primarySKU, 'Deposco:', result.deposcoId);
        }

        return `
          <a href="${productUrl}" class="search-result-item" data-deposco="${result.deposcoId || ''}">
            ${imageUrl ? `<img src="${imageUrl}" alt="${product.title}" class="search-result-image" loading="lazy">` : '<div class="search-result-image"></div>'}
            <div class="search-result-info">
              ${product.vendor ? `<div class="search-result-brand">${product.vendor}</div>` : ''}
              <div class="search-result-title">${product.title}</div>
              <div class="search-result-meta">
                ${result.primarySKU ? `<span class="search-result-sku">SKU: ${result.primarySKU}</span>` : ''}
                ${result.deposcoId ? `<span class="search-result-deposco">Deposco ID: ${result.deposcoId}</span>` : ''}
                ${isQuickShip ? '<span class="search-result-badge">Quick Ship</span>' : ''}
              </div>
            </div>
          </a>
        `;
      }).join('');
    }

    searchResults.style.display = 'block';
  }

  hideSearchResults(index) {
    const dropdown = this.dropdowns[index];
    const searchResults = dropdown.querySelector('.header-search-results');
    if (searchResults) {
      searchResults.style.display = 'none';
    }
  }
  };
}

// Initialize when DOM is ready (only once)
if (!window.headerSearchInitialized) {
  window.headerSearchInitialized = true;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new window.HeaderSearch();
    });
  } else {
    new window.HeaderSearch();
  }
}

