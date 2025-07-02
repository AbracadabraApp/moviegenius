// Film Noir theme page
import PhoneFrame from '../components/PhoneFrame';
import AskInputBar from '../components/AskInputBar';
import BackButton from '../components/BackButton';
import { useRouter } from 'next/router';

export default function FilmNoirPage() {
  const router = useRouter();

  const handleAsk = (query) => {
    router.push({
      pathname: '/ask',
      query: { q: query }
    });
  };

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <BackButton variant="icon" context="theme" position="top-left" />
        
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        <div style={styles.scrollableContent}>
          <div style={styles.header}>
            <h1 style={styles.title}>Film Noir</h1>
            <p style={styles.description}>
              Dark urban tales of moral ambiguity, femme fatales, and the shadows that define classic cinema
            </p>
          </div>
          
          <div style={styles.content}>
            <p>Film noir content and movie recommendations will be displayed here.</p>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    backgroundColor: '#ffffff',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '16px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  description: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  content: {
    fontSize: '15px',
    color: '#374151',
    lineHeight: '1.6',
  },
};