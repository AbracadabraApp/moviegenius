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

// ─── Cold start movie catalog (AFI Top 100 + Criterion) ──────────────────────
const COLD_START_MOVIES_RAW = [
  { tmdbId: 389,  title: '12 Angry Men',                              year: 1957, poster: 'https://image.tmdb.org/t/p/w185/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg' },
  { tmdbId: 62,   title: '2001: A Space Odyssey',                     year: 1968, poster: 'https://image.tmdb.org/t/p/w185/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg' },
  { tmdbId: 422,  title: '8½',                                        year: 1963, poster: 'https://image.tmdb.org/t/p/w185/ja0uRnwFwnVFJlNMYL10orpjWtq.jpg' },
  { tmdbId: 185,  title: 'A Clockwork Orange',                        year: 1971, poster: 'https://image.tmdb.org/t/p/w185/4sHeTAp65WrSSuc05nRBKddhBxO.jpg' },
  { tmdbId: 25431,title: "Adam's Rib",                                year: 1949, poster: 'https://image.tmdb.org/t/p/w185/k9gT6d2sDT9Jd4dvzHowTt3l6Zg.jpg' },
  { tmdbId: 704,  title: "A Hard Day's Night",                        year: 1964, poster: 'https://image.tmdb.org/t/p/w185/6Ulsccp2VkaVU5qbya3bxm9JG4x.jpg' },
  { tmdbId: 348,  title: 'Alien',                                     year: 1979, poster: 'https://image.tmdb.org/t/p/w185/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg' },
  { tmdbId: 143,  title: 'All Quiet on the Western Front',            year: 1930, poster: 'https://image.tmdb.org/t/p/w185/1wZUB08igw8iLUgF1r4T6aJD65b.jpg' },
  { tmdbId: 7857, title: 'Amarcord',                                  year: 1973, poster: 'https://image.tmdb.org/t/p/w185/g3UKJ5LgVpycOxeusBI6IXa40kY.jpg' },
  { tmdbId: 93,   title: 'Anatomy of a Murder',                       year: 1959, poster: 'https://image.tmdb.org/t/p/w185/b2G1QSAwtBv9luhEwErIgSRaU92.jpg' },
  { tmdbId: 895,  title: 'Andrei Rublev',                             year: 1966, poster: 'https://image.tmdb.org/t/p/w185/910xRIUmNJrWH2hkQifBJtoPp5R.jpg' },
  { tmdbId: 703,  title: 'Annie Hall',                                year: 1977, poster: 'https://image.tmdb.org/t/p/w185/dEtjPywhDbAXYjoFfhBC4U9unU7.jpg' },
  { tmdbId: 105,  title: 'Back to the Future',                        year: 1985, poster: 'https://image.tmdb.org/t/p/w185/fNOH9fm1GBe5UMplB2my1GFMpWL.jpg' },
  { tmdbId: 3170, title: 'Bambi',                                     year: 1942, poster: 'https://image.tmdb.org/t/p/w185/wV9e2y4myJ4KMFsyFfWYcUOawyK.jpg' },
  { tmdbId: 10020,title: 'Beauty and the Beast',                      year: 1991, poster: 'https://image.tmdb.org/t/p/w185/hUJ0UvQ5tgE2Z9WpfuduVSdiCiU.jpg' },
  { tmdbId: 648,  title: 'Beauty and the Beast',                      year: 1946, poster: 'https://image.tmdb.org/t/p/w185/iYSe3yrkma0e1B0wWPXgr8w5sDN.jpg' },
  { tmdbId: 649,  title: 'Belle de Jour',                             year: 1967, poster: 'https://image.tmdb.org/t/p/w185/iUAFECovwPA0cVV9bo4uNGLJSGL.jpg' },
  { tmdbId: 665,  title: 'Ben-Hur',                                   year: 1959, poster: 'https://image.tmdb.org/t/p/w185/m4WQ1dBIrEIHZNCoAjdpxwSKWyH.jpg' },
  { tmdbId: 5156, title: 'Bicycle Thieves',                           year: 1948, poster: 'https://image.tmdb.org/t/p/w185/abmxGiCV04NQj4jngbSQTGLgiC1.jpg' },
  { tmdbId: 2280, title: 'Big',                                       year: 1988, poster: 'https://image.tmdb.org/t/p/w185/eWhCDJiwxvx3YXkAFRiHjimnF0j.jpg' },
  { tmdbId: 78,   title: 'Blade Runner',                              year: 1982, poster: 'https://image.tmdb.org/t/p/w185/63N9uy8nd9j7Ei51cFelk3QqCwH.jpg' },
  { tmdbId: 793,  title: 'Blue Velvet',                               year: 1986, poster: 'https://image.tmdb.org/t/p/w185/7hlgzJXLgyECS1mk3LSN3E72l5N.jpg' },
  { tmdbId: 475,  title: 'Bonnie and Clyde',                          year: 1967, poster: 'https://image.tmdb.org/t/p/w185/sCSQFK9kMsprT4jgWqgw82dT6WI.jpg' },
  { tmdbId: 20283,title: 'Breaking Away',                             year: 1979, poster: 'https://image.tmdb.org/t/p/w185/k7b5GsVJK1hfdwoYqcczN9pBba6.jpg' },
  { tmdbId: 851,  title: 'Brief Encounter',                           year: 1945, poster: 'https://image.tmdb.org/t/p/w185/jC9EwLJcGhYMSQAHu2LxkKN5v7O.jpg' },
  { tmdbId: 287,  title: 'Bull Durham',                               year: 1988, poster: 'https://image.tmdb.org/t/p/w185/q3T9bO6p74NcTxWOhdUA6fASQ5T.jpg' },
  { tmdbId: 642,  title: 'Butch Cassidy and the Sundance Kid',        year: 1969, poster: 'https://image.tmdb.org/t/p/w185/gFmmykF1Ym3OGzENo50nZQaD1dx.jpg' },
  { tmdbId: 11977,title: 'Caddyshack',                                year: 1980, poster: 'https://image.tmdb.org/t/p/w185/lXnNz7zOXCsftMDVoU3VSo0Eioi.jpg' },
  { tmdbId: 829,  title: 'Chinatown',                                 year: 1974, poster: 'https://image.tmdb.org/t/p/w185/kZRSP3FmOcq0xnBulqpUQngJUXY.jpg' },
  { tmdbId: 11104,title: 'Chungking Express',                         year: 1994, poster: 'https://image.tmdb.org/t/p/w185/43I9DcNoCzpyzK8JCkJYpHqHqGG.jpg' },
  { tmdbId: 11224,title: 'Cinderella',                                year: 1950, poster: 'https://image.tmdb.org/t/p/w185/4nssBcQUBadCTBjrAkX46mVEKts.jpg' },
  { tmdbId: 901,  title: 'City Lights',                               year: 1931, poster: 'https://image.tmdb.org/t/p/w185/ugmakEL5y294I5bXgiBqApuZpwc.jpg' },
  { tmdbId: 499,  title: 'Cléo from 5 to 7',                          year: 1962, poster: 'https://image.tmdb.org/t/p/w185/oelBStY4xpguaplRv15P3Za7Xsr.jpg' },
  { tmdbId: 25237,title: 'Come and See',                              year: 1985, poster: 'https://image.tmdb.org/t/p/w185/qNbMsKVzigERgJUbwf8pKyZogpb.jpg' },
  { tmdbId: 827,  title: 'Diabolique',                                year: 1955, poster: 'https://image.tmdb.org/t/p/w185/jE8ygUYBUGyUcM4sR6iinPqYeDK.jpg' },
  { tmdbId: 521,  title: 'Dial M for Murder',                         year: 1954, poster: 'https://image.tmdb.org/t/p/w185/clyd4ONJgWYSw1a0UdlbZ6NYrNo.jpg' },
  { tmdbId: 985,  title: 'Eraserhead',                                year: 1977, poster: 'https://image.tmdb.org/t/p/w185/mxveW3mGVc0DzLdOmtkZsgd7c3B.jpg' },
  { tmdbId: 601,  title: 'E.T. the Extra-Terrestrial',                year: 1982, poster: 'https://image.tmdb.org/t/p/w185/an0nD6uq6byfxXCfk6lQBzdL2J1.jpg' },
  { tmdbId: 5961, title: 'Fanny and Alexander',                       year: 1982, poster: 'https://image.tmdb.org/t/p/w185/q8jlA3Wc1Z987hNKRFA44g5OugC.jpg' },
  { tmdbId: 756,  title: 'Fantasia',                                  year: 1940, poster: 'https://image.tmdb.org/t/p/w185/5m9njnidjR0syG2gpVPVgcEMB2X.jpg' },
  { tmdbId: 2323, title: 'Field of Dreams',                           year: 1989, poster: 'https://image.tmdb.org/t/p/w185/vL7F8T9B6r4Uztpe1Hw4o63I1m1.jpg' },
  { tmdbId: 12,   title: 'Finding Nemo',                              year: 2003, poster: 'https://image.tmdb.org/t/p/w185/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg' },
  { tmdbId: 770,  title: 'Gone with the Wind',                        year: 1939, poster: 'https://image.tmdb.org/t/p/w185/lNz2Ow0wGCAvzckW7EOjE03KcYv.jpg' },
  { tmdbId: 769,  title: 'Goodfellas',                                year: 1990, poster: 'https://image.tmdb.org/t/p/w185/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg' },
  { tmdbId: 137,  title: 'Groundhog Day',                             year: 1993, poster: 'https://image.tmdb.org/t/p/w185/gCgt1WARPZaXnq523ySQEUKinCs.jpg' },
  { tmdbId: 343,  title: 'Harold and Maude',                          year: 1971, poster: 'https://image.tmdb.org/t/p/w185/t7qEuGwDjcYu8ajaKZ68DeDnOxw.jpg' },
  { tmdbId: 11787,title: 'Harvey',                                    year: 1950, poster: 'https://image.tmdb.org/t/p/w185/dgd82hYmpiXDM1G867HqNaWe8wj.jpg' },
  { tmdbId: 288,  title: 'High Noon',                                 year: 1952, poster: 'https://image.tmdb.org/t/p/w185/qETSMQ4IXBSAS409Z9OL0ppXWTW.jpg' },
  { tmdbId: 5693, title: 'Hoosiers',                                  year: 1986, poster: 'https://image.tmdb.org/t/p/w185/dHpjZQXEdoi1xNLubM1rPmTHJYz.jpg' },
  { tmdbId: 3782, title: 'Ikiru',                                     year: 1952, poster: 'https://image.tmdb.org/t/p/w185/dgNTS4EQDDVfkzJI5msKuHu2Ei3.jpg' },
  { tmdbId: 18900,title: 'In Cold Blood',                             year: 1967, poster: 'https://image.tmdb.org/t/p/w185/f4zGKntOVVJUk9X0wCcw1DJPdQe.jpg' },
  { tmdbId: 843,  title: 'In the Mood for Love',                      year: 2000, poster: 'https://image.tmdb.org/t/p/w185/8BgGbbWiLNhPtkMkN0gGTnbtvBv.jpg' },
  { tmdbId: 11549,title: 'Invasion of the Body Snatchers',            year: 1956, poster: 'https://image.tmdb.org/t/p/w185/8BrMQmgwGzIHSyBjCDOLOdi79fJ.jpg' },
  { tmdbId: 3078, title: 'It Happened One Night',                     year: 1934, poster: 'https://image.tmdb.org/t/p/w185/2PNUGWAflH6UUumas0POMmokHlc.jpg' },
  { tmdbId: 1585, title: "It's a Wonderful Life",                     year: 1946, poster: 'https://image.tmdb.org/t/p/w185/bSqt9rhDZx1Q7UZ86dBPKdNomp2.jpg' },
  { tmdbId: 9390, title: 'Jerry Maguire',                             year: 1996, poster: 'https://image.tmdb.org/t/p/w185/lABvGN7fDk5ifnwZoxij6G96t2w.jpg' },
  { tmdbId: 821,  title: 'Judgment at Nuremberg',                     year: 1961, poster: 'https://image.tmdb.org/t/p/w185/b6vYatvui1EXeFYfpDX4rcbueuP.jpg' },
  { tmdbId: 1628, title: 'Jules and Jim',                             year: 1962, poster: 'https://image.tmdb.org/t/p/w185/kuFjZlcZhQFDtIjuI3GQJjsQG03.jpg' },
  { tmdbId: 244,  title: 'King Kong',                                 year: 1933, poster: 'https://image.tmdb.org/t/p/w185/lHlnxKL5GbgRibyRFI7n1Ey850i.jpg' },
  { tmdbId: 12102,title: 'Kramer vs. Kramer',                         year: 1979, poster: 'https://image.tmdb.org/t/p/w185/gmkGQQpvOq52icAer3vriT5S25O.jpg' },
  { tmdbId: 406,  title: 'La Haine',                                  year: 1995, poster: 'https://image.tmdb.org/t/p/w185/fFVWBMKLwwPh9K0hkrKwPUf8mwn.jpg' },
  { tmdbId: 405,  title: 'La Strada',                                 year: 1954, poster: 'https://image.tmdb.org/t/p/w185/rwjbT0zlsUDMztaCcWjlWuxaEL1.jpg' },
  { tmdbId: 20530,title: 'Late Spring',                               year: 1949, poster: 'https://image.tmdb.org/t/p/w185/iNtRSY2AGjW1VDXDR79bKsNUdus.jpg' },
  { tmdbId: 1939, title: 'Laura',                                     year: 1944, poster: 'https://image.tmdb.org/t/p/w185/j0zEiFFrdbZnMXqD3piOtZBJeNB.jpg' },
  { tmdbId: 5165, title: "L'Avventura",                               year: 1960, poster: 'https://image.tmdb.org/t/p/w185/7kUXAS8K7Ihw1T1mhARjnLuMVk3.jpg' },
  { tmdbId: 947,  title: 'Lawrence of Arabia',                        year: 1962, poster: 'https://image.tmdb.org/t/p/w185/AiAm0EtDvyGqNpVoieRw4u65vD1.jpg' },
  { tmdbId: 5511, title: 'Le Samouraï',                               year: 1967, poster: 'https://image.tmdb.org/t/p/w185/5Fa6o5nfUPEatQ9b3OwEvdEdR7T.jpg' },
  { tmdbId: 27899,title: 'Little Caesar',                             year: 1931, poster: 'https://image.tmdb.org/t/p/w185/1K3Q1tAHHA5Sdtja2pPALBQevA7.jpg' },
  { tmdbId: 832,  title: 'M',                                         year: 1931, poster: 'https://image.tmdb.org/t/p/w185/7s6zEsOAY3LD5qvzljmKKzjnLiT.jpg' },
  { tmdbId: 29005,title: 'McCabe & Mrs. Miller',                      year: 1971, poster: 'https://image.tmdb.org/t/p/w185/eQ9hDaTNpZ4wb7FWdqoJcOCJBve.jpg' },
  { tmdbId: 11881,title: 'Miracle on 34th Street',                    year: 1947, poster: 'https://image.tmdb.org/t/p/w185/qyAc9X9XHloIqy3oJbbZ44Cw0Hm.jpg' },
  { tmdbId: 3082, title: 'Modern Times',                              year: 1936, poster: 'https://image.tmdb.org/t/p/w185/7uoiKOEjxBBW0AgDGQWrlfGQ90w.jpg' },
  { tmdbId: 2039, title: 'Moonstruck',                                year: 1987, poster: 'https://image.tmdb.org/t/p/w185/2mnVWpvsHEHHnfvLn1NXYVvBGl5.jpg' },
  { tmdbId: 1018, title: 'Mulholland Drive',                          year: 2001, poster: 'https://image.tmdb.org/t/p/w185/x7A59t6ySylr1L7aubOQEA480vM.jpg' },
  { tmdbId: 17641,title: 'National Velvet',                           year: 1944, poster: 'https://image.tmdb.org/t/p/w185/iUQfP3s967V3SIAbyomNT8z8MIf.jpg' },
  { tmdbId: 10331,title: 'Night of the Living Dead',                  year: 1968, poster: 'https://image.tmdb.org/t/p/w185/rb2NWyb008u1EcKCOyXs2Nmj0ra.jpg' },
  { tmdbId: 213,  title: 'North by Northwest',                        year: 1959, poster: 'https://image.tmdb.org/t/p/w185/kNOFPQrel9YFCVzI0DF8FnCEpCw.jpg' },
  { tmdbId: 655,  title: 'Paris, Texas',                              year: 1984, poster: 'https://image.tmdb.org/t/p/w185/mYYdCi54E2xVbUxCr03tMookv9Z.jpg' },
  { tmdbId: 5801, title: 'Pather Panchali',                           year: 1955, poster: 'https://image.tmdb.org/t/p/w185/frZj5djlU9hFEjMcL21RJZVuG5O.jpg' },
  { tmdbId: 10895,title: 'Pinocchio',                                 year: 1940, poster: 'https://image.tmdb.org/t/p/w185/bnZJrLRnoQHpzEJdka1KYfsAF3N.jpg' },
  { tmdbId: 19140,title: 'Pride of the Yankees',                      year: 1942, poster: 'https://image.tmdb.org/t/p/w185/tbSMm0IAa5WgTcyoeUn7AKAViVY.jpg' },
  { tmdbId: 680,  title: 'Pulp Fiction',                              year: 1994, poster: 'https://image.tmdb.org/t/p/w185/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg' },
  { tmdbId: 1578, title: 'Raging Bull',                               year: 1980, poster: 'https://image.tmdb.org/t/p/w185/1WV7WlTS8LI1L5NkCgjWT9GSW3O.jpg' },
  { tmdbId: 548,  title: 'Rashomon',                                  year: 1950, poster: 'https://image.tmdb.org/t/p/w185/vL7Xw04nFMHwnvXRFCmYYAzMUvY.jpg' },
  { tmdbId: 567,  title: 'Rear Window',                               year: 1954, poster: 'https://image.tmdb.org/t/p/w185/ILVF0eJxHMddjxeQhswFtpMtqx.jpg' },
  { tmdbId: 3089, title: 'Red River',                                 year: 1948, poster: 'https://image.tmdb.org/t/p/w185/jyNTsAzrIWB441OtvfbgKtx1kFS.jpg' },
  { tmdbId: 1366, title: 'Rocky',                                     year: 1976, poster: 'https://image.tmdb.org/t/p/w185/8kEun6U9hTddM7NEfLLCGQKU2Mp.jpg' },
  { tmdbId: 804,  title: 'Roman Holiday',                             year: 1953, poster: 'https://image.tmdb.org/t/p/w185/8lI9dmz1RH20FAqltkGelY1v4BE.jpg' },
  { tmdbId: 857,  title: 'Saving Private Ryan',                       year: 1998, poster: 'https://image.tmdb.org/t/p/w185/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg' },
  { tmdbId: 111,  title: 'Scarface',                                  year: 1983, poster: 'https://image.tmdb.org/t/p/w185/iQ5ztdjvteGeboxtmRdXEChJOHh.jpg' },
  { tmdbId: 877,  title: 'Scarface',                                  year: 1932, poster: 'https://image.tmdb.org/t/p/w185/y4E5oRiHMTFkEB12IIcpbKbKzDW.jpg' },
  { tmdbId: 424,  title: "Schindler's List",                          year: 1993, poster: 'https://image.tmdb.org/t/p/w185/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg' },
  { tmdbId: 346,  title: 'Seven Samurai',                             year: 1954, poster: 'https://image.tmdb.org/t/p/w185/lOMGc8bnSwQhS4XyE1S99uH8NXf.jpg' },
  { tmdbId: 3110, title: 'Shane',                                     year: 1953, poster: 'https://image.tmdb.org/t/p/w185/svr5ADpjXTCOQv8hmuJnB7I14Qv.jpg' },
  { tmdbId: 808,  title: 'Shrek',                                     year: 2001, poster: 'https://image.tmdb.org/t/p/w185/iB64vpL3dIObOtMZgX3RqdVdQDc.jpg' },
  { tmdbId: 858,  title: 'Sleepless in Seattle',                      year: 1993, poster: 'https://image.tmdb.org/t/p/w185/jAXfku1u1uaLGh4cUmK0ESf1pPu.jpg' },
  { tmdbId: 408,  title: 'Snow White and the Seven Dwarfs',           year: 1937, poster: 'https://image.tmdb.org/t/p/w185/3VAHfuNb6Z7UiW12iYKANSPBl8m.jpg' },
  { tmdbId: 967,  title: 'Spartacus',                                 year: 1960, poster: 'https://image.tmdb.org/t/p/w185/r0Fgg1GyZgzokaiw2HFQv3oPaL2.jpg' },
  { tmdbId: 995,  title: 'Stagecoach',                                year: 1939, poster: 'https://image.tmdb.org/t/p/w185/zgMnfnwWZ3nkx4t0bUDEKtW24O8.jpg' },
  { tmdbId: 1398, title: 'Stalker',                                   year: 1979, poster: 'https://image.tmdb.org/t/p/w185/1qhOyf5C4s9ZdvY8d5JDx9DFMeT.jpg' },
  { tmdbId: 11,   title: 'Star Wars',                                 year: 1977, poster: 'https://image.tmdb.org/t/p/w185/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg' },
  { tmdbId: 11830,title: 'Tampopo',                                   year: 1985, poster: 'https://image.tmdb.org/t/p/w185/2XLDb3RDQmtlxt5Snnig9W4moq4.jpg' },
  { tmdbId: 280,  title: 'Terminator 2: Judgment Day',                year: 1991, poster: 'https://image.tmdb.org/t/p/w185/5M0j0B18abtBI5gi2RhfjjurTqb.jpg' },
  { tmdbId: 17295,title: 'The Battle of Algiers',                     year: 1966, poster: 'https://image.tmdb.org/t/p/w185/2p3AFtOHFvP6OeVMqlnL1zLKOqL.jpg' },
  { tmdbId: 828,  title: 'The Day the Earth Stood Still',             year: 1951, poster: 'https://image.tmdb.org/t/p/w185/eslDNzf0LF1m9GsgUXlmyfTcC6Y.jpg' },
  { tmdbId: 238,  title: 'The Godfather',                             year: 1972, poster: 'https://image.tmdb.org/t/p/w185/3bhkrj58Vtu7enYsLlegkKXFhdf.jpg' },
  { tmdbId: 240,  title: 'The Godfather Part II',                     year: 1974, poster: 'https://image.tmdb.org/t/p/w185/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg' },
  { tmdbId: 990,  title: 'The Hustler',                               year: 1961, poster: 'https://image.tmdb.org/t/p/w185/snItsSViawjaadW9mlWUmGwR41R.jpg' },
  { tmdbId: 940,  title: 'The Lady Vanishes',                         year: 1938, poster: 'https://image.tmdb.org/t/p/w185/c1t9LB76LvEARPanfEzXmkm7fwY.jpg' },
  { tmdbId: 8587, title: 'The Lion King',                             year: 1994, poster: 'https://image.tmdb.org/t/p/w185/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg' },
  { tmdbId: 120,  title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001, poster: 'https://image.tmdb.org/t/p/w185/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg' },
  { tmdbId: 963,  title: 'The Maltese Falcon',                        year: 1941, poster: 'https://image.tmdb.org/t/p/w185/bf4o6Uzw5wqLjdKwRuiDrN1xyvl.jpg' },
  { tmdbId: 780,  title: 'The Passion of Joan of Arc',                year: 1928, poster: 'https://image.tmdb.org/t/p/w185/8OYGtQlO8k9PcOm49apV62eVJQo.jpg' },
  { tmdbId: 981,  title: 'The Philadelphia Story',                    year: 1940, poster: 'https://image.tmdb.org/t/p/w185/dKUubjvxO78XDts6VP1Ggcp4R9O.jpg' },
  { tmdbId: 17687,title: 'The Public Enemy',                          year: 1931, poster: 'https://image.tmdb.org/t/p/w185/vVxdaRMprQO2DM4AFyJ6C4qZSFO.jpg' },
  { tmdbId: 19542,title: 'The Red Shoes',                             year: 1948, poster: 'https://image.tmdb.org/t/p/w185/tRpm0MNYoMOgyumL9ePI3wB2P9V.jpg' },
  { tmdbId: 776,  title: 'The Rules of the Game',                     year: 1939, poster: 'https://image.tmdb.org/t/p/w185/8JOzt7uFZyshcuzCBmYU6CDJL4D.jpg' },
  { tmdbId: 3114, title: 'The Searchers',                             year: 1956, poster: 'https://image.tmdb.org/t/p/w185/jLBmgW0epNzJ1N9uzaVCjbyT94v.jpg' },
  { tmdbId: 1092, title: 'The Third Man',                             year: 1949, poster: 'https://image.tmdb.org/t/p/w185/rO2Fq0AZZx9obs52KJdx4mRE8p5.jpg' },
  { tmdbId: 629,  title: 'The Usual Suspects',                        year: 1995, poster: 'https://image.tmdb.org/t/p/w185/99X2SgyFunJFXGAYnDv3sb9pnUD.jpg' },
  { tmdbId: 24226,title: 'The Verdict',                               year: 1982, poster: 'https://image.tmdb.org/t/p/w185/m3DdNJZfBcsTiFe0SwsLChWavrG.jpg' },
  { tmdbId: 576,  title: 'The Wild Bunch',                            year: 1969, poster: 'https://image.tmdb.org/t/p/w185/8j9yEC3xjy1PJDSizIbaxcHaSph.jpg' },
  { tmdbId: 630,  title: 'The Wizard of Oz',                          year: 1939, poster: 'https://image.tmdb.org/t/p/w185/pfAZFD7I2hxW9HCChTuAzsdE6UX.jpg' },
  { tmdbId: 597,  title: 'Titanic',                                   year: 1997, poster: 'https://image.tmdb.org/t/p/w185/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg' },
  { tmdbId: 595,  title: 'To Kill a Mockingbird',                     year: 1962, poster: 'https://image.tmdb.org/t/p/w185/gZycFUMLx2110dzK3nBNai7gfpM.jpg' },
  { tmdbId: 18148,title: 'Tokyo Story',                               year: 1953, poster: 'https://image.tmdb.org/t/p/w185/g2YbTYKpY7N2yDSk7BfXZ18I5QV.jpg' },
  { tmdbId: 862,  title: 'Toy Story',                                 year: 1995, poster: 'https://image.tmdb.org/t/p/w185/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg' },
  { tmdbId: 33,   title: 'Unforgiven',                                year: 1992, poster: 'https://image.tmdb.org/t/p/w185/54roTwbX9fltg85zjsmrooXAs12.jpg' },
  { tmdbId: 426,  title: 'Vertigo',                                   year: 1958, poster: 'https://image.tmdb.org/t/p/w185/15uOEfqBNTVtDUT7hGBVCka0rZz.jpg' },
  { tmdbId: 639,  title: 'When Harry Met Sally',                      year: 1989, poster: 'https://image.tmdb.org/t/p/w185/rFOiFUhTMtDetqCGClC9PIgnC1P.jpg' },
  { tmdbId: 15794,title: 'White Heat',                                year: 1949, poster: 'https://image.tmdb.org/t/p/w185/v7cPOHKKZI9qChi7HDUxNIhEcLR.jpg' },
  { tmdbId: 614,  title: 'Wild Strawberries',                         year: 1957, poster: 'https://image.tmdb.org/t/p/w185/iyTD2QnySNMPUPE3IedZQipSWfz.jpg' },
  { tmdbId: 37257,title: 'Witness for the Prosecution',               year: 1957, poster: 'https://image.tmdb.org/t/p/w185/bCj4EfuehAlgBwVd3diyWyhuuau.jpg' },
  { tmdbId: 2721, title: 'Z',                                         year: 1969, poster: 'https://image.tmdb.org/t/p/w185/dFAJyFNgvOv24f2RQyI9KDxjGr3.jpg' },
];

