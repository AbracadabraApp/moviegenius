// Cinema Through the Decades theme page
import ThemePage from '../../components/ThemePage';

export default function CinemaThroughDecadesPage() {
  const customStyles = {
    contentArea: {
      background: '#000000',
    },
    heroSubtitle: {
      color: '#a8a29e', // Warm gray for decades/history
    },
  };

  return <ThemePage themeId="cinema-through-decades" customStyles={customStyles} />;
}
