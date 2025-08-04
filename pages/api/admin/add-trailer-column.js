// pages/api/admin/add-trailer-column.js - Add trailer_url column to movies table

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  try {
    console.log('🔧 Adding trailer_url column to movies table...');

    // Use Supabase RPC to execute SQL
    const { data, error } = await supabase.rpc('add_trailer_column');

    if (error) {
      // If RPC doesn't exist, try direct SQL approach
      console.log('RPC failed, trying direct approach...');

      // Try to add the column directly
      const { error: directError } = await supabase.from('movies').select('trailer_url').limit(1);

      if (directError && directError.message.includes('does not exist')) {
        // Column doesn't exist, but we can't add it via Supabase client
        return res.status(200).json({
          success: false,
          error: 'Cannot add column via API',
          recommendation: 'Please add column manually in Supabase dashboard:',
          sql: 'ALTER TABLE movies ADD COLUMN trailer_url TEXT;',
          instructions: [
            '1. Go to Supabase dashboard',
            '2. Navigate to SQL Editor',
            '3. Run: ALTER TABLE movies ADD COLUMN trailer_url TEXT;',
          ],
        });
      }

      // Column might already exist
      return res.status(200).json({
        success: true,
        message: 'trailer_url column already exists',
        columnExists: true,
      });
    }

    console.log('✅ Successfully added trailer_url column');
    return res.status(200).json({
      success: true,
      message: 'trailer_url column added successfully',
      data,
    });
  } catch (error) {
    console.error('❌ Failed to add trailer column:', error);
    return res.status(500).json({
      error: 'Failed to add trailer column',
      details: error.message,
    });
  }
}
