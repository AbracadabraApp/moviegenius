// Women Directors theme page
import ThemePage from '../components/ThemePage';

export default function WomenDirectorsPage() {
  const customStyles = {
    contentArea: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #831843 50%, #1a1a1a 100%)',
    },
    heroSubtitle: {
      color: '#f472b6', // Pink for women directors
    },
  };

  return <ThemePage themeId="women-directors" customStyles={customStyles} />;
}
