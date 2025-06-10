// pages/api/tmdb-person-profile.js
/**
 * TMDB Person Profile API Route
 * 
 * Fetches person profile image from TMDB API using name and birth year.
 */

import { getCache } from '../../lib/cache.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { name, birthYear } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Person name is required' });
  }

  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    // Cache person search with Redis (7-day TTL)
    const cache = getCache();
    const tmdbData = await cache.cacheTMDBResponse(
      'search_person',
      { name, birthYear },
      async () => {
        console.log(`🔄 Cache miss - fetching TMDB person profile for: ${name}${birthYear ? ` (${birthYear})` : ''}`);
        
        const tmdbResponse = await fetch(
          `https://api.themoviedb.org/3/search/person?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(name)}`
        );
        
        if (!tmdbResponse.ok) {
          throw new Error('TMDB API request failed');
        }

        const data = await tmdbResponse.json();
        console.log(`💾 Cached TMDB person search for: ${name} - ${data.results?.length || 0} results`);
        
        return data;
      }
    );
    
    let person = tmdbData.results?.[0];
    
    // If we have birth year, try to find better match
    if (birthYear && tmdbData.results?.length > 1) {
      for (const result of tmdbData.results) {
        // Check if birth dates match (format: "1915-05-06")
        if (result.birthday) {
          const resultBirthYear = parseInt(result.birthday.split('-')[0]);
          if (resultBirthYear === birthYear) {
            person = result;
            break;
          }
        }
      }
    }
    
    if (person) {
      const profileUrl = person.profile_path ? 
        `https://image.tmdb.org/t/p/w500${person.profile_path}` : 
        '/images/placeholder-profile.jpg';
      
      res.status(200).json({ 
        profile: profileUrl,
        tmdb_id: person.id,
        biography: person.biography || null,
        known_for_department: person.known_for_department || null,
        birthday: person.birthday || null,
        deathday: person.deathday || null
      });
    } else {
      // Return placeholder if no person found
      res.status(200).json({ 
        profile: '/images/placeholder-profile.jpg',
        biography: null,
        known_for_department: null
      });
    }

  } catch (error) {
    console.error('Error fetching TMDB person profile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch person profile',
      profile: '/images/placeholder-profile.jpg', // Fallback
      biography: null,
      known_for_department: null
    });
  }
}