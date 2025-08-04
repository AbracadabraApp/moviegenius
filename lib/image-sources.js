/**
 * Alternative Image Sources Library
 * 
 * Provides multiple options for sourcing hero images automatically,
 * reducing dependency on manual Midjourney generation.
 */

// Unsplash API configuration
const UNSPLASH_CONFIG = {
  accessKey: process.env.UNSPLASH_ACCESS_KEY, // Add to your .env file
  baseUrl: 'https://api.unsplash.com',
  perPage: 12,
  orientation: 'landscape',
  // Collections for cinematic content
  collections: {
    cinema: '1154337', // Cinematic/film photography
    noir: '2563451',   // Film noir aesthetics  
    vintage: '1580530', // Vintage photography
    architecture: '162326', // Urban/architectural
    portraits: '1065976',   // Dramatic portraits
  }
};

// Pexels API configuration
const PEXELS_CONFIG = {
  apiKey: process.env.PEXELS_API_KEY, // Add to your .env file
  baseUrl: 'https://api.pexels.com/v1',
  perPage: 15,
  orientation: 'landscape',
};

// The Movie Database (TMDB) configuration for film stills
const TMDB_CONFIG = {
  apiKey: process.env.TMDB_API_KEY, // Your existing API key
  baseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p/original',
};

/**
 * UNSPLASH IMAGE SOURCING
 */
export class UnsplashSource {
  constructor() {
    this.accessKey = UNSPLASH_CONFIG.accessKey;
    this.baseUrl = UNSPLASH_CONFIG.baseUrl;
  }

  async searchImages(query, options = {}) {
    if (!this.accessKey) {
      throw new Error('Unsplash access key not configured');
    }

    const params = new URLSearchParams({
      client_id: this.accessKey,
      query: query,
      per_page: options.perPage || UNSPLASH_CONFIG.perPage,
      orientation: options.orientation || UNSPLASH_CONFIG.orientation,
      content_filter: 'high',
      order_by: 'relevance',
      ...options.params
    });

    try {
      const response = await fetch(`${this.baseUrl}/search/photos?${params}`);
      
      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.results.map(photo => ({
        id: photo.id,
        url: photo.urls.regular,
        downloadUrl: photo.urls.full,
        description: photo.description || photo.alt_description,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        unsplashUrl: photo.links.html,
        width: photo.width,
        height: photo.height,
        aspectRatio: photo.width / photo.height,
        suitable2to1: Math.abs((photo.width / photo.height) - 2) < 0.3, // Close to 2:1
        tags: photo.tags?.map(tag => tag.title) || [],
        source: 'unsplash'
      }));

    } catch (error) {
      console.error('Unsplash search error:', error);
      return [];
    }
  }

  async getCollectionPhotos(collectionId, page = 1) {
    const params = new URLSearchParams({
      client_id: this.accessKey,
      page: page,
      per_page: UNSPLASH_CONFIG.perPage,
      orientation: UNSPLASH_CONFIG.orientation
    });

    try {
      const response = await fetch(`${this.baseUrl}/collections/${collectionId}/photos?${params}`);
      const photos = await response.json();
      
      return photos.map(photo => ({
        id: photo.id,
        url: photo.urls.regular,
        downloadUrl: photo.urls.full,
        description: photo.description || photo.alt_description,
        photographer: photo.user.name,
        aspectRatio: photo.width / photo.height,
        suitable2to1: Math.abs((photo.width / photo.height) - 2) < 0.3,
        source: 'unsplash'
      }));

    } catch (error) {
      console.error('Unsplash collection error:', error);
      return [];
    }
  }

