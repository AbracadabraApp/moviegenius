/**
 * Multi-Agent Orchestrator API
 * 
 * Endpoint for coordinating specialized development agents
 */

import MultiAgentOrchestrator from '../../../lib/orchestrator/multi-agent-orchestrator.js';

// Singleton orchestrator instance
let orchestrator = null;

function getOrchestrator() {
  if (!orchestrator) {
    orchestrator = new MultiAgentOrchestrator();
  }
  return orchestrator;
}

export default async function handler(req, res) {
  const orch = getOrchestrator();

  try {
    switch (req.method) {
      case 'POST':
        return await handleTaskSubmission(req, res, orch);
      case 'GET':
        return await handleStatusCheck(req, res, orch);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Orchestrator API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle task submission for orchestration
 */
async function handleTaskSubmission(req, res, orchestrator) {
  const { title, description, priority = 'medium', requester } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      error: 'Title and description are required'
    });
  }

  const task = {
    id: generateTaskId(),
    title,
    description,
    priority,
    requester,
    createdAt: new Date().toISOString()
  };

  console.log(`📥 New task submitted: "${task.title}"`);

  try {
    const results = await orchestrator.orchestrateTask(task);
    
    return res.status(200).json({
      success: true,
      task,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      task,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle status check requests
 */
async function handleStatusCheck(req, res, orchestrator) {
  const status = orchestrator.getStatus();
  
  return res.status(200).json({
    success: true,
    status,
    timestamp: new Date().toISOString()
  });
}

/**
 * Generate unique task ID
 */
function generateTaskId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  return `task_${timestamp}_${random}`;
}

/**
 * Example task types for reference:
 * 
 * Development Task:
 * {
 *   "title": "Implement user authentication",
 *   "description": "Create login/logout API endpoints and JWT middleware",
 *   "priority": "high"
 * }
 * 
 * UI/UX Task:
 * {
 *   "title": "Design movie card component",
 *   "description": "Create responsive movie card UI component with hover effects",
 *   "priority": "medium"  
 * }
 * 
 * Database Task:
 * {
 *   "title": "Optimize movie search queries",
 *   "description": "Add database indexes and optimize search query performance",
 *   "priority": "high"
 * }
 * 
 * Full-Stack Task:
 * {
 *   "title": "Add movie favorites feature",
 *   "description": "Implement database schema, API endpoints, and UI components for user favorites",
 *   "priority": "medium"
 * }
 */