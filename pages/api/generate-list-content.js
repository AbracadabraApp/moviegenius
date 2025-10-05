import { getPool } from './railway-db.js';
import { createClient, supabase } from './railway-adapter.js';


// pages/api/generate-list-content.js
/**
 * Routing API for list content generation
 * Routes educational vs declarative lists to appropriate analysis styles
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { listId, listName, claudePrompt } = req.body;

  if (!listId || !listName || !claudePrompt) {
    return res.status(400).json({ error: 'List ID, name, and Claude prompt are required' });
  }

  try {
    // TEMPORARILY DISABLED: const { createClient } = await import(@supabase/supabase-js);
    const pool = getPool();

    // Step 1: Get the list's content type
    const { data: listData, error: listError } = await supabase
      .from('movie_lists')
      .select('content_type')
      .eq('id', listId)
      .single();

    if (!listData) {
      return res.status(404).json({ error: 'List not found or missing content type' });
    }

    const contentType = listData.content_type;
    console.log(`Generating ${contentType} content for: ${listName}`);

    // Step 2: Route to appropriate analysis style
    let analysisResult;

    if (contentType === 'educational') {
      // Educational lists get encyclopedia-style analysis (2-3 paragraphs + interleaved movies)
      analysisResult = await generateEducationalAnalysis(listId, listName, claudePrompt);
    } else if (contentType === 'declarative') {
      // Declarative lists get collection-style analysis (brief intro + ranked movies)
      analysisResult = await generateDeclarativeAnalysis(listId, listName, claudePrompt);
    } else {
      // Fallback for requires_review - default to declarative for now
      console.log(
        `Warning: List "${listName}" has content_type "${contentType}", defaulting to declarative`
      );
      analysisResult = await generateDeclarativeAnalysis(listId, listName, claudePrompt);
    }

    if (!analysisResult) {
      throw new Error('Failed to generate analysis');
    }

    // Step 3: Return appropriate format based on content type
    if (contentType === 'educational') {
      res.status(200).json({
        contentType: 'educational',
        analysis: analysisResult.analysis,
        listName: listName,
        cached: analysisResult.cached || false,
        cost: analysisResult.cost || 0,
      });
    } else {
      res.status(200).json({
        contentType: 'declarative',
        description: analysisResult.description,
        movies: analysisResult.movies || [],
        movieCount: analysisResult.movieCount || 0,
        listName: listName,
        cached: analysisResult.cached || false,
        cost: analysisResult.cost || 0,
      });
    }
  } catch (error) {
    console.error('Error in list content routing:', error);
    res.status(500).json({
      error: 'Failed to generate list content',
      fallback: `${listName} is a curated collection of exceptional films.`,
    });
  }
}

// Generate educational analysis (encyclopedia style)
async function generateEducationalAnalysis(listId, listName, claudePrompt) {
  try {
    // Call the movie-analysis style API for educational content
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/educational-list-analysis`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listId,
          listName,
          claudePrompt,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Educational analysis failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Educational analysis error:', error);
    return null;
  }
}

// Generate declarative analysis (collection style)
async function generateDeclarativeAnalysis(listId, listName, claudePrompt) {
  try {
    // Call the existing list-analysis API for declarative content
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/list-analysis`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listId,
          listName,
          claudePrompt,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Declarative analysis failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Declarative analysis error:', error);
    return null;
  }
}