// Shuffle once per session
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const COLD_START_MOVIES = shuffleArray(COLD_START_MOVIES_RAW);

// ─── Cold start picker ───────────────────────────────────────────────────────
function ColdStart({ onDone }) {
  const [saved, setSaved] = useState(new Set());

  const handleTap = (movie) => {
    const key = String(movie.tmdbId);
    const movieObj = { title: movie.title, year: movie.year, tmdbId: movie.tmdbId, poster: movie.poster };
    FavoritesManager.toggleBookmark(movieObj);
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div style={cs.container}>
      <div style={cs.header}>
        <div style={cs.heading}>Are any of these great movies on your Want to Watch list?</div>
        {saved.size > 0 && saved.size < MIN_SAVES && (
          <div style={cs.progress}>{saved.size} of {MIN_SAVES} to unlock Genius</div>
        )}
      </div>

      <div style={cs.grid}>
        {COLD_START_MOVIES.map(movie => {
          const isSaved = saved.has(String(movie.tmdbId));
          return (
            <div key={movie.tmdbId} style={cs.movieItem} onClick={() => handleTap(movie)}>
              <div style={cs.posterWrap}>
                <img
                  src={movie.poster}
                  alt={movie.title}
                  style={{ ...cs.poster, ...(isSaved ? cs.posterSaved : {}) }}
                  onError={e => { e.target.style.backgroundColor = '#e5e7eb'; e.target.src = ''; }}
                />
              </div>
              <div style={cs.movieTitle}>{movie.title}</div>
              <div style={{ ...cs.movieLabel, ...(isSaved ? cs.movieLabelSaved : {}) }}>
                {isSaved ? 'Added \u2713' : 'Want to Watch?'}
              </div>
            </div>
          );
        })}
      </div>

      {saved.size >= MIN_SAVES && (
        <div style={cs.ctaBar}>
          <button style={cs.ctaBtn} onClick={onDone}>Find my collections →</button>
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
    lineHeight: '1.3',
    marginBottom: '6px',
  },
  progress: {
    fontSize: '13px',
    color: '#2563eb',
    fontWeight: '600',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '8px 16px 16px',
  },
  movieItem: {
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
  },
  posterWrap: {
    aspectRatio: '2/3',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: '6px',
  },
  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    transition: 'opacity 0.15s',
  },
  posterSaved: {
    opacity: 0.6,
  },
  movieTitle: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#111827',
    lineHeight: '1.3',
    marginBottom: '2px',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  movieLabel: {
    fontSize: '11px',
    color: '#9ca3af',
    fontWeight: '400',
  },
  movieLabelSaved: {
    color: '#111827',
    fontWeight: '600',
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
const MIN_SAVES = 3;

export default function GeniusPage() {
  const router = useRouter();
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showColdStart, setShowColdStart] = useState(false);

  const loadFeed = useCallback(() => {
    FavoritesManager._cache.hearted = null;
    FavoritesManager._cache.bookmarked = null;

    const savedMovies = FavoritesManager.getBookmarkedMovies();
    const savedIds = savedMovies.map(m => m.tmdbId).filter(Boolean);

    if (savedIds.length < MIN_SAVES) {
      setLoading(false);
      setShowColdStart(true);
      return;
    }

    setLoading(true);
    setShowColdStart(false);

    fetch('/api/genius-feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedIds }),
    })
      .then(r => r.json())
      .then(data => {
        const items = data.items || [];
        if (items.length === 0) {
          setShowColdStart(true);
        } else {
          setFeedItems(items);
        }
      })
      .catch(() => setShowColdStart(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

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
            <ColdStart onDone={loadFeed} />
          )}

          {!loading && !showColdStart && (
            <div style={styles.collectionList}>
              {feedItems.map((item, i) => {
                if (item.type === 'movie') {
                  return (
                    <div
                      key={`movie-${item.tmdbId}-${i}`}
                      style={styles.mediaCard}
                      onClick={() => router.push(`/movie/${item.tmdbId}`)}
                    >
                      <div style={styles.mediaCardPoster}>
                        <img src={item.posterUrl} alt={item.title} style={styles.mediaCardImg} />
                      </div>
                      <div style={styles.mediaCardInfo}>
                        <div style={styles.mediaCardTitle}>{item.title}</div>
                        {item.year && <div style={styles.mediaCardYear}>{item.year}</div>}
                      </div>
                    </div>
                  );
                }

                if (item.type === 'collection') {
                  return (
                    <div key={`col-${item.collectionId}-${i}`} style={styles.section}>
                      <div
                        style={styles.sectionHeader}
                        onClick={() => router.push(`/collection/${item.collectionId}`)}
                      >
                        <span style={styles.sectionTitle}>{item.name}</span>
                        <span style={styles.sectionParent}>{item.collectionTitle}</span>
                      </div>
                      <div style={styles.movieGrid}>
                        {item.movies.slice(0, 6).map((m, idx) => (
                          <div
                            key={idx}
                            style={styles.posterWrapper}
                            onClick={() => router.push(`/movie/${m.tmdb_id}`)}
                          >
                            <div style={styles.posterContainer}>
                              <img src={m.poster_url} alt={m.title} style={styles.poster} />
                            </div>
                            <div style={styles.movieTitle}>{m.title}</div>
                            {m.year && <div style={styles.movieYear}>{m.year}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {/* Add more films link */}
              <div style={styles.miniToggleRow}>
                <button
                  style={styles.miniToggleBtn}
                  onClick={() => setShowColdStart(true)}
                >
                  Add more films →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  mediaCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    cursor: 'pointer',
  },
  mediaCardPoster: {
    width: '48px',
    height: '72px',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    flexShrink: 0,
  },
  mediaCardImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  mediaCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  mediaCardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#111827',
    lineHeight: '1.3',
    marginBottom: '2px',
  },
  mediaCardYear: {
    fontSize: '13px',
    color: '#9ca3af',
  },

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

  collectionList: {
    padding: '8px 0 40px',
  },

  section: {
    marginBottom: '32px',
  },

  sectionHeader: {
    padding: '0 16px 10px',
    cursor: 'pointer',
  },

  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
    letterSpacing: '-0.01em',
    display: 'block',
    lineHeight: '1.3',
  },

  sectionParent: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '400',
    display: 'block',
    marginTop: '2px',
  },

  movieGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    padding: '0 16px',
  },

  posterWrapper: {
    cursor: 'pointer',
  },

  posterContainer: {
    aspectRatio: '2/3',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: '6px',
  },

  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  movieTitle: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#111827',
    lineHeight: '1.3',
    marginBottom: '2px',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    hyphens: 'none',
  },

  movieYear: {
    fontSize: '11px',
    color: '#9ca3af',
  },

  miniToggleRow: {
    padding: '8px 16px 24px',
    display: 'flex',
    justifyContent: 'center',
  },

  miniToggleBtn: {
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: '20px',
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

};
