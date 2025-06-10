export default function HomePage() {
  return <div>Redirecting...</div>
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/recs',
      permanent: false,
    },
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  searchSection: {
    padding: '16px',
    backgroundColor: 'white',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: '12px 16px',
    borderRadius: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  searchText: {
    fontSize: '16px',
    color: '#999',
    fontWeight: '400',
  },
  micIcon: {
    fontSize: '18px',
    color: '#666',
  },
  headerImage: {
    width: '100%',
    marginBottom: '16px',
  },
  headerImageStyle: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  contentSection: {
    padding: '40px 24px 32px',
    backgroundColor: 'white',
    position: 'relative',
    zIndex: 3,
  },
}