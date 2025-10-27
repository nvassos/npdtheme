/**
 * Collection Filters
 * Handles filtering, sorting, and pagination for collection pages
 */

class CollectionFilters extends HTMLElement {
  constructor() {
    super();
    this.filterForm = document.querySelector('#FacetFiltersForm');
    this.sortSelect = document.querySelector('#SortBy');
    this.productGrid = document.querySelector('#product-grid');
    
    this.init();
  }

  init() {
    this.setupFilterToggles();
    this.setupFilterChanges();
    this.setupSorting();
  }

  setupFilterToggles() {
    const filterTitles = document.querySelectorAll('.filter-group-title.collapsible');
    
    filterTitles.forEach(title => {
      title.addEventListener('click', (e) => {
        e.preventDefault();
        
        const filterOptions = title.nextElementSibling;
        const isExpanded = title.getAttribute('aria-expanded') === 'true';
        
        title.classList.toggle('collapsed');
        title.setAttribute('aria-expanded', !isExpanded);
        
        if (filterOptions) {
          filterOptions.classList.toggle('collapsed');
        }
      });
    });
  }

  setupFilterChanges() {
    if (!this.filterForm) return;
    
    const inputs = this.filterForm.querySelectorAll('input[type="checkbox"], input[type="number"]');
    
    inputs.forEach(input => {
      if (input.type === 'checkbox') {
        input.addEventListener('change', () => {
          this.applyFilters();
        });
      } else if (input.type === 'number') {
        // Debounce for number inputs
        let timeout;
        input.addEventListener('input', () => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            this.applyFilters();
          }, 500);
        });
      }
    });
  }

  setupSorting() {
    if (!this.sortSelect) return;
    
    this.sortSelect.addEventListener('change', () => {
      const sortValue = this.sortSelect.value;
      const url = new URL(window.location.href);
      
      if (sortValue) {
        url.searchParams.set('sort_by', sortValue);
      } else {
        url.searchParams.delete('sort_by');
      }
      
      window.location.href = url.toString();
    });
  }

  applyFilters() {
    const formData = new FormData(this.filterForm);
    const searchParams = new URLSearchParams();

    // Add all form data to search params
    for (const [key, value] of formData.entries()) {
      if (value) {
        searchParams.append(key, value);
      }
    }

    // Preserve sort parameter if it exists
    const currentSort = new URLSearchParams(window.location.search).get('sort_by');
    if (currentSort) {
      searchParams.set('sort_by', currentSort);
    }

    // Update URL with new filters
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    
    // Use History API to avoid page reload
    window.history.pushState({}, '', newUrl);
    
    // Fetch and update the product grid
    this.fetchFilteredProducts(newUrl);
  }

  async fetchFilteredProducts(url) {
    if (!this.productGrid) return;
    
    // Show loading state
    this.productGrid.style.opacity = '0.5';
    this.productGrid.style.pointerEvents = 'none';
    
    try {
      const response = await fetch(`${url}&section_id=main-collection-product-grid`);
      const html = await response.text();
      
      // Parse the response to extract just the product grid
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newProductGrid = doc.querySelector('#product-grid');
      
      if (newProductGrid) {
        this.productGrid.innerHTML = newProductGrid.innerHTML;
      }
      
      // Update active filters
      const newActiveFilters = doc.querySelector('#active-filters');
      const currentActiveFilters = document.querySelector('#active-filters');
      if (newActiveFilters && currentActiveFilters) {
        currentActiveFilters.innerHTML = newActiveFilters.innerHTML;
      }
      
      // Update product count
      const newProductCount = doc.querySelector('#ProductCount');
      const currentProductCount = document.querySelector('#ProductCount');
      if (newProductCount && currentProductCount) {
        currentProductCount.textContent = newProductCount.textContent;
      }
      
    } catch (error) {
      console.error('Error fetching filtered products:', error);
    } finally {
      // Remove loading state
      this.productGrid.style.opacity = '1';
      this.productGrid.style.pointerEvents = 'auto';
    }
  }
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CollectionFilters();
  });
} else {
  new CollectionFilters();
}

