#!/usr/bin/env node

/**
 * Audit Existing Monitoring Infrastructure
 * 
 * Scans MovieGenius for existing health checks, monitoring endpoints,
 * and deployment verification scripts to avoid duplication
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 MovieGenius Monitoring Infrastructure Audit');
console.log('══════════════════════════════════════════════');

const auditResults = {
  existingEndpoints: [],
  healthChecks: [],
  monitoringScripts: [],
  deploymentScripts: [],
  errorHandling: [],
  recommendations: []
};

/**
 * Check for existing API endpoints that could serve as health checks
 */
const auditAPIEndpoints = () => {
  console.log('\n1. 🔍 Auditing API Endpoints...');
  
  const apiDir = path.join(process.cwd(), 'pages', 'api');
  const possibleHealthPaths = [
    'health.js',
    'status.js', 
    'ping.js',
    'monitor.js',
    'check.js'
  ];
  
  // Check for direct health endpoints
  possibleHealthPaths.forEach(healthPath => {
    const fullPath = path.join(apiDir, healthPath);
    if (fs.existsSync(fullPath)) {
      auditResults.existingEndpoints.push({
        path: `/api/${healthPath.replace('.js', '')}`,
        file: fullPath,
        type: 'health_check'
      });
      console.log(`✅ Found health endpoint: /api/${healthPath.replace('.js', '')}`);
    }
  });
  
  // Scan all API files for health-related functionality
  if (fs.existsSync(apiDir)) {
    const apiFiles = fs.readdirSync(apiDir, { withFileTypes: true });
    apiFiles.forEach(file => {
      if (file.isFile() && file.name.endsWith('.js')) {
        const filePath = path.join(apiDir, file.name);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for health-related patterns
        const healthPatterns = [
          /health/i,
          /status/i,
          /ping/i,
          /monitor/i,
          /uptime/i,
          /check.*health/i
        ];
        
        const hasHealthFunctionality = healthPatterns.some(pattern => 
          pattern.test(content)
        );
        
        if (hasHealthFunctionality) {
          auditResults.healthChecks.push({
            path: `/api/${file.name.replace('.js', '')}`,
            file: filePath,
            type: 'potential_health_endpoint'
          });
          console.log(`🔍 Potential health functionality: /api/${file.name.replace('.js', '')}`);
        }
      }
    });
  }
  
  if (auditResults.existingEndpoints.length === 0 && auditResults.healthChecks.length === 0) {
    console.log('⚠️ No existing health endpoints found');
    auditResults.recommendations.push('Create /api/health endpoint for deployment monitoring');
  }
};

/**
 * Check for existing monitoring and deployment scripts
 */
const auditMonitoringScripts = () => {
  console.log('\n2. 📊 Auditing Monitoring Scripts...');
  
  const scriptsDir = path.join(process.cwd(), 'scripts');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check npm scripts for monitoring-related commands
  const monitoringScriptPatterns = [
    'monitor',
    'health',
    'deploy:verify',
    'performance',
    'check',
    'test:health',
    'validate'
  ];
  
  Object.entries(packageJson.scripts || {}).forEach(([scriptName, command]) => {
    const isMonitoringScript = monitoringScriptPatterns.some(pattern => 
      scriptName.includes(pattern)
    );
    
    if (isMonitoringScript) {
      auditResults.monitoringScripts.push({
        name: scriptName,
        command: command,
        type: 'npm_script'
      });
      console.log(`✅ Found monitoring script: ${scriptName}`);
    }
  });
  
  // Check scripts directory for monitoring files
  if (fs.existsSync(scriptsDir)) {
    const scriptFiles = fs.readdirSync(scriptsDir);
    const monitoringFiles = scriptFiles.filter(file => 
      monitoringScriptPatterns.some(pattern => 
        file.toLowerCase().includes(pattern)
      )
    );
    
    monitoringFiles.forEach(file => {
      const filePath = path.join(scriptsDir, file);
      auditResults.monitoringScripts.push({
        name: file,
        path: filePath,
        type: 'script_file'
      });
      console.log(`✅ Found monitoring script file: ${file}`);
    });
  }
  
  if (auditResults.monitoringScripts.length === 0) {
    console.log('⚠️ No existing monitoring scripts found');
    auditResults.recommendations.push('Create monitoring scripts for automated health checks');
  }
};

