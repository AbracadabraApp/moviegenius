// lib/nuclear-static.js
import fs from 'fs/promises';
import path from 'path';

export async function checkNuclearStatic(tmdbId) {
  const startTime = Date.now();
  let nuclearPath;
  
  try {
    // Enhanced diagnostics for production debugging
    nuclearPath = path.join(process.cwd(), 'nuclear-static', `${tmdbId}.json`);
    
    console.log(`🔍 Nuclear static check START for ${tmdbId}`, {
      path: nuclearPath,
      cwd: process.cwd(),
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT_NAME || 'unknown'
    });
    
    // Check file accessibility first
    await fs.access(nuclearPath, fs.constants.R_OK);
    console.log(`✅ Nuclear static file accessible: ${nuclearPath}`);
    
    // Read file content
    const nuclearContent = await fs.readFile(nuclearPath, 'utf8');
    console.log(`✅ Nuclear static file read successfully: ${nuclearPath} (${nuclearContent.length} bytes)`);
    
    // Parse and validate content
    const data = JSON.parse(nuclearContent);
    const isValid = data && typeof data === 'object' && data.title;
    
    if (!isValid) {
      console.error(`❌ Invalid nuclear data structure for ${tmdbId}:`, {
        hasTitle: !!data?.title,
        keys: Object.keys(data || {}),
        dataType: typeof data
      });
      throw new Error('Invalid nuclear static data structure');
    }
    
    const duration = Date.now() - startTime;
    console.log(`🚀 Nuclear cache HIT for movie ${tmdbId} (${duration}ms)`, {
      title: data.title,
      year: data.year,
      hasAnalysis: !!data.sections
    });
    
    return data;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Nuclear static check failed for ${tmdbId} (${duration}ms):`, {
      error: error.message,
      code: error.code,
      path: nuclearPath,
      cwd: process.cwd(),
      syscall: error.syscall,
      errno: error.errno
    });
    
    // Attempt directory listing for diagnostics
    try {
      const nuclearDir = path.join(process.cwd(), 'nuclear-static');
      const files = await fs.readdir(nuclearDir);
      console.log(`📁 Nuclear static directory contents:`, {
        dir: nuclearDir,
        fileCount: files.length,
        files: files.slice(0, 10) // Show first 10 files
      });
    } catch (dirError) {
      console.error(`❌ Cannot read nuclear-static directory:`, {
        error: dirError.message,
        code: dirError.code
      });
    }
    
    // TMDB fallback with enhanced logging
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const fallbackUrl = `${apiUrl}/api/movie/${tmdbId}`;
      
      console.log(`🔄 Attempting TMDB fallback for ${tmdbId}`, {
        url: fallbackUrl,
        hasApiKey: !!process.env.NEXT_PUBLIC_TMDB_API_KEY
      });
      
      const response = await fetch(fallbackUrl);
      
      if (!response.ok) {
        console.error(`❌ TMDB fallback failed for ${tmdbId}:`, {
          status: response.status,
          statusText: response.statusText,
          url: fallbackUrl
        });
        return null;
      }
      
      const data = await response.json();
      const fallbackDuration = Date.now() - startTime;
      
      console.log(`🚀 TMDB fallback HIT for movie ${tmdbId} (${fallbackDuration}ms)`, {
        title: data.title,
        year: data.year
      });
      
      return {
        title: data.title,
        year: data.year,
        tmdb_id: data.tmdb_id || tmdbId,
        source: 'tmdb_fallback'
      };
      
    } catch (tmdbError) {
      const totalDuration = Date.now() - startTime;
      console.error(`❌ TMDB fallback error for ${tmdbId} (${totalDuration}ms):`, {
        error: tmdbError.message,
        type: tmdbError.name
      });
      return null;
    }
  }
}

// Utility function to check nuclear static directory health
export async function diagnoseNuclearStatic() {
  try {
    const nuclearDir = path.join(process.cwd(), 'nuclear-static');
    const stats = await fs.stat(nuclearDir);
    const files = await fs.readdir(nuclearDir);
    
    console.log(`📊 Nuclear static directory health check:`, {
      dir: nuclearDir,
      exists: true,
      isDirectory: stats.isDirectory(),
      fileCount: files.length,
      size: stats.size,
      modified: stats.mtime,
      sampleFiles: files.slice(0, 5)
    });
    
    return {
      healthy: true,
      fileCount: files.length,
      directory: nuclearDir
    };
  } catch (error) {
    console.error(`❌ Nuclear static directory unhealthy:`, {
      error: error.message,
      code: error.code
    });
    return {
      healthy: false,
      error: error.message
    };
  }
}