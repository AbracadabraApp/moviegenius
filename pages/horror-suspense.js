// Horror & Suspense theme page
import ThemePage from '../components/ThemePage';

export default function HorrorSuspensePage() {
  const customStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b2d 50%, #1a1a1a 100%)',
    },
    fixedInputArea: {
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '16px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(10px)',
    },
    themeIcon: '🎭',
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '12px',
      textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
    },
    description: {
      fontSize: '16px',
      color: '#d1d5db',
      lineHeight: '1.6',
      maxWidth: '300px',
      margin: '0 auto',
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#ffffff',
      marginBottom: '16px',
      textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
    },
    episodeCard: {
      padding: '16px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(10px)',
    },
    episodeNumber: {
      fontSize: '12px',
      color: '#d1d5db',
      fontWeight: '500',
      marginBottom: '4px',
    },
    episodeTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#ffffff',
      marginBottom: '4px',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
    },
    episodeSubtitle: {
      fontSize: '14px',
      color: '#d1d5db',
      lineHeight: '1.5',
      margin: 0,
    },
    loadingText: {
      fontSize: '16px',
      color: '#d1d5db',
      textAlign: 'center',
      padding: '40px',
    },
    resultsHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      fontSize: '14px',
      color: '#d1d5db',
    },
    movieList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1px',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
  };

  return <ThemePage themeId="horror-suspense" customStyles={customStyles} />;
}