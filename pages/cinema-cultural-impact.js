// Hollywood Transformed theme page
import ThemePage from '../components/ThemePage';

export default function CinemaCulturalImpactPage() {
  const customStyles = {
    contentArea: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #92400e 50%, #1a1a1a 100%)',
    },
    heroSubtitle: {
      color: '#f59e0b', // Amber for cultural impact/transformation
    },
  };

  return <ThemePage themeId="cinema-cultural-impact" customStyles={customStyles} />;
}
