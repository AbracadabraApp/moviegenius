/**
 * Dedicated Health Check Endpoint
 * 
 * Provides comprehensive health status for monitoring and alerting.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  const healthStatus = {
    status: 'healthy',
    timestamp,
    environment: process.env.NODE_ENV,
    checks: {},
    performance: {},
    version: process.env.npm_package_version || 'unknown'
  };

  // 1. Basic application health
  try {
    healthStatus.checks.application = {
      status: 'healthy',
      message: 'Application running normally'
    };
  } catch (error) {
    healthStatus.checks.application = {
      status: 'unhealthy',
      message: error.message
    };
    healthStatus.status = 'degraded';
  }

  // 2. Memory usage
  try {
    const memUsage = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    };
    
    healthStatus.performance.memory = memoryMB;
    
    if (memoryMB.heapUsed > 400) {
      healthStatus.checks.memory = {
        status: 'warning',
        message: `High memory usage: ${memoryMB.heapUsed}MB heap used`
      };
      if (healthStatus.status === 'healthy') {
        healthStatus.status = 'degraded';
      }
    } else {
      healthStatus.checks.memory = {
        status: 'healthy',
        message: `Memory usage normal: ${memoryMB.heapUsed}MB heap used`
      };
    }
  } catch (error) {
    healthStatus.checks.memory = {
      status: 'unknown',
      message: `Memory check failed: ${error.message}`
    };
  }

  // 3. Response time
  const responseTime = Date.now() - startTime;
  healthStatus.performance.responseTime = responseTime;
  
  if (responseTime > 5000) {
    healthStatus.checks.responseTime = {
      status: 'warning',
      message: `Slow response time: ${responseTime}ms`
    };
    if (healthStatus.status === 'healthy') {
      healthStatus.status = 'degraded';
    }
  } else {
    healthStatus.checks.responseTime = {
      status: 'healthy',
      message: `Response time normal: ${responseTime}ms`
    };
  }

  // Return appropriate HTTP status
  let httpStatus = 200;
  if (healthStatus.status === 'unhealthy') {
    httpStatus = 503; // Service Unavailable
  } else if (healthStatus.status === 'degraded') {
    httpStatus = 200; // Still OK but with warnings
  }

  res.status(httpStatus).json(healthStatus);
}