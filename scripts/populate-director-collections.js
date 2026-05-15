/**
 * Populate Director Collections
 *
 * Creates browse_lists entries for 105 prestigious directors (≥11 films)
 * with quality_score = 5.0 for homepage prominence.
 */

import { getPool } from '../lib/database.js';

const directors = [
  'Michael Curtiz', 'Alfred Hitchcock', 'Jean-Luc Godard', 'John Ford',
  'Steven Spielberg', 'Martin Scorsese', 'Raoul Walsh', 'John Huston',
  'Steven Soderbergh', 'Ingmar Bergman', 'Sidney Lumet', 'Werner Herzog',
  'Howard Hawks', 'George Cukor', 'D.W. Griffith', 'Robert Altman',
  'Robert Aldrich', 'Brian De Palma', 'François Truffaut', 'Luis Buñuel',
  'Takashi Miike', 'Frank Capra', 'Vincente Minnelli', 'Otto Preminger',
  'Ridley Scott', 'Rainer Werner Fassbinder', 'Wim Wenders', 'Akira Kurosawa',
  'Billy Wilder', 'Anthony Mann', 'Robert Wise', 'Hong Sang-soo',
  'Douglas Sirk', 'Fritz Lang', 'Oliver Stone', 'Clint Eastwood',
  'John Woo', 'William Wyler', 'King Vidor', 'Claude Chabrol',
  'Pedro Almodóvar', 'John Carpenter', 'David Cronenberg', 'Roman Polanski',
  'Ernst Lubitsch', 'Francis Ford Coppola', 'Norman Jewison', 'Jean Renoir',
  'Ken Loach', 'Kenji Mizoguchi', 'Tsui Hark', 'Federico Fellini',
  'Yasujirō Ozu', 'Seijun Suzuki', 'Zhang Yimou', 'Johnnie To',
  'Satyajit Ray', 'Leo McCarey', 'Gus Van Sant', 'Jonathan Demme',
  'Michelangelo Antonioni', 'Vittorio De Sica', 'Krzysztof Kieślowski',
  'Abbas Kiarostami', 'Fred Zinnemann', 'Mike Nichols', 'Jim Jarmusch',
  'Spike Lee', 'Roberto Rossellini', 'Tony Scott', 'Hou Hsiao-hsien',
  'Peter Weir', 'Elia Kazan', 'William Friedkin', 'Sam Peckinpah',
  'Richard Linklater', 'Luchino Visconti', 'David Lean', 'John Schlesinger',
  'Stephen Frears', 'Terry Gilliam', 'Kenneth Branagh', 'Lars von Trier',
  'Aki Kaurismäki', 'Hayao Miyazaki', 'Bruce Beresford', 'George Stevens',
  'Cecil B. DeMille', 'Jacques Tourneur', 'Arthur Penn', 'David Lynch',
  'Quentin Tarantino', 'Robert Bresson', 'Agnès Varda', 'Alain Resnais',
  'Louis Malle', 'Luc Besson', 'Bernardo Bertolucci', 'Carol Reed',
  'Anthony Asquith', 'Ken Russell', 'Mike Leigh', 'Christopher Nolan',
  'Michael Haneke', 'Takeshi Kitano'
];

async function populateDirectorCollections() {
  const pool = getPool();

  console.log('Populating director collections...\n');
  console.log(`Target: ${directors.length} directors\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const directorName of directors) {
    try {
      // 1. Get all films by this director
      const films = await pool.query(`
        SELECT DISTINCT
          m.id,
          m.tmdb_id,
          m.title,
          m.year
        FROM movie_contributors mc
        JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
        WHERE mc.person_name = $1
          AND mc.role = 'director'
          AND m.tmdb_id IS NOT NULL
        ORDER BY m.year DESC NULLS LAST
      `, [directorName]);

      if (films.rows.length < 11) {
        console.log(`⚠️  ${directorName}: Only ${films.rows.length} films, skipping`);
        skipped++;
        continue;
      }

      // 2. Check if collection already exists
      const existing = await pool.query(`
        SELECT id FROM browse_lists WHERE title = $1
      `, [directorName]);

      if (existing.rows.length > 0) {
        console.log(`⊘  ${directorName}: Already exists, skipping`);
        skipped++;
        continue;
      }

      // 3. Build editorial_data JSONB structure
      const moviesJson = films.rows.map(film => ({
        tmdb_id: film.tmdb_id,
        title: film.title,
        year: film.year
      }));

      const editorialData = {
        subcategories: [
          {
            name: "Filmography",
            movies: moviesJson
          }
        ]
      };

      // 4. Create browse_list entry
      await pool.query(`
        INSERT INTO browse_lists
          (title, description, curated, quality_score, status, total_movies, categories, editorial_data, created_at, updated_at)
        VALUES ($1, $2, TRUE, 10, 'active', $3, $4, $5, NOW(), NOW())
      `, [
        directorName,
        `Complete filmography of ${directorName} in our catalog.`,
        films.rows.length,
        ['Directors'],
        JSON.stringify(editorialData)
      ]);

      console.log(`✓ ${directorName}: ${films.rows.length} films`);
      created++;

    } catch (err) {
      console.error(`✗ ${directorName}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${directors.length}`);

  await pool.end();
}

populateDirectorCollections().catch(console.error);
