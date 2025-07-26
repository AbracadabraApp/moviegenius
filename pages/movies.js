// pages/movies.js - Minimal test page - zero routing
import PhoneFrame from '../components/PhoneFrame';

export default function MoviesPage() {
  return (
    <PhoneFrame>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Movies</h1>
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
