/**
 * Nuclear Static Generation - Build Process Testing
 * 
 * CRITICAL: These tests validate the build system itself.
 * Based on zero-waste.md three-tier content strategy.
 * 
 * TESTING PHILOSOPHY:
 * - Validate build completes without data loss
 * - Ensure three-tier strategy is respected
 * - Test build process resilience and error handling
 * - Verify output quality before deployment
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');

// Helper function to run build command
function runBuildCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'pipe',
      ...options
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });

    process.on('error', (error) => {
      reject(error);
    });

    // Kill process after timeout
    setTimeout(() => {
      process.kill('SIGTERM');
      reject(new Error('Build process timeout'));
    }, options.timeout || 300000); // 5 minute default timeout
  });
}

describe('Nuclear Static Build Process', () => {
  
  describe('Build System Validation', () => {
    
    test('SHOULD FAIL: Build process completes successfully', async () => {
      try {
        // Run the nuclear static build command
        const buildResult = await runBuildCommand('npm', ['run', 'build:nuclear-static'], {
          timeout: 600000 // 10 minutes for full build
        });
        
        if (!buildResult.success) {
          throw new Error(
            `Build process failed with exit code ${buildResult.code}\n` +
            `STDOUT: ${buildResult.stdout}\n` +
            `STDERR: ${buildResult.stderr}`
          );
        }
        
        // Verify build completion indicators
        const buildOutput = buildResult.stdout + buildResult.stderr;
        
        if (!buildOutput.includes('completed') && !buildOutput.includes('finished') && !buildOutput.includes('generated')) {
          throw new Error('Build output does not indicate successful completion');
        }
        
        // Check for error indicators
        const errorPatterns = [
          /ERROR/i,
          /FATAL/i,
          /failed to generate/i,
          /build failed/i,
          /compilation error/i
        ];
        
        const foundErrors = errorPatterns.filter(pattern => pattern.test(buildOutput));
        
        if (foundErrors.length > 0) {
          throw new Error(`Build contains error indicators: ${foundErrors.length} patterns found`);
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Build process validation failed - ${error.message}`);
      }
    });

    test('SHOULD FAIL: All nuclear JSON files have corresponding HTML files', async () => {
      const nuclearDir = path.join(process.cwd(), 'public/nuclear-static');
      
      try {
        const files = await fs.readdir(nuclearDir);
        const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('-original'));
        const htmlFiles = files.filter(f => f.endsWith('.html'));
        
        if (jsonFiles.length === 0) {
          throw new Error('No nuclear JSON files found');
        }
        
        const missingHtmlFiles = [];
        const fileValidationErrors = [];
        
        // Test subset for performance (first 100 files)
        const testFiles = jsonFiles.slice(0, 100);
        
        for (const jsonFile of testFiles) {
          const tmdbId = jsonFile.replace('.json', '');
          const expectedHtmlFile = `${tmdbId}.html`;
          
          if (!htmlFiles.includes(expectedHtmlFile)) {
            missingHtmlFiles.push(expectedHtmlFile);
            continue;
          }
          
          // Validate HTML file has minimum required content
          try {
            const htmlPath = path.join(nuclearDir, expectedHtmlFile);
            const htmlContent = await fs.readFile(htmlPath, 'utf8');
            
            // Basic HTML structure validation
            if (!htmlContent.includes('<!DOCTYPE html>')) {
              fileValidationErrors.push(`${expectedHtmlFile}: Missing DOCTYPE declaration`);
            }
            
            if (!htmlContent.includes('<html>') || !htmlContent.includes('</html>')) {
              fileValidationErrors.push(`${expectedHtmlFile}: Invalid HTML structure`);
            }
            
            // Movie-specific content validation
            const jsonPath = path.join(nuclearDir, jsonFile);
            const jsonData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
            
            if (jsonData.props.title && !htmlContent.includes(jsonData.props.title)) {
              fileValidationErrors.push(`${expectedHtmlFile}: Missing movie title from JSON`);
            }
            
          } catch (validationError) {
            fileValidationErrors.push(`${expectedHtmlFile}: ${validationError.message}`);
          }
        }
        
        const allErrors = [...missingHtmlFiles.map(f => `Missing: ${f}`), ...fileValidationErrors];
        
        if (allErrors.length > 0) {
          const totalFiles = testFiles.length;
          const errorPercentage = (allErrors.length / totalFiles) * 100;
          
          throw new Error(
            `BUILD VALIDATION FAILURES: ${allErrors.length}/${totalFiles} files (${errorPercentage.toFixed(1)}%) have issues:\n` +
            `${allErrors.slice(0, 10).join('\n')}`
          );
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: File generation validation failed - ${error.message}`);
      }
    });

    test('SHOULD FAIL: Build process respects three-tier content strategy', async () => {
      // Based on zero-waste.md three-tier strategy
      const nuclearDir = path.join(process.cwd(), 'public/nuclear-static');
      
      try {
        const buildLogPath = path.join(process.cwd(), 'build-nuclear-static.log');
        let buildLog = '';
        
        try {
          buildLog = await fs.readFile(buildLogPath, 'utf8');
        } catch (logError) {
          // Build log might not exist yet
          console.log('Build log not found - checking output files directly');
        }
        
        // Test sample of files for three-tier compliance
        const testFiles = ['11.json', '550.json', '238.json']; // Known movies
        const tierValidationErrors = [];
        
        for (const jsonFile of testFiles) {
          try {
            const jsonPath = path.join(nuclearDir, jsonFile);
            const jsonData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
            
            const hasAnalysis = jsonData.props.hasAnalysis && 
                               jsonData.props.sections && 
                               jsonData.props.sections.length > 0;
            
            if (hasAnalysis) {
              const analysisContent = jsonData.props.sections
                .filter(section => section.type === 'text')
                .map(section => section.content)
                .join(' ');
              
              const hasLinks = analysisContent.includes('<a href="/movie/');
              
              if (hasLinks) {
                // Tier 1: Complete movies - should be preserved exactly
                console.log(`${jsonFile}: Tier 1 - Complete with links`);
              } else {
                // Tier 2: Should have been enhanced with links
                if (buildLog && !buildLog.includes(`Enhanced ${jsonFile}`)) {
                  tierValidationErrors.push(`${jsonFile}: Tier 2 movie not enhanced with links`);
                }
              }
            } else {
              // Tier 3: Should have been generated fresh
              if (buildLog && !buildLog.includes(`Generated ${jsonFile}`)) {
                tierValidationErrors.push(`${jsonFile}: Tier 3 movie not generated fresh`);
              }
            }
            
          } catch (fileError) {
            tierValidationErrors.push(`${jsonFile}: ${fileError.message}`);
          }
        }
        
        if (tierValidationErrors.length > 0) {
          throw new Error(`THREE-TIER STRATEGY VIOLATIONS:\n${tierValidationErrors.join('\n')}`);
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Three-tier strategy validation failed - ${error.message}`);
      }
    });
  });

  describe('Build Performance and Efficiency', () => {
    
    test('SHOULD FAIL: Build completes within reasonable time', async () => {
      // Test build time for a subset of files
      const startTime = performance.now();
      
      try {
        // Run build on subset (first 50 nuclear files)
        const buildResult = await runBuildCommand('npm', ['run', 'build:nuclear-static', '--', '--limit=50'], {
          timeout: 300000 // 5 minutes
        });
        
        const buildTime = performance.now() - startTime;
        const buildTimeMinutes = buildTime / 1000 / 60;
        
        if (!buildResult.success) {
          throw new Error(`Build failed: ${buildResult.stderr}`);
        }
        
        // Build should complete within reasonable time (2 minutes per 50 files)
        if (buildTimeMinutes > 2) {
          throw new Error(`Build too slow: ${buildTimeMinutes.toFixed(1)} minutes for 50 files (target: <2 minutes)`);
        }
        
        // Check build output for performance indicators
        const buildOutput = buildResult.stdout + buildResult.stderr;
        
        // Look for file count information
        const fileCountMatch = buildOutput.match(/(\d+)\s+files?\s+(generated|processed|completed)/i);
        if (fileCountMatch) {
          const filesProcessed = parseInt(fileCountMatch[1]);
          const filesPerMinute = filesProcessed / buildTimeMinutes;
          
          if (filesPerMinute < 20) { // Should process at least 20 files per minute
            throw new Error(`Build efficiency too low: ${filesPerMinute.toFixed(1)} files/minute (target: >20 files/minute)`);
          }
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Build performance test failed - ${error.message}`);
      }
    });

    test('SHOULD FAIL: Build process memory usage within limits', async () => {
      try {
        // Run build with memory monitoring
        const buildResult = await runBuildCommand('node', ['--max-old-space-size=2048', 'scripts/build-nuclear-static.js'], {
          timeout: 300000
        });
        
        if (!buildResult.success) {
          const output = buildResult.stdout + buildResult.stderr;
          
          // Check for memory-related errors
          if (output.includes('out of memory') || output.includes('heap out of memory')) {
            throw new Error('Build process ran out of memory');
          }
          
          // Check for other memory issues
          if (output.includes('allocation failure') || output.includes('Cannot allocate memory')) {
            throw new Error('Build process memory allocation failed');
          }
        }
        
        // If build succeeded, check for memory warnings
        const buildOutput = buildResult.stdout + buildResult.stderr;
        
        if (buildOutput.includes('memory pressure') || buildOutput.includes('GC pressure')) {
          throw new Error('Build process experienced memory pressure');
        }
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('EXPECTED FAILURE: Build script not found - nuclear static build not implemented');
        }
        throw new Error(`EXPECTED FAILURE: Memory usage test failed - ${error.message}`);
      }
    });
  });

  describe('Build Error Handling and Validation', () => {
    
    test('SHOULD FAIL: Build handles corrupted source files gracefully', async () => {
      const nuclearDir = path.join(process.cwd(), 'public/nuclear-static');
      const testCorruptFile = path.join(nuclearDir, 'test-corrupt.json');
      
      try {
        // Create a temporary corrupt JSON file
        await fs.writeFile(testCorruptFile, '{"props": {"title": "Test", invalid json}');
        
        // Run build and see how it handles the corrupt file
        const buildResult = await runBuildCommand('npm', ['run', 'build:nuclear-static'], {
          timeout: 120000 // 2 minutes
        });
        
        const buildOutput = buildResult.stdout + buildResult.stderr;
        
        // Build should handle the error gracefully
        if (buildResult.code !== 0) {
          // If build failed, it should be due to graceful error handling, not crash
          if (buildOutput.includes('Unexpected token') || buildOutput.includes('JSON.parse')) {
            console.log('Build correctly identified corrupt JSON file');
          } else {
            throw new Error(`Build failed unexpectedly: ${buildOutput}`);
          }
        }
        
        // Should not create HTML for corrupt JSON
        const corruptHtmlPath = path.join(nuclearDir, 'test-corrupt.html');
        try {
          await fs.readFile(corruptHtmlPath, 'utf8');
          throw new Error('Build created HTML file from corrupt JSON - should have been skipped');
        } catch (readError) {
          if (readError.code === 'ENOENT') {
            console.log('Build correctly skipped corrupt JSON file');
          } else {
            throw readError;
          }
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Corrupt file handling test failed - ${error.message}`);
      } finally {
        // Clean up test file
        try {
          await fs.unlink(testCorruptFile);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    });

    test('SHOULD FAIL: Build validates output quality before completion', async () => {
      try {
        const buildResult = await runBuildCommand('npm', ['run', 'build:nuclear-static', '--', '--validate'], {
          timeout: 300000
        });
        
        const buildOutput = buildResult.stdout + buildResult.stderr;
        
        // Look for validation steps in build output
        const validationIndicators = [
          /validating.*html/i,
          /checking.*links/i,
          /quality.*check/i,
          /validation.*complete/i
        ];
        
        const foundValidations = validationIndicators.filter(pattern => pattern.test(buildOutput));
        
        if (foundValidations.length === 0) {
          throw new Error('No validation steps detected in build output');
        }
        
        // Check for validation failures
        if (buildOutput.includes('validation failed') || buildOutput.includes('quality check failed')) {
          throw new Error('Build quality validation failed');
        }
        
        // Verify some output files exist and are valid
        const nuclearDir = path.join(process.cwd(), 'public/nuclear-static');
        const files = await fs.readdir(nuclearDir);
        const htmlFiles = files.filter(f => f.endsWith('.html'));
        
        if (htmlFiles.length === 0) {
          throw new Error('No HTML files generated despite successful build');
        }
        
        // Spot check first few HTML files
        const validationErrors = [];
        const testFiles = htmlFiles.slice(0, 3);
        
        for (const htmlFile of testFiles) {
          try {
            const htmlPath = path.join(nuclearDir, htmlFile);
            const htmlContent = await fs.readFile(htmlPath, 'utf8');
            
            // Basic HTML validation
            if (!htmlContent.includes('<!DOCTYPE html>')) {
              validationErrors.push(`${htmlFile}: Missing DOCTYPE`);
            }
            
            if (!htmlContent.includes('<title>') || !htmlContent.includes('</title>')) {
              validationErrors.push(`${htmlFile}: Missing title tag`);
            }
            
            // Check for obvious errors
            if (htmlContent.includes('undefined') || htmlContent.includes('[object Object]')) {
              validationErrors.push(`${htmlFile}: Contains undefined values`);
            }
            
          } catch (fileError) {
            validationErrors.push(`${htmlFile}: ${fileError.message}`);
          }
        }
        
        if (validationErrors.length > 0) {
          throw new Error(`OUTPUT VALIDATION FAILURES:\n${validationErrors.join('\n')}`);
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Build quality validation failed - ${error.message}`);
      }
    });

    test('SHOULD FAIL: Build creates deployment-ready file structure', async () => {
      const nuclearDir = path.join(process.cwd(), 'public/nuclear-static');
      
      try {
        const files = await fs.readdir(nuclearDir);
        
        // Required file types should be present
        const hasJsonFiles = files.some(f => f.endsWith('.json'));
        const hasHtmlFiles = files.some(f => f.endsWith('.html'));
        
        if (!hasJsonFiles) {
          throw new Error('No JSON nuclear files found');
        }
        
        if (!hasHtmlFiles) {
          throw new Error('No HTML static files found');
        }
        
        // Check for required supporting files
        const requiredSupportFiles = [
          path.join(process.cwd(), 'public/js/movie-actions.js'),
          path.join(process.cwd(), 'public/css/movie-page.css')
        ];
        
        const missingSupportFiles = [];
        
        for (const supportFile of requiredSupportFiles) {
          try {
            await fs.access(supportFile);
          } catch (accessError) {
            missingSupportFiles.push(path.basename(supportFile));
          }
        }
        
        if (missingSupportFiles.length > 0) {
          throw new Error(`Missing required support files: ${missingSupportFiles.join(', ')}`);
        }
        
        // Verify file permissions are correct for deployment
        const htmlFiles = files.filter(f => f.endsWith('.html')).slice(0, 5);
        
        for (const htmlFile of htmlFiles) {
          try {
            const htmlPath = path.join(nuclearDir, htmlFile);
            const stats = await fs.stat(htmlPath);
            
            // File should be readable
            if (!(stats.mode & parseInt('444', 8))) {
              throw new Error(`${htmlFile}: File not readable`);
            }
            
          } catch (statError) {
            throw new Error(`${htmlFile}: ${statError.message}`);
          }
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: Deployment structure validation failed - ${error.message}`);
      }
    });
  });

  describe('Integration with Existing System', () => {
    
    test('SHOULD FAIL: Build preserves existing nuclear JSON files', async () => {
      const nuclearDir = path.join(process.cwd(), 'public/nuclear-static');
      
      try {
        // Get list of JSON files before build
        const filesBefore = await fs.readdir(nuclearDir);
        const jsonFilesBefore = filesBefore.filter(f => f.endsWith('.json') && !f.includes('-original'));
        
        if (jsonFilesBefore.length === 0) {
          throw new Error('No nuclear JSON files found to preserve');
        }
        
        // Read content of a few sample files
        const sampleFiles = jsonFilesBefore.slice(0, 3);
        const contentBefore = {};
        
        for (const jsonFile of sampleFiles) {
          const jsonPath = path.join(nuclearDir, jsonFile);
          contentBefore[jsonFile] = await fs.readFile(jsonPath, 'utf8');
        }
        
        // Run build
        const buildResult = await runBuildCommand('npm', ['run', 'build:nuclear-static'], {
          timeout: 300000
        });
        
        if (!buildResult.success) {
          throw new Error(`Build failed: ${buildResult.stderr}`);
        }
        
        // Check that JSON files are preserved
        const filesAfter = await fs.readdir(nuclearDir);
        const jsonFilesAfter = filesAfter.filter(f => f.endsWith('.json') && !f.includes('-original'));
        
        // Should have same or more JSON files (never fewer)
        if (jsonFilesAfter.length < jsonFilesBefore.length) {
          throw new Error(`JSON files lost during build: ${jsonFilesBefore.length} → ${jsonFilesAfter.length}`);
        }
        
        // Check content of sample files is preserved
        const contentPreservationErrors = [];
        
        for (const jsonFile of sampleFiles) {
          try {
            const jsonPath = path.join(nuclearDir, jsonFile);
            const contentAfter = await fs.readFile(jsonPath, 'utf8');
            
            // Content should be identical or enhanced (not reduced)
            const beforeData = JSON.parse(contentBefore[jsonFile]);
            const afterData = JSON.parse(contentAfter);
            
            if (beforeData.props.title !== afterData.props.title) {
              contentPreservationErrors.push(`${jsonFile}: Title changed`);
            }
            
            if (beforeData.props.hasAnalysis && !afterData.props.hasAnalysis) {
              contentPreservationErrors.push(`${jsonFile}: Lost analysis flag`);
            }
            
          } catch (preservationError) {
            contentPreservationErrors.push(`${jsonFile}: ${preservationError.message}`);
          }
        }
        
        if (contentPreservationErrors.length > 0) {
          throw new Error(`CONTENT PRESERVATION FAILURES:\n${contentPreservationErrors.join('\n')}`);
        }
        
      } catch (error) {
        throw new Error(`EXPECTED FAILURE: JSON preservation test failed - ${error.message}`);
      }
    });

    test('SHOULD FAIL: Build creates package.json scripts for deployment', async () => {
      try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        // Required scripts for nuclear static system
        const requiredScripts = [
          'build:nuclear-static',
          'validate:nuclear-static', 
          'deploy:nuclear-static'
        ];
        
        const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
        
        if (missingScripts.length > 0) {
          throw new Error(`Missing required npm scripts: ${missingScripts.join(', ')}`);
        }
        
        // Verify scripts have reasonable content
        const buildScript = packageJson.scripts['build:nuclear-static'];
        
        if (!buildScript.includes('nuclear') && !buildScript.includes('static')) {
          throw new Error('build:nuclear-static script does not appear to be nuclear-related');
        }
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error('package.json not found');
        }
        throw new Error(`EXPECTED FAILURE: Package.json integration failed - ${error.message}`);
      }
    });
  });
});