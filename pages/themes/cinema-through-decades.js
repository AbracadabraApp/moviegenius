// Cinema Through the Decades theme page
import ThemePage from '../../components/ThemePage';

export default function CinemaThroughDecadesPage() {
  const customStyles = {
    contentArea: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #78716c 50%, #1a1a1a 100%)',
    },
    heroSubtitle: {
      color: '#a8a29e', // Warm gray for decades/history
    },
  };

  return <ThemePage themeId="cinema-through-decades" customStyles={customStyles} />;
}
