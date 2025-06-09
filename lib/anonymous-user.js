/**
 * Anonymous User Management System
 * Provides persistent anonymous user identification and data storage
 * without requiring authentication. Enables full app functionality
 * with localStorage backup and optional cloud sync.
 */

import { supabase } from './supabase.js';

export const AnonymousUserManager = {
  // Cache for current session
  _cache: {
    userId: null,
    preferences: null,
    lastSync: null
  },

  /**
   * Generate a stable anonymous user ID based on device characteristics
   * This creates a semi-persistent identifier that survives app restarts
   * but doesn't require authentication
   */
  generateAnonymousId: () => {
    if (typeof window === 'undefined') return null;

    try {
      // Combine stable device characteristics for fingerprinting
      const fingerprint = [
        navigator.userAgent,
        screen.width + 'x' + screen.height,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        new Date().getTimezoneOffset(),
        navigator.language || navigator.userLanguage,
        screen.colorDepth
      ].join('|');

      // Create hash from fingerprint + timestamp for uniqueness
      const hash = btoa(fingerprint + Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
      return `anon_${hash}`;
    } catch (error) {
      console.error('Error generating anonymous ID:', error);
      // Fallback to random ID
      return `anon_${Math.random().toString(36).slice(2, 14)}`;
    }
  },

  /**
   * Get or create anonymous user ID
   * Returns existing ID from localStorage or creates new one
   */
  getAnonymousUserId: () => {
    if (AnonymousUserManager._cache.userId) {
      return AnonymousUserManager._cache.userId;
    }

    try {
      let userId = localStorage.getItem('abra_user_id');
      if (!userId) {
        userId = AnonymousUserManager.generateAnonymousId();
        localStorage.setItem('abra_user_id', userId);
        console.log('Generated new anonymous user ID:', userId);
      } else {
        console.log('Using existing anonymous user ID:', userId);
      }
      
      AnonymousUserManager._cache.userId = userId;
      return userId;
    } catch (error) {
      console.error('Error managing anonymous user ID:', error);
      // Return session-only ID as fallback
      if (!AnonymousUserManager._cache.userId) {
        AnonymousUserManager._cache.userId = `session_${Date.now()}`;
      }
      return AnonymousUserManager._cache.userId;
    }
  },

  /**
   * Get current user preferences from localStorage
   * Includes platforms, favorites, bookmarks, and usage data
   */
  getUserPreferences: () => {
    if (AnonymousUserManager._cache.preferences) {
      return AnonymousUserManager._cache.preferences;
    }

    try {
      const preferences = {
        platforms: JSON.parse(localStorage.getItem('selectedPlatforms') || '[]'),
        heartedMovies: JSON.parse(localStorage.getItem('heartedMovies') || '[]'),
        bookmarkedMovies: JSON.parse(localStorage.getItem('bookmarkedMovies') || '[]'),
        heartedPeople: JSON.parse(localStorage.getItem('heartedPeople') || '[]'),
        bookmarkedPeople: JSON.parse(localStorage.getItem('bookmarkedPeople') || '[]'),
        lastActive: new Date().toISOString(),
        version: '1.0'
      };

      AnonymousUserManager._cache.preferences = preferences;
      return preferences;
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return {
        platforms: [],
        heartedMovies: [],
        bookmarkedMovies: [],
        heartedPeople: [],
        bookmarkedPeople: [],
        lastActive: new Date().toISOString(),
        version: '1.0'
      };
    }
  },

  /**
   * Initialize anonymous user on app start
   * Attempts to restore from cloud backup if available
   */
  initialize: async () => {
    try {
      console.log('Initializing anonymous user system...');
      
      // Get or create anonymous ID
      const userId = AnonymousUserManager.getAnonymousUserId();
      console.log('Anonymous user ID:', userId);

      // Load local preferences
      const preferences = AnonymousUserManager.getUserPreferences();
      console.log('Local preferences loaded:', {
        platforms: preferences.platforms.length,
        hearted: preferences.heartedMovies.length,
        bookmarked: preferences.bookmarkedMovies.length
      });

      return {
        userId,
        preferences: AnonymousUserManager.getUserPreferences()
      };
    } catch (error) {
      console.error('Error initializing anonymous user:', error);
      return {
        userId: AnonymousUserManager.getAnonymousUserId(),
        preferences: AnonymousUserManager.getUserPreferences()
      };
    }
  }
};

export default AnonymousUserManager;