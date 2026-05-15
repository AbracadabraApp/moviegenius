/**
 * Populate All Academy Awards Collections
 *
 * Creates browse_list entries for major Oscar categories:
 * - Best Director Winners
 * - Best Actor Winners
 * - Best Actress Winners
 *
 * All with quality_score = 10 for balanced homepage mix.
 * Ordered chronologically by ceremony year.
 */

import { getPool } from '../lib/database.js';

// Best Director Winners (1929-2024)
const bestDirectors = [
  {title: "All Quiet on the Western Front", ceremony_year: 1930},
  {title: "Skippy", ceremony_year: 1931},
  {title: "Bad Girl", ceremony_year: 1932},
  {title: "Cavalcade", ceremony_year: 1933},
  {title: "It Happened One Night", ceremony_year: 1934},
  {title: "The Informer", ceremony_year: 1935},
  {title: "Mr. Deeds Goes to Town", ceremony_year: 1936},
  {title: "The Awful Truth", ceremony_year: 1937},
  {title: "You Can't Take It with You", ceremony_year: 1938},
  {title: "Gone with the Wind", ceremony_year: 1939},
  {title: "The Grapes of Wrath", ceremony_year: 1940},
  {title: "How Green Was My Valley", ceremony_year: 1941},
  {title: "Mrs. Miniver", ceremony_year: 1942},
  {title: "Casablanca", ceremony_year: 1943},
  {title: "Going My Way", ceremony_year: 1944},
  {title: "The Lost Weekend", ceremony_year: 1945},
  {title: "The Best Years of Our Lives", ceremony_year: 1946},
  {title: "Gentleman's Agreement", ceremony_year: 1947},
  {title: "The Treasure of the Sierra Madre", ceremony_year: 1948},
  {title: "A Letter to Three Wives", ceremony_year: 1949},
  {title: "All About Eve", ceremony_year: 1950},
  {title: "A Place in the Sun", ceremony_year: 1951},
  {title: "The Quiet Man", ceremony_year: 1952},
  {title: "From Here to Eternity", ceremony_year: 1953},
  {title: "On the Waterfront", ceremony_year: 1954},
  {title: "Marty", ceremony_year: 1955},
  {title: "Giant", ceremony_year: 1956},
  {title: "The Bridge on the River Kwai", ceremony_year: 1957},
  {title: "Gigi", ceremony_year: 1958},
  {title: "Ben-Hur", ceremony_year: 1959},
  {title: "The Apartment", ceremony_year: 1960},
  {title: "West Side Story", ceremony_year: 1961},
  {title: "Lawrence of Arabia", ceremony_year: 1962},
  {title: "Tom Jones", ceremony_year: 1963},
  {title: "My Fair Lady", ceremony_year: 1964},
  {title: "The Sound of Music", ceremony_year: 1965},
  {title: "A Man for All Seasons", ceremony_year: 1966},
  {title: "The Graduate", ceremony_year: 1967},
  {title: "Oliver!", ceremony_year: 1968},
  {title: "Midnight Cowboy", ceremony_year: 1969},
  {title: "Patton", ceremony_year: 1970},
  {title: "The French Connection", ceremony_year: 1971},
  {title: "Cabaret", ceremony_year: 1972},
  {title: "The Sting", ceremony_year: 1973},
  {title: "The Godfather Part II", ceremony_year: 1974},
  {title: "One Flew Over the Cuckoo's Nest", ceremony_year: 1975},
  {title: "Rocky", ceremony_year: 1976},
  {title: "Annie Hall", ceremony_year: 1977},
  {title: "The Deer Hunter", ceremony_year: 1978},
  {title: "Kramer vs. Kramer", ceremony_year: 1979},
  {title: "Ordinary People", ceremony_year: 1980},
  {title: "Reds", ceremony_year: 1981},
  {title: "Gandhi", ceremony_year: 1982},
  {title: "Terms of Endearment", ceremony_year: 1983},
  {title: "Amadeus", ceremony_year: 1984},
  {title: "Out of Africa", ceremony_year: 1985},
  {title: "Platoon", ceremony_year: 1986},
  {title: "The Last Emperor", ceremony_year: 1987},
  {title: "Rain Man", ceremony_year: 1988},
  {title: "Born on the Fourth of July", ceremony_year: 1989},
  {title: "Dances with Wolves", ceremony_year: 1990},
  {title: "The Silence of the Lambs", ceremony_year: 1991},
  {title: "Unforgiven", ceremony_year: 1992},
  {title: "Schindler's List", ceremony_year: 1993},
  {title: "Forrest Gump", ceremony_year: 1994},
  {title: "Braveheart", ceremony_year: 1995},
  {title: "The English Patient", ceremony_year: 1996},
  {title: "Titanic", ceremony_year: 1997},
  {title: "Saving Private Ryan", ceremony_year: 1998},
  {title: "American Beauty", ceremony_year: 1999},
  {title: "Traffic", ceremony_year: 2000},
  {title: "A Beautiful Mind", ceremony_year: 2001},
  {title: "The Pianist", ceremony_year: 2002},
  {title: "The Lord of the Rings: The Return of the King", ceremony_year: 2003},
  {title: "Million Dollar Baby", ceremony_year: 2004},
  {title: "Brokeback Mountain", ceremony_year: 2005},
  {title: "The Departed", ceremony_year: 2006},
  {title: "No Country for Old Men", ceremony_year: 2007},
  {title: "Slumdog Millionaire", ceremony_year: 2008},
  {title: "The Hurt Locker", ceremony_year: 2009},
  {title: "The King's Speech", ceremony_year: 2010},
  {title: "The Artist", ceremony_year: 2011},
  {title: "Life of Pi", ceremony_year: 2012},
  {title: "Gravity", ceremony_year: 2013},
  {title: "Birdman", ceremony_year: 2014},
  {title: "The Revenant", ceremony_year: 2015},
  {title: "La La Land", ceremony_year: 2016},
  {title: "The Shape of Water", ceremony_year: 2017},
  {title: "Roma", ceremony_year: 2018},
  {title: "Parasite", ceremony_year: 2019},
  {title: "Nomadland", ceremony_year: 2020},
  {title: "The Power of the Dog", ceremony_year: 2021},
  {title: "Everything Everywhere All at Once", ceremony_year: 2022},
  {title: "Oppenheimer", ceremony_year: 2023},
  {title: "Anora", ceremony_year: 2024}
];

