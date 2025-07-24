// pages/api/health.js - Simple health check for Railway
export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'MovieGenius'
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
