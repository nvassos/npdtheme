/**
 * Collection Tag-Based Filters with Infinite Scroll
 */

class CollectionFilters {
  constructor() {
    this.form = document.getElementById('TagFiltersForm');
    this.productGrid = document.getElementById('product-grid');
    this.activeFiltersContainer = document.getElementById('active-filters');
    this.clearAllBtn = document.getElementById('clear-all-filters');
    this.sortSelect = document.getElementById('collection-sort');
    this.noResults = document.getElementById('no-results');
    this.searchInput = document.getElementById('collection-search');
    this.searchResults = document.getElementById('search-results');
    this.searchClearBtn = document.getElementById('search-clear');
    
    this.activeTags = [];
    this.currentSort = 'manual';
    this.searchQuery = '';
    this.isLoading = false;
    this.currentPage = 1;
    this.hasMorePages = false;
    this.searchTimeout = null;
    
    if (this.form) {
      this.init();
    }
  }

  init() {
    // Setup filter change handlers
    this.form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.handleFilterChange());
    });

    // Setup collapsible filter groups
    this.form.querySelectorAll('.collapsible').forEach(button => {
      button.addEventListener('click', (e) => this.toggleFilterGroup(e.target));
    });

    // Setup sort handler
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.applyFilters();
      });
    }

    // Setup clear all button
    if (this.clearAllBtn) {
      this.clearAllBtn.addEventListener('click', () => this.clearAllFilters());
    }

    // Setup search handlers
    this.setupSearch();

    // Setup infinite scroll
    this.setupInfiniteScroll();

    // Initialize from URL params
    this.loadFiltersFromURL();
  }

  toggleFilterGroup(button) {
    const isCollapsed = button.classList.contains('collapsed');
    const filterOptions = button.closest('.filter-group').querySelector('.filter-options');
    
    if (isCollapsed) {
      button.classList.remove('collapsed');
      button.setAttribute('aria-expanded', 'true');
      filterOptions.classList.remove('collapsed');
    } else {
      button.classList.add('collapsed');
      button.setAttribute('aria-expanded', 'false');
      filterOptions.classList.add('collapsed');
    }
  }

  handleFilterChange() {
    // Collect all checked filters
    this.activeTags = [];
    this.form.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
      this.activeTags.push(checkbox.value);
    });

    this.updateActiveFilterTags();
    this.applyFilters();
  }

  updateActiveFilterTags() {
    // Clear current tags
    this.activeFiltersContainer.innerHTML = '';

    // Add tag for each active filter
    this.activeTags.forEach(tag => {
      const tagEl = document.createElement('div');
      tagEl.className = 'filter-tag';
      tagEl.innerHTML = `
        ${tag}
        <span class="filter-tag-remove" data-tag="${tag}">×</span>
      `;
      
      // Add remove handler
      tagEl.querySelector('.filter-tag-remove').addEventListener('click', () => {
        this.removeFilter(tag);
      });
      
      this.activeFiltersContainer.appendChild(tagEl);
    });

    // Show/hide clear all button
    if (this.clearAllBtn) {
      this.clearAllBtn.style.display = this.activeTags.length > 0 ? 'block' : 'none';
    }
  }

  removeFilter(tag) {
    // Uncheck the corresponding checkbox
    const checkbox = this.form.querySelector(`input[value="${tag}"]`);
    if (checkbox) {
      checkbox.checked = false;
    }
    
    this.handleFilterChange();
  }

  clearAllFilters() {
    // Uncheck all checkboxes
    this.form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    this.activeTags = [];
    this.updateActiveFilterTags();
    this.applyFilters();
  }

  applyFilters() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.currentPage = 1;
    
    // Build URL with tags and sort
    const collectionHandle = this.productGrid.dataset.collectionHandle;
    let url = `/collections/${collectionHandle}`;
    
    // Add tags to URL
    if (this.activeTags.length > 0) {
      const tagString = this.activeTags.join('+');
      url += `/${tagString}`;
    }
    
    // Add sort parameter
    const params = new URLSearchParams();
    if (this.currentSort !== 'manual') {
      params.append('sort_by', this.currentSort);
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    // Fetch filtered products
    fetch(url)
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newGrid = doc.querySelector('#product-grid .product-grid-wrapper');
        const gridWrapper = this.productGrid.querySelector('.product-grid-wrapper');
        
        if (newGrid && gridWrapper) {
          gridWrapper.innerHTML = newGrid.innerHTML;
          
          // Check if there are products
          if (newGrid.children.length === 0) {
            this.noResults.style.display = 'block';
            this.productGrid.style.display = 'none';
          } else {
            this.noResults.style.display = 'none';
            this.productGrid.style.display = 'block';
          }
          
          // Check for next page
          const loadingIndicator = doc.querySelector('.infinite-scroll-loading');
          const currentLoadingIndicator = this.productGrid.querySelector('.infinite-scroll-loading');
          
          if (loadingIndicator && currentLoadingIndicator) {
            currentLoadingIndicator.dataset.nextUrl = loadingIndicator.dataset.nextUrl;
            this.hasMorePages = true;
          } else {
            if (currentLoadingIndicator) {
              currentLoadingIndicator.remove();
            }
            this.hasMorePages = false;
          }
        }
        
        // Update URL without reload
        history.pushState({}, '', url);
        
        this.isLoading = false;
      })
      .catch(error => {
        console.error('Error loading products:', error);
        this.isLoading = false;
      });
  }

  setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoading) {
          this.loadMoreProducts();
        }
      });
    }, {
      rootMargin: '200px'
    });

    // Observe the loading indicator
    const checkForLoadingIndicator = () => {
      const loadingIndicator = this.productGrid.querySelector('.infinite-scroll-loading');
      if (loadingIndicator) {
        observer.observe(loadingIndicator);
      }
    };

    checkForLoadingIndicator();

    // Re-observe after filter changes
    const originalApplyFilters = this.applyFilters.bind(this);
    this.applyFilters = function() {
      originalApplyFilters();
      setTimeout(checkForLoadingIndicator, 500);
    };
  }

  loadMoreProducts() {
    const loadingIndicator = this.productGrid.querySelector('.infinite-scroll-loading');
    if (!loadingIndicator) return;
    
    const nextUrl = loadingIndicator.dataset.nextUrl;
    if (!nextUrl || this.isLoading) return;
    
    this.isLoading = true;
    loadingIndicator.querySelector('.loading-spinner').textContent = 'Loading...';
    
    fetch(nextUrl)
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newProducts = doc.querySelector('#product-grid .product-grid-wrapper');
        const gridWrapper = this.productGrid.querySelector('.product-grid-wrapper');
        
        if (newProducts && gridWrapper) {
          // Append new products
          Array.from(newProducts.children).forEach(product => {
            gridWrapper.appendChild(product);
          });
          
          // Update next URL or remove loading indicator
          const nextLoadingIndicator = doc.querySelector('.infinite-scroll-loading');
          if (nextLoadingIndicator) {
            loadingIndicator.dataset.nextUrl = nextLoadingIndicator.dataset.nextUrl;
            loadingIndicator.querySelector('.loading-spinner').textContent = 'Loading more products...';
          } else {
            loadingIndicator.remove();
          }
        }
        
        this.isLoading = false;
      })
      .catch(error => {
        console.error('Error loading more products:', error);
        loadingIndicator.querySelector('.loading-spinner').textContent = 'Error loading products';
        this.isLoading = false;
      });
  }

  loadFiltersFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const sortParam = urlParams.get('sort_by');
    
    if (sortParam && this.sortSelect) {
      this.sortSelect.value = sortParam;
      this.currentSort = sortParam;
    }

    // Extract tags from URL path
    const path = window.location.pathname;
    const match = path.match(/\/collections\/[^\/]+\/(.+)/);
    if (match) {
      const tags = match[1].split('+');
      tags.forEach(tag => {
        const decodedTag = decodeURIComponent(tag);
        const checkbox = this.form.querySelector(`input[value="${decodedTag}"]`);
        if (checkbox) {
          checkbox.checked = true;
          this.activeTags.push(decodedTag);
        }
      });
      this.updateActiveFilterTags();
    }
  }

  setupSearch() {
    if (!this.searchInput) return;

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
        if (query.length === 0) {
          this.applyFilters();
        }
      }
    });

    // Clear button handler
    if (this.searchClearBtn) {
      this.searchClearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.searchClearBtn.style.display = 'none';
        this.hideSearchResults();
        this.applyFilters();
      });
    }

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) && !this.searchResults.contains(e.target)) {
        this.hideSearchResults();
      }
    });

    // Show results again when focusing input
    this.searchInput.addEventListener('focus', () => {
      if (this.searchQuery && this.searchResults.querySelector('.search-result-item')) {
        this.searchResults.style.display = 'block';
      }
    });
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
      console.log('✅ Search API returned:', data.results.length, 'results');
      
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
      console.error('❌ Search API error:', error);
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
          <svg class="search-no-results-icon" viewBox="0 0 48 48" fill="none">
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
          console.log('✅ Collection search linking to variant:', result.matchedVariant.id, 'SKU:', result.primarySKU, 'Deposco:', result.deposcoId);
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
    new CollectionFilters();
  });
} else {
  new CollectionFilters();
}
