/**
 * FavoritesContext - React Context wrapper for FavoritesManager
 * Provides centralized state management for favorites across components
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { FavoritesManager } from '../components/FavoritesManager';

const FavoritesContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  // State for movie favorites
  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  
  // State for people favorites (if needed later)
  const [heartedPeople, setHeartedPeople] = useState([]);
  const [bookmarkedPeople, setBookmarkedPeople] = useState([]);
  
  // Loading state
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize state from localStorage on mount
  useEffect(() => {
    try {
      setHeartedMovies(FavoritesManager.getHeartedMovies());
      setBookmarkedMovies(FavoritesManager.getBookmarkedMovies());
      setHeartedPeople(FavoritesManager.getHeartedPeople());
      setBookmarkedPeople(FavoritesManager.getBookmarkedPeople());
      setIsLoaded(true);
    } catch (error) {
      console.error('Error initializing favorites context:', error);
      setIsLoaded(true); // Still mark as loaded to prevent infinite loading
    }
  }, []);

  // Listen for favorites updates from other components/tabs
  useEffect(() => {
    const handleMoviesUpdate = () => {
      try {
        setHeartedMovies(FavoritesManager.getHeartedMovies());
        setBookmarkedMovies(FavoritesManager.getBookmarkedMovies());
      } catch (error) {
        console.error('Error updating movies in context:', error);
      }
    };

    const handlePeopleUpdate = () => {
      try {
        setHeartedPeople(FavoritesManager.getHeartedPeople());
        setBookmarkedPeople(FavoritesManager.getBookmarkedPeople());
      } catch (error) {
        console.error('Error updating people in context:', error);
      }
    };

    // Listen for custom events from FavoritesManager
    window.addEventListener('moviesUpdated', handleMoviesUpdate);
    window.addEventListener('peopleUpdated', handlePeopleUpdate);

    return () => {
      window.removeEventListener('moviesUpdated', handleMoviesUpdate);
      window.removeEventListener('peopleUpdated', handlePeopleUpdate);
    };
  }, []);

  // Movie methods with context state updates
  const toggleMovieHeart = (movie) => {
    try {
      const newState = FavoritesManager.toggleHeart(movie);
      // Update context state immediately for UI responsiveness
      setHeartedMovies(FavoritesManager.getHeartedMovies());
      return newState;
    } catch (error) {
      console.error('Error toggling movie heart in context:', error);
      return false;
    }
  };

  const toggleMovieBookmark = (movie) => {
    try {
      const newState = FavoritesManager.toggleBookmark(movie);
      // Update context state immediately for UI responsiveness
      setBookmarkedMovies(FavoritesManager.getBookmarkedMovies());
      return newState;
    } catch (error) {
      console.error('Error toggling movie bookmark in context:', error);
      return false;
    }
  };

  // Check methods
  const isMovieHearted = (movieId) => {
    return heartedMovies.some(movie => movie.id === movieId);
  };

  const isMovieBookmarked = (movieId) => {
    return bookmarkedMovies.some(movie => movie.id === movieId);
  };

  // People methods (for future use)
  const togglePersonHeart = (person) => {
    try {
      const newState = FavoritesManager.togglePersonHeart(person);
      setHeartedPeople(FavoritesManager.getHeartedPeople());
      return newState;
    } catch (error) {
      console.error('Error toggling person heart in context:', error);
      return false;
    }
  };

  const togglePersonBookmark = (person) => {
    try {
      const newState = FavoritesManager.togglePersonBookmark(person);
      setBookmarkedPeople(FavoritesManager.getBookmarkedPeople());
      return newState;
    } catch (error) {
      console.error('Error toggling person bookmark in context:', error);
      return false;
    }
  };

  const isPersonHearted = (personId) => {
    return heartedPeople.some(person => person.id === personId);
  };

  const isPersonBookmarked = (personId) => {
    return bookmarkedPeople.some(person => person.id === personId);
  };

  const contextValue = {
    // State
    heartedMovies,
    bookmarkedMovies,
    heartedPeople,
    bookmarkedPeople,
    isLoaded,

    // Movie methods
    toggleMovieHeart,
    toggleMovieBookmark,
    isMovieHearted,
    isMovieBookmarked,

    // People methods
    togglePersonHeart,
    togglePersonBookmark,
    isPersonHearted,
    isPersonBookmarked,

    // Direct access to FavoritesManager for advanced operations
    manager: FavoritesManager,
  };

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
};

export default FavoritesContext;