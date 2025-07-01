// pages/media/[id].js
import { useRouter } from 'next/router';
import { getMediaById } from '../../lib/media';
import PhoneFrame from '../../components/PhoneFrame';
import BackButton from '../../components/BackButton';
import FilmLoadingMessage from '../../components/FilmLoadingMessage';

export default function MediaDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const media = getMediaById(id);

  if (!media) {
    return (
      <PhoneFrame>
        {/* Back button for navigation */}
        <BackButton variant="icon" context="movie" position="top-left" />
        
        <div style={styles.loadingContainer}>
          <FilmLoadingMessage message="Diving into the vault..." />
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      {/* Back button for navigation */}
      <BackButton variant="icon" context="movie" position="top-left" />
      
      <div style={styles.container}>
        <img src={media.poster} alt={media.title} style={styles.poster} />
        <h1 style={styles.title}>
          {media.title}{' '}
          <span style={styles.year}>
            ({media.year})
          </span>
        </h1>
        <p style={styles.slug}>{media.slug}</p>
        <p style={styles.description}>{media.description}</p>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    maxWidth: '400px',
    margin: '0 auto',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  loadingContainer: {
    padding: '16px',
    textAlign: 'center',
    color: '#6b7280',
  },
  poster: {
    width: '100%',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    fontFamily: 'inherit',
    marginBottom: '8px',
  },
  year: {
    fontSize: '14px',
    fontWeight: 'normal',
    color: '#6b7280',
  },
  slug: {
    marginTop: '8px',
    fontStyle: 'italic',
    color: '#4b5563',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  description: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#1f2937',
    fontFamily: 'inherit',
    lineHeight: '1.5',
  },
};
