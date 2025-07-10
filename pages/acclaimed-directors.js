// Acclaimed Directors theme page
import ThemePage from '../components/ThemePage';

export default function AcclaimedDirectorsPage() {
  const customStyles = {
    heroImage: '/images/hero/acclaimed-directors/auteur-theme.jpg',
    contentArea: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #7c2d12 50%, #1a1a1a 100%)',
    },
    heroSubtitle: {
      color: '#ea580c', // Orange for acclaimed directors
    },
  };

  return <ThemePage themeId="acclaimed-directors" customStyles={customStyles} />;
}
