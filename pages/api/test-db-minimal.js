// Minimal database connection test
export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Simplest possible query
    const { data, error } = await supabase
      .from('movies')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        details: error 
      });
    }

    return res.status(200).json({ 
      success: true, 
      hasData: !!data && data.length > 0,
      count: data?.length || 0
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
}