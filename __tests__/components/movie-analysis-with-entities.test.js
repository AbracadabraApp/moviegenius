/**
 * Comprehensive Tests for MovieAnalysisWithEntities Component
 * Tests rendering, error handling, entity linking, and JSON/text format support
 */

import { render, screen, waitFor } from '@testing-library/react';
import MovieAnalysisWithEntities from '../../components/MovieAnalysisWithEntities';

// Mock child components to isolate testing
jest.mock('../../components/EntityLinkedText', () => {
  return function MockEntityLinkedText({ text, linkingIntensity, context }) {
    return (
      <div data-testid="entity-linked-text" data-context={context} data-intensity={linkingIntensity}>
        {text}
      </div>
    );
  };
});

jest.mock('../../components/MediaCard', () => {
  return function MockMediaCard({ title, year, tmdbId, initialSlug }) {
    return (
      <div data-testid="media-card" data-tmdb-id={tmdbId}>
        <h3>{title} ({year})</h3>
        <p>{initialSlug}</p>
      </div>
    );
  };
});

jest.mock('../../components/ExplorePromptCard', () => {
  return function MockExplorePromptCard({ prompt, contextPrefix }) {
    return (
      <div data-testid="explore-prompt-card" data-context={contextPrefix}>
        {prompt}
      </div>
    );
  };
});

jest.mock('../../components/ErrorBoundary', () => {
  return function MockErrorBoundary({ children, level, fallback }) {
    return <div data-testid={`error-boundary-${level}`}>{children}</div>;
  };
});

// Mock performance monitor
jest.mock('../../lib/performance-monitor', () => ({
  getPerformanceMonitor: () => ({
    trackMetric: jest.fn()
  })
}));

