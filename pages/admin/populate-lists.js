// pages/admin/populate-lists.js - Populate Existing Lists with Movies
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';

// Import definitive lists data
import afi100Data from '../../data/afi100.json';

export default function PopulateListsPage() {
  const router = useRouter();
  const [existingLists, setExistingLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPopulating, setIsPopulating] = useState(false);
  const [populateStatus, setPopulateStatus] = useState('');
  const [selectedList, setSelectedList] = useState(null);

  // Predefined movie collections that can populate lists
  const movieCollections = {
    'afi-100': {
      name: 'AFI 100 Greatest American Films',
      movies: afi100Data,
      matchNames: ['afi', '100', 'american', 'greatest']
    },
    'best-picture': {
      name: 'Academy Award Best Picture Winners',
      movies: [
        { title: "Parasite", year: 2019, tmdbId: 496243, slug: "A poor family infiltrates a wealthy household." },
        { title: "Green Book", year: 2018, tmdbId: 490132, slug: "A pianist's tour through the segregated South." },
        { title: "The Shape of Water", year: 2017, tmdbId: 399055, slug: "A mute woman falls for an amphibian creature." },
        { title: "Moonlight", year: 2016, tmdbId: 376867, slug: "A young man's journey of self-discovery." },
        { title: "Spotlight", year: 2015, tmdbId: 359940, slug: "Journalists uncover Catholic Church scandal." },
        { title: "Birdman", year: 2014, tmdbId: 194662, slug: "An actor tries to revive his career on Broadway." },
        { title: "12 Years a Slave", year: 2013, tmdbId: 76203, slug: "A free black man is kidnapped and sold into slavery." },
        { title: "Argo", year: 2012, tmdbId: 68726, slug: "CIA agents pose as filmmakers to rescue hostages." }
      ],
      matchNames: ['oscar', 'academy', 'best picture', 'winner']
    },
    'film-noir': {
      name: 'Film Noir Classics',
      movies: [
        { title: "The Maltese Falcon", year: 1941, tmdbId: 891, slug: "A detective hunts for a valuable bird statue." },
        { title: "Double Indemnity", year: 1944, tmdbId: 18, slug: "An insurance salesman plans the perfect murder." },
        { title: "The Big Sleep", year: 1946, tmdbId: 1398, slug: "A private eye investigates a blackmail case." },
        { title: "Touch of Evil", year: 1958, tmdbId: 754, slug: "A cop investigates a bombing on the border." },
        { title: "The Third Man", year: 1949, tmdbId: 1104, slug: "A writer searches for his friend in post-war Vienna." },
        { title: "Sunset Boulevard", year: 1950, tmdbId: 599, slug: "An aging silent film star refuses to accept her faded glory." }
      ],
      matchNames: ['noir', 'black', 'shadow', 'detective']
    },
    'hitchcock': {
      name: 'Alfred Hitchcock Essentials',
      movies: [
        { title: "Vertigo", year: 1958, tmdbId: 832, slug: "A detective's obsession with a mysterious woman." },
        { title: "Psycho", year: 1960, tmdbId: 539, slug: "A woman checks into a motel with secrets." },
        { title: "Rear Window", year: 1954, tmdbId: 808, slug: "A photographer spies on his neighbors from his window." },
        { title: "North by Northwest", year: 1959, tmdbId: 851, slug: "A man is mistaken for a government agent." },
        { title: "The Birds", year: 1963, tmdbId: 571, slug: "Birds mysteriously attack a small coastal town." },
        { title: "Notorious", year: 1946, tmdbId: 830, slug: "A spy recruits a woman to infiltrate Nazi circles." }
      ],
      matchNames: ['hitchcock', 'alfred', 'suspense', 'thriller']
    },
    'criterion': {
      name: 'Criterion Collection Essentials',
      movies: [
        { title: "Seven Samurai", year: 1954, tmdbId: 346, slug: "Samurai defend a village from bandits." },
        { title: "8½", year: 1963, tmdbId: 15, slug: "A director's creative and personal crisis." },
        { title: "Persona", year: 1966, tmdbId: 14579, slug: "An actress goes silent, her nurse speaks." },
        { title: "The 400 Blows", year: 1959, tmdbId: 12477, slug: "A troubled boy's coming of age in Paris." },
        { title: "Bicycle Thieves", year: 1948, tmdbId: 14535, slug: "A man searches Rome for his stolen bicycle." },
        { title: "Tokyo Story", year: 1953, tmdbId: 18148, slug: "Elderly parents visit their adult children." }
      ],
      matchNames: ['criterion', 'collection', 'essential', 'arthouse']
    }
  };

  // Fetch existing lists on load
  useEffect(() => {
    fetchExistingLists();
  }, []);

  const fetchExistingLists = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tag-cloud?content_type=declarative');
      const data = await response.json();
      
      // Add movie counts to each list
      const listsWithCounts = await Promise.all(
        (data.lists || []).map(async (list) => {
          try {
            const listResponse = await fetch(`/api/movie-list?slug=${list.slug}`);
            const listData = await listResponse.json();
            return {
              ...list,
              movieCount: listData.movieCount || 0
            };
          } catch (error) {
            return { ...list, movieCount: 0 };
          }
        })
      );
      
      setExistingLists(listsWithCounts);
    } catch (error) {
      console.error('Error fetching existing lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const findBestCollectionMatch = (listName) => {
    const lowerName = listName.toLowerCase();
    
    for (const [key, collection] of Object.entries(movieCollections)) {
      if (collection.matchNames.some(term => lowerName.includes(term.toLowerCase()))) {
        return { key, collection };
      }
    }
    return null;
  };

  const populateList = async (list, collectionKey) => {
    const collection = movieCollections[collectionKey];
    if (!collection) return;

    setIsPopulating(true);
    setPopulateStatus(`Populating "${list.name}" with ${collection.movies.length} movies...`);

    try {
      const response = await fetch('/api/upload-list-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: list.id,
          movies: collection.movies
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to populate list: ${response.status}`);
      }

      const result = await response.json();
      setPopulateStatus(`✅ Successfully populated "${list.name}" with ${result.addedMovies?.length || 0} movies!`);

      // Refresh the lists
      setTimeout(() => {
        fetchExistingLists();
        setPopulateStatus('');
      }, 2000);

    } catch (error) {
      console.error('Error populating list:', error);
      setPopulateStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsPopulating(false);
    }
  };

  const populateAllMatchingLists = async () => {
    setIsPopulating(true);
    const emptyLists = existingLists.filter(list => list.movieCount === 0);
    let populated = 0;

    for (const list of emptyLists) {
      const match = findBestCollectionMatch(list.name);
      if (match) {
        setPopulateStatus(`Populating ${populated + 1}/${emptyLists.length}: "${list.name}"...`);
        try {
          await populateList(list, match.key);
          populated++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        } catch (error) {
          console.error(`Failed to populate ${list.name}:`, error);
        }
      }
    }

    setPopulateStatus(`✅ Populated ${populated} lists successfully!`);
    setIsPopulating(false);
  };

  return (
    <PhoneFrame active="">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => router.push('/')}>
            ← Back
          </button>
          <h1 style={styles.title}>Populate Lists ({existingLists.length} total)</h1>
        </div>

        {/* Status */}
        {populateStatus && (
          <div style={styles.statusBar}>
            {populateStatus}
          </div>
        )}

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <button 
            style={styles.populateAllButton}
            onClick={populateAllMatchingLists}
            disabled={isPopulating}
          >
            {isPopulating ? 'Populating...' : 'Auto-Populate All Matching Lists'}
          </button>
        </div>

        <div style={styles.scrollableContent}>
          {isLoading ? (
            <div style={styles.loading}>Loading lists...</div>
          ) : (
            <>
              {/* Summary */}
              <div style={styles.summary}>
                <div style={styles.summaryItem}>
                  <strong>{existingLists.length}</strong> total lists
                </div>
                <div style={styles.summaryItem}>
                  <strong>{existingLists.filter(l => l.movieCount > 0).length}</strong> populated
                </div>
                <div style={styles.summaryItem}>
                  <strong>{existingLists.filter(l => l.movieCount === 0).length}</strong> empty
                </div>
              </div>

              {/* Available Collections */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Available Movie Collections</h2>
                <div style={styles.collectionsGrid}>
                  {Object.entries(movieCollections).map(([key, collection]) => (
                    <div key={key} style={styles.collectionCard}>
                      <h3 style={styles.collectionName}>{collection.name}</h3>
                      <div style={styles.collectionCount}>{collection.movies.length} movies</div>
                      <div style={styles.matchTerms}>
                        Matches: {collection.matchNames.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Empty Lists */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>
                  Empty Lists ({existingLists.filter(l => l.movieCount === 0).length})
                </h2>
                <div style={styles.listsGrid}>
                  {existingLists
                    .filter(list => list.movieCount === 0)
                    .map((list) => {
                      const match = findBestCollectionMatch(list.name);
                      return (
                        <div key={list.id} style={styles.listCard}>
                          <div style={styles.listHeader}>
                            <h3 style={styles.listName}>{list.name}</h3>
                            <span style={styles.movieCount}>0 movies</span>
                          </div>
                          
                          {match ? (
                            <div style={styles.matchInfo}>
                              <div style={styles.suggestedCollection}>
                                📍 Suggested: {match.collection.name}
                              </div>
                              <button 
                                style={styles.populateButton}
                                onClick={() => populateList(list, match.key)}
                                disabled={isPopulating}
                              >
                                Populate with {match.collection.movies.length} movies
                              </button>
                            </div>
                          ) : (
                            <div style={styles.noMatch}>
                              ❓ No matching collection found
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Populated Lists */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>
                  Populated Lists ({existingLists.filter(l => l.movieCount > 0).length})
                </h2>
                <div style={styles.populatedListsGrid}>
                  {existingLists
                    .filter(list => list.movieCount > 0)
                    .map((list) => (
                      <div key={list.id} style={styles.populatedListCard}>
                        <strong>{list.name}</strong>
                        <div style={styles.listMeta}>
                          {list.movieCount} movies | ID: {list.id}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
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
  populateAllButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    padding: '16px',
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
    marginBottom: '24px',
  },
  summaryItem: {
    padding: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '14px',
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
  collectionsGrid: {
    display: 'grid',
    gap: '12px',
    marginBottom: '24px',
  },
  collectionCard: {
    padding: '12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
  },
  collectionName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#166534',
    margin: 0,
    marginBottom: '4px',
  },
  collectionCount: {
    fontSize: '12px',
    color: '#059669',
    marginBottom: '4px',
  },
  matchTerms: {
    fontSize: '11px',
    color: '#6b7280',
  },
  listsGrid: {
    display: 'grid',
    gap: '12px',
  },
  listCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  listName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    flex: 1,
  },
  movieCount: {
    fontSize: '12px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: '4px 8px',
    borderRadius: '12px',
  },
  matchInfo: {
    marginTop: '8px',
  },
  suggestedCollection: {
    fontSize: '12px',
    color: '#059669',
    marginBottom: '8px',
  },
  populateButton: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  noMatch: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  populatedListsGrid: {
    display: 'grid',
    gap: '8px',
  },
  populatedListCard: {
    padding: '12px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    fontSize: '14px',
  },
  listMeta: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
};