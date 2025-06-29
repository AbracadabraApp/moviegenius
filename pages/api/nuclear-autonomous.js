/**
 * Autonomous Nuclear System Control API
 * 
 * Controls the self-healing background nuclear conversion system
 * 
 * GET /api/nuclear-autonomous - Get system status
 * POST /api/nuclear-autonomous - Control system (start/stop/restart)
 */

import { getAutonomousNuclearSystem } from '../../lib/autonomous-nuclear-system.js';

export default async function handler(req, res) {
  const autonomousSystem = getAutonomousNuclearSystem();

  if (req.method === 'GET') {
    // Get system status
    try {
      const status = await autonomousSystem.getSystemStatus();
      
      res.setHeader('Cache-Control', 'no-cache'); // Always fresh status
      res.status(200).json({
        success: true,
        ...status,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error getting autonomous system status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system status',
        details: error.message
      });
    }
  }
  
  else if (req.method === 'POST') {
    // Control system
    try {
      const { action } = req.body;
      
      if (!action) {
        return res.status(400).json({
          success: false,
          error: 'Action required',
          validActions: ['start', 'stop', 'restart', 'pause', 'resume']
        });
      }

      let result;
      
      switch (action) {
        case 'start':
          if (autonomousSystem.isRunning) {
            result = { message: 'System already running', wasRunning: true };
          } else {
            await autonomousSystem.start();
            result = { message: 'System started', wasRunning: false };
          }
          break;
          
        case 'stop':
          if (!autonomousSystem.isRunning) {
            result = { message: 'System already stopped', wasRunning: false };
          } else {
            await autonomousSystem.stop();
            result = { message: 'System stopped', wasRunning: true };
          }
          break;
          
        case 'restart':
          if (autonomousSystem.isRunning) {
            await autonomousSystem.stop();
          }
          await autonomousSystem.start();
          result = { message: 'System restarted' };
          break;
          
        case 'pause':
          autonomousSystem.pausedUntil = Date.now() + (60 * 60 * 1000); // 1 hour
          result = { message: 'System paused for 1 hour' };
          break;
          
        case 'resume':
          autonomousSystem.pausedUntil = null;
          result = { message: 'System resumed' };
          break;
          
        default:
          return res.status(400).json({
            success: false,
            error: `Unknown action: ${action}`,
            validActions: ['start', 'stop', 'restart', 'pause', 'resume']
          });
      }

      // Get updated status
      const status = await autonomousSystem.getSystemStatus();
      
      res.status(200).json({
        success: true,
        action,
        result,
        status,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error controlling autonomous system:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to control system',
        details: error.message
      });
    }
  }
  
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowed: ['GET', 'POST']
    });
  }
}