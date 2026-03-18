/**
 * Search Page - V1 Word Wheel Only
 *
 * Simplified search page that redirects users to word wheel functionality
 * For V2: Will restore full search results with SearchResultCard
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;

  // V1: Redirect to homepage for word wheel search
  useEffect(() => {
    if (q) {
      // User tried to search with query param - redirect to homepage
      router.push('/');
    }
  }, [q, router]);

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Search header */}
        <div style={styles.header}>
          <SimpleSearch placeholder="Search movies..." initialQuery={q} />
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.messageContainer}>
            <div style={styles.messageIcon}>🔍</div>
            <div style={styles.messageTitle}>V1: Word Wheel Search</div>
            <div style={styles.messageText}>
              Type 3+ characters in the search bar to see movie suggestions. Click any result to view details.
            </div>
            <div style={styles.messageNote}>
              Full search results page coming in V2
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: '#ffffff',
    padding: '16px',
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  messageContainer: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  messageIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  messageTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },
  messageText: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '20px',
  },
  messageNote: {
    fontSize: '14px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
};
