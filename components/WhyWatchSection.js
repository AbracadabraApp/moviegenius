/**
 * WhyWatchSection Component - Decoupled Why Watch recommendation section
 *
 * Displays movie recommendation reasons in a styled format that can be easily
 * updated or regenerated without affecting the main analysis component.
 *
 * Note: Requires movieTitle.css to be imported in _app.js for person-name and movie-title link styles
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
 * @param {string} [props.streaming] - Streaming availability text
 * @param {Object} [props.style] - Additional styling overrides
 */
export default function WhyWatchSection({ reasons = [], recommendation = "YES", title = null, streaming = null, style = {} }) {
  console.log('WhyWatchSection streaming prop:', streaming);

  if (!reasons || reasons.length === 0) {
    return null;
  }

  // Dynamic colors based on recommendation
  const isSkipIt = recommendation === 'NO';
  const primaryColor = isSkipIt ? '#dc2626' : '#d4af37'; // Red for NO, Gold for YES

  const containerStyle = {
    marginTop: '20px',
    marginBottom: '24px',
    paddingLeft: '0px',
    ...style
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  };

  const dividerStyle = {
    flex: 1,
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
  };

  const titleStyle = {
    fontSize: 'var(--font-meta)', // Responsive: 12px desktop, 13px mobile
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: primaryColor,
    whiteSpace: 'nowrap',
  };

  const reasonsListStyle = {
    padding: '0'
  };

  const reasonItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '12px',
    lineHeight: '1.5'
  };

  const reasonBulletStyle = {
    color: primaryColor,
    marginRight: '10px',
    fontSize: '20px',
    lineHeight: '1.5',
    minWidth: '16px'
  };

  const reasonTextStyle = {
    fontSize: '16px', // Upgraded from var(--font-sm) for more prominence
    color: '#374151',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    flex: '1'
  };


  // Render reason text as HTML (supports person and movie links)
  const renderReasonText = (reason) => {
    // If reason contains HTML links (person or movie), render as HTML
    if (reason.includes('<a href="/person/') || reason.includes('<a href="/movie/')) {
      return <span dangerouslySetInnerHTML={{ __html: reason }} />;
    }
    // Otherwise render as plain text
    return reason;
  };

  // Generate dynamic title based on recommendation
  const getDefaultTitle = () => {
    if (title) return title; // Use custom title if provided
    return recommendation === 'NO' ? 'Save Your Time' : 'Reasons to Watch';
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={dividerStyle} />
        <span style={titleStyle}>{getDefaultTitle()}</span>
        <div style={dividerStyle} />
      </div>
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