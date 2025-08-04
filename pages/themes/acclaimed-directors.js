// Acclaimed Directors theme page
import ThemePage from '../../components/ThemePage';

export default function AcclaimedDirectorsPage() {
  const customStyles = {
    heroImage: '/images/hero/acclaimed-directors/auteur-theme.jpg',
    contentArea: {
      background: '#000000',
    },
    heroSubtitle: {
      color: '#ea580c', // Orange for acclaimed directors
    },
  };

  return <ThemePage themeId="acclaimed-directors" customStyles={customStyles} />;
}