/**
 * Check for deployment and verification infrastructure
 */
const auditDeploymentInfrastructure = () => {
  console.log('\n3. 🚀 Auditing Deployment Infrastructure...');
  
  // Check for Railway configuration
  const railwayFiles = [
    'nixpacks.toml',
    'railway.toml', 
    'Dockerfile',
    '.railway-force-nixpacks'
  ];
  
  railwayFiles.forEach(file => {
    if (fs.existsSync(file)) {
      auditResults.deploymentScripts.push({
        name: file,
        type: 'railway_config',
        purpose: 'deployment_configuration'
      });
      console.log(`✅ Found Railway config: ${file}`);
    }
  });
  
  // Check for GitHub Actions
  const githubActionsDir = path.join(process.cwd(), '.github', 'workflows');
  if (fs.existsSync(githubActionsDir)) {
    const workflowFiles = fs.readdirSync(githubActionsDir);
    workflowFiles.forEach(file => {
      auditResults.deploymentScripts.push({
        name: file,
        path: path.join(githubActionsDir, file),
        type: 'github_actions',
        purpose: 'ci_cd_pipeline'
      });
      console.log(`✅ Found GitHub Actions workflow: ${file}`);
    });
  }
  
  // Check for deployment verification scripts
  const deploymentScripts = auditResults.monitoringScripts.filter(script => 
    script.name.includes('deploy') || script.name.includes('verify')
  );
  
  if (deploymentScripts.length === 0) {
    auditResults.recommendations.push('Create deployment verification scripts');
  }
};

/**
 * Check for error handling and logging infrastructure
 */
const auditErrorHandling = () => {
  console.log('\n4. 🛡️ Auditing Error Handling...');
  
  // Check for error boundary components
  const componentsDir = path.join(process.cwd(), 'components');
  if (fs.existsSync(componentsDir)) {
    const componentFiles = fs.readdirSync(componentsDir);
    const errorComponents = componentFiles.filter(file => 
      file.toLowerCase().includes('error') || 
      file.toLowerCase().includes('boundary')
    );
    
    errorComponents.forEach(file => {
      auditResults.errorHandling.push({
        name: file,
        path: path.join(componentsDir, file),
        type: 'error_boundary'
      });
      console.log(`✅ Found error component: ${file}`);
    });
  }
  
  // Check for global error handling in _app.js
  const appPath = path.join(process.cwd(), 'pages', '_app.js');
  if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf8');
    const hasErrorHandling = /error|catch|boundary/i.test(appContent);
    
    if (hasErrorHandling) {
      auditResults.errorHandling.push({
        name: '_app.js',
        path: appPath,
        type: 'global_error_handling'
      });
      console.log(`✅ Found global error handling in _app.js`);
    } else {
      auditResults.recommendations.push('Add global error handling to _app.js');
    }
  }
  
  // Check for API error handling patterns
  const apiDir = path.join(process.cwd(), 'pages', 'api');
  if (fs.existsSync(apiDir)) {
    let apiErrorHandlingCount = 0;
    const apiFiles = fs.readdirSync(apiDir);
    
    apiFiles.forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = path.join(apiDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for try-catch blocks or error handling
        if (/try\s*{|catch\s*\(|\.catch\(/g.test(content)) {
          apiErrorHandlingCount++;
        }
      }
    });
    
    const errorHandlingPercentage = (apiErrorHandlingCount / apiFiles.length) * 100;
    console.log(`📊 API error handling coverage: ${errorHandlingPercentage.toFixed(1)}% (${apiErrorHandlingCount}/${apiFiles.length} files)`);
    
    if (errorHandlingPercentage < 80) {
      auditResults.recommendations.push('Improve API error handling coverage');
    }
  }
};

