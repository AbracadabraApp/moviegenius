/**
 * WhyWatchSection Component - Editorial verdict on whether to watch a movie
 *
 * Designed as a single editorial opinion, not a checklist.
 * The verdict leads. Context is the voice. Reasons are supporting evidence.
 */

import { Sparkles } from 'lucide-react';

export default function WhyWatchSection({ reasons = [], recommendation = "YES", title = null, context = null, streaming = null, style = {}, rightSlot = null }) {
  if (!reasons || reasons.length === 0) {
    return null;
  }

  const isSkip = recommendation === 'NO';

  const verdictText = title
    ? title
    : isSkip ? 'Skip It' : 'Worth Watching';

  const verdictColor = isSkip ? '#6b7280' : '#d4af37';

  // Render reason text as HTML (supports person and movie links)
  const renderReasonText = (reason) => {
    if (reason.includes('<a href="/person/') || reason.includes('<a href="/movie/')) {
      return <span dangerouslySetInnerHTML={{ __html: reason }} />;
    }
    return reason;
  };

  return (
    <div style={{ ...styles.container, ...style }}>

      {/* Verdict */}
      <div style={styles.verdictRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {!isSkip && <Sparkles size={16} color="#d4af37" style={{ flexShrink: 0 }} />}
          <span style={{ ...styles.verdict, color: verdictColor }}>{verdictText}</span>
        </div>
        <div style={{ ...styles.verdictLine, background: `linear-gradient(90deg, ${verdictColor}40, transparent)` }} />
        {rightSlot && <div style={styles.verdictRightSlot}>{rightSlot}</div>}
      </div>

      {/* Reasons — supporting evidence */}
      <div style={styles.reasons}>
        {reasons.slice(0, 3).map((reason, index) => (
          <div key={index} style={styles.reasonRow}>
            <span style={{ ...styles.reasonDot, color: verdictColor }}>·</span>
            <span style={styles.reasonText}>{renderReasonText(reason)}</span>
          </div>
        ))}
      </div>

      {/* Context — closing coda in italics */}
      {context && (
        <p style={styles.context}>{context}</p>
      )}

    </div>
  );
}

const styles = {
  container: {
    padding: '10px 20px 8px',
  },

  verdictRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px',
  },

  verdict: {
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    lineHeight: '1',
    whiteSpace: 'nowrap',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  verdictLine: {
    flex: 1,
    height: '1px',
  },

  verdictRightSlot: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },

  context: {
    fontSize: 'var(--font-sm)',
    lineHeight: '1.6',
    color: '#000000',
    fontStyle: 'normal',
    margin: '16px 0 0 0',
    marginLeft: '4px',
    borderLeft: '3px solid #e5e7eb',
    paddingLeft: '10px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  reasons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  reasonRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },

  reasonDot: {
    fontSize: '18px',
    lineHeight: '1.5',
    flexShrink: 0,
    fontWeight: '700',
    marginTop: '1px',
  },

  reasonText: {
    fontSize: 'var(--font-sm)',
    color: '#374151',
    lineHeight: '1.5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};
