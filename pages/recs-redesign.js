// pages/recs-redesign.js - Movies as Home: MoveGenius.AI Design
import PhoneFrame from '../components/PhoneFrame'
import SimpleSearch from '../components/SimpleSearch'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import AnonymousUserManager from '../lib/anonymous-user'

export default function MoviesHomeRedesign() {
  const router = useRouter()
  const [declarativeLists, setDeclarativeLists] = useState([])
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Initialize anonymous user and load data
  useEffect(() => {
    const initializePage = async () => {
      try {
        // Initialize anonymous user system
        await AnonymousUserManager.initialize()
        
        // Load declarative lists for tag cloud
        const response = await fetch('/api/tag-cloud?content_type=declarative')
        if (response.ok) {
          const data = await response.json()
          // Randomize and assign font sizes like ask.js
          const shuffled = data.lists.sort(() => 0.5 - Math.random())
          const selected75 = shuffled.slice(0, 75)
          const itemsWithSizes = selected75.map((item, index) => ({
            text: item.name,
            slug: item.slug,
            listId: item.id,
            fontSize: index % 3 === 0 ? 'large' : index % 3 === 1 ? 'medium' : 'small'
          }))
          setDeclarativeLists(itemsWithSizes)
        }
        
        // Load user platforms
        const platforms = JSON.parse(localStorage.getItem('selectedPlatforms') || '[]')
        setSelectedPlatforms(platforms)
        
      } catch (error) {
        console.error('Error initializing Movies home page:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializePage()

    // Listen for platform updates
    const handlePlatformUpdate = () => {
      const platforms = JSON.parse(localStorage.getItem('selectedPlatforms') || '[]')
      setSelectedPlatforms(platforms)
    }
    
    window.addEventListener('platformsUpdated', handlePlatformUpdate)
    return () => window.removeEventListener('platformsUpdated', handlePlatformUpdate)
  }, [])

  const handleSearchResults = (results) => {
    // For now, just log the search results
    // In the future, could show search results in a modal or navigate to search page
    console.log('Search results on Recs Redesign page:', results);
  }

  const handleListClick = (list) => {
    // Navigate to list detail page
    router.push(`/genius/list/${list.slug}`)
  }

  const handleEditPlatforms = () => {
    router.push('/you#platforms')
  }

  if (isLoading) {
    return (
      <PhoneFrame active="recs">
        <div style={styles.container}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingText}>Loading movie discovery...</div>
          </div>
        </div>
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame active="recs">
      <div style={styles.container}>
        {/* Hero Branding */}
        <div style={styles.heroSection}>
          <h1 style={styles.brandTitle}>MoveGenius.AI</h1>
          <p style={styles.brandTagline}>A film guide built by cinema loving robots</p>
        </div>


        {/* Fixed Header/Input Section */}
        <div style={styles.fixedSection}>
          {/* Central Ask About Films Section */}
          <div style={styles.askSection}>
            <h2 style={styles.askTitle}>Ask About Films</h2>
            <div style={styles.askInputWrapper}>
              <SimpleSearch 
                onResults={handleSearchResults}
                placeholder="Film Noir Classics"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Content Area with Interrupted Tag Cloud */}
        <div style={styles.scrollableContent}>
          {/* First part of tag cloud (about 25 items ~5 lines) */}
          <div style={styles.tagCloudArea}>
            {declarativeLists.slice(0, 25).map((item, index) => (
              <span
                key={item.listId}
                style={{
                  ...styles.tagCloudItem,
                  ...styles[`fontSize${item.fontSize.charAt(0).toUpperCase() + item.fontSize.slice(1)}`]
                }}
                onClick={() => handleListClick(item)}
              >
                {item.text}
                {index < 24 && '\u00A0\u00A0'}
              </span>
            ))}
          </div>

          {/* Interruption space for visual break */}
          <div style={styles.tagCloudBreak}>
            <div style={styles.breakLine}></div>
          </div>

          {/* Remaining tag cloud */}
          <div style={styles.tagCloudArea}>
            {declarativeLists.slice(25).map((item, index) => (
              <span
                key={item.listId}
                style={{
                  ...styles.tagCloudItem,
                  ...styles[`fontSize${item.fontSize.charAt(0).toUpperCase() + item.fontSize.slice(1)}`]
                }}
                onClick={() => handleListClick(item)}
              >
                {item.text}
                {index < declarativeLists.slice(25).length - 1 && '\u00A0\u00A0'}
              </span>
            ))}
          </div>

          {/* Call to Action for Platform Selection */}
          {selectedPlatforms.length === 0 && (
            <div style={styles.platformCTA}>
              <h3 style={styles.ctaTitle}>Want to see where movies stream?</h3>
              <p style={styles.ctaSubtitle}>Select your platforms to see availability</p>
              <button 
                style={styles.ctaButton}
                onClick={handleEditPlatforms}
              >
                Choose Streaming Platforms
              </button>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  )
}

// Cache for performance
export async function getServerSideProps({ res }) {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=1800, stale-while-revalidate=3600'
  )
  
  return { props: {} }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: '16px',
    color: '#666',
  },
  heroSection: {
    padding: '32px 24px 16px',
    backgroundColor: '#ffffff',
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#000',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  brandTagline: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0',
    fontWeight: '400',
  },
  platformStatus: {
    padding: '12px 24px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  platformText: {
    color: '#374151',
    flex: 1,
  },
  editButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#007AFF',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'underline',
    padding: '0',
  },
  fixedSection: {
    position: 'relative',
    zIndex: 10,
    backgroundColor: '#ffffff',
    padding: '16px',
    borderBottom: '1px solid #e9ecef',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  // Tag cloud styling inspired by ask.js sampleQuestionsArea
  tagCloudArea: {
    textAlign: 'justify',
    padding: '0 16px 20px 16px',
    lineHeight: '1.4',
    marginBottom: '24px',
  },
  tagCloudItem: {
    display: 'inline',
    margin: '0 8px 8px 0',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease, color 0.2s ease',
    color: '#6b7280',
  },
  // Font sizes matching ask.js
  fontSizeLarge: {
    fontSize: '20px',
    fontWeight: '300',
    color: '#374151',
  },
  fontSizeMedium: {
    fontSize: '18px',
    fontWeight: '800',
  },
  fontSizeSmall: {
    fontSize: '14px',
    fontWeight: '600',
  },
  askSection: {
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
    border: '2px solid #dee2e6',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  tagCloudBreak: {
    padding: '20px 0',
    textAlign: 'center',
  },
  breakLine: {
    width: '60px',
    height: '2px',
    backgroundColor: '#dee2e6',
    margin: '0 auto',
    borderRadius: '2px',
  },
  askTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#000',
    margin: '0 0 16px 0',
  },
  askInputWrapper: {
    maxWidth: '100%',
  },
  centralInput: {
    fontSize: '16px',
    padding: '14px 18px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    border: '2px solid #e9ecef',
    width: '100%',
  },
  platformCTA: {
    backgroundColor: '#f0f9ff',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    marginTop: 'auto',
  },
  ctaTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 8px 0',
  },
  ctaSubtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 16px 0',
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}