// Best Actor Winners (1929-2025) - just the film titles
const bestActors = [
  {title: "The Way of All Flesh", ceremony_year: 1929},
  {title: "In Old Arizona", ceremony_year: 1930},
  {title: "Disraeli", ceremony_year: 1931},
  {title: "A Free Soul", ceremony_year: 1932},
  {title: "Dr. Jekyll and Mr. Hyde", ceremony_year: 1933},
  {title: "The Private Life of Henry VIII", ceremony_year: 1934},
  {title: "It Happened One Night", ceremony_year: 1935},
  {title: "The Informer", ceremony_year: 1936},
  {title: "The Story of Louis Pasteur", ceremony_year: 1937},
  {title: "Captains Courageous", ceremony_year: 1938},
  {title: "Boys Town", ceremony_year: 1939},
  {title: "Goodbye, Mr. Chips", ceremony_year: 1940},
  {title: "The Philadelphia Story", ceremony_year: 1941},
  {title: "Sergeant York", ceremony_year: 1942},
  {title: "Yankee Doodle Dandy", ceremony_year: 1943},
  {title: "Watch on the Rhine", ceremony_year: 1944},
  {title: "Going My Way", ceremony_year: 1945},
  {title: "The Lost Weekend", ceremony_year: 1946},
  {title: "The Best Years of Our Lives", ceremony_year: 1947},
  {title: "A Double Life", ceremony_year: 1948},
  {title: "Hamlet", ceremony_year: 1949},
  {title: "All the King's Men", ceremony_year: 1950},
  {title: "Cyrano de Bergerac", ceremony_year: 1951},
  {title: "The African Queen", ceremony_year: 1952},
  {title: "High Noon", ceremony_year: 1953},
  {title: "Stalag 17", ceremony_year: 1954},
  {title: "On the Waterfront", ceremony_year: 1955},
  {title: "Marty", ceremony_year: 1956},
  {title: "The King and I", ceremony_year: 1957},
  {title: "The Bridge on the River Kwai", ceremony_year: 1958},
  {title: "Separate Tables", ceremony_year: 1959},
  {title: "Ben-Hur", ceremony_year: 1960},
  {title: "Elmer Gantry", ceremony_year: 1961},
  {title: "Judgment at Nuremberg", ceremony_year: 1962},
  {title: "To Kill a Mockingbird", ceremony_year: 1963},
  {title: "Lilies of the Field", ceremony_year: 1964},
  {title: "My Fair Lady", ceremony_year: 1965},
  {title: "Cat Ballou", ceremony_year: 1966},
  {title: "A Man for All Seasons", ceremony_year: 1967},
  {title: "In the Heat of the Night", ceremony_year: 1968},
  {title: "Charly", ceremony_year: 1969},
  {title: "True Grit", ceremony_year: 1970},
  {title: "Patton", ceremony_year: 1971},
  {title: "The French Connection", ceremony_year: 1972},
  {title: "The Godfather", ceremony_year: 1973},
  {title: "Save the Tiger", ceremony_year: 1974},
  {title: "Harry and Tonto", ceremony_year: 1975},
  {title: "One Flew Over the Cuckoo's Nest", ceremony_year: 1976},
  {title: "Network", ceremony_year: 1977},
  {title: "The Goodbye Girl", ceremony_year: 1978},
  {title: "Coming Home", ceremony_year: 1979},
  {title: "Kramer vs. Kramer", ceremony_year: 1980},
  {title: "Raging Bull", ceremony_year: 1981},
  {title: "On Golden Pond", ceremony_year: 1982},
  {title: "Gandhi", ceremony_year: 1983},
  {title: "Tender Mercies", ceremony_year: 1984},
  {title: "Amadeus", ceremony_year: 1985},
  {title: "Kiss of the Spider Woman", ceremony_year: 1986},
  {title: "The Color of Money", ceremony_year: 1987},
  {title: "Wall Street", ceremony_year: 1988},
  {title: "Rain Man", ceremony_year: 1989},
  {title: "My Left Foot", ceremony_year: 1990},
  {title: "Reversal of Fortune", ceremony_year: 1991},
  {title: "The Silence of the Lambs", ceremony_year: 1992},
  {title: "Scent of a Woman", ceremony_year: 1993},
  {title: "Philadelphia", ceremony_year: 1994},
  {title: "Forrest Gump", ceremony_year: 1995},
  {title: "Leaving Las Vegas", ceremony_year: 1996},
  {title: "Shine", ceremony_year: 1997},
  {title: "As Good as It Gets", ceremony_year: 1998},
  {title: "Life Is Beautiful", ceremony_year: 1999},
  {title: "American Beauty", ceremony_year: 2000},
  {title: "Gladiator", ceremony_year: 2001},
  {title: "Training Day", ceremony_year: 2002},
  {title: "The Pianist", ceremony_year: 2003},
  {title: "Mystic River", ceremony_year: 2004},
  {title: "Ray", ceremony_year: 2005},
  {title: "Capote", ceremony_year: 2006},
  {title: "The Last King of Scotland", ceremony_year: 2007},
  {title: "There Will Be Blood", ceremony_year: 2008},
  {title: "Milk", ceremony_year: 2009},
  {title: "Crazy Heart", ceremony_year: 2010},
  {title: "The King's Speech", ceremony_year: 2011},
  {title: "The Artist", ceremony_year: 2012},
  {title: "Lincoln", ceremony_year: 2013},
  {title: "Dallas Buyers Club", ceremony_year: 2014},
  {title: "The Theory of Everything", ceremony_year: 2015},
  {title: "The Revenant", ceremony_year: 2016},
  {title: "Manchester by the Sea", ceremony_year: 2017},
  {title: "Darkest Hour", ceremony_year: 2018},
  {title: "Bohemian Rhapsody", ceremony_year: 2019},
  {title: "Joker", ceremony_year: 2020},
  {title: "The Father", ceremony_year: 2021},
  {title: "King Richard", ceremony_year: 2022},
  {title: "The Whale", ceremony_year: 2023},
  {title: "Oppenheimer", ceremony_year: 2024},
  {title: "The Brutalist", ceremony_year: 2025}
];

