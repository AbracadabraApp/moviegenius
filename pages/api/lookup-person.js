// pages/api/lookup-person.js
import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { name, birthYear } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Person name is required' });
  }

  try {
    // Initialize Supabase client
    const pool = getPool();

    // Query person from database
    let query = supabase
      .from('people')
      .select(
        'id, name, birth_year, death_year, biography, profile_url, known_for_department, tmdb_id'
      )
      .eq('name', name);

    // Add birth year filter if provided
    if (birthYear) {
      query = query.eq('birth_year', birthYear);
    }

    const { data: person, error } = await query.single();

    if (person && !error) {
      // Person found in database
      res.status(200).json(person);
    } else {
      // Person not found
      res.status(404).json({ error: 'Person not found in database' });
    }
  } catch (error) {
    console.error('Database lookup error:', error);
    res.status(500).json({ error: 'Database lookup failed' });
  }
}
