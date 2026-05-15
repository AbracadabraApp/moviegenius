// components/Footer.js
export default function Footer() {
  return (
    <>
      {/* 5 line breaks above footer */}
      <div style={{ height: '5rem' }} />

      {/* Separator line */}
      <hr style={{
        border: 'none',
        borderTop: '1px solid #333',
        margin: '0 auto',
        maxWidth: '900px',
        width: '90%'
      }} />

      <footer style={{
        marginTop: '3rem',
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
    </>
  );
}
