// pages/movies.js - Minimal text display test page with navbar
import PhoneFrame from '../components/PhoneFrame';
import { useRouter } from 'next/router';
import { navItems, routeValidation } from '../lib/routes';

export default function MoviesPage() {
  const router = useRouter();
  const { text } = router.query;
  
  return (
    <PhoneFrame navItems={navItems} routeValidation={routeValidation}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            {text || 'Movies'}
          </h1>
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#374151',
    margin: '0',
  },
};
