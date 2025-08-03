/**
 * Simple Orchestrator Test
 * 
 * Test endpoint to demonstrate multi-agent task coordination
 */

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { title, description, priority = 'medium' } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    // Simulate orchestrator analysis
    const taskAnalysis = analyzeTask(description);
    const executionPlan = createExecutionPlan(taskAnalysis);
    const results = await simulateExecution(executionPlan, title);

    return res.status(200).json({
      success: true,
      task: { title, description, priority },
      analysis: taskAnalysis,
      executionPlan,
      results,
      timestamp: new Date().toISOString()
    });

  } else if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      status: 'Orchestrator online',
      agents: ['development', 'testing', 'ux', 'database'],
      timestamp: new Date().toISOString()
    });

  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

function analyzeTask(description) {
  const desc = description.toLowerCase();
  const requiredAgents = [];

  if (desc.includes('ui') || desc.includes('component') || desc.includes('dashboard') || desc.includes('display')) {
    requiredAgents.push('ux');
  }

  if (desc.includes('database') || desc.includes('statistics') || desc.includes('count') || desc.includes('data')) {
    requiredAgents.push('database');
  }

  if (desc.includes('api') || desc.includes('endpoint') || desc.includes('backend') || desc.includes('real-time')) {
    requiredAgents.push('development');
  }

  if (desc.includes('test') || requiredAgents.length > 0) {
    requiredAgents.push('testing');
  }

  return {
    complexity: requiredAgents.length > 2 ? 'high' : 'medium',
    estimatedDuration: requiredAgents.length * 30, // minutes
    requiredAgents: [...new Set(requiredAgents)]
  };
}

function createExecutionPlan(analysis) {
  const phases = [];

  if (analysis.requiredAgents.includes('ux')) {
    phases.push({
      phase: 'design',
      agent: 'ux',
      duration: 30,
      dependencies: []
    });
  }

  if (analysis.requiredAgents.includes('database')) {
    phases.push({
      phase: 'database_design',
      agent: 'database',
      duration: 45,
      dependencies: analysis.requiredAgents.includes('ux') ? ['design'] : []
    });
  }

  if (analysis.requiredAgents.includes('development')) {
    phases.push({
      phase: 'implementation',
      agent: 'development',
      duration: 60,
      dependencies: phases.map(p => p.phase)
    });
  }

  if (analysis.requiredAgents.includes('testing')) {
    phases.push({
      phase: 'testing',
      agent: 'testing',
      duration: 30,
      dependencies: ['implementation'].filter(dep => 
        phases.some(p => p.phase === dep)
      )
    });
  }

  return { phases, totalDuration: phases.reduce((sum, p) => sum + p.duration, 0) };
}

async function simulateExecution(plan, title) {
  const results = {
    success: true,
    completedPhases: [],
    deliverables: []
  };

  for (const phase of plan.phases) {
    // Simulate phase execution
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

    let deliverables = [];
    switch (phase.agent) {
      case 'ux':
        deliverables = ['wireframes', 'component_specs', 'user_flow'];
        break;
      case 'database':
        deliverables = ['schema_design', 'query_optimization', 'api_specs'];
        break;
      case 'development':
        deliverables = ['api_endpoints', 'ui_components', 'integration'];
        break;
      case 'testing':
        deliverables = ['unit_tests', 'integration_tests', 'validation'];
        break;
    }

    results.completedPhases.push({
      phase: phase.phase,
      agent: phase.agent,
      status: 'completed',
      deliverables,
      duration: phase.duration
    });

    results.deliverables.push(...deliverables);
  }

  return results;
}