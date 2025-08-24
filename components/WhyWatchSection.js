/**
 * WhyWatchSection Component - Decoupled Why Watch recommendation section
 * 
 * Displays movie recommendation reasons in a styled format that can be easily 
 * updated or regenerated without affecting the main analysis component.
 * 
 * @component
 * @example
 * <WhyWatchSection 
 *   reasons={['Outstanding performances', 'Groundbreaking cinematography']}
 *   recommendation="YES"
 * />
 */

/**
 * @param {Object} props - Component props
 * @param {string[]} props.reasons - Array of reasons to watch the movie
 * @param {string} [props.recommendation] - Overall recommendation (YES/NO)
 * @param {string} [props.title] - Custom title override
 * @param {Object} [props.style] - Additional styling overrides
 */
export default function WhyWatchSection({ reasons = [], recommendation = "YES", title = null, style = {} }) {
  if (!reasons || reasons.length === 0) {
    return null;
  }

  const containerStyle = {
    marginTop: '4px',
    borderLeft: '3px solid #d4af37',
    paddingLeft: '16px',
    ...style
  };

  const titleStyle = {
    fontSize: '16px',
    lineHeight: '1.2',
    margin: '0 0 12px 0',
    padding: '0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37'
  };

  const reasonsListStyle = {
    padding: '0'
  };

  const reasonItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '8px',
    lineHeight: '1.4'
  };

  const reasonBulletStyle = {
    color: '#d4af37',
    marginRight: '8px',
    fontSize: '16px',
    lineHeight: '1.4',
    minWidth: '12px'
  };

  const reasonTextStyle = {
    fontSize: '14px',
    color: '#374151',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    flex: '1'
  };

  const linkStyle = {
    color: '#d4af37',
    textDecoration: 'underline',
    fontWeight: '500'
  };

  // Parse reason text for <link> tags and render with proper styling
  const renderReasonText = (reason) => {
    const linkMatch = reason.match(/Consider <link>([^<]+)<\/link> instead/);
    if (linkMatch) {
      const movieTitle = linkMatch[1];
      const beforeText = reason.substring(0, linkMatch.index);
      return (
        <span>
          {beforeText}Consider <span style={linkStyle}>{movieTitle}</span> instead
        </span>
      );
    }
    return reason;
  };

  // Generate dynamic title based on recommendation
  const getDefaultTitle = () => {
    if (title) return title; // Use custom title if provided
    return recommendation === 'NO' ? 'Reasons to Skip It:' : 'Reasons to Watch:';
  };

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>{getDefaultTitle()}</h3>
      <div style={reasonsListStyle}>
        {reasons.slice(0, 3).map((reason, index) => (
          <div key={`reason-${index}`} style={reasonItemStyle}>
            <div style={reasonBulletStyle}>•</div>
            <div style={reasonTextStyle}>{renderReasonText(reason)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}