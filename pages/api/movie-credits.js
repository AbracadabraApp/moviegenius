// pages/api/movie-credits.js
/**
 * TMDB Movie Credits API Route
 * 
 * Fetches cast and crew information for a movie from TMDB API using TMDB movie ID.
 * Returns organized cast and crew data with hierarchy for key people.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { tmdbId } = req.body;

  if (!tmdbId) {
    return res.status(400).json({ error: 'TMDB movie ID is required' });
  }

  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${process.env.TMDB_API_KEY}`
    );
    
    if (!tmdbResponse.ok) {
      throw new Error('TMDB API request failed');
    }

    const credits = await tmdbResponse.json();
    
    // Process cast data
    const allCast = credits.cast?.map(person => ({
      id: person.id,
      name: person.name,
      character: person.character,
      profile_path: person.profile_path ? 
        `https://image.tmdb.org/t/p/w500${person.profile_path}` : 
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjkwIiByPSIzNSIgZmlsbD0iI0Q5RDE5OSIvPgo8ZWxsaXBzZSBjeD0iMTAwIiBjeT0iMjEwIiByeD0iNzAiIHJ5PSI0NSIgZmlsbD0iI0Q5RDE5OSIvPgo8L3N2Zz4K',
      order: person.order,
      gender: person.gender,
      known_for_department: 'Actor'
    })) || [];

    // Sort cast by order (handle order: 0 properly)
    allCast.sort((a, b) => {
      const orderA = (a.order !== null && a.order !== undefined) ? a.order : 999;
      const orderB = (b.order !== null && b.order !== undefined) ? b.order : 999;
      return orderA - orderB;
    });

    // Top cast (first 8 people)
    const topCast = allCast.slice(0, 8);

    // Process crew data
    const directors = [];
    const producers = [];
    const writers = [];
    const keyCrews = [];
    const otherCrew = {};

    credits.crew?.forEach(person => {
      const crewMember = {
        id: person.id,
        name: person.name,
        job: person.job,
        department: person.department,
        profile_path: person.profile_path ? 
          `https://image.tmdb.org/t/p/w500${person.profile_path}` : 
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjkwIiByPSIzNSIgZmlsbD0iI0Q5RDE5OSIvPgo8ZWxsaXBzZSBjeD0iMTAwIiBjeT0iMjEwIiByeD0iNzAiIHJ5PSI0NSIgZmlsbD0iI0Q5RDE5OSIvPgo8L3N2Zz4K',
        gender: person.gender,
        known_for_department: person.known_for_department || person.department
      };

      // Categorize key crew members
      if (person.job === 'Director') {
        directors.push(crewMember);
      } else if (person.job?.includes('Producer')) {
        producers.push(crewMember);
      } else if (person.job?.includes('Writer') || person.job?.includes('Screenplay') || person.job === 'Story') {
        writers.push(crewMember);
      } else if (['Director of Photography', 'Original Music Composer', 'Music', 'Editor', 'Production Designer'].includes(person.job)) {
        keyCrews.push(crewMember);
      } else {
        // Group other crew by department
        const dept = person.department || 'Other';
        if (!otherCrew[dept]) {
          otherCrew[dept] = [];
        }
        otherCrew[dept].push(crewMember);
      }
    });

    // Sort key crew members
    producers.sort((a, b) => {
      // Prioritize "Producer" over "Executive Producer"
      if (a.job === 'Producer' && b.job !== 'Producer') return -1;
      if (b.job === 'Producer' && a.job !== 'Producer') return 1;
      return a.name.localeCompare(b.name);
    });

    writers.sort((a, b) => a.name.localeCompare(b.name));
    keyCrews.sort((a, b) => a.name.localeCompare(b.name));

    // Sort other crew departments
    const sortedOtherCrew = Object.keys(otherCrew)
      .sort()
      .reduce((sorted, dept) => {
        sorted[dept] = otherCrew[dept].sort((a, b) => a.name.localeCompare(b.name));
        return sorted;
      }, {});

    // Cache movie credits for 7 days - cast/crew data rarely changes
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=1209600');
    res.status(200).json({ 
      topCast,
      allCast,
      directors,
      producers: producers.slice(0, 4), // Limit to top 4 producers
      writers: writers.slice(0, 3), // Limit to top 3 writers
      keyCrews,
      otherCrew: sortedOtherCrew,
      totals: {
        cast: allCast.length,
        crew: credits.crew?.length || 0
      }
    });

  } catch (error) {
    console.error('Error fetching movie credits:', error);
    res.status(500).json({ 
      error: 'Failed to fetch movie credits',
      tmdb_id: tmdbId
    });
  }
}