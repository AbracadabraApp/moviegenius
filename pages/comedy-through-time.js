// Comedy theme page
import ThemePage from '../components/ThemePage';

export default function ComedyThroughTimePage() {
  const customStyles = {
    contentArea: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 50%, #1a1a1a 100%)',
    },
    heroSubtitle: {
      color: '#fbbf24', // Bright yellow for comedy
    },
  };

  return <ThemePage themeId="comedy-through-time" customStyles={customStyles} />;
}