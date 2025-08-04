/**
 * Multi-Agent Orchestrator Tests
 */

const MultiAgentOrchestrator = require('../../lib/orchestrator/multi-agent-orchestrator');
const TaskManager = require('../../lib/orchestrator/task-manager');

describe('Multi-Agent Orchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new MultiAgentOrchestrator();
  });

  describe('Task Analysis', () => {
    test('should identify development requirements', () => {
      const task = {
        title: 'Add user authentication',
        description: 'Implement login API with JWT tokens'
      };

      const requirements = orchestrator.analyzeTaskRequirements(task);
      expect(requirements).toContain('development');
      expect(requirements).toContain('testing'); // Auto-added for development
    });

    test('should identify UX requirements', () => {
      const task = {
        title: 'Update movie card design',
        description: 'Redesign the UI component with better accessibility'
      };

      const requirements = orchestrator.analyzeTaskRequirements(task);
      expect(requirements).toContain('ux');
    });

    test('should identify database requirements', () => {
      const task = {
        title: 'Optimize search performance',
        description: 'Add database indexes for movie search queries'
      };

      const requirements = orchestrator.analyzeTaskRequirements(task);
      expect(requirements).toContain('database');
    });

    test('should identify multiple requirements', () => {
      const task = {
        title: 'Build movie favorites feature',
        description: 'Create database schema, API endpoints, and UI components for favorites'
      };

      const requirements = orchestrator.analyzeTaskRequirements(task);
      expect(requirements).toContain('database');
      expect(requirements).toContain('development');
      expect(requirements).toContain('ux');
      expect(requirements).toContain('testing');
    });
  });

  describe('Execution Plan Creation', () => {
    test('should create proper phase sequencing', () => {
      const task = {
        title: 'Full-stack feature',
        description: 'Add new feature with database, API, and UI components'
      };

      const requiredAgents = ['database', 'development', 'ux', 'testing'];
      const plan = orchestrator.createExecutionPlan(task, requiredAgents);

      // Should have all phases
      expect(plan.phases).toHaveLength(4);
      
      // Design should come first
      const designPhase = plan.phases.find(p => p.phase === 'design');
      expect(designPhase.dependencies).toHaveLength(0);

      // Database design should depend on UX design
      const dbPhase = plan.phases.find(p => p.phase === 'database_design');
      expect(dbPhase.dependencies).toContain('design');

      // Implementation should depend on database
      const implPhase = plan.phases.find(p => p.phase === 'implementation');
      expect(implPhase.dependencies).toContain('database_design');

      // Testing should depend on implementation
      const testPhase = plan.phases.find(p => p.phase === 'testing');
      expect(testPhase.dependencies).toContain('implementation');
    });

    test('should estimate task duration', () => {
      const task = {
        title: 'Simple API',
        description: 'Create simple API endpoint with tests'
      };

      const plan = orchestrator.createExecutionPlan(task, ['development', 'testing']);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });
  });

  describe('Agent Initialization', () => {
    test('should initialize all required agents', () => {
      expect(orchestrator.agents.has('development')).toBe(true);
      expect(orchestrator.agents.has('testing')).toBe(true);
      expect(orchestrator.agents.has('ux')).toBe(true);
      expect(orchestrator.agents.has('database')).toBe(true);
    });

    test('should return correct status', () => {
      const status = orchestrator.getStatus();
      expect(status).toHaveProperty('activeTask');
      expect(status).toHaveProperty('queueLength');
      expect(status).toHaveProperty('totalTasksCompleted');
      expect(status.agents).toEqual(['development', 'testing', 'ux', 'database']);
    });
  });
});

