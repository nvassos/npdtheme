/**
 * Header Search
 * Uses the same search logic as collection page
 */

class HeaderSearch {
  constructor() {
    this.toggleBtn = document.getElementById('header-search-toggle');
    this.dropdown = document.getElementById('header-search-dropdown');
    this.searchInput = document.getElementById('header-search-input');
    this.searchClearBtn = document.getElementById('header-search-clear');
    this.searchResults = document.getElementById('header-search-results');
    this.searchTimeout = null;
    this.searchQuery = '';
    
    if (!this.toggleBtn || !this.dropdown || !this.searchInput) return;
    
    this.init();
  }

  init() {
    // Toggle dropdown
    this.toggleBtn.addEventListener('click', () => {
      const isVisible = this.dropdown.style.display === 'block';
      if (isVisible) {
        this.hideDropdown();
      } else {
        this.showDropdown();
      }
    });

    // Search input handler with debounce
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      this.searchQuery = query;

      // Show/hide clear button
      if (this.searchClearBtn) {
        this.searchClearBtn.style.display = query ? 'flex' : 'none';
      }

      // Debounce search
      clearTimeout(this.searchTimeout);
      if (query.length >= 2) {
        this.searchTimeout = setTimeout(() => this.performSearch(query), 300);
      } else {
        this.hideSearchResults();
      }
    });

    // Clear button handler
    if (this.searchClearBtn) {
      this.searchClearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.searchClearBtn.style.display = 'none';
        this.hideSearchResults();
        this.searchInput.focus();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-search-action')) {
        this.hideDropdown();
      }
    });

    // Show results again when focusing input
    this.searchInput.addEventListener('focus', () => {
      if (this.searchQuery && this.searchResults.querySelector('.search-result-item')) {
        this.searchResults.style.display = 'block';
      }
    });
  }

  showDropdown() {
    this.dropdown.style.display = 'block';
    this.toggleBtn.setAttribute('aria-expanded', 'true');
    setTimeout(() => this.searchInput.focus(), 100);
  }

  hideDropdown() {
    this.dropdown.style.display = 'none';
    this.toggleBtn.setAttribute('aria-expanded', 'false');
    this.searchInput.value = '';
    this.searchQuery = '';
    if (this.searchClearBtn) {
      this.searchClearBtn.style.display = 'none';
    }
    this.hideSearchResults();
  }

  async performSearch(query) {
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
      this.displaySearchResults(results.slice(0, 8), query);
      
    } catch (error) {
      console.error('❌ Header search API error:', error);
      // Show error in search results
      this.displaySearchResults([], query);
    }
  }

  displaySearchResults(results, query) {
    const resultsList = this.searchResults.querySelector('.search-results-list');
    const resultsCount = this.searchResults.querySelector('.search-results-count');

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

    this.searchResults.style.display = 'block';
  }

  hideSearchResults() {
    if (this.searchResults) {
      this.searchResults.style.display = 'none';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new HeaderSearch();
  });
} else {
  new HeaderSearch();
}

