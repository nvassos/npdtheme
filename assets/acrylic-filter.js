/**
 * Acrylic Filter System
 * Handles filtering of products based on acrylic type and display type tags
 */

class AcrylicFilter {
  constructor() {
    this.filterCards = document.querySelectorAll('.filter-card');
    this.filterPills = document.querySelectorAll('.filter-pill');
    this.productCards = document.querySelectorAll('.product-card');
    this.noResults = document.getElementById('acrylicNoResults');
    this.productGrid = document.getElementById('acrylicProductGrid');
    
    this.init();
  }

  init() {
    if (!this.productCards.length) return;

    // Handle filter card clicks (acrylic types)
    this.filterCards.forEach(card => {
      card.addEventListener('click', () => {
        card.classList.toggle('active');
        this.applyFilters();
      });
    });

    // Handle filter pill clicks (display types)
    this.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        pill.classList.toggle('active');
        this.applyFilters();
      });
    });

    // Initial display - show all products
    this.showAllProducts();
  }

  applyFilters() {
    // Get selected acrylic type tags
    const selectedAcrylicTags = Array.from(
      document.querySelectorAll('.filter-card.active')
    ).map(card => card.getAttribute('data-acrylic'));

    // Get selected display type tags
    const selectedDisplayTags = Array.from(
      document.querySelectorAll('.filter-pill.active')
    ).map(pill => pill.getAttribute('data-display-type'));

    let visibleCount = 0;

    this.productCards.forEach(product => {
      // Get all product tags and split into array
      const productTagsStr = product.getAttribute('data-product-tags') || '';
      const productTags = productTagsStr.split(',').map(tag => tag.trim().toLowerCase());

      // Check if product matches acrylic filter
      const matchesAcrylic = selectedAcrylicTags.length === 0 || 
        selectedAcrylicTags.some(tag => 
          productTags.includes(tag.toLowerCase())
        );

      // Check if product matches display filter
      const matchesDisplay = selectedDisplayTags.length === 0 || 
        selectedDisplayTags.some(tag => 
          productTags.includes(tag.toLowerCase())
        );

      // Product must match both filter types (if they are active)
      if (matchesAcrylic && matchesDisplay) {
        product.classList.remove('hidden');
        visibleCount++;
      } else {
        product.classList.add('hidden');
      }
    });

    // Show/hide no results message
    this.updateNoResultsMessage(visibleCount);
  }

  showAllProducts() {
    this.productCards.forEach(product => {
      product.classList.remove('hidden');
    });
    if (this.noResults) {
      this.noResults.style.display = 'none';
    }
  }

  updateNoResultsMessage(visibleCount) {
    if (!this.noResults || !this.productGrid) return;

    if (visibleCount === 0) {
      this.noResults.style.display = 'block';
      this.productGrid.style.display = 'none';
    } else {
      this.noResults.style.display = 'none';
      this.productGrid.style.display = 'grid';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AcrylicFilter();
  });
} else {
  new AcrylicFilter();
}

