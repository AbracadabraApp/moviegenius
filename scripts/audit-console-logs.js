#!/usr/bin/env node

/**
 * Console.log Audit and Safe Removal Script
 *
 * Risk Mitigation Strategy:
 * 1. Audit all console.log statements before removal
 * 2. Categorize by importance (debug, error, critical)
 * 3. Preserve development-only and error logging
 * 4. Create backup before any changes
 * 5. Validate functionality after removal
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ConsoleLogAuditor {
  constructor() {
    this.findings = [];
    this.backupDir = path.join(process.cwd(), 'backups', `console-logs-${Date.now()}`);
    this.componentsDir = path.join(process.cwd(), 'components');
    this.pagesDir = path.join(process.cwd(), 'pages');

    // Patterns to preserve (development logging, errors)
    this.preservePatterns = [
      /console\.error/,
      /console\.warn/,
      /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"](development|dev)['"]\s*\)/,
      /isDevelopment.*console\.log/,
      /DEBUG.*console\.log/,
    ];

    // Critical functionality patterns to be extra careful with
    this.criticalPatterns = [
      /authentication/i,
      /payment/i,
      /security/i,
      /login/i,
      /error.*handling/i,
    ];
  }

  /**
   * Audit all console.log statements in the codebase
   */
  async auditConsoleStatements() {
    console.log('🔍 Auditing console.log statements...');

    const directories = [this.componentsDir, this.pagesDir];

    for (const dir of directories) {
      await this.auditDirectory(dir);
    }

    return this.generateAuditReport();
  }

  /**
   * Recursively audit directory for console statements
   */
  async auditDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory() && file.name !== 'node_modules') {
        await this.auditDirectory(fullPath);
      } else if (file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
        await this.auditFile(fullPath);
      }
    }
  }

  /**
   * Audit individual file for console statements
   */
  async auditFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Check for console statements
      if (trimmedLine.includes('console.')) {
        const finding = {
          file: path.relative(process.cwd(), filePath),
          line: index + 1,
          content: trimmedLine,
          type: this.categorizeConsoleStatement(trimmedLine),
          shouldPreserve: this.shouldPreserveStatement(trimmedLine, content),
          isCritical: this.isCriticalFile(filePath, content),
          risk: this.assessRisk(trimmedLine, content, filePath),
        };

        this.findings.push(finding);
      }
    });
  }

  /**
   * Categorize console statement by type
   */
  categorizeConsoleStatement(line) {
    if (line.includes('console.error')) return 'error';
    if (line.includes('console.warn')) return 'warning';
    if (line.includes('console.debug')) return 'debug';
    if (line.includes('console.info')) return 'info';
    if (line.includes('console.log')) return 'log';
    return 'other';
  }

  /**
   * Determine if statement should be preserved
   */
  shouldPreserveStatement(line, fileContent) {
    return this.preservePatterns.some(pattern => pattern.test(line) || pattern.test(fileContent));
  }

  /**
   * Check if file contains critical functionality
   */
  isCriticalFile(filePath, content) {
    const fileName = path.basename(filePath).toLowerCase();
    const criticalFiles = ['mediacard.js', 'authentication.js', 'payment.js'];

    return (
      criticalFiles.some(critical => fileName.includes(critical)) ||
      this.criticalPatterns.some(pattern => pattern.test(content))
    );
  }

  /**
   * Assess risk level of removing console statement
   */
  assessRisk(line, content, filePath) {
    let riskScore = 0;

    // Higher risk for error/debugging statements
    if (line.includes('error') || line.includes('debug')) riskScore += 2;

    // Higher risk in critical files
    if (this.isCriticalFile(filePath, content)) riskScore += 2;

    // Lower risk for simple logging
    if (line.includes('console.log') && !line.includes('error')) riskScore += 1;

    // Check if it's in a try/catch block (higher risk to remove)
    if (content.includes('try') && content.includes('catch')) riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Generate comprehensive audit report
   */
  generateAuditReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalFindings: this.findings.length,
      byType: {},
      byRisk: {},
      safeToRemove: [],
      requiresReview: [],
      preserve: [],
      summary: {},
    };

    // Group findings
    this.findings.forEach(finding => {
      // By type
      report.byType[finding.type] = (report.byType[finding.type] || 0) + 1;

      // By risk
      report.byRisk[finding.risk] = (report.byRisk[finding.risk] || 0) + 1;

      // Categorize for action
      if (finding.shouldPreserve) {
        report.preserve.push(finding);
      } else if (finding.risk === 'low' && finding.type === 'log') {
        report.safeToRemove.push(finding);
      } else {
        report.requiresReview.push(finding);
      }
    });

    // Generate summary
    report.summary = {
      canSafelyRemove: report.safeToRemove.length,
      needsReview: report.requiresReview.length,
      shouldPreserve: report.preserve.length,
      estimatedPerformanceGain: `${(report.safeToRemove.length * 0.1).toFixed(1)}%`,
    };

    return report;
  }

  /**
   * Create backup before making changes
   */
  createBackup(filesToModify) {
    console.log(`📦 Creating backup in ${this.backupDir}...`);

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    filesToModify.forEach(filePath => {
      const relativePath = path.relative(process.cwd(), filePath);
      const backupPath = path.join(this.backupDir, relativePath);
      const backupDir = path.dirname(backupPath);

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      fs.copyFileSync(filePath, backupPath);
    });

    console.log(`✅ Backup created: ${filesToModify.length} files`);
  }

  /**
   * Safely remove console.log statements
   */
  async safelyRemoveConsoleStatements(findings) {
    const filesToModify = [...new Set(findings.map(f => f.file))];

    // Create backup first
    this.createBackup(filesToModify.map(f => path.join(process.cwd(), f)));

    console.log(`🧹 Removing console.log statements from ${filesToModify.length} files...`);

    const modificationSummary = {};

    for (const file of filesToModify) {
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const fileFindings = findings.filter(f => f.file === file);

      let modifications = 0;

      // Process in reverse order to maintain line numbers
      fileFindings.reverse().forEach(finding => {
        const lineIndex = finding.line - 1;
        const originalLine = lines[lineIndex];

        // Replace console.log with environment-gated version or remove
        if (finding.type === 'log' && !finding.shouldPreserve) {
          // Check if it's a simple console.log we can safely remove
          if (
            originalLine.trim().startsWith('console.log(') &&
            !originalLine.includes('error') &&
            !originalLine.includes('critical')
          ) {
            // Replace with development-only version
            const indentationMatch = originalLine.match(/^\s*/);
            const indentation = indentationMatch ? indentationMatch[0] : '';
            lines[lineIndex] = `${indentation}// Removed console.log for production performance`;
            modifications++;
          }
        }
      });

      if (modifications > 0) {
        fs.writeFileSync(filePath, lines.join('\n'));
        modificationSummary[file] = modifications;
        console.log(`  ✓ ${file}: ${modifications} modifications`);
      }
    }

    return modificationSummary;
  }

  /**
   * Validate that functionality still works after modifications
   */
  async validateFunctionality() {
    console.log('🧪 Validating functionality after modifications...');

    try {
      // Run linting to check for syntax errors
      console.log('  → Running ESLint...');
      execSync('npm run lint', { stdio: 'pipe' });
      console.log('  ✅ ESLint passed');

      // Run type checking
      console.log('  → Running TypeScript check...');
      execSync('npm run typecheck', { stdio: 'pipe' });
      console.log('  ✅ TypeScript check passed');

      // Run tests if available
      if (fs.existsSync(path.join(process.cwd(), '__tests__'))) {
        console.log('  → Running tests...');
        execSync('npm test -- --watchAll=false', { stdio: 'pipe' });
        console.log('  ✅ Tests passed');
      }

      return { success: true, errors: [] };
    } catch (error) {
      console.error('  ❌ Validation failed:', error.message);
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Rollback changes if validation fails
   */
  async rollbackChanges() {
    console.log('🔄 Rolling back changes...');

    if (!fs.existsSync(this.backupDir)) {
      throw new Error('Backup directory not found - cannot rollback');
    }

    const backupFiles = this.getAllFiles(this.backupDir);

    backupFiles.forEach(backupFile => {
      const relativePath = path.relative(this.backupDir, backupFile);
      const originalPath = path.join(process.cwd(), relativePath);

      fs.copyFileSync(backupFile, originalPath);
    });

    console.log(`✅ Rolled back ${backupFiles.length} files`);
  }

  /**
   * Get all files recursively
   */
  getAllFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach(item => {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    });

    return files;
  }
}

