// International Masters theme page
import ThemePage from '../../components/ThemePage';

export default function WorldCinemaPage() {
  const customStyles = {
    heroImage: '/images/hero/world-cinema/world-theme.jpg',
    contentArea: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #065f46 50%, #1a1a1a 100%)',
    },
    heroSubtitle: {
      color: '#10b981', // Green for international
    },
  };

  return <ThemePage themeId="world-cinema" customStyles={customStyles} />;
}
