/**
 * FavoritesManager - Utility functions for managing hearts and bookmarks
 * Handles localStorage persistence and cross-component synchronization
 */

export const FavoritesManager = {
  // Debounced save mechanism to prevent excessive localStorage writes
  _saveTimeouts: {
    hearted: null,
    bookmarked: null,
    peopleHearted: null,
    peopleBookmarked: null
  },

  // In-memory cache for current state
  _cache: {
    hearted: null,
    bookmarked: null,
    peopleHearted: null,
    peopleBookmarked: null
  },

  // Debounced save to localStorage
  _debouncedSave: (type, data) => {
    // Clear existing timeout
    if (FavoritesManager._saveTimeouts[type]) {
      clearTimeout(FavoritesManager._saveTimeouts[type]);
    }
    
    // Set new timeout
    FavoritesManager._saveTimeouts[type] = setTimeout(() => {
      try {
        let key, eventName;
        if (type === 'hearted') {
          key = 'heartedMovies';
          eventName = 'moviesUpdated';
        } else if (type === 'bookmarked') {
          key = 'bookmarkedMovies';
          eventName = 'moviesUpdated';
        } else if (type === 'peopleHearted') {
          key = 'heartedPeople';
          eventName = 'peopleUpdated';
        } else if (type === 'peopleBookmarked') {
          key = 'bookmarkedPeople';
          eventName = 'peopleUpdated';
        }
        
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Debounced save completed for ${type}:`, data.length);
        
        // Dispatch update event
        window.dispatchEvent(new CustomEvent(eventName));
        
        FavoritesManager._saveTimeouts[type] = null;
      } catch (error) {
        console.error(`Error in debounced save for ${type}:`, error);
      }
    }, 500); // 500ms debounce
  },
  // Get hearted movies from cache or localStorage
  getHeartedMovies: () => {
    if (FavoritesManager._cache.hearted !== null) {
      return FavoritesManager._cache.hearted;
    }
    try {
      const saved = localStorage.getItem('heartedMovies');
      const movies = saved ? JSON.parse(saved) : [];
      FavoritesManager._cache.hearted = movies;
      return movies;
    } catch (error) {
      console.error('Error loading hearted movies:', error);
      return [];
    }
  },

  // Get bookmarked movies from cache or localStorage
  getBookmarkedMovies: () => {
    if (FavoritesManager._cache.bookmarked !== null) {
      return FavoritesManager._cache.bookmarked;
    }
    try {
      const saved = localStorage.getItem('bookmarkedMovies');
      const movies = saved ? JSON.parse(saved) : [];
      FavoritesManager._cache.bookmarked = movies;
      return movies;
    } catch (error) {
      console.error('Error loading bookmarked movies:', error);
      return [];
    }
  },

  // Check if a movie is hearted
  isMovieHearted: (movieId) => {
    const hearted = FavoritesManager.getHeartedMovies();
    return hearted.some(movie => movie.id === movieId);
  },

  // Check if a movie is bookmarked
  isMovieBookmarked: (movieId) => {
    const bookmarked = FavoritesManager.getBookmarkedMovies();
    return bookmarked.some(movie => movie.id === movieId);
  },

  // Add/remove heart for a movie
  toggleHeart: (movie) => {
    try {
      console.log('toggleHeart called with movie:', movie);
      
      if (!movie || !movie.title) {
        console.error('Invalid movie data:', movie);
        return false;
      }
      
      const hearted = FavoritesManager.getHeartedMovies();
      const movieId = movie.id || `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`;
      const movieData = { ...movie, id: movieId };
      
      console.log('Generated movieId:', movieId);
      console.log('Current hearted movies:', hearted.length);
      
      const existingIndex = hearted.findIndex(m => m.id === movieId);
      console.log('Existing index:', existingIndex);
      
      if (existingIndex >= 0) {
        // Remove from hearts
        hearted.splice(existingIndex, 1);
        console.log('Removed movie from hearts');
      } else {
        // Add to hearts
        hearted.push(movieData);
        console.log('Added movie to hearts');
      }
      
      // Update cache immediately for instant UI feedback
      FavoritesManager._cache.hearted = [...hearted];
      
      // Schedule debounced save to localStorage
      FavoritesManager._debouncedSave('hearted', hearted);
      console.log('Scheduled debounced save for hearted movies');
      
      return existingIndex < 0; // Return new state (true if now hearted)
    } catch (error) {
      console.error('Error in toggleHeart:', error);
      return false;
    }
  },

  // Add/remove bookmark for a movie
  toggleBookmark: (movie) => {
    try {
      console.log('toggleBookmark called with movie:', movie);
      
      if (!movie || !movie.title) {
        console.error('Invalid movie data:', movie);
        return false;
      }
      
      const bookmarked = FavoritesManager.getBookmarkedMovies();
      const movieId = movie.id || `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`;
      const movieData = { ...movie, id: movieId };
      
      console.log('Generated movieId:', movieId);
      console.log('Current bookmarked movies:', bookmarked.length);
      
      const existingIndex = bookmarked.findIndex(m => m.id === movieId);
      console.log('Existing index:', existingIndex);
      
      if (existingIndex >= 0) {
        // Remove from bookmarks
        bookmarked.splice(existingIndex, 1);
        console.log('Removed movie from bookmarks');
      } else {
        // Add to bookmarks
        bookmarked.push(movieData);
        console.log('Added movie to bookmarks');
      }
      
      // Update cache immediately for instant UI feedback
      FavoritesManager._cache.bookmarked = [...bookmarked];
      
      // Schedule debounced save to localStorage
      FavoritesManager._debouncedSave('bookmarked', bookmarked);
      console.log('Scheduled debounced save for bookmarked movies');
      
      return existingIndex < 0; // Return new state (true if now bookmarked)
    } catch (error) {
      console.error('Error in toggleBookmark:', error);
      return false;
    }
  },

  // Clear all hearted movies
  clearHeartedMovies: () => {
    localStorage.removeItem('heartedMovies');
    FavoritesManager._cache.hearted = [];
    window.dispatchEvent(new CustomEvent('moviesUpdated'));
  },

  // Clear all bookmarked movies
  clearBookmarkedMovies: () => {
    localStorage.removeItem('bookmarkedMovies');
    FavoritesManager._cache.bookmarked = [];
    window.dispatchEvent(new CustomEvent('moviesUpdated'));
  },

  // Clear all favorites data
  clearAllFavorites: () => {
    localStorage.removeItem('heartedMovies');
    localStorage.removeItem('bookmarkedMovies');
    localStorage.removeItem('heartedPeople');
    localStorage.removeItem('bookmarkedPeople');
    FavoritesManager._cache.hearted = [];
    FavoritesManager._cache.bookmarked = [];
    FavoritesManager._cache.peopleHearted = [];
    FavoritesManager._cache.peopleBookmarked = [];
    window.dispatchEvent(new CustomEvent('moviesUpdated'));
    window.dispatchEvent(new CustomEvent('peopleUpdated'));
  },

  // ============ PEOPLE METHODS ============

  // Get hearted people from cache or localStorage
  getHeartedPeople: () => {
    if (FavoritesManager._cache.peopleHearted !== null) {
      return FavoritesManager._cache.peopleHearted;
    }
    try {
      const saved = localStorage.getItem('heartedPeople');
      const people = saved ? JSON.parse(saved) : [];
      FavoritesManager._cache.peopleHearted = people;
      return people;
    } catch (error) {
      console.error('Error loading hearted people:', error);
      return [];
    }
  },

  // Get bookmarked people from cache or localStorage
  getBookmarkedPeople: () => {
    if (FavoritesManager._cache.peopleBookmarked !== null) {
      return FavoritesManager._cache.peopleBookmarked;
    }
    try {
      const saved = localStorage.getItem('bookmarkedPeople');
      const people = saved ? JSON.parse(saved) : [];
      FavoritesManager._cache.peopleBookmarked = people;
      return people;
    } catch (error) {
      console.error('Error loading bookmarked people:', error);
      return [];
    }
  },

  // Check if a person is hearted
  isPersonHearted: (personId) => {
    const hearted = FavoritesManager.getHeartedPeople();
    return hearted.some(person => person.id === personId);
  },

  // Check if a person is bookmarked
  isPersonBookmarked: (personId) => {
    const bookmarked = FavoritesManager.getBookmarkedPeople();
    return bookmarked.some(person => person.id === personId);
  },

  // Add/remove heart for a person
  togglePersonHeart: (person) => {
    try {
      console.log('togglePersonHeart called with person:', person);
      
      if (!person || !person.name) {
        console.error('Invalid person data:', person);
        return false;
      }
      
      const hearted = FavoritesManager.getHeartedPeople();
      const personId = person.id || `${person.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${person.birthYear || 'unknown'}`;
      const personData = { ...person, id: personId };
      
      console.log('Generated personId:', personId);
      console.log('Current hearted people:', hearted.length);
      
      const existingIndex = hearted.findIndex(p => p.id === personId);
      console.log('Existing index:', existingIndex);
      
      if (existingIndex >= 0) {
        // Remove from hearts
        hearted.splice(existingIndex, 1);
        console.log('Removed person from hearts');
      } else {
        // Add to hearts
        hearted.push(personData);
        console.log('Added person to hearts');
      }
      
      // Update cache immediately for instant UI feedback
      FavoritesManager._cache.peopleHearted = [...hearted];
      
      // Schedule debounced save to localStorage
      FavoritesManager._debouncedSave('peopleHearted', hearted);
      console.log('Scheduled debounced save for hearted people');
      
      return existingIndex < 0; // Return new state (true if now hearted)
    } catch (error) {
      console.error('Error in togglePersonHeart:', error);
      return false;
    }
  },

  // Add/remove bookmark for a person
  togglePersonBookmark: (person) => {
    try {
      console.log('togglePersonBookmark called with person:', person);
      
      if (!person || !person.name) {
        console.error('Invalid person data:', person);
        return false;
      }
      
      const bookmarked = FavoritesManager.getBookmarkedPeople();
      const personId = person.id || `${person.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${person.birthYear || 'unknown'}`;
      const personData = { ...person, id: personId };
      
      console.log('Generated personId:', personId);
      console.log('Current bookmarked people:', bookmarked.length);
      
      const existingIndex = bookmarked.findIndex(p => p.id === personId);
      console.log('Existing index:', existingIndex);
      
      if (existingIndex >= 0) {
        // Remove from bookmarks
        bookmarked.splice(existingIndex, 1);
        console.log('Removed person from bookmarks');
      } else {
        // Add to bookmarks
        bookmarked.push(personData);
        console.log('Added person to bookmarks');
      }
      
      // Update cache immediately for instant UI feedback
      FavoritesManager._cache.peopleBookmarked = [...bookmarked];
      
      // Schedule debounced save to localStorage
      FavoritesManager._debouncedSave('peopleBookmarked', bookmarked);
      console.log('Scheduled debounced save for bookmarked people');
      
      return existingIndex < 0; // Return new state (true if now bookmarked)
    } catch (error) {
      console.error('Error in togglePersonBookmark:', error);
      return false;
    }
  },

  // Clear all hearted people
  clearHeartedPeople: () => {
    localStorage.removeItem('heartedPeople');
    FavoritesManager._cache.peopleHearted = [];
    window.dispatchEvent(new CustomEvent('peopleUpdated'));
  },

  // Clear all bookmarked people
  clearBookmarkedPeople: () => {
    localStorage.removeItem('bookmarkedPeople');
    FavoritesManager._cache.peopleBookmarked = [];
    window.dispatchEvent(new CustomEvent('peopleUpdated'));
  }
};

export default FavoritesManager;