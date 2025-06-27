// components/ExploreFurtherSection.js - Reusable Explore Further section with gold dividers
import ExplorePromptCard from './ExplorePromptCard';

export default function ExploreFurtherSection({ 
  prompts = [], 
  contextPrefix,
  style = {},
  children // For additional content like Cast & Crew buttons
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
          <ExplorePromptCard
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
    padding: '16px 0 20px', // Remove horizontal padding - let container handle it
    backgroundColor: '#ffffff',
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
};