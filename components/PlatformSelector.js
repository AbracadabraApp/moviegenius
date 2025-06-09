import { useState, useEffect } from 'react'

export default function PlatformSelector({ 
  onSelectionChange, 
  initialSelected = [],
  showSelectedSection = true,
  showHeader = true
}) {
  const [showMore, setShowMore] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set(initialSelected))
  const [pendingPlatforms, setPendingPlatforms] = useState(new Set(initialSelected))

  // Load existing selections from localStorage on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('selectedPlatforms')
      if (saved) {
        const platforms = JSON.parse(saved)
        setSelectedPlatforms(new Set(platforms))
        setPendingPlatforms(new Set(platforms))
      }
    } catch (error) {
      console.error('Error loading platforms from localStorage:', error)
    }
  }, [])
  
  const mainPlatforms = [
    'None',
    'Netflix', 
    'Amazon Prime Video',
    'Disney+',
    'Apple TV+',
    'HBO Max',
    'Paramount+',
    'ESPN+',
    'Peacock',
    'Hulu'
  ]
  
  const additionalPlatforms = [
    'Tencent Video',
    'iQIYI',
    'Crunchyroll',
    'Discovery+',
    'AMC+',
    'Sling TV',
    'Pluto TV',
    'Tubi',
    'Vudu',
    'Kanopy',
    'Shudder',
    'BritBox',
    'Mubi',
    'CuriosityStream',
    'DocPlay',
    'Hallmark Movies Now',
    'Crunchyroll Fan Pass',
    'Funimation',
    'VRV',
    'Acorn TV',
    'IFC Films Unlimited'
  ]
  
  const handlePlatformChange = (platform) => {
    const newPending = new Set(pendingPlatforms)
    if (newPending.has(platform)) {
      newPending.delete(platform)
    } else {
      newPending.add(platform)
    }
    setPendingPlatforms(newPending)
  }

  const handleSave = () => {
    setSelectedPlatforms(new Set(pendingPlatforms))
    
    // Notify parent component of selection change
    if (onSelectionChange) {
      onSelectionChange(Array.from(pendingPlatforms))
    }
  }

  const handleCancel = () => {
    setPendingPlatforms(new Set(selectedPlatforms))
  }

  const hasChanges = () => {
    const current = Array.from(selectedPlatforms).sort()
    const pending = Array.from(pendingPlatforms).sort()
    return JSON.stringify(current) !== JSON.stringify(pending)
  }
  
  return (
    <div>
      {showHeader && (
        <h2 style={styles.questionHeader}>Do you subscribe to any of these?</h2>
      )}
      
      <div style={styles.platformGrid}>
        {mainPlatforms.map((platform) => (
          <div key={platform} style={styles.platformItem}>
            <input
              type="checkbox"
              id={platform}
              checked={pendingPlatforms.has(platform)}
              onChange={() => handlePlatformChange(platform)}
              style={styles.checkbox}
            />
            <label htmlFor={platform} style={styles.platformLabel}>
              {platform}
            </label>
          </div>
        ))}
        
        {showMore && additionalPlatforms.map((platform) => (
          <div key={platform} style={styles.platformItem}>
            <input
              type="checkbox"
              id={platform}
              checked={pendingPlatforms.has(platform)}
              onChange={() => handlePlatformChange(platform)}
              style={styles.checkbox}
            />
            <label htmlFor={platform} style={styles.platformLabel}>
              {platform}
            </label>
          </div>
        ))}
      </div>
      
      <div style={styles.seeMoreContainer}>
        <button 
          onClick={() => setShowMore(!showMore)}
          style={styles.seeMoreButton}
        >
          {showMore ? 'See less' : 'See more'}
        </button>
      </div>
      
      {/* Save/Cancel Actions */}
      {hasChanges() && (
        <div style={styles.actionContainer}>
          <button 
            onClick={handleCancel}
            style={styles.cancelButton}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            style={styles.saveButton}
          >
            Done
          </button>
        </div>
      )}
      
      {showSelectedSection && selectedPlatforms.size > 0 && (
        <div style={styles.selectedSection}>
          <h3 style={styles.selectedHeader}>Your Streaming Services</h3>
          <div style={styles.selectedList}>
            {Array.from(selectedPlatforms).map((platform) => (
              <div key={platform} style={styles.selectedItem}>
                {platform}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  questionHeader: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 20px 0',
    textAlign: 'left',
  },
  platformGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    marginBottom: '16px',
  },
  platformItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  platformLabel: {
    fontSize: '15px',
    color: '#374151',
    cursor: 'pointer',
    flex: 1,
  },
  seeMoreContainer: {
    gridColumn: '2',
    textAlign: 'right',
    marginTop: '4px',
  },
  seeMoreButton: {
    fontSize: '14px',
    color: '#007AFF',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: 'inherit',
    fontWeight: '500',
  },
  actionContainer: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  saveButton: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  selectedSection: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e0e0e0',
  },
  selectedHeader: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 12px 0',
    textAlign: 'left',
  },
  selectedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  selectedItem: {
    fontSize: '14px',
    color: '#374151',
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
}