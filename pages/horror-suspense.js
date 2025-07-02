import PhoneFrame from '../components/PhoneFrame';
import AskInputBar from '../components/AskInputBar';
import BackButton from '../components/BackButton';
import { useRouter } from 'next/router';

export default function HorrorSuspensePage() {
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
            <h1 style={styles.title}>Horror & Suspense</h1>
            <p style={styles.description}>
              From psychological thrillers to supernatural terror, explore cinema's darkest corners
            </p>
          </div>
          
          <div style={styles.content}>
            <p>Horror and suspense content will be displayed here.</p>
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
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b2d 50%, #1a1a1a 100%)',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
    textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '12px',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
  },
  description: {
    fontSize: '16px',
    color: '#d1d5db',
    lineHeight: '1.6',
    maxWidth: '300px',
    margin: '0 auto',
  },
  content: {
    fontSize: '15px',
    color: '#e5e7eb',
    lineHeight: '1.6',
  },
};