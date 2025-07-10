// The Magic of Moviemaking theme page
import ThemePage from '../components/ThemePage';

export default function MagicOfMoviemakingPage() {
  const customStyles = {
    heroImage: '/images/hero/magic-of-moviemaking/technical-theme.jpg',
    contentArea: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #0f172a 50%, #1a1a1a 100%)',
    },
    heroSubtitle: {
      color: '#60a5fa', // Blue for technical/magic
    },
  };

  return <ThemePage themeId="magic-of-moviemaking" customStyles={customStyles} />;
}
