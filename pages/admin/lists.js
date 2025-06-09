// pages/admin/lists.js - Definitive Lists Management
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';

// Import definitive lists data
import afi100Data from '../../data/afi100.json';

export default function ListsManagementPage() {
  const router = useRouter();
  const [selectedList, setSelectedList] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState('');
  const [existingLists, setExistingLists] = useState([]);

  // Define all definitive lists we want to create
  const definitiveListsData = {
    'afi-100-greatest-american-films': {
      name: 'AFI 100 Greatest American Films',
      description: 'The American Film Institute\'s definitive ranking of the greatest American movies',
      content_type: 'declarative',
      movies: afi100Data
    },
    'sight-sound-greatest-films': {
      name: 'Sight & Sound Greatest Films of All Time',
      description: 'The critics\' poll from the British Film Institute\'s prestigious magazine',
      content_type: 'declarative',
      movies: [
        { title: "Citizen Kane", year: 1941, tmdbId: 15, slug: "A newspaper magnate's rise and fall." },
        { title: "Vertigo", year: 1958, tmdbId: 832, slug: "A detective's obsession with a mysterious woman." },
        { title: "The Rules of the Game", year: 1939, tmdbId: 14429, slug: "French aristocrats' weekend hunting party." },
        { title: "Tokyo Story", year: 1953, tmdbId: 18148, slug: "Elderly parents visit their adult children." },
        { title: "2001: A Space Odyssey", year: 1968, tmdbId: 62, slug: "Humanity's journey from apes to starchild." }
      ]
    },
    'criterion-collection-essentials': {
      name: 'Criterion Collection Essentials',
      description: 'Essential films from the prestigious Criterion Collection',
      content_type: 'declarative',
      movies: [
        { title: "Seven Samurai", year: 1954, tmdbId: 346, slug: "Samurai defend a village from bandits." },
        { title: "8½", year: 1963, tmdbId: 15, slug: "A director's creative and personal crisis." },
        { title: "Persona", year: 1966, tmdbId: 14579, slug: "An actress goes silent, her nurse speaks." },
        { title: "The 400 Blows", year: 1959, tmdbId: 12477, slug: "A troubled boy's coming of age in Paris." },
        { title: "Bicycle Thieves", year: 1948, tmdbId: 14535, slug: "A man searches Rome for his stolen bicycle." }
      ]
    },
    'best-picture-winners-2000s': {
      name: 'Best Picture Winners (2000-2020)',
      description: 'Academy Award Best Picture winners from the 21st century',
      content_type: 'declarative',
      movies: [
        { title: "Parasite", year: 2019, tmdbId: 496243, slug: "A poor family infiltrates a wealthy household." },
        { title: "Green Book", year: 2018, tmdbId: 490132, slug: "A pianist's tour through the segregated South." },
        { title: "The Shape of Water", year: 2017, tmdbId: 399055, slug: "A mute woman falls for an amphibian creature." },
        { title: "Moonlight", year: 2016, tmdbId: 376867, slug: "A young man's journey of self-discovery." },
        { title: "Spotlight", year: 2015, tmdbId: 359940, slug: "Journalists uncover Catholic Church scandal." }
      ]
    },
    'film-noir-classics': {
      name: 'Film Noir Classics',
      description: 'Essential films from the golden age of noir cinema',
      content_type: 'declarative',
      movies: [
        { title: "The Maltese Falcon", year: 1941, tmdbId: 891, slug: "A detective hunts for a valuable bird statue." },
        { title: "Double Indemnity", year: 1944, tmdbId: 18, slug: "An insurance salesman plans the perfect murder." },
        { title: "The Big Sleep", year: 1946, tmdbId: 1398, slug: "A private eye investigates a blackmail case." },
        { title: "Touch of Evil", year: 1958, tmdbId: 754, slug: "A cop investigates a bombing on the border." },
        { title: "The Third Man", year: 1949, tmdbId: 1104, slug: "A writer searches for his friend in post-war Vienna." }
      ]
    },
    'foreign-language-masterpieces': {
      name: 'Foreign Language Masterpieces',
      description: 'Essential non-English language films that changed cinema',
      content_type: 'declarative',
      movies: [
        { title: "Amélie", year: 2001, tmdbId: 194, slug: "A whimsical waitress changes lives in Montmartre." },
        { title: "Cinema Paradiso", year: 1988, tmdbId: 11216, slug: "A filmmaker remembers his childhood projectionist." },
        { title: "Akira", year: 1988, tmdbId: 149, slug: "Psychic powers awaken in post-apocalyptic Tokyo." },
        { title: "Spirited Away", year: 2001, tmdbId: 129, slug: "A girl enters a world of spirits and magic." },
        { title: "Bicycle Thieves", year: 1948, tmdbId: 14535, slug: "A man searches Rome for his stolen bicycle." }
      ]
    }
  };

  // Fetch existing lists on load
  useEffect(() => {
    fetchExistingLists();
  }, []);

  const fetchExistingLists = async () => {
    try {
      const response = await fetch('/api/tag-cloud?content_type=declarative');
      const data = await response.json();
      setExistingLists(data.lists || []);
    } catch (error) {
      console.error('Error fetching existing lists:', error);
    }
  };

  const createListInDatabase = async (listKey, listData) => {
    setIsCreating(true);
    setCreateStatus(`Creating "${listData.name}"...`);

    try {
      // Step 1: Create the list metadata
      const listResponse = await fetch('/api/movie-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: listData.name,
          slug: listKey,
          description: listData.description,
          content_type: listData.content_type,
          is_active: true
        })
      });

      if (!listResponse.ok) {
        throw new Error(`Failed to create list: ${listResponse.status}`);
      }

      const { listId } = await listResponse.json();
      setCreateStatus(`Created list. Adding ${listData.movies.length} movies...`);

      // Step 2: Add movies to the list
      const moviesResponse = await fetch('/api/upload-list-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: listId,
          movies: listData.movies
        })
      });

      if (!moviesResponse.ok) {
        throw new Error(`Failed to add movies: ${moviesResponse.status}`);
      }

      const result = await moviesResponse.json();
      setCreateStatus(`✅ Successfully created "${listData.name}" with ${result.addedMovies?.length || 0} movies!`);

      // Refresh the existing lists
      setTimeout(() => {
        fetchExistingLists();
        setCreateStatus('');
      }, 2000);

    } catch (error) {
      console.error('Error creating list:', error);
      setCreateStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateList = (listKey) => {
    const listData = definitiveListsData[listKey];
    createListInDatabase(listKey, listData);
  };

  const handleCreateAllLists = async () => {
    setIsCreating(true);
    const listKeys = Object.keys(definitiveListsData);
    
    for (let i = 0; i < listKeys.length; i++) {
      const listKey = listKeys[i];
      const listData = definitiveListsData[listKey];
      
      setCreateStatus(`Creating ${i + 1}/${listKeys.length}: "${listData.name}"...`);
      
      try {
        await createListInDatabase(listKey, listData);
        // Small delay between creations
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to create ${listKey}:`, error);
      }
    }
    
    setCreateStatus('✅ All lists created successfully!');
    setIsCreating(false);
  };

  return (
    <PhoneFrame active="">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => router.push('/')}>
            ← Back
          </button>
          <h1 style={styles.title}>Definitive Lists Manager</h1>
        </div>

        {/* Status */}
        {createStatus && (
          <div style={styles.statusBar}>
            {createStatus}
          </div>
        )}

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <button 
            style={styles.createAllButton}
            onClick={handleCreateAllLists}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create All Lists'}
          </button>
        </div>

        <div style={styles.scrollableContent}>
          {/* Existing Lists */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Existing Lists ({existingLists.length})</h2>
            {existingLists.length > 0 ? (
              <div style={styles.existingListsGrid}>
                {existingLists.map((list) => (
                  <div key={list.id} style={styles.existingListCard}>
                    <strong>{list.name}</strong>
                    <div style={styles.listMeta}>
                      ID: {list.id} | Type: {list.content_type}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>No lists found in database</div>
            )}
          </div>

          {/* Available Lists to Create */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Available Lists to Create</h2>
            <div style={styles.listsGrid}>
              {Object.entries(definitiveListsData).map(([listKey, listData]) => (
                <div key={listKey} style={styles.listCard}>
                  <div style={styles.listHeader}>
                    <h3 style={styles.listName}>{listData.name}</h3>
                    <span style={styles.movieCount}>{listData.movies.length} movies</span>
                  </div>
                  
                  <p style={styles.listDescription}>{listData.description}</p>
                  
                  {/* Sample Movies Preview */}
                  <div style={styles.moviesPreview}>
                    <strong>Sample movies:</strong>
                    <div style={styles.moviesList}>
                      {listData.movies.slice(0, 3).map((movie, index) => (
                        <div key={index} style={styles.movieItem}>
                          <span style={styles.movieTitle}>{movie.title}</span>
                          <span style={styles.movieYear}>({movie.year})</span>
                          <span style={styles.tmdbId}>TMDB: {movie.tmdbId}</span>
                        </div>
                      ))}
                      {listData.movies.length > 3 && (
                        <div style={styles.moreMovies}>
                          +{listData.movies.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    style={styles.createButton}
                    onClick={() => handleCreateList(listKey)}
                    disabled={isCreating}
                  >
                    Create List
                  </button>
                </div>
              ))}
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    color: '#007AFF',
    cursor: 'pointer',
    marginRight: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  statusBar: {
    padding: '12px 16px',
    backgroundColor: '#f0f9ff',
    borderBottom: '1px solid #e0e7ff',
    fontSize: '14px',
    color: '#1e40af',
    textAlign: 'center',
  },
  quickActions: {
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  createAllButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    padding: '16px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  existingListsGrid: {
    display: 'grid',
    gap: '8px',
  },
  existingListCard: {
    padding: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    fontSize: '14px',
  },
  listMeta: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  listsGrid: {
    display: 'grid',
    gap: '16px',
  },
  listCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  listName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    flex: 1,
  },
  movieCount: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '12px',
    marginLeft: '8px',
  },
  listDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
    marginBottom: '12px',
  },
  moviesPreview: {
    marginBottom: '16px',
  },
  moviesList: {
    marginTop: '8px',
  },
  movieItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    marginBottom: '4px',
  },
  movieTitle: {
    fontWeight: '500',
    color: '#111827',
  },
  movieYear: {
    color: '#6b7280',
  },
  tmdbId: {
    color: '#059669',
    fontSize: '11px',
  },
  moreMovies: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: '4px',
  },
  createButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};