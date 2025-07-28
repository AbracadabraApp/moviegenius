// __tests__/integration/movieAnalysisComponent.test.js
/**
 * Integration tests for MovieAnalysisWithEntities component
 * Tests the complete flow from JSON analysis to rendered output
 * ALL TESTS WILL FAIL until developer implements pure JSON functionality
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MovieAnalysisWithEntities from '../../components/MovieAnalysisWithEntities';

// Mock test data - using the actual Double Indemnity structure
const MOCK_JSON_ANALYSIS = {
  "metadata": {
    "title": "Double Indemnity",
    "year": 1944,
    "analysisType": "comprehensive",
    "wordCount": 947,
    "targetRange": "800-1000",
    "confidenceScore": 95
  },
  "keyElements": {
    "director": "Billy Wilder",
    "writers": ["Billy Wilder", "Raymond Chandler", "James M. Cain"],
    "stars": ["Fred MacMurray", "Barbara Stanwyck", "Edward G. Robinson"],
    "genre": "Film Noir",
    "releaseYear": 1944
  },
  "whyWatch": [
    "Definitive film noir that shaped the entire genre",
    "Crackling dialogue and masterful narrative structure", 
    "Barbara Stanwyck's iconic femme fatale performance",
    "Revolutionary use of shadows and noir cinematography"
  ],
  "content": [
    {
      "type": "introduction",
      "text": "**Double Indemnity** (1944) stands as the quintessential film noir, a masterpiece that helped define the genre's visual style and thematic preoccupations.\\n\\nThe story follows insurance salesman Walter Neff and his dangerous entanglement with the seductive Phyllis Dietrichson."
    },
    {
      "type": "technicalAnalysis", 
      "text": "John F. Seitz's cinematography establishes the noir visual vocabulary that would become iconic. The use of venetian blind shadows creating prison bar patterns across characters' faces demonstrates the power of visual storytelling."
    },
    {
      "type": "culturalContext",
      "text": "Released during World War II, **Double Indemnity** (1944) reflected growing American anxieties about moral corruption and the breakdown of traditional values."
    },
    {
      "type": "thematicExploration",
      "text": "At its core, **Double Indemnity** (1944) explores the corrupting influence of desire and greed. Walter's transformation from ordinary salesman to calculating murderer demonstrates moral boundaries."
    },
    {
      "type": "legacyAndImpact", 
      "text": "**Double Indemnity** (1944) established numerous noir conventions that influenced films like **The Postman Always Rings Twice** (1946) and modern neo-noir classics."
    },
    {
      "type": "contemporaryRelevance",
      "text": "Modern films like **Gone Girl** (2014) draw from **Double Indemnity**'s sophisticated approach to moral ambiguity and criminal psychology."
    },
    {
      "type": "conclusion",
      "text": "**Double Indemnity** (1944) remains a masterpiece whose influence extends far beyond its genre origins with groundbreaking narrative techniques."
    }
  ],
  "featuredMovies": [
    {
      "title": "The Maltese Falcon",
      "year": 1941,
      "description": "Earlier noir masterpiece establishing the genre's visual and thematic elements"
    },
    {
      "title": "Body Heat",
      "year": 1981, 
      "description": "Modern remake that explicitly references and updates Double Indemnity's plot"
    },
    {
      "title": "L.A. Confidential",
      "year": 1997,
      "description": "Neo-noir that captures similar themes of corruption in Los Angeles"
    },
    {
      "title": "Gone Girl",
      "year": 2014,
      "description": "Contemporary thriller drawing from Double Indemnity's manipulation themes"
    }
  ],
  "exploreTopics": [
    {
      "topic": "Film Noir Visual Techniques",
      "category": "Cinematography", 
      "difficulty": "Intermediate"
    },
    {
      "topic": "The Impact of Raymond Chandler on Hollywood",
      "category": "Screenwriting",
      "difficulty": "Advanced"
    },
    {
      "topic": "Female Representation in Film Noir",
      "category": "Gender Studies",
      "difficulty": "Advanced"
    },
    {
      "topic": "Insurance in Film Noir",
      "category": "Thematic Analysis",
      "difficulty": "Intermediate"
    },
    {
      "topic": "Billy Wilder's Directing Style",
      "category": "Directorial Analysis", 
      "difficulty": "Intermediate"
    }
  ],
  "moreIdeas": [
    {
      "title": "Sunset Boulevard",
      "year": 1950,
      "connection": "Another Billy Wilder noir exploring dark side of Los Angeles"
    },
    {
      "title": "The Postman Always Rings Twice", 
      "year": 1946,
      "connection": "Similar plot involving murder and adultery"
    }
  ]
};

const MOCK_MOVIE_DATA = {
  id: 996,
  title: "Double Indemnity", 
  year: 1944,
  tmdb_id: 996
};

describe('MovieAnalysisWithEntities Pure JSON Implementation', () => {
  describe('Basic Rendering', () => {
    test('renders JSON analysis without errors', async () => {
      // ❌ WILL FAIL - component doesn't handle pure JSON yet
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('analysis-content')).toBeInTheDocument();
      });
    });

    test('displays loading state initially', () => {
      // ❌ WILL FAIL - loading states not implemented for pure JSON
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      expect(screen.getByTestId('analysis-loading')).toBeInTheDocument();
    });

    test('shows error state for malformed JSON with no fallback', () => {
      // ❌ WILL FAIL - pure JSON error handling not implemented
      const malformedAnalysis = {
        claude_response: {
          raw_content: 'invalid json data'
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={malformedAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      expect(screen.getByTestId('analysis-error')).toBeInTheDocument();
      expect(screen.getByText(/Analysis format error/)).toBeInTheDocument();
      
      // Critical: NO fallback text parsing should be attempted
      expect(screen.queryByText(/PARAGRAPH:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/MOVIES:/)).not.toBeInTheDocument();
    });

    test('processes analysis content immediately without async delays', async () => {
      // ❌ WILL FAIL - synchronous JSON processing not implemented
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      const startTime = performance.now();
      
      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('analysis-content')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // JSON processing should be fast (no async text parsing)
      expect(processingTime).toBeLessThan(100); // Under 100ms
    });
  });

  describe('Content Structure Rendering', () => {
    test('renders all 7 content sections in correct order', async () => {
      // ❌ WILL FAIL - JSON content sections not implemented
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('section-introduction')).toBeInTheDocument();
        expect(screen.getByTestId('section-technicalAnalysis')).toBeInTheDocument();
        expect(screen.getByTestId('section-culturalContext')).toBeInTheDocument();
        expect(screen.getByTestId('section-thematicExploration')).toBeInTheDocument();
        expect(screen.getByTestId('section-legacyAndImpact')).toBeInTheDocument(); 
        expect(screen.getByTestId('section-contemporaryRelevance')).toBeInTheDocument();
        expect(screen.getByTestId('section-conclusion')).toBeInTheDocument();
      });
    });

    test('renders featured movies with MediaCard components', async () => {
      // ❌ WILL FAIL - featured movies rendering not implemented
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        const movieCards = screen.getAllByTestId('featured-movie-card');
        expect(movieCards).toHaveLength(4);
        
        // Verify specific movies are rendered
        expect(screen.getByText('The Maltese Falcon')).toBeInTheDocument();
        expect(screen.getByText('Body Heat')).toBeInTheDocument();
        expect(screen.getByText('L.A. Confidential')).toBeInTheDocument();
        expect(screen.getByText('Gone Girl')).toBeInTheDocument();
      });
    });

    test('renders explore topics with ExplorePromptCard components', async () => {
      // ❌ WILL FAIL - explore topics rendering not implemented
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        const topicCards = screen.getAllByTestId('explore-topic-card');
        expect(topicCards).toHaveLength(5);
        
        // Verify specific topics are rendered
        expect(screen.getByText('Film Noir Visual Techniques')).toBeInTheDocument();
        expect(screen.getByText('The Impact of Raymond Chandler on Hollywood')).toBeInTheDocument();
        expect(screen.getByText('Female Representation in Film Noir')).toBeInTheDocument();
        expect(screen.getByText('Insurance in Film Noir')).toBeInTheDocument();
        expect(screen.getByText("Billy Wilder's Directing Style")).toBeInTheDocument();
      });
    });

    test('displays proper alternating layout pattern', async () => {
      // ❌ WILL FAIL - alternating layout not implemented
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        const sections = screen.getAllByTestId(/^section-/);
        const sectionTypes = sections.map(section => 
          section.dataset.testid.replace('section-', '')
        );
        
        // Expected pattern: text -> text -> movies -> text -> text -> movies -> text -> text -> text -> topics
        expect(sectionTypes).toEqual([
          'text-introduction',
          'text-technicalAnalysis', 
          'featured-movies-1',
          'text-culturalContext',
          'text-thematicExploration',
          'featured-movies-2',
          'text-legacyAndImpact',
          'text-contemporaryRelevance',
          'text-conclusion',
          'explore-topics'
        ]);
      });
    });
  });

  describe('Data Processing and Enhancement', () => {
    test('processes movie data with proper slugs and defaults', async () => {
      // ❌ WILL FAIL - movie data processing not implemented
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        const movieCards = screen.getAllByTestId('featured-movie-card');
        
        // Each movie card should have proper data structure
        movieCards.forEach(card => {
          expect(card).toHaveAttribute('data-movie-year');
          expect(card).toHaveAttribute('data-movie-slug');
          expect(card).toHaveAttribute('data-movie-description');
        });
      });
    });

    test('sets proper entity statistics', async () => {
      // ❌ WILL FAIL - entity statistics not calculated
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        const entityStats = screen.getByTestId('entity-statistics');
        
        expect(entityStats).toHaveAttribute('data-total-entities', '6'); // 4 featured + 2 more ideas
        expect(entityStats).toHaveAttribute('data-total-movies', '6');
        expect(entityStats).toHaveAttribute('data-total-sections', '7');
        expect(entityStats).toHaveAttribute('data-total-word-count');
      });
    });

    test('excludes self-referential movie (Double Indemnity)', async () => {
      // ❌ WILL FAIL - self-reference filtering not implemented
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify({
            ...MOCK_JSON_ANALYSIS,
            featuredMovies: [
              ...MOCK_JSON_ANALYSIS.featuredMovies,
              {
                title: "Double Indemnity",
                year: 1944,
                description: "Self-reference should be filtered out"
              }
            ]
          })
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        const movieCards = screen.getAllByTestId('featured-movie-card');
        
        // Should still be 4 cards (self-reference filtered out)
        expect(movieCards).toHaveLength(4);
        
        // Should not contain the self-referential movie
        const movieTitles = movieCards.map(card => card.textContent);
        expect(movieTitles.filter(title => title.includes('Double Indemnity'))).toHaveLength(0);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles missing content sections gracefully', async () => {
      // ❌ WILL FAIL - missing content handling not implemented
      const incompleteAnalysis = {
        claude_response: {
          raw_content: JSON.stringify({
            ...MOCK_JSON_ANALYSIS,
            content: MOCK_JSON_ANALYSIS.content.slice(0, 3) // Only 3 sections
          })
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={incompleteAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        // Should render available sections
        expect(screen.getByTestId('section-introduction')).toBeInTheDocument();
        expect(screen.getByTestId('section-technicalAnalysis')).toBeInTheDocument();
        expect(screen.getByTestId('section-culturalContext')).toBeInTheDocument();
        
        // Should show warning for missing sections
        expect(screen.getByTestId('incomplete-content-warning')).toBeInTheDocument();
      });
    });

    test('handles empty featured movies array', async () => {
      // ❌ WILL FAIL - empty movies handling not implemented
      const noMoviesAnalysis = {
        claude_response: {
          raw_content: JSON.stringify({
            ...MOCK_JSON_ANALYSIS,
            featuredMovies: []
          })
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={noMoviesAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        expect(screen.queryAllByTestId('featured-movie-card')).toHaveLength(0);
        expect(screen.getByTestId('no-featured-movies-message')).toBeInTheDocument();
      });
    });

    test('handles corrupted JSON structure without crashing', () => {
      // ❌ WILL FAIL - corrupted JSON handling not implemented
      const corruptedAnalysis = {
        claude_response: {
          raw_content: JSON.stringify({
            metadata: null,
            content: 'not an array',
            featuredMovies: 123
          })
        }
      };

      expect(() =>
        render(
          <MovieAnalysisWithEntities 
            analysis={corruptedAnalysis}
            movie={MOCK_MOVIE_DATA}
          />
        )
      ).not.toThrow();

      expect(screen.getByTestId('analysis-error')).toBeInTheDocument();
    });

    test('performance benchmark for JSON processing', async () => {
      // ❌ WILL FAIL - performance benchmarking not implemented
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      const startTime = performance.now();
      
      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('analysis-content')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should process JSON quickly (critical for 17k pages)
      expect(totalTime).toBeLessThan(50); // Under 50ms
      
      // Verify processing time is recorded
      const perfData = screen.getByTestId('processing-metadata');
      expect(perfData).toHaveAttribute('data-processing-time');
    });
  });

  describe('Legacy Code Removal Verification', () => {
    test('does not use parseModernAnalysisContent function', async () => {
      // ❌ WILL FAIL - legacy code removal not complete
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      // Mock console.log to capture any legacy function calls
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('analysis-content')).toBeInTheDocument();
      });

      // Should not call legacy parsing functions
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('parseModernAnalysisContent')
      );
      
      consoleSpy.mockRestore();
    });

    test('does not perform format detection (expects JSON only)', async () => {
      // ❌ WILL FAIL - format detection removal not complete
      const mockAnalysis = {
        claude_response: {
          raw_content: JSON.stringify(MOCK_JSON_ANALYSIS)
        }
      };

      render(
        <MovieAnalysisWithEntities 
          analysis={mockAnalysis}
          movie={MOCK_MOVIE_DATA}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('analysis-content')).toBeInTheDocument();
      });

      // Should not have hybrid processing logic
      expect(screen.queryByTestId('format-detection')).not.toBeInTheDocument();
      expect(screen.queryByTestId('legacy-fallback')).not.toBeInTheDocument();
    });
  });
});