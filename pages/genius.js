/**
 * Genius Page — Collection Recommendations
 *
 * Shows collections derived from the user's seen history and watchlist.
 * "Because you watched X..." sections, each with 1-3 matching collections.
 * Zero Claude cost — pure SQL overlap matching.
 *
 * Cold start: when user has no history, shows a genre-tabbed movie picker
 * so they can mark films as seen/saved to seed recommendations.
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import { FavoritesManager } from '../components/FavoritesManager';

// ─── Cold start movie catalog ────────────────────────────────────────────────
const COLD_START_MOVIES = [
  // Animation
  { tmdbId: 408,   title: 'Snow White and the Seven Dwarfs', year: 1937, genre: 'Animation', poster: 'https://image.tmdb.org/t/p/w185/qpC0E7NUCb0V5eamDLSqZ1BBABR.jpg' },
  { tmdbId: 10895, title: 'Pinocchio',            year: 1940, genre: 'Animation', poster: 'https://image.tmdb.org/t/p/w185/c0hYlHK9dSlDvvLBHiLWHiB6p7W.jpg' },
  { tmdbId: 3170,  title: 'Bambi',                year: 1942, genre: 'Animation', poster: 'https://image.tmdb.org/t/p/w185/kuNjGkUYFClQdIBGXDaJVGUEhB7.jpg' },
  { tmdbId: 756,   title: 'Fantasia',             year: 1940, genre: 'Animation', poster: 'https://image.tmdb.org/t/p/w185/aVR5Y3Xru0ESmAO0mZLV5MuKTBP.jpg' },
  { tmdbId: 11224, title: 'Cinderella',           year: 1950, genre: 'Animation', poster: 'https://image.tmdb.org/t/p/w185/3rYrW5gBNk3h7vbMQiSSzX0AYLJ.jpg' },
  { tmdbId: 8587,  title: 'The Lion King',        year: 1994, genre: 'Animation', poster: 'https://image.tmdb.org/t/p/w185/sIRO9YGzMCVopkIiMTcFBm5NNRB.jpg' },
  { tmdbId: 10020, title: 'Beauty and the Beast', year: 1991, genre: 'Animation', poster: 'https://image.tmdb.org/t/p/w185/6bvjgPNAqQtGG5nGEQIKWGCOXhH.jpg' },
  { tmdbId: 808,   title: 'Shrek',                year: 2001, genre: 'Animation', poster: 'https://image.tmdb.org/t/p/w185/s15VuIj3MHGYBvWOT7WBZqxTEyT.jpg' },
  { tmdbId: 862,   title: 'Toy Story',            year: 1995, genre: 'Animation', poster: 'https://image.tmdb.org/t/p/w185/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg' },
  { tmdbId: 12,    title: 'Finding Nemo',         year: 2003, genre: 'Animation', poster: 'https://image.tmdb.org/t/p/w185/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg' },
  // Fantasy
  { tmdbId: 630,   title: 'The Wizard of Oz',     year: 1939, genre: 'Fantasy',   poster: 'https://image.tmdb.org/t/p/w185/vRt5XaKl8GIQ1m6JiOAMGBBPPT1.jpg' },
  { tmdbId: 120,   title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001, genre: 'Fantasy', poster: 'https://image.tmdb.org/t/p/w185/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg' },
  { tmdbId: 1585,  title: "It's a Wonderful Life",year: 1946, genre: 'Fantasy',   poster: 'https://image.tmdb.org/t/p/w185/bSqt9rhDZx1Q7UZ86dBPd2oMIFD.jpg' },
  { tmdbId: 244,   title: 'King Kong',            year: 1933, genre: 'Fantasy',   poster: 'https://image.tmdb.org/t/p/w185/gfpWLF37C1LDeFZRnZRyBiTEtQF.jpg' },
  { tmdbId: 11881, title: 'Miracle on 34th Street',year: 1947,genre: 'Fantasy',   poster: 'https://image.tmdb.org/t/p/w185/glscKVJnJ5a3v5RDhAO2fLyGGxU.jpg' },
  { tmdbId: 2323,  title: 'Field of Dreams',      year: 1989, genre: 'Fantasy',   poster: 'https://image.tmdb.org/t/p/w185/nv4a8BRWbqfvfmQqsxsA1uFJ8ur.jpg' },
  { tmdbId: 11787, title: 'Harvey',               year: 1950, genre: 'Fantasy',   poster: 'https://image.tmdb.org/t/p/w185/iX7rI4XnBhcbJJbvRNpVrXFBOiG.jpg' },
  { tmdbId: 137,   title: 'Groundhog Day',        year: 1993, genre: 'Fantasy',   poster: 'https://image.tmdb.org/t/p/w185/gKE0DjXrLVnlBFMHJoqIjjUj8yk.jpg' },
  { tmdbId: 28963, title: 'The Thief of Bagdad',  year: 1924, genre: 'Fantasy',   poster: 'https://image.tmdb.org/t/p/w185/bWoFpyXMXGM4kRVuJFy2wPXfVqC.jpg' },
  { tmdbId: 2280,  title: 'Big',                  year: 1988, genre: 'Fantasy',   poster: 'https://image.tmdb.org/t/p/w185/3IkmCKNLekH6bkYRNJPpZM2dyQO.jpg' },
  // Gangster
  { tmdbId: 238,   title: 'The Godfather',        year: 1972, genre: 'Gangster',  poster: 'https://image.tmdb.org/t/p/w185/3bhkrj58Vtu7enYsLlegkKXFhdf.jpg' },
  { tmdbId: 769,   title: 'Goodfellas',           year: 1990, genre: 'Gangster',  poster: 'https://image.tmdb.org/t/p/w185/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg' },
  { tmdbId: 240,   title: 'The Godfather Part II',year: 1974, genre: 'Gangster',  poster: 'https://image.tmdb.org/t/p/w185/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg' },
  { tmdbId: 15794, title: 'White Heat',           year: 1949, genre: 'Gangster',  poster: 'https://image.tmdb.org/t/p/w185/2u5QHSE7rPYrHajQ3YB0nSqmYYY.jpg' },
  { tmdbId: 475,   title: 'Bonnie and Clyde',     year: 1967, genre: 'Gangster',  poster: 'https://image.tmdb.org/t/p/w185/2rECNFPxR1KKhKHSmE7g5FpiFZU.jpg' },
  { tmdbId: 877,   title: 'Scarface: The Shame of a Nation', year: 1932, genre: 'Gangster', poster: 'https://image.tmdb.org/t/p/w185/hIvSvLlBXQBe8s47K9MnLLhVdid.jpg' },
  { tmdbId: 680,   title: 'Pulp Fiction',         year: 1994, genre: 'Gangster',  poster: 'https://image.tmdb.org/t/p/w185/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg' },
  { tmdbId: 17687, title: 'The Public Enemy',     year: 1931, genre: 'Gangster',  poster: 'https://image.tmdb.org/t/p/w185/hJflGh3pLRLYaQ8vRNJmJN9SNQE.jpg' },
  { tmdbId: 27899, title: 'Little Caesar',        year: 1931, genre: 'Gangster',  poster: 'https://image.tmdb.org/t/p/w185/thqV7Yer0xAFeBaHMgI8j7bC7ub.jpg' },
  { tmdbId: 111,   title: 'Scarface',             year: 1983, genre: 'Gangster',  poster: 'https://image.tmdb.org/t/p/w185/iQ5ztdjvteGeboxtmRdXEChJOHh.jpg' },
  // Science Fiction
  { tmdbId: 62,    title: '2001: A Space Odyssey',year: 1968, genre: 'Sci-Fi',    poster: 'https://image.tmdb.org/t/p/w185/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg' },
  { tmdbId: 11,    title: 'Star Wars',            year: 1977, genre: 'Sci-Fi',    poster: 'https://image.tmdb.org/t/p/w185/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg' },
  { tmdbId: 601,   title: 'E.T. the Extra-Terrestrial', year: 1982, genre: 'Sci-Fi', poster: 'https://image.tmdb.org/t/p/w185/an0nD6uq6byfxXCfk6lQBzdPqhI.jpg' },
  { tmdbId: 185,   title: 'A Clockwork Orange',   year: 1971, genre: 'Sci-Fi',    poster: 'https://image.tmdb.org/t/p/w185/4aHd1kMXPAJBQCEFMaGMnNiKfGC.jpg' },
  { tmdbId: 828,   title: 'The Day the Earth Stood Still', year: 1951, genre: 'Sci-Fi', poster: 'https://image.tmdb.org/t/p/w185/f3VtaBkk5dNvJysPdHZzpgxYGIb.jpg' },
  { tmdbId: 78,    title: 'Blade Runner',         year: 1982, genre: 'Sci-Fi',    poster: 'https://image.tmdb.org/t/p/w185/63N9uy8nd9j7Ei51cFelk3QqCwH.jpg' },
  { tmdbId: 348,   title: 'Alien',                year: 1979, genre: 'Sci-Fi',    poster: 'https://image.tmdb.org/t/p/w185/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg' },
  { tmdbId: 280,   title: 'Terminator 2: Judgment Day', year: 1991, genre: 'Sci-Fi', poster: 'https://image.tmdb.org/t/p/w185/weVXMD5QBGeQil4HEATZqMnSRvz.jpg' },
  { tmdbId: 11549, title: 'Invasion of the Body Snatchers', year: 1956, genre: 'Sci-Fi', poster: 'https://image.tmdb.org/t/p/w185/cFPYvnb9m1FMVzjEYjWbdRVUCPH.jpg' },
  { tmdbId: 105,   title: 'Back to the Future',   year: 1985, genre: 'Sci-Fi',    poster: 'https://image.tmdb.org/t/p/w185/fNOH9fm1GBe5UMplB2my1GFMpWL.jpg' },
  // Western
  { tmdbId: 3114,  title: 'The Searchers',        year: 1956, genre: 'Western',   poster: 'https://image.tmdb.org/t/p/w185/5c2eJaqRerSGiDPfeMSeFo3LW2e.jpg' },
  { tmdbId: 288,   title: 'High Noon',            year: 1952, genre: 'Western',   poster: 'https://image.tmdb.org/t/p/w185/iCTi1LUxl6KPLJ6qjSWi7fECq5H.jpg' },
  { tmdbId: 3110,  title: 'Shane',                year: 1953, genre: 'Western',   poster: 'https://image.tmdb.org/t/p/w185/pW7bLDRVJoqijb5DhqEMlmMGiKt.jpg' },
  { tmdbId: 33,    title: 'Unforgiven',           year: 1992, genre: 'Western',   poster: 'https://image.tmdb.org/t/p/w185/c1rIqKeFzMIHuGrKYVTiG9jY5Oh.jpg' },
  { tmdbId: 3089,  title: 'Red River',            year: 1948, genre: 'Western',   poster: 'https://image.tmdb.org/t/p/w185/oNFjYBOyExvdxSA7YqQXgr7cVxH.jpg' },
  { tmdbId: 576,   title: 'The Wild Bunch',       year: 1969, genre: 'Western',   poster: 'https://image.tmdb.org/t/p/w185/6OHhUPGKv3llVeOD3kpZbHHnqHj.jpg' },
  { tmdbId: 642,   title: 'Butch Cassidy and the Sundance Kid', year: 1969, genre: 'Western', poster: 'https://image.tmdb.org/t/p/w185/oQBvQbQMKLi5JbSSRqkEHQYu0m6.jpg' },
  { tmdbId: 29005, title: 'McCabe & Mrs. Miller', year: 1971, genre: 'Western',   poster: 'https://image.tmdb.org/t/p/w185/bL4MOL9YWwZHOVxK1rB52B40NTN.jpg' },
  { tmdbId: 995,   title: 'Stagecoach',           year: 1939, genre: 'Western',   poster: 'https://image.tmdb.org/t/p/w185/o2iFJiCyRkUdCXoFTFMpMzj4W47.jpg' },
  { tmdbId: 11694, title: 'Cat Ballou',           year: 1965, genre: 'Western',   poster: 'https://image.tmdb.org/t/p/w185/yM4A4j2K1R3DkknVuDWYYSMHt0Y.jpg' },
  // Sports
  { tmdbId: 1578,  title: 'Raging Bull',          year: 1980, genre: 'Sports',    poster: 'https://image.tmdb.org/t/p/w185/4MrGHHdqR3cF5XKsHnzSBgNkHIU.jpg' },
  { tmdbId: 1366,  title: 'Rocky',                year: 1976, genre: 'Sports',    poster: 'https://image.tmdb.org/t/p/w185/cqNFmBgBSFpCFoXELfNgXVNJ0bH.jpg' },
  { tmdbId: 19140, title: 'Pride of the Yankees', year: 1942, genre: 'Sports',    poster: 'https://image.tmdb.org/t/p/w185/k9YJMdFD6c7G4N2aT5rAmBESmdi.jpg' },
  { tmdbId: 5693,  title: 'Hoosiers',             year: 1986, genre: 'Sports',    poster: 'https://image.tmdb.org/t/p/w185/rGcRCBjYiXzR2OTwPYM9dHBZFCG.jpg' },
  { tmdbId: 287,   title: 'Bull Durham',          year: 1988, genre: 'Sports',    poster: 'https://image.tmdb.org/t/p/w185/u8I4iyLGhEJ4JJPBj4UJ0RBOXfM.jpg' },
  { tmdbId: 990,   title: 'The Hustler',          year: 1961, genre: 'Sports',    poster: 'https://image.tmdb.org/t/p/w185/c6Gp3r0UCVzlE1uFV5E4sLBXtWL.jpg' },
  { tmdbId: 11977, title: 'Caddyshack',           year: 1980, genre: 'Sports',    poster: 'https://image.tmdb.org/t/p/w185/6WolUJdA7VMZSH8jFEPNJ1NHTQM.jpg' },
  { tmdbId: 20283, title: 'Breaking Away',        year: 1979, genre: 'Sports',    poster: 'https://image.tmdb.org/t/p/w185/lKqCcxE6JMp3HdnFTe7XSvVS5mU.jpg' },
  { tmdbId: 17641, title: 'National Velvet',      year: 1944, genre: 'Sports',    poster: 'https://image.tmdb.org/t/p/w185/fPDq7SiAHYbm7NBRC3JeqK8uEpK.jpg' },
  { tmdbId: 9390,  title: 'Jerry Maguire',        year: 1996, genre: 'Sports',    poster: 'https://image.tmdb.org/t/p/w185/tFM92vEPNjxBN4WTsAh2R8UqPJV.jpg' },
  // Mystery
  { tmdbId: 426,   title: 'Vertigo',              year: 1958, genre: 'Mystery',   poster: 'https://image.tmdb.org/t/p/w185/5TQr4XVi5IDXF3FkJCOLGPGFPHb.jpg' },
  { tmdbId: 829,   title: 'Chinatown',            year: 1974, genre: 'Mystery',   poster: 'https://image.tmdb.org/t/p/w185/dpVASB4Aazl6qFUTjFkFzQYsTxE.jpg' },
  { tmdbId: 567,   title: 'Rear Window',          year: 1954, genre: 'Mystery',   poster: 'https://image.tmdb.org/t/p/w185/ILVF0eJxHMddjxeQhswFtpMtqx.jpg' },
  { tmdbId: 1939,  title: 'Laura',                year: 1944, genre: 'Mystery',   poster: 'https://image.tmdb.org/t/p/w185/nO8bHbSIKV7XjW8xeIFkepVFl7u.jpg' },
  { tmdbId: 1092,  title: 'The Third Man',        year: 1949, genre: 'Mystery',   poster: 'https://image.tmdb.org/t/p/w185/f9Yb2JL5o9bVJyBOYKhsVkWcVXx.jpg' },
  { tmdbId: 28257, title: 'The Maltese Falcon',   year: 1941, genre: 'Mystery',   poster: 'https://image.tmdb.org/t/p/w185/hSRCtBh1gUxP28k7P7NCJKMPWBF.jpg' },
  { tmdbId: 213,   title: 'North by Northwest',   year: 1959, genre: 'Mystery',   poster: 'https://image.tmdb.org/t/p/w185/4cRd1ia1GCyOVlDLqvhHmLhQ9s0.jpg' },
  { tmdbId: 793,   title: 'Blue Velvet',          year: 1986, genre: 'Mystery',   poster: 'https://image.tmdb.org/t/p/w185/qCp7gZdT2H1K7oFE7I2jNxMqJx7.jpg' },
  // Romantic Comedy
  { tmdbId: 901,   title: 'City Lights',          year: 1931, genre: 'Rom-Com',   poster: 'https://image.tmdb.org/t/p/w185/mJXNBg7g9LWZS42C7OLm9eqJJJw.jpg' },
  { tmdbId: 703,   title: 'Annie Hall',           year: 1977, genre: 'Rom-Com',   poster: 'https://image.tmdb.org/t/p/w185/m7pGzLPCge6MeNBPFo2VL7fOA9F.jpg' },
  { tmdbId: 3078,  title: 'It Happened One Night',year: 1934, genre: 'Rom-Com',   poster: 'https://image.tmdb.org/t/p/w185/yjVBe0hPeWPVF3WJQZB3T2jO9bD.jpg' },
  { tmdbId: 804,   title: 'Roman Holiday',        year: 1953, genre: 'Rom-Com',   poster: 'https://image.tmdb.org/t/p/w185/1aHJNkT56mVrHKkDk5c3QhlMPYt.jpg' },
  { tmdbId: 981,   title: 'The Philadelphia Story',year: 1940,genre: 'Rom-Com',   poster: 'https://image.tmdb.org/t/p/w185/3z5JBxIjABnN56hMqIRjN3QGdVV.jpg' },
  { tmdbId: 639,   title: 'When Harry Met Sally', year: 1989, genre: 'Rom-Com',   poster: 'https://image.tmdb.org/t/p/w185/bKoJBYEF0xLGkW59YH78FPrfPPC.jpg' },
  { tmdbId: 25431, title: "Adam's Rib",           year: 1949, genre: 'Rom-Com',   poster: 'https://image.tmdb.org/t/p/w185/tSuYkJUJ4SsGENRUkimV6Zb6F0v.jpg' },
  { tmdbId: 2039,  title: 'Moonstruck',           year: 1987, genre: 'Rom-Com',   poster: 'https://image.tmdb.org/t/p/w185/hD8wBXuFdJbvK1dIBNnIFzrPblS.jpg' },
  { tmdbId: 343,   title: 'Harold and Maude',     year: 1971, genre: 'Rom-Com',   poster: 'https://image.tmdb.org/t/p/w185/pBPzQmKmWVxUr1KcaRGI2RJpgzb.jpg' },
  { tmdbId: 858,   title: 'Sleepless in Seattle', year: 1993, genre: 'Rom-Com',   poster: 'https://image.tmdb.org/t/p/w185/z4tluoB6dqjjz7IYZ9pXbJT7r6M.jpg' },
  // Courtroom
  { tmdbId: 595,   title: 'To Kill a Mockingbird',year: 1962, genre: 'Courtroom', poster: 'https://image.tmdb.org/t/p/w185/bTKaBRBHmknGKqrIPFTPpE13yJu.jpg' },
  { tmdbId: 389,   title: '12 Angry Men',         year: 1957, genre: 'Courtroom', poster: 'https://image.tmdb.org/t/p/w185/ppd84D2i9W8jXmsyInGypsW9xDD.jpg' },
  { tmdbId: 24226, title: 'The Verdict',          year: 1982, genre: 'Courtroom', poster: 'https://image.tmdb.org/t/p/w185/5OVhb2QJRR1UcEFDELFhxjY5lsK.jpg' },
  { tmdbId: 881,   title: 'A Few Good Men',       year: 1992, genre: 'Courtroom', poster: 'https://image.tmdb.org/t/p/w185/yy8bKnEFtHreRiHEjbFnqc4UxqH.jpg' },
  { tmdbId: 37257, title: 'Witness for the Prosecution', year: 1957, genre: 'Courtroom', poster: 'https://image.tmdb.org/t/p/w185/k7kqwDUJRPCXkqO4Ll50dL6QHYY.jpg' },
  { tmdbId: 93,    title: 'Anatomy of a Murder',  year: 1959, genre: 'Courtroom', poster: 'https://image.tmdb.org/t/p/w185/f0gXSdWOy0YF0JaKB1ZrBpqm0LB.jpg' },
  { tmdbId: 18900, title: 'In Cold Blood',        year: 1967, genre: 'Courtroom', poster: 'https://image.tmdb.org/t/p/w185/eOyS8nrFHpZQJrVqG4emrY5H4L3.jpg' },
  { tmdbId: 35119, title: 'A Cry in the Dark',    year: 1988, genre: 'Courtroom', poster: 'https://image.tmdb.org/t/p/w185/2d8Pb2YtFGMnBLy0pAJRGJOiBl9.jpg' },
  { tmdbId: 821,   title: 'Judgment at Nuremberg',year: 1961, genre: 'Courtroom', poster: 'https://image.tmdb.org/t/p/w185/qRkVQqREI2DmNqHiQD8WQNXS1Kw.jpg' },
  // Epic
  { tmdbId: 947,   title: 'Lawrence of Arabia',   year: 1962, genre: 'Epic',      poster: 'https://image.tmdb.org/t/p/w185/AiAm0EtBvfj8FBsHUPLGNwUaWQk.jpg' },
  { tmdbId: 665,   title: 'Ben-Hur',              year: 1959, genre: 'Epic',      poster: 'https://image.tmdb.org/t/p/w185/aTbhDinFYOsGOHtUl2dkJy24DRn.jpg' },
  { tmdbId: 424,   title: "Schindler's List",     year: 1993, genre: 'Epic',      poster: 'https://image.tmdb.org/t/p/w185/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg' },
  { tmdbId: 770,   title: 'Gone with the Wind',   year: 1939, genre: 'Epic',      poster: 'https://image.tmdb.org/t/p/w185/8lnx0FJVijhBFxWPWPkXoOUaFSY.jpg' },
  { tmdbId: 967,   title: 'Spartacus',            year: 1960, genre: 'Epic',      poster: 'https://image.tmdb.org/t/p/w185/umuCiRi3a0I43dBfVtlbQ0VHPXH.jpg' },
  { tmdbId: 597,   title: 'Titanic',              year: 1997, genre: 'Epic',      poster: 'https://image.tmdb.org/t/p/w185/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg' },
  { tmdbId: 857,   title: 'Saving Private Ryan',  year: 1998, genre: 'Epic',      poster: 'https://image.tmdb.org/t/p/w185/uqx37cS8flSXch5HUIzR9DSACBB.jpg' },
];

const GENRES = ['Animation', 'Fantasy', 'Gangster', 'Sci-Fi', 'Western', 'Sports', 'Mystery', 'Rom-Com', 'Courtroom', 'Epic'];

// ─── Cold start picker ───────────────────────────────────────────────────────
function ColdStart({ onDone }) {
  const [activeGenre, setActiveGenre] = useState('Animation');
  const [marked, setMarked] = useState({}); // { tmdbId: 'seen' | 'saved' }

  const movies = COLD_START_MOVIES.filter(m => m.genre === activeGenre);
  const totalMarked = Object.keys(marked).length;

  const handleMark = (movie, type) => {
    const key = String(movie.tmdbId);
    const movieObj = { title: movie.title, year: movie.year, tmdbId: movie.tmdbId, poster: movie.poster };

    setMarked(prev => {
      const next = { ...prev };
      if (prev[key] === type) {
        // Deselect
        delete next[key];
        if (type === 'seen') FavoritesManager.toggleHeart(movieObj);
        else FavoritesManager.toggleBookmark(movieObj);
      } else {
        // Switch or select
        if (prev[key] && prev[key] !== type) {
          // Remove old mark first
          if (prev[key] === 'seen') FavoritesManager.toggleHeart(movieObj);
          else FavoritesManager.toggleBookmark(movieObj);
        }
        next[key] = type;
        if (type === 'seen') FavoritesManager.toggleHeart(movieObj);
        else FavoritesManager.toggleBookmark(movieObj);
      }
      return next;
    });
  };

  return (
    <div style={cs.container}>
      <div style={cs.header}>
        <div style={cs.heading}>What have you seen?</div>
        <div style={cs.subheading}>Mark films to get personalized collection picks</div>
      </div>

      {/* Genre tabs */}
      <div style={cs.tabsWrapper}>
        <div style={cs.tabs}>
          {GENRES.map(g => (
            <button
              key={g}
              style={{ ...cs.tab, ...(activeGenre === g ? cs.tabActive : {}) }}
              onClick={() => setActiveGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Movie grid */}
      <div style={cs.grid}>
        {movies.map(movie => {
          const key = String(movie.tmdbId);
          const state = marked[key];
          return (
            <div key={movie.tmdbId} style={cs.movieItem}>
              <div style={{ position: 'relative' }}>
                <img
                  src={movie.poster}
                  alt={movie.title}
                  style={{ ...cs.moviePoster, ...(state ? cs.moviePosterMarked : {}) }}
                  onError={e => { e.target.style.backgroundColor = '#e5e7eb'; e.target.src = ''; }}
                />
                {/* Seen button */}
                <button
                  style={{ ...cs.btn, ...cs.btnSeen, ...(state === 'seen' ? cs.btnSeenActive : {}) }}
                  onClick={() => handleMark(movie, 'seen')}
                  title="Seen"
                >
                  ✓
                </button>
                {/* Save button */}
                <button
                  style={{ ...cs.btn, ...cs.btnSave, ...(state === 'saved' ? cs.btnSaveActive : {}) }}
                  onClick={() => handleMark(movie, 'saved')}
                  title="Want to see"
                >
                  +
                </button>
              </div>
              <div style={cs.movieTitle}>{movie.title}</div>
              <div style={cs.movieYear}>{movie.year}</div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {totalMarked > 0 && (
        <div style={cs.ctaBar}>
          <button style={cs.ctaBtn} onClick={onDone}>
            Find my collections ({totalMarked} film{totalMarked !== 1 ? 's' : ''}) →
          </button>
        </div>
      )}
    </div>
  );
}

const cs = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },
  header: {
    padding: '20px 16px 12px',
  },
  heading: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '4px',
  },
  subheading: {
    fontSize: '13px',
    color: '#6b7280',
  },
  tabsWrapper: {
    overflowX: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    borderBottom: '1px solid #f3f4f6',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '0 12px 0',
    width: 'max-content',
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: '8px 10px',
    fontSize: '13px',
    color: '#6b7280',
    cursor: 'pointer',
    fontWeight: '500',
    borderBottom: '2px solid transparent',
    whiteSpace: 'nowrap',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  tabActive: {
    color: '#111827',
    borderBottom: '2px solid #111827',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    padding: '16px',
  },
  movieItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  moviePoster: {
    width: '100%',
    aspectRatio: '2/3',
    objectFit: 'cover',
    borderRadius: '6px',
    display: 'block',
    backgroundColor: '#f3f4f6',
  },
  moviePosterMarked: {
    opacity: 0.7,
  },
  movieTitle: {
    fontSize: '10px',
    fontWeight: '500',
    color: '#374151',
    marginTop: '4px',
    lineHeight: '1.3',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  movieYear: {
    fontSize: '10px',
    color: '#9ca3af',
  },
  btn: {
    position: 'absolute',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  btnSeen: {
    bottom: '4px',
    left: '4px',
    backgroundColor: 'rgba(0,0,0,0.45)',
    color: '#ffffff',
  },
  btnSeenActive: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
  },
  btnSave: {
    bottom: '4px',
    right: '4px',
    backgroundColor: 'rgba(0,0,0,0.45)',
    color: '#ffffff',
  },
  btnSaveActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  ctaBar: {
    padding: '12px 16px 20px',
    position: 'sticky',
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTop: '1px solid #f3f4f6',
  },
  ctaBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#111827',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};

// ─── Main page ───────────────────────────────────────────────────────────────
export default function GeniusPage() {
  const router = useRouter();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showColdStart, setShowColdStart] = useState(false);

  const loadRecs = useCallback(() => {
    // Invalidate FavoritesManager cache so we read fresh localStorage
    FavoritesManager._cache.hearted = null;
    FavoritesManager._cache.bookmarked = null;

    const seenMovies = FavoritesManager.getHeartedMovies();
    const savedMovies = FavoritesManager.getBookmarkedMovies();

    const seenIds = seenMovies.map(m => m.tmdbId).filter(Boolean);
    const savedIds = savedMovies.map(m => m.tmdbId).filter(Boolean);

    if (seenIds.length === 0 && savedIds.length === 0) {
      setLoading(false);
      setShowColdStart(true);
      return;
    }

    setLoading(true);
    setShowColdStart(false);

    fetch('/api/genius-recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seenIds, savedIds }),
    })
      .then(r => r.json())
      .then(data => {
        const secs = data.sections || [];
        if (secs.length === 0) {
          setShowColdStart(true);
        } else {
          setSections(secs);
        }
      })
      .catch(err => {
        console.error('Genius recs error:', err);
        setShowColdStart(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRecs();
  }, [loadRecs]);

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Search */}
        <div style={styles.searchBar}>
          <SimpleSearch placeholder="Search movies..." />
        </div>

        <div style={styles.content}>
          {loading && (
            <div style={styles.skeletonWrapper}>
              <style>{`
                @keyframes shimmer {
                  0% { background-position: -600px 0; }
                  100% { background-position: 600px 0; }
                }
                .sk {
                  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
                  background-size: 600px 100%;
                  animation: shimmer 1.4s infinite linear;
                  border-radius: 6px;
                }
              `}</style>
              {[0, 1, 2].map(i => (
                <div key={i} style={styles.skeletonSection}>
                  <div className="sk" style={{ height: '14px', width: '220px', marginBottom: '12px' }} />
                  {[0, 1].map(j => (
                    <div className="sk" key={j} style={{ height: '72px', borderRadius: '10px', marginBottom: '10px' }} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {!loading && showColdStart && (
            <ColdStart onDone={loadRecs} />
          )}

          {!loading && !showColdStart && sections.map((section, i) => (
            <div key={i} style={styles.section}>
              {/* Section label */}
              <div style={styles.sectionLabel}>
                <span style={styles.because}>
                  {section.seedType === 'seen' ? 'Because you watched' : 'Because you saved'}
                </span>
                <span style={styles.seedTitle}> {section.seedMovie.title}</span>
              </div>

              {/* Collection cards */}
              {section.collections.map(collection => (
                <div
                  key={collection.id}
                  style={styles.card}
                  onClick={() => router.push(`/collection/${collection.id}`)}
                >
                  {/* Poster strip */}
                  <div style={styles.posterStrip}>
                    {collection.previewMovies.slice(0, 4).map((m, idx) => (
                      <img
                        key={idx}
                        src={m.poster_url}
                        alt={m.title}
                        style={styles.poster}
                      />
                    ))}
                  </div>

                  {/* Info */}
                  <div style={styles.cardInfo}>
                    <div style={styles.cardTitle}>{collection.title}</div>
                    <div style={styles.cardMeta}>
                      {collection.overlapCount} of your films
                      {collection.categories[0] ? ` · ${collection.categories[0]}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  searchBar: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '16px',
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '8px 0 40px',
  },

  skeletonWrapper: {
    padding: '16px',
  },

  skeletonSection: {
    marginBottom: '28px',
  },

  // Sections
  section: {
    padding: '16px 16px 8px',
    borderBottom: '1px solid #f3f4f6',
  },

  sectionLabel: {
    fontSize: '13px',
    marginBottom: '12px',
    lineHeight: '1.4',
  },

  because: {
    color: '#6b7280',
    fontWeight: '400',
  },

  seedTitle: {
    color: '#111827',
    fontWeight: '600',
  },

  // Collection card
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    cursor: 'pointer',
    borderTop: '1px solid #f9fafb',
  },

  posterStrip: {
    display: 'flex',
    gap: '3px',
    flexShrink: 0,
  },

  poster: {
    width: '36px',
    height: '54px',
    objectFit: 'cover',
    borderRadius: '4px',
    display: 'block',
  },

  cardInfo: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '3px',
    lineHeight: '1.3',
  },

  cardMeta: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '400',
  },
};
