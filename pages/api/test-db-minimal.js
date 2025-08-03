// Minimal database connection test
export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const tests = [];

    // Test 1: Working pattern (same as movie-analysis)
    try {
      const { data: movie, error } = await supabase
        .from('movies')
        .select('id, title')
        .limit(1);
      tests.push({
        test: 'Basic select with limit',
        success: !error,
        error: error?.message,
        hasData: !!data && data.length > 0
      });
    } catch (e) {
      tests.push({
        test: 'Basic select with limit',
        success: false,
        error: e.message,
        hasData: false
      });
    }

    // Test 2: Count query without options
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*', { count: 'exact' });
      tests.push({
        test: 'Count query (exact only)',
        success: !error,
        error: error?.message,
        count: data?.length || 0
      });
    } catch (e) {
      tests.push({
        test: 'Count query (exact only)',
        success: false,
        error: e.message,
        count: 0
      });
    }

    // Test 3: Head option (the suspected culprit)
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('id', { head: true });
      tests.push({
        test: 'Head option query',
        success: !error,
        error: error?.message,
        hasData: !!data
      });
    } catch (e) {
      tests.push({
        test: 'Head option query',
        success: false,
        error: e.message,
        hasData: false
      });
    }

    return res.status(200).json({ 
      tests: tests,
      summary: {
        total: tests.length,
        passed: tests.filter(t => t.success).length,
        failed: tests.filter(t => !t.success).length
      }
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
}