/**
 * StreamingCalloutBar Component
 *
 * Simple callout bar displaying streaming availability.
 * Designed to appear after the first paragraph of analysis.
 * No icons - clean text-only design.
 */

export default function StreamingCalloutBar({ streaming }) {
  // Don't render if no streaming data or TBD
  if (!streaming || streaming === 'TBD' || streaming.trim() === '') {
    return null;
  }

  const containerStyle = {
    marginTop: '20px',
    marginBottom: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  };

  const hairlineStyle = {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: 0,
  };

  const textContainerStyle = {
    padding: '12px 0',
    textAlign: 'center',
  };

  const labelStyle = {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: '#6b7280',
    marginRight: '8px',
  };

  const platformsStyle = {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500',
  };

  return (
    <div style={containerStyle}>
      <div style={hairlineStyle} />
      <div style={textContainerStyle}>
        <span style={labelStyle}>AVAILABLE ON:</span>
        <span style={platformsStyle}>{streaming}</span>
      </div>
      <div style={hairlineStyle} />
    </div>
  );
}
