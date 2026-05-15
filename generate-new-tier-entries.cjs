// Generate TierTmdbLookup.swift entries for newly added films

const newEntries = [
  // Action
  { genre: 'Action', tier: 'Devotee', title: 'Ong-Bak', year: 2003, tmdbId: 9316, dbTitle: 'Ong-Bak' },
  { genre: 'Action', tier: 'Archivist', title: 'Wolf Guy', year: 1975, tmdbId: 165282, dbTitle: 'Wolf Guy' },
  { genre: 'Action', tier: 'Archivist', title: 'Bodyguard Kiba', year: 1973, tmdbId: 54860, dbTitle: 'The Bodyguard' },
  { genre: 'Action', tier: 'Specialist', title: 'The Big Gundown', year: 1967, tmdbId: 16662, dbTitle: 'The Big Gundown' },

  // Crime
  { genre: 'Crime', tier: 'Connoisseur', title: 'Hana-bi', year: 1997, tmdbId: 5910, dbTitle: 'Fireworks' },
  { genre: 'Crime', tier: 'Specialist', title: '$ (Dollars)', year: 1971, tmdbId: 31644, dbTitle: '$' },

  // Documentary
  { genre: 'Documentary', tier: 'Connoisseur', title: 'A Married Couple', year: 1969, tmdbId: 86655, dbTitle: 'A Married Couple' },
  { genre: 'Documentary', tier: 'Connoisseur', title: '51 Birch Street', year: 2005, tmdbId: 79161, dbTitle: '51 Birch Street' },
  { genre: 'Documentary', tier: 'Archivist', title: 'Hôtel des Invalides', year: 1952, tmdbId: 150838, dbTitle: 'Hôtel des Invalides' },
  { genre: 'Documentary', tier: 'Archivist', title: 'Le Sang des bêtes', year: 1949, tmdbId: 91262, dbTitle: 'Blood of the Beasts' },
  { genre: 'Documentary', tier: 'Master', title: 'The 400 Million', year: 1939, tmdbId: 183005, dbTitle: 'The 400 Million' },

  // Espionage
  { genre: 'Espionage', tier: 'Specialist', title: 'Pickup Alley', year: 1957, tmdbId: 45235, dbTitle: 'Interpol' },
  { genre: 'Espionage', tier: 'Devotee', title: 'Persian Lessons', year: 2020, tmdbId: 581577, dbTitle: 'Persian Lessons' },
  { genre: 'Espionage', tier: 'Connoisseur', title: 'The Black Windmill', year: 1974, tmdbId: 32050, dbTitle: 'The Black Windmill' },
  { genre: 'Espionage', tier: 'Connoisseur', title: 'The Mackintosh Man', year: 1973, tmdbId: 32627, dbTitle: 'The MacKintosh Man' },
  { genre: 'Espionage', tier: 'Master', title: 'OSS', year: 1946, tmdbId: 94641, dbTitle: 'O.S.S.' },

  // Fantasy
  { genre: 'Fantasy', tier: 'Connoisseur', title: 'Cría Cuervos', year: 1976, tmdbId: 51857, dbTitle: 'Cria!' },
  { genre: 'Fantasy', tier: 'Archivist', title: 'The Bluebird', year: 1918, tmdbId: 71271, dbTitle: 'The Blue Bird' },

  // History
  { genre: 'History', tier: 'Connoisseur', title: 'Socrates', year: 1971, tmdbId: 74778, dbTitle: 'Socrates' },
  { genre: 'History', tier: 'Connoisseur', title: 'Augustine of Hippo', year: 1972, tmdbId: 111423, dbTitle: 'Augustine of Hippo' },
  { genre: 'History', tier: 'Specialist', title: 'Que Viva Mexico!', year: 1932, tmdbId: 616038, dbTitle: 'Hurray Mexico!' },
  { genre: 'History', tier: 'Master', title: 'The Assassination of the Duke of Guise', year: 1908, tmdbId: 144586, dbTitle: 'The Assassination of the Duke de Guise' },
  { genre: 'History', tier: 'Master', title: 'Mothers of Men', year: 1917, tmdbId: 400749, dbTitle: 'Mothers of Men' },
  { genre: 'History', tier: 'Master', title: 'Atlantis', year: 1913, tmdbId: 179835, dbTitle: 'Atlantis' },

  // Horror
  { genre: 'Horror', tier: 'Master', title: 'Equinox', year: 1970, tmdbId: 28681, dbTitle: 'Equinox' },
  { genre: 'Horror', tier: 'Master', title: 'A Bell from Hell', year: 1973, tmdbId: 52849, dbTitle: 'Bell from Hell' },
  { genre: 'Horror', tier: 'Well-Versed', title: 'Pearl', year: 2022, tmdbId: 949423, dbTitle: 'Pearl' },
  { genre: 'Horror', tier: 'Devotee', title: 'Ringu', year: 1998, tmdbId: 2671, dbTitle: 'Ring' },
  { genre: 'Horror', tier: 'Specialist', title: 'Alone', year: 2007, tmdbId: 37973, dbTitle: 'Alone' },

  // Mystery
  { genre: 'Mystery', tier: 'Specialist', title: 'The Tattered Dress', year: 1957, tmdbId: 77965, dbTitle: 'The Tattered Dress' },
  { genre: 'Mystery', tier: 'Archivist', title: 'The Offence', year: 1973, tmdbId: 32615, dbTitle: 'The Offence' },
  { genre: 'Mystery', tier: 'Master', title: 'Mute Witness', year: 1995, tmdbId: 48787, dbTitle: 'Mute Witness' },

  // Noir
  { genre: 'Noir', tier: 'Connoisseur', title: 'Quai des Orfèvres', year: 1947, tmdbId: 49842, dbTitle: 'Jenny Lamour' },
  { genre: 'Noir', tier: 'Master', title: 'Decoy', year: 1946, tmdbId: 20028, dbTitle: 'Decoy' },
  { genre: 'Noir', tier: 'Master', title: 'Railroaded!', year: 1947, tmdbId: 43463, dbTitle: 'Railroaded!' },

  // Science Fiction
  { genre: 'Science Fiction', tier: 'Connoisseur', title: 'First on the Moon', year: 2005, tmdbId: 25530, dbTitle: 'First on the Moon' },

  // Thriller
  { genre: 'Thriller', tier: 'Connoisseur', title: 'Le Salaire de la Peur', year: 1953, tmdbId: 204, dbTitle: 'The Wages of Fear' },
  { genre: 'Thriller', tier: 'Specialist', title: 'Vikram Vedha', year: 2017, tmdbId: 432139, dbTitle: 'Vikram Vedha' },
  { genre: 'Thriller', tier: 'Master', title: 'Number 17', year: 1932, tmdbId: 15007, dbTitle: 'Number Seventeen' },

  // War
  { genre: 'War', tier: 'Connoisseur', title: 'Idi i Smotri', year: 1985, tmdbId: 25237, dbTitle: 'Come and See' },
  { genre: 'War', tier: 'Specialist', title: 'Memphis Belle: A Story of a Flying Fortress', year: 1944, tmdbId: 41355, dbTitle: 'The Memphis Belle' },
  { genre: 'War', tier: 'Master', title: 'Two Arabian Knights', year: 1927, tmdbId: 102384, dbTitle: 'Two Arabian Knights' },

  // Western
  { genre: 'Western', tier: 'Master', title: 'The Aryan', year: 1916, tmdbId: 183821, dbTitle: 'The Aryan' },
  { genre: 'Western', tier: 'Master', title: 'Straight Shooting', year: 1917, tmdbId: 157903, dbTitle: 'Straight Shooting' },
  { genre: 'Western', tier: 'Master', title: 'Wild and Woolly', year: 1917, tmdbId: 135275, dbTitle: 'Wild and Woolly' },
];

