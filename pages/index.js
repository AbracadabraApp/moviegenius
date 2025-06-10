import PhoneFrame from '../components/PhoneFrame'
import PlatformSelector from '../components/PlatformSelector'
import CinemaThroughTime from '../components/CinemaThroughTime'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function HomePage() {
  const router = useRouter()
  
  // Redirect to /recs page
  useEffect(() => {
    router.push('/recs')
  }, [router])
  const handlePlatformSelectionChange = (selectedPlatforms) => {
    // Save to localStorage so You page can access the data
    localStorage.setItem('selectedPlatforms', JSON.stringify(selectedPlatforms))
    console.log('Saved platforms to localStorage:', selectedPlatforms)
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('platformsUpdated'))
  }
  
  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Cinema Through Time Parallax Section */}
        <CinemaThroughTime />
        
        <div style={styles.contentSection}>
          <PlatformSelector 
            onSelectionChange={handlePlatformSelectionChange}
            showSelectedSection={false}
          />
        </div>
      </div>
    </PhoneFrame>
  )
}

export async function getServerSideProps({ res }) {
  // Cache index page for 1 hour, stale-while-revalidate for 24 hours
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  );
  
  return {
    props: {}
  };
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