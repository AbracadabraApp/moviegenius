/**
 * StreamingAvailabilityLink Component - Decoupled streaming search link
 * 
 * Provides a consistent interface for streaming availability searches that can
 * be easily updated to use different data sources (Google search, JustWatch API, etc.)
 * 
 * @component
 * @example
 * <StreamingAvailabilityLink 
 *   movieTitle="Fight Club"
 *   year={1999}
 *   provider="google"
 * />
 */

/**
 * @param {Object} props - Component props
 * @param {string} props.movieTitle - Movie title for search
 * @param {number} [props.year] - Movie release year
 * @param {string} [props.provider] - Search provider ('google', 'justwatch', etc.)
 * @param {Object} [props.style] - Additional styling overrides
 * @param {string} [props.linkText] - Custom link text (default: "available to stream")
 * @param {string} [props.prefixText] - Text before the link (default: "Check if ")
 */
export default function StreamingAvailabilityLink({ 
  movieTitle, 
  year, 
  provider = 'google',
  style = {},
  linkText = 'available to stream',
  prefixText = 'Check if '
}) {
  if (!movieTitle) {
    return null;
  }

  // Build search URL based on provider
  const getSearchUrl = () => {
    const query = `streaming watch ${movieTitle}${year ? ` ${year}` : ''}`;
    
    switch (provider) {
      case 'google':
        return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      case 'justwatch':
        // Future: JustWatch search URL format
        return `https://www.justwatch.com/us/search?q=${encodeURIComponent(movieTitle)}`;
      default:
        return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  };

  const containerStyle = {
    marginTop: '12px',
    marginBottom: '8px',
    paddingLeft: '0px',
    textAlign: 'left',
    ...style
  };

  const textStyle = {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '300',
    fontFamily: 'inherit'
  };

  const linkStyle = {
    color: '#777777',
    textDecoration: 'underline',
    textDecorationColor: '#e0e0e0',
    textDecorationThickness: '1px',
    textUnderlineOffset: '2px',
    fontSize: '14px',
    fontWeight: '400',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  };

  const handleMouseEnter = (e) => {
    e.target.style.color = '#1a1a1a';
    e.target.style.textDecorationColor = '#c0c0c0';
  };

  const handleMouseLeave = (e) => {
    e.target.style.color = '#777777';
    e.target.style.textDecorationColor = '#e0e0e0';
  };

  return (
    <div style={containerStyle}>
      <span style={textStyle}>
        {prefixText}
        <a 
          href={getSearchUrl()}
          style={linkStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {linkText}
        </a>
      </span>
    </div>
  );
}