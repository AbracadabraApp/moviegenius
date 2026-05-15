/**
 * Check director filmography counts in database
 * Filter to directors with ≥7 films in our catalog
 */

import { getPool } from '../lib/database.js';

const directors = [
  // Classical Hollywood
  'Alfred Hitchcock', 'Orson Welles', 'John Ford', 'Howard Hawks', 'Billy Wilder',
  'Frank Capra', 'William Wyler', 'George Stevens', 'George Cukor', 'Vincente Minnelli',
  'Elia Kazan', 'Fred Zinnemann', 'Joseph L. Mankiewicz', 'Preston Sturges', 'Ernst Lubitsch',
  'Frank Borzage', 'Leo McCarey', 'Raoul Walsh', 'King Vidor', 'Cecil B. DeMille',
  'Michael Curtiz', 'Otto Preminger', 'Nicholas Ray', 'Anthony Mann', 'Robert Aldrich',
  'Samuel Fuller', 'Douglas Sirk', 'Stanley Donen', 'Robert Wise', 'William Wellman',

  // Noir specialists
  'Fritz Lang', 'Robert Siodmak', 'Jules Dassin', 'Edgar G. Ulmer', 'Jacques Tourneur', 'John Huston',

  // Silent era
  'Charlie Chaplin', 'Buster Keaton', 'Harold Lloyd', 'D.W. Griffith', 'F.W. Murnau',
  'Erich von Stroheim', 'Sergei Eisenstein', 'Dziga Vertov', 'Carl Theodor Dreyer',
  'Abel Gance', 'Jean Vigo', 'G.W. Pabst', 'Victor Sjöström',

  // New Hollywood
  'Francis Ford Coppola', 'Martin Scorsese', 'Robert Altman', 'Steven Spielberg', 'George Lucas',
  'William Friedkin', 'Peter Bogdanovich', 'Hal Ashby', 'John Cassavetes', 'Sam Peckinpah',
  'Arthur Penn', 'Bob Rafelson', 'Mike Nichols', 'Sidney Lumet', 'Roman Polanski',
  'Brian De Palma', 'Terrence Malick', 'Bob Fosse', 'Alan J. Pakula',

  // Contemporary American
  'David Lynch', 'Joel Coen', 'Ethan Coen', 'Paul Thomas Anderson', 'Wes Anderson',
  'Quentin Tarantino', 'David Fincher', 'Steven Soderbergh', 'Jim Jarmusch', 'Richard Linklater',
  'Spike Lee', 'Hal Hartley', 'John Sayles', 'Gus Van Sant', 'Todd Haynes',
  'Todd Solondz', 'Sofia Coppola', 'Wes Craven', 'Kathryn Bigelow', 'Kelly Reichardt',
  'Greta Gerwig', 'Chloé Zhao', 'Ava DuVernay', 'Barry Jenkins', 'Jordan Peele',
  'Ari Aster', 'Robert Eggers', 'Damien Chazelle', 'Noah Baumbach', 'Alexander Payne',
  'David O. Russell', 'Sean Baker', 'Debra Granik', 'Kenneth Lonergan', 'Lynne Ramsay',
  'Steve McQueen', 'Charlie Kaufman', 'Spike Jonze', 'Michel Gondry', 'Darren Aronofsky',
  'Lana Wachowski', 'Lilly Wachowski', 'Oliver Stone', 'Jonathan Demme', 'Clint Eastwood',
  'Ang Lee', 'Sydney Pollack', 'Norman Jewison',

  // French
  'Jean Renoir', 'Robert Bresson', 'Jean-Pierre Melville', 'Jacques Tati', 'Jacques Becker',
  'Henri-Georges Clouzot', 'Marcel Carné', 'René Clair', 'François Truffaut', 'Jean-Luc Godard',
  'Claude Chabrol', 'Éric Rohmer', 'Jacques Rivette', 'Agnès Varda', 'Alain Resnais',
  'Chris Marker', 'Jacques Demy', 'Louis Malle', 'Maurice Pialat', 'Jean Eustache',
  'Claude Sautet', 'André Téchiné', 'Bertrand Tavernier', 'Bertrand Blier', 'Léos Carax',
  'Luc Besson', 'Jean-Pierre Jeunet', 'Claire Denis', 'Catherine Breillat', 'Olivier Assayas',
  'Arnaud Desplechin', 'François Ozon', 'Bruno Dumont', 'Mia Hansen-Løve', 'Céline Sciamma',
  'Jacques Audiard', 'Abdellatif Kechiche',

  // Italian
  'Federico Fellini', 'Michelangelo Antonioni', 'Luchino Visconti', 'Vittorio De Sica',
  'Roberto Rossellini', 'Pier Paolo Pasolini', 'Bernardo Bertolucci', 'Sergio Leone',
  'Sergio Corbucci', 'Dario Argento', 'Mario Bava', 'Lucio Fulci', 'Ermanno Olmi',
  'Marco Bellocchio', 'Nanni Moretti', 'Paolo Sorrentino', 'Matteo Garrone', 'Luca Guadagnino',
  'Gianni Amelio', 'Pietro Germi', 'Alberto Lattuada', 'Francesco Rosi', 'Elio Petri',
  'Roberto Benigni', 'Lina Wertmüller',

  // British
  'David Lean', 'Michael Powell', 'Emeric Pressburger', 'Carol Reed', 'Anthony Asquith',
  'Ken Russell', 'Lindsay Anderson', 'Karel Reisz', 'Tony Richardson', 'John Schlesinger',
  'Nicolas Roeg', 'Ken Loach', 'Mike Leigh', 'Stephen Frears', 'Terence Davies',
  'Terry Gilliam', 'Peter Greenaway', 'Derek Jarman', 'Danny Boyle', 'Andrea Arnold',
  'Joanna Hogg', 'Christopher Nolan', 'Edgar Wright', 'Sam Mendes', 'Ridley Scott',
  'Tony Scott', 'Kenneth Branagh', 'Mike Newell',

  // German
  'Robert Wiene', 'Rainer Werner Fassbinder', 'Werner Herzog', 'Wim Wenders',
  'Volker Schlöndorff', 'Margarethe von Trotta', 'Wolfgang Petersen', 'Tom Tykwer',
  'Christian Petzold', 'Maren Ade', 'Florian Henckel von Donnersmarck', 'Michael Haneke',
  'Ulrich Seidl',

  // Scandinavian
  'Ingmar Bergman', 'Lars von Trier', 'Thomas Vinterberg', 'Roy Andersson', 'Ruben Östlund',
  'Bille August', 'Susanne Bier', 'Joachim Trier', 'Aki Kaurismäki', 'Tomas Alfredson',

  // Spanish
  'Luis Buñuel', 'Carlos Saura', 'Víctor Erice', 'Pedro Almodóvar', 'Alejandro Amenábar',
  'Julio Medem', 'J.A. Bayona', 'Isabel Coixet', 'Iciar Bollaín',

  // Eastern European
  'Andrzej Wajda', 'Krzysztof Kieślowski', 'Jerzy Skolimowski', 'Andrzej Żuławski',
  'Agnieszka Holland', 'Paweł Pawlikowski', 'Miloš Forman', 'Jiří Menzel', 'Věra Chytilová',
  'Jan Švankmajer', 'István Szabó', 'Miklós Jancsó', 'Béla Tarr', 'László Nemes',
  'Cristian Mungiu', 'Cristi Puiu', 'Corneliu Porumboiu', 'Emir Kusturica', 'Dušan Makavejev',
  'Aleksandar Petrović',

  // Russian / Soviet
  'Vsevolod Pudovkin', 'Aleksandr Dovzhenko', 'Andrei Tarkovsky', 'Sergei Parajanov',
  'Aleksei German', 'Aleksandr Sokurov', 'Andrey Zvyagintsev', 'Kira Muratova',
  'Larisa Shepitko', 'Elem Klimov', 'Nikita Mikhalkov',

  // Japanese
  'Yasujirō Ozu', 'Akira Kurosawa', 'Kenji Mizoguchi', 'Mikio Naruse', 'Kon Ichikawa',
  'Masaki Kobayashi', 'Kaneto Shindō', 'Nagisa Ōshima', 'Shōhei Imamura', 'Seijun Suzuki',
  'Hiroshi Teshigahara', 'Kihachi Okamoto', 'Takashi Miike', 'Takeshi Kitano', 'Hirokazu Kore-eda',
  'Kiyoshi Kurosawa', 'Naomi Kawase', 'Ryūsuke Hamaguchi', 'Hayao Miyazaki', 'Isao Takahata',
  'Satoshi Kon', 'Mamoru Oshii', 'Mamoru Hosoda', 'Makoto Shinkai',

  // Korean
  'Im Kwon-taek', 'Park Chan-wook', 'Bong Joon-ho', 'Lee Chang-dong', 'Hong Sang-soo',
  'Kim Ki-duk', 'Kim Jee-woon', 'Na Hong-jin', 'Yeon Sang-ho',

  // Chinese / Hong Kong / Taiwanese
  'Zhang Yimou', 'Chen Kaige', 'Tian Zhuangzhuang', 'Jia Zhangke', 'Wang Xiaoshuai',
  'Lou Ye', 'Bi Gan', 'Wong Kar-wai', 'John Woo', 'Tsui Hark',
  'Johnnie To', 'Ann Hui', 'Stanley Kwan', 'Patrick Tam', 'King Hu',
  'Hou Hsiao-hsien', 'Edward Yang', 'Tsai Ming-liang',

  // Iranian
  'Abbas Kiarostami', 'Jafar Panahi', 'Asghar Farhadi', 'Mohsen Makhmalbaf', 'Samira Makhmalbaf',
  'Bahman Ghobadi', 'Bahram Beyzaie', 'Amir Naderi', 'Dariush Mehrjui',

  // Indian
  'Satyajit Ray', 'Ritwik Ghatak', 'Mrinal Sen', 'Guru Dutt', 'Bimal Roy',
  'Shyam Benegal', 'Adoor Gopalakrishnan', 'Mani Kaul', 'Mira Nair', 'Deepa Mehta',
  'Ritesh Batra',

  // Mexican / Latin American
  'Alfonso Cuarón', 'Guillermo del Toro', 'Alejandro González Iñárritu', 'Arturo Ripstein',
  'Carlos Reygadas', 'Amat Escalante', 'Michel Franco', 'Glauber Rocha', 'Walter Salles',
  'Fernando Meirelles', 'Kleber Mendonça Filho', 'Lucrecia Martel', 'Lisandro Alonso',
  'Pablo Trapero', 'Damián Szifron', 'Pablo Larraín', 'Patricio Guzmán', 'Sebastián Lelio',
  'Tomás Gutiérrez Alea',

  // African
  'Ousmane Sembène', 'Djibril Diop Mambéty', 'Souleymane Cissé', 'Idrissa Ouedraogo',
  'Abderrahmane Sissako', 'Mati Diop', 'Youssef Chahine', 'Moustapha Alassane',

  // Australian / NZ
  'Peter Weir', 'Bruce Beresford', 'Fred Schepisi', 'George Miller', 'Jane Campion',
  'Baz Luhrmann', 'Warwick Thornton', 'David Michôd', 'Justin Kurzel', 'Taika Waititi',

  // Documentary (keeping narrative crossovers)

  // Experimental (keeping festival circuit)
  'Apichatpong Weerasethakul', 'Pedro Costa', 'Lav Diaz',

  // Genre specialists
  'Stanley Kubrick', 'George A. Romero', 'John Carpenter', 'David Cronenberg', 'Tobe Hooper',
  'James Wan', 'M. Night Shyamalan'
];

