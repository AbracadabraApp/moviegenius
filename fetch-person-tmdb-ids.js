import fs from 'fs';

const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';

// Helper to normalize names for comparison (remove diacritics, lowercase)
function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Search TMDB for a person by name
async function searchTMDBPerson(name) {
  const url = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  ❌ TMDB API error for "${name}": ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Find best match (exact or normalized match)
      const normalizedSearch = normalizeName(name);

      for (const person of data.results) {
        const normalizedResult = normalizeName(person.name);

        if (normalizedResult === normalizedSearch) {
          return person.id;
        }
      }

      // If no exact match, return first result (usually correct for famous people)
      console.log(`  ⚠️  Using fuzzy match for "${name}" → "${data.results[0].name}"`);
      return data.results[0].id;
    }

    console.error(`  ❌ No TMDB results for "${name}"`);
    return null;
  } catch (error) {
    console.error(`  ❌ Error fetching "${name}":`, error.message);
    return null;
  }
}

async function enrichPersonsList() {
  console.log('=== Fetching TMDB Person IDs ===\n');

  const inputPath = 'persons-list.json';
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  let totalProcessed = 0;
  let totalFound = 0;
  let totalMissing = 0;

  // Process each category
  for (const category of ['actors', 'actresses', 'directors']) {
    console.log(`\n📋 Processing ${category}...`);

    for (const person of data[category]) {
      if (person.tmdbId !== null) {
        console.log(`  ✓ ${person.name} (already has ID: ${person.tmdbId})`);
        totalFound++;
        continue;
      }

      console.log(`  🔍 Searching: ${person.name}`);
      const tmdbId = await searchTMDBPerson(person.name);

      if (tmdbId) {
        person.tmdbId = tmdbId;
        console.log(`  ✅ Found: ${person.name} → TMDB ID ${tmdbId}`);
        totalFound++;
      } else {
        console.log(`  ❌ Not found: ${person.name}`);
        totalMissing++;
      }

      totalProcessed++;

      // Rate limiting (40 requests per second TMDB limit)
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  // Save enriched data
  const outputPath = 'persons-list-with-ids.json';
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`\n=== Summary ===`);
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Found: ${totalFound}`);
  console.log(`Missing: ${totalMissing}`);
  console.log(`\n✅ Enriched data saved to: ${outputPath}`);

  if (totalMissing > 0) {
    console.log(`\n⚠️  ${totalMissing} person(s) not found - review manually`);
  }
}

enrichPersonsList().catch(console.error);
