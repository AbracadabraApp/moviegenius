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

  const barStyle = {
    backgroundColor: '#f9fafb',
    borderLeft: '3px solid #d4af37',
    padding: '12px 16px',
    marginTop: '20px',
    marginBottom: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
    color: '#111827',
    fontWeight: '500',
  };

  return (
    <div style={barStyle}>
      <span style={labelStyle}>AVAILABLE ON:</span>
      <span style={platformsStyle}>{streaming}</span>
    </div>
  );
}
