export default function SelectedPlatforms({ platforms = [] }) {
  if (platforms.length === 0) {
    return (
      <div style={styles.emptyState}>
        <h2 style={styles.header}>Your Streaming Platforms</h2>
        <p style={styles.emptyText}>No platforms selected yet. Visit the home page to select your streaming services.</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Your Streaming Platforms</h2>
      <div style={styles.platformList}>
        {platforms.map((platform, index) => (
          <div key={platform} style={styles.platformItem}>
            {platform}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    marginBottom: '24px',
  },
  emptyState: {
    marginBottom: '24px',
  },
  header: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#000',
    margin: '0 0 16px 0',
  },
  platformList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  platformItem: {
    fontSize: '16px',
    color: '#333',
    padding: '8px 12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  emptyText: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
    margin: 0,
  },
}