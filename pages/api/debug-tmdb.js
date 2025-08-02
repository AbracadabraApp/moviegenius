// Temporary debug endpoint to diagnose TMDB issue
import { getConsistentTestId } from '../../lib/test-config.js';

export default async function handler(req, res) {
  const { id = getConsistentTestId() } = req.query;

  try {
    console.log(`🔍 Debug: Importing getTMDBMovieDetails...`);
    const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search');
    console.log(`✅ Debug: Import successful`);
    
    console.log(`🔍 Debug: Calling getTMDBMovieDetails(${id})...`);
    const result = await getTMDBMovieDetails(parseInt(id));
    console.log(`🔍 Debug: Result type:`, typeof result);
    console.log(`🔍 Debug: Result keys:`, result ? Object.keys(result) : 'null');
    console.log(`🔍 Debug: Has title:`, result?.title);
    console.log(`🔍 Debug: Has release_date:`, result?.release_date);
    
    return res.json({
      success: true,
      resultType: typeof result,
      isNull: result === null,
      hasTitle: !!result?.title,
      hasReleaseDate: !!result?.release_date,
      title: result?.title,
      release_date: result?.release_date,
      keys: result ? Object.keys(result) : null,
      firstFewChars: result?.title ? result.title.substring(0, 10) : null
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack?.substring(0, 500)
    });
  }
}