/**
 * Static Movie Page Interactions
 * 
 * Minimal JavaScript for user interactions on static HTML pages.
 * Preserves exact UX/functionality from React components while using vanilla JS.
 */

class StaticMovieInteractions {
  constructor() {
    this.movieId = null;
    this.expandedSections = {
      featuredFilms: true, // Match original - start expanded
      exploreTopics: false,
      whyWatch: false
    };
    
    this.init();
  }

  init() {
    // Extract movie ID from page
    const moviePage = document.querySelector('.movie-page');
    this.movieId = moviePage?.dataset.movieId;
    
    // Initialize all interactions
    this.initActionButtons();
    this.initSectionToggles();
    this.initMovieCardActions();
    this.initSearchFunctionality();
    
    // Set initial section states to match React component behavior
    this.applySectionStates();
    
    console.log('🧪 Static movie interactions initialized');
  }

  /**
   * Initialize main action bar buttons (Add, Seen, Play)
   * Preserves exact functionality from TestMovieHeaderLarge component
   */
  initActionButtons() {
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach(button => {
      const action = button.dataset.action;
      
      // Load initial state from localStorage (matches React component)
      this.loadActionButtonState(button, action);
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleActionButton(button, action);
      });
    });
  }

  loadActionButtonState(button, action) {
    try {
      const favorites = JSON.parse(localStorage.getItem('moviegenius-favorites') || '{"hearted": [], "bookmarked": []}');
      const mediaId = this.generateMediaId();
      
      if (action === 'bookmark') {
        const isBookmarked = favorites.bookmarked.includes(mediaId);
        button.classList.toggle('active', isBookmarked);
      } else if (action === 'heart') {
        const isHearted = favorites.hearted.includes(mediaId);
        button.classList.toggle('active', isHearted);
      }
    } catch (error) {
      console.error('Failed to load action button state:', error);
    }
  }

  handleActionButton(button, action) {
    if (action === 'bookmark') {
      this.toggleBookmark(button);
    } else if (action === 'heart') {
      this.toggleHeart(button);
    } else if (action === 'play') {
      this.handlePlayTrailer();
    }
  }

  /**
   * Toggle bookmark state (matches TestMovieHeaderLarge localStorage logic)
   */
  toggleBookmark(button) {
    try {
      const favorites = JSON.parse(localStorage.getItem('moviegenius-favorites') || '{"hearted": [], "bookmarked": []}');
      const mediaId = this.generateMediaId();
      const isBookmarked = button.classList.contains('active');
      const newBookmarked = !isBookmarked;
      
      if (newBookmarked) {
        if (!favorites.bookmarked.includes(mediaId)) {
          favorites.bookmarked.push(mediaId);
        }
      } else {
        favorites.bookmarked = favorites.bookmarked.filter(id => id !== mediaId);
      }
      
      localStorage.setItem('moviegenius-favorites', JSON.stringify(favorites));
      button.classList.toggle('active', newBookmarked);
      
    } catch (error) {
      console.error('Failed to toggle bookmark state:', error);
    }
  }

  /**
   * Toggle heart state (matches TestMovieHeaderLarge localStorage logic)
   */
  toggleHeart(button) {
    try {
      const favorites = JSON.parse(localStorage.getItem('moviegenius-favorites') || '{"hearted": [], "bookmarked": []}');
      const mediaId = this.generateMediaId();
      const isHearted = button.classList.contains('active');
      const newHearted = !isHearted;
      
      if (newHearted) {
        if (!favorites.hearted.includes(mediaId)) {
          favorites.hearted.push(mediaId);
        }
      } else {
        favorites.hearted = favorites.hearted.filter(id => id !== mediaId);
      }
      
      localStorage.setItem('moviegenius-favorites', JSON.stringify(favorites));
      button.classList.toggle('active', newHearted);
      
    } catch (error) {
      console.error('Failed to toggle heart state:', error);
    }
  }

  handlePlayTrailer() {
    console.log('🧪 TEST: Trailer would play');
    // In production, this would integrate with trailer API
  }

  /**
   * Generate media ID (matches React component logic)
   */
  generateMediaId() {
    const title = document.querySelector('.title')?.textContent || '';
    const year = document.querySelector('.year')?.textContent || '';
    return `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
  }

  /**
   * Initialize section toggle functionality
   * Preserves exact behavior from TestMovieAnalysisWithEntities
   */
  initSectionToggles() {
    const sectionHeaders = document.querySelectorAll('.section-header[data-toggle]');
    
    sectionHeaders.forEach(header => {
      const sectionName = header.dataset.toggle;
      
      header.addEventListener('click', () => {
        this.toggleSection(sectionName);
      });
    });
  }

  toggleSection(sectionName) {
    this.expandedSections[sectionName] = !this.expandedSections[sectionName];
    this.applySectionState(sectionName);
  }

  applySectionStates() {
    Object.keys(this.expandedSections).forEach(sectionName => {
      this.applySectionState(sectionName);
    });
  }

  applySectionState(sectionName) {
    const isExpanded = this.expandedSections[sectionName];
    const header = document.querySelector(`.section-header[data-toggle="${sectionName}"]`);
    const content = document.querySelector(`.section-content[data-section="${sectionName}"]`);
    
    if (header && content) {
      header.dataset.expanded = isExpanded;
      content.classList.toggle('expanded', isExpanded);
      content.classList.toggle('collapsible', !isExpanded);
    }
  }

  /**
   * Initialize movie card action buttons
   * Preserves functionality from production MediaCard components
   */
  initMovieCardActions() {
    const cardActionButtons = document.querySelectorAll('.card-action-btn');
    
    cardActionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const action = button.dataset.action;
        button.classList.toggle('active');
        
        // Visual feedback for card actions
        if (action === 'heart') {
          this.showCardFeedback(button, 'Hearted!');
        } else if (action === 'bookmark') {
          this.showCardFeedback(button, 'Added!');
        }
      });
    });
  }

  showCardFeedback(button, message) {
    // Create temporary feedback element
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.cssText = `
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      z-index: 1000;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.3s ease;
    `;
    
    button.style.position = 'relative';
    button.appendChild(feedback);
    
    // Remove feedback after animation
    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, 1500);
  }

  /**
   * Initialize search functionality
   * Placeholder for future search integration
   */
  initSearchFunctionality() {
    const searchInput = document.querySelector('.search-input');
    
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = searchInput.value.trim();
          if (query) {
            console.log('🧪 TEST: Would search for:', query);
            // In production, this would trigger search navigation
          }
        }
      });
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new StaticMovieInteractions();
});