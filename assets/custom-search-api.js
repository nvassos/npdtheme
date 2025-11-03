/**
 * Custom Search API
 * Handles search using external API endpoint for the search results page
 */

class CustomSearchAPI {
  constructor() {
    this.apiEndpoint = 'https://phpstack-1318127-5961230.cloudwaysapps.com/api/products/search?q=';
    this.searchInput = document.getElementById('custom-search-input');
    this.searchClear = document.getElementById('custom-search-clear');
    this.resultsGrid = document.getElementById('custom-search-results-grid');
    this.loadingIndicator = document.getElementById('search-loading');
    this.noResultsMessage = document.getElementById('no-results-message');
    this.resultsCount = document.getElementById('search-results-count');
    
    this.debounceTimer = null;
    
    this.init();
  }

  init() {
    if (!this.searchInput) return;

    // Search on input with debounce
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      // Show/hide clear button
      this.searchClear.style.display = query ? 'flex' : 'none';
      
      // Debounce search
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        if (query.length >= 2) {
          this.performSearch(query);
          // Update URL
          const url = new URL(window.location);
          url.searchParams.set('q', query);
          window.history.replaceState({}, '', url);
        } else if (query.length === 0) {
          this.clearResults();
          // Clear URL
          const url = new URL(window.location);
          url.searchParams.delete('q');
          window.history.replaceState({}, '', url);
        }
      }, 300);
    });

    // Clear button
    this.searchClear.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchClear.style.display = 'none';
      this.clearResults();
      this.searchInput.focus();
      
      // Clear URL
      const url = new URL(window.location);
      url.searchParams.delete('q');
      window.history.replaceState({}, '', url);
    });

    // Search on Enter key
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = this.searchInput.value.trim();
        if (query.length >= 2) {
          this.performSearch(query);
        }
      }
    });
  }

  async performSearch(query) {
    this.showLoading();

    try {
      const response = await fetch(`${this.apiEndpoint}${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      
      this.hideLoading();
      this.displayResults(data.results || [], query);
      
    } catch (error) {
      console.error('Search error:', error);
      this.hideLoading();
      this.showNoResults();
    }
  }

  displayResults(results, query) {
    if (!results || results.length === 0) {
      this.showNoResults();
      return;
    }

    // Update results count
    this.resultsCount.textContent = `Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`;
    this.resultsCount.style.display = 'block';
    this.noResultsMessage.style.display = 'none';
    this.resultsGrid.style.display = 'grid';

    // Clear previous results
    this.resultsGrid.innerHTML = '';

    // Display each result
    results.forEach(result => {
      const productCard = this.createProductCard(result);
      this.resultsGrid.appendChild(productCard);
    });
  }

  createProductCard(result) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Determine which variant to display
    const displayVariant = result.matched_variant || null;
    let productUrl = result.url || `/products/${result.handle}`;
    
    // If the URL doesn't include a variant parameter but we have a matched_variant, add it
    if (displayVariant && displayVariant.id && !productUrl.includes('variant=')) {
      const separator = productUrl.includes('?') ? '&' : '?';
      productUrl = `${productUrl}${separator}variant=${displayVariant.id}`;
      console.log('✅ Search results page linking to variant:', displayVariant.id);
    }
    
    const sku = displayVariant ? displayVariant.sku : '';
    const deposcoId = displayVariant ? displayVariant.deposco_id : '';
    const quickShip = displayVariant ? displayVariant.quick_ship : false;

    card.innerHTML = `
      <a href="${productUrl}" class="product-card-link">
        <div class="product-image-container">
          <img 
            src="${result.image || '/assets/placeholder.png'}" 
            alt="${result.title}"
            class="product-image"
            loading="lazy"
          >
        </div>
        <div class="product-details">
          <div class="product-brand">${result.vendor || ''}</div>
          <h3 class="product-title">${result.title}</h3>
          ${sku ? `<div class="product-sku">${sku}</div>` : ''}
          ${deposcoId || quickShip ? `
          <div class="product-meta" style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
            ${deposcoId ? `<span class="search-result-deposco">Deposco ID: ${deposcoId}</span>` : ''}
            ${quickShip ? '<span class="search-result-badge">Quick Ship</span>' : ''}
          </div>
          ` : ''}
        </div>
      </a>
    `;

    return card;
  }

  showLoading() {
    this.loadingIndicator.style.display = 'block';
    this.resultsGrid.style.display = 'none';
    this.noResultsMessage.style.display = 'none';
    this.resultsCount.style.display = 'none';
  }

  hideLoading() {
    this.loadingIndicator.style.display = 'none';
  }

  showNoResults() {
    this.resultsGrid.style.display = 'none';
    this.noResultsMessage.style.display = 'block';
    this.resultsCount.style.display = 'none';
  }

  clearResults() {
    this.resultsGrid.innerHTML = '';
    this.resultsGrid.style.display = 'none';
    this.noResultsMessage.style.display = 'none';
    this.resultsCount.style.display = 'none';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.CustomSearchAPI = new CustomSearchAPI();
  });
} else {
  window.CustomSearchAPI = new CustomSearchAPI();
}