// Best Actress Winners (1929-2025) - just the film titles
const bestActresses = [
  {title: "7th Heaven", ceremony_year: 1929},
  {title: "Coquette", ceremony_year: 1930},
  {title: "The Divorcee", ceremony_year: 1931},
  {title: "Min and Bill", ceremony_year: 1932},
  {title: "The Sin of Madelon Claudet", ceremony_year: 1933},
  {title: "Morning Glory", ceremony_year: 1934},
  {title: "It Happened One Night", ceremony_year: 1935},
  {title: "Dangerous", ceremony_year: 1936},
  {title: "The Great Ziegfeld", ceremony_year: 1937},
  {title: "The Good Earth", ceremony_year: 1938},
  {title: "Jezebel", ceremony_year: 1939},
  {title: "Gone with the Wind", ceremony_year: 1940},
  {title: "Kitty Foyle", ceremony_year: 1941},
  {title: "Suspicion", ceremony_year: 1942},
  {title: "Mrs. Miniver", ceremony_year: 1943},
  {title: "The Song of Bernadette", ceremony_year: 1944},
  {title: "Gaslight", ceremony_year: 1945},
  {title: "Mildred Pierce", ceremony_year: 1946},
  {title: "To Each His Own", ceremony_year: 1947},
  {title: "The Farmer's Daughter", ceremony_year: 1948},
  {title: "Johnny Belinda", ceremony_year: 1949},
  {title: "The Heiress", ceremony_year: 1950},
  {title: "Born Yesterday", ceremony_year: 1951},
  {title: "A Streetcar Named Desire", ceremony_year: 1952},
  {title: "Come Back, Little Sheba", ceremony_year: 1953},
  {title: "Roman Holiday", ceremony_year: 1954},
  {title: "The Country Girl", ceremony_year: 1955},
  {title: "The Rose Tattoo", ceremony_year: 1956},
  {title: "Anastasia", ceremony_year: 1957},
  {title: "The Three Faces of Eve", ceremony_year: 1958},
  {title: "I Want to Live!", ceremony_year: 1959},
  {title: "Room at the Top", ceremony_year: 1960},
  {title: "BUtterfield 8", ceremony_year: 1961},
  {title: "Two Women", ceremony_year: 1962},
  {title: "The Miracle Worker", ceremony_year: 1963},
  {title: "Hud", ceremony_year: 1964},
  {title: "Mary Poppins", ceremony_year: 1965},
  {title: "Darling", ceremony_year: 1966},
  {title: "Who's Afraid of Virginia Woolf?", ceremony_year: 1967},
  {title: "Guess Who's Coming to Dinner", ceremony_year: 1968},
  {title: "Funny Girl", ceremony_year: 1969},
  {title: "The Prime of Miss Jean Brodie", ceremony_year: 1970},
  {title: "Women in Love", ceremony_year: 1971},
  {title: "Klute", ceremony_year: 1972},
  {title: "Cabaret", ceremony_year: 1973},
  {title: "A Touch of Class", ceremony_year: 1974},
  {title: "Alice Doesn't Live Here Anymore", ceremony_year: 1975},
  {title: "One Flew Over the Cuckoo's Nest", ceremony_year: 1976},
  {title: "Network", ceremony_year: 1977},
  {title: "Annie Hall", ceremony_year: 1978},
  {title: "Coming Home", ceremony_year: 1979},
  {title: "Norma Rae", ceremony_year: 1980},
  {title: "Coal Miner's Daughter", ceremony_year: 1981},
  {title: "On Golden Pond", ceremony_year: 1982},
  {title: "Sophie's Choice", ceremony_year: 1983},
  {title: "Terms of Endearment", ceremony_year: 1984},
  {title: "Places in the Heart", ceremony_year: 1985},
  {title: "The Trip to Bountiful", ceremony_year: 1986},
  {title: "Children of a Lesser God", ceremony_year: 1987},
  {title: "Moonstruck", ceremony_year: 1988},
  {title: "The Accused", ceremony_year: 1989},
  {title: "Driving Miss Daisy", ceremony_year: 1990},
  {title: "Misery", ceremony_year: 1991},
  {title: "The Silence of the Lambs", ceremony_year: 1992},
  {title: "Howards End", ceremony_year: 1993},
  {title: "The Piano", ceremony_year: 1994},
  {title: "Blue Sky", ceremony_year: 1995},
  {title: "Dead Man Walking", ceremony_year: 1996},
  {title: "Fargo", ceremony_year: 1997},
  {title: "As Good as It Gets", ceremony_year: 1998},
  {title: "Shakespeare in Love", ceremony_year: 1999},
  {title: "Boys Don't Cry", ceremony_year: 2000},
  {title: "Erin Brockovich", ceremony_year: 2001},
  {title: "Monster's Ball", ceremony_year: 2002},
  {title: "The Hours", ceremony_year: 2003},
  {title: "Monster", ceremony_year: 2004},
  {title: "Million Dollar Baby", ceremony_year: 2005},
  {title: "Walk the Line", ceremony_year: 2006},
  {title: "The Queen", ceremony_year: 2007},
  {title: "La Vie en Rose", ceremony_year: 2008},
  {title: "The Reader", ceremony_year: 2009},
  {title: "The Blind Side", ceremony_year: 2010},
  {title: "Black Swan", ceremony_year: 2011},
  {title: "The Iron Lady", ceremony_year: 2012},
  {title: "Silver Linings Playbook", ceremony_year: 2013},
  {title: "Blue Jasmine", ceremony_year: 2014},
  {title: "Still Alice", ceremony_year: 2015},
  {title: "Room", ceremony_year: 2016},
  {title: "La La Land", ceremony_year: 2017},
  {title: "Three Billboards Outside Ebbing, Missouri", ceremony_year: 2018},
  {title: "The Favourite", ceremony_year: 2019},
  {title: "Judy", ceremony_year: 2020},
  {title: "Nomadland", ceremony_year: 2021},
  {title: "The Eyes of Tammy Faye", ceremony_year: 2022},
  {title: "Everything Everywhere All at Once", ceremony_year: 2023},
  {title: "Poor Things", ceremony_year: 2024},
  {title: "Anora", ceremony_year: 2025}
];

