/**
 * Advanced Search Matching Utilities
 *
 * Handles fuzzy matching for movie titles with multiple fallback strategies
 */

/**
 * Normalize title for fuzzy matching
 * Removes common variations that cause match failures
 */
function normalizeTitle(title) {
  if (!title) return '';

  return title
    .toLowerCase()
    .trim()
    // Remove leading articles
    .replace(/^(the|a|an)\s+/i, '')
    // Remove punctuation and special characters
    .replace(/[:\-–—,\.!?'"""'']/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove parenthetical info for initial matching
    .replace(/\([^)]*\)/g, '')
    // Remove diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extract year from title if present
 * e.g., "Inception (2010)" -> { title: "Inception", year: 2010 }
 */
function extractYearFromTitle(title) {
  const yearMatch = title.match(/\((\d{4})\)/);
  if (yearMatch) {
    return {
      title: title.replace(/\s*\(\d{4}\)\s*$/, '').trim(),
      year: parseInt(yearMatch[1])
    };
  }
  return { title, year: null };
}

/**
 * Build multi-stage search query
 * Returns SQL query with multiple matching strategies
 *
 * @param {string} query - User search query
 * @param {number|null} year - Optional year filter
 * @returns {object} - { sql, params, stages }
 */
function buildMultiStageSearch(query, year = null) {
  const normalized = normalizeTitle(query);
  const { title: cleanTitle, year: extractedYear } = extractYearFromTitle(query);
  const searchYear = year || extractedYear;

  // Build year conditions
  const yearExact = searchYear ? `year = $3` : 'TRUE';
  const yearFuzzy = searchYear ? `year BETWEEN $4 AND $5` : 'TRUE';
  const yearParams = searchYear
    ? [searchYear, searchYear - 2, searchYear + 2]
    : [];

  const sql = `
    WITH normalized_search AS (
      -- Precompute normalized search term
      SELECT
        $1 as original_query,
        $2 as normalized_query
    ),
    ranked_results AS (
      SELECT DISTINCT
        m.id,
        m.tmdb_id,
        m.title,
        m.year,
        m.poster_url,
        m.contributors_json,
        ma.enhanced_sections,
        ew.recommendation,
        ew.reasons,
        -- Multi-stage scoring
        (
          -- Stage 1: Exact match (highest priority)
          CASE WHEN LOWER(m.title) = LOWER($1) AND ${yearExact} THEN 10000 ELSE 0 END +

          -- Stage 2: Normalized exact match
          CASE WHEN LOWER(REGEXP_REPLACE(REGEXP_REPLACE(m.title, '^(the|a|an)\\s+', '', 'i'), '[^a-z0-9\\s]', '', 'g'))
                      = (SELECT normalized_query FROM normalized_search)
               THEN 8000 ELSE 0 END +

          -- Stage 3: Starts with (original query)
          CASE WHEN LOWER(m.title) LIKE LOWER($1) || '%' THEN 5000 ELSE 0 END +

          -- Stage 4: Contains (original query)
          CASE WHEN LOWER(m.title) LIKE '%' || LOWER($1) || '%' THEN 3000 ELSE 0 END +

          -- Stage 5: Trigram similarity (fuzzy matching)
          (similarity(LOWER(m.title), LOWER($1)) * 2000) +

          -- Stage 6: Word boundary matching
          CASE WHEN m.title ~* ('\\m' || $1 || '\\M') THEN 1500 ELSE 0 END +

          -- Year matching bonus
          CASE WHEN ${yearExact} THEN 1000
               WHEN ${yearFuzzy} THEN 500
               ELSE 0 END +

          -- Content availability bonuses
          CASE WHEN ma.id IS NOT NULL THEN 500 ELSE 0 END +
          CASE WHEN ew.id IS NOT NULL THEN 300 ELSE 0 END +
          CASE WHEN m.contributors_json IS NOT NULL THEN 100 ELSE 0 END
        ) as match_score,

        -- Debug: which stage matched
        CASE
          WHEN LOWER(m.title) = LOWER($1) AND ${yearExact} THEN 'exact'
          WHEN LOWER(REGEXP_REPLACE(REGEXP_REPLACE(m.title, '^(the|a|an)\\s+', '', 'i'), '[^a-z0-9\\s]', '', 'g'))
               = (SELECT normalized_query FROM normalized_search) THEN 'normalized'
          WHEN LOWER(m.title) LIKE LOWER($1) || '%' THEN 'starts_with'
          WHEN LOWER(m.title) LIKE '%' || LOWER($1) || '%' THEN 'contains'
          WHEN similarity(LOWER(m.title), LOWER($1)) > 0.3 THEN 'trigram'
          ELSE 'weak'
        END as match_type

      FROM movies m
      LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
      LEFT JOIN enhanced_why_watch ew ON ma.id = ew.analysis_id
      WHERE (
        -- Basic matching conditions
        LOWER(m.title) LIKE '%' || LOWER($1) || '%'
        OR similarity(LOWER(m.title), LOWER($1)) > 0.3
        OR m.title ~* ('\\m' || $1 || '\\M')
      )
      AND (${yearFuzzy}) -- Year filter if provided
    )
    SELECT * FROM ranked_results
    WHERE match_score > 0
    ORDER BY match_score DESC, year DESC
    LIMIT 20
  `;

  const params = [
    query,              // $1 - original query
    normalized,         // $2 - normalized query
    ...yearParams       // $3-$5 - year params if provided
  ];

  return { sql, params };
}

/**
 * Post-process search results to add metadata
 */
function enrichSearchResults(rows) {
  return rows.map(row => {
    // Calculate content score
    let contentScore = 0;
    if (row.contributors_json) contentScore += 20;
    if (row.reasons && row.recommendation) contentScore += 40;
    if (row.enhanced_sections && row.enhanced_sections[0]) contentScore += 40;

    // Format contributors
    const contributorText = formatContributors(row.contributors_json);

    return {
      id: row.id,
      tmdb_id: row.tmdb_id,
      title: row.title,
      year: row.year,
      poster_url: row.poster_url || null,
      contributors: contributorText,
      whyWatch: row.reasons && row.recommendation ? {
        reasons: row.reasons,
        recommendation: row.recommendation
      } : null,
      analysisPreview: row.enhanced_sections && row.enhanced_sections[0]
        ? row.enhanced_sections[0].text
        : null,
      contentScore,
      matchType: row.match_type,  // For debugging
      matchScore: row.match_score  // For debugging
    };
  });
}

function formatContributors(contributors_json) {
  if (!contributors_json) return null;

  const director = contributors_json.director?.[0];
  const topActors = contributors_json.star?.slice(0, 3) || [];

  const parts = [];
  if (topActors.length > 0) {
    parts.push(`Starring:`);
    parts.push(topActors.join(', '));
  }
  if (director) {
    parts.push(`Director:`);
    parts.push(director);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

export {
  normalizeTitle,
  extractYearFromTitle,
  buildMultiStageSearch,
  enrichSearchResults
};
