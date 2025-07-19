// Hollywood Transformed theme page
import ThemePage from '../../components/ThemePage';

export default function CinemaCulturalImpactPage() {
  const customStyles = {
    contentArea: {
      background: '#000000',
    },
    heroSubtitle: {
      color: '#f59e0b', // Amber for cultural impact/transformation
    },
  };

  return <ThemePage themeId="cinema-cultural-impact" customStyles={customStyles} />;
}
