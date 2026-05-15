// lib/jwt-ios.js - Custom JWT generation and validation for iOS

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.IOS_JWT_SECRET; // Add to Railway env vars
const JWT_EXPIRY = '7d'; // 7 days

if (!JWT_SECRET) {
  console.warn('⚠️  IOS_JWT_SECRET not set - JWT generation will fail');
}

/**
 * Generate JWT for iOS app after successful Apple Sign-In
 * @param {number} userId - Database user ID
 * @param {string|null} email - User email (may be relay or null)
 * @param {string} appleId - Apple unique identifier
 * @returns {string} JWT token
 */
function generateIOSToken(userId, email, appleId) {
  if (!JWT_SECRET) {
    throw new Error('IOS_JWT_SECRET environment variable not set');
  }

  return jwt.sign(
    {
      sub: userId,        // User ID (primary key)
      email: email,       // User email (may be relay)
      appleId: appleId,   // Apple unique identifier
      iat: Math.floor(Date.now() / 1000),
      iss: 'moviegenius-api'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify JWT from iOS Authorization header
 * @param {string} token - JWT token
 * @returns {object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
function verifyIOSToken(token) {
  if (!JWT_SECRET) {
    throw new Error('IOS_JWT_SECRET environment variable not set');
  }

  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'moviegenius-api'
    });
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
}

/**
 * Middleware to extract user ID from Authorization header
 * Usage: const userId = await authenticateRequest(req);
 * @param {object} req - Next.js request object
 * @returns {Promise<number>} User ID
 * @throws {Error} If authorization fails
 */
async function authenticateRequest(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7); // Remove "Bearer "
  const payload = verifyIOSToken(token);

  return payload.sub; // Return user ID
}

export { generateIOSToken, verifyIOSToken, authenticateRequest };