async function createCollection(pool, title, description, category, filmList) {
  console.log(`\nProcessing: ${title}`);

  // Check if exists
  const existing = await pool.query(`SELECT id FROM browse_lists WHERE title = $1`, [title]);
  if (existing.rows.length > 0) {
    console.log(`⊘  ${title}: Already exists, skipping`);
    return { created: false, found: 0, missing: 0 };
  }

  // Match films in database
  const moviesJson = [];
  let foundCount = 0;
  let missingCount = 0;
  const missing = [];

  for (const film of filmList) {
    const result = await pool.query(`
      SELECT tmdb_id, title, year
      FROM movies
      WHERE title ILIKE $1
      ORDER BY year ASC
      LIMIT 1
    `, [film.title]);

    if (result.rows.length > 0) {
      moviesJson.push({
        tmdb_id: result.rows[0].tmdb_id,
        title: result.rows[0].title,
        year: result.rows[0].year,
        ceremony_year: film.ceremony_year
      });
      foundCount++;
    } else {
      missing.push(film);
      missingCount++;
    }
  }

  if (moviesJson.length === 0) {
    console.log(`✗ ${title}: No films found in database`);
    return { created: false, found: 0, missing: filmList.length };
  }

  // Create collection
  const editorialData = {
    subcategories: [{
      name: category,
      movies: moviesJson
    }]
  };

  await pool.query(`
    INSERT INTO browse_lists
      (title, description, curated, quality_score, status, total_movies, categories, editorial_data, created_at, updated_at)
    VALUES ($1, $2, TRUE, 10, 'active', $3, $4, $5, NOW(), NOW())
  `, [title, description, moviesJson.length, ['Academy Awards'], JSON.stringify(editorialData)]);

  console.log(`✓ ${title}: ${foundCount}/${filmList.length} films`);
  if (missingCount > 0) {
    console.log(`  Missing: ${missingCount} films`);
  }

  return { created: true, found: foundCount, missing: missingCount };
}

async function populateAllOscars() {
  const pool = getPool();

  console.log('Populating Academy Awards collections...\n');

  const collections = [
    {
      title: 'Oscar Best Director Winners',
      description: 'Complete collection of Academy Award Best Director winners from 1929 to 2024.',
      category: 'Best Director Winners',
      films: bestDirectors
    },
    {
      title: 'Oscar Best Actor Winners',
      description: 'Complete collection of Academy Award Best Actor winners from 1929 to 2025.',
      category: 'Best Actor Winners',
      films: bestActors
    },
    {
      title: 'Oscar Best Actress Winners',
      description: 'Complete collection of Academy Award Best Actress winners from 1929 to 2025.',
      category: 'Best Actress Winners',
      films: bestActresses
    }
  ];

  let totalCreated = 0;
  let totalFound = 0;
  let totalMissing = 0;

  for (const col of collections) {
    const result = await createCollection(pool, col.title, col.description, col.category, col.films);
    if (result.created) totalCreated++;
    totalFound += result.found;
    totalMissing += result.missing;
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Collections created: ${totalCreated}`);
  console.log(`Total films found: ${totalFound}`);
  console.log(`Total films missing: ${totalMissing}`);

  await pool.end();
}

populateAllOscars().catch(console.error);
