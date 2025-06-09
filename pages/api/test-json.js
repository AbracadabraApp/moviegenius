// pages/api/test-json.js
// Simple raw JSON file performance test

import discoveredMovies from '../../data/discovered-movies.json'

export default async function handler(req, res) {
  const startTime = Date.now()
  
  try {
    const queryStart = Date.now()
    
    // Get 10 movies (equivalent to Supabase test)
    const movies = discoveredMovies.slice(0, 10)
    
    const queryEnd = Date.now()
    const queryTime = queryEnd - queryStart
    const totalTime = queryEnd - startTime
    
    res.status(200).json({
      success: true,
      connection: 'OK',
      movieCount: movies.length,
      totalMoviesInFile: discoveredMovies.length,
      queryTime: `${queryTime}ms`,
      totalTime: `${totalTime}ms`,
      sampleTitles: movies.slice(0, 3).map(m => `${m.title} (${m.year})`),
      fieldCount: movies.length > 0 ? Object.keys(movies[0]).length : 0
    })
    
  } catch (err) {
    const totalTime = Date.now() - startTime
    
    res.status(500).json({
      success: false,
      error: err.message,
      totalTime: `${totalTime}ms`
    })
  }
}