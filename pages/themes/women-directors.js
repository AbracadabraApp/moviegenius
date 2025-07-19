// Women Directors theme page
import ThemePage from '../../components/ThemePage';

export default function WomenDirectorsPage() {
  const customStyles = {
    contentArea: {
      background: '#000000',
    },
    heroSubtitle: {
      color: '#f472b6', // Pink for women directors
    },
  };

  return <ThemePage themeId="women-directors" customStyles={customStyles} />;
}
