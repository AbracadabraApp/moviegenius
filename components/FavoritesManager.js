/**
 * FavoritesManager - Utility functions for managing hearts and bookmarks
 * Handles localStorage persistence and cross-component synchronization
 */

export const FavoritesManager = {
  // Debounced save mechanism to prevent excessive localStorage writes
  _saveTimeouts: {
    watched: null,
    liked: null,
    bookmarked: null,
    peopleHearted: null,
    peopleBookmarked: null,
  },

  // In-memory cache for current state
  _cache: {
    watched: null,
    liked: null,
    bookmarked: null,
    peopleHearted: null,
    peopleBookmarked: null,
  },

  // Debounced save to localStorage
  _debouncedSave: (type, data) => {
    // SSR guard - skip on server
    if (typeof window === 'undefined') {
      return;
    }

    // Clear existing timeout
    if (FavoritesManager._saveTimeouts[type]) {
      clearTimeout(FavoritesManager._saveTimeouts[type]);
    }

    // Set new timeout
    FavoritesManager._saveTimeouts[type] = setTimeout(() => {
      try {
        let key, eventName;
        if (type === 'watched') {
          key = 'watchedMovies';
          eventName = 'moviesUpdated';
        } else if (type === 'liked') {
          key = 'likedMovies';
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

        // Dispatch update event
        window.dispatchEvent(new CustomEvent(eventName));

        FavoritesManager._saveTimeouts[type] = null;
      } catch (error) {
        // Error in debounced save - silently continue
      }
    }, 500); // 500ms debounce
  },
  // Get watched movies from cache or localStorage
  getWatchedMovies: () => {
    if (FavoritesManager._cache.watched !== null) {
      return FavoritesManager._cache.watched;
    }
    // SSR guard - return empty array on server
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const saved = localStorage.getItem('watchedMovies');
      const movies = saved ? JSON.parse(saved) : [];
      FavoritesManager._cache.watched = movies;
      return movies;
    } catch (error) {
      return [];
    }
  },

  // Get liked movies from cache or localStorage
  getLikedMovies: () => {
    if (FavoritesManager._cache.liked !== null) {
      return FavoritesManager._cache.liked;
    }
    // SSR guard - return empty array on server
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const saved = localStorage.getItem('likedMovies');
      const movies = saved ? JSON.parse(saved) : [];
      FavoritesManager._cache.liked = movies;
      return movies;
    } catch (error) {
      return [];
    }
  },

  // Get bookmarked movies from cache or localStorage
  getBookmarkedMovies: () => {
    if (FavoritesManager._cache.bookmarked !== null) {
      return FavoritesManager._cache.bookmarked;
    }
    // SSR guard - return empty array on server
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const saved = localStorage.getItem('bookmarkedMovies');
      const movies = saved ? JSON.parse(saved) : [];
      FavoritesManager._cache.bookmarked = movies;
      return movies;
    } catch (error) {
      return [];
    }
  },

  // Check if a movie is watched
  isMovieWatched: movieId => {
    const watched = FavoritesManager.getWatchedMovies();
    return watched.some(movie => movie.id === movieId);
  },

  // Check if a movie is liked
  isMovieLiked: movieId => {
    const liked = FavoritesManager.getLikedMovies();
    return liked.some(movie => movie.id === movieId);
  },

  // Check if a movie is bookmarked
  isMovieBookmarked: movieId => {
    const bookmarked = FavoritesManager.getBookmarkedMovies();
    return bookmarked.some(movie => movie.id === movieId);
  },

  // Add/remove watched for a movie
  toggleWatched: movie => {
    try {

      if (!movie || !movie.title) {
        return false;
      }

      const watched = FavoritesManager.getWatchedMovies();
      const movieId =
        movie.id || `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`;
      const movieData = { ...movie, id: movieId };


      const existingIndex = watched.findIndex(m => m.id === movieId);

      if (existingIndex >= 0) {
        // Remove from watched
        watched.splice(existingIndex, 1);
      } else {
        // Add to watched
        watched.push(movieData);
      }

      // Update cache immediately for instant UI feedback
      FavoritesManager._cache.watched = [...watched];

      // Schedule debounced save to localStorage
      FavoritesManager._debouncedSave('watched', watched);

      return existingIndex < 0; // Return new state (true if now watched)
    } catch (error) {
      return false;
    }
  },

  // Alias for toggleWatched (for backward compatibility)
  toggleHeart: movie => FavoritesManager.toggleWatched(movie),

  // Check if a movie is hearted (alias for isMovieWatched)
  isMovieHearted: movieId => FavoritesManager.isMovieWatched(movieId),

  // Add/remove like for a movie
  toggleLiked: movie => {
    try {

      if (!movie || !movie.title) {
        return false;
      }

      const liked = FavoritesManager.getLikedMovies();
      const movieId =
        movie.id || `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`;
      const movieData = { ...movie, id: movieId };


      const existingIndex = liked.findIndex(m => m.id === movieId);

      if (existingIndex >= 0) {
        // Remove from liked
        liked.splice(existingIndex, 1);
      } else {
        // Add to liked
        liked.push(movieData);
      }

      // Update cache immediately for instant UI feedback
      FavoritesManager._cache.liked = [...liked];

      // Schedule debounced save to localStorage
      FavoritesManager._debouncedSave('liked', liked);

      return existingIndex < 0; // Return new state (true if now liked)
    } catch (error) {
      return false;
    }
  },

  // Add/remove bookmark for a movie
  toggleBookmark: movie => {
    try {

      if (!movie || !movie.title) {
        return false;
      }

      const bookmarked = FavoritesManager.getBookmarkedMovies();
      const movieId =
        movie.id || `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`;
      const movieData = { ...movie, id: movieId };


      const existingIndex = bookmarked.findIndex(m => m.id === movieId);

      if (existingIndex >= 0) {
        // Remove from bookmarks
        bookmarked.splice(existingIndex, 1);
      } else {
        // Add to bookmarks
        bookmarked.push(movieData);
      }

      // Update cache immediately for instant UI feedback
      FavoritesManager._cache.bookmarked = [...bookmarked];

      // Schedule debounced save to localStorage
      FavoritesManager._debouncedSave('bookmarked', bookmarked);

      return existingIndex < 0; // Return new state (true if now bookmarked)
    } catch (error) {
      return false;
    }
  },

  // Clear all watched movies
  clearWatchedMovies: () => {
    // SSR guard - skip on server
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem('watchedMovies');
    FavoritesManager._cache.watched = [];
    window.dispatchEvent(new CustomEvent('moviesUpdated'));
  },

  // Clear all liked movies
  clearLikedMovies: () => {
    // SSR guard - skip on server
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem('likedMovies');
    FavoritesManager._cache.liked = [];
    window.dispatchEvent(new CustomEvent('moviesUpdated'));
  },

  // Clear all bookmarked movies
  clearBookmarkedMovies: () => {
    // SSR guard - skip on server
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem('bookmarkedMovies');
    FavoritesManager._cache.bookmarked = [];
    window.dispatchEvent(new CustomEvent('moviesUpdated'));
  },

  // Clear all favorites data
  clearAllFavorites: () => {
    // SSR guard - skip on server
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem('watchedMovies');
    localStorage.removeItem('likedMovies');
    localStorage.removeItem('bookmarkedMovies');
    localStorage.removeItem('heartedPeople');
    localStorage.removeItem('bookmarkedPeople');
    FavoritesManager._cache.watched = [];
    FavoritesManager._cache.liked = [];
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
    // SSR guard - return empty array on server
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const saved = localStorage.getItem('heartedPeople');
      const people = saved ? JSON.parse(saved) : [];
      FavoritesManager._cache.peopleHearted = people;
      return people;
    } catch (error) {
      return [];
    }
  },

  // Get bookmarked people from cache or localStorage
  getBookmarkedPeople: () => {
    if (FavoritesManager._cache.peopleBookmarked !== null) {
      return FavoritesManager._cache.peopleBookmarked;
    }
    // SSR guard - return empty array on server
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const saved = localStorage.getItem('bookmarkedPeople');
      const people = saved ? JSON.parse(saved) : [];
      FavoritesManager._cache.peopleBookmarked = people;
      return people;
    } catch (error) {
      return [];
    }
  },

  // Check if a person is hearted
  isPersonHearted: personId => {
    const hearted = FavoritesManager.getHeartedPeople();
    return hearted.some(person => person.id === personId);
  },

  // Check if a person is bookmarked
  isPersonBookmarked: personId => {
    const bookmarked = FavoritesManager.getBookmarkedPeople();
    return bookmarked.some(person => person.id === personId);
  },

  // Add/remove heart for a person
  togglePersonHeart: person => {
    try {

      if (!person || !person.name) {
        return false;
      }

      const hearted = FavoritesManager.getHeartedPeople();
      const personId =
        person.id ||
        `${person.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${person.birthYear || 'unknown'}`;
      const personData = { ...person, id: personId };


      const existingIndex = hearted.findIndex(p => p.id === personId);

      if (existingIndex >= 0) {
        // Remove from hearts
        hearted.splice(existingIndex, 1);
      } else {
        // Add to hearts
        hearted.push(personData);
      }

      // Update cache immediately for instant UI feedback
      FavoritesManager._cache.peopleHearted = [...hearted];

      // Schedule debounced save to localStorage
      FavoritesManager._debouncedSave('peopleHearted', hearted);

      return existingIndex < 0; // Return new state (true if now hearted)
    } catch (error) {
      return false;
    }
  },

  // Add/remove bookmark for a person
  togglePersonBookmark: person => {
    try {

      if (!person || !person.name) {
        return false;
      }

      const bookmarked = FavoritesManager.getBookmarkedPeople();
      const personId =
        person.id ||
        `${person.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${person.birthYear || 'unknown'}`;
      const personData = { ...person, id: personId };


      const existingIndex = bookmarked.findIndex(p => p.id === personId);

      if (existingIndex >= 0) {
        // Remove from bookmarks
        bookmarked.splice(existingIndex, 1);
      } else {
        // Add to bookmarks
        bookmarked.push(personData);
      }

      // Update cache immediately for instant UI feedback
      FavoritesManager._cache.peopleBookmarked = [...bookmarked];

      // Schedule debounced save to localStorage
      FavoritesManager._debouncedSave('peopleBookmarked', bookmarked);

      return existingIndex < 0; // Return new state (true if now bookmarked)
    } catch (error) {
      return false;
    }
  },

  // Clear all hearted people
  clearHeartedPeople: () => {
    // SSR guard - skip on server
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem('heartedPeople');
    FavoritesManager._cache.peopleHearted = [];
    window.dispatchEvent(new CustomEvent('peopleUpdated'));
  },

  // Clear all bookmarked people
  clearBookmarkedPeople: () => {
    // SSR guard - skip on server
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem('bookmarkedPeople');
    FavoritesManager._cache.peopleBookmarked = [];
    window.dispatchEvent(new CustomEvent('peopleUpdated'));
  },

  // ============ SUBCATEGORY BOOKMARK METHODS ============

  // Get all bookmarked subcategories
  getBookmarkedSubcategories: () => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('bookmarkedCollections');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  // Check if a subcategory is bookmarked
  isSubcategoryBookmarked: (collectionId, subcategoryName) => {
    const all = FavoritesManager.getBookmarkedSubcategories();
    return all.some(b => b.collectionId === collectionId && b.subcategoryName === subcategoryName);
  },

  // Toggle bookmark for a subcategory — pass subcategory movies for snapshot
  toggleSubcategoryBookmark: (collectionId, collectionTitle, subcategoryName, movies) => {
    if (typeof window === 'undefined') return false;
    try {
      const all = FavoritesManager.getBookmarkedSubcategories();
      const idx = all.findIndex(b => b.collectionId === collectionId && b.subcategoryName === subcategoryName);

      if (idx >= 0) {
        all.splice(idx, 1);
        localStorage.setItem('bookmarkedCollections', JSON.stringify(all));
        window.dispatchEvent(new CustomEvent('subcategoriesUpdated'));
        return false; // now unbookmarked
      } else {
        const snapshot = (movies || []).slice(0, 6).map(m => ({
          tmdb_id: m.tmdb_id,
          title: m.title,
          year: m.year,
          poster_url: m.poster_url,
        }));
        all.push({
          collectionId,
          collectionTitle,
          subcategoryName,
          movies: snapshot,
          savedAt: new Date().toISOString(),
        });
        localStorage.setItem('bookmarkedCollections', JSON.stringify(all));
        window.dispatchEvent(new CustomEvent('subcategoriesUpdated'));
        return true; // now bookmarked
      }
    } catch {
      return false;
    }
  },
};

export default FavoritesManager;
