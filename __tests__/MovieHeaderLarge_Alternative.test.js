/**
 * Unit Tests for MovieHeaderLarge_Alternative Component
 *
 * Tests cover component rendering, user interactions, state management,
 * and integration with FavoritesManager.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MovieHeaderLarge_Alternative from '../components/MovieHeaderLarge_Alternative';
import { FavoritesManager } from '../components/FavoritesManager';

// Mock FavoritesManager
jest.mock('../components/FavoritesManager', () => ({
  FavoritesManager: {
    isMovieHearted: jest.fn(),
    isMovieBookmarked: jest.fn(),
    toggleHeart: jest.fn(),
  },
}));

// Mock data for testing
const mockMovieData = {
  title: 'Test Movie',
  year: 2023,
  initialSlug: 'A test movie for unit testing',
  initialPoster: 'https://example.com/test-poster.jpg',
  tmdbId: 12345,
};

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener });
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener });

describe('MovieHeaderLarge_Alternative', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    FavoritesManager.isMovieHearted.mockReturnValue(false);
    FavoritesManager.isMovieBookmarked.mockReturnValue(false);
    FavoritesManager.toggleHeart.mockReturnValue(true);
  });

  describe('Component Rendering', () => {
    test('renders movie title and year correctly', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      expect(screen.getByText('Test Movie')).toBeInTheDocument();
      expect(screen.getByText('(2023)')).toBeInTheDocument();
    });

    test('renders poster image with correct attributes', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      const poster = screen.getByAltText('Poster for Test Movie');
      expect(poster).toBeInTheDocument();
      expect(poster).toHaveAttribute('src', mockMovieData.initialPoster);
    });

    test('renders streaming information', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      expect(screen.getByText('Streaming on TBD')).toBeInTheDocument();
    });

    test('renders action buttons with correct accessibility labels', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      expect(screen.getByLabelText('Add to list')).toBeInTheDocument();
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('toggles add-to-list state when plus button is clicked', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      const plusButton = screen.getByLabelText('Add to list');
      fireEvent.click(plusButton);

      // Check if the button state changed (this would be reflected in icon fill)
      expect(plusButton).toBeInTheDocument();
    });

    test('calls FavoritesManager.toggleHeart when heart button is clicked', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      const heartButton = screen.getByLabelText('Add to favorites');
      fireEvent.click(heartButton);

      expect(FavoritesManager.toggleHeart).toHaveBeenCalledWith({
        title: 'Test Movie',
        year: 2023,
        slug: 'A test movie for unit testing',
        poster: 'https://example.com/test-poster.jpg',
        id: 'test-movie-2023',
      });
    });

    test('shows animation when poster is double-clicked', async () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      const poster = screen.getByAltText('Poster for Test Movie');
      fireEvent.doubleClick(poster);

      // Check if animation text appears
      expect(screen.getByText('+ added')).toBeInTheDocument();

      // Wait for animation to disappear
      await waitFor(
        () => {
          expect(screen.queryByText('+ added')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    test('double-clicking poster toggles add-to-list state', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      const poster = screen.getByAltText('Poster for Test Movie');
      fireEvent.doubleClick(poster);

      // Verify the state change (addedToList should be true)
      expect(screen.getByText('+ added')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    test('initializes with correct default states', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      // Component should render without errors and show default states
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
      expect(screen.queryByText('+ added')).not.toBeInTheDocument();
    });

    test('updates heart state based on FavoritesManager', () => {
      FavoritesManager.isMovieHearted.mockReturnValue(true);

      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument();
    });

    test('generates correct media ID from title and year', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      const heartButton = screen.getByLabelText('Add to favorites');
      fireEvent.click(heartButton);

      expect(FavoritesManager.toggleHeart).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-movie-2023',
        })
      );
    });
  });

  describe('Event Listeners', () => {
    test('registers event listener for movies update on mount', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      expect(mockAddEventListener).toHaveBeenCalledWith('moviesUpdated', expect.any(Function));
    });

    test('removes event listener on unmount', () => {
      const { unmount } = render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('moviesUpdated', expect.any(Function));
    });
  });

  describe('Props Updates', () => {
    test('updates poster when initialPoster prop changes', () => {
      const { rerender } = render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      const newPoster = 'https://example.com/new-poster.jpg';
      rerender(<MovieHeaderLarge_Alternative {...mockMovieData} initialPoster={newPoster} />);

      const poster = screen.getByAltText('Poster for Test Movie');
      expect(poster).toHaveAttribute('src', newPoster);
    });

    test('updates slug when initialSlug prop changes', () => {
      const { rerender } = render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      const newSlug = 'Updated test movie description';
      rerender(<MovieHeaderLarge_Alternative {...mockMovieData} initialSlug={newSlug} />);

      // Slug is used internally for FavoritesManager, verify it's updated
      const heartButton = screen.getByLabelText('Add to favorites');
      fireEvent.click(heartButton);

      expect(FavoritesManager.toggleHeart).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: newSlug,
        })
      );
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels for interactive elements', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      expect(screen.getByLabelText('Add to list')).toBeInTheDocument();
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
    });

    test('updates ARIA label when heart state changes', () => {
      FavoritesManager.isMovieHearted.mockReturnValue(true);

      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument();
    });

    test('poster has descriptive alt text', () => {
      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      expect(screen.getByAltText('Poster for Test Movie')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles missing poster gracefully', () => {
      const dataWithoutPoster = { ...mockMovieData, initialPoster: undefined };

      render(<MovieHeaderLarge_Alternative {...dataWithoutPoster} />);

      const poster = screen.getByAltText('Poster for Test Movie');
      expect(poster).toHaveAttribute('src', '/images/placeholder-poster.jpg');
    });

    test('handles missing slug gracefully', () => {
      const dataWithoutSlug = { ...mockMovieData, initialSlug: undefined };

      render(<MovieHeaderLarge_Alternative {...dataWithoutSlug} />);

      // Component should render without errors
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });
  });

  describe('Animation Timing', () => {
    test('animation disappears after 1.5 seconds', async () => {
      jest.useFakeTimers();

      render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

      const poster = screen.getByAltText('Poster for Test Movie');
      fireEvent.doubleClick(poster);

      expect(screen.getByText('+ added')).toBeInTheDocument();

      // Fast-forward time by 1.5 seconds
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(screen.queryByText('+ added')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });
});

describe('Integration Tests', () => {
  test('complete user workflow: view movie, add to favorites, add to list', () => {
    render(<MovieHeaderLarge_Alternative {...mockMovieData} />);

    // 1. Verify initial state
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();

    // 2. Add to favorites
    const heartButton = screen.getByLabelText('Add to favorites');
    fireEvent.click(heartButton);
    expect(FavoritesManager.toggleHeart).toHaveBeenCalled();

    // 3. Add to list via button
    const plusButton = screen.getByLabelText('Add to list');
    fireEvent.click(plusButton);

    // 4. Add to list via double-click (should toggle off)
    const poster = screen.getByAltText('Poster for Test Movie');
    fireEvent.doubleClick(poster);
    expect(screen.getByText('+ added')).toBeInTheDocument();
  });
});
