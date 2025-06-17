// components/CinematicProfile.js - Display rotating cinematic personality profiles

import { useState, useEffect } from 'react';
import { cinematicProfileGenerator } from '../lib/cinematic-profile';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';

export default function CinematicProfile({ userData, className = '', onProfileChange }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (userData && (userData.heartedMovies || userData.bookmarkedMovies || userData.selectedPlatforms)) {
      loadProfile();
    }
  }, [userData.heartedMovies?.length, userData.bookmarkedMovies?.length, userData.selectedPlatforms?.length]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      console.log('Loading profile for userData:', userData);
      const newProfile = await cinematicProfileGenerator.generateProfile(userData);
      console.log('Generated profile:', newProfile);
      setProfile(newProfile);
      if (onProfileChange) {
        onProfileChange(newProfile);
      }
    } catch (error) {
      console.error('Error loading cinematic profile:', error);
      // Set fallback profile on error
      const fallback = {
        type: 'fallback',
        title: 'Your Cinematic Journey',
        content: 'Building your film profile...',
        icon: '🎬',
        recommendationHeader: 'More Ideas'
      };
      setProfile(fallback);
      if (onProfileChange) {
        onProfileChange(fallback);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const newProfile = await cinematicProfileGenerator.refreshProfiles(userData);
      setProfile(newProfile);
      if (onProfileChange) {
        onProfileChange(newProfile);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.loadingState}>
          <div style={styles.loadingIcon}>🎬</div>
          <p style={styles.loadingText}>Analyzing your cinematic DNA...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className={className} style={styles.container}>
      <div style={styles.profileCard}>
        <div style={styles.header}>
          <div style={styles.titleSection}>
            <span style={styles.icon}>{profile.icon}</span>
            <h3 style={styles.title}>{profile.title}</h3>
          </div>
          <button
            onClick={handleRefresh}
            style={styles.refreshButton}
            disabled={isRefreshing}
            title="Get new analysis"
          >
            <RefreshCw 
              size={16} 
              style={{
                transform: isRefreshing ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }} 
            />
          </button>
        </div>
        
        <div style={styles.content}>
          {profile.content.split('\n').map((line, index) => {
            if (line.startsWith('**') && line.endsWith('**')) {
              // Bold formatting
              return (
                <p key={index} style={styles.boldLine}>
                  {line.replace(/\*\*/g, '')}
                </p>
              );
            } else if (line.startsWith('*') && line.endsWith('*')) {
              // Italic/emphasis formatting
              return (
                <p key={index} style={styles.emphasisLine}>
                  {line.replace(/\*/g, '')}
                </p>
              );
            } else if (line.trim() === '') {
              // Empty line for spacing
              return <br key={index} />;
            } else {
              // Regular line
              return (
                <p key={index} style={styles.regularLine}>
                  {line}
                </p>
              );
            }
          })}
        </div>
        
        <div style={styles.footer}>
          <span style={styles.profileType}>{profile.type}</span>
          <span style={styles.updateTime}>
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  },
  icon: {
    fontSize: '20px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: 0,
    lineHeight: '1.3',
  },
  refreshButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease',
  },
  content: {
    marginBottom: '16px',
  },
  regularLine: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
    margin: '0 0 8px 0',
  },
  boldLine: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
    margin: '0 0 4px 0',
    fontWeight: '600',
  },
  emphasisLine: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.4',
    margin: '8px 0 0 0',
    fontStyle: 'italic',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
  profileType: {
    fontSize: '11px',
    color: '#9ca3af',
    textTransform: 'uppercase',
    fontWeight: '500',
    letterSpacing: '0.5px',
  },
  updateTime: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  loadingState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  loadingIcon: {
    fontSize: '32px',
    marginBottom: '12px',
    display: 'block',
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
};