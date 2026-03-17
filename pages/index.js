/**
 * Homepage - V1 Minimal Search
 *
 * Stripped-down homepage with centered search box.
 * V2 will add browse collections and discovery features.
 */
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';

export default function HomePage() {
  const router = useRouter();

  const handleSearchResults = (results) => {
    if (results && results.length > 0) {
      router.push(`/search?q=${encodeURIComponent(results[0].query || '')}`);
    }
  };

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <div style={styles.logoSection}>
          <h1 style={styles.logo}>MovieGenius</h1>
          <p style={styles.tagline}>Find your next great film</p>
        </div>

        <div style={styles.searchSection}>
          <SimpleSearch
            onResults={handleSearchResults}
            placeholder="Search movies..."
            useUnifiedSearch={true}
          />
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    padding: '0 20px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  logoSection: {
    textAlign: 'center',
    marginBottom: '48px',
  },

  logo: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0',
  },

  tagline: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },

  searchSection: {
    width: '100%',
    maxWidth: '500px',
  },
};
