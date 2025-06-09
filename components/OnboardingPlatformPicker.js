/**
 * OnboardingPlatformPicker - Platform selection for new users
 * Integrates with anonymous user system for immediate value without authentication
 */

import { useState, useEffect } from 'react';
import AnonymousUserManager from '../lib/anonymous-user.js';

export default function OnboardingPlatformPicker({ 
  onComplete,
  onSkip,
  showAsModal = false,
  title = "See where movies stream",
  subtitle = "Select your platforms to see availability"
}) {
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set());
  const [showMore, setShowMore] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Load existing platforms on mount
  useEffect(() => {
    try {
      const preferences = AnonymousUserManager.getUserPreferences();
      if (preferences.platforms.length > 0) {
        setSelectedPlatforms(new Set(preferences.platforms));
      }
    } catch (error) {
      console.error('Error loading existing platforms:', error);
    }
  }, []);

  const primaryPlatforms = [
    'Netflix', 
    'Amazon Prime Video',
    'Disney+',
    'Apple TV+',
    'HBO Max',
    'Hulu',
    'Paramount+',
    'Peacock'
  ];
  
  const additionalPlatforms = [
    'ESPN+',
    'Discovery+',
    'AMC+',
    'Sling TV',
    'Pluto TV',
    'Tubi',
    'Vudu',
    'Kanopy',
    'Shudder',
    'BritBox',
    'Mubi',
    'CuriosityStream',
    'Crunchyroll',
    'Funimation'
  ];
  
  const handlePlatformToggle = (platform) => {
    const newSelected = new Set(selectedPlatforms);
    if (newSelected.has(platform)) {
      newSelected.delete(platform);
    } else {
      newSelected.add(platform);
    }
    setSelectedPlatforms(newSelected);
  };
  
  const handleSave = async () => {
    try {
      // Save to localStorage immediately (existing system compatibility)
      localStorage.setItem('selectedPlatforms', JSON.stringify(Array.from(selectedPlatforms)));
      
      // Save to anonymous user preferences
      const currentPrefs = AnonymousUserManager.getUserPreferences();
      const updatedPrefs = {
        ...currentPrefs,
        platforms: Array.from(selectedPlatforms)
      };
      
      // Update localStorage through existing system
      AnonymousUserManager.saveUserPreferences = (prefs) => {
        if (prefs.platforms) {
          localStorage.setItem('selectedPlatforms', JSON.stringify(prefs.platforms));
        }
      };
      
      console.log('Platforms saved:', Array.from(selectedPlatforms));
      
      // Close modal/picker
      setIsVisible(false);
      
      // Notify parent component
      if (onComplete) {
        onComplete(Array.from(selectedPlatforms));
      }
      
      // Trigger UI updates across app
      window.dispatchEvent(new CustomEvent('platformsUpdated', {
        detail: { platforms: Array.from(selectedPlatforms) }
      }));
      
    } catch (error) {
      console.error('Error saving platforms:', error);
    }
  };
  
  const handleSkip = () => {
    setIsVisible(false);
    if (onSkip) {
      onSkip();
    }
  };

  if (!isVisible) {
    return null;
  }
  
  const modalStyles = showAsModal ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  } : {};
  
  const contentStyles = showAsModal ? {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto'
  } : {};
  
  return (
    <div style={modalStyles}>
      <div style={{...styles.container, ...contentStyles}}>
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <p style={styles.subtitle}>{subtitle}</p>
        </div>
        
        <div style={styles.platformGrid}>
          {primaryPlatforms.map((platform) => (
            <PlatformButton
              key={platform}
              platform={platform}
              isSelected={selectedPlatforms.has(platform)}
              onToggle={() => handlePlatformToggle(platform)}
            />
          ))}
          
          {showMore && additionalPlatforms.map((platform) => (
            <PlatformButton
              key={platform}
              platform={platform}
              isSelected={selectedPlatforms.has(platform)}
              onToggle={() => handlePlatformToggle(platform)}
            />
          ))}
        </div>
        
        <button 
          onClick={() => setShowMore(!showMore)}
          style={styles.showMoreButton}
        >
          {showMore ? 'Show less' : `Show ${additionalPlatforms.length} more platforms`}
        </button>
        
        {selectedPlatforms.size > 0 && (
          <div style={styles.selectedCount}>
            {selectedPlatforms.size} platform{selectedPlatforms.size === 1 ? '' : 's'} selected
          </div>
        )}
        
        <div style={styles.buttonRow}>
          <button 
            onClick={handleSkip}
            style={styles.skipButton}
          >
            Skip for now
          </button>
          <button 
            onClick={handleSave}
            style={{
              ...styles.saveButton,
              ...(selectedPlatforms.size === 0 ? styles.saveButtonDisabled : {})
            }}
            disabled={selectedPlatforms.size === 0}
          >
            {selectedPlatforms.size > 0 ? 'Show my streaming options' : 'Select at least one platform'}
          </button>
        </div>
        
        <p style={styles.disclaimer}>
          No account needed • Saved to your device
        </p>
      </div>
    </div>
  );
}

// Individual platform button component
function PlatformButton({ platform, isSelected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        ...styles.platformButton,
        ...(isSelected ? styles.platformButtonSelected : {})
      }}
    >
      <div style={{
        ...styles.platformCheckbox,
        ...(isSelected ? styles.platformCheckboxSelected : {})
      }}>
        {isSelected && '✓'}
      </div>
      <span style={styles.platformName}>{platform}</span>
    </button>
  );
}

const styles = {
  container: {
    maxWidth: '400px',
    margin: '0 auto',
    padding: '0'
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px'
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
  platformGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '8px',
    marginBottom: '16px'
  },
  platformButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '16px',
    fontFamily: 'inherit'
  },
  platformButtonSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3'
  },
  platformCheckbox: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: '2px solid #ddd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: 0
  },
  platformCheckboxSelected: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
    color: 'white'
  },
  platformName: {
    flex: 1,
    textAlign: 'left',
    fontWeight: '500'
  },
  showMoreButton: {
    width: '100%',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#007AFF',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '16px'
  },
  selectedCount: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#666',
    marginBottom: '24px'
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  skipButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: '2px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#666'
  },
  saveButton: {
    flex: 2,
    padding: '12px 24px',
    backgroundColor: '#007AFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white'
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#999',
    margin: '0'
  }
};

export { OnboardingPlatformPicker };