async function checkDirectorCounts() {
  const pool = getPool();

  console.log('Checking film counts for', directors.length, 'directors...\n');

  const results = [];

  for (const director of directors) {
    const result = await pool.query(`
      SELECT COUNT(DISTINCT mc.movie_tmdb_id) as film_count
      FROM movie_contributors mc
      JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
      WHERE mc.person_name = $1
        AND mc.role = 'director'
        AND m.tmdb_id IS NOT NULL
    `, [director]);

    const count = parseInt(result.rows[0]?.film_count || 0);
    results.push({ director, count });
  }

  // Sort by count descending
  results.sort((a, b) => b.count - a.count);

  const qualified = results.filter(r => r.count >= 7);
  const cuts = results.filter(r => r.count > 0 && r.count < 7);
  const notFound = results.filter(r => r.count === 0);

  console.log('=== QUALIFIED (≥7 films) ===');
  console.log(`${qualified.length} directors\n`);
  qualified.forEach(r => {
    console.log(`${r.director}: ${r.count} films`);
  });

  console.log('\n=== CUTS (<7 films) ===');
  console.log(`${cuts.length} directors\n`);
  cuts.forEach(r => {
    console.log(`${r.director}: ${r.count} films`);
  });

  console.log('\n=== NOT IN DATABASE ===');
  console.log(`${notFound.length} directors\n`);
  notFound.forEach(r => {
    console.log(`${r.director}: 0 films`);
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Total directors checked: ${directors.length}`);
  console.log(`Qualified (≥7 films): ${qualified.length}`);
  console.log(`Would be cut (<7 films): ${cuts.length}`);
  console.log(`Not in database: ${notFound.length}`);

  await pool.end();
}

checkDirectorCounts().catch(console.error);
