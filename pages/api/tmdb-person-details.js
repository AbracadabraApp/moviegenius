// pages/api/tmdb-person-details.js
/**
 * TMDB Person Details API Route
 * 
 * Fetches complete person details from TMDB API using TMDB person ID.
 * Gets full biography, birth/death info, place of birth, etc.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { tmdbId } = req.body;

  if (!tmdbId) {
    return res.status(400).json({ error: 'TMDB person ID is required' });
  }

  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/person/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`
    );
    
    if (!tmdbResponse.ok) {
      throw new Error('TMDB API request failed');
    }

    const person = await tmdbResponse.json();
    
    if (person) {
      const profileUrl = person.profile_path ? 
        `https://image.tmdb.org/t/p/w500${person.profile_path}` : 
        '/images/placeholder-profile.jpg';
      
      // Parse birth/death years from full dates
      const birthYear = person.birthday ? parseInt(person.birthday.split('-')[0]) : null;
      const deathYear = person.deathday ? parseInt(person.deathday.split('-')[0]) : null;
      
      res.status(200).json({ 
        tmdb_id: person.id,
        name: person.name,
        birthday: person.birthday,
        deathday: person.deathday,
        birth_year: birthYear,
        death_year: deathYear,
        place_of_birth: person.place_of_birth,
        biography: person.biography,
        profile: profileUrl,
        known_for_department: person.known_for_department,
        popularity: person.popularity,
        gender: person.gender,
        adult: person.adult,
        homepage: person.homepage,
        also_known_as: person.also_known_as || [],
        imdb_id: person.imdb_id
      });
    } else {
      res.status(404).json({ 
        error: 'Person not found',
        tmdb_id: tmdbId
      });
    }

  } catch (error) {
    console.error('Error fetching TMDB person details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch person details',
      tmdb_id: tmdbId
    });
  }
}