/**
 * EpisodeCard Component - Episode card that looks like MediaCard
 * 
 * Specialized card for series episodes that mimics MediaCard appearance
 * but with custom text positioning: title right-aligned, poster, episode & subtitle left-aligned
 * 
 * @component
 * @example
 * <EpisodeCard 
 *   episode={episode}
 *   seriesId={2}
 *   onClick={() => router.push(`/recs/series/${seriesId}/${episode.id}`)}
 * />
 */
import React, { memo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';

function EpisodeCard({ episode, seriesId, onClick }) {
  const router = useRouter();

  const handleCardClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  // Use first poster from episode posters array, or fallback to a real movie poster
  const posterUrl = episode.posters && episode.posters.length > 0 
    ? episode.posters[0] 
    : 'https://image.tmdb.org/t/p/w200/3bhkrj58Vtu7enYsRolD1fZdja1.jpg'; // The Godfather poster as fallback

  return (
    <article
      style={styles.card}
      role="article"
      onClick={handleCardClick}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1)';
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.30)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.20)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Episode bar spanning the full card */}
      <div style={styles.episodeBar}>
        Episode {episode.id}
      </div>

      <div style={styles.mainContent}>
        <div style={styles.textContainer}>
          {/* Left-aligned title and subtitle */}
          <div style={styles.titleSection}>
            <div style={styles.title}>{episode.title}</div>
            <div style={styles.subtitle}>{episode.subtitle}</div>
          </div>
        </div>

        <div style={styles.posterContainer}>
          <Image
            src={posterUrl}
            alt={`${episode.title} poster`}
            width={100}
            height={150}
            style={styles.poster}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8A0XqoC0WAk0eO0ZJZjMN8CvfaQhCEKdlOqmFCKNL5SqbTcLiWJKMpXa0Qk5WkGOyqmJN9V4ZDJ1ioqWk+RJ/BCHZTZV5FqPE="
            sizes="100px"
          />
        </div>
      </div>
    </article>
  );
}

const styles = {
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.20)',
    padding: '0',
    backgroundColor: 'white',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    transition: 'box-shadow 0.15s ease, transform 0.1s ease',
    cursor: 'pointer',
    marginBottom: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    overflow: 'hidden',
  },
  episodeBar: {
    height: '30px',
    backgroundColor: '#4b5563',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#ffffff',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'row',
    padding: '12px',
    alignItems: 'flex-start',
  },
  posterContainer: {
    position: 'relative',
    width: '100px',
    height: '150px',
    borderRadius: '8px',
    marginLeft: '12px',
    overflow: 'hidden',
  },
  poster: {
    objectFit: 'cover',
    borderRadius: '8px',
  },
  textContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '150px',
    position: 'relative',
    minWidth: 0,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start', // Left-align the title
    paddingTop: '8px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '1.3',
    color: '#111827',
    textAlign: 'left',
    marginBottom: '6px',
  },
  episodeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start', // Left-align episode info
    marginTop: 'auto', // Push to bottom
    paddingBottom: '8px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#374151',
    lineHeight: '1.4',
  },
};

/**
 * Custom prop comparison for EpisodeCard memoization
 */
const arePropsEqual = (prevProps, nextProps) => {
  return prevProps.seriesId === nextProps.seriesId &&
         prevProps.episode?.id === nextProps.episode?.id &&
         prevProps.episode?.title === nextProps.episode?.title &&
         prevProps.episode?.subtitle === nextProps.episode?.subtitle &&
         JSON.stringify(prevProps.episode?.posters) === JSON.stringify(nextProps.episode?.posters);
};

// Export memoized component
export default memo(EpisodeCard, arePropsEqual);