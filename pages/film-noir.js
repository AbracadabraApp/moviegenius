// Film Noir theme page
import ThemePage from '../components/ThemePage';

export default function FilmNoirPage() {
  const customStyles = {
    heroVideo: '/images/hero/film-noir/noir2.mov',
  };

  return <ThemePage themeId="film-noir" customStyles={customStyles} />;
}