console.log('// New TierTmdbLookup entries - append to TierTmdbLookup.swift\n');
console.log('// 53 newly added films from manual TMDB ID collection\n');

const swiftEntries = newEntries
  .sort((a, b) => {
    // Sort by genre, then tier, then title
    if (a.genre !== b.genre) return a.genre.localeCompare(b.genre);
    const tierOrder = ['Essential', 'Foundational', 'Classics', 'Well-Versed', 'Devotee', 'Connoisseur', 'Deep Cuts', 'Specialist', 'Archivist', 'Master'];
    const aTierIndex = tierOrder.indexOf(a.tier);
    const bTierIndex = tierOrder.indexOf(b.tier);
    if (aTierIndex !== bTierIndex) return aTierIndex - bTierIndex;
    return a.title.localeCompare(b.title);
  })
  .map(entry => {
    // Use the ORIGINAL title from GeniusView.swift for the lookup key
    const key = `"${entry.genre}|${entry.tier}|${entry.title}|${entry.year}"`;
    return `    ${key}: ${entry.tmdbId},`;
  });

swiftEntries.forEach(line => console.log(line));

console.log('\n\n// Summary:');
console.log(`// Total new entries: ${newEntries.length}`);
console.log('// These should be appended to the existing TierTmdbLookup.swift dictionary');
console.log('// Current count: 1774 entries');
console.log(`// After appending: ${1774 + newEntries.length} entries (${Math.round((1774 + newEntries.length) / 1831 * 100)}% coverage)`);
