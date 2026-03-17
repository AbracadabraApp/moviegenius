#!/usr/bin/env node

/**
 * DEMONSTRATION: Data-Driven Browse Collections
 *
 * Shows the proposed architecture with mock data
 */

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🎬 PROTOTYPE: Data-Driven Browse Collections');
console.log('═══════════════════════════════════════════════════════════\n');

// Simulated Step 1: Theme Extraction from Analyses
console.log('📊 STEP 1: Extract Themes from Movie Analyses\n');
console.log('Processing 50 sample movie analyses...\n');

const mockMovieThemes = [
  { id: '1', title: 'Raging Bull', year: 1980, themes: ['boxing', 'self-destruction', 'toxic masculinity'] },
  { id: '2', title: 'The Fighter', year: 2010, themes: ['boxing', 'family dysfunction', 'redemption'] },
  { id: '3', title: 'Creed', year: 2015, themes: ['boxing', 'legacy', 'father figures'] },
  { id: '4', title: 'Million Dollar Baby', year: 2004, themes: ['boxing', 'mentorship', 'euthanasia'] },
  { id: '5', title: 'Rocky', year: 1976, themes: ['boxing', 'underdog story', 'love story'] },
  { id: '6', title: 'Cinderella Man', year: 2005, themes: ['boxing', 'great depression', 'family man'] },
  { id: '7', title: 'Ali', year: 2001, themes: ['boxing', 'civil rights', 'muhammad ali'] },

  { id: '8', title: 'Good Night and Good Luck', year: 2005, themes: ['journalism', 'mccarthyism', 'television broadcasting'] },
  { id: '9', title: 'All the President\'s Men', year: 1976, themes: ['journalism', 'watergate', 'investigative reporting'] },
  { id: '10', title: 'Spotlight', year: 2015, themes: ['journalism', 'catholic church scandal', 'investigative reporting'] },
  { id: '11', title: 'The Post', year: 2017, themes: ['journalism', 'pentagon papers', 'press freedom'] },
  { id: '12', title: 'Network', year: 1976, themes: ['television', 'media satire', 'corporate corruption'] },
  { id: '13', title: 'Shattered Glass', year: 2003, themes: ['journalism', 'fabrication', 'ethics'] },
  { id: '14', title: 'His Girl Friday', year: 1940, themes: ['journalism', 'screwball comedy', 'fast-paced dialogue'] },
  { id: '15', title: 'Broadcast News', year: 1987, themes: ['television', 'love triangle', 'journalism ethics'] },

  { id: '16', title: 'Groundhog Day', year: 1993, themes: ['time loop', 'existential', 'self-improvement'] },
  { id: '17', title: 'Edge of Tomorrow', year: 2014, themes: ['time loop', 'alien invasion', 'military'] },
  { id: '18', title: 'Palm Springs', year: 2020, themes: ['time loop', 'romantic comedy', 'nihilism'] },
  { id: '19', title: 'Happy Death Day', year: 2017, themes: ['time loop', 'slasher', 'mystery'] },
  { id: '20', title: 'Source Code', year: 2011, themes: ['time loop', 'terrorism', 'parallel realities'] },
  { id: '21', title: 'Russian Doll', year: 2019, themes: ['time loop', 'trauma', 'new york city'] },
  { id: '22', title: 'The Map of Tiny Perfect Things', year: 2021, themes: ['time loop', 'teen romance', 'finding meaning'] },

  { id: '23', title: 'The Insider', year: 1999, themes: ['whistleblowing', 'tobacco industry', 'corporate corruption'] },
  { id: '24', title: 'Erin Brockovich', year: 2000, themes: ['environmental', 'corporate corruption', 'working class hero'] },
  { id: '25', title: 'Silkwood', year: 1983, themes: ['whistleblowing', 'nuclear industry', 'suspicious death'] },
  { id: '26', title: 'Dark Waters', year: 2019, themes: ['environmental', 'corporate corruption', 'legal thriller'] },
  { id: '27', title: 'The China Syndrome', year: 1979, themes: ['nuclear', 'corporate corruption', 'journalism'] },
  { id: '28', title: 'A Civil Action', year: 1998, themes: ['environmental', 'corporate corruption', 'legal drama'] },
  { id: '29', title: 'North Country', year: 2005, themes: ['sexual harassment', 'corporate corruption', 'class action'] },

  { id: '30', title: 'Apocalypse Now', year: 1979, themes: ['vietnam war', 'madness', 'journey upstream'] },
  { id: '31', title: 'Platoon', year: 1986, themes: ['vietnam war', 'moral ambiguity', 'loss of innocence'] },
  { id: '32', title: 'Full Metal Jacket', year: 1987, themes: ['vietnam war', 'dehumanization', 'military training'] },
  { id: '33', title: 'The Deer Hunter', year: 1978, themes: ['vietnam war', 'ptsd', 'russian roulette'] },
  { id: '34', title: 'Born on the Fourth of July', year: 1989, themes: ['vietnam war', 'paralysis', 'anti-war activism'] },
  { id: '35', title: 'Coming Home', year: 1978, themes: ['vietnam war', 'ptsd', 'veteran care'] },
  { id: '36', title: 'Casualties of War', year: 1989, themes: ['vietnam war', 'war crimes', 'moral conscience'] },
];

