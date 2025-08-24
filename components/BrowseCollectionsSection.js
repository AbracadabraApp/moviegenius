/**
 * BrowseCollectionsSection Component - Display movie's browse collections
 * 
 * Shows which curated collections this movie appears in, helping users
 * discover thematic connections and browsing paths.
 * 
 * @component
 * @example
 * <BrowseCollectionsSection 
 *   collections={['Film Noir Essentials', 'Hollywood Golden Age']}
 *   totalCollections={12}
 * />
 */

/**
 * @param {Object} props - Component props
 * @param {string[]} props.collections - Array of collection names (max 5 displayed)
 * @param {number} [props.totalCollections] - Total number of collections movie appears in
 * @param {string} [props.title] - Custom section title
 * @param {Object} [props.style] - Additional styling overrides
 */
export default function BrowseCollectionsSection({ 
  collections = [], 
  totalCollections = 0, 
  title = "Featured In Collections", 
  style = {} 
}) {
  if (!collections || collections.length === 0) {
    return null;
  }

  // Limit to first 5 collections for display
  const displayCollections = collections.slice(0, 5);
  const hasMoreCollections = totalCollections > 5;

  const containerStyle = {
    marginTop: '32px',
    marginBottom: '32px',
    ...style
  };

  const sectionHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '16px',
  };

  const sectionDividerStyle = {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
  };

  const sectionLabelStyle = {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
  };

  const collectionsListStyle = {
    padding: '0',
    margin: '0',
    listStyle: 'none',
  };

  const collectionItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '8px',
    lineHeight: '1.4'
  };

  const bulletStyle = {
    color: '#d4af37',
    marginRight: '12px',
    fontSize: '16px',
    lineHeight: '1.4',
    minWidth: '12px',
    fontWeight: '600'
  };

  const collectionNameStyle = {
    fontSize: '14px',
    color: '#374151',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    flex: '1'
  };

  const moreCollectionsStyle = {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: '4px',
    paddingLeft: '24px'
  };

  return (
    <div style={containerStyle}>
      <div style={sectionHeaderStyle}>
        <div style={sectionDividerStyle} />
        <span style={sectionLabelStyle}>{title}</span>
        <div style={sectionDividerStyle} />
      </div>
      
      <ul style={collectionsListStyle}>
        {displayCollections.map((collection, index) => (
          <li key={`collection-${index}`} style={collectionItemStyle}>
            <span style={bulletStyle}>•</span>
            <span style={collectionNameStyle}>{collection}</span>
          </li>
        ))}
      </ul>
      
      {hasMoreCollections && (
        <div style={moreCollectionsStyle}>
          ...and {totalCollections - 5} more collections
        </div>
      )}
    </div>
  );
}