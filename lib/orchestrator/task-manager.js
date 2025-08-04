/**
 * Task Management System
 * 
 * Handles task queuing, prioritization, and tracking for the multi-agent orchestrator
 */

class TaskManager {
  constructor() {
    this.tasks = new Map();
    this.queue = [];
    this.completedTasks = [];
    this.failedTasks = [];
  }

  /**
   * Add a new task to the system
   */
  addTask(task) {
    // Validate task
    this.validateTask(task);
    
    // Generate ID if not provided
    if (!task.id) {
      task.id = this.generateTaskId();
    }

    // Set default status
    task.status = 'queued';
    task.createdAt = new Date().toISOString();
    task.updatedAt = task.createdAt;

    // Store task
    this.tasks.set(task.id, task);
    
    // Add to priority queue
    this.addToQueue(task);
    
    console.log(`📋 Task added: ${task.title} (${task.id})`);
    return task.id;
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId, status, result = null) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = status;
    task.updatedAt = new Date().toISOString();
    
    if (result) {
      task.result = result;
    }

    // Move to appropriate collection
    if (status === 'completed') {
      this.removeFromQueue(taskId);
      this.completedTasks.push(task);
    } else if (status === 'failed') {
      this.removeFromQueue(taskId);
      this.failedTasks.push(task);
    }

    console.log(`📝 Task ${taskId} status updated to: ${status}`);
  }

  /**
   * Get next task from queue
   */
  getNextTask() {
    if (this.queue.length === 0) {
      return null;
    }

    // Sort by priority and creation time
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // Same priority, older tasks first
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const nextTask = this.queue[0];
    this.updateTaskStatus(nextTask.id, 'in_progress');
    
    return nextTask;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    const priorityCounts = this.queue.reduce((counts, task) => {
      counts[task.priority] = (counts[task.priority] || 0) + 1;
      return counts;
    }, {});

    return {
      total: this.queue.length,
      byPriority: priorityCounts,
      oldestTask: this.queue.length > 0 ? this.queue[0].createdAt : null,
      averageWaitTime: this.calculateAverageWaitTime()
    };
  }

  /**
   * Get system stats
   */
  getStats() {
    const totalTasks = this.tasks.size;
    const completedCount = this.completedTasks.length;
    const failedCount = this.failedTasks.length;
    const successRate = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completed: completedCount,
      failed: failedCount,
      queued: this.queue.length,
      successRate: Math.round(successRate * 100) / 100,
      averageCompletionTime: this.calculateAverageCompletionTime()
    };
  }

  /**
   * Search tasks by criteria
   */
  searchTasks(criteria) {
    const allTasks = Array.from(this.tasks.values());
    
    return allTasks.filter(task => {
      if (criteria.status && task.status !== criteria.status) return false;
      if (criteria.priority && task.priority !== criteria.priority) return false;
      if (criteria.requester && task.requester !== criteria.requester) return false;
      if (criteria.title && !task.title.toLowerCase().includes(criteria.title.toLowerCase())) return false;
      if (criteria.dateFrom && new Date(task.createdAt) < new Date(criteria.dateFrom)) return false;
      if (criteria.dateTo && new Date(task.createdAt) > new Date(criteria.dateTo)) return false;
      
      return true;
    });
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId, reason = 'Cancelled by user') {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status === 'completed') {
      throw new Error('Cannot cancel completed task');
    }

    this.updateTaskStatus(taskId, 'cancelled');
    task.cancellationReason = reason;
    this.removeFromQueue(taskId);
    
    console.log(`❌ Task cancelled: ${taskId} - ${reason}`);
  }

  // Private methods

  validateTask(task) {
    if (!task.title || typeof task.title !== 'string') {
      throw new Error('Task title is required and must be a string');
    }
    
    if (!task.description || typeof task.description !== 'string') {
      throw new Error('Task description is required and must be a string');
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (task.priority && !validPriorities.includes(task.priority)) {
      throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }
  }

  generateTaskId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `task_${timestamp}_${random}`;
  }

  addToQueue(task) {
    this.queue.push(task);
  }

  removeFromQueue(taskId) {
    this.queue = this.queue.filter(task => task.id !== taskId);
  }

  calculateAverageWaitTime() {
    if (this.queue.length === 0) return 0;
    
    const now = new Date();
    const totalWaitTime = this.queue.reduce((total, task) => {
      const waitTime = now - new Date(task.createdAt);
      return total + waitTime;
    }, 0);
    
    return Math.round(totalWaitTime / this.queue.length / 1000 / 60); // minutes
  }

  calculateAverageCompletionTime() {
    if (this.completedTasks.length === 0) return 0;
    
    const totalCompletionTime = this.completedTasks.reduce((total, task) => {
      const completionTime = new Date(task.updatedAt) - new Date(task.createdAt);
      return total + completionTime;
    }, 0);
    
    return Math.round(totalCompletionTime / this.completedTasks.length / 1000 / 60); // minutes
  }
}

/**
 * Task Priority Levels:
 * - high: Critical bugs, security issues, production problems
 * - medium: New features, enhancements, non-critical bugs  
 * - low: Nice-to-have improvements, documentation, cleanup
 */

/**
 * Task Status Values:
 * - queued: Waiting to be processed
 * - in_progress: Currently being worked on
 * - completed: Successfully finished
 * - failed: Failed to complete (with error details)
 * - cancelled: Cancelled before completion
 */

export default TaskManager;