// Essential Movies Database - All 50 curated films across themes
// Format: { title, year, tmdb_id, theme, themePage }

export const essentialMovies = {
  'film-noir': [
    { title: 'The Maltese Falcon', year: 1941, tmdb_id: 963, theme: 'Film Noir', themePage: 'film-noir' },
    { title: 'Double Indemnity', year: 1944, tmdb_id: 996, theme: 'Film Noir', themePage: 'film-noir' },
    { title: 'The Big Sleep', year: 1946, tmdb_id: 910, theme: 'Film Noir', themePage: 'film-noir' },
    { title: 'Out of the Past', year: 1947, tmdb_id: 678, theme: 'Film Noir', themePage: 'film-noir' },
    { title: 'Sunset Boulevard', year: 1950, tmdb_id: 599, theme: 'Film Noir', themePage: 'film-noir' }
  ],
  'horror-suspense': [
    { title: 'Psycho', year: 1960, tmdb_id: 539, theme: 'Horror & Suspense', themePage: 'horror-suspense' },
    { title: 'The Exorcist', year: 1973, tmdb_id: 9552, theme: 'Horror & Suspense', themePage: 'horror-suspense' },
    { title: 'Halloween', year: 1978, tmdb_id: 530, theme: 'Horror & Suspense', themePage: 'horror-suspense' },
    { title: 'Night of the Living Dead', year: 1968, tmdb_id: 10625, theme: 'Horror & Suspense', themePage: 'horror-suspense' },
    { title: 'Rosemary\'s Baby', year: 1968, tmdb_id: 10110, theme: 'Horror & Suspense', themePage: 'horror-suspense' }
  ],
  'comedy-through-time': [
    { title: 'Everything Everywhere All at Once', year: 2022, tmdb_id: 545611, theme: 'Comedy Through Time', themePage: 'comedy-through-time' },
    { title: 'Modern Times', year: 1936, tmdb_id: 3082, theme: 'Comedy Through Time', themePage: 'comedy-through-time' },
    { title: 'Some Like It Hot', year: 1959, tmdb_id: 239, theme: 'Comedy Through Time', themePage: 'comedy-through-time' },
    { title: 'Dr. Strangelove', year: 1964, tmdb_id: 935, theme: 'Comedy Through Time', themePage: 'comedy-through-time' },
    { title: 'Annie Hall', year: 1977, tmdb_id: 703, theme: 'Comedy Through Time', themePage: 'comedy-through-time' }
  ],
  'sci-fi-evolution': [
    { title: 'Metropolis', year: 1927, tmdb_id: 19, theme: 'Sci-Fi Evolution', themePage: 'sci-fi-evolution' },
    { title: '2001: A Space Odyssey', year: 1968, tmdb_id: 62, theme: 'Sci-Fi Evolution', themePage: 'sci-fi-evolution' },
    { title: 'Blade Runner', year: 1982, tmdb_id: 78, theme: 'Sci-Fi Evolution', themePage: 'sci-fi-evolution' },
    { title: 'The Matrix', year: 1999, tmdb_id: 603, theme: 'Sci-Fi Evolution', themePage: 'sci-fi-evolution' },
    { title: 'Arrival', year: 2016, tmdb_id: 329865, theme: 'Sci-Fi Evolution', themePage: 'sci-fi-evolution' }
  ],
  'action-adventure': [
    { title: 'Seven Samurai', year: 1954, tmdb_id: 346, theme: 'Action & Adventure', themePage: 'action-adventure' },
    { title: 'Raiders of the Lost Ark', year: 1981, tmdb_id: 85, theme: 'Action & Adventure', themePage: 'action-adventure' },
    { title: 'Terminator 2: Judgment Day', year: 1991, tmdb_id: 280, theme: 'Action & Adventure', themePage: 'action-adventure' },
    { title: 'The Adventures of Robin Hood', year: 1938, tmdb_id: 10907, theme: 'Action & Adventure', themePage: 'action-adventure' },
    { title: 'Mad Max: Fury Road', year: 2015, tmdb_id: 76341, theme: 'Action & Adventure', themePage: 'action-adventure' }
  ],
  'romance-through-decades': [
    { title: 'Gone with the Wind', year: 1939, tmdb_id: 770, theme: 'Romance Through Decades', themePage: 'romance-through-decades' },
    { title: 'Casablanca', year: 1943, tmdb_id: 289, theme: 'Romance Through Decades', themePage: 'romance-through-decades' },
    { title: 'The Princess Bride', year: 1987, tmdb_id: 2493, theme: 'Romance Through Decades', themePage: 'romance-through-decades' },
    { title: 'When Harry Met Sally', year: 1989, tmdb_id: 639, theme: 'Romance Through Decades', themePage: 'romance-through-decades' },
    { title: 'Eternal Sunshine of the Spotless Mind', year: 2004, tmdb_id: 38, theme: 'Romance Through Decades', themePage: 'romance-through-decades' }
  ],
  'drama-human-condition': [
    { title: 'Citizen Kane', year: 1941, tmdb_id: 15, theme: 'Drama & Human Condition', themePage: 'drama-human-condition' },
    { title: 'The Godfather', year: 1972, tmdb_id: 238, theme: 'Drama & Human Condition', themePage: 'drama-human-condition' },
    { title: '12 Angry Men', year: 1957, tmdb_id: 389, theme: 'Drama & Human Condition', themePage: 'drama-human-condition' },
    { title: 'On the Waterfront', year: 1954, tmdb_id: 654, theme: 'Drama & Human Condition', themePage: 'drama-human-condition' },
    { title: 'Schindler\'s List', year: 1993, tmdb_id: 424, theme: 'Drama & Human Condition', themePage: 'drama-human-condition' }
  ],
  'western-frontier': [
    { title: 'The Searchers', year: 1956, tmdb_id: 3114, theme: 'Western Frontier', themePage: 'western-frontier' },
    { title: 'High Noon', year: 1952, tmdb_id: 288, theme: 'Western Frontier', themePage: 'western-frontier' },
    { title: 'The Man Who Shot Liberty Valance', year: 1962, tmdb_id: 11697, theme: 'Western Frontier', themePage: 'western-frontier' },
    { title: 'Unforgiven', year: 1992, tmdb_id: 33, theme: 'Western Frontier', themePage: 'western-frontier' },
    { title: 'Butch Cassidy and the Sundance Kid', year: 1969, tmdb_id: 642, theme: 'Western Frontier', themePage: 'western-frontier' }
  ],
  'animation-art': [
    { title: 'Snow White and the Seven Dwarfs', year: 1937, tmdb_id: 408, theme: 'Animation as Art', themePage: 'animation-art' },
    { title: 'Akira', year: 1988, tmdb_id: 149, theme: 'Animation as Art', themePage: 'animation-art' },
    { title: 'Beauty and the Beast', year: 1991, tmdb_id: 10020, theme: 'Animation as Art', themePage: 'animation-art' },
    { title: 'Toy Story', year: 1995, tmdb_id: 862, theme: 'Animation as Art', themePage: 'animation-art' },
    { title: 'Spirited Away', year: 2001, tmdb_id: 129, theme: 'Animation as Art', themePage: 'animation-art' }
  ],
  'world-cinema': [
    { title: '8½', year: 1963, tmdb_id: 139, theme: 'World Cinema', themePage: 'world-cinema' },
    { title: 'The Rules of the Game', year: 1939, tmdb_id: 36386, theme: 'World Cinema', themePage: 'world-cinema' },
    { title: 'Tokyo Story', year: 1953, tmdb_id: 18148, theme: 'World Cinema', themePage: 'world-cinema' },
    { title: 'Bicycle Thieves', year: 1948, tmdb_id: 11224, theme: 'World Cinema', themePage: 'world-cinema' },
    { title: 'Persona', year: 1966, tmdb_id: 3082, theme: 'World Cinema', themePage: 'world-cinema' }
  ]
};

// Get all movies as a flat array
export const getAllEssentialMovies = () => {
  return Object.values(essentialMovies).flat();
};

// Get one representative movie from each theme (first movie of each theme)
export const getThemeRepresentatives = () => {
  return Object.keys(essentialMovies).map(themeKey => essentialMovies[themeKey][0]);
};

// Get movies for a specific theme
export const getMoviesForTheme = (theme) => {
  return essentialMovies[theme] || [];
};

// Search movies by title
export const searchEssentialMovies = (query) => {
  const allMovies = getAllEssentialMovies();
  return allMovies.filter(movie => 
    movie.title.toLowerCase().includes(query.toLowerCase())
  );
};

// Format movie for display: "Title (Year) - Theme"
export const formatMovieDisplay = (movie) => {
  return `${movie.title} (${movie.year}) - ${movie.theme}`;
};