// Test if DATABASE_URL is available in production
export default function handler(req, res) {
  const hasDbUrl = !!process.env.DATABASE_URL;
  const hasRailwayDbUrl = !!process.env.RAILWAY_DATABASE_URL;
  
  res.status(200).json({
    DATABASE_URL_exists: hasDbUrl,
    RAILWAY_DATABASE_URL_exists: hasRailwayDbUrl,
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}