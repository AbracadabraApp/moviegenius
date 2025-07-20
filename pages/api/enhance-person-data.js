// pages/api/enhance-person-data.js
/**
 * Person Data Enhancement API Route
 *
 * Enhances person data with biography using TMDB API.
 * Similar to enhance-movie-data but for people.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { name, birthYear, needsBiography, needsProfile } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Person name is required' });
  }

  try {
    let biography = null;
    let profile = null;

    // Fetch biography from TMDB if needed
    if (needsBiography) {
      const tmdbResponse = await fetch('/api/tmdb-person-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, birthYear }),
      });

      if (tmdbResponse.ok) {
        const tmdbData = await tmdbResponse.json();
        biography = tmdbData.biography;
      }
    }

    // Fetch profile from TMDB if needed
    if (needsProfile) {
      const tmdbResponse = await fetch('/api/tmdb-person-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, birthYear }),
      });

      if (tmdbResponse.ok) {
        const tmdbData = await tmdbResponse.json();
        profile = tmdbData.profile;
      }
    }

    res.status(200).json({
      biography: biography || `Notable ${needsBiography ? 'filmmaker' : 'person'} in cinema`,
      profile: profile || '/images/placeholder-profile.jpg',
    });
  } catch (error) {
    console.error('Error enhancing person data:', error);
    res.status(500).json({
      error: 'Failed to enhance person data',
      biography: `Notable ${needsBiography ? 'filmmaker' : 'person'} in cinema`,
      profile: '/images/placeholder-profile.jpg',
    });
  }
}
