import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import AskInputBar from '../components/AskInputBar';
import BackButton from '../components/BackButton';
import geniusConfig from '../data/genius-config.json';

export default function GeniusHomePage() {
  const router = useRouter();

  const handleAsk = (query) => {
    router.push({
      pathname: '/ask',
      query: { q: query }
    });
  };

  return (
    <PhoneFrame active="genius">
      <div style={styles.container}>
        {/* Back button for navigation */}
        <BackButton variant="icon" context="episode" position="top-left" />
        
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        <div style={styles.scrollableContent}>
          <div style={styles.homeHeader}>
            <h1 style={styles.homeTitle}>MovieGenius Film Education</h1>
            <p style={styles.homeDescription}>
              Comprehensive film education through curated themes, series, and episodes
            </p>
          </div>
          
          <div style={styles.themesGrid}>
            {Object.values(geniusConfig.themes).map((theme) => (
              <div 
                key={theme.id}
                style={styles.themeCard}
                onClick={() => router.push(`/genius/${theme.id}`)}
              >
                <h3 style={styles.themeCardTitle}>{theme.title}</h3>
                <p style={styles.themeCardDescription}>{theme.description}</p>
                <div style={styles.themeStats}>
                  {theme.series.length} Series • {theme.series.reduce((acc, s) => acc + s.episodes.length, 0)} Episodes
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    backgroundColor: '#ffffff',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '16px',
  },
  homeHeader: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  homeTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  homeDescription: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  themesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  themeCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  themeCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  themeCardDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '8px',
  },
  themeStats: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },
};