/**
 * Custom Predictive Search using External API
 * Replaces the theme's default predictive search with custom API-powered search
 */

class CustomPredictiveSearch {
  constructor() {
    this.searchInput = null;
    this.searchResults = null;
    this.resetButton = null;
    this.searchTimeout = null;
    this.isLoading = false;
    
    this.init();
  }

  init() {
    // Wait for the predictive search component to load
    const checkForComponent = () => {
      const component = document.querySelector('predictive-search-component');
      if (component) {
        this.setupCustomSearch(component);
      } else {
        setTimeout(checkForComponent, 100);
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkForComponent);
    } else {
      checkForComponent();
    }
  }

  setupCustomSearch(component) {
    this.searchInput = component.querySelector('.search-input');
    this.searchResults = component.querySelector('.predictive-search-form__content');
    this.resetButton = component.querySelector('.predictive-search__reset-button');
    
    if (!this.searchInput || !this.searchResults) return;

    // Remove the default search handler
    const newInput = this.searchInput.cloneNode(true);
    this.searchInput.parentNode.replaceChild(newInput, this.searchInput);
    this.searchInput = newInput;

    // Add our custom search handler
    this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
    
    // Handle reset button
    if (this.resetButton) {
      this.resetButton.addEventListener('click', () => this.resetSearch());
    }
  }

  handleSearch(e) {
    const query = e.target.value.trim();
    
    // Show/hide reset button
    if (this.resetButton) {
      this.resetButton.hidden = query.length === 0;
    }

    // Debounce search
    clearTimeout(this.searchTimeout);
    
    if (query.length < 2) {
      this.hideResults();
      return;
    }

    this.searchTimeout = setTimeout(() => this.performSearch(query), 300);
  }

  async performSearch(query) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoadingState();

    try {
      const apiUrl = `https://phpstack-1318127-5961230.cloudwaysapps.com/api/products/search?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Search API failed');
      
      const data = await response.json();
      console.log('✅ Header search returned:', data.results.length, 'results');
      
      this.displayResults(data.results, query);
      
    } catch (error) {
      console.error('❌ Header search error:', error);
      this.displayError(query);
    } finally {
      this.isLoading = false;
    }
  }

  showLoadingState() {
    this.searchResults.innerHTML = `
      <div class="custom-search-loading">
        <div class="loading-spinner"></div>
        <p>Searching...</p>
      </div>
    `;
    this.searchResults.setAttribute('data-search-results', 'true');
  }

  displayResults(results, query) {
    if (results.length === 0) {
      this.searchResults.innerHTML = `
        <div class="custom-search-no-results">
          <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2"/>
            <path d="M24 16v12M24 32h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>No products found for "${query}"</p>
        </div>
      `;
      this.searchResults.setAttribute('data-search-results', 'true');
      return;
    }

    // Display top 8 results
    const resultsHTML = results.slice(0, 8).map(item => {
      const product = item;
      const imageUrl = item.image || '';
      const isQuickShip = item.tags && item.tags.some(tag => tag.toLowerCase().includes('quick ship'));
      
      // Use URL from API
      let productUrl = item.url || `/products/${item.handle}`;
      
      const sku = item.matched_variant?.sku || '';
      const deposcoId = item.matched_variant?.deposco_id || '';
      
      return `
        <a href="${productUrl}" class="custom-search-result-item">
          <div class="custom-search-result-image-wrapper">
            ${imageUrl ? `<img src="${imageUrl}" alt="${product.title}" class="custom-search-result-image" loading="lazy">` : '<div class="custom-search-result-image-placeholder"></div>'}
          </div>
          <div class="custom-search-result-info">
            ${product.vendor ? `<div class="custom-search-result-brand">${product.vendor}</div>` : ''}
            <div class="custom-search-result-title">${product.title}</div>
            <div class="custom-search-result-meta">
              ${sku ? `<span class="custom-search-result-sku">SKU: ${sku}</span>` : ''}
              ${deposcoId ? `<span class="custom-search-result-deposco">Deposco ID: ${deposcoId}</span>` : ''}
              ${isQuickShip ? '<span class="custom-search-result-badge">Quick Ship</span>' : ''}
            </div>
          </div>
        </a>
      `;
    }).join('');

    this.searchResults.innerHTML = `
      <div class="custom-search-results-wrapper">
        <div class="custom-search-results-header">
          <span class="custom-search-results-count">${results.length} Result${results.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="custom-search-results-list">
          ${resultsHTML}
        </div>
      </div>
    `;
    
    this.searchResults.setAttribute('data-search-results', 'true');
  }

  displayError(query) {
    this.searchResults.innerHTML = `
      <div class="custom-search-error">
        <p>Unable to search at this time. Please try again.</p>
      </div>
    `;
    this.searchResults.setAttribute('data-search-results', 'true');
  }

  hideResults() {
    this.searchResults.innerHTML = '';
    this.searchResults.removeAttribute('data-search-results');
  }

  resetSearch() {
    if (this.searchInput) {
      this.searchInput.value = '';
      this.searchInput.focus();
    }
    this.hideResults();
    if (this.resetButton) {
      this.resetButton.hidden = true;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CustomPredictiveSearch();
  });
} else {
  new CustomPredictiveSearch();
}