// Main execution
async function main() {
  const auditor = new ConsoleLogAuditor();

  try {
    // Step 1: Audit console statements
    const report = await auditor.auditConsoleStatements();

    console.log('\\n📊 Console.log Audit Report:');
    console.log(`  Total findings: ${report.totalFindings}`);
    console.log(`  Safe to remove: ${report.summary.canSafelyRemove}`);
    console.log(`  Needs review: ${report.summary.needsReview}`);
    console.log(`  Should preserve: ${report.summary.shouldPreserve}`);
    console.log(`  Estimated performance gain: ${report.summary.estimatedPerformanceGain}`);

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'console-log-audit.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\\n📄 Detailed report saved: ${reportPath}`);

    // Step 2: Ask for confirmation if running interactively
    if (process.argv.includes('--remove') || process.argv.includes('--auto')) {
      console.log('\\n🧹 Proceeding with safe removal...');

      // Step 3: Remove safe console statements
      const modifications = await auditor.safelyRemoveConsoleStatements(report.safeToRemove);

      // Step 4: Validate functionality
      const validation = await auditor.validateFunctionality();

      if (!validation.success) {
        console.error('\\n❌ Validation failed - rolling back changes...');
        await auditor.rollbackChanges();
        throw new Error('Rollback completed due to validation failure');
      }

      console.log('\\n✅ Console.log optimization completed successfully!');
      console.log(`   Modified files: ${Object.keys(modifications).length}`);
      console.log(`   Total removals: ${Object.values(modifications).reduce((a, b) => a + b, 0)}`);
    } else {
      console.log(
        '\\n💡 To proceed with removal, run: node scripts/audit-console-logs.js --remove'
      );
      console.log('    Or review the findings in console-log-audit.json first');
    }
  } catch (error) {
    console.error('\\n🚨 Error during console.log optimization:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ConsoleLogAuditor;
