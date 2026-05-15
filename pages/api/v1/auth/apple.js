// /api/v1/auth/apple - Apple Sign-In verification and JWT generation

import { Pool } from 'pg';
import { verifyAppleToken } from '../../../../lib/apple-signin-verify.js';
import { generateIOSToken } from '../../../../lib/jwt-ios.js';

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { identityToken, user } = req.body;

  if (!identityToken) {
    return res.status(400).json({ error: 'identityToken required' });
  }

  try {
    // 1. Verify Apple token with Apple's public keys
    const applePayload = await verifyAppleToken(identityToken);
    const appleId = applePayload.sub; // Apple's unique user ID

    // 2. Extract user info (only provided on first sign-in)
    const email = applePayload.email || user?.email || null;
    const name = user?.fullName
      ? `${user.fullName.givenName || ''} ${user.fullName.familyName || ''}`.trim()
      : null;

    const client = await pool.connect();

    try {
      // 3. Create or update user in database
      const userResult = await client.query(
        `INSERT INTO users (apple_id, email, name, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (apple_id)
         DO UPDATE SET
           email = COALESCE(users.email, EXCLUDED.email),
           name = COALESCE(users.name, EXCLUDED.name),
           updated_at = NOW()
         RETURNING id, email, name`,
        [appleId, email, name]
      );

      const dbUser = userResult.rows[0];

      // 4. Generate iOS JWT (7-day expiry)
      const token = generateIOSToken(dbUser.id, dbUser.email, appleId);

      // 5. Return JWT to iOS app
      return res.status(200).json({
        success: true,
        token: token,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Apple sign-in error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
