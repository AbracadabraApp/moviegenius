// Comedy theme page
import ThemePage from '../../components/ThemePage';

export default function ComedyThroughTimePage() {
  const customStyles = {
    contentArea: {
      background: '#000000',
    },
    heroSubtitle: {
      color: '#fbbf24', // Bright yellow for comedy
    },
  };

  return <ThemePage themeId="comedy-through-time" customStyles={customStyles} />;
}
