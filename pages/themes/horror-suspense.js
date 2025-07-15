// Horror & Suspense theme page
import ThemePage from '../../components/ThemePage';

export default function HorrorSuspensePage() {
  const customStyles = {
    heroVideo: '/images/hero/horror-suspense/horror-hero.mp4.mov',
    contentArea: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b2d 50%, #1a1a1a 100%)',
    },
  };

  return <ThemePage themeId="horror-suspense" customStyles={customStyles} />;
}