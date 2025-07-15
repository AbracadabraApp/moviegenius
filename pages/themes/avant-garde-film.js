// Movements in Film theme page
import ThemePage from '../../components/ThemePage';

export default function AvantGardeFilmPage() {
  const customStyles = {
    heroImage: '/images/hero/avant-garde-film/genre-theme.jpg',
    contentArea: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #581c87 50%, #1a1a1a 100%)',
    },
    heroSubtitle: {
      color: '#a855f7', // Purple for avant-garde
    },
  };

  return <ThemePage themeId="avant-garde-film" customStyles={customStyles} />;
}
