// Horror & Suspense theme page
import ThemePage from '../../components/ThemePage';

export default function HorrorSuspensePage() {
  const customStyles = {
    heroVideo: '/images/hero/horror-suspense/horror-hero.mp4.mov',
    contentArea: {
      background: '#000000',
    },
  };

  return <ThemePage themeId="horror-suspense" customStyles={customStyles} />;
}