  // Episode-specific search queries
  getEpisodeSearchQueries(episode) {
    const title = episode.episode?.title?.toLowerCase() || '';
    const series = episode.series?.title?.toLowerCase() || '';
    const theme = episode.theme?.title?.toLowerCase() || '';

    const queries = [];

    // Film noir specific
    if (theme.includes('noir') || series.includes('noir')) {
      if (title.includes('german') || title.includes('expressionism')) {
        queries.push('german expressionism film shadows dramatic lighting');
        queries.push('angular shadows geometric lighting black white');
      } else if (title.includes('urban') || title.includes('anxiety')) {
        queries.push('urban noir cityscape dramatic shadows night');
        queries.push('city street film noir atmosphere');
      } else if (title.includes('femme') || title.includes('fatale')) {
        queries.push('film noir woman silhouette dramatic lighting');
        queries.push('mysterious woman shadow noir aesthetic');
      } else {
        queries.push('film noir cinematography dramatic lighting');
        queries.push('noir atmosphere urban night shadows');
      }
    }

    // Contemporary auteurs
    else if (series.includes('auteur') || series.includes('contemporary')) {
      if (title.includes('coen')) {
        queries.push('americana desert highway vintage diner');
        queries.push('quirky americana landscape retro');
      } else {
        queries.push('modern cinema film production artistic');
        queries.push('director cinematography professional film');
      }
    }

    // Technical evolution
    else if (series.includes('technical') || title.includes('digital')) {
      queries.push('film technology digital effects production');
      queries.push('movie studio equipment cinematography');
    }

    // Decades
    else if (title.includes('1970s')) {
      queries.push('1970s film production vintage camera');
      queries.push('retro filmmaker 70s cinematography');
    } else if (title.includes('1990s')) {
      queries.push('indie film festival 1990s alternative');
      queries.push('independent cinema handheld camera');
    }

    // Generic fallbacks
    else {
      queries.push('cinematic photography dramatic lighting');
      queries.push('film studies educational sophisticated');
    }

    return queries;
  }
}

/**
 * PEXELS IMAGE SOURCING
 */
export class PexelsSource {
  constructor() {
    this.apiKey = PEXELS_CONFIG.apiKey;
    this.baseUrl = PEXELS_CONFIG.baseUrl;
  }

  async searchImages(query, options = {}) {
    if (!this.apiKey) {
      throw new Error('Pexels API key not configured');
    }

    const params = new URLSearchParams({
      query: query,
      per_page: options.perPage || PEXELS_CONFIG.perPage,
      orientation: options.orientation || PEXELS_CONFIG.orientation,
      size: 'large',
      page: options.page || 1
    });

    try {
      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'Authorization': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.photos.map(photo => ({
        id: photo.id,
        url: photo.src.large,
        downloadUrl: photo.src.original,
        description: photo.alt,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        pexelsUrl: photo.url,
        width: photo.width,
        height: photo.height,
        aspectRatio: photo.width / photo.height,
        suitable2to1: Math.abs((photo.width / photo.height) - 2) < 0.3,
        avgColor: photo.avg_color,
        source: 'pexels'
      }));

    } catch (error) {
      console.error('Pexels search error:', error);
      return [];
    }
  }
}

/**
 * TMDB FILM STILLS SOURCING
 */
export class TMDBStillsSource {
  constructor() {
    this.apiKey = TMDB_CONFIG.apiKey;
    this.baseUrl = TMDB_CONFIG.baseUrl;
    this.imageBaseUrl = TMDB_CONFIG.imageBaseUrl;
  }

  async getMovieBackdrops(movieTitle, year) {
    try {
      // Search for movie
      const searchParams = new URLSearchParams({
        api_key: this.apiKey,
        query: movieTitle,
        year: year,
        include_adult: false
      });

      const searchResponse = await fetch(`${this.baseUrl}/search/movie?${searchParams}`);
      const searchData = await searchResponse.json();

      if (!searchData.results || searchData.results.length === 0) {
        return [];
      }

      const movieId = searchData.results[0].id;

      // Get movie images
      const imagesResponse = await fetch(`${this.baseUrl}/movie/${movieId}/images?api_key=${this.apiKey}`);
      const imagesData = await imagesResponse.json();

      if (!imagesData.backdrops) {
        return [];
      }

      return imagesData.backdrops
        .filter(backdrop => backdrop.aspect_ratio >= 1.5) // Landscape orientation
        .sort((a, b) => b.vote_average - a.vote_average) // Best rated first
        .slice(0, 10) // Top 10
        .map(backdrop => ({
          id: `tmdb-${movieId}-${backdrop.file_path}`,
          url: `${this.imageBaseUrl}${backdrop.file_path}`,
          downloadUrl: `${this.imageBaseUrl}${backdrop.file_path}`,
          description: `${movieTitle} (${year}) - Official backdrop`,
          width: backdrop.width,
          height: backdrop.height,
          aspectRatio: backdrop.aspect_ratio,
          suitable2to1: Math.abs(backdrop.aspect_ratio - 2) < 0.5,
          rating: backdrop.vote_average,
          language: backdrop.iso_639_1,
          source: 'tmdb'
        }));

    } catch (error) {
      console.error('TMDB stills error:', error);
      return [];
    }
  }