console.log(`✅ Extracted themes from ${mockMovieThemes.length} movies\n`);
console.log('Sample extractions:\n');
mockMovieThemes.slice(0, 5).forEach(m => {
  console.log(`  • ${m.title} (${m.year}): ${m.themes.join(', ')}`);
});

// Step 2: Cluster by Shared Themes
console.log('\n\n📊 STEP 2: Cluster Movies by Shared Themes\n');

// Group by theme
const themeClusters = new Map();
mockMovieThemes.forEach(movie => {
  movie.themes.forEach(theme => {
    if (!themeClusters.has(theme)) {
      themeClusters.set(theme, []);
    }
    themeClusters.get(theme).push(movie);
  });
});

// Filter to ≥6 movies
const validClusters = Array.from(themeClusters.entries())
  .filter(([theme, movies]) => movies.length >= 6)
  .map(([theme, movies]) => ({ theme, movies: movies.length, movieList: movies }))
  .sort((a, b) => b.movies - a.movies);

console.log(`✅ Found ${validClusters.length} clusters with ≥6 movies\n`);
validClusters.forEach((cluster, i) => {
  console.log(`  ${i+1}. "${cluster.theme}" - ${cluster.movies} movies`);
});

// Step 3: Editorial Title Polish
console.log('\n\n✏️  STEP 3: Generate Editorial Titles\n');

const editorialTitles = [
  { original: 'boxing', editorial: 'In the Ring', rationale: 'Active, evocative. Removed "movies"' },
  { original: 'journalism', editorial: 'Stories Behind the Story', rationale: 'Meta, clever. No generic "journalism films"' },
  { original: 'time loop', editorial: 'Caught in Time', rationale: 'Present participle creates immediacy' },
  { original: 'corporate corruption', editorial: 'Exposing Corruption', rationale: 'Gerund adds action. Genre implied' },
  { original: 'vietnam war', editorial: 'Vietnam\'s Shadows', rationale: 'Possessive + metaphor. No "war films"' },
];

console.log('✅ Polished editorial titles:\n');
editorialTitles.forEach((title, i) => {
  console.log(`  ${i+1}. "${title.original}" → "${title.editorial}"`);
  console.log(`     Rationale: ${title.rationale}\n`);
});

// Step 4: Final Collections
console.log('\n📚 STEP 4: Final Browse Collections\n');

const finalCollections = [
  {
    title: 'In the Ring',
    description: 'Boxing dramas exploring masculinity, redemption, and the physical toll of the sport.',
    movieCount: 7,
    originalTheme: 'boxing',
    sampleMovies: ['Raging Bull (1980)', 'The Fighter (2010)', 'Creed (2015)', 'Million Dollar Baby (2004)', 'Rocky (1976)']
  },
  {
    title: 'Stories Behind the Story',
    description: 'Journalists risk everything to expose truth, from Watergate to church scandals.',
    movieCount: 8,
    originalTheme: 'journalism',
    sampleMovies: ['All the President\'s Men (1976)', 'Spotlight (2015)', 'The Post (2017)', 'Shattered Glass (2003)']
  },
  {
    title: 'Caught in Time',
    description: 'Characters trapped in repeating days discover meaning through repetition.',
    movieCount: 7,
    originalTheme: 'time loop',
    sampleMovies: ['Groundhog Day (1993)', 'Edge of Tomorrow (2014)', 'Palm Springs (2020)', 'Source Code (2011)']
  },
  {
    title: 'Exposing Corruption',
    description: 'Whistleblowers take on industries putting profits over people.',
    movieCount: 7,
    originalTheme: 'corporate corruption',
    sampleMovies: ['The Insider (1999)', 'Erin Brockovich (2000)', 'Dark Waters (2019)', 'Silkwood (1983)']
  },
  {
    title: 'Vietnam\'s Shadows',
    description: 'The war that divided America, told through soldiers\' descent and return.',
    movieCount: 7,
    originalTheme: 'vietnam war',
    sampleMovies: ['Apocalypse Now (1979)', 'Platoon (1986)', 'The Deer Hunter (1978)', 'Full Metal Jacket (1987)']
  }
];

console.log('═══════════════════════════════════════════════════════════');
finalCollections.forEach((collection, i) => {
  console.log(`\n${i+1}. "${collection.title}" (${collection.movieCount} movies)`);
  console.log(`   ${collection.description}`);
  console.log(`   Original theme: "${collection.originalTheme}"`);
  console.log(`   Sample films:`);
  collection.sampleMovies.forEach(m => {
    console.log(`     • ${m}`);
  });
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('\n✅ PROTOTYPE COMPLETE\n');
console.log('Key Advantages of This Approach:\n');
console.log('  1. ✅ Derived from actual movie content (not AI hallucination)');
console.log('  2. ✅ Sustainable - auto-updates as new analyses added');
console.log('  3. ✅ Serendipitous - "Vietnam\'s Shadows" not "War Movies"');
console.log('  4. ✅ Editorial quality - polished titles, no generic language');
console.log('  5. ✅ Cost-effective - one-time extraction vs repeated regeneration');
console.log('  6. ✅ Quality control - automatic ≥6 movie threshold\n');

console.log('Next Steps:\n');
console.log('  1. Run full theme extraction on 20,000 analyses (~$20)');
console.log('  2. Generate 1,000-2,000 serendipitous collections');
console.log('  3. Store in browse_lists table');
console.log('  4. Auto-update as new movies analyzed\n');

console.log('═══════════════════════════════════════════════════════════\n');