/**
 * Test existing endpoints for functionality
 */
const testExistingEndpoints = async () => {
  console.log('\n5. 🧪 Testing Existing Endpoints...');
  
  if (auditResults.existingEndpoints.length === 0) {
    console.log('⚠️ No health endpoints to test');
    return;
  }
  
  // This would require a running server, so we'll just check file contents
  auditResults.existingEndpoints.forEach(endpoint => {
    try {
      const content = fs.readFileSync(endpoint.file, 'utf8');
      
      // Check if endpoint returns useful health information
      const hasHealthResponse = /status|health|ok|alive|ready/i.test(content);
      const hasSystemInfo = /version|uptime|memory|cpu/i.test(content);
      const hasDBCheck = /database|db|connection|supabase|postgres/i.test(content);
      
      console.log(`📋 ${endpoint.path}:`);
      console.log(`   Health Response: ${hasHealthResponse ? '✅' : '❌'}`);
      console.log(`   System Info: ${hasSystemInfo ? '✅' : '❌'}`);
      console.log(`   Database Check: ${hasDBCheck ? '✅' : '❌'}`);
      
      if (!hasHealthResponse) {
        auditResults.recommendations.push(`Enhance ${endpoint.path} with proper health status response`);
      }
      
    } catch (error) {
      console.log(`❌ Could not analyze ${endpoint.path}: ${error.message}`);
    }
  });
};

/**
 * Generate recommendations based on audit results
 */
const generateRecommendations = () => {
  console.log('\n📋 AUDIT SUMMARY');
  console.log('═══════════════');
  
  console.log(`\n📊 Found Infrastructure:`);
  console.log(`   Health Endpoints: ${auditResults.existingEndpoints.length}`);
  console.log(`   Monitoring Scripts: ${auditResults.monitoringScripts.length}`);
  console.log(`   Deployment Config: ${auditResults.deploymentScripts.length}`);
  console.log(`   Error Handling: ${auditResults.errorHandling.length}`);
  
  console.log('\n🔧 RECOMMENDATIONS:');
  if (auditResults.recommendations.length === 0) {
    console.log('✅ No additional monitoring infrastructure needed');
  } else {
    auditResults.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  console.log('\n💡 ENHANCEMENT OPPORTUNITIES:');
  
  // Smart recommendations based on findings
  if (auditResults.existingEndpoints.length === 0) {
    console.log('• Create /api/health endpoint for Railway deployment monitoring');
  }
  
  if (auditResults.monitoringScripts.some(s => s.name.includes('performance'))) {
    console.log('✅ Performance monitoring already exists');
  } else {
    console.log('• Add performance monitoring to existing verification scripts');
  }
  
  if (auditResults.deploymentScripts.some(s => s.type === 'github_actions')) {
    console.log('✅ CI/CD pipeline exists - integrate health checks into workflow');
  }
  
  if (auditResults.errorHandling.length > 0) {
    console.log('✅ Error handling infrastructure exists - enhance with monitoring integration');
  }
};

// Run the complete audit
const runAudit = async () => {
  try {
    auditAPIEndpoints();
    auditMonitoringScripts();
    auditDeploymentInfrastructure();
    auditErrorHandling();
    await testExistingEndpoints();
    generateRecommendations();
    
    // Save audit results
    const auditReport = {
      timestamp: new Date().toISOString(),
      commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      ...auditResults
    };
    
    fs.writeFileSync(
      'monitoring-audit-report.json', 
      JSON.stringify(auditReport, null, 2)
    );
    
    console.log('\n📄 Audit report saved to: monitoring-audit-report.json');
    
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    process.exit(1);
  }
};

// Export for use in other scripts
if (require.main === module) {
  runAudit();
}

module.exports = {
  runAudit,
  auditResults
};