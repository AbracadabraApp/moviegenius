// Movements in Film theme page
import ThemePage from '../../components/ThemePage';

export default function AvantGardeFilmPage() {
  const customStyles = {
    heroImage: '/images/hero/avant-garde-film/genre-theme.jpg',
    contentArea: {
      background: '#000000',
    },
    heroSubtitle: {
      color: '#a855f7', // Purple for avant-garde
    },
  };

  return <ThemePage themeId="avant-garde-film" customStyles={customStyles} />;
}
