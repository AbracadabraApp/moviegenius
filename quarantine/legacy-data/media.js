// lib/media.js
import afi100 from '../data/afi100.json';

// Helper function to generate consistent IDs
function generateMediaId(title, year) {
  return `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
}

// Combine AFI 100 movies with any custom media
const customMedia = [
  {
    id: 'heat',
    title: 'Heat',
    year: 1995,
    poster: '/posters/heat.jpg',
    slug: 'A heist crime film with intense performances and unforgettable shootouts.',
    description:
      'Heat is a 1995 American crime film written and directed by Michael Mann. The film stars Al Pacino and Robert De Niro as a Los Angeles Police Department detective and a career thief, respectively, while exploring their dedication to their respective sides of the law.',
  },
  {
    id: 'pulp-fiction',
    title: 'Pulp Fiction',
    year: 1994,
    poster: '/posters/pulp-fiction.jpg',
    slug: 'An iconic crime film with sharply written dialogue.',
    description:
      'Pulp Fiction is a 1994 American crime film directed by Quentin Tarantino. The film tells several stories of criminal Los Angeles, interwoven in a complex narrative structure.',
  },
];

// Convert AFI 100 movies to media format with generated IDs and descriptions
const afi100Media = afi100.map(movie => ({
  ...movie,
  id: generateMediaId(movie.title, movie.year),
  description: `${movie.title} (${movie.year}) - ${movie.slug} This classic film is part of the American Film Institute's list of the 100 greatest American films of all time.`,
}));

// Combine all media
const mediaList = [...afi100Media, ...customMedia];

export function getMediaById(id) {
  return mediaList.find(m => m.id === id);
}

export function getAllMedia() {
  return mediaList;
}

export { generateMediaId };
