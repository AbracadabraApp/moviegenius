// International Masters theme page
import ThemePage from '../../components/ThemePage';

export default function WorldCinemaPage() {
  const customStyles = {
    heroImage: '/images/hero/world-cinema/world-theme.jpg',
    contentArea: {
      background: '#000000',
    },
    heroSubtitle: {
      color: '#10b981', // Green for international
    },
  };

  return <ThemePage themeId="world-cinema" customStyles={customStyles} />;
}
