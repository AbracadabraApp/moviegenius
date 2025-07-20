// components/ExplorePromptCard.js - Reusable Explore Further prompt card
import { useRouter } from 'next/router';
import { memo, useCallback } from 'react';

function ExplorePromptCard({ prompt, contextPrefix, style = {}, onClick }) {
  const router = useRouter();

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(prompt);
    } else {
      // Route to static explore page instead of slow Ask query
      const topic = prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      const context = contextPrefix
        ? contextPrefix
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
        : '';

      const explorePath = context ? `/explore/${topic}/${context}` : `/explore/${topic}`;

      router.push(explorePath);
    }
  }, [prompt, contextPrefix, onClick, router]);

  return (
    <div
      style={{
        ...styles.explorePromptCard,
        ...style,
      }}
      onClick={handleClick}
    >
      <p style={styles.explorePromptText}>{prompt}</p>
      <span style={styles.explorePromptArrow}>→</span>
    </div>
  );
}

const styles = {
  explorePromptCard: {
    padding: '24px',
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  explorePromptText: {
    fontSize: '15px',
    lineHeight: '1.5',
    color: '#374151',
    fontStyle: 'italic',
    margin: 0,
    flex: 1,
  },
  explorePromptArrow: {
    color: '#d4af37',
    fontSize: '18px',
    fontWeight: 'bold',
    marginLeft: '16px',
    transition: 'all 0.2s ease',
  },
};

export default memo(ExplorePromptCard);
