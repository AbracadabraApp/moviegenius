import { useState, useEffect } from 'react'
import PlatformSelector from './PlatformSelector'

export default function StreamingPlatformBox() {
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [isExpanded, setIsExpanded] = useState(false)

  // Load selected platforms from localStorage
  useEffect(() => {
    const loadSelectedPlatforms = () => {
      try {
        const saved = localStorage.getItem('selectedPlatforms')
        if (saved) {
          const platforms = JSON.parse(saved)
          setSelectedPlatforms(platforms)
        }
      } catch (error) {
        console.error('Error loading platforms from localStorage:', error)
        setSelectedPlatforms([])
      }
    }

    loadSelectedPlatforms()

    // Listen for platform updates
    const handlePlatformUpdate = () => {
      loadSelectedPlatforms()
    }
    
    window.addEventListener('platformsUpdated', handlePlatformUpdate)
    return () => window.removeEventListener('platformsUpdated', handlePlatformUpdate)
  }, [])

  const handlePlatformSelectionChange = (platforms) => {
    // Save to localStorage
    localStorage.setItem('selectedPlatforms', JSON.stringify(platforms))
    setSelectedPlatforms(platforms)
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('platformsUpdated'))
    
    // Close the expanded view after saving
    setIsExpanded(false)
  }

  const handleEdit = () => {
    setIsExpanded(!isExpanded)
  }

  const displayText = selectedPlatforms.length > 0 
    ? selectedPlatforms.join(', ') 
    : 'None selected'

  return (
    <div style={styles.container}>
      {/* Collapsed State - Always Visible */}
      <div style={styles.collapsedView}>
        <span style={styles.streamingText}>
          Your streaming services: {displayText}
        </span>
        <button 
          style={styles.editButton}
          onClick={handleEdit}
        >
          {isExpanded ? 'cancel' : 'edit'}
        </button>
      </div>

      {/* Expanded State - Platform Selector */}
      {isExpanded && (
        <div style={styles.expandedView}>
          <PlatformSelector
            onSelectionChange={handlePlatformSelectionChange}
            initialSelected={selectedPlatforms}
            showSelectedSection={false}
            showHeader={false}
          />
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    marginTop: '24px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  collapsedView: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streamingText: {
    color: '#374151',
    fontSize: '14px',
    flex: 1,
    fontWeight: '400',
  },
  editButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#007AFF',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'underline',
    padding: '4px 8px',
    marginLeft: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
  },
  expandedView: {
    borderTop: '1px solid #e5e7eb',
    padding: '20px',
    backgroundColor: '#ffffff',
    animation: 'slideDown 0.3s ease-out',
  },
}