  // Get backdrops from movies mentioned in episode content
  async getEpisodeRelatedStills(episode) {
    const results = [];
    
    if (episode.content?.sections) {
      for (const section of episode.content.sections) {
        if (section.type === 'movies' && section.movies) {
          for (const movie of section.movies.slice(0, 2)) { // Limit to first 2 movies
            const stills = await this.getMovieBackdrops(movie.title, movie.year);
            results.push(...stills);
          }
        }
      }
    }

    return results;
  }
}

/**
 * UNIFIED IMAGE SOURCING MANAGER
 */
export class ImageSourceManager {
  constructor() {
    this.unsplash = new UnsplashSource();
    this.pexels = new PexelsSource();
    this.tmdb = new TMDBStillsSource();
  }

  async findEpisodeImages(episode, options = {}) {
    const results = {
      unsplash: [],
      pexels: [],
      tmdb: [],
      total: 0,
      suitable2to1: []
    };

    try {
      // Parallel searches across all sources
      const searches = await Promise.allSettled([
        this.searchUnsplash(episode, options),
        this.searchPexels(episode, options),
        this.searchTMDB(episode, options)
      ]);

      // Process results
      if (searches[0].status === 'fulfilled') {
        results.unsplash = searches[0].value;
      }
      if (searches[1].status === 'fulfilled') {
        results.pexels = searches[1].value;
      }
      if (searches[2].status === 'fulfilled') {
        results.tmdb = searches[2].value;
      }

      // Combine and filter results
      const allImages = [...results.unsplash, ...results.pexels, ...results.tmdb];
      results.total = allImages.length;
      results.suitable2to1 = allImages.filter(img => img.suitable2to1);

      // Sort by suitability and quality
      results.suitable2to1.sort((a, b) => {
        // Prefer TMDB (official movie stills) for film content
        if (a.source === 'tmdb' && b.source !== 'tmdb') return -1;
        if (b.source === 'tmdb' && a.source !== 'tmdb') return 1;
        
        // Then by aspect ratio closeness to 2:1
        const aDiff = Math.abs(a.aspectRatio - 2);
        const bDiff = Math.abs(b.aspectRatio - 2);
        return aDiff - bDiff;
      });

      return results;

    } catch (error) {
      console.error('Image source manager error:', error);
      return results;
    }
  }

  async searchUnsplash(episode, options) {
    const queries = this.unsplash.getEpisodeSearchQueries(episode);
    const images = [];

    for (const query of queries.slice(0, 2)) { // Limit queries
      const results = await this.unsplash.searchImages(query, {
        perPage: 6,
        ...options.unsplash
      });
      images.push(...results);
    }

    return images;
  }

  async searchPexels(episode, options) {
    const queries = this.unsplash.getEpisodeSearchQueries(episode); // Reuse query logic
    const images = [];

    for (const query of queries.slice(0, 2)) {
      const results = await this.pexels.searchImages(query, {
        perPage: 6,
        ...options.pexels
      });
      images.push(...results);
    }

    return images;
  }

  async searchTMDB(episode, options) {
    return await this.tmdb.getEpisodeRelatedStills(episode);
  }

  // Download and process image for use
  async downloadImage(imageResult, targetPath) {
    try {
      const response = await fetch(imageResult.downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      
      // Here you could add image processing (resize, crop to 2:1, etc.)
      // For now, we'll just save the original
      
      await require('fs').promises.writeFile(targetPath, Buffer.from(buffer));
      
      return {
        success: true,
        path: targetPath,
        source: imageResult.source,
        attribution: {
          photographer: imageResult.photographer,
          source: imageResult.source,
          url: imageResult.unsplashUrl || imageResult.pexelsUrl
        }
      };

    } catch (error) {
      console.error('Image download error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Configuration helper
export function configureImageSources() {
  const missing = [];
  
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    missing.push('UNSPLASH_ACCESS_KEY');
  }
  if (!process.env.PEXELS_API_KEY) {
    missing.push('PEXELS_API_KEY');
  }
  if (!process.env.TMDB_API_KEY) {
    missing.push('TMDB_API_KEY');
  }

  if (missing.length > 0) {
    console.warn(`Missing API keys: ${missing.join(', ')}`);
    console.warn('Add these to your .env file to enable all image sources');
  }

  return {
    unsplashEnabled: !!process.env.UNSPLASH_ACCESS_KEY,
    pexelsEnabled: !!process.env.PEXELS_API_KEY,
    tmdbEnabled: !!process.env.TMDB_API_KEY,
    missing
  };
}

export default ImageSourceManager;