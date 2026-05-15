/**
 * Check TMDB for Missing Hitchcock Films
 *
 * Test script to find the 14 missing Hitchcock films on TMDB
 */

const missingFilms = [
  { title: 'The Mountain Eagle', year: 1926 },
  { title: 'Downhill', year: 1927 },
  { title: 'Easy Virtue', year: 1928 },
  { title: 'The Farmer\'s Wife', year: 1928 },
  { title: 'Champagne', year: 1928 },
  { title: 'The Manxman', year: 1929 },
  { title: 'The Skin Game', year: 1931 },
  { title: 'Rich and Strange', year: 1931 },
  { title: 'Waltzes from Vienna', year: 1934 },
  { title: 'Foreign Correspondent', year: 1940 },
  { title: 'Mr. & Mrs. Smith', year: 1941 },
  { title: 'Shadow of a Doubt', year: 1943 },
  { title: 'The Wrong Man', year: 1956 },
  { title: 'The Man Who Knew Too Much', year: 1956 } // remake
];

async function checkTMDB() {
  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

  if (!TMDB_API_KEY) {
    console.error('Error: NEXT_PUBLIC_TMDB_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('Checking TMDB for missing Hitchcock films...\n');

  for (const film of missingFilms) {
    try {
      const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(film.title)}&year=${film.year}`;

      const response = await fetch(searchUrl);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const match = data.results[0];
        console.log(`✓ ${film.title} (${film.year})`);
        console.log(`  TMDB ID: ${match.id}`);
        console.log(`  Title: ${match.title}`);
        console.log(`  Release: ${match.release_date}`);
        console.log(`  Poster: ${match.poster_path ? 'Yes' : 'No'}`);
        console.log('');
      } else {
        console.log(`✗ ${film.title} (${film.year}) - NOT FOUND`);
        console.log('');
      }

      // Rate limit: 40 requests per 10 seconds
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (err) {
      console.error(`Error checking ${film.title}:`, err.message);
    }
  }
}

checkTMDB().catch(console.error);
