import PhoneFrame from '../components/PhoneFrame';
import AskInputBar from '../components/AskInputBar';
import BackButton from '../components/BackButton';
import { useRouter } from 'next/router';

export default function WorldCinemaPage() {
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
            <div style={styles.themeIcon}>🌍</div>
            <h1 style={styles.title}>World Cinema</h1>
            <p style={styles.description}>
              International masters and global perspectives that expand cinema's boundaries
            </p>
          </div>
          
          <div style={styles.content}>
            <p>World cinema content will be displayed here.</p>
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
    background: 'linear-gradient(135deg, #ecfdf5 0%, #10b981 50%, #047857 100%)',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    backgroundColor: 'rgba(236, 253, 245, 0.95)',
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
    color: '#064e3b',
    marginBottom: '12px',
    textShadow: '0 2px 4px rgba(255, 255, 255, 0.3)',
  },
  description: {
    fontSize: '16px',
    color: '#065f46',
    lineHeight: '1.6',
    maxWidth: '300px',
    margin: '0 auto',
    fontWeight: '500',
  },
  content: {
    fontSize: '15px',
    color: '#064e3b',
    lineHeight: '1.6',
  },
};