describe('Task Manager', () => {
  let taskManager;

  beforeEach(() => {
    taskManager = new TaskManager();
  });

  describe('Task Management', () => {
    test('should add task with auto-generated ID', () => {
      const task = {
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium'
      };

      const taskId = taskManager.addTask(task);
      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^task_\d+_[a-z0-9]{5}$/);
    });

    test('should validate required fields', () => {
      expect(() => {
        taskManager.addTask({});
      }).toThrow('Task title is required');

      expect(() => {
        taskManager.addTask({ title: 'Test' });
      }).toThrow('Task description is required');
    });

    test('should validate priority values', () => {
      expect(() => {
        taskManager.addTask({
          title: 'Test',
          description: 'Test',
          priority: 'invalid'
        });
      }).toThrow('Invalid priority');
    });
  });

  describe('Queue Management', () => {
    test('should prioritize high priority tasks', () => {
      const lowTask = taskManager.addTask({
        title: 'Low Priority',
        description: 'Low priority task',
        priority: 'low'
      });

      const highTask = taskManager.addTask({
        title: 'High Priority', 
        description: 'High priority task',
        priority: 'high'
      });

      const nextTask = taskManager.getNextTask();
      expect(nextTask.id).toBe(highTask);
    });

    test('should process FIFO for same priority', () => {
      const task1 = taskManager.addTask({
        title: 'First Task',
        description: 'First task',
        priority: 'medium'
      });

      // Small delay to ensure different timestamps
      setTimeout(() => {
        const task2 = taskManager.addTask({
          title: 'Second Task',
          description: 'Second task', 
          priority: 'medium'
        });
      }, 10);

      const nextTask = taskManager.getNextTask();
      expect(nextTask.id).toBe(task1);
    });

    test('should update task status correctly', () => {
      const taskId = taskManager.addTask({
        title: 'Test Task',
        description: 'Test Description'
      });

      taskManager.updateTaskStatus(taskId, 'in_progress');
      const task = taskManager.getTask(taskId);
      expect(task.status).toBe('in_progress');
    });
  });

  describe('Statistics', () => {
    test('should calculate correct stats', () => {
      // Add some tasks
      const task1Id = taskManager.addTask({
        title: 'Task 1',
        description: 'Description 1'
      });

      const task2Id = taskManager.addTask({
        title: 'Task 2', 
        description: 'Description 2'
      });

      // Complete one task  
      taskManager.updateTaskStatus(task1Id, 'completed');

      const stats = taskManager.getStats();
      expect(stats.totalTasks).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.queued).toBe(1);
      expect(stats.successRate).toBe(50);
    });

    test('should provide queue status', () => {
      taskManager.addTask({
        title: 'High Task',
        description: 'High priority',
        priority: 'high'
      });

      taskManager.addTask({
        title: 'Low Task',
        description: 'Low priority', 
        priority: 'low'
      });

      const queueStatus = taskManager.getQueueStatus();
      expect(queueStatus.total).toBe(2);
      expect(queueStatus.byPriority.high).toBe(1);
      expect(queueStatus.byPriority.low).toBe(1);
    });
  });

  describe('Task Search', () => {
    beforeEach(() => {
      taskManager.addTask({
        title: 'Database Task',
        description: 'Database work',
        priority: 'high',
        requester: 'john'
      });

      taskManager.addTask({
        title: 'UI Task',
        description: 'UI work',
        priority: 'low', 
        requester: 'jane'
      });
    });

    test('should search by status', () => {
      const results = taskManager.searchTasks({ status: 'queued' });
      expect(results).toHaveLength(2);
    });

    test('should search by priority', () => {
      const results = taskManager.searchTasks({ priority: 'high' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Database Task');
    });

    test('should search by requester', () => {
      const results = taskManager.searchTasks({ requester: 'jane' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('UI Task');
    });

    test('should search by title', () => {
      const results = taskManager.searchTasks({ title: 'database' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Database Task');
    });
  });

  describe('Task Cancellation', () => {
    test('should cancel queued task', () => {
      const taskId = taskManager.addTask({
        title: 'Test Task',
        description: 'Test Description'
      });

      taskManager.cancelTask(taskId, 'No longer needed');
      
      const task = taskManager.getTask(taskId);
      expect(task.status).toBe('cancelled');
      expect(task.cancellationReason).toBe('No longer needed');
    });

    test('should not cancel completed task', () => {
      const taskId = taskManager.addTask({
        title: 'Test Task',
        description: 'Test Description'
      });

      taskManager.updateTaskStatus(taskId, 'completed');

      expect(() => {
        taskManager.cancelTask(taskId);
      }).toThrow('Cannot cancel completed task');
    });
  });
});