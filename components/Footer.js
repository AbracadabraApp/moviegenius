// components/Footer.js
export default function Footer() {
  return (
    <footer style={{
      marginTop: '5rem',
      paddingTop: '5rem',
      paddingBottom: '2rem',
      textAlign: 'center',
      color: '#999',
      fontSize: '0.875rem',
      lineHeight: '1.5'
    }}>
      <div style={{ marginBottom: '1rem' }}>
        Movie Genius™ - moviegenius.ai an 8x10 joint
      </div>

      <div style={{ marginBottom: '1rem' }}>
        This product uses the TMDB API but is not endorsed or certified by TMDB
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <img
          src="/tmdb-logo.svg"
          alt="TMDB Logo"
          style={{
            height: '20px',
            display: 'inline-block'
          }}
        />
      </div>

      <div style={{ fontSize: '0.75rem', color: '#666' }}>
        Couldn't have done it without Claude!
      </div>
    </footer>
  );
}
