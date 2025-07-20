#!/usr/bin/env node
/**
 * Complete Link Processing Test
 * Combines local movie data + TMDB lookup
 */

import fs from 'fs';

// Mock TMDB lookup results (based on our earlier test)
const TMDB_RESULTS = new Map([
  ['reservoir dogs (1992)', { tmdbId: 500, title: 'Reservoir Dogs' }],
  ['sexy beast (2000)', { tmdbId: 11826, title: 'Sexy Beast' }],
  ['gangster no. 1 (2000)', { tmdbId: 10394, title: 'Gangster No. 1' }],
  ['mean machine (2001)', { tmdbId: 9991, title: 'Mean Machine' }],
  ['pusher (1996)', { tmdbId: 2061, title: 'Pusher' }],
  ['swordfish (2001)', { tmdbId: 9705, title: 'Swordfish' }],
  ['the big short (2015)', { tmdbId: 318846, title: 'The Big Short' }],
  ['shaun of the dead (2004)', { tmdbId: 747, title: 'Shaun of the Dead' }],
  ['hot fuzz (2007)', { tmdbId: 4638, title: 'Hot Fuzz' }],
]);

// Process **Movie Title** to links using both local and TMDB data
function processMovieLinks(text, localMovies, currentMovie) {
  return text.replace(/\*\*([^*]+)\*\* \((\d{4})\)/g, (match, title, year) => {
    // Handle self-references - strip ** marks but don't link
    if (title.toLowerCase() === currentMovie.toLowerCase()) {
      return `${title} (${year})`; // Remove ** marks
    }

    const key = `${title.toLowerCase()} (${year})`;

    // First try local movie data
    let movieData = localMovies.get(key);

    // If not found locally, try TMDB
    if (!movieData) {
      movieData = TMDB_RESULTS.get(key);
    }

    if (movieData) {
      // Create link with movie-title class
      return `<a href="/movie/${movieData.tmdbId}" class="movie-title">${title}</a> (${year})`;
    } else {
      // Strip ** marks for unknown movies
      return `${title} (${year})`;
    }
  });
}

function testCompleteLinking() {
  console.log('🎯 Complete Link Processing Test');
  console.log('================================\n');

  // Read test file
  const data = JSON.parse(fs.readFileSync('nuclear-static/100.json', 'utf8'));

  // Build local movies map from featured sections
  const localMovies = new Map();
  data.props.sections.forEach(section => {
    if (section.type === 'movies' && section.movies) {
      section.movies.forEach(movie => {
        const key = `${movie.title.toLowerCase()} (${movie.year})`;
        localMovies.set(key, { tmdbId: movie.tmdb_id, title: movie.title });
      });
    }
  });

  console.log(`🏠 Local movies available: ${localMovies.size}`);
  console.log(`🌐 TMDB lookup available: ${TMDB_RESULTS.size}`);
  console.log(`📊 Total coverage: ${localMovies.size + TMDB_RESULTS.size} movies\n`);

  console.log('📝 Processing Results:');
  console.log('---------------------');

  let totalLinks = 0;
  let totalStripped = 0;
  let totalSelfRefs = 0;

  // Process each text section
  data.props.sections.forEach((section, index) => {
    if (section.type === 'text') {
      const originalMovies = section.content.match(/\*\*([^*]+)\*\* \(\d{4}\)/g) || [];
      const processed = processMovieLinks(section.content, localMovies, data.props.title);

      const links = (processed.match(/<a href="\/movie\/\d+"/g) || []).length;
      const remaining = (processed.match(/\*\*[^*]+\*\*/g) || []).length;
      const stripped = originalMovies.length - links - remaining;

      totalLinks += links;
      totalStripped += stripped;
      totalSelfRefs += remaining;

      if (originalMovies.length > 0) {
        console.log(`\nSection ${index + 1}: ${originalMovies.length} patterns found`);
        originalMovies.forEach(movie => {
          const titleMatch = movie.match(/\*\*([^*]+)\*\*/);
          const title = titleMatch ? titleMatch[1] : '';

          if (title.toLowerCase() === data.props.title.toLowerCase()) {
            console.log(`  📝 ${movie} → STRIPPED (self-reference)`);
          } else if (processed.includes(`<a href=`)) {
            const key = movie.toLowerCase().replace(/\*\*/g, '');
            if (localMovies.has(key)) {
              console.log(`  🏠 ${movie} → LINKED (local)`);
            } else if (TMDB_RESULTS.has(key)) {
              console.log(`  🌐 ${movie} → LINKED (TMDB)`);
            }
          } else {
            console.log(`  📝 ${movie} → STRIPPED (not found)`);
          }
        });

        // Show sample of processed text
        console.log(`\n📄 Sample processed text:`);
        console.log(processed.substring(0, 200) + '...\n');
      }
    }
  });

  console.log('📊 Final Summary:');
  console.log('================');
  console.log(`🔗 Links created: ${totalLinks}`);
  console.log(`📝 ** marks stripped: ${totalStripped + totalSelfRefs}`);
  console.log(`📌 Self-references cleaned: ${totalSelfRefs}`);
  console.log(`✅ Total processed successfully: ${totalLinks + totalStripped + totalSelfRefs}`);

  // Save processed version
  const processedData = {
    ...data,
    props: {
      ...data.props,
      sections: data.props.sections.map(section => {
        if (section.type === 'text') {
          return {
            ...section,
            content: processMovieLinks(section.content, localMovies, data.props.title),
          };
        }
        return section;
      }),
    },
  };

  fs.writeFileSync('test-complete-processed.json', JSON.stringify(processedData, null, 2));
  console.log('\n💾 Processed file saved as: test-complete-processed.json');
}

testCompleteLinking();