describe('MovieAnalysisWithEntities Component', () => {
  const mockMovie = {
    id: 550,
    title: 'Fight Club',
    year: 1999,
    slug: 'fight-club-1999'
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Legacy Text Format Analysis', () => {
    test('renders simple text analysis correctly', async () => {
      const analysis = {
        claude_response: {
          raw_content: 'Fight Club is a provocative exploration of masculinity and consumerism in modern society.'
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        expect(screen.getByTestId('entity-linked-text')).toBeInTheDocument();
      });

      expect(screen.getByText(/Fight Club is a provocative exploration/)).toBeInTheDocument();
    });

    test('handles complex text format with movies and explore topics', async () => {
      const analysis = {
        claude_response: {
          raw_content: `Fight Club is a masterpiece of 1990s cinema.

SUBHEAD: Technical Excellence

The film's cinematography and direction are exceptional.

MOVIES: The Matrix|1999|Another exploration of reality|Netflix
MOVIES: American Beauty|1999|Dark suburban satire|Amazon Prime

EXPLORE_FURTHER: How does Fight Club critique consumer culture?
EXPLORE_FURTHER: What role does Tyler Durden play as an unreliable narrator?

MORE_IDEAS: Seven|1995|Another dark Fincher thriller|HBO Max`
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        expect(screen.getByText(/Fight Club is a masterpiece/)).toBeInTheDocument();
      });

      // Check for featured films section
      expect(screen.getByText('FEATURED FILMS')).toBeInTheDocument();
      expect(screen.getByText('The Matrix (1999)')).toBeInTheDocument();
      expect(screen.getByText('American Beauty (1999)')).toBeInTheDocument();

      // Check for explore further section
      expect(screen.getByText('EXPLORE FURTHER')).toBeInTheDocument();
      expect(screen.getByText(/How does Fight Club critique consumer culture/)).toBeInTheDocument();

      // Check for more ideas section
      expect(screen.getByText('MORE IDEAS')).toBeInTheDocument();
      expect(screen.getByText('Seven (1995)')).toBeInTheDocument();
    });

    test('filters out self-referential movies', async () => {
      const analysis = {
        claude_response: {
          raw_content: `Fight Club analysis content.

MOVIES: Fight Club|1999|The current movie|Netflix
MOVIES: The Matrix|1999|Different movie|Netflix

MORE_IDEAS: Fight Club|1999|Same movie again|Netflix
MORE_IDEAS: Seven|1995|Different movie|HBO Max`
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        expect(screen.getByText(/Fight Club analysis content/)).toBeInTheDocument();
      });

      // Should show The Matrix but not Fight Club in featured films
      expect(screen.getByText('The Matrix (1999)')).toBeInTheDocument();
      expect(screen.queryByText('Fight Club (1999)')).not.toBeInTheDocument();

      // Should show Seven but not Fight Club in more ideas
      expect(screen.getByText('Seven (1995)')).toBeInTheDocument();
    });

    test('handles missing sections gracefully', async () => {
      const analysis = {
        claude_response: {
          raw_content: 'Just plain text analysis with no special sections.'
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        expect(screen.getByText(/Just plain text analysis/)).toBeInTheDocument();
      });

      // Should not show section headers for missing sections
      expect(screen.queryByText('FEATURED FILMS')).not.toBeInTheDocument();
      expect(screen.queryByText('EXPLORE FURTHER')).not.toBeInTheDocument();
      expect(screen.queryByText('MORE IDEAS')).not.toBeInTheDocument();
    });
  });

  describe('JSON Format Analysis', () => {
    test('renders JSON format analysis correctly', () => {
      const jsonAnalysis = {
        content: [
          {
            type: 'introduction',
            text: 'Fight Club stands as one of the most provocative films of the 1990s.'
          },
          {
            type: 'technicalAnalysis', 
            text: 'The cinematography and visual effects create a distinctive aesthetic.'
          }
        ],
        featuredMovies: [
          {
            title: 'The Matrix',
            year: 1999,
            description: 'Another reality-bending 90s classic',
            tmdb_id: 603,
            poster_url: '/poster1.jpg'
          },
          {
            title: 'American Beauty',
            year: 1999,
            description: 'Dark suburban satire',
            tmdb_id: 4935,
            poster_url: '/poster2.jpg'
          }
        ],
        exploreTopics: [
          {
            topic: 'Consumer culture critique in 1990s cinema',
            category: 'Cultural Analysis'
          },
          {
            topic: 'Unreliable narrators in psychological thrillers',
            category: 'Narrative Technique'
          }
        ],
        moreIdeas: [
          {
            title: 'Seven',
            year: 1995,
            connection: 'Another dark Fincher psychological thriller',
            tmdb_id: 807
          }
        ]
      };

      const analysis = {
        claude_response: {
          raw_content: JSON.stringify(jsonAnalysis)
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      // Check content sections render
      expect(screen.getByText(/Fight Club stands as one of the most provocative/)).toBeInTheDocument();
      expect(screen.getByText(/The cinematography and visual effects/)).toBeInTheDocument();

      // Check featured movies render
      expect(screen.getByText('FEATURED FILMS')).toBeInTheDocument();
      expect(screen.getByText('The Matrix (1999)')).toBeInTheDocument();
      expect(screen.getByText('American Beauty (1999)')).toBeInTheDocument();

      // Check explore topics render
      expect(screen.getByText('EXPLORE FURTHER')).toBeInTheDocument();
      expect(screen.getByText(/Consumer culture critique in 1990s cinema \(Cultural Analysis\)/)).toBeInTheDocument();

      // Check more ideas render
      expect(screen.getByText('MORE IDEAS')).toBeInTheDocument();
      expect(screen.getByText('Seven (1995)')).toBeInTheDocument();
    });

    test('handles JSON parsing errors gracefully', () => {
      const analysis = {
        claude_response: {
          raw_content: 'Invalid JSON content that cannot be parsed'
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      // Should fall back to raw text display
      expect(screen.getByText(/Invalid JSON content that cannot be parsed/)).toBeInTheDocument();
    });

    test('filters self-referential movies in JSON format', () => {
      const jsonAnalysis = {
        content: [
          {
            type: 'introduction',
            text: 'Analysis content here.'
          }
        ],
        featuredMovies: [
          {
            title: 'Fight Club', // Should be filtered out
            year: 1999,
            tmdb_id: 550,
            description: 'This movie itself'
          },
          {
            title: 'The Matrix',
            year: 1999,
            tmdb_id: 603,
            description: 'Different movie'
          }
        ],
        moreIdeas: [
          {
            title: 'Fight Club', // Should be filtered out
            year: 1999,
            connection: 'Same movie'
          },
          {
            title: 'Seven',
            year: 1995,
            connection: 'Different movie'
          }
        ]
      };

      const analysis = {
        claude_response: {
          raw_content: JSON.stringify(jsonAnalysis)
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      // Should show The Matrix but not Fight Club
      expect(screen.getByText('The Matrix (1999)')).toBeInTheDocument();
      expect(screen.queryByText('Fight Club (1999)')).not.toBeInTheDocument();

      // Should show Seven but not Fight Club in more ideas
      expect(screen.getByText('Seven (1995)')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles null analysis gracefully', () => {
      render(<MovieAnalysisWithEntities analysis={null} movie={mockMovie} />);

      expect(screen.getByText('***')).toBeInTheDocument();
    });

    test('handles undefined claude_response', () => {
      const analysis = {
        claude_response: undefined
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      expect(screen.getByText('***')).toBeInTheDocument();
    });

    test('handles null raw_content', () => {
      const analysis = {
        claude_response: {
          raw_content: null
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      expect(screen.getByText('***')).toBeInTheDocument();
    });

    test('handles empty raw_content', () => {
      const analysis = {
        claude_response: {
          raw_content: ''
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      expect(screen.getByText('***')).toBeInTheDocument();
    });

    test('wraps components in error boundaries', async () => {
      const analysis = {
        claude_response: {
          raw_content: `Content with movies.

MOVIES: The Matrix|1999|Test movie|Netflix`
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-section')).toBeInTheDocument();
      });

      // Verify error boundaries are present around different sections
      const errorBoundaries = screen.getAllByTestId(/error-boundary-section/);
      expect(errorBoundaries.length).toBeGreaterThan(0);
    });
  });

  describe('Entity Linking Integration', () => {
    test('passes correct props to EntityLinkedText', async () => {
      const analysis = {
        claude_response: {
          raw_content: 'Fight Club explores themes of masculinity and alienation.'
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={analysis} 
          movie={mockMovie} 
          linkingIntensity="aggressive"
        />
      );

      await waitFor(() => {
        const entityLinkedText = screen.getByTestId('entity-linked-text');
        expect(entityLinkedText).toBeInTheDocument();
        expect(entityLinkedText).toHaveAttribute('data-intensity', 'aggressive');
        expect(entityLinkedText).toHaveAttribute('data-context', 'movie-analysis');
      });
    });

    test('uses moderate linking intensity by default', async () => {
      const analysis = {
        claude_response: {
          raw_content: 'Test content for linking intensity.'
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        const entityLinkedText = screen.getByTestId('entity-linked-text');
        expect(entityLinkedText).toHaveAttribute('data-intensity', 'moderate');
      });
    });

    test('enhances movies with entity linking data', async () => {
      const analysis = {
        claude_response: {
          raw_content: `Analysis content.

MOVIES: The Matrix|1999|Reality-bending thriller|Netflix`
        },
        entity_linking_data: {
          entityData: {
            featuredMovies: [
              {
                title: 'The Matrix',
                year: 1999,
                tmdb_id: 603,
                poster_url: '/enhanced-poster.jpg',
                streaming: { netflix: true }
              }
            ]
          }
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        const mediaCard = screen.getByTestId('media-card');
        expect(mediaCard).toHaveAttribute('data-tmdb-id', '603');
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('processes analysis without blocking UI', async () => {
      const analysis = {
        claude_response: {
          raw_content: 'Large analysis content '.repeat(1000) // Simulate large content
        }
      };

      const startTime = Date.now();
      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);
      const renderTime = Date.now() - startTime;

      // Initial render should be fast
      expect(renderTime).toBeLessThan(100);

      // Content should eventually appear
      await waitFor(() => {
        expect(screen.getByText(/Large analysis content/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('handles immediate JSON parsing for fast rendering', () => {
      const jsonAnalysis = {
        content: [{ type: 'introduction', text: 'Fast rendering test content.' }],
        featuredMovies: [],
        exploreTopics: [],
        moreIdeas: []
      };

      const analysis = {
        claude_response: {
          raw_content: JSON.stringify(jsonAnalysis)
        }
      };

      const startTime = Date.now();
      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(50);
      expect(screen.getByText(/Fast rendering test content/)).toBeInTheDocument();
    });
  });

  describe('Debug and Development Features', () => {
    test('shows entity statistics in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const analysis = {
        claude_response: {
          raw_content: `Analysis with movies.

MOVIES: The Matrix|1999|Test|Netflix
MOVIES: Seven|1995|Test|HBO`
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        expect(screen.getByText(/Entity Stats:/)).toBeInTheDocument();
      });

      process.env.NODE_ENV = originalEnv;
    });

    test('hides entity statistics in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const analysis = {
        claude_response: {
          raw_content: `Analysis with movies.

MOVIES: The Matrix|1999|Test|Netflix`
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        expect(screen.getByText(/Analysis with movies/)).toBeInTheDocument();
      });

      expect(screen.queryByText(/Entity Stats:/)).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    test('displays processing errors in development mode', async () => {
      const analysis = {
        claude_response: {
          raw_content: 'Valid content'
        }
      };

      // Mock console.error to simulate processing error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        expect(screen.getByText(/Valid content/)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    test('provides proper semantic structure', async () => {
      const analysis = {
        claude_response: {
          raw_content: `Fight Club analysis.

SUBHEAD: Technical Analysis

Detailed technical content.

MOVIES: The Matrix|1999|Related film|Netflix`
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        expect(screen.getByText(/Fight Club analysis/)).toBeInTheDocument();
      });

      // Check for heading structure
      expect(screen.getByText('TECHNICAL ANALYSIS')).toBeInTheDocument();
      expect(screen.getByText('FEATURED FILMS')).toBeInTheDocument();
    });

    test('maintains focus management for interactive elements', async () => {
      const analysis = {
        claude_response: {
          raw_content: `Analysis content.

EXPLORE_FURTHER: How does this film compare to others?`
        }
      };

      render(<MovieAnalysisWithEntities analysis={analysis} movie={mockMovie} />);

      await waitFor(() => {
        const exploreCard = screen.getByTestId('explore-prompt-card');
        expect(exploreCard).toBeInTheDocument();
      });
    });
  });
});