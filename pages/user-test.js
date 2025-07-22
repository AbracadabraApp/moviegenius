/**
 * User Test Page - Demo of Anonymous User System
 * Navigate to /user-test to see all new components in action
 */

import { useState, useEffect } from 'react';
import PhoneFrame from '../components/PhoneFrame';
import { OnboardingPlatformPicker } from '../components/OnboardingPlatformPicker';
import AnonymousUserManager from '../lib/anonymous-user';

export default function UserTestPage() {
  const [userInfo, setUserInfo] = useState(null);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    // Initialize anonymous user system on page load
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      const result = await AnonymousUserManager.initialize();
      setUserInfo(result);
      addTestResult('✅ Anonymous user system initialized', result);
    } catch (error) {
      addTestResult('❌ Error initializing user system', error);
    }
  };

  const addTestResult = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { 
      message, 
      data, 
      timestamp,
      id: Date.now() 
    }]);
  };

  const testAnonymousId = () => {
    const userId = AnonymousUserManager.getAnonymousUserId();
    addTestResult('🆔 Generated/Retrieved Anonymous ID', userId);
  };

  const testPreferences = () => {
    const prefs = AnonymousUserManager.getUserPreferences();
    addTestResult('📋 Current User Preferences', {
      platformCount: prefs.platforms.length,
      heartedMovies: prefs.heartedMovies.length,
      bookmarkedMovies: prefs.bookmarkedMovies.length,
      platforms: prefs.platforms
    });
  };

  const clearAllData = () => {
    // Clear localStorage manually for testing
    const keys = ['abra_user_id', 'selectedPlatforms', 'heartedMovies', 'bookmarkedMovies'];
    keys.forEach(key => localStorage.removeItem(key));
    
    // Reset cache
    AnonymousUserManager._cache = {
      userId: null,
      preferences: null,
      lastSync: null
    };
    
    addTestResult('🗑️ All user data cleared');
    setUserInfo(null);
  };

  const handlePlatformPickerComplete = (platforms) => {
    addTestResult('✅ Platform selection completed', platforms);
    setShowPlatformPicker(false);
    
    // Refresh user info
    setTimeout(() => {
      const updatedPrefs = AnonymousUserManager.getUserPreferences();
      setUserInfo(prev => ({
        ...prev,
        preferences: updatedPrefs
      }));
    }, 100);
  };

  const simulateMovieHeart = () => {
    const testMovie = {
      id: 'test-movie-123',
      title: 'Test Movie',
      year: 2024,
      poster_path: '/test-poster.jpg'
    };

    // Simulate heart action
    const hearted = JSON.parse(localStorage.getItem('heartedMovies') || '[]');
    hearted.push(testMovie);
    localStorage.setItem('heartedMovies', JSON.stringify(hearted));
    
    addTestResult('❤️ Added test movie to hearts', testMovie);
  };

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Anonymous User System Test</h1>
          <p style={styles.subtitle}>Test all components and functionality</p>
        </header>

        {/* User Info Display */}
        {userInfo && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Current User Info</h2>
            <div style={styles.infoCard}>
              <div><strong>ID:</strong> {userInfo.userId}</div>
              <div><strong>Platforms:</strong> {userInfo.preferences.platforms.length}</div>
              <div><strong>Hearted:</strong> {userInfo.preferences.heartedMovies.length}</div>
              <div><strong>Bookmarked:</strong> {userInfo.preferences.bookmarkedMovies.length}</div>
            </div>
          </div>
        )}

        {/* Test Buttons */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Test Functions</h2>
          <div style={styles.buttonGrid}>
            <button onClick={testAnonymousId} style={styles.testButton}>
              Test Anonymous ID
            </button>
            <button onClick={testPreferences} style={styles.testButton}>
              Test Preferences
            </button>
            <button onClick={() => setShowPlatformPicker(true)} style={styles.testButton}>
              Show Platform Picker
            </button>
            <button onClick={simulateMovieHeart} style={styles.testButton}>
              Simulate Movie Heart
            </button>
            <button onClick={initializeUser} style={styles.testButton}>
              Re-initialize User
            </button>
            <button onClick={clearAllData} style={styles.dangerButton}>
              Clear All Data
            </button>
          </div>
        </div>

        {/* Test Results Log */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Test Results</h2>
          <div style={styles.logContainer}>
            {testResults.map(result => (
              <div key={result.id} style={styles.logEntry}>
                <div style={styles.logTime}>{result.timestamp}</div>
                <div style={styles.logMessage}>{result.message}</div>
                {result.data && (
                  <pre style={styles.logData}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Platform Picker Modal */}
        {showPlatformPicker && (
          <OnboardingPlatformPicker
            showAsModal={true}
            onComplete={handlePlatformPickerComplete}
            onSkip={() => setShowPlatformPicker(false)}
            title="Test Platform Picker"
            subtitle="This is the new onboarding component"
          />
        )}
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#000',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0'
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 16px 0'
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  testButton: {
    padding: '12px 16px',
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  dangerButton: {
    padding: '12px 16px',
    backgroundColor: '#FF3B30',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    gridColumn: '1 / -1'
  },
  logContainer: {
    maxHeight: '300px',
    overflowY: 'auto',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '12px'
  },
  logEntry: {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #eee'
  },
  logTime: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px'
  },
  logMessage: {
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px'
  },
  logData: {
    fontSize: '12px',
    backgroundColor: '#fff',
    padding: '8px',
    borderRadius: '4px',
    overflow: 'auto',
    margin: '0',
    border: '1px solid #ddd'
  }
};