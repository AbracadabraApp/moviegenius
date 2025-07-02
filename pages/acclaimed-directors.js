import PhoneFrame from '../components/PhoneFrame';
import AskInputBar from '../components/AskInputBar';
import BackButton from '../components/BackButton';
import { useRouter } from 'next/router';

export default function AcclaimedDirectorsPage() {
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
            <div style={styles.themeIcon}>🎭</div>
            <h1 style={styles.title}>Acclaimed Directors</h1>
            <p style={styles.description}>
              Visionary filmmakers whose artistic genius transformed cinema forever
            </p>
          </div>
          
          <div style={styles.content}>
            <p>Acclaimed directors content will be displayed here.</p>
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
    background: 'linear-gradient(135deg, #fffbeb 0%, #d97706 50%, #92400e 100%)',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    backgroundColor: 'rgba(255, 251, 235, 0.95)',
    backdropFilter: 'blur(10px)',
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
  themeIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#78350f',
    marginBottom: '12px',
    textShadow: '0 2px 4px rgba(255, 255, 255, 0.3)',
  },
  description: {
    fontSize: '16px',
    color: '#92400e',
    lineHeight: '1.6',
    maxWidth: '300px',
    margin: '0 auto',
    fontWeight: '500',
  },
  content: {
    fontSize: '15px',
    color: '#78350f',
    lineHeight: '1.6',
  },
};