// pages/api/test-supabase.js
// Simple raw query performance test

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const startTime = Date.now()
  
  try {
    // Use service role key for server-side API
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const queryStart = Date.now()
    
    // Get 10 movies with all fields
    const { data: movies, error } = await supabase
      .from('movies')
      .select('*')
      .limit(10)
    
    const queryEnd = Date.now()
    const queryTime = queryEnd - queryStart
    const totalTime = queryEnd - startTime
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        queryTime: queryTime,
        totalTime: totalTime
      })
    }
    
    res.status(200).json({
      success: true,
      connection: 'OK',
      movieCount: movies.length,
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