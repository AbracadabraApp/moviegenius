// lib/apple-signin-verify.js - Verify Apple identity tokens

import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

// Apple's public keys endpoint
const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';

const client = jwksClient({
  jwksUri: APPLE_JWKS_URI,
  cache: true,
  cacheMaxAge: 86400000 // 24 hours
});

/**
 * Get Apple's signing key for token verification
 * @param {object} header - JWT header containing kid (key ID)
 * @param {function} callback - Callback function
 */
function getAppleSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Verify Apple identity token from iOS app
 * @param {string} identityToken - JWT from Apple Sign-In
 * @returns {Promise<object>} Decoded payload with user info
 * @throws {Error} If verification fails
 */
async function verifyAppleToken(identityToken) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      identityToken,
      getAppleSigningKey,
      {
        issuer: 'https://appleid.apple.com',
        audience: 'com.moviegenius.app' // iOS bundle ID
      },
      (error, decoded) => {
        if (error) {
          reject(new Error(`Apple token verification failed: ${error.message}`));
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

export { verifyAppleToken };
