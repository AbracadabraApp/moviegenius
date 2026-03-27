/**
 * Browse Lists Claude Processing System
 * 
 * Single-pass processing that reads movie analyses and builds polyhierarchical browse lists:
 * - Add movie to existing lists
 * - Propose new list concepts  
 * - Assign facet classifications
 * - Maintain semantic relationships
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { getRailwayClient } from '../railway-db.js';

// Claude prompt for single-pass browse list processing
const BROWSE_LIST_GENERATION_PROMPT = `You are a sophisticated film curator building a comprehensive browse list system. You analyze movie analyses and maintain a polyhierarchical taxonomy where movies belong to multiple lists, and lists are organized by multiple facets.

Your job: For each movie analysis, decide how it fits into the browse list ecosystem.

CRITICAL OBJECTIVES:
1. Add movie to existing lists that match thematically
2. Propose new list concepts when you identify compelling patterns
3. Assign facet classifications for organizational context
4. Maintain semantic coherence across all decisions

EXISTING BROWSE LISTS CONTEXT:
{{EXISTING_LISTS}}

EXISTING FACETS CONTEXT:
{{EXISTING_FACETS}}

MOVIE ANALYSIS TO PROCESS:
{{MOVIE_ANALYSIS}}

DECISION FRAMEWORK:
- **Existing Lists**: Add movie if relevance >= 0.7 (be selective, not everything fits everywhere)
- **New Lists**: Propose only if you identify a clear, compelling thematic concept with 3+ potential movies
- **Facets**: Assign 2-5 facets per list (genre + theme/location/time/technique combinations)
- **Relevance Scoring**: 0.1-1.0 scale (0.9+ = perfect example, 0.7-0.8 = solid fit, 0.5-0.6 = weak connection)

QUALITY STANDARDS:
- List titles should be conversational and intriguing ("Crime Family Loyalty Tests" not "Organized Crime Moral Dilemmas")
- Each list should have a clear thematic core that resonates with film enthusiasts  
- Avoid redundant concepts - if similar lists exist, add to those rather than creating duplicates
- New lists should fill genuine gaps in the current taxonomy

OUTPUT REQUIREMENTS:
Your response must be ONLY this JSON structure:

{
  "movieId": "", // TMDB ID from the analysis
  "movieTitle": "", // For reference and validation
  "movieYear": 0, // From analysis
  
  "existingListAssignments": [
    {
      "listId": "", // Existing list identifier  
      "listTitle": "", // For validation
      "relevanceScore": 0.0, // 0.1-1.0 how well movie fits this list
      "selectionReason": "", // 1-2 sentences explaining the thematic fit
      "isGatewayMovie": false, // Is this a perfect entry point for understanding this list?
      "isFeaturedExample": false // Is this a defining example of the list concept?
    }
  ],
  
  "newListProposals": [
    {
      "title": "", // Natural, conversational list title
      "description": "", // 2-3 sentences explaining the concept
      "thematicConcept": "", // Core idea that unites movies in this list
      "targetAudience": "", // Who would be most interested in this concept
      "facetAssignments": [
        {
          "facetName": "", // Must match existing facets
          "facetType": "", // "genre", "theme", "location", "time", "contributor", "technique", "mood"
          "relevanceScore": 0.0, // How strongly this list belongs to this facet
          "isPrimary": false // Is this the primary classification facet?
        }
      ],
      "movieRelevanceScore": 0.0, // How well the current movie fits this new concept
      "estimatedTotalMovies": 0, // How many movies you think would fit this concept
      "selectionReason": "" // Why this movie inspired/fits this new list concept
    }
  ],
  
  "semanticInsights": {
    "thematicPatterns": [], // Key themes you identified in this analysis
    "genreConnections": [], // Genre elements that suggest list placements
    "culturalContext": [], // Cultural/historical elements for facet classification
    "narrativeTechniques": [], // Storytelling approaches that suggest groupings
    "potentialGaps": [] // Missing list concepts you notice but aren't creating yet
  },
  
  "processingMetadata": {
    "confidence": 0.0, // Overall confidence in these decisions (0-1)
    "analysisComplexity": "", // "simple", "moderate", "complex" based on thematic richness
    "facetCoverage": 0, // How many different facet types this movie touches
    "crossGenreAppeal": false // Does this movie transcend typical genre boundaries?
  }
}

EXAMPLES OF GOOD DECISIONS:

**For a complex crime family drama:**
- Add to "Crime Family Dynamics" (0.95 relevance)
- Add to "Moral Corruption Spirals" (0.88 relevance)  
- Propose "Immigrant Family Empire Building" if pattern not covered
- Facets: Drama, Crime Theme, Power Corruption, Contemporary/Historical

**For a small-town horror film:**
- Add to "Small Town Dark Secrets" (0.92 relevance)
- Add to "Isolation Horror" (0.85 relevance)
- Facets: Horror, Small Towns, Paranoid Atmosphere

**Quality Control:**
- Don't force connections - if relevance < 0.7, don't add to existing list
- Don't create redundant lists - check existing concepts carefully
- Prioritize thematic coherence over quantity of assignments

Remember: You're building a discovery system that helps film enthusiasts find exactly what they're looking for through sophisticated but accessible organization.`;

class BrowseListProcessor {
  constructor(anthropicApiKey, railwayDbUrl) {
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    this.railwayDbUrl = railwayDbUrl;
  }

  /**
   * Process a single movie analysis through Claude to generate browse list assignments
   */
  async processMovieAnalysis(movieAnalysis, existingListsContext, existingFacetsContext) {
    try {
      // Build the complete prompt with context
      const prompt = BROWSE_LIST_GENERATION_PROMPT
        .replace('{{EXISTING_LISTS}}', JSON.stringify(existingListsContext, null, 2))
        .replace('{{EXISTING_FACETS}}', JSON.stringify(existingFacetsContext, null, 2))
        .replace('{{MOVIE_ANALYSIS}}', JSON.stringify(movieAnalysis, null, 2));

      // Call Claude API
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 6000,
        temperature: 0.3, // Lower temperature for more consistent categorization
        system: [
          {
            type: 'text',
            text: 'You are an expert film curator building a sophisticated browse list taxonomy. Output only valid JSON with no additional text.',
            cache_control: { type: 'ephemeral' } // Cache the system prompt
          }
        ],
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      // Parse and validate response
      const rawResponse = response.content[0].text;
      let processingResult;
      
      try {
        processingResult = JSON.parse(rawResponse);
      } catch (parseError) {
        throw new Error(`Failed to parse Claude response as JSON: ${parseError.message}\nRaw response: ${rawResponse.substring(0, 500)}`);
      }

      // Add API usage metadata
      processingResult.apiUsage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cost: this.calculateCost(response.usage)
      };

      return processingResult;

    } catch (error) {
      throw new Error(`Failed to process movie analysis with Claude: ${error.message}`);
    }
  }

  /**
   * Get existing lists context for Claude (recent and most relevant lists)
   */
  async getExistingListsContext(limit = 100) {
    const client = getRailwayClient();
    await client.connect();

    try {
      const query = `
        SELECT 
          bl.id,
          bl.title,
          bl.description,
          bl.total_movies,
          bl.avg_relevance_score,
          ARRAY_AGG(
            DISTINCT jsonb_build_object(
              'name', bf.name,
              'type', bf.facet_type
            )
          ) FILTER (WHERE bf.id IS NOT NULL) as facets
        FROM browse_lists bl
        LEFT JOIN list_facets lf ON bl.id = lf.list_id
        LEFT JOIN browse_facets bf ON lf.facet_id = bf.id
        WHERE bl.status = 'active'
        GROUP BY bl.id, bl.title, bl.description, bl.total_movies, bl.avg_relevance_score
        ORDER BY bl.user_rating DESC, bl.total_movies DESC
        LIMIT $1
      `;

      const result = await client.query(query, [limit]);
      return result.rows;

    } finally {
      await client.end();
    }
  }

  /**
   * Get existing facets context for Claude
   */
  async getExistingFacetsContext() {
    const client = getRailwayClient();
    await client.connect();

    try {
      const query = `
        SELECT 
          id,
          name,
          facet_type,
          description,
          list_count,
          movie_count,
          parent_facet_id
        FROM browse_facets
        ORDER BY facet_type, list_count DESC
      `;

      const result = await client.query(query);
      return result.rows;

    } finally {
      await client.end();
    }
  }

  /**
   * Apply Claude's processing results to the database
   */
  async applyProcessingResults(processingResult, jobId) {
    const client = getRailwayClient();
    await client.connect();

    try {
      await client.query('BEGIN');

      // 1. Handle existing list assignments
      for (const assignment of processingResult.existingListAssignments || []) {
        await this.assignMovieToExistingList(client, assignment, processingResult.movieId, jobId);
      }

      // 2. Handle new list proposals
      for (const proposal of processingResult.newListProposals || []) {
        await this.createNewListFromProposal(client, proposal, processingResult.movieId, jobId);
      }

      // 3. Update job metrics
      if (jobId) {
        await this.updateJobMetrics(client, jobId, processingResult);
      }

      await client.query('COMMIT');

      return {
        success: true,
        listsUpdated: processingResult.existingListAssignments?.length || 0,
        listsCreated: processingResult.newListProposals?.length || 0
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Assign movie to existing list
   */
  async assignMovieToExistingList(client, assignment, movieId, jobId) {
    // First verify the list exists and get its UUID
    const listQuery = `
      SELECT id FROM browse_lists 
      WHERE title = $1 OR id::text = $1
      LIMIT 1
    `;
    const listResult = await client.query(listQuery, [assignment.listId]);
    
    if (listResult.rows.length === 0) {
      console.warn(`List not found: ${assignment.listId}, skipping assignment`);
      return;
    }

    const actualListId = listResult.rows[0].id;

    // Insert movie-list relationship
    const insertQuery = `
      INSERT INTO list_movies (
        list_id, 
        movie_id, 
        relevance_score, 
        selection_reason,
        is_featured,
        is_gateway,
        added_by_job_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (list_id, movie_id) 
      DO UPDATE SET 
        relevance_score = EXCLUDED.relevance_score,
        selection_reason = EXCLUDED.selection_reason,
        is_featured = EXCLUDED.is_featured,
        is_gateway = EXCLUDED.is_gateway
    `;

    await client.query(insertQuery, [
      actualListId,
      movieId,
      assignment.relevanceScore,
      assignment.selectionReason,
      assignment.isFeaturedExample || false,
      assignment.isGatewayMovie || false,
      jobId
    ]);
  }

  /**
   * Create new list from Claude proposal
   */
  async createNewListFromProposal(client, proposal, movieId, jobId) {
    // 1. Create the new list
    const createListQuery = `
      INSERT INTO browse_lists (
        title,
        description,
        concept_analysis,
        ai_confidence,
        status
      ) VALUES ($1, $2, $3, $4, 'active')
      RETURNING id
    `;

    const listResult = await client.query(createListQuery, [
      proposal.title,
      proposal.description,
      JSON.stringify({
        thematicConcept: proposal.thematicConcept,
        targetAudience: proposal.targetAudience,
        estimatedTotalMovies: proposal.estimatedTotalMovies
      }),
      0.8 // Default confidence for new lists
    ]);

    const newListId = listResult.rows[0].id;

    // 2. Add the movie to the new list
    const addMovieQuery = `
      INSERT INTO list_movies (
        list_id,
        movie_id,
        relevance_score,
        selection_reason,
        is_featured,
        added_by_job_id
      ) VALUES ($1, $2, $3, $4, true, $5)
    `;

    await client.query(addMovieQuery, [
      newListId,
      movieId,
      proposal.movieRelevanceScore,
      proposal.selectionReason,
      jobId
    ]);

    // 3. Assign facets to the new list
    for (const facetAssignment of proposal.facetAssignments || []) {
      await this.assignFacetToList(client, newListId, facetAssignment);
    }

    return newListId;
  }

  /**
   * Assign facet to list
   */
  async assignFacetToList(client, listId, facetAssignment) {
    // Find the facet ID
    const facetQuery = `
      SELECT id FROM browse_facets
      WHERE name = $1 AND facet_type = $2
      LIMIT 1
    `;

    const facetResult = await client.query(facetQuery, [
      facetAssignment.facetName,
      facetAssignment.facetType
    ]);

    if (facetResult.rows.length === 0) {
      console.warn(`Facet not found: ${facetAssignment.facetName} (${facetAssignment.facetType})`);
      return;
    }

    const facetId = facetResult.rows[0].id;

    // Assign facet to list
    const assignQuery = `
      INSERT INTO list_facets (
        list_id,
        facet_id,
        relevance_score,
        is_primary
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (list_id, facet_id)
      DO UPDATE SET
        relevance_score = EXCLUDED.relevance_score,
        is_primary = EXCLUDED.is_primary
    `;

    await client.query(assignQuery, [
      listId,
      facetId,
      facetAssignment.relevanceScore,
      facetAssignment.isPrimary || false
    ]);
  }

  /**
   * Update job processing metrics
   */
  async updateJobMetrics(client, jobId, processingResult) {
    const updateQuery = `
      UPDATE browse_list_jobs
      SET 
        lists_updated = lists_updated + $1,
        lists_created = lists_created + $2,
        movies_assigned = movies_assigned + 1,
        total_cost = total_cost + $3
      WHERE id = $4
    `;

    await client.query(updateQuery, [
      processingResult.existingListAssignments?.length || 0,
      processingResult.newListProposals?.length || 0,
      processingResult.apiUsage?.cost || 0,
      jobId
    ]);
  }

  /**
   * Calculate API cost from usage
   */
  calculateCost(usage) {
    // Claude 3.5 Sonnet pricing: $3/1M input tokens, $15/1M output tokens
    const inputCost = (usage.input_tokens / 1000000) * 3;
    const outputCost = (usage.output_tokens / 1000000) * 15;
    return inputCost + outputCost;
  }
}

export { BrowseListProcessor, BROWSE_LIST_GENERATION_PROMPT };