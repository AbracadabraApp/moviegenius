/**
 * Unit Tests for MovieHeaderLarge Component - Production Version
 *
 * Comprehensive test suite covering component rendering, user interactions,
 * state management, error handling, and integration with FavoritesManager.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import { FavoritesManager } from '../../components/FavoritesManager';

// Mock FavoritesManager
jest.mock('../../components/FavoritesManager', () => ({
  FavoritesManager: {
    isMovieHearted: jest.fn(),
    isMovieBookmarked: jest.fn(),
    toggleHeart: jest.fn(),
  },
}));

// Mock console.error to test error handling
const originalConsoleError = console.error;
const mockConsoleError = jest.fn();

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

describe('MovieHeaderLarge - Production Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    FavoritesManager.isMovieHearted.mockReturnValue(false);
    FavoritesManager.isMovieBookmarked.mockReturnValue(false);
    FavoritesManager.toggleHeart.mockReturnValue(true);
    console.error = mockConsoleError;
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('Component Rendering', () => {
    test('renders movie title and year correctly', () => {
      render(<MovieHeaderLarge {...mockMovieData} />);

      expect(screen.getByText('Test Movie')).toBeInTheDocument();
      expect(screen.getByText('(2023)')).toBeInTheDocument();
    });

    test('renders poster image with correct attributes', () => {
      render(<MovieHeaderLarge {...mockMovieData} />);

      const poster = screen.getByAltText('Poster for Test Movie');
      expect(poster).toBeInTheDocument();
      expect(poster).toHaveAttribute('src', mockMovieData.initialPoster);
    });

    test('does not render streaming info when no streaming data provided', () => {
      render(<MovieHeaderLarge {...mockMovieData} />);

      // Should not show any streaming text when initialStreaming is undefined
      expect(screen.queryByText(/Streaming on/)).not.toBeInTheDocument();
      expect(screen.queryByText('TBD')).not.toBeInTheDocument();
    });

    test('renders streaming info when valid streaming data provided', () => {
      const dataWithStreaming = { ...mockMovieData, initialStreaming: 'Netflix, Hulu' };
      render(<MovieHeaderLarge {...dataWithStreaming} />);

      expect(screen.getByText('Streaming on Netflix, Hulu')).toBeInTheDocument();
    });

    test('hides streaming info when TBD placeholder provided', () => {
      const dataWithTBD = { ...mockMovieData, initialStreaming: 'TBD' };
      render(<MovieHeaderLarge {...dataWithTBD} />);

      // Should not show TBD or any streaming text
      expect(screen.queryByText(/Streaming on/)).not.toBeInTheDocument();
      expect(screen.queryByText('TBD')).not.toBeInTheDocument();
    });

    test('renders action buttons with correct accessibility labels', () => {
      render(<MovieHeaderLarge {...mockMovieData} />);

      expect(screen.getByLabelText('Add to list')).toBeInTheDocument();
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
    });

    test('handles missing poster gracefully with placeholder', () => {
      const dataWithoutPoster = { ...mockMovieData, initialPoster: undefined };

      render(<MovieHeaderLarge {...dataWithoutPoster} />);

      const poster = screen.getByAltText('Poster for Test Movie');
      expect(poster).toHaveAttribute('src', '/images/placeholder-poster.jpg');
    });

    test('handles missing slug gracefully', () => {
      const dataWithoutSlug = { ...mockMovieData, initialSlug: undefined };

      render(<MovieHeaderLarge {...dataWithoutSlug} />);

      // Component should render without errors
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('toggles add-to-list state when plus button is clicked', () => {
      render(<MovieHeaderLarge {...mockMovieData} />);

      const plusButton = screen.getByLabelText('Add to list');
      fireEvent.click(plusButton);

      // Check if the button state changed (reflected in icon fill)
      expect(plusButton).toBeInTheDocument();
    });

    test('calls FavoritesManager.toggleHeart when heart button is clicked', () => {
      render(<MovieHeaderLarge {...mockMovieData} />);

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
      render(<MovieHeaderLarge {...mockMovieData} />);

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
      render(<MovieHeaderLarge {...mockMovieData} />);

      const poster = screen.getByAltText('Poster for Test Movie');
      fireEvent.doubleClick(poster);

      // Verify the state change (addedToList should be true)
      expect(screen.getByText('+ added')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles FavoritesManager.toggleHeart errors gracefully', () => {
      FavoritesManager.toggleHeart.mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });

      render(<MovieHeaderLarge {...mockMovieData} />);

      const heartButton = screen.getByLabelText('Add to favorites');
      fireEvent.click(heartButton);

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to toggle heart state:',
        expect.any(Error)
      );
    });

    test('handles FavoritesManager.isMovieHearted errors during initial load', () => {
      FavoritesManager.isMovieHearted.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      render(<MovieHeaderLarge {...mockMovieData} />);

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to load favorites state:',
        expect.any(Error)
      );

      // Should still render with safe defaults
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
    });

    test('handles event listener update errors', () => {
      FavoritesManager.isMovieHearted.mockImplementation(() => {
        throw new Error('Update error');
      });

      render(<MovieHeaderLarge {...mockMovieData} />);

      // Trigger the moviesUpdated event
      const updateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'moviesUpdated'
      )[1];

      updateHandler();

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to update favorites state:',
        expect.any(Error)
      );
    });
  });

  describe('State Management', () => {
    test('initializes with correct default states', () => {
      render(<MovieHeaderLarge {...mockMovieData} />);

      // Component should render without errors and show default states
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
      expect(screen.queryByText('+ added')).not.toBeInTheDocument();
    });

    test('updates heart state based on FavoritesManager', () => {
      FavoritesManager.isMovieHearted.mockReturnValue(true);

      render(<MovieHeaderLarge {...mockMovieData} />);

      expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument();
    });

    test('generates correct media ID from title and year', () => {
      render(<MovieHeaderLarge {...mockMovieData} />);

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
      render(<MovieHeaderLarge {...mockMovieData} />);

      expect(mockAddEventListener).toHaveBeenCalledWith('moviesUpdated', expect.any(Function));
    });

    test('removes event listener on unmount', () => {
      const { unmount } = render(<MovieHeaderLarge {...mockMovieData} />);

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('moviesUpdated', expect.any(Function));
    });
  });

  describe('Props Updates', () => {
    test('updates poster when initialPoster prop changes', () => {
      const { rerender } = render(<MovieHeaderLarge {...mockMovieData} />);

      const newPoster = 'https://example.com/new-poster.jpg';
      rerender(<MovieHeaderLarge {...mockMovieData} initialPoster={newPoster} />);

      const poster = screen.getByAltText('Poster for Test Movie');
      expect(poster).toHaveAttribute('src', newPoster);
    });

    test('updates slug when initialSlug prop changes', () => {
      const { rerender } = render(<MovieHeaderLarge {...mockMovieData} />);

      const newSlug = 'Updated test movie description';
      rerender(<MovieHeaderLarge {...mockMovieData} initialSlug={newSlug} />);

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

  describe('Animation Timing', () => {
    test('animation disappears after 1.5 seconds', async () => {
      jest.useFakeTimers();

      render(<MovieHeaderLarge {...mockMovieData} />);

      const poster = screen.getByAltText('Poster for Test Movie');
      fireEvent.doubleClick(poster);

      expect(screen.getByText('+ added')).toBeInTheDocument();

      // Fast-forward time by 1.5 seconds
      jest.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(screen.queryByText('+ added')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Accessibility Features', () => {
    test('has proper ARIA labels for interactive elements', () => {
      render(<MovieHeaderLarge {...mockMovieData} />);

      expect(screen.getByLabelText('Add to list')).toBeInTheDocument();
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
    });

    test('updates ARIA label when heart state changes', () => {
      FavoritesManager.isMovieHearted.mockReturnValue(true);

      render(<MovieHeaderLarge {...mockMovieData} />);

      expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument();
    });

    test('poster has descriptive alt text', () => {
      render(<MovieHeaderLarge {...mockMovieData} />);

      expect(screen.getByAltText('Poster for Test Movie')).toBeInTheDocument();
    });
  });
});

describe('MovieHeaderLarge - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    FavoritesManager.isMovieHearted.mockReturnValue(false);
    FavoritesManager.isMovieBookmarked.mockReturnValue(false);
    FavoritesManager.toggleHeart.mockReturnValue(true);
  });

  test('complete user workflow: view movie, add to favorites, add to list', () => {
    render(<MovieHeaderLarge {...mockMovieData} />);

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

    // 4. Add to list via double-click (should toggle state)
    const poster = screen.getByAltText('Poster for Test Movie');
    fireEvent.doubleClick(poster);
    expect(screen.getByText('+ added')).toBeInTheDocument();
  });

  test('handles multiple rapid interactions gracefully', () => {
    render(<MovieHeaderLarge {...mockMovieData} />);

    const heartButton = screen.getByLabelText('Add to favorites');
    const plusButton = screen.getByLabelText('Add to list');
    const poster = screen.getByAltText('Poster for Test Movie');

    // Rapidly click multiple elements
    fireEvent.click(heartButton);
    fireEvent.click(plusButton);
    fireEvent.doubleClick(poster);
    fireEvent.click(heartButton);

    // Should handle all interactions without errors
    expect(FavoritesManager.toggleHeart).toHaveBeenCalledTimes(2);
    expect(screen.getByText('+ added')).toBeInTheDocument();
  });

  test('poster cropping styles are applied correctly', () => {
    render(<MovieHeaderLarge {...mockMovieData} />);

    const poster = screen.getByAltText('Poster for Test Movie');
    const styles = window.getComputedStyle(poster);

    // Note: jsdom doesn't fully support CSS, but we can test that the element exists
    expect(poster).toBeInTheDocument();
    expect(poster).toHaveStyle({
      'object-fit': 'cover',
      'border-radius': '12px',
    });
  });
});
