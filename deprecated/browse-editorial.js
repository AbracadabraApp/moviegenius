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

// Mock editorial data for demonstration — real generated data from DB
const MOCK_EDITORIAL_DATA = {
  'demo': {
    collection: {
      id: 'demo',
      title: 'Studying Abroad Films',
      subtitle: 'Films centered on characters who leave their home country to study, travel, or immerse themselves in a foreign culture, experiencing transformation through displacement.',
      subcategories: [
        {
          name: 'Classic European Immersion',
          description: 'American or British protagonists discover themselves while studying or living in Europe, often involving romance and cultural awakening.',
          movies: [
            { tmdb_id: 804,   title: 'Roman Holiday',             year: 1953, note: 'An American journalist abroad guides a runaway princess through Rome in a single transformative day.',                                    tags: ['romance','Italy','classic'] },
            { tmdb_id: 41503, title: 'Three Coins in the Fountain',year: 1954, note: 'Three American women working and studying in Rome each pursue love while navigating a foreign city.',                                   tags: ['romance','Italy','classic'] },
            { tmdb_id: 50363, title: 'Summertime',                 year: 1955, note: 'A lonely American secretary vacationing in Venice falls in love and discovers a deeper sense of self.',                                  tags: ['romance','Italy','classic'] },
            { tmdb_id: 18736, title: 'The Lizzie McGuire Movie',   year: 2003, note: 'A teenage girl\'s class trip to Rome becomes a transformative adventure involving mistaken identity.',                                   tags: ['teen','Italy','coming-of-age'] },
            { tmdb_id: 13320, title: 'Funny Face',                 year: 1957, note: 'A bookish American shop girl is whisked to Paris for a fashion shoot and studies existentialism while falling in love.',                 tags: ['romance','France','classic'] },
          ]
        },
        {
          name: 'Coming-of-Age Abroad',
          description: 'Young protagonists undergo significant personal growth and identity formation specifically because of their time in a foreign country.',
          movies: [
            { tmdb_id: 116745, title: 'The Secret Life of Walter Mitty', year: 2013, note: 'A daydreaming magazine worker travels the world and finally lives the adventurous life he always imagined.',                     tags: ['adventure','self-discovery','drama'] },
            { tmdb_id: 14421,  title: 'The Year My Parents Went on Vacation', year: 2006, note: 'A Brazilian boy left with strangers during the 1970 World Cup navigates displacement and cultural belonging.',              tags: ['drama','Brazil','childhood'] },
            { tmdb_id: 1786,   title: 'Au Revoir les Enfants',         year: 1987, note: 'A French boy at a Catholic boarding school befriends a Jewish student hiding in plain sight, losing his innocence.',              tags: ['war','France','drama'] },
            { tmdb_id: 18602,  title: 'Morvern Callar',                year: 2002, note: 'A young Scottish woman flees grief by traveling to Spain, reinventing herself through radical displacement.',                      tags: ['drama','Spain','identity'] },
            { tmdb_id: 1391,   title: 'Y Tu Mamá También',             year: 2001, note: 'Two Mexican teens travel across their own country with an older woman, discovering adulthood and political reality.',               tags: ['road trip','Mexico','coming-of-age'] },
          ]
        },
        {
          name: 'Romance in a Foreign Land',
          description: 'Love stories where the foreign setting is inseparable from the relationship\'s formation and the protagonist\'s emotional transformation.',
          movies: [
            { tmdb_id: 76,    title: 'Before Sunrise',         year: 1995, note: 'An American student and a French student spend one night in Vienna falling in love before parting.',                                         tags: ['romance','Austria','indie'] },
            { tmdb_id: 59436, title: 'Midnight in Paris',       year: 2011, note: 'A nostalgic American writer on a trip to Paris discovers his true artistic self through magical midnight wanderings.',                      tags: ['fantasy','France','romance'] },
            { tmdb_id: 153,   title: 'Lost in Translation',     year: 2003, note: 'Two displaced Americans in Tokyo form an intimate bond rooted entirely in their shared sense of foreign alienation.',                       tags: ['drama','Japan','romance'] },
            { tmdb_id: 5038,  title: 'Vicky Cristina Barcelona', year: 2008, note: 'Two American women spending a summer in Barcelona are romantically and philosophically transformed by Spanish culture.',                   tags: ['romance','Spain','drama'] },
            { tmdb_id: 10934, title: 'Under the Tuscan Sun',    year: 2003, note: 'A recently divorced American woman impulsively buys a villa in Tuscany and rebuilds her life through immersion.',                          tags: ['romance','Italy','drama'] },
            { tmdb_id: 1555,  title: 'L\'Auberge Espagnole',    year: 2002, note: 'A French economics student studies in Barcelona and shares an apartment with students from across Europe in a defining year.',             tags: ['comedy-drama','Spain','student life'] },
          ]
        },
        {
          name: 'Culture Shock and Identity Crisis',
          description: 'Films where the protagonist\'s foreignness creates profound disorientation, forcing a confrontation with identity, belonging, and home.',
          movies: [
            { tmdb_id: 24016, title: 'The Sheltering Sky',  year: 1990, note: 'Three Americans travel deep into the Sahara and are psychologically and physically destroyed by radical displacement.',                        tags: ['drama','Africa','existential'] },
            { tmdb_id: 1591,  title: 'Nowhere in Africa',   year: 2001, note: 'A German Jewish family flees to Kenya before WWII and struggles between assimilation and cultural preservation.',                              tags: ['drama','Africa','identity'] },
            { tmdb_id: 16727, title: 'The Namesake',        year: 2006, note: 'An Indian family immigrates to America and their son struggles between two cultural identities across a lifetime.',                            tags: ['drama','USA','immigration'] },
            { tmdb_id: 552,   title: 'Bread and Tulips',    year: 2000, note: 'An overlooked Italian housewife accidentally left behind on a tour bus reinvents herself alone in Venice.',                                    tags: ['comedy-drama','Italy','identity'] },
          ]
        },
        {
          name: 'Academic and Student Life Abroad',
          description: 'Films that explicitly center on characters enrolled in foreign universities or exchange programs, capturing student culture across borders.',
          movies: [
            { tmdb_id: 1555,  title: 'L\'Auberge Espagnole', year: 2002, note: 'The definitive study-abroad film, following a French Erasmus student navigating a multicultural Barcelona apartment.',                      tags: ['comedy-drama','Spain','student life'] },
            { tmdb_id: 1826,  title: 'Russian Dolls',         year: 2005, note: 'The sequel follows the same student five years later, still wandering Europe and struggling to find adult purpose.',                        tags: ['comedy-drama','Europe','student life'] },
            { tmdb_id: 206408,title: 'Chinese Puzzle',        year: 2013, note: 'The trilogy concludes with the protagonist moving to New York, reflecting on years of cross-cultural dislocation.',                         tags: ['comedy-drama','USA','expat'] },
            { tmdb_id: 12245, title: 'The Oxford Murders',    year: 2008, note: 'An Argentine PhD student at Oxford becomes entangled in a murder mystery rooted in the university\'s elite academic world.',                tags: ['thriller','UK','academic'] },
            { tmdb_id: 24684, title: 'An Education',          year: 2009, note: 'A brilliant British schoolgirl is seduced away from Oxford ambitions by a worldly older man who offers a shortcut to sophistication.',      tags: ['drama','UK','coming-of-age'] },
          ]
        },
      ]
    },
    movie_ids: [804, 41503, 50363, 18736, 13320, 116745, 14421, 1786, 18602, 1391, 76, 59436, 153, 5038, 10934, 1555, 24016, 1591, 16727, 552, 1826, 206408, 12245, 24684]
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
    const collectionResult = await pool.query(
      `SELECT id, revised_title, editorial_data
       FROM browse_lists
       WHERE id = $1 AND editorial_data IS NOT NULL`,
      [id]
    );

    if (collectionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found or editorial data not yet generated' });
    }

    const collectionRow = collectionResult.rows[0];
    const editorial = collectionRow.editorial_data;

    // Extract all tmdb_ids mentioned in editorial_data subcategories
    const tmdbIds = [];
    for (const sub of (editorial.subcategories || [])) {
      for (const m of (sub.movies || [])) {
        if (m.tmdb_id) tmdbIds.push(m.tmdb_id);
      }
    }

    // Fetch movie records for those tmdb_ids
    const moviesResult = tmdbIds.length > 0
      ? await pool.query(
          `SELECT tmdb_id, title, year, poster_url FROM movies WHERE tmdb_id = ANY($1)`,
          [tmdbIds]
        )
      : { rows: [] };

    const collection = {
      id: collectionRow.id,
      title: collectionRow.revised_title,
      ...editorial,
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
