/**
 * Browse Editorial API
 *
 * Returns editorial collection data with subcategories, annotations, and tags
 * Currently uses mock data - will integrate with database when editorial_data is generated
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Mock editorial data for demonstration
const MOCK_EDITORIAL_DATA = {
  'demo': {
    collection: {
      id: 'demo',
      title: 'Teen Identity Thrillers',
      eyebrow: 'Film Reference',
      subtitle: 'Movies where a young person\'s sense of self — who they are, who they\'re pretending to be, or who someone else made them — is the engine of suspense.',
      subcategories: [
        {
          name: 'The Impostor',
          description: 'Characters who systematically become someone else',
          movie_ids: [111, 640, 5503, 1422],
          movies: [
            {
              tmdb_id: 111,
              note: 'The template. A nobody systematically becomes somebody — and kills to stay him.',
              tags: ['Impostor', 'Classic'],
              year_context: '1960 / 1999'
            },
            {
              tmdb_id: 640,
              note: 'Teen con artist lives dozens of invented identities. Based on a true story.',
              tags: ['Impostor', 'True Story']
            },
            {
              tmdb_id: 5503,
              note: 'Identity shaped and shattered by class, ambition, and media narrative.',
              tags: ['Impostor', 'Biopic']
            },
            {
              tmdb_id: 1422,
              note: 'A mother insists the boy returned to her isn\'t her son. True story, devastating.',
              tags: ['True Story', 'Impostor']
            }
          ]
        },
        {
          name: 'Erased & Reprogrammed',
          description: 'Identity through the lens of memory manipulation',
          movie_ids: [38, 310131, 2667, 157336],
          movies: [
            {
              tmdb_id: 38,
              note: 'What is identity if memories can be surgically removed?',
              tags: ['Memory', 'Sci-Fi']
            },
            {
              tmdb_id: 310131,
              note: 'Boys with no memory must reconstruct who they are before they can escape.',
              tags: ['Memory', 'YA']
            },
            {
              tmdb_id: 2667,
              note: 'An entire city\'s population has its memories swapped nightly. Identity is a lie.',
              tags: ['Memory', 'Noir']
            },
            {
              tmdb_id: 157336,
              note: 'A teen discovers his entire society\'s identity has been deliberately suppressed.',
              tags: ['Memory', 'YA Dystopia']
            }
          ]
        },
        {
          name: 'Who am I, really?',
          description: 'Existential questions of self',
          movie_ids: [603, 120, 36819, 281957],
          movies: [
            {
              tmdb_id: 603,
              note: 'Everything you know about yourself and reality is a construct.',
              tags: ['Existential', 'Sci-Fi']
            },
            {
              tmdb_id: 120,
              note: 'A man\'s entire identity — friends, family, hometown — has been staged.',
              tags: ['Existential', 'Satire']
            },
            {
              tmdb_id: 36819,
              note: 'A dancer\'s controlled identity shatters as she tries to access her darker self.',
              tags: ['Psychological', 'Doppelgänger']
            },
            {
              tmdb_id: 281957,
              note: 'A family is hunted by their own doppelgängers. Identity as horror.',
              tags: ['Horror', 'Doppelgänger']
            }
          ]
        },
        {
          name: 'Teen-Centered (Core YA)',
          description: 'Coming of age through identity crisis',
          movie_ids: [2278, 10625, 177572, 454626],
          movies: [
            {
              tmdb_id: 2278,
              note: 'Teens perform cruelty as identity while their real selves leak through.',
              tags: ['Teen', 'Performance']
            },
            {
              tmdb_id: 10625,
              note: 'A homeschooled girl goes undercover and slowly becomes who she was pretending to be.',
              tags: ['Teen', 'Undercover']
            },
            {
              tmdb_id: 177572,
              note: 'Two prep school girls discover their true selves are far colder than their performed ones.',
              tags: ['Teen', 'Dark']
            },
            {
              tmdb_id: 454626,
              note: 'A grieving young woman sheds her old self entirely inside a cult\'s rituals.',
              tags: ['Cult', 'Folk Horror']
            }
          ]
        },
        {
          name: 'Online & Digital Identity',
          description: 'Self in the age of social media',
          movie_ids: [489999, 532321, 447332],
          movies: [
            {
              tmdb_id: 489999,
              note: 'A father digs through his missing daughter\'s digital life — and finds a stranger.',
              tags: ['Online', 'Teen']
            },
            {
              tmdb_id: 532321,
              note: 'A teen searches for her missing mother and finds a completely different person.',
              tags: ['Online', 'Teen']
            },
            {
              tmdb_id: 447332,
              note: 'An unstable woman constructs a life around mirroring an influencer\'s identity.',
              tags: ['Online', 'Dark Comedy']
            }
          ]
        }
      ]
    },
    movie_ids: [111, 640, 5503, 1422, 38, 310131, 2667, 157336, 603, 120, 36819, 281957, 2278, 10625, 177572, 454626, 489999, 532321, 447332]
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Collection ID is required' });
  }

  try {
    // Check for mock data first
    if (MOCK_EDITORIAL_DATA[id]) {
      const mockData = MOCK_EDITORIAL_DATA[id];

      // Fetch actual movie data from database
      const movieIds = mockData.movie_ids;
      const moviesQuery = `
        SELECT
          tmdb_id,
          title,
          year,
          poster_url
        FROM movies
        WHERE tmdb_id = ANY($1)
        ORDER BY year DESC
      `;

      const moviesResult = await pool.query(moviesQuery, [movieIds]);

      return res.status(200).json({
        collection: mockData.collection,
        movies: moviesResult.rows,
      });
    }

    // Real data path (when editorial_data exists in database)
    const collectionQuery = `
      SELECT
        id,
        title,
        description,
        categories,
        editorial_data
      FROM browse_lists
      WHERE id = $1 AND is_active = true
    `;

    const collectionResult = await pool.query(collectionQuery, [id]);

    if (collectionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const collectionRow = collectionResult.rows[0];

    // Check if editorial_data exists
    if (!collectionRow.editorial_data) {
      return res.status(404).json({
        error: 'Editorial data not available for this collection',
        suggestion: 'Try the standard collection view at /browse/' + id
      });
    }

    // Fetch movies for this collection
    const moviesQuery = `
      SELECT
        m.tmdb_id,
        m.title,
        m.year,
        m.poster_url
      FROM list_movies lm
      JOIN movies m ON lm.movie_id = m.id
      WHERE lm.list_id = $1
      ORDER BY lm.relevance_score DESC
    `;

    const moviesResult = await pool.query(moviesQuery, [id]);

    // Combine collection data with editorial metadata
    const collection = {
      id: collectionRow.id,
      title: collectionRow.title,
      ...collectionRow.editorial_data,
    };

    res.status(200).json({
      collection,
      movies: moviesResult.rows,
    });

  } catch (error) {
    console.error('Browse editorial API error:', error);
    res.status(500).json({
      error: 'Failed to fetch editorial collection',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
