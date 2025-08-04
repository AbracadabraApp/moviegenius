import { useState } from 'react';
import StreamingAnalysisDisplay from '../components/StreamingAnalysisDisplay';

/**
 * Test page for StreamingAnalysisDisplay component
 * Showcases the enhanced typewriter experience
 */
export default function TestStreamingAnalysis() {
  const [currentTest, setCurrentTest] = useState(null);
  const [completedTests, setCompletedTests] = useState(new Set());

  const testMovies = [
    { id: '2001', title: '2001: A Space Odyssey', year: '1968' },
    { id: '78', title: 'Blade Runner', year: '1982' },
    { id: '550', title: 'Fight Club', year: '1999' },
    { id: '13', title: 'Forrest Gump', year: '1994' },
  ];

  const speedOptions = ['slow', 'normal', 'fast'];
  const [selectedSpeed, setSelectedSpeed] = useState('normal');
  const [showCursor, setShowCursor] = useState(true);
  const [enhancedTypography, setEnhancedTypography] = useState(true);

  const handleTestComplete = (movieId) => {
    console.log(`✅ Analysis complete for movie ${movieId}`);
    setCompletedTests(prev => new Set([...prev, movieId]));
  };

  const handleTestError = (error) => {
    console.error('❌ Analysis error:', error);
  };

  const resetTest = () => {
    setCurrentTest(null);
    setCompletedTests(new Set());
  };

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '800',
          color: '#1F2937',
          marginBottom: '16px',
        }}>
          Streaming Analysis Display Test
        </h1>
        <p style={{
          fontSize: '1.125rem',
          color: '#6B7280',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.6',
        }}>
          Testing the enhanced typewriter experience that transforms waiting into entertainment.
          Watch AI "think" in real-time with smart typography and natural timing.
        </p>
      </div>

      {/* Controls */}
      <div style={{
        background: '#F9FAFB',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '32px',
        border: '1px solid #E5E7EB',
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '16px',
        }}>
          Configuration
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'center',
        }}>
          {/* Speed Control */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '4px',
            }}>
              Typing Speed
            </label>
            <select
              value={selectedSpeed}
              onChange={(e) => setSelectedSpeed(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.875rem',
                width: '100%',
              }}
            >
              {speedOptions.map(speed => (
                <option key={speed} value={speed}>
                  {speed.charAt(0).toUpperCase() + speed.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Cursor Toggle */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={showCursor}
                onChange={(e) => setShowCursor(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show Cursor
            </label>
          </div>

          {/* Typography Toggle */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={enhancedTypography}
                onChange={(e) => setEnhancedTypography(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Enhanced Typography
            </label>
          </div>

          {/* Reset Button */}
          <div>
            <button
              onClick={resetTest}
              style={{
                padding: '8px 16px',
                background: '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.background = '#4B5563'}
              onMouseLeave={(e) => e.target.style.background = '#6B7280'}
            >
              Reset Tests
            </button>
          </div>
        </div>
      </div>

      {/* Movie Selection */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '16px',
        }}>
          Choose a Movie to Analyze
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '12px',
        }}>
          {testMovies.map((movie) => (
            <button
              key={movie.id}
              onClick={() => setCurrentTest(movie)}
              disabled={currentTest?.id === movie.id}
              style={{
                padding: '16px',
                background: currentTest?.id === movie.id ? '#3B82F6' : 
                           completedTests.has(movie.id) ? '#10B981' : 'white',
                color: currentTest?.id === movie.id || completedTests.has(movie.id) ? 'white' : '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                cursor: currentTest?.id === movie.id ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                fontSize: '0.875rem',
              }}
              onMouseEnter={(e) => {
                if (currentTest?.id !== movie.id) {
                  e.target.style.borderColor = '#3B82F6';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentTest?.id !== movie.id) {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {movie.title}
              </div>
              <div style={{ opacity: 0.8 }}>
                {movie.year} • ID: {movie.id}
              </div>
              {completedTests.has(movie.id) && (
                <div style={{ marginTop: '8px', fontSize: '0.75rem' }}>
                  ✅ Analysis Complete
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Display */}
      {currentTest && (
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          position: 'relative',
        }}>
          <div style={{
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '1px solid #E5E7EB',
          }}>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#1F2937',
              marginBottom: '8px',
            }}>
              {currentTest.title}
            </h2>
            <p style={{
              color: '#6B7280',
              fontSize: '1rem',
            }}>
              {currentTest.year} • Streaming Analysis Demo
            </p>
          </div>

          <StreamingAnalysisDisplay
            movieId={currentTest.id}
            movieTitle={currentTest.title}
            movieYear={currentTest.year}
            onComplete={() => handleTestComplete(currentTest.id)}
            onError={handleTestError}
            settings={{
              speed: selectedSpeed,
              showCursor,
              enhancedTypography,
              skipable: true,
              autoStart: true,
            }}
          />
        </div>
      )}

      {/* Instructions */}
      {!currentTest && (
        <div style={{
          background: '#EFF6FF',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #DBEAFE',
          textAlign: 'center',
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1E40AF',
            marginBottom: '12px',
          }}>
            Ready to Test
          </h3>
          <p style={{ color: '#1E40AF', margin: 0 }}>
            Select a movie above to see the streaming analysis in action. 
            The enhanced typewriter effect includes smart timing, movie title highlighting, 
            and natural reading flow.
          </p>
        </div>
      )}
    </div>
  );
}