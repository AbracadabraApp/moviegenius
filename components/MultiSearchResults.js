// components/MultiSearchResults.js - Display categorized search results
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import MediaCard from './MediaCard';
import Image from 'next/image';

export default function MultiSearchResults({ results, query }) {
  // People search temporarily disabled - focus on movies only
  const [activeTab, setActiveTab] = useState('movies');
  const router = useRouter();

  if (!results || !results.movies?.length) {
    return null;
  }

  const movieCount = results.movies?.length || 0;
  // const peopleCount = results.people?.length || 0;

  // const handlePersonClick = (person) => {
  //   router.push(`/person/${person.tmdb_id}`);
  // };

  return (
    <div style={styles.container}>
      {/* Tab Navigation - Movies Only */}
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...styles.activeTab,
          }}
          disabled={true}
        >
          Movies ({movieCount})
        </button>
        {/* People tab temporarily disabled
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'people' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('people')}
          disabled={peopleCount === 0}
        >
          People ({peopleCount})
        </button>
        */}
      </div>

      {/* Results - Movies Only */}
      <div style={styles.resultsContainer}>
        <div style={styles.movieGrid}>
          {results.movies.map((movie) => (
            <div key={movie.id} style={styles.movieCard}>
              <MediaCard
                title={movie.title}
                year={movie.year}
                initialPoster={movie.poster_url}
                tmdbId={movie.tmdb_id}
              />
            </div>
          ))}
        </div>
        
        {/* People results temporarily disabled
        {activeTab === 'people' && peopleCount > 0 && (
          <div style={styles.peopleGrid}>
            {results.people.map((person) => (
              <div
                key={person.id}
                style={styles.personCard}
                onClick={() => handlePersonClick(person)}
              >
                <div style={styles.personImage}>
                  <Image
                    src={person.profile_url}
                    alt={`${person.name} profile`}
                    width={80}
                    height={120}
                    style={styles.profileImage}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8A0XqoC0WAk0eO0ZJZjMN8CvfaQhCEKdlOqmFCKNL5SqbTcLiWJKMpXa0Qk5WkGOyqmJN9V4ZDJ1ioqWk+RJ/BCHZTZV5FqPE="
                  />
                </div>
                <div style={styles.personInfo}>
                  <div style={styles.personName}>{person.name}</div>
                  <div style={styles.personRole}>{person.known_for}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        */}
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: '16px',
  },
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '16px',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  activeTab: {
    color: '#1f2937',
    borderBottomColor: '#3b82f6',
  },
  resultsContainer: {
    minHeight: '200px',
  },
  movieGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  movieCard: {
    marginBottom: '0',
  },
  peopleGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  personCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    gap: '12px',
  },
  personImage: {
    width: '80px',
    height: '120px',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  profileImage: {
    objectFit: 'cover',
    borderRadius: '6px',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },
  personRole: {
    fontSize: '14px',
    color: '#6b7280',
  },
};