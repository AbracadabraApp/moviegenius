// pages/api/admin/refresh-catalog.js - Manual trigger for catalog refresh
// POST /api/admin/refresh-catalog
//
// Triggers the same catalog refresh that runs on Railway cron
// Useful for testing and manual updates

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  // Simple auth check (optional - add if needed)
  // const authHeader = req.headers.authorization;
  // if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    console.log('🔄 Manual catalog refresh triggered');

    // Execute the refresh script
    const { stdout, stderr } = await execAsync('node scripts/refresh-catalog.js', {
      cwd: process.cwd(),
      env: process.env,
      timeout: 300000 // 5 minute timeout
    });

    // Parse the job summary from stdout
    const summaryMatch = stdout.match(/📝 Job summary: (.*)/s);
    let summary = null;

    if (summaryMatch) {
      try {
        summary = JSON.parse(summaryMatch[1]);
      } catch (e) {
        // Could not parse summary
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Catalog refresh completed successfully',
      summary: summary || { raw_output: stdout },
      triggered_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Catalog refresh failed:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      stderr: error.stderr || null,
      triggered_at: new Date().toISOString()
    });
  }
}
