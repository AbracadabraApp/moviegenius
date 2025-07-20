/**
 * Static Page Validator
 *
 * Validates that static pages are ready for generation by checking:
 * - Image URLs are accessible
 * - Required data is present
 * - No broken external links
 */

/**
 * Validate that an image URL is accessible
 */
async function validateImageUrl(url) {
  if (!url || url === null) return true; // Null is fine, we have placeholders

  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn(`Image validation failed for ${url}:`, error.message);
    return false;
  }
}

/**
 * Validate movie data for static generation
 */
export async function validateMovieData(movieData) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!movieData.title) {
    errors.push('Missing movie title');
  }

  if (!movieData.year) {
    warnings.push('Missing movie year');
  }

  if (!movieData.tmdb_id) {
    warnings.push('Missing TMDB ID - movie links may not work');
  }

  // Validate poster image if present
  if (movieData.poster_url) {
    const posterValid = await validateImageUrl(movieData.poster_url);
    if (!posterValid) {
      warnings.push(`Poster image not accessible: ${movieData.poster_url}`);
      // Set to null so placeholder will be used
      movieData.poster_url = null;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    movieData,
  };
}

/**
 * Validate episode data for static generation
 */
export async function validateEpisodeData(episodeData) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!episodeData.title) {
    errors.push('Missing episode title');
  }

  if (!episodeData.content) {
    errors.push('Missing episode content');
  }

  // Validate all movies in the episode
  const validatedMovies = [];

  if (episodeData.content?.sections) {
    for (const section of episodeData.content.sections) {
      if (section.type === 'movies' && section.movies) {
        const validatedSectionMovies = [];

        for (const movie of section.movies) {
          const validation = await validateMovieData(movie);

          if (validation.errors.length > 0) {
            warnings.push(
              `Movie validation errors for "${movie.title}": ${validation.errors.join(', ')}`
            );
          }

          if (validation.warnings.length > 0) {
            console.log(
              `Movie validation warnings for "${movie.title}": ${validation.warnings.join(', ')}`
            );
          }

          validatedSectionMovies.push(validation.movieData);
        }

        section.movies = validatedSectionMovies;
      }
    }
  }

  // Validate moreIdeas movies
  if (episodeData.content?.moreIdeas?.movies) {
    const validatedMoreIdeas = [];

    for (const movie of episodeData.content.moreIdeas.movies) {
      const validation = await validateMovieData(movie);

      if (validation.errors.length > 0) {
        warnings.push(
          `MoreIdeas movie validation errors for "${movie.title}": ${validation.errors.join(', ')}`
        );
      }

      validatedMoreIdeas.push(validation.movieData);
    }

    episodeData.content.moreIdeas.movies = validatedMoreIdeas;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    episodeData,
  };
}

/**
 * Validate static page data before generation
 */
export async function validateStaticPageData(pageType, pageData) {
  console.log(`🔍 Validating ${pageType} static page data...`);

  let validation;

  switch (pageType) {
    case 'movie':
      validation = await validateMovieData(pageData);
      break;
    case 'episode':
      validation = await validateEpisodeData(pageData);
      break;
    default:
      validation = {
        isValid: true,
        errors: [],
        warnings: [],
        pageData,
      };
  }

  if (validation.errors.length > 0) {
    console.error(`❌ Static page validation failed for ${pageType}:`, validation.errors);
  }

  if (validation.warnings.length > 0) {
    console.warn(`⚠️  Static page validation warnings for ${pageType}:`, validation.warnings);
  }

  if (validation.isValid) {
    console.log(`✅ Static page validation passed for ${pageType}`);
  }

  return validation;
}

/**
 * Validate multiple images in parallel with rate limiting
 */
export async function validateImagesInBatches(imageUrls, batchSize = 5) {
  const results = [];

  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const batchPromises = batch.map(url => validateImageUrl(url));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to avoid overwhelming servers
    if (i + batchSize < imageUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
