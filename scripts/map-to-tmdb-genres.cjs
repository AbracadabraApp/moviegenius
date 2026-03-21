/**
 * Map Collections to TMDB Genre Categories
 *
 * Analyzes how many collections contain TMDB genre keywords
 * and identifies collections that don't fit TMDB's 19 categories.
 */

const { Pool } = require('pg');

async function mapToTMDBGenres() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('MAPPING COLLECTIONS TO TMDB GENRES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get all collection titles
    const query = `
      SELECT id, title
      FROM browse_lists
      WHERE status = 'active'
    `;

    const result = await pool.query(query);
    const collections = result.rows;

    console.log(`Analyzing ${collections.length.toLocaleString()} collections...\n`);

    // TMDB genre mapping with keyword patterns
    const tmdbGenres = {
      'Action': ['action'],
      'Adventure': ['adventure'],
      'Animation': ['animation', 'animated'],
      'Comedy': ['comedy', 'comedies'],
      'Crime': ['crime', 'criminal'],
      'Documentary': ['documentary', 'documentaries'],
      'Drama': ['drama', 'dramas', 'dramatic'],
      'Family': ['family'],
      'Fantasy': ['fantasy'],
      'History': ['history', 'historical'],
      'Horror': ['horror'],
      'Music': ['music', 'musical', 'musicals'],
      'Mystery': ['mystery', 'mysteries'],
      'Romance': ['romance', 'romantic'],
      'Science Fiction': ['sci-fi', 'scifi', 'science fiction', 'space'],
      'Thriller': ['thriller', 'thrillers'],
      'TV Movie': ['tv movie', 'television movie'],
      'War': ['war', 'wartime'],
      'Western': ['western', 'westerns']
    };

    // Count collections per genre
    const genreCounts = {};
    const collectionGenres = new Map(); // collection id -> genres matched

    Object.keys(tmdbGenres).forEach(genre => {
      genreCounts[genre] = 0;
    });

    collections.forEach(collection => {
      const title = collection.title.toLowerCase();
      const matched = [];

      Object.entries(tmdbGenres).forEach(([genre, keywords]) => {
        if (keywords.some(keyword => title.includes(keyword))) {
          genreCounts[genre]++;
          matched.push(genre);
        }
      });

      collectionGenres.set(collection.id, matched);
    });

    // Sort by count
    const sorted = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1]);

    console.log('TMDB Genre Mapping Results:\n');
    console.log('Rank | TMDB Genre        | Collections | % of Total');
    console.log('-----|-------------------|-------------|------------');

    sorted.forEach((entry, i) => {
      const [genre, count] = entry;
      const rank = String(i + 1).padStart(3, ' ');
      const genreStr = genre.padEnd(17, ' ');
      const countStr = String(count).padStart(5, ' ');
      const pct = ((count / collections.length) * 100).toFixed(1);
      console.log(`${rank}  | ${genreStr} |   ${countStr}   |   ${String(pct).padStart(5, ' ')}%`);
    });

    // Find collections that don't match any TMDB genre
    const unmapped = collections.filter(c => collectionGenres.get(c.id).length === 0);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('UNMAPPED COLLECTIONS (not matching any TMDB genre)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Total unmapped: ${unmapped.length.toLocaleString()} (${((unmapped.length / collections.length) * 100).toFixed(1)}%)\n`);

    console.log('Sample of 20 unmapped collections:\n');
    unmapped.slice(0, 20).forEach((c, i) => {
      console.log(`${i + 1}. "${c.title}"`);
    });

    // Analyze common words in unmapped collections
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('TOP WORDS IN UNMAPPED COLLECTIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const wordCounts = new Map();
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
      'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with'
    ]);

    unmapped.forEach(collection => {
      const words = collection.title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    const topUnmapped = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    console.log('These could be potential category labels:\n');
    topUnmapped.forEach((entry, i) => {
      const [word, count] = entry;
      console.log(`${String(i + 1).padStart(2, ' ')}. ${word.padEnd(20, ' ')} (${count} collections)`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

mapToTMDBGenres();
