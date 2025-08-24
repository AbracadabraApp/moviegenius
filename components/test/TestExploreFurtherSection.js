/**
 * TestExploreFurtherSection - Simplified copy for testing
 * Renders Explore Further section with gold dividers
 */
import { memo } from 'react';

function TestExplorePromptCard({ prompt, contextPrefix }) {
  return (
    <div style={styles.promptCard}>
      <div style={styles.promptContent}>
        {prompt.content || prompt.text || prompt}
      </div>
    </div>
  );
}

function TestExploreFurtherSection({
  prompts = [],
  contextPrefix,
  style = {},
  children,
}) {
  if (prompts.length === 0 && !children) {
    return null;
  }

  return (
    <div style={{ ...styles.exploreFurtherSection, ...style }}>
      <div style={styles.exploreFurtherHeader}>
        <div style={styles.sectionDivider} />
        <span style={styles.sectionLabel}>EXPLORE FURTHER</span>
        <div style={styles.sectionDivider} />
      </div>
      <div style={styles.exploreFurtherGrid}>
        {prompts.map((prompt, index) => (
          <TestExplorePromptCard
            key={`explore-${index}`}
            prompt={prompt}
            contextPrefix={contextPrefix}
          />
        ))}
        {children}
      </div>
    </div>
  );
}

const styles = {
  exploreFurtherSection: {
    padding: '16px 0 20px',
    marginBottom: '20px',
  },
  exploreFurtherHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '16px',
  },
  sectionDivider: {
    flex: 1,
    height: '1px',
    backgroundColor: '#d4af37',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
  },
  exploreFurtherGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  promptCard: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer',
  },
  promptContent: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
  },
};

export default memo(TestExploreFurtherSection);