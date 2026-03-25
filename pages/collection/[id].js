import { useRouter } from 'next/router';
import { Pool } from 'pg';
import PhoneFrame from '../../components/PhoneFrame';
import CollectionPage from '../../components/CollectionPage';
import { ChevronLeft } from 'lucide-react';
import SimpleSearch from '../../components/SimpleSearch';

export default function Collection({ collection, movies, error }) {
  const router = useRouter();

  return (
    <PhoneFrame backgroundImage={null} showDarkOverlay={false}>
      <div style={styles.container}>
        {/* Sticky nav: back + search */}
        <div style={styles.stickyHeader}>
          <button onClick={() => router.back()} style={styles.backButton} aria-label="Go back">
            <ChevronLeft size={22} color="#111827" strokeWidth={2.5} />
          </button>
          <div style={styles.searchWrapper}>
            <SimpleSearch placeholder="Search movies..." compact={true} />
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {error && (
            <div style={styles.errorContainer}>
              <div style={styles.errorIcon}>📚</div>
              <div style={styles.errorText}>{error}</div>
            </div>
          )}

          {!error && collection && (
            <CollectionPage collection={collection} movies={movies} />
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

export async function getStaticPaths() {
  // Pre-generate top 500 collections by movie count — rest served via blocking fallback
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT bl.id
        FROM browse_lists bl,
             jsonb_array_elements(bl.editorial_data->'subcategories') sub,
             jsonb_array_elements(sub->'movies') mv
        WHERE bl.status = 'active'
          AND bl.editorial_data IS NOT NULL
          AND (mv->>'tmdb_id') IS NOT NULL
          AND (mv->>'tmdb_id') != 'null'
        GROUP BY bl.id
        ORDER BY COUNT(*) DESC
        LIMIT 500
      `);
      const paths = result.rows.map(row => ({ params: { id: row.id.toString() } }));
      return { paths, fallback: 'blocking' };
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('getStaticPaths error for collections:', error);
    return { paths: [], fallback: 'blocking' };
  }
}

export async function getStaticProps({ params }) {
  const { id } = params;

  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      const collectionResult = await client.query(
        `SELECT id, revised_title, editorial_data
         FROM browse_lists
         WHERE id = $1 AND editorial_data IS NOT NULL`,
        [id]
      );

      if (collectionResult.rows.length === 0) {
        return { notFound: true };
      }

      const row = collectionResult.rows[0];
      const editorial = row.editorial_data;

      // Extract all tmdb_ids from subcategories
      const tmdbIds = [];
      for (const sub of (editorial.subcategories || [])) {
        for (const m of (sub.movies || [])) {
          if (m.tmdb_id) tmdbIds.push(m.tmdb_id);
        }
      }

      const moviesResult = tmdbIds.length > 0
        ? await client.query(
            `SELECT tmdb_id, title, year, poster_url FROM movies WHERE tmdb_id = ANY($1)`,
            [tmdbIds]
          )
        : { rows: [] };

      const collection = {
        id: row.id,
        title: row.revised_title,
        ...editorial,
      };

      return {
        props: {
          collection,
          movies: moviesResult.rows,
          error: null,
        },
        revalidate: 86400, // 24 hours
      };
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('getStaticProps error for collection:', id, error);
    return {
      props: { collection: null, movies: [], error: 'Failed to load collection' },
      revalidate: 60,
    };
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#ffffff',
    position: 'relative',
  },

  stickyHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '10px 16px 10px 10px',
  },

  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    flexShrink: 0,
  },

  searchWrapper: {
    flex: 1,
  },

  content: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },

  errorContainer: {
    textAlign: 'center',
    padding: '80px 20px',
  },

  errorIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },

  errorText: {
    fontSize: '16px',
    color: '#7A7870',
  },
};
